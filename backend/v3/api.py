from flask import Blueprint, jsonify, request
from .context import derive_context
from .scoring import score_domains, detect_red_flags
from .priority import prioritise
from .pathways import PATHWAYS
from .knowledge import retrieve, load_chunks
from .explain import explain

bp = Blueprint("v3", __name__, url_prefix="/v3")
_llm_client = None   # set from app.py: v3.api._llm_client = client


def assess_profile(profile: dict) -> dict:
    ctx = derive_context({**profile.get("context", {}), "age": profile.get("age"),
                          "reproductive_goal": profile.get("reproductive_goal")})
    domains = score_domains(profile, ctx)
    flags = detect_red_flags(profile, ctx)
    pri = prioritise(domains, flags, profile.get("main_concern", ""), ctx)
    pathway = {d["domain"]: PATHWAYS[d["domain"]] for d in pri["ranked_domains"]}
    return {"context": ctx, "red_flags": flags, "priority": pri, "pathway": pathway,
            "disclaimer": "Educational guidance to help you prepare for a clinician visit. Not a diagnosis."}


@bp.route("/assess", methods=["POST"])
def assess():
    profile = request.get_json(force=True) or {}
    result = assess_profile(profile)
    chunks = load_chunks()
    by_domain = {d: retrieve(d, PATHWAYS[d]["kb_tags"], chunks=chunks) for d in result["pathway"]}
    result["explanation"] = explain(result, by_domain, client=_llm_client)
    return jsonify(result)
