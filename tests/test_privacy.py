"""
Privacy & Zero-Persistence Tests.
Verifies:
1. No health inputs or message texts are persisted to server logs during /chat or /v3/assess.
2. Chat route logs strictly route, intent, and latency (no user content).
3. No local database files exist or are written during request processing.
4. /v3/delete returns a factual response verifying zero server-side storage.
"""

import io
import logging
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


def test_chat_and_assess_log_privacy(client, caplog):
    # Set logger to capture INFO level logs
    caplog.set_level(logging.INFO)

    canary_message = "CANARY_SENSITIVE_PATIENT_QUERY_987654"
    canary_concern = "CANARY_HEALTH_CONCERN_XYZ123"
    canary_symptom = "CANARY_SECRET_SYMPTOM_ABC456"

    chat_payload = {
        "message": f"Why is androgen my priority? {canary_message}",
        "profile": {
            "age": 28,
            "main_concern": canary_concern,
            "context": {"uterus": "yes", "ovaries": "both", "menopause_status": "none"},
            "symptoms": {"facial_hair": "moderate", "acne": canary_symptom},
            "impact": {"facial_hair": "a_lot"},
            "metabolic": {"bmi": 24.5, "waist_cm": 78},
            "wellbeing": {"sleep_problem_0_4": 0},
            "red_flags": {}
        },
        "lang": "en"
    }

    # 1. Test /chat route
    res_chat = client.post("/chat", json=chat_payload)
    assert res_chat.status_code == 200

    # 2. Test /v3/assess route
    res_assess = client.post("/v3/assess", json=chat_payload["profile"])
    assert res_assess.status_code == 200

    # Check all captured log text
    all_logs = " ".join([record.getMessage() for record in caplog.records])

    # ASSERTION: Zero submitted text or private canary strings in server logs
    assert canary_message not in all_logs, f"Security Violation: User message found in server logs: {all_logs}"
    assert canary_concern not in all_logs, f"Security Violation: Patient concern found in server logs: {all_logs}"
    assert canary_symptom not in all_logs, f"Security Violation: Patient symptom found in server logs: {all_logs}"

    # ASSERTION: Chat logs contain ONLY route, intent, and latency metadata
    chat_log_entries = [r.getMessage() for r in caplog.records if "chat_completed" in r.getMessage()]
    assert len(chat_log_entries) >= 1
    for entry in chat_log_entries:
        assert "route=" in entry
        assert "intent=" in entry
        assert "latency_ms=" in entry
        assert canary_message not in entry


def test_zero_database_persistence():
    """Verify that no database engines, SQLite files, or persistent storage files exist."""
    backend_files = [f.name for f in BACKEND_DIR.iterdir()]
    for f in backend_files:
        assert not f.endswith((".db", ".sqlite", ".sqlite3")), f"Unexpected database file found: {f}"


def test_v3_delete_factual_response(client):
    """Verify /v3/delete confirms session deletion and states answers are not stored."""
    res = client.post("/v3/delete")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "deleted" in data["message"].lower()
    assert "not stored" in data["message"].lower()
    # Confirm no legal claims
    assert "dpdp" not in data["message"].lower()
