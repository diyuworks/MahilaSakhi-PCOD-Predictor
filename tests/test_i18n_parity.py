"""
Test i18n key set identity across English, Hindi, and Gujarati.
Ensures en.json, hi.json, and gu.json contain identical key sets without missing or orphan keys.
"""

import json
from pathlib import Path

I18N_DIR = Path(__file__).resolve().parent.parent / "frontend" / "src" / "i18n"


def get_leaf_keys(data: dict, prefix: str = "") -> set:
    keys = set()
    for k, v in data.items():
        full = f"{prefix}.{k}" if prefix else k
        if isinstance(v, dict):
            keys.update(get_leaf_keys(v, full))
        else:
            keys.add(full)
    return keys


def test_i18n_key_sets_identical():
    with open(I18N_DIR / "en.json", "r", encoding="utf-8") as f:
        en = json.load(f)
    with open(I18N_DIR / "hi.json", "r", encoding="utf-8") as f:
        hi = json.load(f)
    with open(I18N_DIR / "gu.json", "r", encoding="utf-8") as f:
        gu = json.load(f)

    en_keys = get_leaf_keys(en)
    hi_keys = get_leaf_keys(hi)
    gu_keys = get_leaf_keys(gu)

    # Check Hindi vs English
    diff_hi_en = en_keys ^ hi_keys
    assert not diff_hi_en, f"Key mismatch between en.json and hi.json: {diff_hi_en}"

    # Check Gujarati vs English
    diff_gu_en = en_keys ^ gu_keys
    assert not diff_gu_en, f"Key mismatch between en.json and gu.json: {diff_gu_en}"

    # Verify four chat route labels exist in all three
    for lang, d in [("en", en), ("hi", hi), ("gu", gu)]:
        chat_routes = d.get("care_map", {}).get("chat_routes", {})
        for expected_route in ["deterministic", "grounded", "fallback", "safety"]:
            assert expected_route in chat_routes, f"Missing route '{expected_route}' in {lang}.json"
            assert chat_routes[expected_route].strip(), f"Empty route label for '{expected_route}' in {lang}.json"
