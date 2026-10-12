import psycopg
import pytest
from fastapi.testclient import TestClient

from detonate_api.db import ensure_schema, persist_verified_win
from detonate_api.main import app
from detonate_api.schemas import VerifyRunRequest
from detonate_api.settings import DATABASE_URL

client = TestClient(app)


def test_leaderboard_unknown_difficulty() -> None:
    response = client.get("/v1/leaderboard", params={"difficultyId": "impossible"})
    assert response.status_code == 404
    assert response.json()["detail"] == "unknown_difficulty"


def test_leaderboard_rejects_bad_limit() -> None:
    response = client.get(
        "/v1/leaderboard",
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
def test_leaderboard_ranks_faster_runs_first() -> None:
    ensure_schema(DATABASE_URL)
    fast_id = persist_verified_win(DATABASE_URL, _win(duration_ms=0, seed=11))
    slow_id = persist_verified_win(DATABASE_URL, _win(duration_ms=1, seed=12))
    try:
        response = client.get(
            "/v1/leaderboard",
            params={"difficultyId": "beginner", "limit": 50},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["difficultyId"] == "beginner"
        by_id = {entry["runId"]: entry for entry in body["entries"]}
        assert fast_id in by_id
        assert slow_id in by_id
        assert by_id[fast_id]["rank"] < by_id[slow_id]["rank"]
        assert by_id[fast_id]["durationMs"] == 0
        assert by_id[fast_id]["seed"] == 11
        assert "createdAt" in by_id[fast_id]
    finally:
        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM runs WHERE id = ANY(%s::uuid[])",
                    ([fast_id, slow_id],),
                )
            conn.commit()


def _win(*, duration_ms: int, seed: int) -> VerifyRunRequest:
    return VerifyRunRequest.model_validate(
        {
            "difficultyId": "beginner",
            "seed": seed,
            "events": [{"type": "reveal", "x": 0, "y": 0}],
            "status": "won",
            "durationMs": duration_ms,
        },
    )
