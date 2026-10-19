from __future__ import annotations

import hashlib
import secrets

import psycopg

from detonate_api.settings import DATABASE_URL
from detonate_api.types_player import Player


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_token() -> str:
    return secrets.token_urlsafe(32)


def lookup_player_by_token(token: str) -> Player | None:
    token_hash = hash_token(token)
    with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text, display_name, onboarding_completed_at
            FROM players
            WHERE token_hash = %s
            """,
            (token_hash,),
        )
        row = cur.fetchone()
    if row is None:
        return None
    return Player(id=row[0], display_name=row[1], onboarding_completed_at=row[2])
