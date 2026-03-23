"""Health check router.

GET /api/health — used by load balancers, Docker health checks, and monitoring.
"""

from fastapi import APIRouter

from app.config import get_settings
from app.schemas import HealthResponse

router = APIRouter(tags=["system"])
settings = get_settings()


@router.get("/api/health", response_model=HealthResponse)
async def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "environment": settings.APP_ENV,
    }
