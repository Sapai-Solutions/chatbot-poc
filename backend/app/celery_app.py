"""Celery application — async task queue and beat scheduler.

Workers are optional (docker compose --profile celery up).

Adding a task:
    1. Create a file in app/tasks/ (e.g. app/tasks/emails.py)
    2. Decorate functions with @celery_app.task
    3. Add the module to the `include` list below
    4. Optionally schedule it in beat_schedule

Example task:
    from app.celery_app import celery_app

    @celery_app.task(bind=True, max_retries=3)
    def send_welcome_email(self, user_id: str):
        ...
"""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "kpdn",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        # Register task modules here, e.g.:
        # "app.tasks.emails",
        # "app.tasks.reports",
        "app.tasks.summarizer",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",  # Change to your timezone, e.g. "Asia/Kuala_Lumpur"
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,           # Re-queue task if worker crashes mid-execution
    worker_prefetch_multiplier=1,  # One task at a time per worker (fair distribution)
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_default_retry_delay=60,   # seconds between retries
    task_max_retries=3,
)

# ── Periodic task schedule (Celery Beat) ──────────────────────────────────────
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    # Backfill titles/summaries for sessions that never got one (e.g. tab closed)
    "summarize-untitled-sessions-hourly": {
        "task": "app.tasks.summarizer.backfill_session_summaries",
        "schedule": crontab(minute="0"),  # Top of every hour
    },
}
