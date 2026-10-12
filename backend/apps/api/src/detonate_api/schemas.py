from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

MAX_EVENTS = 10_000


class RunEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["reveal", "flag", "chord"]
    x: int = Field(ge=0)
    y: int = Field(ge=0)


class VerifyRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    difficulty_id: str = Field(alias="difficultyId", min_length=1)
    seed: int = Field(ge=0)
    events: list[RunEvent] = Field(min_length=1, max_length=MAX_EVENTS)
    status: Literal["won", "lost"]
    duration_ms: int = Field(alias="durationMs", ge=0, le=86_400_000)

    @field_validator("seed")
    @classmethod
    def seed_fits_uint32(cls, value: int) -> int:
        if value > 0xFFFFFFFF:
            raise ValueError("seed must fit in an unsigned 32-bit integer")
        return value


class VerifyRunResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    verified: bool
    status: Literal["ready", "in_progress", "won", "lost"]
    difficulty_id: str = Field(alias="difficultyId")
    seed: int
    duration_ms: int = Field(alias="durationMs")
    reason: str | None = None
    stored: bool = False
    run_id: str | None = Field(default=None, alias="runId")


class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    rank: int
    run_id: str = Field(alias="runId")
    duration_ms: int = Field(alias="durationMs")
    seed: int
    created_at: datetime = Field(alias="createdAt")


class LeaderboardResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    difficulty_id: str = Field(alias="difficultyId")
    entries: list[LeaderboardEntry]


class DailyBoardEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    difficulty_id: str = Field(alias="difficultyId")
    seed: int


class DailyResponse(BaseModel):
    date: str
    boards: list[DailyBoardEntry]
