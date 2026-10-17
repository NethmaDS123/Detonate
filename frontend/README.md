# Detonate Frontend

Next.js web app and client-side game engine. Deploy separately from the backend (Vercel, etc.). Play works offline; ranked/daily features will call the API via `NEXT_PUBLIC_API_URL`.

## Prerequisites

- Node 22+
- pnpm 10

## Setup

```bash
cd frontend
pnpm install
cp .env.example .env.local   # optional
```

## Run

```bash
cd frontend
pnpm dev
```

Open http://localhost:3000

With the API on port 8000, clearing a board triggers `POST /v1/runs/verify` and shows **verified** when the server replay matches. The page also loads `GET /v1/leaderboard`, optional **Daily** mode via `GET /v1/daily`, and **Accounts** (`POST /v1/accounts` / token in `localStorage` for named leaderboard entries). Override the API host with `NEXT_PUBLIC_API_URL` in `.env.local`. Optional `NEXT_PUBLIC_SITE_URL` for canonical share/OG links (defaults to the current origin). Post-game **Share** uses `/share/r?…` for Open Graph/Twitter preview cards.

## Tests (engine port vs Python fixtures)

```bash
cd frontend
pnpm test:engine
```

After backend engine changes, re-export fixtures from the **backend** repo folder (see `../backend/README.md`), then run this test again.

## Layout

| Path | Purpose |
| --- | --- |
| `src/app` | Routes: `/` home, `/daily`, `/play`, `/leaderboard`, `/account` |
| `src/components` | Game board, leaderboard, account provider/view, site header |
| `src/lib` | API clients (`account`, `daily`, `leaderboard`, `verifyRun`) and formatting helpers |
| `packages/engine` | Browser Minesweeper engine (must match backend fixtures) |

## Deploy (typical)

- Build: `pnpm build` then `pnpm start`, or platform default for Next.js
- Env: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` when the API is live
