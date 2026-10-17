from __future__ import annotations

import psycopg

from detonate_api.player_tokens import hash_token, lookup_player_by_token, new_token
from detonate_api.types_player import Player


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


class ClerkUserAlreadyLinkedError(Exception):
    pass


class LegacyTokenInvalidError(Exception):
    pass


def lookup_player_by_clerk_user_id(database_url: str, clerk_user_id: str) -> Player | None:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text, display_name
            FROM players
            WHERE clerk_user_id = %s
            """,
            (clerk_user_id,),
        )
        row = cur.fetchone()
    if row is None:
        return None
    return Player(id=row[0], display_name=row[1])


def upsert_player_for_clerk(
    database_url: str, clerk_user_id: str, display_name: str
) -> Player:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text, display_name
            FROM players
            WHERE clerk_user_id = %s
            """,
            (clerk_user_id,),
        )
        existing = cur.fetchone()
        if existing is not None:
            return Player(id=existing[0], display_name=existing[1])

        try:
            cur.execute(
                """
                INSERT INTO players (display_name, clerk_user_id, token_hash)
                VALUES (%s, %s, NULL)
                RETURNING id::text, display_name
                """,
                (display_name, clerk_user_id),
            )
        except psycopg.errors.UniqueViolation as exc:
            conn.rollback()
            raise DisplayNameTakenError from exc
        row = cur.fetchone()
        if row is None:
            raise RuntimeError("insert did not return player")
        conn.commit()
    return Player(id=row[0], display_name=row[1])


def link_clerk_to_legacy_player(
    database_url: str, clerk_user_id: str, legacy_token: str
) -> Player:
    legacy_player = lookup_player_by_token(legacy_token)
    if legacy_player is None:
        raise LegacyTokenInvalidError

    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text
            FROM players
            WHERE clerk_user_id = %s AND id <> %s::uuid
            """,
            (clerk_user_id, legacy_player.id),
        )
        if cur.fetchone() is not None:
            raise ClerkUserAlreadyLinkedError

        cur.execute(
            """
            UPDATE players
            SET clerk_user_id = %s
            WHERE id = %s::uuid AND clerk_user_id IS NULL
            RETURNING id::text, display_name
            """,
            (clerk_user_id, legacy_player.id),
        )
        row = cur.fetchone()
        if row is None:
            cur.execute(
                "SELECT id::text, display_name FROM players WHERE id = %s::uuid",
                (legacy_player.id,),
            )
            row = cur.fetchone()
            if row is None:
                raise LegacyTokenInvalidError
            if row[0] != legacy_player.id:
                raise RuntimeError("unexpected player row")
            # Already linked to this clerk user.
            conn.commit()
            return Player(id=row[0], display_name=row[1])
        conn.commit()
    return Player(id=row[0], display_name=row[1])
