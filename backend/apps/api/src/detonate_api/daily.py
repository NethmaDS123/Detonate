from __future__ import annotations

import json
from datetime import date

import redis
from detonate_engine.daily import daily_boards, daily_redis_key, utc_today


def resolve_daily_boards(redis_url: str, day: date | None = None) -> tuple[str, dict[str, int]]:
    resolved_day = day or utc_today()
    key = daily_redis_key(resolved_day)
    try:
        client = redis.Redis.from_url(redis_url, socket_connect_timeout=2)
        raw = client.get(key)
        if raw is not None:
            parsed = json.loads(raw)
            boards = {str(difficulty_id): int(seed) for difficulty_id, seed in parsed.items()}
            return resolved_day.isoformat(), boards
    except (redis.RedisError, json.JSONDecodeError, TypeError, ValueError):
        pass
    return resolved_day.isoformat(), daily_boards(resolved_day)
