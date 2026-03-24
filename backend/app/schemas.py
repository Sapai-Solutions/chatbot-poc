"""Pydantic schemas for request/response validation.

Schemas are separate from ORM models. A common pattern:
    - <Name>Base   — shared fields
    - <Name>Create — fields required on creation (input)
    - <Name>       — full response schema (output, includes id/timestamps)

Example:
    from pydantic import BaseModel, EmailStr
    from datetime import datetime

    class UserBase(BaseModel):
        email: EmailStr

    class UserCreate(UserBase):
        password: str

    class User(UserBase):
        id: str
        created_at: datetime

        model_config = {"from_attributes": True}
"""

from datetime import datetime

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str


# ── Chat Schemas ───────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """A single chat message."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    message: str
    session_id: str | None = None  # Optional for conversation persistence


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    message: str
    session_id: str
    tool_calls: list[dict] | None = None


class ToolCallInfo(BaseModel):
    """Information about a tool call made by the agent."""
    tool_name: str
    arguments: dict
    result: str | None = None


# ── Session Schemas ────────────────────────────────────────────────────────────


class ChatMessageSchema(BaseModel):
    """A chat message for response serialization."""
    id: str
    role: str
    content: str
    tool_calls: list[dict] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionBase(BaseModel):
    """Base schema for chat sessions."""
    title: str | None = None
    summary: str | None = None


class ChatSessionCreate(ChatSessionBase):
    """Schema for creating a new chat session."""
    pass


class ChatSessionResponse(ChatSessionBase):
    """Schema for chat session response with metadata."""
    id: str
    title: str | None
    summary: str | None = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class ChatSessionDetail(ChatSessionResponse):
    """Schema for chat session with full message history."""
    messages: list[ChatMessageSchema] = []

    model_config = {"from_attributes": True}
