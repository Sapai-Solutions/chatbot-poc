# syntax=docker/dockerfile:1
# ── aras-fullstack-template: Backend Dockerfile ───────────────────────────────
#
# OPTIMIZATION NOTES (read before modifying):
#
#   1. Alpine base (~50MB vs ~900MB debian-slim)
#      python:3.12-alpine is significantly smaller than the default image.
#      Trade-off: packages with C extensions must compile from source on alpine
#      (musl libc vs glibc). Build deps are installed temporarily then removed.
#
#   2. Virtual build deps (apk --virtual)
#      Build tools (gcc, musl-dev, etc.) are grouped into ".build-deps" and
#      deleted after pip install completes. Runtime libs (libpq, libffi) are
#      kept separately. This avoids bloating the final image with compilers.
#
#   3. Layer cache for dependencies
#      requirements.txt is copied and installed BEFORE the source code is copied.
#      Docker caches the pip install layer — it only re-runs when requirements.txt
#      changes, not on every code edit. This makes rebuilds much faster.
#
#   4. --no-cache-dir on pip
#      Prevents pip from storing a download cache inside the image layer.
#      Saves ~30–50MB per image.
#
#   5. Multi-stage build (development / production targets)
#      The dev stage is lightweight — source is bind-mounted, not copied.
#      The prod stage copies source, removes dev tooling, and uses a non-root user.
#
#   6. Non-root user in production
#      Running as a non-root user is a security best practice. It also prevents
#      permission issues when writing to mounted volumes in some environments.
#
#   7. PYTHONDONTWRITEBYTECODE + PYTHONUNBUFFERED
#      - PYTHONDONTWRITEBYTECODE: no .pyc files written inside the container
#      - PYTHONUNBUFFERED: logs stream immediately (no stdout buffering).
#        Critical for Docker log tailing to work correctly.
#
# Usage:
#   Dev (via docker compose):   docker compose up
#   Prod (via docker compose):  docker compose -f docker-compose.prod.yml up -d
#   Manual build (prod):        docker build --target production -t chatbot-backend .
# ─────────────────────────────────────────────────────────────────────────────

# ── BASE — shared between dev and prod ────────────────────────────────────────
FROM python:3.12-alpine AS base

WORKDIR /app

# Prevent .pyc files and enable real-time log streaming
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

# Install runtime libraries (kept in final image)
RUN apk add --no-cache \
    libpq \
    libffi

# Install build tools temporarily, compile Python packages, then remove tools
# This keeps the final image lean while still supporting packages with C extensions
RUN apk add --no-cache --virtual .build-deps \
    gcc \
    musl-dev \
    postgresql-dev \
    libffi-dev \
    python3-dev

# Copy requirements first — isolated layer, only rebuilds when requirements change
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && apk del .build-deps  # Remove build tools after install (saves ~80MB)

# ── DEVELOPMENT — bind-mounted source, hot reload ────────────────────────────
FROM base AS development

# Source code is mounted at runtime via docker-compose volumes.
# entrypoint.sh is available through the bind mount (./backend:/app).
EXPOSE 8000
ENTRYPOINT ["sh", "entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ── PRODUCTION — copied source, gunicorn, non-root user ──────────────────────
FROM base AS production

# Install gunicorn (production ASGI/WSGI server)
# Uses UvicornWorker to serve async FastAPI with multiple processes
RUN pip install --no-cache-dir "gunicorn==23.*"

# Copy source code (no bind mounts in prod)
COPY . .

# Make entrypoint executable and create a non-root user
RUN chmod +x entrypoint.sh \
    && addgroup -S appgroup \
    && adduser -S appuser -G appgroup

USER appuser

EXPOSE 8000
ENTRYPOINT ["sh", "entrypoint.sh"]
# 2 workers by default. Tune with: --workers $((2 * $(nproc) + 1))
CMD ["gunicorn", "app.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
