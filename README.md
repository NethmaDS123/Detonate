# Detonate

Competitive Minesweeper. **Don't.**

This repository is split into two **independently runnable and deployable** projects:

| Folder | Stack | Run |
| --- | --- | --- |
| [`frontend/`](frontend/) | Next.js + TypeScript engine | `pnpm install && pnpm dev` |
| [`backend/`](backend/) | FastAPI + Python engine | `uv sync --all-packages --group dev` then `uv run --package detonate-api uvicorn detonate_api.main:app --reload --port 8000` |

Use **two terminals** (or two hosts in production). The game UI does not require the API today; leaderboards and verified runs will.

**Engine contract:** Python in `backend/packages/engine` is authoritative. The TS port in `frontend/packages/engine` is checked against shared JSON in both trees — export with the script in `backend/README.md`.

You can later move `frontend/` and `backend/` to separate Git repos; keep the fixture export step in CI when you do.
# Detonate
