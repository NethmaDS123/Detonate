from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from detonate_api.settings import DATABASE_URL, REDIS_URL, cors_origins
from detonate_engine import DIFFICULTIES

app = FastAPI(
    title="Detonate API",
    version="0.1.0",
    description="Competitive Minesweeper platform. Don't.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict:
    return {"name": "Detonate", "slogan": "Don't."}


@app.get("/health")
def health() -> dict:
    return {"ok": True, "service": "detonate-api"}


@app.get("/ready")
def ready() -> dict:
    checks = {
        "postgres": _check_postgres(),
        "redis": _check_redis(),
    }
    return {"ok": all(checks.values()), "checks": checks}


@app.get("/v1/difficulties")
def difficulties() -> dict:
    return {
        "difficulties": [
            {
                "id": d.id,
                "label": d.label,
                "width": d.width,
                "height": d.height,
                "mines": d.mines,
            }
            for d in DIFFICULTIES.values()
        ]
    }


def _check_postgres() -> bool:
    try:
        import psycopg

        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return True
    except Exception:
        return False


def _check_redis() -> bool:
    try:
        import redis

        client = redis.Redis.from_url(REDIS_URL, socket_connect_timeout=2)
        return client.ping() is True
    except Exception:
        return False
