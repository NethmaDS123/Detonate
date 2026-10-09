import os


def cors_origins() -> list[str]:
    raw = os.getenv("API_CORS_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://detonate:detonate@localhost:5432/detonate",
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
