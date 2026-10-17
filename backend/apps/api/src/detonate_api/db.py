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


def daily_run_placement(
    database_url: str, daily_id: str, run_id: str
) -> tuple[int, int] | None:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT ranked.rank, ranked.total
            FROM (
              SELECT
                id,
                ROW_NUMBER() OVER (
                  ORDER BY duration_ms ASC, created_at ASC
                ) AS rank,
                COUNT(*) OVER () AS total
              FROM runs
              WHERE board_kind = 'daily' AND daily_id = %s
            ) ranked
            WHERE ranked.id = %s::uuid
            """,
            (daily_id, run_id),
        )
        row = cur.fetchone()
    if row is None:
        return None
    return int(row[0]), int(row[1])


PersonalBestRow = tuple[str, int, str, datetime, str | None]


def player_best_duration_ms(
    database_url: str, player_id: str, difficulty_id: str, board_kind: str
) -> int | None:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT duration_ms
            FROM runs
            WHERE player_id = %s::uuid
              AND difficulty_id = %s
              AND board_kind = %s
            ORDER BY duration_ms ASC, created_at ASC
            LIMIT 1
            """,
            (player_id, difficulty_id, board_kind),
        )
        row = cur.fetchone()
    if row is None:
        return None
    return int(row[0])


def best_daily_duration_ms(database_url: str, daily_id: str) -> int | None:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT MIN(duration_ms)
            FROM runs
            WHERE board_kind = 'daily' AND daily_id = %s
            """,
            (daily_id,),
        )
        row = cur.fetchone()
    if row is None or row[0] is None:
        return None
    return int(row[0])


def list_player_personal_bests(
    database_url: str, player_id: str, board_kind: str
) -> list[PersonalBestRow]:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT ON (difficulty_id)
              difficulty_id,
              duration_ms,
              id::text,
              created_at,
              daily_id
            FROM runs
            WHERE player_id = %s::uuid AND board_kind = %s
            ORDER BY difficulty_id, duration_ms ASC, created_at ASC
            """,
            (player_id, board_kind),
        )
        rows = cur.fetchall()
    return [
        (str(row[0]), int(row[1]), str(row[2]), row[3], row[4] if row[4] is None else str(row[4]))
        for row in rows
    ]
