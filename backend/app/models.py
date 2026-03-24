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

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Import Base so Alembic can discover all models via `from app.models import *`
from app.database import Base  # noqa: F401

# ── Add your models below ─────────────────────────────────────────────────────


class ChatSession(Base):
    """A chat session containing multiple messages."""

    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    title: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )  # Auto-generated or user-provided
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationship: a session has many messages
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at",
    )


class ChatMessage(Base):
    """A single message within a chat session."""

    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    session_id: Mapped[str] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False  # "user" or "assistant"
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tool_calls: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON-encoded tool calls
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship: a message belongs to one session
    session: Mapped[ChatSession] = relationship("ChatSession", back_populates="messages")