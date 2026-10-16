import psycopg
import pytest
from pydantic import ValidationError

from detonate_api.db import ensure_schema, persist_verified_win
from detonate_api.schemas import VerifyRunRequest
from detonate_api.settings import DATABASE_URL


def test_verify_request_daily_requires_daily_id() -> None:
    with pytest.raises(ValidationError):
        VerifyRunRequest.model_validate(
            {
                "difficultyId": "beginner",
                "seed": 1,
                "events": [{"type": "reveal", "x": 0, "y": 0}],
                "status": "won",
                "durationMs": 100,
                "boardKind": "daily",
            },
        )


def test_verify_request_random_rejects_daily_id() -> None:
    with pytest.raises(ValidationError):
        VerifyRunRequest.model_validate(
            {
                "difficultyId": "beginner",
                "seed": 1,
                "events": [{"type": "reveal", "x": 0, "y": 0}],
                "status": "won",
                "durationMs": 100,
                "boardKind": "random",
                "dailyId": "2026-10-14:beginner",
            },
        )


def _postgres_available() -> bool:
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=1):
            return True
    except psycopg.Error:
        return False


@pytest.mark.skipif(not _postgres_available(), reason="postgres not available")
def test_persist_stores_run_metadata() -> None:
    ensure_schema(DATABASE_URL)
    body = VerifyRunRequest.model_validate(
        {
            "difficultyId": "intermediate",
            "seed": 99,
            "events": [{"type": "reveal", "x": 0, "y": 0}],
            "status": "won",
            "durationMs": 1234,
            "boardKind": "daily",
            "dailyId": "2026-10-14:intermediate",
            "mode": "classic",
        },
    )
    run_id = persist_verified_win(DATABASE_URL, body)
    with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT board_kind, daily_id, mode
            FROM runs WHERE id = %s::uuid
            """,
            (run_id,),
        )
        row = cur.fetchone()
        assert row == ("daily", "2026-10-14:intermediate", "classic")
        cur.execute("DELETE FROM runs WHERE id = %s::uuid", (run_id,))
        conn.commit()
