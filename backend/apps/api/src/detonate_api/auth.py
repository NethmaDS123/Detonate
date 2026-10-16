from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from typing import Annotated

import psycopg
from fastapi import Header, HTTPException

from detonate_api.settings import DATABASE_URL


@dataclass(frozen=True)
class Player:
    id: str
    display_name: str


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(32)


def parse_bearer(authorization: Annotated[str | None, Header()] = None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    value = authorization.removeprefix("Bearer ").strip()
    return value or None


def lookup_player_by_token(token: str) -> Player | None:
    token_hash = hash_token(token)
    with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text, display_name
            FROM players
            WHERE token_hash = %s
            """,
            (token_hash,),
        )
        row = cur.fetchone()
    if row is None:
        return None
    return Player(id=row[0], display_name=row[1])


def require_player(authorization: Annotated[str | None, Header()] = None) -> Player:
    bearer = parse_bearer(authorization)
    if bearer is None:
        raise HTTPException(status_code=401, detail="missing_token")
    player = lookup_player_by_token(bearer)
    if player is None:
        raise HTTPException(status_code=401, detail="invalid_token")
    return player


def optional_player(authorization: Annotated[str | None, Header()] = None) -> Player | None:
    bearer = parse_bearer(authorization)
    if bearer is None:
        return None
    return lookup_player_by_token(bearer)
