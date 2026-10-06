import io
import json
import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from app import app
from v3.api import assess_profile
from v3.pdf import generate_visit_prep_pdf


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_generate_visit_prep_pdf_basic():
    sample = {
        "age": 28,
        "reproductive_goal": "trying",
        "main_concern": "irregular_periods",
        "context": {"uterus": "yes", "ovaries": "both", "menopause_status": "none"},
        "symptoms": {"facial_hair": "mild", "menstrual": "frequently_irregular"},
        "impact": {"menstrual": "quite_a_bit"},
        "metabolic": {"bmi": 24.2, "waist_cm": 78},
        "wellbeing": {"sleep_problem_0_4": 1}
    }
    result = assess_profile(sample)
    pdf_bytes = generate_visit_prep_pdf(result, sample)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")


def test_generate_visit_prep_pdf_single_page():
    sample = {
        "age": 35,
        "reproductive_goal": "not_interested",
        "main_concern": "facial_hair",
        "context": {"uterus": "yes", "ovaries": "both", "menopause_status": "none"},
        "symptoms": {"facial_hair": "severe", "acne": "persistent", "hair_loss": "moderate"},
        "impact": {"facial_hair": "a_lot"},
        "metabolic": {"bmi": 27.5, "waist_cm": 85, "family_history_diabetes": True},
        "wellbeing": {"phq9_total": 8, "gad7_total": 6, "sleep_problem_0_4": 2}
    }
    result = assess_profile(sample)
    pdf_bytes = generate_visit_prep_pdf(result, sample)

    # Verify single page in PDF structure
    page_markers = pdf_bytes.count(b"/Type /Page\n") or pdf_bytes.count(b"/Type /Page ") or pdf_bytes.count(b"/Type/Page")
    assert page_markers == 1


def test_generate_visit_prep_pdf_with_red_flags():
    sample = {
        "age": 52,
        "context": {"uterus": "yes", "menopause_status": "natural"},
        "red_flags": {"vaginal_bleeding": True},
        "symptoms": {"facial_hair": "rapidly_worsening"}
    }
    result = assess_profile(sample)
    assert len(result["red_flags"]) >= 1
    pdf_bytes = generate_visit_prep_pdf(result, sample)
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF")
    page_markers = pdf_bytes.count(b"/Type /Page\n") or pdf_bytes.count(b"/Type /Page ") or pdf_bytes.count(b"/Type/Page")
    assert page_markers == 1


def test_visit_prep_pdf_endpoint(client):
    req_path = os.path.join(os.path.dirname(__file__), "..", "sample_request.json")
    with open(req_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    res = client.post("/v3/visit-prep-pdf", data=json.dumps({"profile": payload}), content_type="application/json")
    assert res.status_code == 200
    assert res.content_type == "application/pdf"
    assert "attachment" in res.headers.get("Content-Disposition", "")
    assert res.data.startswith(b"%PDF")


def test_visit_prep_pdf_endpoint_invalid_json(client):
    res = client.post("/v3/visit-prep-pdf", data="bad-json", content_type="application/json")
    assert res.status_code == 400
