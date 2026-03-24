"""Chat router for AI-powered conversations with tool calling.

Endpoints:
    POST /api/chat         - Send a message to the chatbot
    POST /api/chat/stream  - Stream chat responses (Server-Sent Events)
    GET  /api/chat/history/{session_id} - Get conversation history (deprecated, use /api/sessions/{id})
"""

import json
import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ChatMessage, ChatSession
from app.schemas import ChatRequest, ChatResponse
from app.services.agent import process_chat_message
from app.services.agent_streaming import stream_chat_response
from app.services.session_summarizer import generate_session_title_and_summary

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)


async def _get_or_create_session(
    db: AsyncSession, session_id: str | None
) -> ChatSession:
    """Get existing session or create a new one."""
    if session_id:
        stmt = select(ChatSession).where(ChatSession.id == session_id)
        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        if session:
            return session

    # Create new session
    session = ChatSession()
    db.add(session)
    await db.flush()
    return session


async def _get_conversation_history(
    db: AsyncSession, session_id: str
) -> list[dict]:
    """Get conversation history as a list of message dicts."""
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()

    return [{"role": msg.role, "content": msg.content} for msg in messages]


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(
    request: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Send a message to the AI chatbot.

    The chatbot uses LangGraph with tool calling capabilities to:
    - Answer questions about Aras/MTAI from the knowledge base
    - Execute tools like getting the current time
    - Maintain conversation context across messages

    Request body:
        - message: The user's message to the chatbot
        - session_id: Optional session ID for conversation continuity

    Response:
        - message: The AI's response
        - session_id: The conversation session ID
        - tool_calls: Information about any tools the AI used
    """
    # Get or create session
    session = await _get_or_create_session(db, request.session_id)
    session_id = session.id

    # Get conversation history from database
    history = await _get_conversation_history(db, session_id)

    try:
        # Process through LangGraph agent
        result = await process_chat_message(
            user_message=request.message,
            session_id=session_id,
            conversation_history=history,
        )

        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.message,
        )
        db.add(user_msg)

        # Save assistant message with tool calls
        tool_calls_json = None
        if result.get("tool_calls"):
            tool_calls_json = json.dumps(result["tool_calls"])

        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=result["message"],
            tool_calls=tool_calls_json,
        )
        db.add(assistant_msg)

        # Generate title and summary for new sessions on first message
        if not session.title and len(history) == 0:
            try:
                new_messages = [
                    {"role": "user", "content": request.message},
                    {"role": "assistant", "content": result["message"]},
                ]
                title, summary = await generate_session_title_and_summary(new_messages)
                session.title = title
                session.summary = summary
            except Exception as exc:
                logger.warning(f"Session summarization failed: {exc}")
                session.title = request.message[:50] + (
                    "..." if len(request.message) > 50 else ""
                )

        await db.flush()

        return ChatResponse(
            message=result["message"],
            session_id=session_id,
            tool_calls=result.get("tool_calls"),
        )

    except Exception as e:
        logger.error(f"Chat processing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat message. Please try again.",
        )


@router.get("/history/{session_id}", status_code=status.HTTP_200_OK)
async def get_chat_history(
    session_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Retrieve the conversation history for a session.

    Args:
        session_id: The unique conversation session ID

    Returns:
        List of messages in the conversation

    Note:
        This endpoint is deprecated. Use GET /api/sessions/{session_id} instead.
    """
    history = await _get_conversation_history(db, session_id)
    return {"session_id": session_id, "messages": history}


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(
    session_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Clear the conversation history for a session.

    This deletes all messages in the session but keeps the session itself.
    Use DELETE /api/sessions/{session_id} to delete the entire session.
    """
    stmt = select(ChatMessage).where(ChatMessage.session_id == session_id)
    result = await db.execute(stmt)
    messages = result.scalars().all()

    for msg in messages:
        await db.delete(msg)

    return None


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Stream chat responses in real-time using Server-Sent Events.

    This endpoint provides a streaming interface where tokens are sent
    as they are generated by the LLM. Supports markdown formatting.

    Request body:
        - message: The user's message to the chatbot
        - session_id: Optional session ID for conversation continuity

    Events:
        - message_start: Stream begins, includes session_id
        - tool_start: Tool execution starting
        - tool_result: Tool execution completed
        - token: Individual token from LLM
        - message_end: Stream complete, includes full message
        - error: Error occurred during streaming
    """
    # Get or create session
    session = await _get_or_create_session(db, request.session_id)
    session_id = session.id

    # Get conversation history from database
    history = await _get_conversation_history(db, session_id)

    async def event_generator():
        full_message = ""
        tool_calls = None
        tool_calls_json = None

        async for event in stream_chat_response(
            user_message=request.message,
            session_id=session_id,
            conversation_history=history,
        ):
            yield event

            # Parse message_end to save to history
            if event.startswith("event: message_end"):
                try:
                    data_line = event.split("\ndata: ")[1].split("\n\n")[0]
                    data = json.loads(data_line)
                    full_message = data.get("full_message", "")
                    tool_calls = data.get("tool_calls")
                    if tool_calls:
                        tool_calls_json = json.dumps(tool_calls)
                except Exception as e:
                    logger.error(f"Failed to parse message_end: {e}")

        # Save to history after streaming completes
        if full_message:
            # Save user message
            user_msg = ChatMessage(
                session_id=session_id,
                role="user",
                content=request.message,
            )
            db.add(user_msg)

            # Save assistant message
            assistant_msg = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=full_message,
                tool_calls=tool_calls_json,
            )
            db.add(assistant_msg)

            # Generate title and summary for new sessions
            if not session.title and len(history) == 0:
                try:
                    new_messages = [
                        {"role": "user", "content": request.message},
                        {"role": "assistant", "content": full_message},
                    ]
                    title, summary = await generate_session_title_and_summary(new_messages)
                    session.title = title
                    session.summary = summary
                except Exception as exc:
                    logger.warning(f"Session summarization failed: {exc}")
                    session.title = request.message[:50] + (
                        "..." if len(request.message) > 50 else ""
                    )

            # We need a separate session for the generator since we're in an async generator
            # The main db session will commit when the request ends
            try:
                await db.flush()
            except Exception as e:
                logger.error(f"Failed to save chat history: {e}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )
