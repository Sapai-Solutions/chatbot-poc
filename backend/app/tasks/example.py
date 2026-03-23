"""Example Celery tasks — delete this file when you add your own tasks.

HOW TO ADD A TASK
─────────────────
1. Define your task function here (or create a new file in this folder)
2. Register the module in backend/app/celery_app.py → include=[...]
3. Call it from your code: example_task.delay(arg1, arg2)
4. For periodic tasks: add an entry to beat_schedule in celery_app.py
5. Start workers: docker compose --profile celery up

TASK BEST PRACTICES
───────────────────
- Always use bind=True if you need self (for retries, task ID, etc.)
- Set max_retries and autoretry_for so transient failures self-heal
- Keep tasks small and focused — one task does one thing
- Never put database session logic at module level (only inside the task)
- Use task.apply_async(countdown=60) for delayed execution
- Use task.apply_async(eta=datetime) for scheduled one-off tasks
"""

import logging

from celery import Task

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


# ── Simple task ───────────────────────────────────────────────────────────────

@celery_app.task(
    name="app.tasks.example.ping",
    bind=True,
    max_retries=3,
    default_retry_delay=30,  # seconds between retries
)
def ping(self: Task) -> dict:
    """Minimal example task. Returns a pong.

    Call from anywhere in your app:
        from app.tasks.example import ping
        result = ping.delay()          # fire and forget
        result = ping.apply_async()    # same, more options
        value = ping.delay().get()     # block until done (avoid in web requests)
    """
    logger.info("ping task executed")
    return {"message": "pong", "task_id": self.request.id}


# ── Task with retry on failure ────────────────────────────────────────────────

@celery_app.task(
    name="app.tasks.example.send_email",
    bind=True,
    max_retries=5,
    autoretry_for=(Exception,),  # Auto-retry on any exception
    retry_backoff=True,           # Exponential backoff: 1s, 2s, 4s, 8s...
    retry_backoff_max=300,        # Cap backoff at 5 minutes
    retry_jitter=True,            # Add randomness to prevent thundering herd
)
def send_email(self: Task, recipient: str, subject: str, body: str) -> dict:
    """Example task that sends an email with automatic retry on failure.

    Usage:
        send_email.delay(
            recipient="user@example.com",
            subject="Hello",
            body="World",
        )
    """
    logger.info(f"Sending email to {recipient}: {subject}")
    # TODO: implement actual email sending here
    # from app.services.email import send
    # send(recipient, subject, body)
    return {"sent_to": recipient, "subject": subject}


# ── Periodic task (register in celery_app.py beat_schedule) ──────────────────

@celery_app.task(name="app.tasks.example.cleanup_old_records")
def cleanup_old_records() -> dict:
    """Example periodic task — run on a schedule via Celery Beat.

    To schedule this task, add to beat_schedule in app/celery_app.py:

        from celery.schedules import crontab

        celery_app.conf.beat_schedule = {
            "cleanup-daily": {
                "task": "app.tasks.example.cleanup_old_records",
                "schedule": crontab(hour="2", minute="0"),  # 02:00 UTC daily
            },
        }
    """
    logger.info("cleanup_old_records task running")
    # TODO: implement cleanup logic
    return {"cleaned": 0}
