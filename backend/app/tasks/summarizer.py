"""Periodic Celery task — backfill titles and summaries for unnamed sessions.

Runs every hour via Celery Beat to catch sessions that never got a title/summary
(e.g. the user closed the tab without clicking "New Chat").

Only processes sessions that:
  - Have no title set yet
  - Have at least one chat message
  - Were created more than 5 minutes ago (to avoid racing with the inline
    summarization that fires after the first exchange)
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from celery import Task
from sqlalchemy import func, select

from app.celery_app import celery_app
from app.database import async_session
from app.models import ChatMessage, ChatSession
from app.services.session_summarizer import generate_session_title_and_summary

logger = logging.getLogger(__name__)

# Minimum age before we touch an untitled session (avoids racing with the
# inline summarizer that triggers after the first exchange).
MIN_SESSION_AGE_MINUTES = 5


@celery_app.task(
    name="app.tasks.summarizer.backfill_session_summaries",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
)
def backfill_session_summaries(self: Task) -> dict:
    """Find unnamed sessions and generate their titles / summaries.

    Returns:
        dict with counts: processed, succeeded, failed, skipped.
    """
    return asyncio.run(_async_backfill())


async def _async_backfill() -> dict:
    """Async implementation — runs inside asyncio.run() from the Celery task."""
    cutoff = datetime.now(tz=timezone.utc) - timedelta(minutes=MIN_SESSION_AGE_MINUTES)

    processed = 0
    succeeded = 0
    failed = 0

    async with async_session() as db:
        # Find sessions without a title that are old enough and have messages
        subquery = (
            select(ChatMessage.session_id)
            .group_by(ChatMessage.session_id)
            .having(func.count(ChatMessage.id) > 0)
            .scalar_subquery()
        )

        stmt = (
            select(ChatSession)
            .where(ChatSession.title.is_(None))
            .where(ChatSession.created_at < cutoff)
            .where(ChatSession.id.in_(subquery))
            .order_by(ChatSession.created_at.desc())
            .limit(50)  # Safety cap per run
        )

        result = await db.execute(stmt)
        sessions = result.scalars().all()

        logger.info(
            f"[summarizer] Found {len(sessions)} untitled session(s) to process."
        )

        for session in sessions:
            processed += 1
            try:
                # Fetch messages for this session
                msg_stmt = (
                    select(ChatMessage)
                    .where(ChatMessage.session_id == session.id)
                    .order_by(ChatMessage.created_at)
                )
                msg_result = await db.execute(msg_stmt)
                messages = msg_result.scalars().all()

                if not messages:
                    continue

                msg_dicts = [
                    {"role": m.role, "content": m.content} for m in messages
                ]

                title, summary = await generate_session_title_and_summary(msg_dicts)

                if title:
                    session.title = title
                if summary:
                    session.summary = summary

                succeeded += 1
                logger.info(
                    f"[summarizer] Session {session.id} titled: '{title}'"
                )

            except Exception as exc:
                failed += 1
                logger.warning(
                    f"[summarizer] Failed to summarize session {session.id}: {exc}"
                )

        try:
            await db.commit()
        except Exception as exc:
            await db.rollback()
            logger.error(f"[summarizer] DB commit failed: {exc}")
            raise

    stats = {
        "processed": processed,
        "succeeded": succeeded,
        "failed": failed,
        "skipped": processed - succeeded - failed,
    }
    logger.info(f"[summarizer] Done. Stats: {stats}")
    return stats
