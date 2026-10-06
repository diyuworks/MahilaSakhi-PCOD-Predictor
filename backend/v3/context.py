"""Context gate: decides WHICH domains/signals apply before anything else runs.
Principle: absence of a period must never stop the app understanding the user."""
from typing import Any, Dict, List

ALWAYS = ["androgen", "metabolic", "mental", "sleep"]


def derive_context(p: Dict[str, Any]) -> Dict[str, Any]:
    uterus = p.get("uterus", "unsure")            # yes | no | unsure
    ovaries = p.get("ovaries")                    # both | one | neither | unsure | None
    meno = p.get("menopause_status", "none")      # none|perimenopause|natural|surgical|unknown
    goal = p.get("reproductive_goal", "prefer_not_to_say")
    hormonal = bool(p.get("on_hormonal_contraception")) or bool(p.get("on_hrt"))
    follow_ups: List[str] = []
    notes: List[str] = []

    if uterus == "unsure":
        follow_ups.append("confirm_uterus_status")
    if uterus == "no" and ovaries in (None, "unsure"):
        follow_ups.append("confirm_ovary_status")

    if ovaries == "neither":
        ovarian = "absent"
    elif ovaries in ("both", "one"):
        ovarian = "present"
    elif uterus == "yes":
        ovarian = "presumed_present"
    else:
        ovarian = "unknown"

    effective_meno = meno
    if ovarian == "absent" and meno in ("none", "unknown"):
        effective_meno = "surgical"
        notes.append("Both ovaries removed: this is a different hormonal context "
                     "(surgical menopause pathway).")

    if uterus == "no":
        cycle = "not_applicable"
        notes.append("Cycle tracking isn't applicable to your current situation. "
                     "We'll focus on the health domains that are relevant to you.")
    elif uterus == "unsure":
        cycle = "uncertain"
    elif effective_meno in ("natural", "surgical"):
        cycle = "not_applicable"
    elif hormonal:
        cycle = "unreliable_on_hormones"
        notes.append("Hormonal medication can mask your natural cycle, so bleeding "
                     "is a weak signal for you.")
    else:
        cycle = "applicable"

    domains = list(ALWAYS)
    if cycle in ("applicable", "unreliable_on_hormones"):
        domains.insert(0, "menstrual")
    if (uterus == "yes" and ovarian != "absent" and effective_meno in ("none", "perimenopause")
            and goal in ("trying", "later", "fertility_concerns")):
        domains.append("fertility")
    if effective_meno in ("perimenopause", "natural", "surgical") or (p.get("age") or 0) >= 45:
        domains.append("menopause_bone_cv")

    return {
        "uterus": uterus, "ovarian_status": ovarian, "effective_menopause": effective_meno,
        "cycle_tracking": cycle, "applicable_domains": domains,
        "follow_up_questions": follow_ups, "notes": notes,
        "postmenopausal": effective_meno in ("natural", "surgical"),
    }
