import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parents[4]
load_dotenv(_BACKEND_ROOT / ".env")


def cors_origins() -> list[str]:
    raw = os.getenv("API_CORS_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://detonate:detonate@localhost:5432/detonate",
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
RUNS_PERSIST = os.getenv("RUNS_PERSIST", "1").strip().lower() not in ("0", "false", "no")

_PLACEHOLDER_MARKERS = ("[password]", "[project-ref]", "[region]")


def database_url_configured() -> bool:
    return not any(marker in DATABASE_URL for marker in _PLACEHOLDER_MARKERS)
