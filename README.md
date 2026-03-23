# Chatbot POC

An AI-powered chatbot template with LangGraph integration, built with **aras-fullstack-template** by Aras Integrasi.

Features LangGraph agent with tool calling capabilities, knowledge base integration, and a modern React frontend.

`docker compose up` → start building.

---

## Documentation

- **Notion**: https://www.notion.so/Chatbot-POC-AI-Assistant-Template-32cf927f17708122a2e3c1c506522b57
- **GitHub**: https://github.com/Sapai-Solutions/chatbot-poc

The Notion page includes:
- Architecture deep dive (LangGraph ReAct pattern)
- Tool definitions and state management
- Frontend component structure
- Knowledge base integration guide
- Deployment instructions
- Localization guide for downstream use cases
- Extensibility updates (env-based configuration)

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend | FastAPI (Python 3.12) | Async, Pydantic v2 |
| Frontend | React 19 + Vite 6 + Tailwind CSS 3 | |
| Database | PostgreSQL 16 + TimescaleDB | Alembic migrations, time-series ready |
| Cache / Queue | Redis 7 | Celery broker + result backend |
| Workers | Celery 5 + Celery Beat | Optional (profile-based) |
| Proxy | Nginx | Single entry point |
| Containers | Docker + Docker Compose | Dev + Prod configs |

---

## Creating a New Project

Run the interactive bootstrapper from the template directory:

```bash
python setup.py
```

The script will:
1. Ask for your project name (validates format)
2. Ask for a destination path (relative paths like `../chatbot-poc` work)
3. Show a full summary before touching anything
4. Copy the template, replace all placeholder names
5. Copy `.env.example` → `.env`
6. Optionally run `git init`

**Prerequisites:** Python 3.8+ (no packages needed — uses only stdlib)

---

## First-Time Setup (after bootstrapping)

```bash
cd chatbot-poc

# Review and update secrets in .env before starting
# Minimum: change POSTGRES_PASSWORD, SECRET_KEY, JWT_SECRET
nano .env   # or open in your editor

# Start the dev environment (builds images on first run, runs migrations automatically)
docker compose up
```

The app is then available at:

| URL | What |
|---|---|
| `http://localhost:8080` | App entry point (via nginx) |
| `http://localhost:3000` | Frontend direct (Vite dev server) |
| `http://localhost:8000/docs` | FastAPI Swagger UI |
| `http://localhost:8000/api/health` | Health check endpoint |

---

## Daily Development

```bash
docker compose up                         # Start all services (foreground, Ctrl+C to stop)
docker compose up -d                      # Start all services (background)
docker compose down                       # Stop all services
docker compose logs -f                    # Tail all logs
docker compose logs -f backend            # Tail backend only
docker compose ps                         # Show container status
docker compose exec backend sh            # Shell inside backend container
docker compose exec backend python        # Python shell inside backend
docker compose exec frontend sh           # Shell inside frontend container
docker compose exec db psql -U chatbotpoc -d chatbotpoc_db   # PostgreSQL shell
```

---

## Database Migrations (Alembic)

After adding or modifying models in `backend/app/models.py`:

```bash
# Generate a new migration file (Alembic detects model changes automatically)
docker compose exec backend alembic revision --autogenerate -m "add users table"

# Apply all pending migrations
docker compose exec backend alembic upgrade head

# View migration history
docker compose exec backend alembic history --verbose

# Roll back the last migration (careful in production!)
docker compose exec backend alembic downgrade -1
```

Migrations run automatically on container start via `entrypoint.sh`.

---

## Running Celery (Optional)

Celery workers are off by default. Enable them with:

```bash
# Start workers for this session only
docker compose --profile celery up

# Or permanently enable in your .env:
COMPOSE_PROFILES=celery
docker compose up
```

Add tasks in `backend/app/tasks/`, register them in `backend/app/celery_app.py`.
See `backend/app/tasks/example.py` for annotated examples (simple task, retry-with-backoff, periodic task).

---

## TimescaleDB (Time-Series Extension)

The database uses `timescale/timescaledb:latest-pg16` — a drop-in replacement for PostgreSQL that includes the TimescaleDB extension. It works exactly like standard PostgreSQL out of the box with negligible overhead (~5-15 MB RAM, no CPU impact when idle).

