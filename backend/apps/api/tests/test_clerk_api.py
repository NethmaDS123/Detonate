import psycopg
import pytest
from fastapi.testclient import TestClient

from detonate_api.db import ensure_schema
from detonate_api.main import app
from detonate_api.settings import DATABASE_URL

client = TestClient(app)
CLERK_BEARER = "Bearer mocked.jwt.token"


def _postgres_available() -> bool:
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=1):
            return True
    except psycopg.Error:
        return False


def test_clerk_sync_requires_configuration() -> None:
    response = client.post(
        "/v1/accounts/clerk/sync",
        json={},
        headers={"Authorization": "Bearer fake.jwt.token"},
    )
    assert response.status_code in (401, 503)


@pytest.mark.skipif(not _postgres_available(), reason="postgres not available")
def test_clerk_link_and_me_with_mocked_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    import detonate_api.settings as settings_module

    monkeypatch.setattr(settings_module, "CLERK_ISSUER", "https://clerk.test")
    monkeypatch.setattr(settings_module, "CLERK_JWKS_URL", "https://clerk.test/.well-known/jwks.json")

    claims = {"sub": "user_clerk_test_1", "username": "ignored_name"}

    def fake_verify(_token: str) -> dict:
        return claims

    monkeypatch.setattr("detonate_api.clerk_auth.verify_clerk_session_token", fake_verify)
    monkeypatch.setattr("detonate_api.auth.verify_clerk_session_token", fake_verify)

    ensure_schema(DATABASE_URL)
    legacy = client.post("/v1/accounts", json={"displayName": "legacy_clerk_link"})
    assert legacy.status_code == 201
    legacy_token = legacy.json()["token"]

    try:
        link = client.post(
            "/v1/accounts/clerk/link",
            json={"legacyToken": legacy_token},
            headers={"Authorization": CLERK_BEARER},
        )
        assert link.status_code == 200
        assert link.json()["displayName"] == "legacy_clerk_link"

        me = client.get("/v1/accounts/me", headers={"Authorization": CLERK_BEARER})
        assert me.status_code == 200
        assert me.json()["displayName"] == "legacy_clerk_link"

        sync = client.post(
            "/v1/accounts/clerk/sync",
            json={},
            headers={"Authorization": CLERK_BEARER},
        )
        assert sync.status_code == 200
        assert sync.json()["displayName"] == "legacy_clerk_link"
    finally:
        with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM players WHERE display_name = %s", ("legacy_clerk_link",))
            conn.commit()
