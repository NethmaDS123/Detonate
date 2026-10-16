from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import psycopg

from detonate_api.schemas import VerifyRunRequest

MIGRATIONS_DIR = Path(__file__).resolve().parents[4] / "migrations"


def ensure_schema(database_url: str) -> None:
    migrations = sorted(MIGRATIONS_DIR.glob("*.sql"))
    sql = "\n\n".join(path.read_text() for path in migrations)
    with psycopg.connect(database_url, connect_timeout=5) as conn:
        conn.execute(sql)
        conn.commit()


def persist_verified_win(
    database_url: str, body: VerifyRunRequest, player_id: str | None = None
) -> str:
    events = [{"type": e.type, "x": e.x, "y": e.y} for e in body.events]
    payload = json.dumps(events)
    with psycopg.connect(database_url, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO runs (
                  difficulty_id, seed, duration_ms, events, player_id,
                  board_kind, daily_id, mode
                )
                VALUES (%s, %s, %s, %s::jsonb, %s::uuid, %s, %s, %s)
                RETURNING id::text
                """,
                (
                    body.difficulty_id,
                    body.seed,
                    body.duration_ms,
                    payload,
                    player_id,
                    body.board_kind,
                    body.daily_id,
                    body.mode,
                ),
            )
            row = cur.fetchone()
            if row is None:
                raise RuntimeError("insert did not return id")
            run_id = row[0]
        conn.commit()
    return run_id


def list_leaderboard(
    database_url: str, difficulty_id: str, limit: int
) -> list[tuple[str, int, int, datetime, str | None]]:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT r.id::text, r.duration_ms, r.seed, r.created_at, p.display_name
            FROM runs r
            LEFT JOIN players p ON p.id = r.player_id
            WHERE r.difficulty_id = %s
            ORDER BY r.duration_ms ASC, r.created_at ASC
            LIMIT %s
            """,
            (difficulty_id, limit),
        )
        rows = cur.fetchall()
    return [(row[0], row[1], row[2], row[3], row[4]) for row in rows]


def list_daily_leaderboard(
    database_url: str, daily_id: str, limit: int
) -> list[tuple[str, int, int, datetime, str | None]]:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT r.id::text, r.duration_ms, r.seed, r.created_at, p.display_name
            FROM runs r
            LEFT JOIN players p ON p.id = r.player_id
            WHERE r.board_kind = 'daily' AND r.daily_id = %s
            ORDER BY r.duration_ms ASC, r.created_at ASC
            LIMIT %s
            """,
            (daily_id, limit),
        )
        rows = cur.fetchall()
    return [(row[0], row[1], row[2], row[3], row[4]) for row in rows]
