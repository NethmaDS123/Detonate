from datetime import datetime, timezone

import pytest

from detonate_worker.scheduler import next_publish_at


def test_next_publish_at_later_today():
    now = datetime(2026, 3, 15, 0, 4, tzinfo=timezone.utc)
    assert next_publish_at(now, hour=0, minute=5) == datetime(
        2026, 3, 15, 0, 5, tzinfo=timezone.utc
    )


def test_next_publish_at_rolls_to_next_day():
    now = datetime(2026, 3, 15, 0, 5, tzinfo=timezone.utc)
    assert next_publish_at(now, hour=0, minute=5) == datetime(
        2026, 3, 16, 0, 5, tzinfo=timezone.utc
    )


def test_next_publish_at_rejects_invalid():
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)
    with pytest.raises(ValueError):
        next_publish_at(now, hour=24, minute=0)
