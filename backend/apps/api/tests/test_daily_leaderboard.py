import psycopg
import pytest
from fastapi.testclient import TestClient

from detonate_api.db import ensure_schema, persist_verified_win
from detonate_api.main import app
from detonate_api.schemas import VerifyRunRequest
from detonate_api.settings import DATABASE_URL
from detonate_engine.daily import utc_today

client = TestClient(app)


def test_daily_leaderboard_unknown_difficulty() -> None:
    response = client.get("/v1/daily/leaderboard", params={"difficultyId": "impossible"})
    assert response.status_code == 404
    assert response.json()["detail"] == "unknown_difficulty"


def test_daily_leaderboard_rejects_bad_limit() -> None:
    response = client.get(
        "/v1/daily/leaderboard",
        params={"difficultyId": "beginner", "limit": 0},
    )
    assert response.status_code == 422


def _postgres_available() -> bool:
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=1):
            return True
    except psycopg.Error:
        return False


@pytest.mark.skipif(not _postgres_available(), reason="postgres not available")
def test_daily_leaderboard_only_todays_daily_runs() -> None:
    ensure_schema(DATABASE_URL)
    today = utc_today()
    daily_id = f"{today.isoformat()}:beginner"
    fast_id = persist_verified_win(
        DATABASE_URL,
        _daily_win(daily_id=daily_id, duration_ms=100, seed=11),
    )
    slow_id = persist_verified_win(
        DATABASE_URL,
        _daily_win(daily_id=daily_id, duration_ms=200, seed=12),
    )
    random_id = persist_verified_win(
        DATABASE_URL,
        _random_win(duration_ms=50, seed=13),
    )
    stale_id = persist_verified_win(
        DATABASE_URL,
        _daily_win(daily_id="2000-01-01:beginner", duration_ms=1, seed=14),
    )
    try:
        response = client.get(
            "/v1/daily/leaderboard",
            params={"difficultyId": "beginner", "limit": 50},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["date"] == today.isoformat()
        assert body["dailyId"] == daily_id
        assert body["difficultyId"] == "beginner"
        by_id = {entry["runId"]: entry for entry in body["entries"]}
        assert fast_id in by_id
        assert slow_id in by_id
        assert random_id not in by_id
        assert stale_id not in by_id
        assert by_id[fast_id]["rank"] < by_id[slow_id]["rank"]
    finally:
        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM runs WHERE id = ANY(%s::uuid[])",
                    ([fast_id, slow_id, random_id, stale_id],),
                )
            conn.commit()


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


def _random_win(*, duration_ms: int, seed: int) -> VerifyRunRequest:
    return VerifyRunRequest.model_validate(
        {
            "difficultyId": "beginner",
            "seed": seed,
            "events": [{"type": "reveal", "x": 0, "y": 0}],
            "status": "won",
            "durationMs": duration_ms,
        },
    )
