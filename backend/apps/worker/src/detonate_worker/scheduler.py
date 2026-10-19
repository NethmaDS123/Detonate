from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone

from detonate_worker.daily import publish_daily_boards


def next_publish_at(
    now: datetime,
    *,
    hour: int = 0,
    minute: int = 5,
) -> datetime:
    """Next UTC instant at hour:minute (inclusive boundary: at or after now → tomorrow)."""
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError("hour must be 0–23 and minute 0–59")
    candidate = datetime(
        now.year,
        now.month,
        now.day,
        hour,
        minute,
        tzinfo=timezone.utc,
    )
    if now >= candidate:
        candidate += timedelta(days=1)
    return candidate


def schedule_config() -> tuple[int, int]:
    hour = int(os.getenv("WORKER_UTC_HOUR", "0"))
    minute = int(os.getenv("WORKER_UTC_MINUTE", "5"))
    return hour, minute


def run_forever(redis_url: str | None = None) -> None:
    url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
    hour, minute = schedule_config()
    day = publish_daily_boards(url)
    print(f"Published daily boards for {day} (startup).")

    while True:
        now = datetime.now(timezone.utc)
        target = next_publish_at(now, hour=hour, minute=minute)
        delay = max(1.0, (target - now).total_seconds())
        print(
            f"Next publish at {target.isoformat()} UTC "
            f"(in {int(delay)}s; WORKER_UTC_HOUR={hour}, WORKER_UTC_MINUTE={minute})."
        )
        time.sleep(delay)
        day = publish_daily_boards(url)
        print(f"Published daily boards for {day}.")
