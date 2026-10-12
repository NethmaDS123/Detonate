from datetime import date

from detonate_engine.daily import daily_boards, daily_seed
from detonate_engine.difficulties import DIFFICULTIES


def test_daily_seed_is_deterministic() -> None:
    day = date(2026, 10, 11)
    first = daily_seed("beginner", day)
    second = daily_seed("beginner", day)
    assert first == second
    assert 1 <= first <= 0xFFFFFFFF


def test_daily_seed_varies_by_difficulty_and_day() -> None:
    day = date(2026, 10, 11)
    other_day = date(2026, 10, 12)
    assert daily_seed("beginner", day) != daily_seed("intermediate", day)
    assert daily_seed("beginner", day) != daily_seed("beginner", other_day)


def test_daily_boards_cover_all_difficulties() -> None:
    boards = daily_boards(date(2026, 1, 1))
    assert set(boards) == set(DIFFICULTIES)
