# MahilaSakhi Chat v2 Architecture & Clinical Safety Design

## Overview
MahilaSakhi's Chat v2 replaces legacy free-form conversational chatbots with a safe, grounded, context-aware care-navigation chatbot. It is designed around the core tenet that an AI assistant in women's health must **never diagnose, never prescribe medications or dosages, and never fabricate clinical guidance**.

---

## The 5-Step Execution Pipeline

Every user message (typed text or future voice transcripts) is processed strictly through five sequential layers:

```
[ User Input ]
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 1. Safety Filter (Regex Gate)                         │
│    - Crisis detection -> Tele-MANAS 14416 & 112 reply  │
│    - Dose / Prescription refusal                       │
│    - Direct diagnosis refusal                          │
│    (Zero LLM calls; executed before routing)           │
└────────────────────────────────────────────────────────┘
      │ (Passed safe)
      ▼
┌────────────────────────────────────────────────────────┐
│ 2. Server-Side Profile Recomputation                   │
│    - assess_profile(profile) executes on server        │
│    - Client-supplied "context" strings are ignored     │
│    - Context gates enforced (e.g. hysterectomy safe)   │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│ 3. Deterministic Care Map Navigation                   │
│    - Structured intent classification (8 intents)      │
│    - Deterministic replies from user's Care Map        │
│    - Questions for doctor, tests, specialists, monitor │
└────────────────────────────────────────────────────────┘
      │ (Unclassified or free-text exploratory query)
      ▼
┌────────────────────────────────────────────────────────┐
│ 4. Grounded LLM Generation (Strict Guardrails)        │
│    - Triggered ONLY if verified chunks exist           │
│    - Required citations to retrieved chunk IDs         │
│    - Banned drug names, doses, and diagnoses           │
└────────────────────────────────────────────────────────┘
      │ (If LLM fails, cites invalid, or no verified KB)
      ▼
┌────────────────────────────────────────────────────────┐
│ 5. Validated Clinician Fallback                        │
│    - Transparent admission of lack of verified facts   │
│    - Actionable questions to bring to the clinician    │
└────────────────────────────────────────────────────────┘
```

### 1. Safety Check First (`backend/v3/safety.py`)
- **Why it exists**: Crisis, dose, and diagnosis queries require immediate, deterministic redirection without relying on probabilistic LLM responses or prompt engineering.
- **Crisis phrases**: English, romanised Hinglish, and Devanagari Hindi phrases immediately trigger support information with India's national mental health helpline **Tele-MANAS (14416, 24x7, free)** and emergency **112**.
- **Clinical refusal**: Dose inquiries (e.g. `\bmg\b`, `kitni goli`, `how much to take`, `prescribe`) and diagnosis questions (`do I have PCOS`, `kya mujhe pcos hai`) are blocked before touching any LLM.
- **Word boundary safety**: All filters enforce word boundaries `\b` to avoid false triggers on innocent words (e.g. `images`, `username`, `attestation`).

### 2. Server Recomputation (`backend/v3/chat.py`)
- **Why it exists**: Client applications are untrusted execution environments. An adversary or client-side bug could pass arbitrary context strings to bypass clinical safeguards.
- **Rule**: The client submits `{ message, profile, lang, history }`. The server calls `assess_profile(profile)` directly to establish ground truth.
- **Context gate preservation**: Women with a hysterectomy (`uterus: "no"`) never receive menstrual or period content, regardless of what is typed in `message` or injected into `history`.

### 3. Structured Deterministic Answers
- **Why it exists**: The majority of care-navigation needs (understanding priorities, preparing questions for a doctor, knowing what tests to ask about, knowing which specialist to consult, lifestyle tracking habits) are already structured with clinical rigor in the Care Map pathways.
- **No LLM latency or hallucination**: Deterministic replies format pathway data directly in the user's preferred language (English, Hindi, or Hinglish).

### 4. Grounded LLM Generation
- **Why it exists**: Provides natural-language explanations for nuanced questions while strictly bounding generated content to verified guideline evidence.
- **Contract**:
  - LLM receives only retrieved verified chunks and high-level assessment tiers.
  - LLM must reply with JSON: `{"answer": str, "cites": [chunk ids]}`.
  - The server verifies that all cited IDs belong to the retrieved set.
  - Prohibited medical terms, diagnoses ("you have PCOS"), doses, and answers exceeding length limits are rejected.

### 5. Validated Fallback
- **Why it exists**: An honest assistant admits when it does not know. If chunks are unverified (draft mode) or the LLM output violates safety policies, the assistant provides a warm, honest fallback with questions to take to a healthcare provider.

---

## Privacy Architecture & Zero-Persistence Design
1. **Zero Raw Text Logging**: Message text, transcripts, and profile contents are never persisted to disk or server log files.
2. **Telemetry Only**: Server logs record only metadata: route (`safety`, `deterministic`, `grounded`, `fallback`), classified intent, response latency, and HTTP status code.
3. **In-Memory Sessions**: Profiles live in React state and in-memory request lifecycles only (`TODO(legal review)` for DPDP Act 2023 formal certification; see [privacy.md](privacy.md)).

---

## Abuse Protection & Rate Limiting
- **IP Rate Limiting**: Managed via `Flask-Limiter` with in-memory storage (`30 requests/minute` on `/chat`, `10 requests/minute` on `/v3/assess`).
- **Body Size Cap**: Flask configured with `MAX_CONTENT_LENGTH = 20 * 1024` (20 KB), rejecting oversized requests with HTTP 413.
- **Length Caps**: Messages are capped to 500 characters. History arrays are truncated to the last 6 turns of at most 300 characters each.

---

## Known Limitations & Clinical Roadmap
1. **Phrase Lists**: Safety and intent patterns cover over 120 phrases across English, Hinglish, and Hindi. Ongoing review by native speakers of regional dialects and licensed clinicians is required before high-scale deployment.
2. **Guideline Chunk Verification**: Knowledge base chunks in `backend/knowledge/chunks.json` currently default to `verified: false`. Only a credentialed medical reviewer may set `verified: true`. Until verified, exploratory free-text answers consistently route to the clinician visit fallback.
