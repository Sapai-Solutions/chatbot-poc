# Backend Agent Guidelines

## Project

FastAPI 0.115 + Python 3.12 async backend. SQLAlchemy 2.0 async ORM, Alembic migrations, Pydantic v2 schemas, Celery 5 task queue, Redis cache.

## Commands

- `docker compose up` — start dev stack
- `docker compose exec backend alembic upgrade head` — apply migrations
- `docker compose exec backend alembic revision --autogenerate -m "msg"` — autogenerate migration
- `docker compose exec backend python -m pytest -v` — run pytest
- `docker compose exec backend python -m ruff check .` — run ruff

## File Structure — STRICT

```
app/
  main.py          # App factory, CORS, router registration only — no business logic
  config.py        # Pydantic BaseSettings — all env vars declared here
  database.py      # Engine, session, Base — do not modify unless changing DB setup
  models.py        # All ORM models (or split: models/users.py, models/items.py)
  schemas.py       # All Pydantic schemas (or split: schemas/users.py, schemas/items.py)
  cache.py         # Redis cache helpers
  celery_app.py    # Celery config + beat schedule
  middleware/       # Auth, rate limiting, custom middleware
  routers/          # One file per resource (users.py, items.py, reports.py)
  services/         # Business logic layer — routers call services, services call DB
  tasks/            # Celery tasks — one file per domain (emails.py, reports.py)
  utils/            # Pure utility functions (no DB, no state)
```

**Never** put business logic in routers. Routers validate input, call a service, return output.

## API Structure — ENFORCE CONSISTENTLY

All endpoints MUST be under `/api` prefix. Register routers in main.py:
```python
app.include_router(users.router, prefix="/api", tags=["users"])
```

### Naming conventions
- Resources are **plural nouns**: `/api/users`, `/api/reports`, `/api/items`
- CRUD maps to HTTP verbs: `GET` list, `GET /{id}` detail, `POST` create, `PUT /{id}` update, `DELETE /{id}` delete
- Actions that aren't CRUD use verbs: `POST /api/reports/{id}/generate`
- Query params for filtering: `GET /api/users?role=admin&active=true`
- Pagination: `?page=1&per_page=20` — default `per_page=20`, max `100`

### Every endpoint MUST have:
1. `response_model=SchemaName` — typed response, no raw dicts
2. A docstring (appears in Swagger)
3. Appropriate status code (`201` for create, `204` for delete)
4. Auth dependency if not public: `Depends(get_current_user)`

### Standard response patterns
```python
# List
@router.get("/api/items", response_model=list[ItemSchema])

# Detail
@router.get("/api/items/{item_id}", response_model=ItemSchema)

# Create — return 201
@router.post("/api/items", response_model=ItemSchema, status_code=201)

# Delete — return 204, no body
@router.delete("/api/items/{item_id}", status_code=204)
async def delete_item(...):
    ...
    return Response(status_code=204)
```

## Schema Rules

- `<Name>Base` — shared fields
- `<Name>Create` — input for POST (no id, no timestamps)
- `<Name>Update` — input for PUT/PATCH (all fields Optional)
- `<Name>` or `<Name>Response` — output (includes id, timestamps, `model_config = {"from_attributes": True}`)

## Security — NON-NEGOTIABLE

1. **Never** hardcode secrets. All secrets come from `get_settings()` which reads `.env`.
2. **Never** use `text()` with f-strings or `.format()` for SQL. Use parameterised queries only.
3. **Never** return password hashes, internal IDs, or secrets in API responses — control this via `response_model`.
4. **Never** trust user input — validate with Pydantic schemas on input, constrain with `Field(max_length=...)`, `Query(ge=1, le=100)`.
5. **Never** use `eval()`, `exec()`, or `pickle.loads()` on user-provided data.
6. **Never** log secrets, tokens, or passwords — even at DEBUG level.
7. Use `Depends(get_current_user)` for protected routes — no manual token parsing in route bodies.
8. File uploads: validate extension, enforce size limit, never serve from upload dir without sanitisation.

## Database Rules

- All DB access is async via `AsyncSession` from `Depends(get_db)`.
- ORM models go in `models.py`. Import `Base` from `database.py`.
- After adding/changing a model: run `alembic revision --autogenerate -m "msg"` then `alembic upgrade head` (via `docker compose exec backend`). Never edit migration files manually unless fixing a conflict.
- Use `mapped_column()` with explicit types. No `Column()` (legacy API).
- Relationships: always set `lazy="selectin"` or use explicit `selectinload()` to avoid N+1 queries.

## Error Handling

- Use `HTTPException` for expected errors (not found, forbidden, validation).
- Let unexpected errors propagate — FastAPI returns 500 automatically.
- Never catch broad `Exception` in route handlers unless re-raising.

## Code Style

- Type hints on all function signatures.
- One router file per resource. Keep files under 200 lines — split if larger.
- Imports: stdlib → third-party → app modules, separated by blank lines.
- Async everywhere in route handlers and services. Sync only in utils with no I/O.
