"""Verify Postgres connectivity and apply migrations. Run from backend/: uv run python scripts/check_db.py"""

from __future__ import annotations

import sys

import psycopg

from detonate_api.db import ensure_schema
from detonate_api.settings import DATABASE_URL, RUNS_PERSIST, database_url_configured


def main() -> None:
    if not RUNS_PERSIST:
        print("RUNS_PERSIST is off; API will not store runs in Postgres.")
        sys.exit(0)
    if not database_url_configured():
        print("DATABASE_URL still has placeholders. Edit backend/.env with your Supabase URI.")
        sys.exit(1)
    try:
        ensure_schema(DATABASE_URL)
        with psycopg.connect(DATABASE_URL, connect_timeout=15) as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name IN ('runs', 'players')
                ORDER BY 1
                """
            )
            tables = [row[0] for row in cur.fetchall()]
    except psycopg.Error as exc:
        print(f"Postgres connection failed: {exc}")
        sys.exit(1)
    print("Postgres OK. Tables:", ", ".join(tables) if tables else "(none yet)")


if __name__ == "__main__":
    main()
