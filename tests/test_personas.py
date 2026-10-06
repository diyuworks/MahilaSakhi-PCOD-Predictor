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


# ==============================================================================
# WP7 EXPANDED PERSONA SUITE (26 ADDITIONAL CLINICAL PERSONAS)
# ==============================================================================

def test_persona_12_hysterectomy_one_ovary_retained():
    """Hysterectomy with one ovary retained: no menstrual, no fertility, ovarian status present."""
    r = assess_profile(P(age=36, context=dict(uterus="no", ovaries="one"),
                         symptoms=dict(acne="persistent")))
    assert "menstrual" not in doms(r)
    assert "fertility" not in doms(r)
    assert r["context"]["ovarian_status"] == "present"
    assert r["context"]["cycle_tracking"] == "not_applicable"
    assert "menopause_bone_cv" not in doms(r)  # Premenopausal ovary present


def test_persona_13_perimenopause_on_hrt():
    """Perimenopausal individual on HRT: bleeding signal unreliable, menopause domain included."""
    r = assess_profile(P(age=49, context=dict(uterus="yes", menopause_status="perimenopause", on_hrt=True),
                         symptoms=dict(menstrual="frequently_irregular", vasomotor_0_4=2)))
    assert r["context"]["cycle_tracking"] == "unreliable_on_hormones"
    assert "menopause_bone_cv" in doms(r)
    assert "menstrual" in doms(r)


def test_persona_14_trying_to_conceive_reproductive_priority():
    """Actively trying to conceive: fertility domain added with high severity."""
    r = assess_profile(P(age=29, context=dict(uterus="yes"), reproductive_goal="trying",
                         main_concern="fertility"))
    assert "fertility" in doms(r)
    fertility_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "fertility"][0]
    assert fertility_d["severity"] == 3
    assert fertility_d["tier"] in ("focus_now", "monitor")


def test_persona_15_lean_pcos_severe_cystic_acne():
    """Lean BMI individual with severe acne: androgen prioritized over metabolic."""
    r = assess_profile(P(age=21, context=dict(uterus="yes"), main_concern="acne",
                         symptoms=dict(acne="severe", facial_hair="mild"),
                         metabolic=dict(bmi=19.5), impact=dict(acne="a_lot")))
    assert doms(r)[0] == "androgen"
    metabolic_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "metabolic"][0]
    assert metabolic_d["severity"] == 0  # No metabolic warning flags


def test_persona_16_postpartum_amenorrhea_not_menopause():
    """Postpartum individual with amenorrhea: must not be classified as menopause."""
    r = assess_profile(P(age=27, context=dict(uterus="yes", pregnant_or_postpartum=True),
                         months_since_last_period=4))
    assert "menopause_bone_cv" not in doms(r)
    assert r["context"]["effective_menopause"] == "none"


def test_persona_17_prefer_not_to_say_reproductive_goal():
    """Prefer not to say reproductive goal: fertility domain is omitted."""
    r = assess_profile(P(age=31, context=dict(uterus="yes"), reproductive_goal="prefer_not_to_say"))
    assert "fertility" not in doms(r)


def test_persona_18_acute_severe_pelvic_pain_escalation():
    """Sudden severe pain triggers immediate today urgency red flag."""
    r = assess_profile(P(age=25, context=dict(uterus="yes"),
                         red_flags=dict(sudden_severe_pain=True)))
    assert any(x["code"] == "acute_symptoms" for x in r["red_flags"])
    assert r["priority"]["overall_urgency"] == "today"


def test_persona_19_heavy_bleeding_soaking_through_escalation():
    """Soaking through pads bleeding triggers emergency today triage."""
    r = assess_profile(P(age=32, context=dict(uterus="yes"),
                         red_flags=dict(heavy_bleeding_soaking_through=True)))
    assert any(x["code"] == "acute_symptoms" for x in r["red_flags"])
    assert r["priority"]["overall_urgency"] == "today"


