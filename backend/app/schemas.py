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

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str


# ── Add your schemas below ────────────────────────────────────────────────────
