"""Per-domain severity (0-4) + impact (0-3) + red flags. Pure functions, no I/O."""
from typing import Any, Dict, List, Optional
from . import config as C


def _idx(scale: str, value: Optional[str]) -> int:
    s = C.SEVERITY_SCALES[scale]
    return s.index(value) if value in s else 0


def _band(total: Optional[int], bands) -> int:
    if total is None:
        return 0
    for lo, hi, sev in bands:
        if lo <= total <= hi:
            return sev
    return 0


def _impact(v: Optional[str]) -> int:
    return C.IMPACT_SCALE.index(v) if v in C.IMPACT_SCALE else 0


def score_domains(profile: Dict[str, Any], ctx: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    s = profile.get("symptoms", {})
    imp = profile.get("impact", {})
    out: Dict[str, Dict[str, Any]] = {}

    if "androgen" in ctx["applicable_domains"]:
        items = {k: _idx(k, s.get(k)) for k in ("facial_hair", "acne", "hair_loss")}
        out["androgen"] = {"severity": max(items.values()), "items": items,
                           "impact": max(_impact(imp.get(k)) for k in items)}

    if "menstrual" in ctx["applicable_domains"]:
        sev = _idx("menstrual", s.get("menstrual"))
        out["menstrual"] = {"severity": sev, "impact": _impact(imp.get("menstrual")),
                            "reliable": ctx["cycle_tracking"] == "applicable"}

    if "metabolic" in ctx["applicable_domains"]:
        m = profile.get("metabolic", {})
        flags = []
        bmi = m.get("bmi")
        if bmi is not None and bmi >= C.BMI_OBESE_ASIAN:
            flags.append("bmi_in_obese_range_asian_cutoff")
        elif bmi is not None and bmi >= C.BMI_OVERWEIGHT_ASIAN:
            flags.append("bmi_in_overweight_range_asian_cutoff")
        if (m.get("waist_cm") or 0) >= C.WAIST_CM_HIGH_ASIAN_WOMEN:
            flags.append("waist_above_asian_cutoff")
        for k in ("family_history_diabetes", "known_abnormal_glucose", "rapid_weight_gain",
                  "known_abnormal_lipids", "skin_darkening"):
            if m.get(k):
                flags.append(k)
        out["metabolic"] = {"severity": min(4, len(flags)), "flags": flags,
                            "impact": _impact(imp.get("metabolic"))}

    if "mental" in ctx["applicable_domains"]:
        w = profile.get("wellbeing", {})
        sev = max(_band(w.get("phq9_total"), C.PHQ9_BANDS),
                  _band(w.get("gad7_total"), C.GAD7_BANDS),
                  min(4, int(w.get("stress_0_4", 0) or 0)),
                  min(4, int(w.get("body_image_distress_0_4", 0) or 0)))
        out["mental"] = {"severity": sev, "impact": _impact(imp.get("mental"))}

    if "sleep" in ctx["applicable_domains"]:
        out["sleep"] = {"severity": min(4, int(profile.get("wellbeing", {}).get("sleep_problem_0_4", 0) or 0)),
                        "impact": _impact(imp.get("sleep"))}

    if "fertility" in ctx["applicable_domains"]:
        g = profile.get("reproductive_goal")
        out["fertility"] = {"severity": 3 if g == "trying" else 2 if g == "fertility_concerns" else 1,
                            "impact": _impact(imp.get("fertility"))}

    if "menopause_bone_cv" in ctx["applicable_domains"]:
        base = 2 if ctx["postmenopausal"] else 1   # preventive baseline, not a symptom
        vaso = min(4, int(s.get("vasomotor_0_4", 0) or 0))
        out["menopause_bone_cv"] = {"severity": max(base, vaso), "impact": _impact(imp.get("menopause_bone_cv"))}
    return out


def detect_red_flags(profile: Dict[str, Any], ctx: Dict[str, Any]) -> List[Dict[str, str]]:
    s, f = profile.get("symptoms", {}), profile.get("red_flags", {})
    flags: List[Dict[str, str]] = []
    if s.get("facial_hair") == "rapidly_worsening" or s.get("hair_loss") == "progressive" \
            or f.get("rapid_onset_androgen_symptoms"):
        urgent = ctx["postmenopausal"] or bool(f.get("rapid_onset_androgen_symptoms"))
        flags.append({"code": "rapid_androgen_change", "domain": "androgen",
                      "urgency": "this_week" if urgent else "4_6_weeks",
                      "message": "New or fast-worsening androgen-related symptoms need medical "
                                 "evaluation. We shouldn't assume PCOS is the cause."})
    if ctx["postmenopausal"] and f.get("vaginal_bleeding"):
        flags.append({"code": "postmenopausal_bleeding", "domain": "menopause_bone_cv",
                      "urgency": "this_week",
                      "message": "Bleeding after menopause should be checked by a clinician promptly."})
    if f.get("heavy_bleeding_soaking_through") or f.get("sudden_severe_pain"):
        flags.append({"code": "acute_symptoms", "domain": "menstrual", "urgency": "today",
                      "message": "These symptoms can need urgent care. Please contact a doctor "
                                 "or emergency service now."})
    if (profile.get("wellbeing", {}).get("phq9_item9") or 0) > 0:
        flags.append({"code": "safety_check", "domain": "mental", "urgency": "today",
                      "message": "You indicated thoughts of harming yourself. Please reach out to "
                                 "someone you trust or a crisis helpline (India: Tele-MANAS 14416) "
                                 "right now."})
    if ctx["cycle_tracking"] == "applicable" and (profile.get("months_since_last_period") or 0) >= 3 \
            and not profile.get("possibly_pregnant"):
        flags.append({"code": "prolonged_amenorrhea", "domain": "menstrual", "urgency": "4_6_weeks",
                      "message": "No period for 3+ months is worth discussing with a clinician."})
    return flags
