"""JWT authentication middleware and FastAPI dependency functions.

Usage in a route:
    from app.middleware.auth import get_current_user, require_role

    @router.get("/protected")
    async def protected(user: dict = Depends(get_current_user)):
        return {"user": user}

    @router.delete("/admin-only")
    async def admin_only(user: dict = Depends(require_role("admin"))):
        ...
"""

import logging
from typing import Optional

from fastapi import Cookie, Depends, Header, HTTPException, status
from jose import JWTError, jwt

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Token helpers ─────────────────────────────────────────────────────────────

def create_access_token(data: dict) -> str:
    """Create a signed JWT. Pass any serialisable dict as payload."""
    return jwt.encode(data, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT. Raises HTTP 401 on failure."""
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# ── Token extraction ──────────────────────────────────────────────────────────

def _extract_token(
    authorization: Optional[str] = Header(default=None),
    access_token: Optional[str] = Cookie(default=None),
) -> str:
    """Extract JWT from Authorization header (Bearer) or httpOnly cookie."""
    if authorization and authorization.startswith("Bearer "):
        return authorization.removeprefix("Bearer ").strip()
    if access_token:
        return access_token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ── User dependency ───────────────────────────────────────────────────────────

async def get_current_user(token: str = Depends(_extract_token)) -> dict:
    """Decode the JWT and return its payload as a dict.

    Extend this function to fetch the user from the database if needed:
        payload = decode_access_token(token)
        user = await db.get(User, payload["sub"])
        if not user: raise HTTPException(401, ...)
        return user
    """
    return decode_access_token(token)


# ── Role-based dependencies ───────────────────────────────────────────────────

def require_role(*allowed_roles: str):
    """Return a dependency that checks the user's role.

    The JWT payload must contain a "role" field.
    Usage: Depends(require_role("admin", "editor"))
    """
    async def _check(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(allowed_roles)}",
            )
        return user
    return _check
