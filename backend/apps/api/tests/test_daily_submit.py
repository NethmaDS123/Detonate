from datetime import timedelta

from fastapi.testclient import TestClient

from detonate_api.main import app
from detonate_engine.daily import daily_seed, utc_today

client = TestClient(app)


def _daily_payload(*, daily_id: str, seed: int, difficulty_id: str = "beginner") -> dict:
    return {
        "difficultyId": difficulty_id,
        "seed": seed,
        "events": [{"type": "reveal", "x": 0, "y": 0}],
        "status": "lost",
        "durationMs": 1000,
        "boardKind": "daily",
        "dailyId": daily_id,
    }


def test_daily_with_todays_seed_passes_daily_check() -> None:
    today = utc_today()
    payload = _daily_payload(
        daily_id=f"{today.isoformat()}:beginner",
        seed=daily_seed("beginner", today),
    )
    body = client.post("/v1/runs/verify", json=payload).json()
    assert body["reason"] != "daily_mismatch"


def test_daily_rejects_wrong_seed() -> None:
    today = utc_today()
    payload = _daily_payload(
        daily_id=f"{today.isoformat()}:beginner",
        seed=(daily_seed("beginner", today) % 1000) + 1,
    )
    body = client.post("/v1/runs/verify", json=payload).json()
    assert body["verified"] is False
    assert body["reason"] == "daily_mismatch"


def test_daily_rejects_stale_day() -> None:
    old_day = utc_today() - timedelta(days=5)
    payload = _daily_payload(
        daily_id=f"{old_day.isoformat()}:beginner",
        seed=daily_seed("beginner", old_day),
    )
    body = client.post("/v1/runs/verify", json=payload).json()
    assert body["reason"] == "daily_mismatch"


def test_daily_accepts_yesterday_within_grace() -> None:
    yesterday = utc_today() - timedelta(days=1)
    payload = _daily_payload(
        daily_id=f"{yesterday.isoformat()}:beginner",
        seed=daily_seed("beginner", yesterday),
    )
    body = client.post("/v1/runs/verify", json=payload).json()
    assert body["reason"] != "daily_mismatch"


def test_daily_rejects_difficulty_mismatch() -> None:
    today = utc_today()
    payload = _daily_payload(
        daily_id=f"{today.isoformat()}:expert",
        seed=daily_seed("beginner", today),
    )
    body = client.post("/v1/runs/verify", json=payload).json()
    assert body["reason"] == "daily_mismatch"


def test_daily_rejects_malformed_date() -> None:
    payload = _daily_payload(daily_id="not-a-date:beginner", seed=1)
    body = client.post("/v1/runs/verify", json=payload).json()
    assert body["reason"] == "daily_mismatch"
