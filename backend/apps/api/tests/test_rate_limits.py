import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from detonate_api.main import app
from detonate_api.rate_limit import reset_rate_limits_for_tests

FIXTURES = Path(__file__).resolve().parents[3] / "fixtures"


@pytest.fixture
def limited_client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "1")
    monkeypatch.setenv("RATE_LIMIT_USE_REDIS", "0")
    reset_rate_limits_for_tests()
    yield TestClient(app)
    reset_rate_limits_for_tests()


def _verify_payload() -> dict:
    fixture = json.loads((FIXTURES / "beginner-seed-3-full-clear.json").read_text())
    return {
        "difficultyId": "beginner",
        "seed": fixture["seed"],
        "events": fixture["events"],
        "status": "lost",
        "durationMs": 1000,
    }


def test_verify_rate_limit(limited_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RATE_LIMIT_VERIFY_PER_WINDOW", "2")
    monkeypatch.setenv("RATE_LIMIT_VERIFY_WINDOW_SEC", "60")
    reset_rate_limits_for_tests()
    payload = _verify_payload()
    assert limited_client.post("/v1/runs/verify", json=payload).status_code == 200
    assert limited_client.post("/v1/runs/verify", json=payload).status_code == 200
    response = limited_client.post("/v1/runs/verify", json=payload)
    assert response.status_code == 429
    assert response.json()["detail"] == "rate_limit_exceeded"
    assert "retry-after" in {k.lower() for k in response.headers}


def test_accounts_rate_limit(limited_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RATE_LIMIT_ACCOUNTS_PER_WINDOW", "1")
    monkeypatch.setenv("RATE_LIMIT_ACCOUNTS_WINDOW_SEC", "3600")
    reset_rate_limits_for_tests()
    body = {"displayName": "rate_limit_tester"}
    assert limited_client.post("/v1/accounts", json=body).status_code in (201, 409, 503)
    assert limited_client.post("/v1/accounts", json={"displayName": "other_name"}).status_code == 429


def test_leaderboard_rate_limit(limited_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RATE_LIMIT_LEADERBOARD_PER_WINDOW", "2")
    monkeypatch.setenv("RATE_LIMIT_LEADERBOARD_WINDOW_SEC", "60")
    reset_rate_limits_for_tests()
    params = {"difficultyId": "beginner"}
    assert limited_client.get("/v1/leaderboard", params=params).status_code in (200, 503)
    assert limited_client.get("/v1/leaderboard", params=params).status_code in (200, 503)
    assert limited_client.get("/v1/leaderboard", params=params).status_code == 429


def test_rate_limit_buckets_by_ip(limited_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RATE_LIMIT_VERIFY_PER_WINDOW", "1")
    reset_rate_limits_for_tests()
    payload = _verify_payload()
    assert limited_client.post("/v1/runs/verify", json=payload).status_code == 200
    assert limited_client.post("/v1/runs/verify", json=payload).status_code == 429
    reset_rate_limits_for_tests()
    other = TestClient(app, headers={"X-Forwarded-For": "203.0.113.50"})
    assert other.post("/v1/runs/verify", json=payload).status_code == 200
