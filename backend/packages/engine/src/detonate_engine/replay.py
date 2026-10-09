from __future__ import annotations

from detonate_engine.game import Game
from detonate_engine.types import Event


def apply_events(game: Game, events: list[Event]) -> Game:
    for event in events:
        game.apply(event)
        if game.status.value in ("won", "lost"):
            break
    return game
