import json
from pathlib import Path

from fastapi.testclient import TestClient

from detonate_api.main import app

FIXTURES = Path(__file__).resolve().parents[3] / "fixtures"
client = TestClient(app)


def _fixture(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


def test_verify_run_matches_fixture_replay() -> None:
    fixture = _fixture("beginner-seed-3-full-clear.json")
    response = client.post(
        "/v1/runs/verify",
        json={
            "difficultyId": "beginner",
            "seed": fixture["seed"],
            "events": fixture["events"],
            "status": "lost",
            "durationMs": 12_345,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is True
    assert body["status"] == "lost"
    assert body["durationMs"] == 12_345


def test_verify_run_rejects_status_mismatch() -> None:
    fixture = _fixture("beginner-seed-7-open.json")
    response = client.post(
        "/v1/runs/verify",
        json={
            "difficultyId": "beginner",
            "seed": fixture["seed"],
            "events": fixture["events"],
            "status": "won",
            "durationMs": 1000,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is False
    assert body["reason"] == "status_mismatch"
    assert body["status"] == "in_progress"


def test_verify_run_unknown_difficulty() -> None:
    response = client.post(
        "/v1/runs/verify",
        json={
            "difficultyId": "impossible",
            "seed": 1,
            "events": [{"type": "reveal", "x": 0, "y": 0}],
            "status": "lost",
            "durationMs": 0,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["verified"] is False
    assert body["reason"] == "unknown_difficulty"
