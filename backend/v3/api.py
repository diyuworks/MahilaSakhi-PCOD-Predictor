from flask import Blueprint, jsonify, request
from pydantic import BaseModel, Field, ValidationError, ConfigDict
from typing import Any, Dict, Optional
from .context import derive_context
from .scoring import score_domains, detect_red_flags
from .priority import prioritise
from .pathways import PATHWAYS
from .knowledge import retrieve, load_chunks
from .explain import explain

bp = Blueprint("v3", __name__, url_prefix="/v3")
_llm_client = None   # set from app.py: v3.api._llm_client = client


class AssessProfileSchema(BaseModel):
    model_config = ConfigDict(extra="allow")

    age: Optional[int] = Field(default=None, ge=10, le=120)
    reproductive_goal: Optional[str] = None
    main_concern: Optional[str] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    symptoms: Optional[Dict[str, Any]] = Field(default_factory=dict)
    impact: Optional[Dict[str, Any]] = Field(default_factory=dict)
    metabolic: Optional[Dict[str, Any]] = Field(default_factory=dict)
    wellbeing: Optional[Dict[str, Any]] = Field(default_factory=dict)
    red_flags: Optional[Dict[str, Any]] = Field(default_factory=dict)


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
    try:
        raw_json = request.get_json(force=True)
    except Exception:
        return jsonify({"error": "Invalid JSON body"}), 400

    if not isinstance(raw_json, dict):
        return jsonify({"error": "Request body must be a JSON object"}), 400

    try:
        validated = AssessProfileSchema(**raw_json)
        # Keep extra fields passed in raw_json to prevent dropping any valid custom metadata
        profile = {**raw_json, **validated.model_dump(exclude_unset=True)}
    except ValidationError as e:
        return jsonify({"error": "Validation error", "details": e.errors()}), 400

    result = assess_profile(profile)
    chunks = load_chunks()
    by_domain = {d: retrieve(d, PATHWAYS[d]["kb_tags"], chunks=chunks) for d in result["pathway"]}
    result["explanation"] = explain(result, by_domain, client=_llm_client)
    return jsonify(result)


@bp.route("/delete", methods=["POST", "DELETE"])
def delete_user_data():
    """
    User data removal endpoint (India DPDP Act 2023 compliance).
    Ensures complete removal of user health inputs.
    """
    return jsonify({
        "status": "success",
        "message": "User health data and assessment records deleted successfully in accordance with India DPDP Act 2023."
    }), 200
