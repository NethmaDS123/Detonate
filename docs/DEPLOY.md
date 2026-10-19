# Production deploy

**Step-by-step public beta (Vercel + Render + Supabase + Clerk):** [`docs/LAUNCH.md`](LAUNCH.md)

Detonate runs as two deployable apps (frontend + API) plus managed **Postgres**, **Redis**, and a **daily worker** job.

## Architecture

| Component | Typical host | Notes |
| --- | --- | --- |
| Frontend (Next.js) | Vercel, Fly, Railway, Docker | Needs public `NEXT_PUBLIC_*` env at **build** time |
| API (FastAPI) | Fly, Railway, Render, Docker | Runs migrations on startup when `RUNS_PERSIST=1` |
| Postgres | Supabase, Neon, RDS, Compose | Required for ranked data |
| Redis | Upstash, ElastiCache, Compose | Daily seed cache; API falls back if empty |
| Worker | Cron, separate container, platform job | Once per UTC day: `detonate-worker` |

## Environment checklist

### Frontend (required for ranked features)

| Variable | Required | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_SITE_URL` | Recommended | `https://yourdomain.com` (OG/share links) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Optional | Clerk dashboard |
| `CLERK_SECRET_KEY` | Optional | Server-side Clerk (Next.js) |

### API (required for ranked features)

| Variable | Required | Example |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres URI (`?sslmode=require` on Supabase) |
| `REDIS_URL` | Recommended | `rediss://…` (Upstash) or `redis://…` |
| `API_CORS_ORIGINS` | Yes | `https://yourdomain.com` (comma-separated) |
| `RUNS_PERSIST` | Yes | `1` (default) — set `0` only for verify-only demos |
| `CLERK_ISSUER` | If using Clerk | `https://….clerk.accounts.dev` |
| `CLERK_JWKS_URL` | If using Clerk | `https://….clerk.accounts.dev/.well-known/jwks.json` |
| `RATE_LIMIT_ENABLED` | No | `1` — disable with `0` for local stress tests |
| `RATE_LIMIT_USE_REDIS` | Multi-instance API | `1` stores counters in Redis (default in-memory per process) |
| `RATE_LIMIT_*_PER_WINDOW` / `*_WINDOW_SEC` | No | Defaults: verify 30/min, accounts 5/hour, leaderboard 120/min |

### Worker

| Variable | Required | Default |
| --- | --- | --- |
| `REDIS_URL` | Yes | — |
| `WORKER_UTC_HOUR` | No | `0` (UTC hour for scheduled publish) |
| `WORKER_UTC_MINUTE` | No | `5` (UTC minute; default 00:05 UTC) |

No database URL required for the publish job.

## Docker (API)

From repo root:

```bash
docker build -f backend/Dockerfile -t detonate-api backend
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=postgresql://… \
  -e REDIS_URL=redis://… \
  -e API_CORS_ORIGINS=https://your-frontend.example \
  detonate-api
```

Health: `GET /health` · Readiness: `GET /ready`

## Docker (frontend)

Build args bake public env into the client bundle:

```bash
docker build -f frontend/Dockerfile -t detonate-web frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://yourdomain.com
docker run --rm -p 3000:3000 detonate-web
```

## Local full stack (Compose)

Postgres + Redis only (default):

```bash
cd backend && docker compose up -d
```

API + optional long-running daily scheduler (profile `worker`):

```bash
cd backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile worker up -d --build
```

The `worker` service runs `detonate-worker schedule`: publishes today on startup, then every UTC day at `WORKER_UTC_HOUR:WORKER_UTC_MINUTE` (default **00:05 UTC**).

API only (no scheduler container):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build api
```

Set `DATABASE_URL` / `REDIS_URL` in `.env` to match Compose services before starting the API container.

## PaaS notes

### Vercel (frontend)

1. Root directory: `frontend`
2. Install: `pnpm install`
3. Build: `pnpm build`
4. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` in project env (Production).
5. Add Clerk keys if using Google sign-in.

### Fly / Railway / Render (API)

1. Use `backend/Dockerfile` or install with `uv sync --all-packages` and start:

   `uv run --package detonate-api uvicorn detonate_api.main:app --host 0.0.0.0 --port $PORT`

2. Attach Postgres and Redis from the provider (or external Supabase + Upstash).
3. Set `API_CORS_ORIGINS` to your frontend origin(s).

### Daily worker

**One-shot** (cron / platform job), e.g. 00:05 UTC:

```bash
cd backend
uv run --package detonate-worker detonate-worker once
```

**Long-running scheduler** (Docker Compose `worker` profile, or a sidecar on Fly/Railway):

```bash
uv run --package detonate-worker detonate-worker schedule
```

**GitHub Actions:** optional workflow `.github/workflows/daily-worker.yml` runs on `cron: 5 0 * * *` when the repo secret `REDIS_URL` is set (skip if unset).

On Fly/Railway/Render, use either `schedule` in a small always-on container or a native scheduled job calling `detonate-worker once` with the same `REDIS_URL` as the API.

## Clerk in production

1. Add production domain in Clerk (**Domains**).
2. Match sign-in/sign-up URLs (`/sign-in`, `/sign-up`).
3. Copy production **publishable** + **secret** keys to the frontend host.
4. Set `CLERK_ISSUER` and `CLERK_JWKS_URL` on the API from the Clerk **JWT** / Frontend API settings.

## Pre-launch checks

- [ ] Frontend loads and calls API (`NEXT_PUBLIC_API_URL` correct, no mixed-content HTTP/HTTPS issues).
- [ ] `GET /ready` returns postgres + redis OK.
- [ ] Clear a board → verify → entry on leaderboard.
- [ ] Daily board loads (`GET /v1/daily`).
- [ ] Worker ran today or API daily fallback works.
- [ ] CORS allows your frontend origin on verify and leaderboard routes.

Add a **Live demo** link to root `README.md` only after both frontend and API URLs are stable.
