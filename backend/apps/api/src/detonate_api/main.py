from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date
from typing import Annotated

import psycopg
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from detonate_api.accounts import (
    ClerkUserAlreadyLinkedError,
    DisplayNameTakenError,
    LegacyTokenInvalidError,
    create_player,
    link_clerk_to_legacy_player,
    lookup_player_by_clerk_user_id,
    upsert_player_for_clerk,
)
from detonate_api.auth import optional_player, require_clerk_claims, require_player
from detonate_api.clerk_auth import display_name_from_clerk_claims
from detonate_api.daily import resolve_daily_boards
from detonate_api.db import (
    best_daily_duration_ms,
    ensure_schema,
    list_daily_leaderboard,
    list_leaderboard,
    list_player_personal_bests,
)
from detonate_api.runs import verify_run
from detonate_api.schemas import (
    AccountResponse,
    CreateAccountRequest,
    CreateAccountResponse,
    DailyBoardEntry,
    DailyLeaderboardResponse,
    DailyResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    ClerkLinkRequest,
    ClerkSyncRequest,
    PersonalBestEntry,
    PersonalBestsResponse,
    VerifyRunRequest,
    VerifyRunResponse,
)
from detonate_api.settings import (
    DATABASE_URL,
    REDIS_URL,
    RUNS_PERSIST,
    clerk_auth_enabled,
    cors_origins,
    database_url_configured,
)
from detonate_engine import DIFFICULTIES
from detonate_engine.daily import daily_id as format_daily_id
from detonate_engine.daily import daily_number


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if RUNS_PERSIST:
        if not database_url_configured():
            msg = "Set DATABASE_URL in backend/.env (Supabase URI). See docs/SUPABASE.md"
            raise RuntimeError(msg)
        ensure_schema(DATABASE_URL)
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
def runs_verify(
    body: VerifyRunRequest,
    player=Depends(optional_player),  # noqa: ANN001
) -> VerifyRunResponse:
    return verify_run(body, player)


@app.post("/v1/accounts", response_model=CreateAccountResponse, status_code=201)
def accounts_create(body: CreateAccountRequest) -> CreateAccountResponse:
    try:
        player, token = create_player(DATABASE_URL, body.display_name)
    except DisplayNameTakenError as exc:
        raise HTTPException(status_code=409, detail="display_name_taken") from exc
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="storage_unavailable") from exc
    return CreateAccountResponse(
        player_id=player.id,
        display_name=player.display_name,
        token=token,
    )


@app.get("/v1/accounts/me", response_model=AccountResponse)
def accounts_me(player=Depends(require_player)) -> AccountResponse:  # noqa: ANN001
    return AccountResponse(player_id=player.id, display_name=player.display_name)


@app.post("/v1/accounts/clerk/sync", response_model=AccountResponse)
def accounts_clerk_sync(
    body: ClerkSyncRequest,
    claims=Depends(require_clerk_claims),  # noqa: ANN001
) -> AccountResponse:
    clerk_user_id = str(claims["sub"])
    try:
        existing = lookup_player_by_clerk_user_id(DATABASE_URL, clerk_user_id)
        if existing is not None:
            return AccountResponse(player_id=existing.id, display_name=existing.display_name)
        display_name = display_name_from_clerk_claims(claims, body.display_name)
        player = upsert_player_for_clerk(DATABASE_URL, clerk_user_id, display_name)
    except DisplayNameTakenError as exc:
        raise HTTPException(status_code=409, detail="display_name_taken") from exc
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="storage_unavailable") from exc
    return AccountResponse(player_id=player.id, display_name=player.display_name)


@app.post("/v1/accounts/clerk/link", response_model=AccountResponse)
def accounts_clerk_link(
    body: ClerkLinkRequest,
    claims=Depends(require_clerk_claims),  # noqa: ANN001
) -> AccountResponse:
    if not clerk_auth_enabled():
        raise HTTPException(status_code=503, detail="clerk_not_configured")
    clerk_user_id = str(claims["sub"])
    try:
        player = link_clerk_to_legacy_player(DATABASE_URL, clerk_user_id, body.legacy_token.strip())
    except LegacyTokenInvalidError as exc:
        raise HTTPException(status_code=401, detail="invalid_legacy_token") from exc
    except ClerkUserAlreadyLinkedError as exc:
        raise HTTPException(status_code=409, detail="clerk_already_linked") from exc
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="storage_unavailable") from exc
    return AccountResponse(player_id=player.id, display_name=player.display_name)