def test_persona_20_severe_insomnia_sleep_focus():
    """Severe sleep disturbance is captured in sleep domain severity."""
    r = assess_profile(P(age=30, context=dict(uterus="yes"), main_concern="sleep",
                         wellbeing=dict(sleep_problem_0_4=4), impact=dict(sleep="a_lot")))
    sleep_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "sleep"][0]
    assert sleep_d["severity"] == 4
    assert sleep_d["tier"] == "focus_now"


def test_persona_21_high_cardiovascular_metabolic_risk_asian_cutoffs():
    """Asian BMI >= 25 and waist >= 80cm trigger metabolic risk escalation."""
    r = assess_profile(P(age=35, context=dict(uterus="yes"),
                         metabolic=dict(bmi=26.5, waist_cm=86, family_history_diabetes=True,
                                        known_abnormal_glucose=True)))
    metabolic_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "metabolic"][0]
    assert metabolic_d["severity"] == 4
    assert "bmi_in_obese_range_asian_cutoff" in metabolic_d["flags"]
    assert "waist_above_asian_cutoff" in metabolic_d["flags"]


def test_persona_22_severe_anxiety_gad7_distress():
    """GAD-7 score in severe range assigns maximum severity to mental domain."""
    r = assess_profile(P(age=23, context=dict(uterus="yes"),
                         wellbeing=dict(gad7_total=18, stress_0_4=4),
                         impact=dict(mental="a_lot")))
    mental_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "mental"][0]
    assert mental_d["severity"] == 4
    assert mental_d["tier"] == "focus_now"


def test_persona_23_prolonged_amenorrhea_3_months_flag():
    """Absence of periods for 3+ months triggers 4-6 weeks clinician evaluation flag."""
    r = assess_profile(P(age=26, context=dict(uterus="yes"), months_since_last_period=4,
                         possibly_pregnant=False))
    assert any(x["code"] == "prolonged_amenorrhea" for x in r["red_flags"])
    flag = [x for x in r["red_flags"] if x["code"] == "prolonged_amenorrhea"][0]
    assert flag["urgency"] == "4_6_weeks"


def test_persona_24_unsure_uterus_prompts_followup():
    """Uncertain uterus status triggers follow-up and uncertain cycle tracking."""
    r = assess_profile(P(age=33, context=dict(uterus="unsure")))
    assert r["context"]["cycle_tracking"] == "uncertain"
    assert "confirm_uterus_status" in r["context"]["follow_up_questions"]


def test_persona_25_age_45_preventive_menopause_bone_cv_addition():
    """Age >= 45 automatically includes menopause/bone/cardiovascular domain for prevention."""
    r = assess_profile(P(age=47, context=dict(uterus="yes", menopause_status="none")))
    assert "menopause_bone_cv" in doms(r)


def test_persona_26_rapid_onset_androgen_red_flag_premenopausal():
    """Rapid onset androgen symptoms trigger urgent review, not assumed PCOS."""
    r = assess_profile(P(age=29, context=dict(uterus="yes"),
                         red_flags=dict(rapid_onset_androgen_symptoms=True)))
    flag = [x for x in r["red_flags"] if x["code"] == "rapid_androgen_change"][0]
    assert flag["urgency"] == "this_week"
    assert "shouldn't assume PCOS" in flag["message"]


def test_persona_27_progressive_scalp_hair_loss():
    """Progressive hair loss flags rapid androgen change."""
    r = assess_profile(P(age=31, context=dict(uterus="yes"),
                         symptoms=dict(hair_loss="progressive")))
    assert any(x["code"] == "rapid_androgen_change" for x in r["red_flags"])


def test_persona_28_body_image_distress_drives_mental():
    """Severe body image distress reflects in mental domain severity."""
    r = assess_profile(P(age=25, context=dict(uterus="yes"),
                         wellbeing=dict(body_image_distress_0_4=4)))
    mental_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "mental"][0]
    assert mental_d["severity"] == 4


def test_persona_29_surgical_menopause_at_young_age():
    """Bilateral oophorectomy in a 29-year-old is classified as surgical menopause."""
    r = assess_profile(P(age=29, context=dict(uterus="no", ovaries="neither")))
    assert r["context"]["effective_menopause"] == "surgical"
    assert "menopause_bone_cv" in doms(r)


