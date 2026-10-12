import psycopg
import pytest

from detonate_api.db import ensure_schema, persist_verified_win
from detonate_api.schemas import VerifyRunRequest
from detonate_api.settings import DATABASE_URL


def _postgres_available() -> bool:
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=1):
            return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _postgres_available(), reason="postgres not available")


def test_persist_verified_win_roundtrip() -> None:
    ensure_schema(DATABASE_URL)
    body = VerifyRunRequest.model_validate(
        {
            "difficultyId": "beginner",
            "seed": 42,
            "events": [{"type": "reveal", "x": 4, "y": 4}],
            "status": "won",
            "durationMs": 999,
        },
    )
    run_id = persist_verified_win(DATABASE_URL, body)
    assert run_id

    with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT difficulty_id, seed, duration_ms FROM runs WHERE id = %s::uuid",
                (run_id,),
            )
            row = cur.fetchone()
            assert row == ("beginner", 42, 999)
            cur.execute("DELETE FROM runs WHERE id = %s::uuid", (run_id,))
        conn.commit()