**To enable TimescaleDB features** (hypertables, continuous aggregates, compression):

```bash
# Connect to the database
docker compose exec db psql -U chatbotpoc -d chatbotpoc_db

# Enable the extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Convert a table to a hypertable (example)
SELECT create_hypertable('events', 'created_at');
```

TimescaleDB is only activated when you explicitly run `CREATE EXTENSION`. If you never enable it, the database behaves identically to standard PostgreSQL.

---

## Extending Docker Compose

This template uses **Docker Compose profiles** to keep optional services off by default.
The same pattern works for any tool you want to add — Flower, pgAdmin, Mailhog, a second worker queue, etc.

### How profiles work

```yaml
# In docker-compose.yml — a service with a profile is IGNORED unless that profile is active
my-optional-service:
  image: some/image
  profiles:
    - my-profile      # only starts when --profile my-profile is passed
```

```bash
# Start normally (profile services are skipped)
docker compose up

# Start with the profile active
docker compose --profile my-profile up

# Multiple profiles at once
docker compose --profile celery --profile monitoring up

# Permanently enable profiles in your .env (so plain `docker compose up` includes them)
COMPOSE_PROFILES=celery,monitoring
```

---

### Example: Enable Celery (already included)

Celery worker and beat are already defined in `docker-compose.yml` under the `celery` profile.

```bash
# Dev
docker compose --profile celery up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile celery up -d
```

To make Celery always start (e.g. on a dedicated dev server), add to `.env`:
```
COMPOSE_PROFILES=celery
```

---

### Example: Add Flower (Celery monitoring dashboard)

Flower gives you a web UI to monitor Celery tasks, workers, and queues.

Add to `docker-compose.yml`:

```yaml
  flower:
    image: mher/flower:2.0
    container_name: chatbot-poc-flower
    command: celery --broker=${CELERY_BROKER_URL} flower --port=5555
    ports:
      - "5555:5555"
    env_file: .env
    depends_on:
      - redis
    profiles:
      - celery      # starts together with workers when --profile celery is used
```

Then open `http://localhost:5555` after `docker compose --profile celery up`.

---

### Example: Add pgAdmin (database GUI)

```yaml
  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: chatbot-poc-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@example.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      db:
        condition: service_healthy
    profiles:
      - tools     # start with: docker compose --profile tools up
```

Then open `http://localhost:5050`. Connect using host `db`, port `5432`, and your DB credentials from `.env`.

---

### Example: Add Mailhog (local SMTP for email testing)

Mailhog captures all outbound emails in a local web UI — no real emails are sent.

```yaml
  mailhog:
    image: mailhog/mailhog:latest
    container_name: chatbot-poc-mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI
    profiles:
      - tools
```

Update `.env` to point your app at Mailhog during development:
```
SMTP_HOST=mailhog
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
```

Then open `http://localhost:8025` to see captured emails.

---

### Example: Add a second Celery worker queue

If some tasks are slow (e.g. report generation) and some are fast (e.g. notifications),
run separate worker processes for each queue so they don't block each other.

In `backend/app/tasks/reports.py`, declare which queue the task uses:
```python
@celery_app.task(queue="reports")
def generate_report(...): ...
```

Add a dedicated worker to `docker-compose.yml`:
```yaml
  celery-worker-reports:
    build:
      context: ./backend
      target: development
    container_name: chatbot-poc-celery-worker-reports
    command: celery -A app.celery_app worker --loglevel=info --queues=reports --concurrency=1
    env_file: .env
    volumes:
      - ./backend:/app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    profiles:
      - celery
```

The default worker still handles all other queues. The reports worker only handles the `reports` queue.

---

### General pattern for any new service

```yaml
  your-service:
    image: some/image:tag          # always pin a version tag, never use :latest in prod
    container_name: chatbot-poc-your-service
    ports:
      - "HOST_PORT:CONTAINER_PORT"
    environment:
      SOME_VAR: value
    env_file: .env                 # optional: load from .env
    depends_on:
      - db                         # or: condition: service_healthy
    volumes:
      - ./local/path:/container/path  # bind mount
      - named-volume:/container/path  # named volume (add to volumes: section at bottom)
    profiles:
      - your-profile               # omit if this service should always start
    restart: unless-stopped        # add in docker-compose.prod.yml, not here
```

