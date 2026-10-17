from __future__ import annotations

from typing import Annotated

from fastapi import Header, HTTPException

from detonate_api.accounts import lookup_player_by_clerk_user_id, upsert_player_for_clerk
from detonate_api.clerk_auth import (
    ClerkTokenError,
    display_name_from_clerk_claims,
    is_probable_clerk_jwt,
    verify_clerk_session_token,
)
from detonate_api.player_tokens import hash_token, lookup_player_by_token, new_token
from detonate_api.settings import DATABASE_URL, clerk_auth_enabled
from detonate_api.types_player import Player

__all__ = [
    "Player",
    "hash_token",
    "new_token",
    "optional_player",
    "require_clerk_claims",
    "require_player",
]


def parse_bearer(authorization: Annotated[str | None, Header()] = None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    value = authorization.removeprefix("Bearer ").strip()
    return value or None


def _player_from_clerk_bearer(bearer: str) -> Player | None:
    if not clerk_auth_enabled() or not is_probable_clerk_jwt(bearer):
        return None
    try:
        claims = verify_clerk_session_token(bearer)
    except ClerkTokenError:
        return None
    clerk_user_id = str(claims["sub"])
    existing = lookup_player_by_clerk_user_id(DATABASE_URL, clerk_user_id)
    if existing is not None:
        return existing
    display_name = display_name_from_clerk_claims(claims)
    try:
        return upsert_player_for_clerk(DATABASE_URL, clerk_user_id, display_name)
    except Exception:
        return None


def resolve_player_from_bearer(bearer: str) -> Player | None:
    clerk_player = _player_from_clerk_bearer(bearer)
    if clerk_player is not None:
        return clerk_player
    return lookup_player_by_token(bearer)


def require_clerk_claims(authorization: Annotated[str | None, Header()] = None) -> dict:
    bearer = parse_bearer(authorization)
    if bearer is None:
        raise HTTPException(status_code=401, detail="missing_token")
    if not clerk_auth_enabled():
        raise HTTPException(status_code=503, detail="clerk_not_configured")
    try:
        return verify_clerk_session_token(bearer)
    except ClerkTokenError as exc:
        raise HTTPException(status_code=401, detail="invalid_clerk_token") from exc


def require_player(authorization: Annotated[str | None, Header()] = None) -> Player:
    bearer = parse_bearer(authorization)
    if bearer is None:
        raise HTTPException(status_code=401, detail="missing_token")
    player = resolve_player_from_bearer(bearer)
    if player is None:
        raise HTTPException(status_code=401, detail="invalid_token")
    return player


def optional_player(authorization: Annotated[str | None, Header()] = None) -> Player | None:
    bearer = parse_bearer(authorization)
    if bearer is None:
        return None
    return resolve_player_from_bearer(bearer)
