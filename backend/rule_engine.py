"""
Rule-based screening for menopause and endometriosis.

WHY RULES, NOT ML: thorough research (see project docs) found no public,
adequately-sized dataset for either condition — the real published studies
use private institutional cohorts (18K-190K patients for menopause) or
proprietary/genetic data (endometriosis) that aren't accessible for this
project. Training a classifier on insufficient data would repeat the exact
methodological flaw this project was rebuilt to fix (see PCOS model notes).

Instead, both conditions use transparent, literature-backed clinical rules.
This is not a downgrade — real clinical practice itself uses staged rule-based
reasoning for these conditions (e.g. menopause is *defined* by age + 12 months
without a period, not inferred from a trained model).

Each function returns:
{
  "likelihood": "low" | "moderate" | "high",
  "reasoning": [list of plain-language reasons the rule fired],
}
"""


def screen_menopause(age: int, cycle_status: str, months_since_last_period: int = None,
                      hot_flashes: bool = False, night_sweats: bool = False,
                      amh: float = None) -> dict:
    """
    cycle_status: "regular" | "irregular" | "absent"
    months_since_last_period: only relevant if cycle_status == "absent"
    amh: optional, ng/mL — declines with age, low AMH (<1.0) suggests
         diminished ovarian reserve, relevant to perimenopause/menopause
    """
    reasoning = []
    score = 0

    # Core clinical definition: 12+ months without a period = menopause
    if cycle_status == "absent" and months_since_last_period is not None:
        if months_since_last_period >= 12:
            reasoning.append(
                f"No period for {months_since_last_period} months — this meets "
                "the clinical definition of menopause (12+ consecutive months "
                "without a period)."
            )
            score += 3
        elif months_since_last_period >= 3:
            reasoning.append(
                f"No period for {months_since_last_period} months — this can "
                "be part of the menopause transition (perimenopause)."
            )
            score += 2

    if cycle_status == "irregular" and age >= 40:
        reasoning.append(
            "Irregular cycles after age 40 are commonly part of the natural "
            "menopause transition (perimenopause)."
        )
        score += 1

    if age >= 45:
        reasoning.append(f"Age {age} is within the typical range for natural menopause (45-55).")
        score += 1
    elif age >= 40:
        reasoning.append(f"Age {age} is within the typical range for perimenopause (40s).")
        score += 0.5

    if hot_flashes or night_sweats:
        reasoning.append(
            "Hot flashes / night sweats are classic vasomotor symptoms of "
            "the menopause transition."
        )
        score += 1

    if amh is not None and amh < 1.0:
        reasoning.append(
            f"AMH level ({amh} ng/mL) is low, consistent with declining "
            "ovarian reserve seen in perimenopause/menopause."
        )
        score += 1

    if score >= 3:
        likelihood = "high"
    elif score >= 1.5:
        likelihood = "moderate"
    else:
        likelihood = "low"

    if not reasoning:
        reasoning.append("No strong menopause-related indicators found in your inputs.")

    return {"likelihood": likelihood, "reasoning": reasoning}


def screen_endometriosis(severe_period_pain: bool = False, pain_during_intercourse: bool = False,
                          chronic_pelvic_pain: bool = False, heavy_bleeding: bool = False,
                          fertility_difficulty: bool = False, pain_worsens_over_time: bool = False) -> dict:
    """
    All inputs are simple yes/no symptom questions — these are the
    literature-recognized symptom correlates of endometriosis. Note: there is
    NO reliable symptom-only diagnostic for endometriosis (real diagnosis
    requires laparoscopy) — this flags risk for specialist referral, it does
    not and cannot diagnose.
    """
    reasoning = []
    score = 0

    if severe_period_pain:
        reasoning.append(
            "Severe or disabling period pain is the most common symptom "
            "associated with endometriosis."
        )
        score += 2

    if pain_during_intercourse:
        reasoning.append("Pain during intercourse is a recognized endometriosis symptom.")
        score += 1.5

    if chronic_pelvic_pain:
        reasoning.append(
            "Pelvic pain that occurs outside of your period is a notable "
            "endometriosis indicator."
        )
        score += 1.5

    if heavy_bleeding:
        reasoning.append("Heavy menstrual bleeding is commonly reported alongside endometriosis.")
        score += 1

    if fertility_difficulty:
        reasoning.append(
            "Difficulty conceiving is associated with endometriosis in some cases."
        )
        score += 1

    if pain_worsens_over_time:
        reasoning.append(
            "Pain that has progressively worsened over time is a pattern "
            "worth discussing with a specialist."
        )
        score += 1

    if score >= 4:
        likelihood = "high"
    elif score >= 2:
        likelihood = "moderate"
    else:
        likelihood = "low"

    if not reasoning:
        reasoning.append("No strong endometriosis-related symptom patterns found in your inputs.")

    return {"likelihood": likelihood, "reasoning": reasoning}
