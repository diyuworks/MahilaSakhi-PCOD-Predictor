# MahilaSakhi v3 Deployment Guide & Readiness Report

This document details the production deployment architecture, Python runtime configuration, environment variables, Render-specific settings, cold-start handling, and security guardrails for MahilaSakhi.

---

## 1. Python Version & Dependency Mismatch Analysis (D1)

### The Current Mismatch
An audit of the repository identified three conflicting configuration surfaces:

| Surface | File | Python Version | Requirements Source |
|---|---|---|---|
| **Root Directory** | `runtime.txt` | `python-3.10.13` | `requirements.txt` (83 pkgs, legacy freeze) |
| **Backend Directory** | `backend/runtime.txt` | `python-3.11.9` | `backend/requirements.txt` (13 clean pkgs) |
| **GitHub Actions CI** | `.github/workflows/ci.yml` | `python-3.10` | `backend/requirements.txt` |
| **Local Dev Env** | `.venv/` | Python 3.11.x | Active venv |

### Critical Dependency Gap in Root `requirements.txt`
- Root `requirements.txt` was generated from a previous training environment freeze containing heavy ML tooling (e.g. `tensorboard`, `keras`, `ipykernel`).
- **Danger**: Root `requirements.txt` is **missing essential v3 runtime packages**: `openai`, `pydantic`, `reportlab`, and `flask-limiter`.
- If a deployment platform (like Render or Heroku) is configured with **Root Directory = `.`**, it installs the root `requirements.txt`, which will fail on startup when importing `from v3 import api` or `openai`.
- Conversely, `backend/requirements.txt` contains the exact minimal set of runtime dependencies:
  ```text
  flask
  flask-cors
  gunicorn
  numpy
  scikit-learn
  pandas
  openai
  openpyxl
  joblib
  pydantic
  reportlab
  pytest
  flask-limiter
  ```

### Recommendation: Align on Python 3.10.13 or 3.11.9
1. **Option A (Recommended for Strict CI Parity — Python 3.10.13)**:
   - Match GitHub Actions CI (`3.10`) and root `runtime.txt` (`python-3.10.13`).
   - Every pinned dependency (scikit-learn 1.3+, pandas, numpy, reportlab 4.0+) has precompiled manylinux wheels for 3.10.
   - Update `backend/runtime.txt` to `python-3.10.13`.
2. **Option B (Recommended for Speed — Python 3.11.9)**:
   - Python 3.11 provides a 10–25% faster interpreter speed for JSON serialization, rule evaluation, and regex execution.
   - Update `.github/workflows/ci.yml` to `python-version: "3.11"` and root `runtime.txt` to `python-3.11.9`.

### Required Operational Confirmation (Prompting User)
> **QUESTION FOR USER**: Which Render **"Root Directory"** is configured for your web service?
> - If **Root Directory** is `.` (empty/root): The build command must be `pip install -r backend/requirements.txt` and start command `gunicorn backend.app:app`.
> - If **Root Directory** is `backend`: The service will look for `../model/` relative to `backend/`. Because Render does not clone directories outside the specified root in isolated builds, the model files in `model/` must be accessible. For this reason, keeping **Root Directory as `.`** is strongly recommended.

---

## 2. Render Backend Deployment Specifications (D2)

### Service Settings on Render
- **Environment**: Python 3
- **Root Directory**: `.` (Repository root)
- **Build Command**:
  ```bash
  pip install --upgrade pip && pip install -r backend/requirements.txt
  ```
- **Start Command**:
  ```bash
  gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
  ```

### Required Environment Variables
Configure the following in the Render Dashboard (**Environment** tab):

| Variable | Required? | Example / Default | Description |
|---|---|---|---|
| `NVIDIA_API_KEY` | Optional (Fallback available) | `nvapi-...` | API key for NVIDIA NIM API (`meta/llama-3.1-70b-instruct`). If omitted, deterministic rule-based grounding is used. |
| `LLM_MODEL` | Optional | `meta/llama-3.1-70b-instruct` | NVIDIA NIM model identifier. |
| `ALLOWED_ORIGIN` | **Required in Prod** | `https://mahilasakhi.vercel.app` | Comma-separated whitelist of allowed frontend origins for CORS. Wildcard `*` is disabled when `FLASK_ENV=production`. |
| `FLASK_ENV` | **Required in Prod** | `production` | Enforces production mode, disallowing debug endpoints and wildcard CORS. |
| `PORT` | Auto-provided | `10000` | Injected automatically by Render. |

