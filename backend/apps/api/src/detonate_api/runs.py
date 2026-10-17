from __future__ import annotations

from datetime import date, timedelta

from detonate_api.types_player import Player
from detonate_api.daily import resolve_daily_boards
from detonate_api.db import (
    daily_run_placement,
    persist_verified_win,
    player_best_duration_ms,
)
from detonate_api.schemas import VerifyRunRequest, VerifyRunResponse
from detonate_api.settings import DATABASE_URL, REDIS_URL, RUNS_PERSIST
from detonate_engine import DIFFICULTIES
from detonate_engine.daily import utc_today
from detonate_engine.game import Game
from detonate_engine.replay import apply_events
from detonate_engine.types import Event

# Runs that start before UTC midnight and finish after it still count for their day.
DAILY_GRACE_DAYS = 1


def _rejected(body: VerifyRunRequest, reason: str) -> VerifyRunResponse:
    return VerifyRunResponse(
        verified=False,
        status="ready",
        difficulty_id=body.difficulty_id,
        seed=body.seed,
        duration_ms=body.duration_ms,
        reason=reason,
    )


def _daily_context_valid(body: VerifyRunRequest) -> bool:
    day_text, _, difficulty_id = (body.daily_id or "").partition(":")
    if difficulty_id != body.difficulty_id:
        return False
    try:
        day = date.fromisoformat(day_text)
    except ValueError:
        return False
    today = utc_today()
    if not today - timedelta(days=DAILY_GRACE_DAYS) <= day <= today:
        return False
    _, boards = resolve_daily_boards(REDIS_URL, day)
    return boards.get(body.difficulty_id) == body.seed


def verify_run(body: VerifyRunRequest, player: Player | None = None) -> VerifyRunResponse:
    difficulty = DIFFICULTIES.get(body.difficulty_id)
    if difficulty is None:
        return _rejected(body, "unknown_difficulty")

    if body.board_kind == "daily" and not _daily_context_valid(body):
        return _rejected(body, "daily_mismatch")

    for event in body.events:
        if event.x >= difficulty.width or event.y >= difficulty.height:
            return _rejected(body, "event_out_of_bounds")

    game = Game(difficulty.width, difficulty.height, difficulty.mines, body.seed)
    events = [Event(e.type, e.x, e.y) for e in body.events]
    apply_events(game, events)
    replay_status = game.status.value

    verified = replay_status == body.status
    reason = None if verified else "status_mismatch"

    response = VerifyRunResponse(
        verified=verified,
        status=replay_status,  # type: ignore[arg-type]
        difficulty_id=body.difficulty_id,
        seed=body.seed,
        duration_ms=body.duration_ms,
        reason=reason,
    )

    if not verified or body.status != "won" or not RUNS_PERSIST:
        return response

    previous_best_ms: int | None = None
    if player is not None:
        previous_best_ms = player_best_duration_ms(
            DATABASE_URL, player.id, body.difficulty_id, body.board_kind
        )

    try:
        run_id = persist_verified_win(DATABASE_URL, body, player.id if player else None)
    except Exception:
        return response.model_copy(update={"stored": False, "reason": "storage_unavailable"})

    update: dict[str, object] = {"stored": True, "run_id": run_id}
    if player is not None:
        current_best = min(
            body.duration_ms,
            previous_best_ms if previous_best_ms is not None else body.duration_ms,
        )
        update["personal_best_ms"] = current_best
        update["previous_personal_best_ms"] = previous_best_ms
        update["is_personal_best"] = (
            previous_best_ms is None or body.duration_ms < previous_best_ms
        )
    if body.board_kind == "daily" and body.daily_id:
        placement = daily_run_placement(DATABASE_URL, body.daily_id, run_id)
        if placement is not None:
            rank, total = placement
            update["daily_rank"] = rank
            update["daily_total"] = total

    return response.model_copy(update=update)