def test_persona_30_fertility_concerns_without_immediate_trying():
    """Fertility concerns goal assigns level 2 severity to fertility domain."""
    r = assess_profile(P(age=26, context=dict(uterus="yes"),
                         reproductive_goal="fertility_concerns"))
    fert_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "fertility"][0]
    assert fert_d["severity"] == 2


def test_persona_31_fertility_goal_later():
    """Reproductive goal 'later' assigns level 1 baseline severity."""
    r = assess_profile(P(age=24, context=dict(uterus="yes"), reproductive_goal="later"))
    fert_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "fertility"][0]
    assert fert_d["severity"] == 1


def test_persona_32_hormonal_contraception_downweights_menstrual_score():
    """Bleeding score on hormonal contraception is multiplied by 0.6 factor."""
    r1 = assess_profile(P(age=25, context=dict(uterus="yes", on_hormonal_contraception=False),
                          symptoms=dict(menstrual="frequently_irregular")))
    r2 = assess_profile(P(age=25, context=dict(uterus="yes", on_hormonal_contraception=True),
                          symptoms=dict(menstrual="frequently_irregular")))
    score_natural = [d["score"] for d in r1["priority"]["ranked_domains"] if d["domain"] == "menstrual"][0]
    score_hormonal = [d["score"] for d in r2["priority"]["ranked_domains"] if d["domain"] == "menstrual"][0]
    assert score_hormonal < score_natural


def test_persona_33_combined_depression_and_anxiety():
    """Combined moderate depression and anxiety scores reflected in mental domain."""
    r = assess_profile(P(age=27, context=dict(uterus="yes"),
                         wellbeing=dict(phq9_total=12, gad7_total=11)))
    mental_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "mental"][0]
    assert mental_d["severity"] >= 2


def test_persona_34_normal_weight_acanthosis_nigricans():
    """Normal BMI but skin darkening and rapid weight gain are flagged in metabolic domain."""
    r = assess_profile(P(age=22, context=dict(uterus="yes"),
                         metabolic=dict(bmi=21.0, skin_darkening=True, rapid_weight_gain=True)))
    metabolic_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "metabolic"][0]
    assert metabolic_d["severity"] == 2
    assert "skin_darkening" in metabolic_d["flags"]
    assert "rapid_weight_gain" in metabolic_d["flags"]


def test_persona_35_vasomotor_symptoms_in_perimenopause():
    """Vasomotor symptoms in perimenopause scale menopause domain severity."""
    r = assess_profile(P(age=48, context=dict(uterus="yes", menopause_status="perimenopause"),
                         symptoms=dict(vasomotor_0_4=3)))
    meno_d = [d for d in r["priority"]["ranked_domains"] if d["domain"] == "menopause_bone_cv"][0]
    assert meno_d["severity"] == 3


def test_persona_36_multi_flag_highest_urgency_wins():
    """When both 'this_week' and 'today' flags exist, highest urgency ('today') wins."""
    r = assess_profile(P(age=55, context=dict(uterus="yes", menopause_status="natural"),
                         red_flags=dict(vaginal_bleeding=True, sudden_severe_pain=True)))
    assert r["priority"]["overall_urgency"] == "today"


def test_persona_37_chief_concern_boosts_domain_tier():
    """User's stated chief concern boosts domain score by +2."""
    r_no_concern = assess_profile(P(age=25, context=dict(uterus="yes"),
                                    wellbeing=dict(sleep_problem_0_4=1)))
    r_with_concern = assess_profile(P(age=25, context=dict(uterus="yes"),
                                      main_concern="sleep",
                                      wellbeing=dict(sleep_problem_0_4=1)))
    s1 = [d["score"] for d in r_no_concern["priority"]["ranked_domains"] if d["domain"] == "sleep"][0]
    s2 = [d["score"] for d in r_with_concern["priority"]["ranked_domains"] if d["domain"] == "sleep"][0]
    assert s2 == s1 + 2

