"""Session router for managing chat sessions.

Endpoints:
    GET  /api/sessions        - List all chat sessions with metadata
    POST /api/sessions        - Create a new chat session
    GET  /api/sessions/{id}   - Get a specific session with its messages
    DELETE /api/sessions/{id} - Delete a session
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import ChatMessage, ChatSession
from app.schemas import ChatSessionCreate, ChatSessionDetail, ChatSessionResponse
from app.services.session_summarizer import generate_session_title_and_summary

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=list[ChatSessionResponse])
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    per_page: Annotated[int, Query(ge=1, le=100)] = 20,
):
    """List all chat sessions with metadata including message count.

    Query params:
        - page: Page number (default: 1)
        - per_page: Items per page (default: 20, max: 100)

    Returns:
        List of sessions sorted by most recent update.
    """
    offset = (page - 1) * per_page

    # Query sessions with message count
    stmt = (
        select(
            ChatSession,
            func.count(ChatMessage.id).label("message_count"),
        )
        .outerjoin(ChatMessage, ChatSession.id == ChatMessage.session_id)
        .group_by(ChatSession.id)
        .order_by(desc(ChatSession.updated_at))
        .offset(offset)
        .limit(per_page)
    )

    result = await db.execute(stmt)
    rows = result.all()

    # Build response objects
    sessions = []
    for session, msg_count in rows:
        session_dict = {
            "id": session.id,
            "title": session.title,
            "summary": session.summary,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": msg_count,
        }
        sessions.append(ChatSessionResponse.model_validate(session_dict))

    return sessions


@router.post("", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    request: ChatSessionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new chat session.

    Request body:
        - title: Optional title for the session

    Returns:
        The newly created session.
    """
    session = ChatSession(title=request.title)
    db.add(session)
    await db.flush()  # Flush to get the ID

    return ChatSessionResponse.model_validate(
        {
            "id": session.id,
            "title": session.title,
            "summary": session.summary,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": 0,
        }
    )


@router.get("/{session_id}", response_model=ChatSessionDetail)
async def get_session(
    session_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get a specific session with its full message history.

    Args:
        session_id: The unique session ID

    Returns:
        Session with all messages ordered by creation time.

    Raises:
        404: If session not found.
    """
    # Get session with eagerly loaded messages (lazy load is forbidden in async)
    stmt = (
        select(ChatSession)
        .where(ChatSession.id == session_id)
        .options(selectinload(ChatSession.messages))
    )

    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )

    # Get message count
    count_stmt = select(func.count(ChatMessage.id)).where(
        ChatMessage.session_id == session_id
    )
    count_result = await db.execute(count_stmt)
    message_count = count_result.scalar() or 0

    # Build messages list
    messages = []
    for msg in session.messages:
        msg_dict = {
            "id": msg.id,
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at,
        }
        # Parse tool_calls from JSON if present
        if msg.tool_calls:
            import json

            try:
                msg_dict["tool_calls"] = json.loads(msg.tool_calls)
            except json.JSONDecodeError:
                msg_dict["tool_calls"] = None
        else:
            msg_dict["tool_calls"] = None
        messages.append(msg_dict)

    return ChatSessionDetail.model_validate(
        {
            "id": session.id,
            "title": session.title,
            "summary": session.summary,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": message_count,
            "messages": messages,
        }
    )


@router.post("/{session_id}/summarize", response_model=ChatSessionResponse)
async def summarize_session(
    session_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Generate (or re-generate) title and summary for a session.

    Called by the frontend when the user clicks "New Chat" to ensure the
    current session has a meaningful label before it leaves the view.

    Args:
        session_id: The unique session ID

    Returns:
        Updated session with refreshed title and summary.

    Raises:
        404: If session not found.
    """
    stmt = select(ChatSession).where(ChatSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )

    # Fetch all messages for the session
    msg_stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    msg_result = await db.execute(msg_stmt)
    messages = msg_result.scalars().all()

    if not messages:
        # Nothing to summarize yet — return the session as-is without error
        count_stmt = select(func.count(ChatMessage.id)).where(
            ChatMessage.session_id == session_id
        )
        count_result = await db.execute(count_stmt)
        message_count = count_result.scalar() or 0
        return ChatSessionResponse.model_validate(
            {
                "id": session.id,
                "title": session.title,
                "summary": session.summary,
                "created_at": session.created_at,
                "updated_at": session.updated_at,
                "message_count": message_count,
            }
        )

    msg_dicts = [{"role": m.role, "content": m.content} for m in messages]

    try:
        title, summary = await generate_session_title_and_summary(msg_dicts)
        session.title = title or session.title
        session.summary = summary or session.summary
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summarization failed: {exc}",
        )

    await db.flush()
    await db.refresh(session)

    # Get message count for response
    count_stmt = select(func.count(ChatMessage.id)).where(
        ChatMessage.session_id == session_id
    )
    count_result = await db.execute(count_stmt)
    message_count = count_result.scalar() or 0

    return ChatSessionResponse.model_validate(
        {
            "id": session.id,
            "title": session.title,
            "summary": session.summary,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "message_count": message_count,
        }
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete a chat session and all its messages.

    Args:
        session_id: The unique session ID

    Returns:
        204 No Content on success.

    Raises:
        404: If session not found.
    """
    # Check if session exists
    stmt = select(ChatSession).where(ChatSession.id == session_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found",
        )

    # Delete session (cascade will delete messages)
    await db.delete(session)

    return None
