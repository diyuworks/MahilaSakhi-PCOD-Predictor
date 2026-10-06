# TASK FOR AGENT: Upgrade MahilaSakhi into a context-aware PCOS care-navigation product (v3)

## STEP 0: SETUP (do this before anything else)
You were given two things: (a) the original MahilaSakhi project, and (b) `mahilasakhi_v3_starter.zip` (top-level folder `pkg/`).
1. Extract the starter zip. Copy its contents into the ROOT of the original project, merging folders:
   `pkg/backend/v3/` -> `backend/v3/`, `pkg/backend/knowledge/` -> `backend/knowledge/`, `pkg/ml/` -> `ml/`,
   `pkg/tests/` -> `tests/`, `pkg/requirements.txt` -> merge into `backend/requirements.txt` (union, no duplicates),
   `pkg/sample_request.json` and `pkg/README.md` -> project root (rename README to `README_v3_starter.md` if a README exists).
   Do NOT overwrite existing `backend/app.py` or `backend/rule_engine.py`; edit them in place later (WP1).
2. Confirm these exist: `backend/app.py`, `backend/rule_engine.py`, `frontend/src/App.js`,
   `dataset/PCOS_data_without_infertility.xlsx`, and `model/pcod_model_v2.pkl`, `model/pcod_features_v2.pkl`,
   `model/thyroid_model_v1.pkl`, `model/thyroid_features_v1.pkl`, `model/thyroid_defaults_v1.pkl`.
   If the `model/` folder is missing, STOP and ask me for it. Do not invent or retrain silently to replace it.
3. Never commit or read `node_modules/`, `frontend/build/`, `__pycache__/`, or `*.bak` files. Run `npm install` yourself.
   Create `.gitignore` entries for them if missing. API keys come only from env vars (`NVIDIA_API_KEY`); never hardcode.
4. Run `pip install -r backend/requirements.txt` then `python -m pytest tests -q`. All 11 starter tests must pass
   before you start WP1. If they fail, fix the merge first.

## HOW TO WORK
- Work package by package (WP1 -> WP7). After EACH package: run tests, then post a short summary (what changed, files
  touched, tests run, open TODOs) and WAIT for my "continue" before starting the next one.
- Make small commits with clear messages. Don't refactor unrelated code.
- If a requirement is ambiguous or clinically uncertain, ask me or leave a clearly marked `TODO(clinician)`; don't guess.
- You may draft content for `backend/knowledge/chunks.json` from real sources, but ONLY a human sets `"verified": true`.
  You must never set `verified` to true yourself.

---

You are working in an existing repo: `backend/` (Flask: `app.py`, `rule_engine.py`), `frontend/` (React, `src/App.js`),
`dataset/PCOS_data_without_infertility.xlsx`, and `model/*.pkl` (RF PCOS model, thyroid model).
A starter v3 engine already exists in `backend/v3/` with tests in `tests/test_personas.py` and `ml/ablation.py`.
Read all of it first. Do NOT rewrite it from scratch; extend it.

## Product definition
Not a diagnosis app, period tracker, diet app, or generic chatbot. It answers:
"Given MY symptoms, reproductive context, health info, goals and concerns, what should I focus on next?"
Pipeline: onboarding context gate -> multidimensional profile (severity + impact) -> domain scoring ->
priority engine -> care pathway (clinician type, tests to ask about, questions for doctor, monitoring) ->
guideline retrieval -> LLM *explanation only*.

## Hard rules (never violate)
1. The LLM never diagnoses, prescribes, names medicines/doses, or invents medical facts. It may only rephrase the
   structured result + retrieved VERIFIED chunks from `backend/knowledge/chunks.json`, citing chunk ids. If there is no
   verified evidence or the output fails validation, fall back to the deterministic template (already implemented).
2. Do NOT fabricate guideline text, citations, or clinical thresholds. Leave `TODO` / `verified:false` where you cannot
   verify. Fill `chunks.json` only with text you can fetch from the real source (International Evidence-based Guideline
   for PCOS 2023, Teede et al.) and mark `locator` precisely. A human will flip `verified` to true.
3. Context gate comes first. If uterus = no or user is postmenopausal, never show period-tracking UI/advice.
   If uterus = no, ask ovary status. Both ovaries removed => surgical-menopause pathway. Absence of a period must never
   imply menopause (see persona tests).
4. New or rapidly worsening androgen symptoms (especially post-menopause) => recommend medical evaluation; never attribute to PCOS.
5. Validated instruments only (PHQ-9, GAD-7, optional ISI/Ferriman-Gallwey). Cite them. If PHQ-9 item 9 > 0, show the
   safety message immediately (India: Tele-MANAS 14416). Never invent scales.
6. Remove silent mean-imputation from legacy `/predict`. Use `backend/v3/clinical_mode.py`: the RF runs only when
   ultrasound inputs exist, and is described as "resembles PCOS-positive records in a clinical dataset", never as a diagnosis.
