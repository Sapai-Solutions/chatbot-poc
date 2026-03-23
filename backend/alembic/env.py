"""Alembic environment — sync migrations using DATABASE_URL_SYNC.

This file is executed by Alembic when running migrations.
It loads the DATABASE_URL_SYNC from your app settings (which reads from .env),
so you never need to put credentials in alembic.ini.

Autogenerate workflow:
    docker compose exec backend alembic revision --autogenerate -m "msg"  # generate migration
    docker compose exec backend alembic upgrade head                      # apply migrations
"""

import logging
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Load Alembic's logging config from alembic.ini
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

logger = logging.getLogger("alembic.env")


def get_database_url() -> str:
    """Load the sync DATABASE_URL from app settings.

    Alembic uses a synchronous connection for migrations, so we use DATABASE_URL_SYNC
    (psycopg2 driver) rather than DATABASE_URL (asyncpg driver).
    """
    from app.config import get_settings
    settings = get_settings()
    return settings.DATABASE_URL_SYNC


# Import all models so Alembic can detect schema changes via autogenerate.
# Add new model modules here as you create them.
from app.database import Base  # noqa: F401, E402
import app.models  # noqa: F401, E402 — registers all models onto Base.metadata

target_metadata = Base.metadata


# ── Offline mode (generates SQL without connecting) ────────────────────────────

def run_migrations_offline() -> None:
    """Generate SQL migration scripts without a live database connection."""
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode (connects and runs migrations directly) ────────────────────────

def run_migrations_online() -> None:
    """Run migrations using a sync engine with psycopg2."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


# ── Entry point ────────────────────────────────────────────────────────────────

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