@app.get("/v1/accounts/me/bests", response_model=PersonalBestsResponse)
def accounts_me_bests(player=Depends(require_player)) -> PersonalBestsResponse:  # noqa: ANN001
    try:
        classic_rows = list_player_personal_bests(DATABASE_URL, player.id, "random")
        daily_rows = list_player_personal_bests(DATABASE_URL, player.id, "daily")
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="storage_unavailable") from exc

    def to_entries(rows: list) -> list[PersonalBestEntry]:
        return [
            PersonalBestEntry(
                difficulty_id=difficulty_id,
                duration_ms=duration_ms,
                run_id=run_id,
                created_at=created_at,
                daily_id=daily_id,
            )
            for difficulty_id, duration_ms, run_id, created_at, daily_id in rows
        ]

    return PersonalBestsResponse(classic=to_entries(classic_rows), daily=to_entries(daily_rows))


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
                display_name=display_name,
                created_at=created_at,
            )
            for index, (run_id, duration_ms, seed, created_at, display_name) in enumerate(
                rows, start=1
            )
        ],
    )


def _lookup_daily_best(daily_id: str) -> int | None:
    if not RUNS_PERSIST:
        return None
    try:
        return best_daily_duration_ms(DATABASE_URL, daily_id)
    except psycopg.Error:
        return None


def _daily_board_entries(day: date, boards: dict[str, int]) -> list[DailyBoardEntry]:
    return [
        DailyBoardEntry(
            difficulty_id=difficulty_id,
            seed=seed,
            width=DIFFICULTIES[difficulty_id].width,
            height=DIFFICULTIES[difficulty_id].height,
            mines=DIFFICULTIES[difficulty_id].mines,
            best_duration_ms=_lookup_daily_best(format_daily_id(day, difficulty_id)),
        )
        for difficulty_id, seed in boards.items()
    ]


@app.get("/v1/daily/leaderboard", response_model=DailyLeaderboardResponse)
def daily_leaderboard(
    difficulty_id: Annotated[str, Query(alias="difficultyId", min_length=1)],
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> DailyLeaderboardResponse:
    if difficulty_id not in DIFFICULTIES:
        raise HTTPException(status_code=404, detail="unknown_difficulty")
    day_str, _boards = resolve_daily_boards(REDIS_URL)
    day = date.fromisoformat(day_str)
    daily_id = format_daily_id(day, difficulty_id)
    try:
        rows = list_daily_leaderboard(DATABASE_URL, daily_id, limit)
    except psycopg.Error as exc:
        raise HTTPException(status_code=503, detail="storage_unavailable") from exc
    return DailyLeaderboardResponse(
        date=day_str,
        daily_number=daily_number(day),
        daily_id=daily_id,
        difficulty_id=difficulty_id,
        best_duration_ms=_lookup_daily_best(daily_id),
        entries=[
            LeaderboardEntry(
                rank=index,
                run_id=run_id,
                duration_ms=duration_ms,
                seed=seed,
                display_name=display_name,
                created_at=created_at,
            )
            for index, (run_id, duration_ms, seed, created_at, display_name) in enumerate(
                rows, start=1
            )
        ],
    )


@app.get("/v1/daily", response_model=DailyResponse)
def daily(
    difficulty_id: Annotated[str | None, Query(alias="difficultyId", min_length=1)] = None,
) -> DailyResponse:
    if difficulty_id is not None and difficulty_id not in DIFFICULTIES:
        raise HTTPException(status_code=404, detail="unknown_difficulty")
    day_str, boards = resolve_daily_boards(REDIS_URL)
    day = date.fromisoformat(day_str)
    if difficulty_id is not None:
        boards = {difficulty_id: boards[difficulty_id]}
    return DailyResponse(
        date=day_str,
        daily_number=daily_number(day),
        boards=_daily_board_entries(day, boards),
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
