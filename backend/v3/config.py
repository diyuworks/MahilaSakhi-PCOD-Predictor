"""All clinical thresholds live here so a clinician can review them in one place.
Every value is a SCREENING/ROUTING heuristic, never a diagnosis. Verify against the
cited source before shipping (see knowledge/chunks.json)."""

SEVERITY_SCALES = {
    "facial_hair": ["none", "mild", "moderate", "severe", "rapidly_worsening"],
    "acne": ["none", "occasional", "persistent", "severe", "scarring"],
    "hair_loss": ["none", "mild", "moderate", "severe", "progressive"],
    "menstrual": ["regular", "occasionally_irregular", "frequently_irregular",
                  "very_infrequent", "no_periods"],
}

IMPACT_SCALE = ["none", "a_little", "quite_a_bit", "a_lot"]  # 0..3

# Asian-Pacific cut-offs (WHO Asia-Pacific / IDF South-Asian). TODO(clinician): confirm.
BMI_OVERWEIGHT_ASIAN = 23.0
BMI_OBESE_ASIAN = 25.0
WAIST_CM_HIGH_ASIAN_WOMEN = 80.0

# PHQ-9 / GAD-7 standard severity bands (Kroenke 2001; Spitzer 2006).
PHQ9_BANDS = [(0, 4, 0), (5, 9, 1), (10, 14, 2), (15, 19, 3), (20, 27, 4)]
GAD7_BANDS = [(0, 4, 0), (5, 9, 1), (10, 14, 3), (15, 21, 4)]

CONCERN_TO_DOMAIN = {
    "facial_hair": "androgen", "acne": "androgen", "hair_loss": "androgen",
    "irregular_periods": "menstrual", "weight_metabolic": "metabolic",
    "fertility": "fertility", "mood_stress": "mental", "energy_fatigue": "metabolic",
    "menopause_symptoms": "menopause_bone_cv", "sleep": "sleep",
}

TIER_FOCUS_NOW = 4.0
TIER_MONITOR = 2.0
