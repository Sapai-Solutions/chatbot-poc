"""Chat router for AI-powered conversations with tool calling.

Endpoints:
    POST /api/chat         — Send a message to the chatbot
    POST /api/chat/stream  — Stream chat responses (Server-Sent Events)
    GET  /api/chat/history — Get conversation history
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas import ChatRequest, ChatResponse
from app.services.agent import process_chat_message

router = APIRouter(prefix="/chat", tags=["chat"])
logger = logging.getLogger(__name__)

# In-memory conversation store (replace with Redis/DB in production)
_conversation_store: dict[str, list[dict]] = {}


@router.post("", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(request: ChatRequest):
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
    # Generate or use provided session ID
    session_id = request.session_id or str(uuid.uuid4())

    # Get conversation history
    history = _conversation_store.get(session_id, [])

    try:
        # Process through LangGraph agent
        result = await process_chat_message(
            user_message=request.message,
            session_id=session_id,
            conversation_history=history,
        )

        # Update conversation history
        history.append({"role": "user", "content": request.message})
        history.append({"role": "assistant", "content": result["message"]})
        _conversation_store[session_id] = history

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
async def get_chat_history(session_id: str):
    """Retrieve the conversation history for a session.

    Args:
        session_id: The unique conversation session ID

    Returns:
        List of messages in the conversation
    """
    history = _conversation_store.get(session_id, [])
    return {"session_id": session_id, "messages": history}


@router.delete("/history/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_chat_history(session_id: str):
    """Clear the conversation history for a session."""
    if session_id in _conversation_store:
        del _conversation_store[session_id]
    return {"message": "Conversation history cleared"}
