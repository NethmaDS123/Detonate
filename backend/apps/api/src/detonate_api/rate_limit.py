from __future__ import annotations

import os
import time
from typing import Protocol

from fastapi import HTTPException, Request


class RateLimitStore(Protocol):
    def consume(self, key: str, limit: int, window_sec: int) -> tuple[bool, int]:
        """Return (allowed, retry_after_seconds)."""


class MemoryRateLimitStore:
    def __init__(self) -> None:
        self._windows: dict[str, tuple[float, int]] = {}

    def consume(self, key: str, limit: int, window_sec: int) -> tuple[bool, int]:
        now = time.time()
        window_start, count = self._windows.get(key, (now, 0))
        if now - window_start >= window_sec:
            window_start, count = now, 0
        count += 1
        self._windows[key] = (window_start, count)
        if count > limit:
            retry_after = max(1, int(window_sec - (now - window_start)) + 1)
            return False, retry_after
        return True, 0

    def reset(self) -> None:
        self._windows.clear()


class RedisRateLimitStore:
    def __init__(self, redis_url: str) -> None:
        import redis

        self._client = redis.Redis.from_url(redis_url, socket_connect_timeout=2)

    def consume(self, key: str, limit: int, window_sec: int) -> tuple[bool, int]:
        full_key = f"detonate:ratelimit:{key}"
        count = int(self._client.incr(full_key))
        if count == 1:
            self._client.expire(full_key, window_sec)
        ttl = int(self._client.ttl(full_key))
        if ttl < 0:
            self._client.expire(full_key, window_sec)
            ttl = window_sec
        if count > limit:
            return False, max(1, ttl)
        return True, 0


_memory_store = MemoryRateLimitStore()
_redis_store: RedisRateLimitStore | None = None


def reset_rate_limits_for_tests() -> None:
    _memory_store.reset()


def _use_redis_store() -> bool:
    return os.getenv("RATE_LIMIT_USE_REDIS", "0").strip().lower() in ("1", "true", "yes")


def _store() -> RateLimitStore:
    global _redis_store
    if _use_redis_store():
        if _redis_store is None:
            from detonate_api.settings import REDIS_URL

            _redis_store = RedisRateLimitStore(REDIS_URL)
        return _redis_store
    return _memory_store


def rate_limits_enabled() -> bool:
    return os.getenv("RATE_LIMIT_ENABLED", "1").strip().lower() not in ("0", "false", "no")


_DEFAULTS: dict[str, tuple[int, int]] = {
    "verify": (30, 60),
    "accounts": (5, 3600),
    "leaderboard": (120, 60),
}


def limits_for(namespace: str) -> tuple[int, int]:
    if namespace not in _DEFAULTS:
        raise ValueError(f"unknown rate limit namespace: {namespace}")
    default_limit, default_window = _DEFAULTS[namespace]
    prefix = f"RATE_LIMIT_{namespace.upper()}"
    limit = int(os.getenv(f"{prefix}_PER_WINDOW", str(default_limit)))
    window = int(os.getenv(f"{prefix}_WINDOW_SEC", str(default_window)))
    return max(1, limit), max(1, window)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def check_rate_limit(request: Request, namespace: str) -> None:
    if not rate_limits_enabled():
        return
    limit, window = limits_for(namespace)
    key = f"{namespace}:{client_ip(request)}"
    allowed, retry_after = _store().consume(key, limit, window)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="rate_limit_exceeded",
            headers={"Retry-After": str(retry_after)},
        )


def rate_limit_dependency(namespace: str):
    async def _dependency(request: Request) -> None:
        check_rate_limit(request, namespace)

    return _dependency
