#!/bin/sh
# Backend container entrypoint
# Runs Alembic migrations before starting the server.
# This ensures the database schema is always up to date on container start.
set -e

echo "==> Waiting for database to be ready..."
# The 'service_healthy' condition in docker-compose already waits for pg_isready,
# but we add a small retry loop as a safety net for slow first-boot scenarios.
retries=0
until python -c "
import sys
import psycopg2
import os
try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL_SYNC', ''))
    conn.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null; do
    retries=$((retries + 1))
    if [ "$retries" -ge 20 ]; then
        echo "ERROR: Database not reachable after 20 retries. Exiting."
        exit 1
    fi
    echo "    Database not ready yet (attempt $retries/20). Retrying in 2s..."
    sleep 2
done

echo "==> Database is ready."
echo "==> Running Alembic migrations..."
alembic upgrade head

echo "==> Migrations complete. Starting server..."
exec "$@"
