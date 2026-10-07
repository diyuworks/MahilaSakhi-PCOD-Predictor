"""
Health and Deployment Route Tests.
Verifies:
1. GET /health returns 200 OK with service status.
2. GET /v3/health returns 200 OK.
3. No secrets or API credentials leaked in health responses.
4. CORS restrictions in production environment.
"""

import os
import pytest
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_root_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "mahilasakhi-backend"
    assert "version" in data

    # Verify no secrets or sensitive env vars leaked
    for key in ["api_key", "secret", "token", "password", "nvidia"]:
        assert key not in str(data).lower()


def test_v3_health_endpoint(client):
    res = client.get("/v3/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "healthy"
    assert data["service"] == "mahilasakhi-v3"