7. Health data is sensitive (India DPDP Act 2023): explicit consent screen, no logging of raw health inputs, no
   third-party analytics, API keys only from env vars, "delete my data" endpoint.
8. All `npm`/`pip` additions must be listed in `requirements.txt` / `package.json`.

## Work packages (do in order, commit after each, keep all tests green)
**WP1 Backend wiring.** Register `v3.api.bp` in `app.py`; set `v3.api._llm_client = client` (existing NVIDIA/OpenAI client).
Replace the body of legacy `/predict` to call `predict_clinical`. Fix `screen_menopause` in `/screen` so it is skipped when
the context gate says cycle tracking is not applicable. Lower the legacy chat temperature to 0.2 and make `/chat`
require `context` from the v3 result; refuse dose/diagnosis questions with a redirect to a clinician.
Add `/v3/delete` (user data removal) and request validation (pydantic) returning 400 with clear errors.

**WP2 Onboarding wizard (React).** Step 1 consent. Step 2 context gate with branching: Uterus (Yes/No/Not sure) ->
if No: Ovaries (Both/One/Neither/Not sure) -> menopause status (none/perimenopause/natural/surgical, age at menopause) ->
hormonal contraception, HRT, pregnancy/postpartum -> reproductive goal (not interested/later/trying/fertility concerns/
prefer not to say). Show the exact banner text from `context.notes`. Step 3 symptom severity cards using the scales in
`config.py` plus "How much does this affect your daily life or confidence?" (4 options) per symptom. Step 4 metabolic
(height/weight -> BMI, waist optional, family history, existing labs optional). Step 5 wellbeing (PHQ-9, GAD-7 as optional
modules, sleep). Step 6 "What bothers you the most right now?" (the options in `CONCERN_TO_DOMAIN`). Only show menstrual
questions when `cycle_tracking` is applicable/unreliable. Mobile-first, plain language, English + Hindi toggle.

**WP3 "My PCOS Care Map" dashboard.** Domain cards (Hormonal/Androgen, Menstrual (only if applicable), Metabolic,
Fertility (only if applicable), Mental wellbeing, Sleep, Menopause/Bone/Cardiovascular (only if applicable)) ranked by
priority with tier chips (Focus now / Monitor / Maintain). Each card: why it is ranked here (list the inputs that drove it),
who to see, tests to ask about, questions for your doctor, what to monitor. Red-flag banner at top (urgency today / this
week / 4-6 weeks). Chart.js radar or bars for severity. Footer disclaimer. "Not applicable to you" section explaining
hidden domains kindly.

**WP4 Visit-prep PDF.** One-page export (server-side, reportlab or weasyprint): profile summary, severity timeline,
top 3 focus areas, questions to ask, tests to discuss, red flags, disclaimer, generated date.

**WP5 Knowledge base + grounded explanations.** Build `chunks.json` from the real 2023 guideline (and Rotterdam criteria,
Ferriman-Gallwey, PHQ-9, GAD-7 originals) with exact locators. Add `scripts/verify_chunks.py` that prints each chunk
next to its source URL for human verification. Keep retrieval filtered by domain tags. Add a faithfulness check: every
claim in LLM output must cite an id present in the retrieved set (already enforced in `explain.py`; add tests).

**WP6 ML honesty + evaluation.** Run `ml/ablation.py` and put the results table in README under "Model limitations".
Retrain the RF as a clinical-mode model inside an sklearn Pipeline (median imputer inside CV), stratified CV, calibrated
probabilities (isotonic/Platt), report AUC/precision/recall/Brier + calibration plot, save as `model/pcod_clinical_v3.pkl`.
Never quote the old 98% figure. Save results to `docs/model_card.md` (data source, size 541/177 positive, single-source
limitations, intended use, out-of-scope use).

**WP7 Tests & CI.** Keep all 11 persona tests passing. Add at least 25 more personas (hysterectomy + one ovary, perimenopause
on HRT, trying to conceive, lean PCOS with severe acne, postpartum, prefer-not-to-say goals, etc.) each with expected domains
and urgency written BEFORE implementation. Add API tests, LLM red-team tests (asks for drug dose, asks "do I have PCOS?",
prompt injection in free text) that must return the template/redirect. GitHub Actions: `pytest` + `npm test` + lint.

## Definition of done
- `pytest` green; `npm run build` green; app runs end to end: onboarding -> care map -> PDF.
- Hysterectomy persona never sees period questions/advice; postmenopausal rapid-androgen persona gets the "see a clinician,
  don't assume PCOS" flag; no screen anywhere shows a bare PCOS YES/NO.
- README with architecture diagram, safety design, limitations, and how to verify knowledge chunks.
- Final summary listing every assumption, every TODO needing human/clinician verification, and any rule you were unsure about.
