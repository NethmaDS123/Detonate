from __future__ import annotations

from detonate_engine import DIFFICULTIES
from detonate_engine.game import Game
from detonate_engine.replay import apply_events
from detonate_engine.types import Event

from detonate_api.db import persist_verified_win
from detonate_api.schemas import VerifyRunRequest, VerifyRunResponse
from detonate_api.settings import DATABASE_URL, RUNS_PERSIST


def verify_run(body: VerifyRunRequest) -> VerifyRunResponse:
    difficulty = DIFFICULTIES.get(body.difficulty_id)
    if difficulty is None:
        return VerifyRunResponse(
            verified=False,
            status="ready",
            difficulty_id=body.difficulty_id,
            seed=body.seed,
            duration_ms=body.duration_ms,
            reason="unknown_difficulty",
        )

    for event in body.events:
        if event.x >= difficulty.width or event.y >= difficulty.height:
            return VerifyRunResponse(
                verified=False,
                status="ready",
                difficulty_id=body.difficulty_id,
                seed=body.seed,
                duration_ms=body.duration_ms,
                reason="event_out_of_bounds",
            )

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

    try:
        run_id = persist_verified_win(DATABASE_URL, body)
    except Exception:
        return response.model_copy(update={"stored": False, "reason": "storage_unavailable"})

    return response.model_copy(update={"stored": True, "run_id": run_id})