Key rules:
- **Always pin image versions** (`postgres:16-alpine` not `postgres:latest`) — `latest` can break silently when the image is updated
- **Use profiles** for anything that isn't required for basic development (Celery, monitoring tools, admin UIs)
- **Named volumes** persist across restarts; bind mounts (`./local:/container`) enable hot reload
- **`restart: unless-stopped`** belongs in `docker-compose.prod.yml` only — in dev you want containers to stay stopped so errors are visible

---

## Production Deployment

```bash
# Build and start the production stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# With Celery in production:
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile celery up -d --build

# Stop production stack:
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

Production changes vs development:
- Backend: Gunicorn + UvicornWorker (multi-process, no `--reload`)
- Frontend: nginx:alpine serving pre-built static files (no Vite, no Node.js)
- Nginx: port 80, gzip enabled, security headers added
- All services: `restart: unless-stopped` for auto-recovery
- No bind mounts — code is baked into images

---

## Port Reference & Conflict Resolution

> **If any port is already in use on your machine, Docker will fail to start that service.**

Default ports used by this template:

| Port | Service | Standard? |
|---|---|---|
| `8080` | Nginx (app entry point) | Non-standard — safe for dev |
| `3000` | Vite dev server (frontend) | Common — may conflict with other apps |
| `8000` | FastAPI backend | Common — may conflict with other dev servers |
| `5432` | PostgreSQL + TimescaleDB | Standard PostgreSQL port |
| `6379` | Redis | Standard Redis port |

**How to check if a port is in use:**

```bash
# macOS / Linux
lsof -i :5432

# Windows (PowerShell)
netstat -ano | findstr :5432
# Then: tasklist | findstr <PID>

# Cross-platform (Docker)
docker ps   # Check if another container is using the port
```

**How to change a port:**

Open `docker-compose.yml` and edit the port mapping for the affected service.
Format: `"HOST_PORT:CONTAINER_PORT"` — only change the left (host) side.

```yaml
# Example: change postgres to host port 5433
db:
  ports:
    - "5433:5432"   # Container still listens on 5432 internally
