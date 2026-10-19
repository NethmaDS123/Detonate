from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Player:
    id: str
    display_name: str
    onboarding_completed_at: datetime | None = None

    @property
    def onboarding_completed(self) -> bool:
        return self.onboarding_completed_at is not None
