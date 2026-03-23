"""Async database engine and session factory.

Usage in FastAPI endpoints:
    from app.database import get_db
    from sqlalchemy.ext.asyncio import AsyncSession

    @router.get("/example")
    async def example(db: AsyncSession = Depends(get_db)):
        ...
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development",  # Log SQL in dev only
    pool_size=10,
    max_overflow=5,
    pool_pre_ping=True,  # Verify connection health before checkout
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models.

    Import this in your models:
        from app.database import Base
        class MyModel(Base): ...
    """
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency that yields a database session.

    Automatically commits on success, rolls back on exception.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
