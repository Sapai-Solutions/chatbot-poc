"""ChatbotPoc — FastAPI application entry point.

Startup checklist when adding new features:
  1. Create your models in app/models.py
  2. Run: docker compose exec backend alembic revision --autogenerate -m "msg"
     then: docker compose exec backend alembic upgrade head
  3. Create schemas in app/schemas.py
  4. Create a router in app/routers/<name>.py
  5. Include the router below with app.include_router(...)
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run code on startup and shutdown."""
    logger.info(f"Starting {settings.APP_NAME} [{settings.APP_ENV}]")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    description="Generated from aras-fullstack-template",
    version="1.0.0",
    lifespan=lifespan,
    # Hide docs in production
    openapi_url="/api/openapi.json" if not settings.is_production else None,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# CORS — credentials=True required for httpOnly JWT cookies
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)

# Add your routers here, e.g.:
# from app.routers import users, items
# app.include_router(users.router, prefix="/api")
# app.include_router(items.router, prefix="/api")
