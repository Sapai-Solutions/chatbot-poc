"""Application configuration — loaded from environment variables via pydantic-settings.

Add your project-specific settings here. All values can be overridden via the .env file.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "KPDN Tribunal Transcriber"
    APP_URL: str = "http://localhost:8080"
    APP_ENV: str = "development"  # "development" | "production"
    SECRET_KEY: str = "change-me-in-production"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8080"

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://kpdn:changeme@db:5432/kpdn_db"
    DATABASE_URL_SYNC: str = "postgresql://kpdn:changeme@db:5432/kpdn_db"

    # ── Redis & Celery ────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/2"
    CELERY_TASK_SOFT_TIME_LIMIT: int = 900    # 15 min soft kill
    CELERY_TASK_TIME_LIMIT: int = 1200        # 20 min hard kill

    # ── Auth (JWT) ────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-this-jwt-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 72

    # ── Email (optional) ──────────────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "KPDN Tribunal Transcriber"

    # ── Cache ─────────────────────────────────────────────────────────────────
    CACHE_TTL: int = 300  # seconds

    # ── LLM Configuration ─────────────────────────────────────────────────────
    LLM_MODEL: str = "Qwen3.5-27B"
    LLM_BASE_URL: str = "http://100.71.19.113:8998/v1"
    LLM_API_KEY: str = "not-needed"  # Local deployment doesn't require key
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 4096

    # ── Computed properties ───────────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance. Use as a FastAPI dependency."""
    return Settings()
