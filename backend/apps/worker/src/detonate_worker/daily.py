from __future__ import annotations

import json
import os

import redis
from detonate_engine.daily import daily_boards, daily_redis_key, daily_redis_ttl_seconds, utc_today


def publish_daily_boards(redis_url: str) -> str:
    day = utc_today()
    boards = daily_boards(day)
    client = redis.Redis.from_url(redis_url, socket_connect_timeout=5)
    key = daily_redis_key(day)
    client.setex(key, daily_redis_ttl_seconds(), json.dumps(boards))
    return day.isoformat()


def main() -> None:
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    day = publish_daily_boards(redis_url)
    print(f"Published daily boards for {day}.")
