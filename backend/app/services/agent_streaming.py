"""Streaming LangGraph agent service for real-time chat responses.

This module provides TRUE streaming by running the LangGraph agent graph
with ``astream_events``, so every token from the LLM is yielded as it
arrives via Server-Sent Events (SSE) — no blocking pre-check call.
"""

import json
import logging
from typing import AsyncGenerator

from langchain_core.messages import AIMessage, HumanMessage

from app.config import get_settings
from app.services.agent import AgentState, get_agent

settings = get_settings()
logger = logging.getLogger(__name__)


async def stream_chat_response(
    user_message: str,
    session_id: str,
    conversation_history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream chat response tokens in real-time through the LangGraph agent.

    Uses ``graph.astream_events()`` so that every LLM token, tool-start and
    tool-end event is forwarded to the client the moment it happens.

    Yields Server-Sent Events formatted strings.
    """
    # Build message history
    messages: list = []
    if conversation_history:
        for msg in conversation_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))

    initial_state = AgentState(
        messages=messages,
        session_id=session_id,
        tool_calls=[],
    )

    agent = get_agent()

    # ── Emit stream-start event ──────────────────────────────────────────────
    yield f"event: message_start\ndata: {json.dumps({'session_id': session_id})}\n\n"

    full_response = ""
    tool_calls_info: list[dict] = []

    try:
        async for event in agent.astream_events(initial_state, version="v2"):
            kind = event["event"]

            # ── LLM token ────────────────────────────────────────────────────
            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    full_response += chunk.content
                    # json.dumps handles newline escaping correctly
                    yield (
                        f"event: token\n"
                        f"data: {json.dumps({'token': chunk.content})}\n\n"
                    )

            # ── Tool invocation started ──────────────────────────────────────
            elif kind == "on_tool_start":
                tool_name = event.get("name", "unknown")
                tool_input = event["data"].get("input", {})
                tool_calls_info.append({"name": tool_name, "args": tool_input})
                yield (
                    f"event: tool_start\n"
                    f"data: {json.dumps({'tools': [{'name': tool_name, 'args': tool_input}]})}\n\n"
                )

            # ── Tool invocation finished ─────────────────────────────────────
            elif kind == "on_tool_end":
                tool_name = event.get("name", "unknown")
                output = event["data"].get("output", "")
                # LangGraph returns ToolMessage objects here
                result_str = output.content if hasattr(output, "content") else str(output)
                yield (
                    f"event: tool_result\n"
                    f"data: {json.dumps({'tool': tool_name, 'result': result_str})}\n\n"
                )

        # ── Stream complete ──────────────────────────────────────────────────
        yield (
            f"event: message_end\n"
            f"data: {json.dumps({'full_message': full_response, 'session_id': session_id, 'tool_calls': tool_calls_info or None})}\n\n"
        )

    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
