"""Static care-navigation content per domain. This is routing/education, NOT prescribing.
TODO(clinician review): every list below must be verified against knowledge/chunks.json sources.
No drug names or doses anywhere in this file by design."""

PATHWAYS = {
    "androgen": {
        "clinicians": ["Dermatologist", "Gynecologist", "Endocrinologist"],
        "tests_to_ask_about": ["Whether hormone blood tests are appropriate for you",
                               "Whether other causes of the symptoms should be excluded"],
        "questions_for_doctor": ["Could something other than PCOS explain my symptoms?",
                                 "Which treatment options exist for my main concern and what are the trade-offs?",
                                 "How long before we judge whether a treatment is working?"],
        "monitor": ["Photo/date log of changes", "How fast symptoms are changing"],
        "kb_tags": ["androgen"]},
    "menstrual": {
        "clinicians": ["Gynecologist"],
        "tests_to_ask_about": ["Whether a pregnancy test, hormone tests or ultrasound are appropriate"],
        "questions_for_doctor": ["What could explain my cycle pattern?",
                                 "Do I need protection for my uterine lining if I have few periods?",
                                 "Are my options different if I want / don't want pregnancy?"],
        "monitor": ["Cycle start dates", "Bleeding duration and heaviness"],
        "kb_tags": ["menstrual"]},
    "metabolic": {
        "clinicians": ["Endocrinologist", "Physician", "Registered dietitian"],
        "tests_to_ask_about": ["Blood glucose screening", "Lipid profile", "Blood pressure check"],
        "questions_for_doctor": ["How often should I be screened for diabetes and cholesterol?",
                                 "What lifestyle changes matter most for me, given my profile?"],
        "monitor": ["Waist measurement", "Activity minutes", "Energy and cravings"],
        "kb_tags": ["metabolic", "lifestyle"]},
    "fertility": {
        "clinicians": ["Gynecologist", "Fertility specialist"],
        "tests_to_ask_about": ["Whether and when a fertility evaluation is appropriate for you"],
        "questions_for_doctor": ["How long should we try before getting evaluated, given my age?",
                                 "What should I optimise before conceiving?"],
        "monitor": ["Cycle/ovulation signs if applicable"],
        "kb_tags": ["fertility"]},
    "mental": {
        "clinicians": ["Psychologist / counsellor", "Psychiatrist", "Physician"],
        "tests_to_ask_about": [],
        "questions_for_doctor": ["Could my mood or stress be linked to my health condition?",
                                 "What support options are available to me?"],
        "monitor": ["Mood and stress check-ins every 2 weeks"],
        "kb_tags": ["mental"]},
    "sleep": {
        "clinicians": ["Physician", "Sleep clinic if persistent"],
        "tests_to_ask_about": ["Whether sleep apnoea screening is relevant"],
        "questions_for_doctor": ["Could my sleep problems be related to my condition or medicines?"],
        "monitor": ["Sleep and wake times", "Daytime sleepiness"],
        "kb_tags": ["sleep"]},
    "menopause_bone_cv": {
        "clinicians": ["Gynecologist (menopause)", "Endocrinologist", "Physician"],
        "tests_to_ask_about": ["Bone health assessment", "Cardiovascular risk review"],
        "questions_for_doctor": ["Which symptoms are menopause-related vs something else?",
                                 "What preventive checks should I have, and how often?",
                                 "Are menopause treatment options suitable for my history?"],
        "monitor": ["Hot flush frequency", "Bone/CV risk factors"],
        "kb_tags": ["menopause", "bone", "cardiovascular"]},
}
