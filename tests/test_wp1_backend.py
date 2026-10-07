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
    req_path = os.path.join(os.path.dirname(__file__), "fixtures", "sample_request.json")
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
    assert "deleted" in res_post.get_json()["message"]
    assert "not stored" in res_post.get_json()["message"]

    res_del = client.delete("/v3/delete")
    assert res_del.status_code == 200
    assert "deleted" in res_del.get_json()["message"]
    assert "not stored" in res_del.get_json()["message"]


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


def test_chat_requires_profile(client):
    payload = {"message": "Hello, how does diet affect PCOS?"}
    res = client.post("/chat", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 400
    assert "profile is required" in res.get_json()["error"]


def test_chat_refuses_dosage_and_diagnosis(client):
    profile = {"age": 28, "context": {"uterus": "yes"}}
    # Test dose refusal
    payload = {
        "message": "What is the recommended dose of metformin for me?",
        "profile": profile
    }
    res = client.post("/chat", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200
    data = res.get_json()
    assert data["route"] == "safety"
    assert "can't advise on medicines" in data["reply"].lower() or "cannot advise on medicines" in data["reply"].lower()

    # Test diagnosis refusal
    payload2 = {
        "message": "Do I have PCOS?",
        "profile": profile
    }
    res2 = client.post("/chat", data=json.dumps(payload2), content_type="application/json")
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["route"] == "safety"
    assert "can't diagnose pcos" in data2["reply"].lower()


def test_assess_with_null_wellbeing_totals(client):
    """When mental module is skipped, phq9_total/gad7_total are null, not 0."""
    payload = {
        "age": 27,
        "context": {"uterus": "yes"},
        "wellbeing": {
            "phq9_total": None,
            "phq9_item9": None,
            "gad7_total": None,
            "sleep_problem_0_4": 1
        }
    }
    res = client.post("/v3/assess", data=json.dumps(payload), content_type="application/json")
    assert res.status_code == 200
    data = res.get_json()
    mental_domain = [d for d in data["priority"]["ranked_domains"] if d["domain"] == "mental"][0]
    assert mental_domain["severity"] == 0
    assert mental_domain["tier"] == "maintain"

