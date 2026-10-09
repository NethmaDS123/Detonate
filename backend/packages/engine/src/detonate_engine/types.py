from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Literal


class Status(StrEnum):
    READY = "ready"
    IN_PROGRESS = "in_progress"
    WON = "won"
    LOST = "lost"


EventType = Literal["reveal", "flag", "chord"]


@dataclass(frozen=True)
class Event:
    type: EventType
    x: int
    y: int


@dataclass
class Cell:
    is_mine: bool = False
    adjacent: int = 0
    revealed: bool = False
    flagged: bool = False
