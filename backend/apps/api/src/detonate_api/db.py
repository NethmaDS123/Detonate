from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import psycopg

from detonate_api.schemas import VerifyRunRequest

MIGRATIONS_DIR = Path(__file__).resolve().parents[4] / "migrations"


def ensure_schema(database_url: str) -> None:
    migration = MIGRATIONS_DIR / "001_runs.sql"
    sql = migration.read_text()
    with psycopg.connect(database_url, connect_timeout=5) as conn:
        conn.execute(sql)
        conn.commit()


def persist_verified_win(database_url: str, body: VerifyRunRequest) -> str:
    events = [{"type": e.type, "x": e.x, "y": e.y} for e in body.events]
    payload = json.dumps(events)
    with psycopg.connect(database_url, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO runs (difficulty_id, seed, duration_ms, events)
                VALUES (%s, %s, %s, %s::jsonb)
                RETURNING id::text
                """,
                (body.difficulty_id, body.seed, body.duration_ms, payload),
            )
            row = cur.fetchone()
            if row is None:
                raise RuntimeError("insert did not return id")
            run_id = row[0]
        conn.commit()
    return run_id


def list_leaderboard(
    database_url: str, difficulty_id: str, limit: int
) -> list[tuple[str, int, int, datetime]]:
    with psycopg.connect(database_url, connect_timeout=5) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id::text, duration_ms, seed, created_at
            FROM runs
            WHERE difficulty_id = %s
            ORDER BY duration_ms ASC, created_at ASC
            LIMIT %s
            """,
            (difficulty_id, limit),
        )
        rows = cur.fetchall()
    return [(row[0], row[1], row[2], row[3]) for row in rows]