```

Also update `DATABASE_URL` in `.env` to match if you change the postgres port
(for direct connections from tools like TablePlus or DBeaver):
```
DATABASE_URL_SYNC=postgresql://chatbotpoc:changeme@localhost:5433/chatbotpoc_db
```

Note: Service-to-service communication inside Docker always uses the internal
port (5432), regardless of the host mapping. Only external access uses the host port.

---

## Docker Optimisation Notes

The Dockerfiles and compose files in this template are heavily optimised.
Here's what was done and why — read this before modifying the Docker setup.

### Backend (`backend/Dockerfile`)

| Optimisation | Saving | Why |
|---|---|---|
| `python:3.12-alpine` base | ~850MB | Alpine = ~50MB vs ~900MB for debian. Much smaller attack surface. |
| Virtual build deps (`apk --virtual`) | ~80MB | `gcc`, `musl-dev` etc. are only needed during `pip install`. They're installed, used, then deleted in the same `RUN` layer, so they never make it into the final image. |
| Runtime libs kept separately | 0MB saved, required | `libpq` and `libffi` are needed at runtime (not just build time) so they're installed without `--virtual`. |
| `COPY requirements.txt` before source | Faster rebuilds | Docker caches layers. If you change source code but not `requirements.txt`, Docker skips the `pip install` layer entirely — saving 30-90 seconds per rebuild. |
| `--no-cache-dir` on pip | ~30-50MB | Prevents pip from writing a download cache into the image layer. |
| `PYTHONDONTWRITEBYTECODE=1` | ~5-10MB | Stops Python from writing `.pyc` files inside the container. |
| `PYTHONUNBUFFERED=1` | Correctness | Makes Python flush logs immediately. Without this, `docker compose logs` may show nothing for long periods. |
| Multi-stage (`development` / `production`) | Varies | Dev stage relies on bind mounts — no source code is copied in. Prod stage copies source and adds Gunicorn. Each serves a different need without duplicating configuration. |
| Non-root user in production | Security | Containers running as root can escalate privileges in certain escape scenarios. The `appuser` has minimal permissions. |

### Frontend (`frontend/Dockerfile`)

| Optimisation | Saving | Why |
|---|---|---|
| `node:20-alpine` base | ~750MB | Alpine Node is ~150MB vs ~900MB for full Node. |
| `npm ci` (not `npm install`) | Correctness + speed | Uses exact versions from `package-lock.json`. Fails fast if lock file is out of sync. Faster than `npm install` because it skips dependency resolution. |
| `COPY package.json` before source | Faster rebuilds | Same layer-cache trick as backend. `node_modules` only rebuild when dependencies change. |
| Anonymous volume `/app/node_modules` | Correctness | Without this, the bind mount `./frontend:/app` would overwrite the container's `node_modules` with the (often empty) host folder. The anonymous volume shadows the bind mount at that path. |
| `WATCHPACK_POLLING=true` | HMR correctness | Vite uses `inotify` for file watching, which does not work across the Docker VM boundary on Windows and macOS. Polling mode is slower but reliable on all platforms. |
| Multi-stage (`development` / `builder` / `production`) | ~880MB | Production stage is `nginx:alpine` (~25MB) with pre-built static files. There is no Node.js runtime in the production image at all. |

### Compose

| Optimisation | Why |
|---|---|
| `timescale/timescaledb:latest-pg16` | PostgreSQL 16 with TimescaleDB pre-installed. ~170 MB larger than `postgres:16-alpine` but adds time-series capabilities with negligible runtime overhead (~5-15 MB RAM) when not actively used. Enable with `CREATE EXTENSION timescaledb;` in your database when needed. |
| `start_period` on health checks | Prevents false failures during first boot (when Postgres is initialising the data directory). Without this, backend may fail to start before DB is ready. |
| Celery behind `profiles: [celery]` | Celery worker + beat don't start unless explicitly requested. Saves ~200-400MB RAM on machines where you're not using background tasks. |
| `restart: unless-stopped` prod only | In dev, crashing containers surface errors clearly. In prod, auto-restart prevents downtime from transient failures. |
| Named volumes only | Named volumes persist across `docker compose down` and have predictable names. Anonymous volumes are harder to manage. Use `docker compose down -v` to delete them. |
| No `version:` key | Docker Compose v2+ ignores the `version:` field and shows a deprecation warning. It has been removed. |

---

## Project Structure

```
chatbot-poc/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, router registration
│   │   ├── config.py         # Pydantic settings (reads from .env)
│   │   ├── database.py       # Async SQLAlchemy engine + session
│   │   ├── models.py         # ORM models (add yours here)
│   │   ├── schemas.py        # Pydantic request/response schemas
│   │   ├── celery_app.py     # Celery + Beat config
│   │   ├── cache.py          # Redis cache helpers
│   │   ├── middleware/
│   │   │   └── auth.py       # JWT auth dependency
│   │   └── routers/
│   │       └── health.py     # GET /api/health
│   ├── alembic/
│   │   ├── env.py            # Alembic wired to async engine
│   │   └── versions/         # Migration files (committed to git)
│   ├── alembic.ini
│   ├── entrypoint.sh         # Runs migrations then starts server
│   ├── requirements.txt
│   └── Dockerfile            # Multi-stage: development / production
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx           # React Router setup
│   │   ├── index.css         # Design tokens + global styles
│   │   ├── api.js            # Centralised fetch wrapper
│   │   └── pages/
│   │       └── Home.jsx      # Landing page + design system reference
│   ├── index.html
│   ├── package.json          # name: "chatbot-poc" after bootstrapping
│   ├── vite.config.js        # Dev proxy to backend
│   ├── nginx-spa.conf        # SPA routing (used in production container)
│   └── Dockerfile            # Multi-stage: development / builder / production
│
├── nginx/
│   ├── dev.conf              # Dev proxy: Vite dev server + backend
│   └── prod.conf             # Prod proxy: nginx frontend + backend
│
├── .env.example              # Template for environment variables
├── .env                      # Your local secrets (git-ignored)
├── .gitignore
├── docker-compose.yml        # Dev environment (default)
├── docker-compose.prod.yml   # Production overrides
├── CLAUDE.md                 # AI agent guidelines (root-level)
└── README.md
```

---

## AI Coding Agent Guidelines (CLAUDE.md)

This template includes `CLAUDE.md` files that provide guidelines for AI coding assistants (Claude Code, Cursor, Windsurf, Copilot, etc.).

```
CLAUDE.md                # Root — project-wide architecture, commands, security rules
backend/CLAUDE.md        # Backend — API structure, schema patterns, security, DB rules
frontend/CLAUDE.md       # Frontend — (created after UI design is finalised)
```

These files ensure consistent code structure, API patterns, and security practices across all engineers and agents on the project.

**If your team uses a different coding agent**, rename the files:
```bash
# Example: rename to AGENT.md for a generic name
mv CLAUDE.md AGENT.md
mv backend/CLAUDE.md backend/AGENT.md
```

Then configure your coding agent to read the renamed file. The content is agent-agnostic — it's just project conventions.

---

## Adding Features

### New backend endpoint

1. Add a model to `backend/app/models.py`
2. Generate and apply migration:
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "add my_feature table"
   docker compose exec backend alembic upgrade head
   ```
