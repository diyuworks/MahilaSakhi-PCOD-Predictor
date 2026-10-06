from typing import Any, Dict, List
from . import config as C

URGENCY_RANK = {"today": 3, "this_week": 2, "4_6_weeks": 1, "monitor": 0}


def prioritise(domains: Dict[str, Dict[str, Any]], red_flags: List[Dict[str, str]],
               main_concern: str, ctx: Dict[str, Any]) -> Dict[str, Any]:
    concern_domain = C.CONCERN_TO_DOMAIN.get(main_concern)
    flagged = {f["domain"] for f in red_flags}
    ranked, notes = [], []
    for name, d in domains.items():
        score = d["severity"] + 0.75 * d.get("impact", 0)
        if name == concern_domain:
            score += 2
        if name in flagged:
            score += 3
        if name == "menstrual" and not d.get("reliable", True):
            score *= 0.6   # bleeding is a weak signal on hormones
        tier = "focus_now" if score >= C.TIER_FOCUS_NOW else "monitor" if score >= C.TIER_MONITOR else "maintain"
        ranked.append({"domain": name, "score": round(score, 2), "tier": tier, **d})
    ranked.sort(key=lambda r: r["score"], reverse=True)
    if concern_domain and concern_domain not in domains:
        notes.append(f"Your main concern ('{main_concern}') maps to an area that doesn't apply to "
                     "your current situation; we've focused on what does.")
    top = max((URGENCY_RANK[f["urgency"]] for f in red_flags), default=0)
    urgency = {v: k for k, v in URGENCY_RANK.items()}[top]
    return {"ranked_domains": ranked, "overall_urgency": urgency, "notes": notes}
