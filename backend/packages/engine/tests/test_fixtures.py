import json
from pathlib import Path

from detonate_engine.game import Game
from detonate_engine.types import Event

FIXTURES = Path(__file__).resolve().parents[3] / "fixtures"


def test_exported_games_are_stable() -> None:
    for name in (
        "beginner-seed-7-open.json",
        "beginner-seed-99-flag-then-clear-attempt.json",
        "beginner-seed-3-full-clear.json",
    ):
        fixture = json.loads((FIXTURES / name).read_text())
        game = Game(fixture["width"], fixture["height"], fixture["mines"], fixture["seed"])
        for event in fixture["events"]:
            game.apply(Event(event["type"], event["x"], event["y"]))
        snap = game.snapshot()
        assert snap["status"] == fixture["status"]
        assert snap["minePositions"] == fixture["minePositions"]
        assert snap["revealed"] == fixture["revealed"]
        assert snap["flagged"] == fixture["flagged"]
        assert snap["isMine"] == fixture["isMine"]
