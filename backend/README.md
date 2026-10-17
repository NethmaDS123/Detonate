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
cp .env.example .env   # set DATABASE_URL (local Docker or Supabase — see ../docs/SUPABASE.md)
docker compose up -d   # optional if using local Postgres/Redis instead of Supabase
```

Hosted Postgres (Supabase): put the **Database URI** in `backend/.env` as `DATABASE_URL`. The API loads `.env` automatically and runs migrations on startup.

## Run API

```bash
cd backend
uv run --package detonate-api uvicorn detonate_api.main:app --reload --port 8000
```

- Health: http://localhost:8000/health  
- OpenAPI: http://localhost:8000/docs  
- Verify a run: `POST /v1/runs/verify` (JSON body: `difficultyId`, `seed`, `events`, `status`, `durationMs`); verified wins are inserted into `runs` when Postgres is available (`RUNS_PERSIST=1`, default). Daily wins include `dailyRank` and `dailyTotal` for that board.
- Leaderboard: `GET /v1/leaderboard?difficultyId=beginner&limit=10` — fastest stored wins for that difficulty.
- Daily leaderboard: `GET /v1/daily/leaderboard?difficultyId=beginner&limit=10` — fastest verified clears for today’s daily board (UTC).
- Daily board: `GET /v1/daily?difficultyId=beginner` — today’s shared seed (UTC), `dailyNumber` (day index since 2026-01-01), grid stats, and `bestDurationMs` for that daily. Publish to Redis with the worker (below).
- Accounts: `POST /v1/accounts` with `{ "displayName": "you" }` returns a one-time token; send `Authorization: Bearer <token>` on verify to name leaderboard entries.
- Clerk: set `CLERK_ISSUER` and `CLERK_JWKS_URL` to accept Clerk session JWTs. `POST /v1/accounts/clerk/sync` registers a player; `POST /v1/accounts/clerk/link` attaches a Clerk user to an existing token account.
- Personal bests: `GET /v1/accounts/me/bests` (auth required) — fastest verified classic and daily run per difficulty. Verify responses include `personalBestMs`, `previousPersonalBestMs`, and `isPersonalBest` when signed in.

## Daily worker

Publishes today’s seeds to Redis (same values the API computes as fallback):

```bash
cd backend
uv run --package detonate-worker detonate-worker
```

Schedule that once per UTC day in production.

## Tests

```bash
cd backend
uv run pytest packages/engine/tests apps/api/tests
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
| `apps/worker` | Daily board publish to Redis |
| `packages/engine` | Authoritative Minesweeper rules |
| `fixtures` | Golden replay JSON |
| `docker-compose.yml` | Postgres + Redis |

## Deploy (typical)

- API: container or PaaS running `uvicorn detonate_api.main:app --host 0.0.0.0 --port 8000`
- Set `DATABASE_URL`, `REDIS_URL`, `API_CORS_ORIGINS` (include your frontend origin)
- Worker: separate process when daily/outbox ships
