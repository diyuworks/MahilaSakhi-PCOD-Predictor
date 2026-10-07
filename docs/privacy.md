# MahilaSakhi Privacy Architecture & Data Flow

> **Status:** Verifiable Technical Privacy Guarantees  
> **Regulatory Note:** `TODO(legal review)` — Pending formal legal review for India Digital Personal Data Protection (DPDP) Act 2023 certification.

---

## 1. Core Privacy Philosophy: Zero Persistent Health Storage

MahilaSakhi operates on a strict **zero-persistence** design for sensitive health information. We do not store, sell, or retain user profiles, symptom scores, or chat queries on our servers.

---

## 2. Exactly What Is Collected

During an assessment and chat session, users may provide the following health parameters:

1. **Demographics & Anatomical Context:**
   - Age (years)
   - Reproductive context: Uterus presence (or hysterectomy), ovary status (intact, unilateral, or bilateral removal), menopause status.
   - Reproductive goal: Pregnancy planning, symptom relief, cycle tracking, or long-term health navigation.

2. **Symptom Severities & Daily Life Impact:**
   - Menstrual pattern (cycle length, months since last period).
   - Androgen excess signs: Facial/body hair (mFG criteria), acne severity, scalp hair thinning.
   - Daily life impact ratings (0 to 3 scale: *none*, *a little*, *quite a bit*, *a lot*).

3. **Metabolic Markers:**
   - Height (cm), weight (kg), calculated BMI (with Asian-specific risk thresholds).
   - Waist circumference (cm).
   - Family history of type 2 diabetes.

4. **Mental Wellbeing & Sleep (Optional):**
   - PHQ-9 depression screening responses (items 1–9).
   - GAD-7 anxiety screening responses (items 1–7).
   - Sleep disturbance rating (0–4 scale).

5. **Clinical Red Flags:**
   - Sudden severe pelvic pain, soaking-through bleeding, postmenopausal bleeding, rapid virilization.

6. **Free-Text Queries:**
   - Questions entered into the Sakhi AI Chatbot.

---

## 3. Data Flow: Where Data Goes

```
┌────────────────────────────────────────────────────────┐
│                   User Browser                         │
│  - React state memory ONLY (ephemeral)                 │
│  - NO health data in localStorage / sessionStorage     │
│  - "Delete My Data" or page refresh purges memory      │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS POST
                           ▼
┌────────────────────────────────────────────────────────┐
│               MahilaSakhi Backend Server               │
│  - In-memory calculation (RAM only)                    │
│  - ZERO database writes (no SQLite, Postgres, Mongo)   │
│  - ZERO request body logging in server access logs     │
│  - Chat logs ONLY: route, intent, latency_ms           │
└──────────────────────────┬─────────────────────────────┘
                           │ (Only if Grounded LLM Route)
                           ▼
┌────────────────────────────────────────────────────────┐
│             NVIDIA API (LLM Inference)                 │
│  - User question + guideline excerpts + domain tier    │
│  - NO demographic, identifying, or profile payload     │
└────────────────────────────────────────────────────────┘
```

### A. User's Browser (Client-Side)
- All questionnaire responses and chat conversations exist **exclusively in volatile React component state memory**.
- **No health data is saved to `localStorage`, `sessionStorage`, or IndexedDB.**
- Refreshing the browser or clicking the "Delete My Data" button permanently clears all questionnaire data from browser memory.

### B. MahilaSakhi Backend Server
- Requests sent to `/v3/assess`, `/v3/visit-prep-pdf`, and `/chat` are received over HTTPS.
- Data is processed **in-memory (RAM) strictly for the duration of the request calculation** (scoring domain priorities, applying rule gates, generating PDF bytes, or selecting response pathways).
- **No Database Persistence:** The backend has no database connections, no SQLite files, and no persistent database models.
- **No Server Disk Writing:** No profile JSON files, user records, or conversation transcripts are written to the server filesystem.
- **No Request Body Logging:** Server access logs and application loggers never record user messages, profile inputs, or symptoms. 
- **Chat Telemetry:** `/chat` logs strictly minimal operational metadata:
  ```text
  chat_completed route=deterministic intent=why_priority latency_ms=12.4
  ```

### C. NVIDIA API (Grounded LLM Route Only)
- The external LLM API (`https://integrate.api.nvidia.com/v1`) is invoked **only** when a question requires grounded explanation and primary guideline chunks exist.
- What is sent:
  1. The user's question string.
  2. Short rolling conversation history (up to 6 message turns).
  3. Domain priority tiers (e.g. `androgen: focus_now`).
  4. Matched guideline excerpt text (`chunks.json`).
- What is **NEVER** sent:
  - Personal health profiles (age, height, weight, PHQ-9/GAD-7 responses, ultrasound records, or medical history).

---

## 4. What Is NOT Stored
- ❌ No persistent user accounts or passwords.
- ❌ No database tables or datastores.
- ❌ No persistent health logs or chat query logs.
- ❌ No third-party analytics trackers, advertisement cookies, or tracking pixels.

---

## 5. User Data Deletion
- Clicking **"Delete My Data"** triggers `/v3/delete` (which returns confirmation) and immediately flushes the client React state back to initial empty objects.

---

## 6. Compliance & Legal Verification
- `TODO(legal review)`: A formal review by legal counsel specializing in Indian digital health and privacy law is required to certify comprehensive compliance with the **Digital Personal Data Protection Act, 2023 (DPDP Act 2023)** and relevant Telemedicine Practice Guidelines.
