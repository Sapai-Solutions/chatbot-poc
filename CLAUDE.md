# Project Guidelines

Full-stack app: FastAPI backend + React frontend + PostgreSQL + Redis + Nginx, all in Docker.

## Navigation

- **Backend code & rules:** `backend/CLAUDE.md`
- **Frontend code & rules:** `frontend/CLAUDE.md`
- **Docker config:** `docker-compose.yml` (dev), `docker-compose.prod.yml` (prod overrides)
- **Env vars:** `.env.example` (copy to `.env`)
- **Nginx:** `nginx/dev.conf`, `nginx/prod.conf`

## Key commands

```
docker compose up       # start dev
docker compose down     # stop
```

## Do not

- Commit `.env` — it is git-ignored
- Hardcode secrets — use `get_settings()` which reads `.env`
- Put business logic in routers — use `backend/app/services/`
