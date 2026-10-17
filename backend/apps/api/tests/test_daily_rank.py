import psycopg
import pytest

from detonate_api.db import daily_run_placement, ensure_schema, persist_verified_win
from detonate_api.runs import verify_run
from detonate_api.schemas import VerifyRunRequest
from detonate_api.settings import DATABASE_URL
from detonate_engine.daily import daily_seed, utc_today
from detonate_engine.game import Game
from detonate_engine.types import Event


def _winning_events(seed: int) -> list[dict[str, object]]:
    game = Game(9, 9, 10, seed)
    events: list[Event] = []
    game.reveal(4, 4)
    events.append(Event("reveal", 4, 4))
    for y in range(9):
        for x in range(9):
            if not game.cell(x, y).is_mine and not game.cell(x, y).revealed:
                game.reveal(x, y)
                events.append(Event("reveal", x, y))
    assert game.status.value == "won"
    return [{"type": e.type, "x": e.x, "y": e.y} for e in events]


def _postgres_available() -> bool:
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=1):
            return True
    except psycopg.Error:
        return False


def _daily_win(*, daily_id: str, duration_ms: int, seed: int) -> VerifyRunRequest:
    return VerifyRunRequest.model_validate(
        {
            "difficultyId": "beginner",
            "seed": seed,
            "events": [{"type": "reveal", "x": 0, "y": 0}],
            "status": "won",
            "durationMs": duration_ms,
            "boardKind": "daily",
            "dailyId": daily_id,
        },
    )


@pytest.mark.skipif(not _postgres_available(), reason="postgres not available")
def test_daily_run_placement_rank_and_total() -> None:
    ensure_schema(DATABASE_URL)
    today = utc_today()
    daily_id = f"{today.isoformat()}:beginner"
    first = persist_verified_win(
        DATABASE_URL,
        _daily_win(daily_id=daily_id, duration_ms=300, seed=21),
    )
    second = persist_verified_win(
        DATABASE_URL,
        _daily_win(daily_id=daily_id, duration_ms=100, seed=22),
    )
    third = persist_verified_win(
        DATABASE_URL,
        _daily_win(daily_id=daily_id, duration_ms=200, seed=23),
    )
    try:
        assert daily_run_placement(DATABASE_URL, daily_id, second) == (1, 3)
        assert daily_run_placement(DATABASE_URL, daily_id, third) == (2, 3)
        assert daily_run_placement(DATABASE_URL, daily_id, first) == (3, 3)
    finally:
        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM runs WHERE id = ANY(%s::uuid[])",
                    ([first, second, third],),
                )
            conn.commit()


@pytest.mark.skipif(not _postgres_available(), reason="postgres not available")
def test_verify_daily_win_returns_rank(monkeypatch: pytest.MonkeyPatch) -> None:
    import detonate_api.runs as runs_module

    monkeypatch.setattr(runs_module, "RUNS_PERSIST", True)
    ensure_schema(DATABASE_URL)
    today = utc_today()
    daily_id = f"{today.isoformat()}:beginner"
    seed = daily_seed("beginner", today)
    persist_verified_win(
        DATABASE_URL,
        _daily_win(daily_id=daily_id, duration_ms=50, seed=seed + 1),
    )
    try:
        body = verify_run(
            VerifyRunRequest.model_validate(
                {
                    "difficultyId": "beginner",
                    "seed": seed,
                    "events": _winning_events(seed),
                    "status": "won",
                    "durationMs": 120,
                    "boardKind": "daily",
                    "dailyId": daily_id,
                },
            ),
        )
        assert body.stored is True
        assert body.daily_rank == 2
        assert body.daily_total == 2
    finally:
        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM runs WHERE daily_id = %s AND board_kind = 'daily'",
                    (daily_id,),
                )
            conn.commit()
