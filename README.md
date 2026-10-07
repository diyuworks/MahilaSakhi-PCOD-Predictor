# 🌸 MahilaSakhi v3 – Context-Aware PCOS Care-Navigation Platform

[![MahilaSakhi v3 CI Pipeline](https://github.com/diyuworks/MahilaSakhi-PCOD-Predictor/actions/workflows/ci.yml/badge.svg)](https://github.com/diyuworks/MahilaSakhi-PCOD-Predictor/actions/workflows/ci.yml)
[![Tests: Pytest & Jest](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen)](https://github.com/diyuworks/MahilaSakhi-PCOD-Predictor)
[![Privacy: Zero Data Stored](https://img.shields.io/badge/Privacy-Your%20answers%20are%20not%20stored-green)](docs/privacy.md)
[![Languages](https://img.shields.io/badge/Languages-English%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A6%E0%A5%80%20%7C%20%E0%AA%97%E0%AB%81%E0%AA%9C%E0%AA%B0%E0%AA%BE%E0%AA%A4%E0%AB%80-pink)](https://github.com/diyuworks/MahilaSakhi-PCOD-Predictor)

MahilaSakhi is an evidence-informed, context-aware women's health platform that answers:
> **"Given MY symptoms, reproductive context, health info, goals, and concerns, what should I focus on next?"**

The platform replaces legacy single-form prediction with a validated **care-navigation pipeline**:
**Consent & Privacy Gate → Context Branching (Uterus/Ovaries/Menopause) → Multidimensional Profiling (Severity + Daily Impact) → Domain Prioritisation Engine → Tailored Care Pathway → Verified Guideline Grounding → Single-Page Clinical Visit-Prep Export.**

---

## 📸 Visual Overview

| Landing Screen (Desktop 1280x800) | Hysterectomy Context Branching |
| :---: | :---: |
| ![Landing Screen](docs/screenshots/landing_desktop_1280x800.png) | ![Hysterectomy Path](docs/screenshots/hysterectomy_path_desktop_1280x800.png) |

| Care Map Dashboard with Red-Flag Urgent Banner | High-Res Visit-Prep PDF Export |
| :---: | :---: |
| ![Care Map with Red Flag](docs/screenshots/care_map_red_flag_desktop_1280x800.png) | ![Visit-Prep PDF](docs/screenshots/visit_prep_pdf_page.png) |

---

## 🚀 Key Capabilities (v3)

* 🛡️ **Privacy Architecture:** Your answers are not stored on our servers. Zero persistent health logging, client-side session state, and one-click data deletion endpoint (`/v3/delete`). See [docs/privacy.md](docs/privacy.md) (`TODO(legal review)`).
* 🧭 **Context Gate Branching:** Dynamically handles hysterectomy, bilateral/unilateral oophorectomy, surgical vs. natural menopause, and hormonal contraception. Cycle tracking questions are suppressed when biologically not applicable.
* 🎯 **Domain Prioritisation & Care Pathways:** Ranks 7 core domains (*Androgen, Menstrual, Metabolic, Fertility, Mental Wellbeing, Sleep, Menopause/Cardiovascular*) into actionable tiers: **Focus now**, **Keep an eye on**, and **Maintain**.
* 🚨 **Red-Flag Escalation Engine:** Identifies acute symptoms and distinguishes rapid androgen changes or postmenopausal bleeding from standard PCOS with tiered clinical urgency (*Today*, *This week*, *In 4–6 weeks*).
* 📋 **Validated Psychological Instruments:** Optional **PHQ-9** and **GAD-7** screening (with zero preselected answers and `null` skip serialization) plus immediate and persistent safety alerts for Tele-MANAS (14416) if thoughts of self-harm are indicated.
* 📄 **Single-Page Visit-Prep PDF:** High-resolution server-side consultation summary export (ReportLab) for structured discussions with healthcare providers.
* 💬 **Context-Grounded Care Map Chat:** Llama 3.1-powered conversational explanations strictly grounded in retrieved evidence chunks, with temperature 0.2 and strict refusal guards against diagnosis and drug prescribing.
* 🌐 **Trilingual Interface:** Complete internationalization in **English**, **Hindi (हिन्दी)**, and **Gujarati (ગુજરાતી)** across all 203 keys:
  * English (`en.json`): Base reference
  * Hindi (`hi.json`): `{"_needs_native_review": true}` (native clinician audit pending)
  * Gujarati (`gu.json`): `{"_needs_native_review": true}` (native clinician audit pending)

---

## 🛠 Tech Stack & Architecture

### Frontend
* **React.js 18** (Modular step components: `ContextStep`, `SymptomsStep`, `ImpactStep`, `MetabolicStep`, `WellbeingStep`, `ConcernStep`)
* **Chart.js & CSS Design Tokens** (WCAG AA compliant, 44px minimum touch targets)
* **Custom i18n Engine** with instant runtime language switching

### Backend & Clinical Engine
* **Flask (Python 3.10+)** with modular v3 blueprints (`backend/v3/`)
* **Scikit-learn Pipeline** with Stratified K-Fold CV & Platt/Sigmoid probability calibration
* **ReportLab** for pixel-precise, one-page vector medical PDF generation
* **Playwright & PyMuPDF** for automated end-to-end multi-viewport screenshot verification

---

## 🧩 Care-Navigation System Architecture

```mermaid
flowchart TD
    A[Patient Enters Onboarding] --> B[Privacy & Consent Screen]
    B --> C[Step 1: Biological Context Gate]
    C -->|Uterus = No| D[Ovaries & Surgical Menopause Check]
    C -->|Uterus = Yes| E[Menopause & Hormone Context]
    D --> F[Suppresses Cycle Tracking & Period Questions]
    E --> G[Step 2-3: Multidimensional Symptoms & Impact]
    F --> G
    G --> H[Step 4: Metabolic & Optional Lab Inputs]
    H --> I[Step 5: Wellbeing PHQ-9 & GAD-7]
    I -->|PHQ-9 Item 9 > 0| J[Immediate Persistent Tele-MANAS 14416 Alert]
    I --> K[Step 6: Chief Concern Selection & Red Flags]
    K --> L[Synthesis Engine /v3/assess]
    L --> M[Scoring: Severity + Impact + Asian Cutoffs]
    L --> N[Red-Flag Detector: Today / This Week / 4-6 Weeks]
    L --> O[Priority Engine: Focus Now / Monitor / Maintain]
    L --> P[Pathway Routing: Specialists, Tests, Doctor Questions]
    L --> Q[Evidence Retrieval from chunks.json]
    Q --> R{Human-Verified Chunks?}
    R -->|Yes| S[Grounded Explainer Llama-3.1 temperature 0.2]
    R -->|No or Failed Validation| T[Deterministic Safe Educational Template]
    M & N & O & P & S & T --> U[Interactive 'My PCOS Care Map' Dashboard]
    U --> V[Server-Side 1-Page Visit-Prep PDF Export]
    U --> W[Context-Aware Chat with Diagnosis/Dosage Refusal Guards]
```

---

## 🛡️ Clinical Safety & Regulatory Design

1. **Non-Diagnostic Imperative:** The app never diagnoses, prescribes, or calculates an arbitrary "PCOS probability" without pelvic ultrasound confirmation.
2. **Context Gate First:** Biological context strictly dictates clinical routing. Hysterectomy or natural/surgical menopause suppresses period tracking advice.
3. **Escalation & Cancer Rule-Out:** Rapidly worsening virilizing symptoms or postmenopausal vaginal bleeding immediately trigger clinical evaluation alerts to exclude androgen-secreting tumors or endometrial hyperplasia.
4. **Crisis Helplines:** If self-harm is indicated on PHQ-9 item 9, an un-dismissible emergency banner connects the patient to India's national crisis helpline (**Tele-MANAS: 14416**).
5. **Zero-Persistence Privacy Architecture:** Your answers are not stored on our servers. Zero third-party analytics; all inputs live in client React state; one-click `/v3/delete` endpoint. See [docs/privacy.md](docs/privacy.md) (`TODO(legal review)` for DPDP Act 2023 formal certification).
6. **Knowledge Base Verification Protocol:** Evidence chunks in `backend/knowledge/chunks.json` must be human-verified by a clinician before the LLM explainer is permitted to cite them:
   ```bash
   python scripts/verify_chunks.py
   ```
   Only an authorized clinician may flip `"verified": true` in `chunks.json`. If unverified, the system strictly falls back to safe deterministic educational templates.

---

## 🔬 Model Limitations & Honest Ablation Study

Early iterations of symptom prediction tools on the Kerala clinical dataset frequently claimed an inflated **~98% diagnostic accuracy** (not reproduced under stratified CV: ~89% accuracy, cause not established). Rigorous clinical audit reveals that high predictive performance is driven almost entirely by **data leakage from transvaginal/pelvic ultrasound variables** (`Follicle No. (L)` and `Follicle No. (R)`).

When pelvic ultrasound findings are omitted, sensitivity/recall drops precipitously:

| Feature Subset | Number of Features | ROC-AUC | Accuracy | Precision | Recall (Sensitivity) |
|---|---|---|---|---|---|
| **Full Clinical Set (Ultrasound + Labs + Symptoms)** | 41 | **0.962** | 89.1% | 0.910 | **0.740** |
| **No Ultrasound (Labs + Symptoms only)** | 36 | 0.886 | 81.9% | 0.800 | 0.593 |
| **No Ultrasound & No Labs (Questionnaire only)** | 25 | 0.885 | 81.7% | 0.791 | 0.605 |
| **Symptoms Only (11 Basic History questions)** | 11 | 0.891 | 83.4% | 0.781 | 0.689 |

### Clinical Implications:
1. **No Ultrasound = No Risk Probability:** PCOS cannot be diagnosed from a questionnaire alone under the 2023 International Evidence-Based Guideline. MahilaSakhi v3 **refuses** to output an arbitrary probability without confirmed ultrasound follicle inputs, routing users to holistic care pathways instead.
2. **Dataset-Specific Caveat:** The observation that `symptoms-only AUC ≈ no-ultrasound AUC` reflects the hospital referral pattern in this dataset (ten hospitals across Kerala) and is **not** evidence that symptoms alone are sufficient in general outpatient or screening settings.
3. **Probability Calibration:** The clinical Random Forest model (`model/pcod_clinical_v3.pkl`) uses Platt/Sigmoid probability calibration inside a 5-fold stratified cross-validation pipeline, achieving **ROC-AUC of 0.959**, **Recall of 81.9%**, and a low **Brier score of 0.0735**.
4. **Model Card:** Detailed dataset provenance, performance curves, and ethical bounds are documented in [`docs/model_card.md`](docs/model_card.md).

---

## 🎙️ Voice: How It Works and Privacy

MahilaSakhi integrates bilingual speech capabilities (Speech-to-Text via Web Speech API `SpeechRecognition` and Text-to-Speech via `speechSynthesis`) directly into the clinical care map and assistant:

### 1. Architectural Guardrails
* **Existing Clinical Pipeline Unchanged**: Voice operates strictly as an accessible input/output layer on top of `/chat`. Spoken queries undergo identical safety checking (`backend/v3/safety.py`), intent routing, and clinical bounds. No unverified voice-to-profile extraction or separate LLM bypassing occurs.
* **Never Auto-Sent**: Speech transcripts populate the input box for patient inspection and editing. The message is only transmitted when the user explicitly clicks the Send button.
* **Read-Aloud TTS**: Each assistant message provides a "Listen / Stop" button. Tapping reads guideline answers aloud at a natural pace (0.95x rate). Wizard questions and Care Map cards also include a small speaker button for audio accessibility without auto-playing. Respects `prefers-reduced-motion`.
* **Crisis Safety**: In life-safety situations (self-harm or acute crisis), spoken guidance is accompanied by an unmissable, high-contrast tappable `tel:14416` button connecting directly to India's national Tele-MANAS helpline.

### 2. Privacy & Zero-Persistence Guarantee
* **No Server Audio Storage**: MahilaSakhi never records, streams, logs, or stores audio data or voice transcripts on any server.
* **Client-Side Speech Processing**: Audio is processed directly by the client browser's speech recognition engine (e.g. Google's on-device/browser speech service in Chrome).
* **Explicit User Consent**: A dedicated bilingual Voice Privacy dialog appears before the microphone is enabled for the first time, noting browser speech processing and advising headphones in shared/public places. Consent is held in client React state only (never persisted to localStorage or cookies).
* **Graceful Fallback**: If speech recognition is unsupported or permission is denied, a friendly localized banner appears and standard text interaction continues without disruption.

### 3. Manual Testing Checklist
* **Chrome Desktop (Windows/macOS)**: Click mic, accept privacy dialog, speak English query -> text populates input field -> edit and submit. Click Listen on assistant answer -> audio speaks and Stop toggles.
* **Chrome Android**: Toggle Hindi -> click mic -> speak "pcod me kya diet leni chahiye" -> Hindi transcript appears in input field -> send -> verify Hindi TTS voice.
* **Offline Behavior**: When disconnected, browser speech recognition triggers a friendly network error notice while typing remains accessible.
* **Firefox & Safari Behavior**: Safari and desktop Firefox have partial or vendor-prefixed SpeechRecognition support; if unsupported, the app displays a clear, localized message advising the user to continue typing.

---

## ⚙️ How to Run & Test the Project

### 1️⃣ Clone & Setup
```bash
git clone https://github.com/diyuworks/MahilaSakhi-PCOD-Predictor.git
cd MahilaSakhi-PCOD-Predictor
```

### 2️⃣ Run Tests
```bash
# Backend pytest suite (68 tests)
python -m pytest tests -v

# Frontend Jest suite (9 tests)
cd frontend
npm test -- --watchAll=false --runInBand
cd ..
```

### 3️⃣ Start Backend (Flask)
```bash
cd backend
python app.py
# Backend runs on: http://127.0.0.1:5000
```

### 4️⃣ Start Frontend (React)
```bash
cd frontend
npm install
npm start
# Frontend runs on: http://localhost:3000
```

### 5️⃣ Automated Screenshot Capture
```bash
python scripts/capture_screenshots.py
```

---

## 🎯 Roadmap & Future Improvements

* 🏥 **Native Clinician Translation Reviews**: Specialized gynecological dialect audits for regional Gujarati and Hindi terminology.
* 📶 **Offline / Low-Connectivity PWA Support**: Progressive Web App service workers for unstable tier-2/tier-3 network resilience.
* 🔍 **Local Vector Similarity Search**: Embeddings-based retrieval (FAISS / ChromaDB) for expanded guideline literature.

---

## 👩‍💻 Author

**Diya Malviya**  
Passionate about **AI, HealthTech, and Full Stack Development**
