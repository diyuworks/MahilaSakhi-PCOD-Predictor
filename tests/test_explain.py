import os
import sys
import types
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from v3.api import assess_profile
from v3.knowledge import load_chunks, retrieve
from v3.explain import explain, fallback, BANNED


@pytest.fixture
def base_result():
    return assess_profile({
        "age": 28,
        "reproductive_goal": "not_interested",
        "main_concern": "facial_hair",
        "context": {"uterus": "yes"},
        "symptoms": {"facial_hair": "moderate"},
        "impact": {"facial_hair": "a_lot"},
    })


def test_load_chunks_verified_filtering():
    # Only verified should return 0 by default when all chunks are unverified draft
    verified_only = load_chunks(only_verified=True)
    all_chunks = load_chunks(only_verified=False)

    assert len(all_chunks) >= 11
    # Check every chunk has false by default
    assert all(c["verified"] is False for c in all_chunks)
    assert len(verified_only) == 0


def test_retrieve_filtered_by_domain_tags():
    all_chunks = load_chunks(only_verified=False)

    # Search specifically for androgen
    androgen_res = retrieve("hirsutism excess hair", tags=["androgen"], chunks=all_chunks)
    assert len(androgen_res) > 0
    for c in androgen_res:
        assert "androgen" in c["tags"]

    # Search with nonexistent tag pool returns empty
    empty_res = retrieve("hirsutism", tags=["nonexistent_domain_tag"], chunks=all_chunks)
    assert empty_res == []


def test_faithfulness_valid_citations_accepted(base_result):
    chunks = [{"id": "PCOS-GL-2023-ANDROGEN-01", "tags": ["androgen"], "text": "Hirsutism guidance."}]
    chunks_by_domain = {"androgen": chunks}

    class MockLLMClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    content = (
                        '{"summary": "Evidence-grounded overview.", '
                        '"per_domain": [{"domain": "androgen", "text": "Discuss hair changes.", "cites": ["PCOS-GL-2023-ANDROGEN-01"]}]}'
                    )
                    m = types.SimpleNamespace(content=content)
                    return types.SimpleNamespace(choices=[types.SimpleNamespace(message=m)])

    out = explain(base_result, chunks_by_domain, client=MockLLMClient())
    assert out["mode"] == "llm_grounded"
    assert out["summary"] == "Evidence-grounded overview."
    assert out["per_domain"][0]["cites"] == ["PCOS-GL-2023-ANDROGEN-01"]


def test_faithfulness_hallucinated_citation_rejected(base_result):
    chunks = [{"id": "PCOS-GL-2023-ANDROGEN-01", "tags": ["androgen"], "text": "Hirsutism guidance."}]
    chunks_by_domain = {"androgen": chunks}

    class MockHallucinatingClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    content = (
                        '{"summary": "Hallucinated citation.", '
                        '"per_domain": [{"domain": "androgen", "text": "Text citing unretrieved id.", "cites": ["FABRICATED-CHUNK-999"]}]}'
                    )
                    m = types.SimpleNamespace(content=content)
                    return types.SimpleNamespace(choices=[types.SimpleNamespace(message=m)])

    # Must fall back to deterministic template
    out = explain(base_result, chunks_by_domain, client=MockHallucinatingClient())
    assert out["mode"] == "template"
    assert "guidance for discussing with a clinician, not a diagnosis" in out["summary"]


def test_faithfulness_partially_unretrieved_citation_rejected(base_result):
    chunks = [{"id": "PCOS-GL-2023-ANDROGEN-01", "tags": ["androgen"], "text": "Hirsutism guidance."}]
    chunks_by_domain = {"androgen": chunks}

    class MockPartialClient:
        class chat:
            class completions:
                @staticmethod
                def create(**kwargs):
                    content = (
                        '{"summary": "Mixed citations.", '
                        '"per_domain": [{"domain": "androgen", "text": "Text citing one good, one bad.", "cites": ["PCOS-GL-2023-ANDROGEN-01", "UNKNOWN-GUIDELINE"]}]}'
                    )
                    m = types.SimpleNamespace(content=content)
                    return types.SimpleNamespace(choices=[types.SimpleNamespace(message=m)])

    out = explain(base_result, chunks_by_domain, client=MockPartialClient())
    assert out["mode"] == "template"


def test_banned_diagnoses_and_doses_rejected(base_result):
    chunks = [{"id": "PCOS-GL-2023-ANDROGEN-01", "tags": ["androgen"], "text": "Hirsutism guidance."}]
    chunks_by_domain = {"androgen": chunks}

    banned_samples = [
        '{"summary": "You definitely have PCOS.", "per_domain": []}',
        '{"summary": "Start taking metformin 500 mg daily.", "per_domain": []}',
        '{"summary": "Take spironolactone 25 mg.", "per_domain": []}',
        '{"summary": "You have diabetes.", "per_domain": []}',
    ]

    for sample in banned_samples:
        class MockBannedClient:
            class chat:
                class completions:
                    @staticmethod
                    def create(**kwargs):
                        m = types.SimpleNamespace(content=sample)
                        return types.SimpleNamespace(choices=[types.SimpleNamespace(message=m)])

        out = explain(base_result, chunks_by_domain, client=MockBannedClient())
        assert out["mode"] == "template"


def test_empty_retrieved_evidence_never_calls_llm(base_result):
    class ExplodingClient:
        chat = None

    # When chunks_by_domain is empty, it returns fallback directly without touching the client
    out = explain(base_result, {}, client=ExplodingClient())
    assert out["mode"] == "template"
