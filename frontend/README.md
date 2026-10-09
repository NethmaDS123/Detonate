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

## Tests (engine port vs Python fixtures)

```bash
cd frontend
pnpm test:engine
```

After backend engine changes, re-export fixtures from the **backend** repo folder (see `../backend/README.md`), then run this test again.

## Layout

| Path | Purpose |
| --- | --- |
| `src/` | Next.js App Router UI |
| `packages/engine` | Browser Minesweeper engine (must match backend fixtures) |

## Deploy (typical)

- Build: `pnpm build` then `pnpm start`, or platform default for Next.js
- Env: `NEXT_PUBLIC_API_URL=https://api.yourdomain.com` when the API is live
