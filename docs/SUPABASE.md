# Connect Detonate to Supabase (Postgres)

Detonate uses Supabase **only as PostgreSQL**. You do not need the Supabase JS client, Auth, or Realtime for the current app—just the **database connection URI**.

Redis is separate (local Docker, Upstash, etc.). `/ready` can show `redis: false` until you add Redis; leaderboard and saves still work with Postgres alone.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a region close to you (and close to where you will host the API later).
3. Set a **database password** and store it in a password manager—you need it for the connection string.

---

## 2. Copy the connection string

In the Supabase dashboard:

**Project Settings** → **Database** → **Connection string** → **URI**

Choose one of these (recommended order for Detonate’s FastAPI + psycopg):

| Mode | When to use |
|------|-------------|
| **Direct connection** | Local dev, long-running API on a VM/container |
| **Session pooler** (port **5432**) | Hosted API with many short-lived workers |
| **Transaction pooler** (port **6543**) | Avoid for now—can break prepared statements |

The URI looks like:

```text
postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres
```

**Important:**

- Replace `[YOUR-PASSWORD]` with your DB password (URL-encode special characters in the password if needed).
- Append SSL if it is not already in the string:

  ```text
  ?sslmode=require
  ```

Example (fake host):

```env
DATABASE_URL=postgresql://postgres.abcdef:secret@aws-0-eu-west-2.pooler.supabase.com:5432/postgres?sslmode=require
```

Do **not** commit this file with a real password.

---

## 3. Configure the backend

From the repo:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL=postgresql://...your supabase uri...?sslmode=require
REDIS_URL=redis://localhost:6379/0
API_CORS_ORIGINS=http://localhost:3000
RUNS_PERSIST=1
```

The API loads `backend/.env` automatically on startup (via `python-dotenv`).

---

## 4. Test the connection

```bash
cd backend
uv sync --all-packages --group dev
uv run python scripts/check_db.py
```

With `RUNS_PERSIST=1` (default), the API **will not start** until `DATABASE_URL` is valid and migrations succeed—ranked data always goes through Postgres, not a silent fallback.

If that prints `Postgres OK`, start the API:

```bash
uv run --package detonate-api uvicorn detonate_api.main:app --reload --port 8000
```

On startup, `ensure_schema` applies `backend/migrations/*.sql` and creates `runs` and `players`.

Check:

```bash
curl -s http://localhost:8000/ready
```

You want `"postgres": true`. Redis may be `false` until you run Redis locally or add Upstash.

---

## 5. Confirm tables in Supabase

**Table Editor** in Supabase should show `runs` and `players` after the API has started once.

Or use **SQL Editor**:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('runs', 'players');
```

---

## 6. Frontend (unchanged)

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

When the API is deployed, point this at your public API URL. The browser never sees `DATABASE_URL`.

---

## 7. Production notes

- Set the same `DATABASE_URL` on your **API host** (Railway, Fly, AWS, etc.), not on Vercel for the Next app.
- Restrict Supabase **Database** settings: avoid exposing the DB to the whole internet if you use direct connections; prefer pooler + strong password, or IP allowlists where available.
- For serverless API, prefer Supabase **Session pooler** URI from the dashboard.
- Optional: run SQL in Supabase **SQL Editor** instead of relying on startup migrations—only if you prefer manual control; the app already migrates on boot.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `password authentication failed` | Wrong password or wrong URI (direct vs pooler user prefix `postgres.[ref]`) |
| `timeout` / `could not connect` | Firewall, VPN, or typo in host; try **Direct connection** URI from dashboard |
| SSL errors | Add `?sslmode=require` to `DATABASE_URL` |
| `/ready` postgres false | API not loading `.env`; run from `backend` or set env on host |
| Tables missing | Start API once with `RUNS_PERSIST=1`; check logs for migration errors |

Never paste your Supabase URI or password into git, screenshots, or chat.
