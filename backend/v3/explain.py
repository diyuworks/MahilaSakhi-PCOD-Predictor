"""LLM explains ONLY structured results + retrieved verified chunks. Anything else -> fallback."""
import json, re
from typing import Any, Dict, List

SYSTEM = (
    "You are MahilaSakhi's care-navigation explainer. You EXPLAIN a structured assessment in warm, "
    "plain language. Rules: (1) use only the JSON provided; (2) never diagnose, never say 'you have X'; "
    "(3) never name medicines or doses; (4) every statement drawn from guideline text must cite its "
    "chunk id in 'cites'; (5) if unsure, say to ask a clinician. Reply ONLY with JSON: "
    '{"summary": str, "per_domain": [{"domain": str, "text": str, "cites": [str]}]}'
)
BANNED = re.compile(r"\b(\d+\s?(mg|mcg|ml|iu)\b|you (definitely )?have (pcos|pcod|diabetes|cancer)|"
                    r"metformin|spironolactone|letrozole|clomiphene|isotretinoin|ocp)\b", re.I)


def fallback(result: Dict[str, Any]) -> Dict[str, Any]:
    per = [{"domain": r["domain"],
            "text": f"This area is a '{r['tier'].replace('_', ' ')}' for you right now. "
                    "See the questions and tests below to discuss with a clinician.",
            "cites": []} for r in result["priority"]["ranked_domains"]]
    return {"summary": "Here is a personalised overview of the areas most relevant to you. "
                       "This is guidance for discussing with a clinician, not a diagnosis.",
            "per_domain": per, "mode": "template"}


def explain(result: Dict[str, Any], chunks_by_domain: Dict[str, List[Dict[str, Any]]],
            client=None, model: str = "meta/llama-3.1-8b-instruct") -> Dict[str, Any]:
    allowed = {c["id"] for cs in chunks_by_domain.values() for c in cs}
    if client is None or not allowed:       # no verified evidence -> never free-generate
        return fallback(result)
    payload = {"assessment": result["priority"]["ranked_domains"],
               "red_flags": result["red_flags"], "context_notes": result["context"]["notes"],
               "evidence": chunks_by_domain}
    try:
        r = client.chat.completions.create(
            model=model, temperature=0.1, max_tokens=700,
            messages=[{"role": "system", "content": SYSTEM},
                      {"role": "user", "content": json.dumps(payload)}])
        data = json.loads(r.choices[0].message.content.strip().strip("`").removeprefix("json"))
        text_all = json.dumps(data)
        if BANNED.search(text_all):
            return fallback(result)
        for item in data["per_domain"]:
            if not set(item.get("cites", [])) <= allowed:
                return fallback(result)
        data["mode"] = "llm_grounded"
        return data
    except Exception:
        return fallback(result)
