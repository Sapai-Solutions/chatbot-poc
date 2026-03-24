"""Session summarization service — uses an LLM call to name and summarize chat sessions.

Generates a short title and a one-paragraph summary from the conversation
messages. Used after the first exchange so the sidebar shows meaningful labels.
"""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

# Lightweight LLM instance for summarization (low temperature, short output)
_summarize_llm: ChatOpenAI | None = None


def _get_summarize_llm() -> ChatOpenAI:
    global _summarize_llm
    if _summarize_llm is None:
        _summarize_llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            base_url=settings.LLM_BASE_URL,
            api_key=settings.LLM_API_KEY,
            temperature=0.3,
            max_tokens=256,
        )
    return _summarize_llm


SUMMARIZE_PROMPT = """\
You are a helpful assistant. Given the following chat conversation, produce:
1. A short title (max 60 chars) that captures the main topic.
2. A brief summary (1-2 sentences, max 200 chars) describing what was discussed.

Reply with EXACTLY this format (no extra text):
TITLE: <title here>
SUMMARY: <summary here>
"""


async def generate_session_title_and_summary(
    messages: list[dict],
) -> tuple[str, str]:
    """Call the LLM to produce a title and summary for a chat session.

    Args:
        messages: List of message dicts with 'role' and 'content' keys.

    Returns:
        (title, summary) tuple. Falls back to a truncated first message
        if the LLM call fails.
    """
    # Build a condensed transcript (limit to keep prompt small)
    transcript_lines = []
    for msg in messages[:20]:  # Cap at 20 messages
        role_label = "User" if msg["role"] == "user" else "Assistant"
        # Truncate very long messages
        content = msg["content"][:500]
        transcript_lines.append(f"{role_label}: {content}")

    transcript = "\n".join(transcript_lines)

    # Fallback values
    first_user_msg = next(
        (m["content"] for m in messages if m["role"] == "user"), "New Chat"
    )
    fallback_title = first_user_msg[:60].strip()
    fallback_summary = ""

    try:
        llm = _get_summarize_llm()
        result = await llm.ainvoke(
            [
                SystemMessage(content=SUMMARIZE_PROMPT),
                HumanMessage(content=transcript),
            ]
        )

        text = result.content.strip()
        title, summary = _parse_title_summary(text)

        return (
            title or fallback_title,
            summary or fallback_summary,
        )

    except Exception as e:
        logger.warning(f"LLM summarization failed, using fallback: {e}")
        return fallback_title, fallback_summary


def _parse_title_summary(text: str) -> tuple[str | None, str | None]:
    """Parse the structured LLM output into title and summary."""
    title = None
    summary = None

    for line in text.splitlines():
        line = line.strip()
        if line.upper().startswith("TITLE:"):
            title = line[len("TITLE:"):].strip()[:255]
        elif line.upper().startswith("SUMMARY:"):
            summary = line[len("SUMMARY:"):].strip()

    return title, summary
