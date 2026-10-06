#!/usr/bin/env python3
"""Run golden evaluation suite for Chat v2 across clinical, safety, context-gate and edge cases."""
import json
import os
import sys
from collections import defaultdict

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "..", "backend")
sys.path.insert(0, BACKEND_DIR)

from v3.chat import handle_chat

PERSONAS = {
    "general": {
        "age": 28,
        "reproductive_goal": "not_interested",
        "main_concern": "facial_hair",
        "context": {"uterus": "yes", "ovaries": "both"},
        "symptoms": {"facial_hair": "moderate"},
        "impact": {"facial_hair": "a_lot"},
    },
    "hysterectomy": {
        "age": 38,
        "reproductive_goal": "not_interested",
        "main_concern": "facial_hair",
        "context": {"uterus": "no", "ovaries": "both"},
        "symptoms": {"facial_hair": "moderate"},
        "impact": {"facial_hair": "a_lot"},
    },
    "postmenopausal": {
        "age": 58,
        "reproductive_goal": "not_interested",
        "main_concern": "facial_hair",
        "context": {"uterus": "yes", "ovaries": "both", "menopause_status": "natural"},
        "symptoms": {"facial_hair": "rapidly_worsening"},
        "impact": {"facial_hair": "a_lot"},
    },
    "trying_to_conceive": {
        "age": 29,
        "reproductive_goal": "trying",
        "main_concern": "irregular_periods",
        "context": {"uterus": "yes", "ovaries": "both"},
        "symptoms": {"menstrual": "irregular"},
        "impact": {"menstrual": "a_lot"},
    },
    "lean_hirsutism": {
        "age": 24,
        "reproductive_goal": "not_interested",
        "main_concern": "facial_hair",
        "context": {"uterus": "yes", "ovaries": "both"},
        "symptoms": {"facial_hair": "severe"},
        "impact": {"facial_hair": "a_lot"},
        "metabolic": {"bmi": 20.5},
    },
}


class StrictNoLLMClient:
    class chat:
        class completions:
            @staticmethod
            def create(**kwargs):
                raise AssertionError("CRITICAL VIOLATION: LLM called on a route that must never use LLM!")


def main():
    golden_path = os.path.join(BASE_DIR, "..", "tests", "eval", "chat_golden.jsonl")
    if not os.path.exists(golden_path):
        print(f"Error: Golden eval dataset not found at {golden_path}")
        sys.exit(1)

    with open(golden_path, "r", encoding="utf-8") as f:
        cases = [json.loads(line) for line in f if line.strip()]

    print(f"\n================================================================================")
    print(f"       MahilaSakhi Chat v2 Evaluation Runner ({len(cases)} Golden Cases)        ")
    print(f"================================================================================\n")

    category_stats = defaultdict(lambda: {"total": 0, "passed": 0, "failed": 0})
    failures = []

    client = StrictNoLLMClient()

    for c in cases:
        case_id = c["id"]
        cat = c.get("category", "general")
        category_stats[cat]["total"] += 1

        persona_key = c.get("persona", "general")
        profile = c.get("profile") or PERSONAS.get(persona_key, PERSONAS["general"])

        payload = {
            "message": c["message"],
            "profile": profile,
            "lang": c.get("lang", "en"),
            "history": c.get("history", []),
        }

        try:
            res = handle_chat(payload, client=client)

            # Check error case
            if c.get("expected_route") == "error":
                if res.get("status") == 400 or "error" in res:
                    category_stats[cat]["passed"] += 1
                    continue
                else:
                    category_stats[cat]["failed"] += 1
                    failures.append((case_id, cat, f"Expected error/400 but got: {res}"))
                    continue

            # Check route
            if res.get("route") != c["expected_route"]:
                category_stats[cat]["failed"] += 1
                failures.append((case_id, cat, f"Route mismatch: expected {c['expected_route']}, got {res.get('route')}"))
                continue

            # Check kind if safety
            if c.get("expected_kind") and res.get("kind") != c["expected_kind"]:
                category_stats[cat]["failed"] += 1
                failures.append((case_id, cat, f"Kind mismatch: expected {c['expected_kind']}, got {res.get('kind')}"))
                continue

            # Check intent if specified
            if c.get("expected_intent") and res.get("intent") != c["expected_intent"]:
                category_stats[cat]["failed"] += 1
                failures.append((case_id, cat, f"Intent mismatch: expected {c['expected_intent']}, got {res.get('intent')}"))
                continue

            # Check forbidden text in reply
            forbidden = c.get("forbidden_in_reply", [])
            reply_text = res.get("reply", "")
            violation = [word for word in forbidden if word.lower() in reply_text.lower()]
            if violation:
                category_stats[cat]["failed"] += 1
                failures.append((case_id, cat, f"Forbidden text {violation} found in reply: {reply_text}"))
                continue

            category_stats[cat]["passed"] += 1

        except Exception as e:
            category_stats[cat]["failed"] += 1
            failures.append((case_id, cat, f"Exception raised: {str(e)}"))

    # Print Category Breakdown Table
    print(f"{'Category':<22} | {'Total':<6} | {'Passed':<6} | {'Failed':<6} | {'Pass Rate':<9}")
    print("-" * 65)

    total_all, passed_all = 0, 0
    for cat, stats in sorted(category_stats.items()):
        total = stats["total"]
        passed = stats["passed"]
        rate = (passed / total * 100) if total else 0
        total_all += total
        passed_all += passed
        print(f"{cat:<22} | {total:<6} | {passed:<6} | {stats['failed']:<6} | {rate:>6.1f}%")

    print("-" * 65)
    overall_rate = (passed_all / total_all * 100) if total_all else 0
    print(f"{'OVERALL TOTAL':<22} | {total_all:<6} | {passed_all:<6} | {total_all - passed_all:<6} | {overall_rate:>6.1f}%\n")

    if failures:
        print(f"FAILED CASES ({len(failures)}):")
        for fid, fcat, reason in failures:
            print(f"  [x] {fid} ({fcat}): {reason}")
        print("\nEval Run Status: FAILED")
        sys.exit(1)
    else:
        print("Eval Run Status: ALL GOLDEN EVAL CASES PASSED (100.0%)")
        sys.exit(0)


if __name__ == "__main__":
    main()
