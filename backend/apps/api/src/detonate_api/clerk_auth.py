from __future__ import annotations

import hashlib
import re
from typing import Any

import jwt
from jwt import PyJWKClient

from detonate_api.schemas import DISPLAY_NAME_PATTERN
from detonate_api.settings import CLERK_AUDIENCE, CLERK_ISSUER, CLERK_JWKS_URL, clerk_auth_enabled

_jwks_client: PyJWKClient | None = None


class ClerkTokenError(Exception):
    pass


def _client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(CLERK_JWKS_URL)
    return _jwks_client


def verify_clerk_session_token(token: str) -> dict[str, Any]:
    if not clerk_auth_enabled():
        raise ClerkTokenError("clerk_not_configured")
    try:
        signing_key = _client().get_signing_key_from_jwt(token)
        options = {"verify_aud": CLERK_AUDIENCE is not None}
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_ISSUER,
            audience=CLERK_AUDIENCE,
            options=options,
        )
    except jwt.PyJWTError as exc:
        raise ClerkTokenError("invalid_clerk_token") from exc
    sub = payload.get("sub")
    if not isinstance(sub, str) or not sub:
        raise ClerkTokenError("invalid_clerk_token")
    return payload


def is_probable_clerk_jwt(token: str) -> bool:
    return token.count(".") == 2 and len(token) > 80


def display_name_from_clerk_claims(claims: dict[str, Any], requested: str | None = None) -> str:
    if requested and re.fullmatch(DISPLAY_NAME_PATTERN, requested):
        return requested

    for key in ("username", "preferred_username", "name", "given_name"):
        raw = claims.get(key)
        if not isinstance(raw, str):
            continue
        candidate = _sanitize_display_name(raw)
        if candidate:
            return candidate

    digest = hashlib.sha256(str(claims["sub"]).encode()).hexdigest()[:10]
    return f"u{digest}"


def _sanitize_display_name(raw: str) -> str | None:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", raw.strip())[:24]
    if len(cleaned) < 2:
        return None
    if re.fullmatch(DISPLAY_NAME_PATTERN, cleaned):
        return cleaned
    trimmed = cleaned[:24].rstrip("_")
    if len(trimmed) >= 2 and re.fullmatch(DISPLAY_NAME_PATTERN, trimmed):
        return trimmed
    return None
