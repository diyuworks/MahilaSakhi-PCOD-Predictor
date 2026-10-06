import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from v3.api import assess_profile

def P(**kw): return kw
def doms(r): return [d["domain"] for d in r["priority"]["ranked_domains"]]

def test_hysterectomy_ovaries_intact_no_menstrual():
    r = assess_profile(P(age=38, context=dict(uterus="no", ovaries="both"), main_concern="irregular_periods",
                         symptoms=dict(facial_hair="moderate"), impact=dict(facial_hair="a_lot")))
    assert "menstrual" not in doms(r) and "fertility" not in doms(r)
    assert r["context"]["cycle_tracking"] == "not_applicable"
    assert any("Cycle tracking isn't applicable" in n for n in r["context"]["notes"])
    assert r["priority"]["ranked_domains"][0]["domain"] == "androgen"
    assert r["priority"]["notes"]            # explains why the concern was re-routed

def test_hysterectomy_does_not_trigger_menopause_by_amenorrhea():
    r = assess_profile(P(age=34, context=dict(uterus="no", ovaries="both")))
    assert "menopause_bone_cv" not in doms(r)

def test_both_ovaries_removed_is_surgical_menopause():
    r = assess_profile(P(age=40, context=dict(uterus="no", ovaries="neither")))
    assert r["context"]["effective_menopause"] == "surgical"
    assert "menopause_bone_cv" in doms(r)

def test_unsure_ovaries_asks_follow_up():
    r = assess_profile(P(age=40, context=dict(uterus="no", ovaries="unsure")))
    assert "confirm_ovary_status" in r["context"]["follow_ups"] if "follow_ups" in r["context"] else \
        "confirm_ovary_status" in r["context"]["follow_up_questions"]

def test_postmenopausal_rapid_hair_growth_escalates_not_blames_pcos():
    r = assess_profile(P(age=58, context=dict(uterus="yes", menopause_status="natural"),
                         symptoms=dict(facial_hair="rapidly_worsening")))
    f = [x for x in r["red_flags"] if x["code"] == "rapid_androgen_change"][0]
    assert f["urgency"] == "this_week" and "shouldn't assume PCOS" in f["message"]
    assert r["priority"]["overall_urgency"] == "this_week"

def test_postmenopausal_bleeding_flag():
    r = assess_profile(P(age=55, context=dict(uterus="yes", menopause_status="natural"),
                         red_flags=dict(vaginal_bleeding=True)))
    assert any(x["code"] == "postmenopausal_bleeding" for x in r["red_flags"])

def test_lean_severe_hirsutism_prioritises_androgen():
    r = assess_profile(P(age=24, context=dict(uterus="yes"), main_concern="facial_hair",
                         symptoms=dict(facial_hair="severe", menstrual="regular"),
                         impact=dict(facial_hair="a_lot"), metabolic=dict(bmi=20)))
    assert doms(r)[0] == "androgen"

def test_on_hormonal_contraception_menstrual_downweighted():
    r = assess_profile(P(age=26, context=dict(uterus="yes", on_hormonal_contraception=True),
                         symptoms=dict(menstrual="no_periods")))
    assert r["context"]["cycle_tracking"] == "unreliable_on_hormones"

def test_safety_flag_phq9_item9():
    r = assess_profile(P(age=22, context=dict(uterus="yes"), wellbeing=dict(phq9_total=14, phq9_item9=1)))
    assert r["priority"]["overall_urgency"] == "today"

def test_llm_never_free_generates_without_verified_chunks():
    r = assess_profile(P(age=30, context=dict(uterus="yes")))
    class Boom:  # would explode if called
        chat = None
    from v3.explain import explain
    assert explain(r, {}, client=Boom())["mode"] == "template"

def test_banned_content_triggers_fallback():
    from v3.explain import explain
    r = assess_profile(P(age=30, context=dict(uterus="yes")))
    class R:  # fake client returning a dose
        class chat:
            class completions:
                @staticmethod
                def create(**k):
                    import types
                    m = types.SimpleNamespace(content='{"summary":"take metformin 500 mg","per_domain":[]}')
                    return types.SimpleNamespace(choices=[types.SimpleNamespace(message=m)])
    out = explain(r, {"androgen": [{"id": "X"}]}, client=R())
    assert out["mode"] == "template"
