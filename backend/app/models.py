"""ORM models — define your database tables here.

Each model class becomes a table. Alembic will autogenerate migrations
when you run: docker compose exec backend alembic revision --autogenerate -m "msg"

Example:
    import uuid
    from datetime import datetime
    from sqlalchemy import String, DateTime, func
    from sqlalchemy.orm import Mapped, mapped_column
    from app.database import Base

    class User(Base):
        __tablename__ = "users"

        id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
        email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
        created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
"""

# Import Base so Alembic can discover all models via `from app.models import *`
from app.database import Base  # noqa: F401

# ── Add your models below ─────────────────────────────────────────────────────
