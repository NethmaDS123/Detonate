import psycopg
import pytest
from fastapi.testclient import TestClient

from detonate_api.db import ensure_schema
from detonate_api.main import app
from detonate_api.settings import DATABASE_URL

client = TestClient(app)


def _postgres_available() -> bool:
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=1):
            return True
    except psycopg.Error:
        return False


pytestmark = pytest.mark.skipif(not _postgres_available(), reason="postgres not available")


def test_create_account_and_me() -> None:
    ensure_schema(DATABASE_URL)
    name = "test_player_01"
    create = client.post("/v1/accounts", json={"displayName": name})
    assert create.status_code == 201
    body = create.json()
    token = body["token"]
    assert body["displayName"] == name
    assert token

    me = client.get("/v1/accounts/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["displayName"] == name

    with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM players WHERE display_name = %s", (name,))
        conn.commit()


def test_create_account_rejects_duplicate_name() -> None:
    ensure_schema(DATABASE_URL)
    name = "dup_player"
    first = client.post("/v1/accounts", json={"displayName": name})
    assert first.status_code == 201
    second = client.post("/v1/accounts", json={"displayName": name})
    assert second.status_code == 409

    with psycopg.connect(DATABASE_URL, connect_timeout=2) as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM players WHERE display_name = %s", (name,))
        conn.commit()


def test_me_requires_token() -> None:
    response = client.get("/v1/accounts/me")
    assert response.status_code == 401
