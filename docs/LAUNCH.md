# Public beta launch (Vercel + Render + Supabase)

Use this checklist to share a **public URL** with testers. Auth is **Google via Clerk only** (no token accounts when `NEXT_PUBLIC_CLERK_ONLY` is set, the default when Clerk keys exist).

## 1. Supabase (Postgres)

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string → URI** (Session pooler, port 5432).
3. Ensure `?sslmode=require` is on the URI.
4. Save as **`DATABASE_URL`** for the API (Render).

Tables are created automatically when the API starts with `RUNS_PERSIST=1`.

## 2. Upstash (Redis)

1. Create a Redis database at [upstash.com](https://upstash.com).
2. Copy the **`rediss://`** URL → **`REDIS_URL`** on API and worker.

## 3. Clerk (Google only)

1. Create an application at [clerk.com](https://clerk.com).
2. **User & authentication → Social connections → Google** — enable only Google for sign-in (disable email/password if you want Google-only).
3. **Domains** — add your Vercel production domain (e.g. `your-app.vercel.app`).
4. **Paths** — sign-in URL `/sign-in`, sign-up URL `/sign-up` (sign-up redirects to sign-in in this app).
5. Copy keys:
   - **Publishable key** + **Secret key** → Vercel env.
   - **JWT / Frontend API** — **`CLERK_ISSUER`** and **`CLERK_JWKS_URL`** → Render API env (see Clerk “API keys” / JWT template docs).

First-time flow for testers: **Google sign-in → pick username → short in-app tour → play daily.**

## 4. Render (API)

1. **New → Web Service** → connect this repo.
2. **Root directory:** `backend`
3. **Runtime:** Docker (uses `backend/Dockerfile`)
4. **Health check path:** `/health`
5. **Environment:**

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase URI |
| `REDIS_URL` | Upstash URI |
| `RUNS_PERSIST` | `1` |
| `API_CORS_ORIGINS` | `https://YOUR-VERCEL-DOMAIN.vercel.app` |
| `CLERK_ISSUER` | From Clerk |
| `CLERK_JWKS_URL` | From Clerk |
| `RATE_LIMIT_USE_REDIS` | `1` |

6. Deploy. Note the public URL (e.g. `https://detonate-api.onrender.com`).

Optional: second Render **Background Worker** or cron job running `detonate-worker once` daily, same `REDIS_URL`. Or use the GitHub Actions `daily-worker` workflow with `REDIS_URL` repo secret.

Verify: `GET https://YOUR-API/ready` → postgres + redis true.

## 5. Vercel (frontend)

1. Import repo, **root directory** `frontend`.
2. **Framework:** Next.js · **Install:** `pnpm install` · **Build:** `pnpm build`
3. **Environment (Production):**

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | Render API URL (no trailing slash) |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-VERCEL-DOMAIN.vercel.app` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk |
| `CLERK_SECRET_KEY` | Clerk |
| `NEXT_PUBLIC_CLERK_ONLY` | `1` (optional; default when Clerk is set) |

4. Redeploy after env changes (public vars are baked at build time).

## 6. Smoke test

- [ ] Open Vercel URL → home loads daily stats.
- [ ] **Sign in** → Google → username modal → tour → lands on daily.
- [ ] Clear a board → **Verified** on result → name on daily leaderboard.
- [ ] `/leaderboard` shows **Verified only** copy.
- [ ] Share link opens same board.

## 7. Share with testers

Send the **Vercel URL** only. They never need localhost.

When the URL is stable, add **Live demo** to root `README.md`.

## Local dev with production stack

Point `backend/.env` and `frontend/.env.local` at the same Supabase/Upstash/Clerk **development** instance, or use local Docker Postgres/Redis with Clerk development keys and `http://localhost:3000` in Clerk allowed origins.

Set `NEXT_PUBLIC_CLERK_ONLY=0` locally if you still want token accounts without Google.
