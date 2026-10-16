from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DISPLAY_NAME_PATTERN = r"^[A-Za-z0-9_]{2,24}$"

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
    board_kind: Literal["random", "daily"] = Field(default="random", alias="boardKind")
    daily_id: str | None = Field(default=None, alias="dailyId", min_length=3, max_length=64)
    mode: Literal["classic"] = "classic"

    @field_validator("seed")
    @classmethod
    def seed_fits_uint32(cls, value: int) -> int:
        if value > 0xFFFFFFFF:
            raise ValueError("seed must fit in an unsigned 32-bit integer")
        return value

    @model_validator(mode="after")
    def daily_metadata_consistent(self) -> VerifyRunRequest:
        if self.board_kind == "daily" and not self.daily_id:
            raise ValueError("dailyId is required when boardKind is daily")
        if self.board_kind == "random" and self.daily_id is not None:
            raise ValueError("dailyId must be omitted when boardKind is random")
        return self


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
    display_name: str | None = Field(default=None, alias="displayName")
    created_at: datetime = Field(alias="createdAt")


class LeaderboardResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    difficulty_id: str = Field(alias="difficultyId")
    entries: list[LeaderboardEntry]


class DailyLeaderboardResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    date: str
    daily_id: str = Field(alias="dailyId")
    difficulty_id: str = Field(alias="difficultyId")
    entries: list[LeaderboardEntry]


class DailyBoardEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    difficulty_id: str = Field(alias="difficultyId")
    seed: int


class DailyResponse(BaseModel):
    date: str
    boards: list[DailyBoardEntry]


class CreateAccountRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    display_name: str = Field(alias="displayName", min_length=2, max_length=24, pattern=DISPLAY_NAME_PATTERN)


class CreateAccountResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    player_id: str = Field(alias="playerId")
    display_name: str = Field(alias="displayName")
    token: str


class AccountResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    player_id: str = Field(alias="playerId")
    display_name: str = Field(alias="displayName")
