import secrets

import psycopg
import pytest

from detonate_api.db import ensure_schema, list_player_personal_bests, persist_verified_win
from detonate_api.runs import verify_run
from detonate_api.schemas import VerifyRunRequest
from detonate_api.settings import DATABASE_URL
from detonate_engine.daily import utc_today


def _postgres_available() -> bool:
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=1):
            return True
    except psycopg.Error:
        return False


def _win(*, difficulty_id: str = "beginner", duration_ms: int, seed: int, board_kind: str, daily_id: str | None = None) -> VerifyRunRequest:
    return VerifyRunRequest.model_validate(
        {
            "difficultyId": difficulty_id,
            "seed": seed,
            "events": [{"type": "reveal", "x": 0, "y": 0}],
            "status": "won",
            "durationMs": duration_ms,
            "boardKind": board_kind,
            **({"dailyId": daily_id} if daily_id else {}),
        },
    )


@pytest.mark.skipif(not _postgres_available(), reason="postgres not available")
def test_list_player_personal_bests_per_difficulty() -> None:
    ensure_schema(DATABASE_URL)
    from detonate_api.accounts import create_player

    player, _token = create_player(DATABASE_URL, f"pb_{secrets.token_hex(4)}")
    today = utc_today()
    daily_id = f"{today.isoformat()}:beginner"
    run_ids: list[str] = []
    try:
        run_ids.append(
            persist_verified_win(
                DATABASE_URL,
                _win(duration_ms=500, seed=1, board_kind="random"),
                player.id,
            ),
        )
        run_ids.append(
            persist_verified_win(
                DATABASE_URL,
                _win(duration_ms=300, seed=2, board_kind="random"),
                player.id,
            ),
        )
        run_ids.append(
            persist_verified_win(
                DATABASE_URL,
                _win(
                    duration_ms=400,
                    seed=3,
                    board_kind="daily",
                    daily_id=daily_id,
                ),
                player.id,
            ),
        )
        run_ids.append(
            persist_verified_win(
                DATABASE_URL,
                _win(
                    difficulty_id="intermediate",
                    duration_ms=900,
                    seed=4,
                    board_kind="random",
                ),
                player.id,
            ),
        )

        classic = list_player_personal_bests(DATABASE_URL, player.id, "random")
        daily = list_player_personal_bests(DATABASE_URL, player.id, "daily")
        classic_by_diff = {row[0]: row[1] for row in classic}
        assert classic_by_diff == {"beginner": 300, "intermediate": 900}
        assert len(daily) == 1
        assert daily[0][1] == 400
    finally:
        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM runs WHERE id = ANY(%s::uuid[])", (run_ids,))
                cur.execute("DELETE FROM players WHERE id = %s::uuid", (player.id,))
            conn.commit()


@pytest.mark.skipif(not _postgres_available(), reason="postgres not available")
def test_verify_run_flags_personal_best(monkeypatch: pytest.MonkeyPatch) -> None:
    import detonate_api.runs as runs_module

    from detonate_api.accounts import create_player

    monkeypatch.setattr(runs_module, "RUNS_PERSIST", True)
    ensure_schema(DATABASE_URL)
    player, _token = create_player(DATABASE_URL, f"pb_{secrets.token_hex(4)}")
    run_ids: list[str] = []
    try:
        first = verify_run(
            _win(duration_ms=800, seed=10, board_kind="random"),
            player,
        )
        assert first.stored is True
        assert first.is_personal_best is True
        assert first.personal_best_ms == 800
        assert first.previous_personal_best_ms is None
        run_ids.append(first.run_id or "")

        second = verify_run(
            _win(duration_ms=600, seed=11, board_kind="random"),
            player,
        )
        assert second.is_personal_best is True
        assert second.personal_best_ms == 600
        assert second.previous_personal_best_ms == 800
        run_ids.append(second.run_id or "")

        third = verify_run(
            _win(duration_ms=700, seed=12, board_kind="random"),
            player,
        )
        assert third.is_personal_best is False
        assert third.personal_best_ms == 600
        assert third.previous_personal_best_ms == 600
        run_ids.append(third.run_id or "")
    finally:
        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM runs WHERE id = ANY(%s::uuid[])", (run_ids,))
                cur.execute("DELETE FROM players WHERE id = %s::uuid", (player.id,))
            conn.commit()


def test_accounts_me_bests_requires_auth() -> None:
    from fastapi.testclient import TestClient

    from detonate_api.main import app

    client = TestClient(app)
    response = client.get("/v1/accounts/me/bests")
    assert response.status_code == 401
