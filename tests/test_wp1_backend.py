import json
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_v3_assess_endpoint(client):
    req_path = os.path.join(os.path.dirname(__file__), "..", "sample_request.json")
    with open(req_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    res = client.post("/v3/assess", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200
    data = res.get_json()
    assert "priority" in data
    assert "pathway" in data
    assert "explanation" in data
    assert data["context"]["cycle_tracking"] == "not_applicable"


def test_v3_assess_validation_error(client):
    # Age < 10 violates pydantic validator
    invalid_payload = {"age": 5}
    res = client.post("/v3/assess", data=json.dumps(invalid_payload), content_type="application/json")
    assert res.status_code == 400
    data = res.get_json()
    assert "Validation error" in data["error"]
    assert "details" in data


def test_v3_delete_endpoint(client):
    res_post = client.post("/v3/delete")
    assert res_post.status_code == 200
    assert "DPDP" in res_post.get_json()["message"]

    res_del = client.delete("/v3/delete")
    assert res_del.status_code == 200
    assert "DPDP" in res_del.get_json()["message"]


def test_legacy_predict_insufficient_data(client):
    # Without ultrasound findings (Follicle No L/R), predict_clinical returns insufficient_data
    payload = {"features": {"Skin darkening (Y/N)": 1, "BMI": 26}}
    res = client.post("/predict", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "insufficient_data"
    assert "ultrasound findings" in data["message"]


def test_screen_menopause_skipped_when_uterus_no(client):
    payload = {
        "inputs": {
            "context": {"uterus": "no", "ovaries": "both"},
            "pcos": {},
            "menopause": {"age": 52, "cycle_status": "irregular"}
        }
    }
    res = client.post("/screen", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200
    data = res.get_json()
    meno = data["likelihood"]["menopause"]
    assert meno["likelihood"] == "Not applicable"
    assert meno["applicable"] is False


def test_chat_requires_context(client):
    payload = {"message": "Hello, how does diet affect PCOS?"}
    res = client.post("/chat", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 400
    assert "context from v3 result is required" in res.get_json()["error"]


def test_chat_refuses_dosage_and_diagnosis(client):
    # Test dose refusal
    payload = {
        "message": "What is the recommended dose of metformin for me?",
        "context": "User has moderate androgen symptoms."
    }
    res = client.post("/chat", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200
    reply = res.get_json()["reply"]
    assert "cannot provide a medical diagnosis or prescribe" in reply.lower() or "clinician" in reply.lower()

    # Test diagnosis refusal
    payload2 = {
        "message": "Do I have PCOS?",
        "context": "User has moderate androgen symptoms."
    }
    res2 = client.post("/chat", data=json.dumps(payload2), content_type="application/json")
    assert res2.status_code == 200
    reply2 = res2.get_json()["reply"]
    assert "cannot provide a medical diagnosis" in reply2.lower()
