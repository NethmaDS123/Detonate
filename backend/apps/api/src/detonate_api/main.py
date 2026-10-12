from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Annotated

import psycopg
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from detonate_api.daily import resolve_daily_boards
from detonate_api.db import ensure_schema, list_leaderboard
from detonate_api.runs import verify_run
from detonate_api.schemas import (
    DailyBoardEntry,
    DailyResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    VerifyRunRequest,
    VerifyRunResponse,
)
from detonate_api.settings import DATABASE_URL, REDIS_URL, RUNS_PERSIST, cors_origins
from detonate_engine import DIFFICULTIES


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if RUNS_PERSIST:
        try:
            ensure_schema(DATABASE_URL)
        except Exception:
            pass
    yield


app = FastAPI(
    title="Detonate API",
    version="0.1.0",
    description="Competitive Minesweeper platform. Don't.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"name": "Detonate", "slogan": "Don't."}


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "detonate-api"}


@app.get("/ready")
def ready() -> dict:
    checks = {
        "postgres": _check_postgres(),
        "redis": _check_redis(),
    }
    return {"ok": all(checks.values()), "checks": checks}


@app.post("/v1/runs/verify", response_model=VerifyRunResponse)
def runs_verify(body: VerifyRunRequest) -> VerifyRunResponse:
    return verify_run(body)


@app.get("/v1/leaderboard", response_model=LeaderboardResponse)
def leaderboard(
    difficulty_id: Annotated[str, Query(alias="difficultyId", min_length=1)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> LeaderboardResponse:
    if difficulty_id not in DIFFICULTIES:
        raise HTTPException(status_code=404, detail="unknown_difficulty")
    try:
        rows = list_leaderboard(DATABASE_URL, difficulty_id, limit)
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="storage_unavailable") from exc
    return LeaderboardResponse(
        difficulty_id=difficulty_id,
        entries=[
            LeaderboardEntry(
                rank=index,
                run_id=run_id,
                duration_ms=duration_ms,
                seed=seed,
                created_at=created_at,
            )
            for index, (run_id, duration_ms, seed, created_at) in enumerate(rows, start=1)
        ],
    )


@app.get("/v1/daily", response_model=DailyResponse)
def daily(
    difficulty_id: Annotated[str | None, Query(alias="difficultyId", min_length=1)] = None,
) -> DailyResponse:
    if difficulty_id is not None and difficulty_id not in DIFFICULTIES:
        raise HTTPException(status_code=404, detail="unknown_difficulty")
    day, boards = resolve_daily_boards(REDIS_URL)
    if difficulty_id is not None:
        boards = {difficulty_id: boards[difficulty_id]}
    return DailyResponse(
        date=day,
        boards=[
            DailyBoardEntry(difficulty_id=difficulty, seed=seed)
            for difficulty, seed in boards.items()
        ],
    )


@app.get("/v1/difficulties")
def difficulties() -> dict:
    return {
        "difficulties": [
            {
                "id": d.id,
                "label": d.label,
                "width": d.width,
                "height": d.height,
                "mines": d.mines,
            }
            for d in DIFFICULTIES.values()
        ]
    }


def _check_postgres() -> bool:
    try:
        import psycopg

        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return True
    except Exception:
        return False


def _check_redis() -> bool:
    try:
        import redis

        client = redis.Redis.from_url(REDIS_URL, socket_connect_timeout=2)
        return client.ping() is True
    except Exception:
        return False
