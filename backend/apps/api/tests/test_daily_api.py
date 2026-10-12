import json
from datetime import date

import redis
from fastapi.testclient import TestClient

from detonate_api.daily import resolve_daily_boards
from detonate_api.main import app
from detonate_api.settings import REDIS_URL
from detonate_engine.daily import daily_redis_key, daily_seed, utc_today

client = TestClient(app)


def test_daily_unknown_difficulty() -> None:
    response = client.get("/v1/daily", params={"difficultyId": "impossible"})
    assert response.status_code == 404


def test_daily_returns_computed_seed_without_redis_entry() -> None:
    today = utc_today()
    expected = daily_seed("beginner", today)
    response = client.get("/v1/daily", params={"difficultyId": "beginner"})
    assert response.status_code == 200
    body = response.json()
    assert body["date"] == today.isoformat()
    assert body["boards"] == [{"difficultyId": "beginner", "seed": expected}]


def test_daily_all_difficulties() -> None:
    response = client.get("/v1/daily")
    assert response.status_code == 200
    body = response.json()
    assert len(body["boards"]) == 3
    assert body["date"]


def _redis_available() -> bool:
    try:
        client = redis.Redis.from_url(REDIS_URL, socket_connect_timeout=1)
        return client.ping() is True
    except redis.RedisError:
        return False


def test_resolve_daily_reads_from_redis_when_published() -> None:
    if not _redis_available():
        return
    day = date(2099, 6, 15)
    key = daily_redis_key(day)
    payload = json.dumps({"beginner": 424242})
    redis_client = redis.Redis.from_url(REDIS_URL, socket_connect_timeout=2)
    redis_client.setex(key, 60, payload)
    try:
        day_str, boards = resolve_daily_boards(REDIS_URL, day=day)
        assert day_str == day.isoformat()
        assert boards["beginner"] == 424242
    finally:
        redis_client.delete(key)
