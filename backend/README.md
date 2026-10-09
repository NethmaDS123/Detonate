# Detonate Backend

FastAPI service, background worker stub, and **canonical** Python game engine. Deploy this separately from the frontend.

The browser has its own TypeScript engine port; it must stay aligned via golden fixtures (see `fixtures/` and `pnpm fixtures` in the sibling frontend after exporting).

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/)
- Docker (Postgres + Redis for `/ready` and future features)

## Setup

```bash
cd backend
uv sync --all-packages --group dev
cp .env.example .env   # optional
docker compose up -d   # optional until you need DB/Redis
```

## Run API

```bash
cd backend
uv run --package detonate-api uvicorn detonate_api.main:app --reload --port 8000
```

- Health: http://localhost:8000/health  
- OpenAPI: http://localhost:8000/docs  

## Tests

```bash
cd backend
uv run pytest packages/engine/tests
```

## Export fixtures (sync frontend engine tests)

When you change Python engine rules:

```bash
cd backend
uv run --package detonate-engine python packages/engine/scripts/export_fixtures.py
```

This writes `backend/fixtures/` and copies the same JSON into `../frontend/packages/engine/fixtures/` if that folder exists.

## Layout

| Path | Purpose |
| --- | --- |
| `apps/api` | FastAPI HTTP API |
| `apps/worker` | Jobs (daily board, outbox) — placeholder |
| `packages/engine` | Authoritative Minesweeper rules |
| `fixtures` | Golden replay JSON |
| `docker-compose.yml` | Postgres + Redis |

## Deploy (typical)

- API: container or PaaS running `uvicorn detonate_api.main:app --host 0.0.0.0 --port 8000`
- Set `DATABASE_URL`, `REDIS_URL`, `API_CORS_ORIGINS` (include your frontend origin)
- Worker: separate process when daily/outbox ships