### Model Artifacts Checklist
Verify that the `model/` directory contains all required binary models and feature lists:
- `model/pcod_clinical_v3.pkl` (Active clinical model)
- `model/pcod_features_v3.pkl` (Active feature order)
- `model/pcod_model_v2.pkl` (Fallback model)
- `model/pcod_features_v2.pkl` (Fallback feature order)
- `model/thyroid_model_v1.pkl` (Thyroid risk model)
- `model/thyroid_features_v1.pkl` (Thyroid features)
- `model/thyroid_defaults_v1.pkl` (Thyroid default values)

### Health Check Endpoints
MahilaSakhi provides two liveness and readiness probe routes:
- `GET /health`
- `GET /v3/health`

Both return HTTP 200 OK with no sensitive data or credentials:
```json
{
  "status": "healthy",
  "service": "mahilasakhi-backend",
  "version": "3.0",
  "model_loaded": true,
  "features_count": 14
}
```
Configure Render's **Health Check Path** to `/health`.

### Rate-Limiter Storage Note
- The rate limiter (`Flask-Limiter`) currently uses default in-memory storage (`memory://`).
- In a multi-worker Gunicorn setup, each worker maintains its own in-memory counter, and limits reset upon dyno restarts.
- **For single-instance free or starter tiers**, in-memory rate limiting is lightweight, zero-cost, and completely sufficient.
- **For scaled multi-instance production**, set `RATELIMIT_STORAGE_URI=redis://...` to share state across instances.

---

## 3. Frontend Cold-Start & Resilience Handling (D3)

### Render Free-Tier Cold Starts
On the Render free tier, web services spin down after 15 minutes of inactivity. The initial incoming request incurs a 30–45 second cold start while the container spins up and loads Scikit-Learn models.

### Frontend Mitigations Implemented:
1. **Exponential Backoff & Retries (`fetchWithRetry`)**:
   - `frontend/src/api/v3.js` wraps all API calls (`assessProfile`, `sendChatMessage`, `deleteUserData`, `downloadVisitPrepPdf`).
   - Automatically catches HTTP 502/503/504 gateway responses and fetch connection drops during spin-up.
   - Retries up to 3 times with progressive backoff (1.5s, 3s, 6s).
2. **Bilingual Cold-Start Wake-up Banner**:
   - When a cold start is detected, `setServerWakingListener` triggers a friendly dismissible banner:
     - **English**: *"Server is waking up (Render free tier may take up to 30–40 seconds). Please hold on..."*
     - **Hindi**: *"सर्वर सक्रिय हो रहा है (रेंडर फ़्री टियर में 30-40 सेकंड लग सकते हैं)। कृपया प्रतीक्षा करें..."*
     - **Gujarati**: *"સર્વર શરૂ થઈ રહ્યું છે (રેન્ડર ફ્રી ટાયરમાં 30-40 સેકન્ડ લાગી શકે છે). કૃપા કરીને રાહ જુઓ..."*
3. **Frontend Production Target**:
   - Configured in `frontend/.env.production`:
     ```text
     REACT_APP_API_URL=https://mahilasakhi-pcod-predictor-8.onrender.com
     ```

---

## 4. Security & CI Audit Guardrails (D4)

### Automated Secrets & Environmental Audit in CI
GitHub Actions (`.github/workflows/ci.yml`) enforces strict automated checks:
1. **Zero `.env` File Tracking**:
   ```bash
   if git ls-files | grep -E "(^|/)\.env$"; then exit 1; fi
   ```
2. **Zero API Key Leaks**:
   ```bash
   if git grep -E "nvapi-[A-Za-z0-9_-]{20,}"; then exit 1; fi
   ```
3. **Automated Chat Eval & Privacy Suite**:
   - `python -m pytest tests -v` (includes `tests/test_privacy.py` and `tests/test_health.py`)
   - `python scripts/run_chat_eval.py` (verifies all 86 chat routing cases)
   - `npm test -- --watchAll=false` (verifies all 23 React unit & voice tests)
   - `npm run build` (verifies production compilation)
