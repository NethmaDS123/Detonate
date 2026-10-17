from __future__ import annotations

import hashlib
from datetime import date, datetime, timedelta, timezone

from detonate_engine.difficulties import DIFFICULTIES

# Day 1 of Detonate dailies (UTC calendar days).
DAILY_EPOCH = date(2026, 1, 1)


def utc_today(now: datetime | None = None) -> date:
    instant = now or datetime.now(timezone.utc)
    return instant.date()


def daily_id(day: date, difficulty_id: str) -> str:
    return f"{day.isoformat()}:{difficulty_id}"


def daily_number(day: date) -> int:
    return (day - DAILY_EPOCH).days + 1


def daily_seed(difficulty_id: str, day: date) -> int:
    payload = daily_id(day, difficulty_id).encode()
    digest = hashlib.sha256(payload).digest()
    value = int.from_bytes(digest[:4], "big")
    return value % 0xFFFFFFFF or 1


def daily_boards(day: date) -> dict[str, int]:
    return {difficulty.id: daily_seed(difficulty.id, day) for difficulty in DIFFICULTIES.values()}


def daily_redis_key(day: date) -> str:
    return f"detonate:daily:{day.isoformat()}"


def daily_redis_ttl_seconds(now: datetime | None = None) -> int:
    instant = now or datetime.now(timezone.utc)
    next_midnight = datetime(
        instant.year,
        instant.month,
        instant.day,
        tzinfo=timezone.utc,
    ) + timedelta(days=1)
    return max(60, int((next_midnight - instant).total_seconds()) + 3600)