3. Add a schema to `backend/app/schemas.py`
4. Create `backend/app/routers/my_feature.py`
5. Register it in `backend/app/main.py`:
   ```python
   from app.routers import my_feature
   app.include_router(my_feature.router, prefix="/api")
   ```

### New Celery task

1. Create `backend/app/tasks/my_task.py`
2. Add the module to `include` in `backend/app/celery_app.py`
3. Schedule it in `beat_schedule` if periodic

### New frontend page

1. Create `frontend/src/pages/MyPage.jsx`
2. Add a route in `frontend/src/App.jsx`:
   ```jsx
   import MyPage from './pages/MyPage'
   <Route path="/my-page" element={<MyPage />} />
   ```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `APP_NAME` | No | Display name shown in API docs |
| `APP_ENV` | No | `development` or `production` |
| `SECRET_KEY` | **Yes (prod)** | App secret — generate a random 50-char string |
| `POSTGRES_DB` | No | Database name (must match `DATABASE_URL`) |
| `POSTGRES_USER` | No | Database user |
| `POSTGRES_PASSWORD` | **Yes** | Database password |
| `DATABASE_URL` | No | Async connection string (asyncpg) |
| `DATABASE_URL_SYNC` | No | Sync connection string (Alembic) |
| `REDIS_URL` | No | Redis URL for app cache |
| `CELERY_BROKER_URL` | No | Redis URL for Celery task queue |
| `JWT_SECRET` | **Yes (prod)** | JWT signing secret — generate separately from SECRET_KEY |
| `COMPOSE_PROFILES` | No | Set to `celery` to always start workers |

Generate secrets:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

---

## Design System

The frontend uses a dark gold design system based on the Aras Integrasi brand.

**Quick reference:**

```css
/* Gold (primary interactive colour) */
--color-parliament-300: #FFD070   /* Hover, glows */
--color-parliament-400: #F5B731   /* Default — buttons, links, active */
--color-parliament-500: #D4A020   /* Pressed, dark accents */

/* Dark surfaces (use in ascending order for elevation) */
--color-ink:   #0A0A0A            /* Page background */
--color-ink-1: #141414            /* Content areas */
--color-ink-2: #1E1E1E            /* Cards, panels */
--color-ink-3: #282828            /* Dropdowns, tooltips */
--color-ink-4: #333333            /* Borders, dividers */

/* Text */
--color-snow:       #F5F5F5       /* Primary text */
--color-snow-muted: #9A9A9A       /* Secondary / hint */
```

See `frontend/src/index.css` for the full token list and component classes.
See `frontend/src/pages/Home.jsx` for live examples of every component.

**Core rules:**
- Never use raw hex values in components — always reference a CSS variable or Tailwind token
- Gold is an accent colour, not a background
- Use ink layers for depth (not drop shadows)
- All spacing in multiples of 4px
- Every interactive element must have idle / hover / active / disabled states

---

*Generated by [aras-fullstack-template](https://github.com/arasintegrasi) · Aras Integrasi*
