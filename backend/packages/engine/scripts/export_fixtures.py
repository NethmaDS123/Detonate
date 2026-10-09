"""Write golden JSON fixtures for backend tests and the frontend engine port."""

from __future__ import annotations

import json
from pathlib import Path

from detonate_engine.game import Game
from detonate_engine.rng import XorShift32
from detonate_engine.types import Event

BACKEND_ROOT = Path(__file__).resolve().parents[3]
BACKEND_FIXTURES = BACKEND_ROOT / "fixtures"
FRONTEND_FIXTURES = (
    BACKEND_ROOT.parent / "frontend" / "packages" / "engine" / "fixtures"
)


def dump(name: str, payload: dict) -> None:
    for out_dir in (BACKEND_FIXTURES, FRONTEND_FIXTURES):
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / f"{name}.json"
        path.write_text(json.dumps(payload, indent=2) + "\n")
        root = out_dir.parents[2] if out_dir == FRONTEND_FIXTURES else BACKEND_ROOT
        try:
            print(f"wrote {path.relative_to(root)}")
        except ValueError:
            print(f"wrote {path}")


def rng_fixture() -> None:
    rng = XorShift32(42)
    dump(
        "rng-42",
        {"seed": 42, "values": [rng.next_u32() for _ in range(16)]},
    )


def play(width: int, height: int, mines: int, seed: int, events: list[Event]) -> dict:
    game = Game(width, height, mines, seed)
    serialized_events = [{"type": e.type, "x": e.x, "y": e.y} for e in events]
    for event in events:
        game.apply(event)
    snap = game.snapshot()
    snap["events"] = serialized_events
    return snap


def main() -> None:
    rng_fixture()
    dump(
        "beginner-seed-7-open",
        play(9, 9, 10, 7, [Event("reveal", 0, 0)]),
    )
    dump(
        "beginner-seed-99-flag-then-clear-attempt",
        play(
            9,
            9,
            10,
            99,
            [
                Event("reveal", 4, 4),
                Event("flag", 0, 0),
                Event("flag", 0, 0),
                Event("reveal", 1, 0),
            ],
        ),
    )
    dump(
        "beginner-seed-3-full-clear",
        play(
            9,
            9,
            10,
            3,
            [Event("reveal", 4, 4)]
            + [Event("reveal", x, y) for y in range(9) for x in range(9)],
        ),
    )


if __name__ == "__main__":
    main()
