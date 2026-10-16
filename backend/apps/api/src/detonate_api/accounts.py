from __future__ import annotations

import psycopg

from detonate_api.auth import Player, hash_token, new_token


class DisplayNameTakenError(Exception):
    pass


def create_player(database_url: str, display_name: str) -> tuple[Player, str]:
    token = new_token()
    token_hash = hash_token(token)
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        try:
            cur.execute(
                """
                INSERT INTO players (display_name, token_hash)
                VALUES (%s, %s)
                RETURNING id::text, display_name
                """,
                (display_name, token_hash),
            )
        except psycopg.errors.UniqueViolation as exc:
            conn.rollback()
            raise DisplayNameTakenError from exc
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("insert did not return player")
        conn.commit()
    return Player(id=row[0], display_name=row[1]), token
