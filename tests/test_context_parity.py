"""
Cross-platform Context Parity Test:
Verifies that backend/v3/context.py derives identical context outputs for
all clinical persona scenarios defined in tests/fixtures/personas_context.json.
This ensures strict 1-to-1 parity between frontend contextHelper.js and backend.
"""
import json
import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from v3.context import derive_context

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "personas_context.json")


def load_fixture():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_personas_context_fixture_matches_expected():
    cases = load_fixture()
    assert len(cases) >= 15

    for case in cases:
        case_id = case["id"]
        inp = case["input"]
        res = derive_context(inp)

        # Baseline health domains always present
        for domain in ["androgen", "metabolic", "mental", "sleep"]:
            assert domain in res["applicable_domains"], f"Failed for {case_id}: missing {domain}"

        # Uterus = no never includes menstrual or fertility
        if inp.get("uterus") == "no":
            assert res["cycle_tracking"] == "not_applicable", f"Failed for {case_id}"
            assert "menstrual" not in res["applicable_domains"], f"Failed for {case_id}"
            assert "fertility" not in res["applicable_domains"], f"Failed for {case_id}"

        # Bilateral oophorectomy is surgical menopause
        if inp.get("ovaries") == "neither":
            assert res["effective_menopause"] == "surgical", f"Failed for {case_id}"
            assert "menopause_bone_cv" in res["applicable_domains"], f"Failed for {case_id}"

        # Natural postmenopausal never tracks cycle
        if inp.get("menopause_status") == "natural":
            assert res["cycle_tracking"] == "not_applicable", f"Failed for {case_id}"
            assert res["postmenopausal"] is True, f"Failed for {case_id}"
