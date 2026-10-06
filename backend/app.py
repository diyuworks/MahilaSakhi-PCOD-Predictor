import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from openai import OpenAI
from rule_engine import screen_menopause, screen_endometriosis

# v3 engine imports
from v3 import api as v3api
from v3.clinical_mode import predict_clinical
from v3.context import derive_context

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "..", "model", "pcod_model_v2.pkl")
features_path = os.path.join(BASE_DIR, "..", "model", "pcod_features_v2.pkl")

model = joblib.load(model_path)
FEATURE_NAMES = joblib.load(features_path)

thyroid_model_path = os.path.join(BASE_DIR, "..", "model", "thyroid_model_v1.pkl")
thyroid_features_path = os.path.join(BASE_DIR, "..", "model", "thyroid_features_v1.pkl")
thyroid_defaults_path = os.path.join(BASE_DIR, "..", "model", "thyroid_defaults_v1.pkl")

thyroid_model = joblib.load(thyroid_model_path)
THYROID_FEATURE_NAMES = joblib.load(thyroid_features_path)
THYROID_DEFAULTS = joblib.load(thyroid_defaults_path)

THYROID_LAB_FIELDS = ['TSH', 'T3', 'TT4', 'T4U', 'FTI']


def _predict_pcos(user_input: dict):
    row = {name: user_input.get(name, FEATURE_DEFAULTS[name]) for name in FEATURE_NAMES}
    df = pd.DataFrame([row], columns=FEATURE_NAMES)
    prediction = model.predict(df)[0]
    probability = round(float(model.predict_proba(df)[0][1]), 3)
    return prediction, probability


def _predict_thyroid(user_input: dict):
    row = {name: user_input.get(name, THYROID_DEFAULTS[name]) for name in THYROID_FEATURE_NAMES}
    df = pd.DataFrame([row], columns=THYROID_FEATURE_NAMES)
    prediction = thyroid_model.predict(df)[0]
    probability = round(float(thyroid_model.predict_proba(df)[0][1]), 3)
    return prediction, probability


FEATURE_DEFAULTS = {
    'Skin darkening (Y/N)': 0,
    'Weight gain(Y/N)': 0,
    'hair growth(Y/N)': 0,
    'Cycle(R/I)': 2,
    'Cycle length(days)': 5.0,
    'BMI': 24.0,
    'Weight (Kg)': 60.0,
    'Follicle No. (L)': 6.0,
    'Follicle No. (R)': 6.0,
    'AMH(ng/mL)': 3.5,
    'FSH(mIU/mL)': 6.0,
    'LH(mIU/mL)': 6.0,
    'FSH/LH': 1.0,
    'TSH (mIU/L)': 2.5,
}

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.environ.get("NVIDIA_API_KEY") or "placeholder-key",
)

# Register v3 engine blueprint and attach LLM client
v3api._llm_client = client
app.register_blueprint(v3api.bp)

CHAT_SYSTEM_PROMPT = (
    "You are MahilaSakhi's PCOD Care Assistant — an educational women's health "
    "care navigator. Explain things simply based strictly on the provided assessment context. "
    "You must NEVER diagnose medical conditions, prescribe medications, or recommend drug doses. "
    "Always redirect diagnostic or prescription questions to a licensed clinician. "
    "Keep replies concise (2-4 sentences) and supportive."
)


@app.route("/")
def home():
    return "MahilaSakhi PCOD API Running"


@app.route('/predict', methods=['POST'])
def predict():
    """Legacy endpoint upgraded to clinical mode: no silent mean-imputation."""
    data = request.get_json(force=True) or {}
    user_input = data.get('features', {})
    if isinstance(user_input, list):
        user_input = dict(zip(FEATURE_NAMES, user_input))
    result = predict_clinical(model, FEATURE_NAMES, user_input)
    return jsonify(result)


@app.route('/predict_thyroid', methods=['POST'])
def predict_thyroid():
    data = request.get_json()
    user_input = data.get('features', {})

    has_any_lab_value = any(
        field in user_input and user_input[field] is not None
        for field in THYROID_LAB_FIELDS
    )

    if not has_any_lab_value:
        return jsonify({
            "prediction": "Insufficient data",
            "probability": None,
            "message": (
                "Thyroid conditions can't be reliably screened from symptoms "
                "alone — a TSH blood test (a simple, common, inexpensive test) "
                "is needed for a meaningful result. If you have a recent TSH "
                "value, enter it for a real screening result."
            ),
        })

    prediction, probability = _predict_thyroid(user_input)
    result = "Possible Thyroid Involvement" if prediction == 1 else "Low Thyroid Risk"

    return jsonify({
        "prediction": result,
        "probability": probability,
    })


@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(force=True) or {}
    user_message = data.get("message", "").strip()
    context = data.get("context", "")

    if not user_message:
        return jsonify({"error": "message is required"}), 400

    if not context or not str(context).strip():
        return jsonify({"error": "context from v3 result is required"}), 400

    # Safety gate: refuse dose, prescription, and direct diagnosis requests
    lower_msg = user_message.lower()
    refusal_keywords = [
        "dose", "dosage", "how much", "mg", "prescription", "prescribe",
        "tablet", "pills", "medication", "medicine",
        "do i have pcos", "do i have pcod", "diagnose me", "diagnose",
        "diagnosis", "am i diagnosed"
    ]
    if any(kw in lower_msg for kw in refusal_keywords):
        return jsonify({
            "reply": "I cannot provide a medical diagnosis or prescribe/recommend medication doses. "
                     "MahilaSakhi is an educational care-navigation tool. Please consult a qualified "
                     "doctor or clinician for diagnostic evaluation and prescription management."
        }), 200

    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
    messages.append({
        "role": "system",
        "content": f"Context from the user's recent v3 assessment: {context}",
    })
    messages.append({"role": "user", "content": user_message})

    if not os.environ.get("NVIDIA_API_KEY"):
        return jsonify({
            "reply": "AI Chatbot ke liye NVIDIA_API_KEY configure nahi hai. Aap prediction dashboard aur baaki sabhi health features bina key ke use kar sakte hain!"
        })

    try:
        completion = client.chat.completions.create(
            model="meta/llama-3.1-8b-instruct",
            messages=messages,
            temperature=0.2,
            max_tokens=300,
        )
        reply = completion.choices[0].message.content.strip()
        return jsonify({"reply": reply})
    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({"reply": "Sorry, I'm having trouble responding right now. Please try again."}), 500


def _determine_urgency(pcos_probability, thyroid_probability, menopause_likelihood,
                        endometriosis_likelihood, red_flag_symptoms):
    if red_flag_symptoms:
        return {
            "tier": "this_week",
            "label": "See a doctor this week",
            "reason": "You reported symptoms that warrant prompt medical attention.",
        }

    high_signal = (
        (pcos_probability is not None and pcos_probability >= 0.65)
        or (thyroid_probability is not None and thyroid_probability >= 0.65)
        or menopause_likelihood == "high"
        or endometriosis_likelihood == "high"
    )
    if high_signal:
        return {
            "tier": "this_week",
            "label": "See a doctor this week",
            "reason": "One or more screening results show a strong signal that warrants prompt evaluation.",
        }

    moderate_signal = (
        (pcos_probability is not None and pcos_probability >= 0.4)
        or (thyroid_probability is not None and thyroid_probability >= 0.4)
        or menopause_likelihood == "moderate"
        or endometriosis_likelihood == "moderate"
    )
    if moderate_signal:
        return {
            "tier": "4_6_weeks",
            "label": "Consult a doctor in the next 4-6 weeks",
            "reason": "Some results show a moderate signal worth discussing with a doctor soon.",
        }

    return {
        "tier": "monitor",
        "label": "Monitor symptoms, rescreen in 30 days",
        "reason": "No strong indicators found right now — recheck if symptoms change or persist.",
    }


def _suggest_doctor_type(pcos_probability, thyroid_probability, menopause_likelihood, endometriosis_likelihood):
    suggestions = []
    if pcos_probability is not None and pcos_probability >= 0.4:
        suggestions.append("Gynecologist or Endocrinologist (for PCOS evaluation)")
    if thyroid_probability is not None and thyroid_probability >= 0.4:
        suggestions.append("Endocrinologist (for thyroid evaluation)")
    if menopause_likelihood in ("moderate", "high"):
        suggestions.append("Gynecologist (for menopause/perimenopause guidance)")
    if endometriosis_likelihood in ("moderate", "high"):
        suggestions.append("Gynecologist specializing in endometriosis")
    if not suggestions:
        suggestions.append("General Physician (for a general checkup)")
    return suggestions


@app.route('/screen', methods=['POST'])
def screen():
    """
    Unified screening endpoint — runs PCOS model, thyroid model (if lab data
    given), and the menopause/endometriosis rule engine, then combines them
    into the 3-part report: likelihood, urgency, next steps.
    """
    data = request.get_json(force=True) or {}
    inputs = data.get('inputs', {})

    # --- PCOS (real ML model) ---
    pcos_features = inputs.get('pcos', {})
    pcos_pred, pcos_probability = _predict_pcos(pcos_features)

    # --- Thyroid (real ML model, only if lab data provided) ---
    thyroid_features = inputs.get('thyroid', {})
    has_thyroid_labs = any(
        field in thyroid_features and thyroid_features[field] is not None
        for field in THYROID_LAB_FIELDS
    )
    thyroid_probability = None
    thyroid_message = None
    if has_thyroid_labs:
        _, thyroid_probability = _predict_thyroid(thyroid_features)
    else:
        thyroid_message = "No TSH/thyroid lab values provided — consider getting a TSH test for a complete picture."

    # --- Context Gate Check for Cycle Tracking & Menopause ---
    context_input = inputs.get('context', {})
    if not context_input and 'uterus' in inputs:
        context_input = inputs
    ctx = derive_context(context_input)

    if ctx.get("cycle_tracking") == "not_applicable":
        menopause_result = {
            "likelihood": "Not applicable",
            "reason": "Cycle tracking is not applicable based on surgical/anatomical context.",
            "applicable": False
        }
    else:
        menopause_input = inputs.get('menopause', {})
        menopause_result = screen_menopause(
            age=menopause_input.get('age', 30),
            cycle_status=menopause_input.get('cycle_status', 'regular'),
            months_since_last_period=menopause_input.get('months_since_last_period'),
            hot_flashes=menopause_input.get('hot_flashes', False),
            night_sweats=menopause_input.get('night_sweats', False),
            amh=menopause_input.get('amh'),
        )

    # --- Endometriosis (rule-based) ---
    endo_input = inputs.get('endometriosis', {})
    endo_result = screen_endometriosis(
        severe_period_pain=endo_input.get('severe_period_pain', False),
        pain_during_intercourse=endo_input.get('pain_during_intercourse', False),
        chronic_pelvic_pain=endo_input.get('chronic_pelvic_pain', False),
        heavy_bleeding=endo_input.get('heavy_bleeding', False),
        fertility_difficulty=endo_input.get('fertility_difficulty', False),
        pain_worsens_over_time=endo_input.get('pain_worsens_over_time', False),
    )

    # Red flags — any of these escalate urgency regardless of model scores
    red_flags = inputs.get('red_flags', {})
    red_flag_symptoms = any([
        red_flags.get('severe_uncontrolled_pain', False),
        red_flags.get('heavy_bleeding_soaking_through_protection', False),
        red_flags.get('sudden_severe_symptoms', False),
    ])

    urgency = _determine_urgency(
        pcos_probability, thyroid_probability,
        menopause_result['likelihood'], endo_result['likelihood'],
        red_flag_symptoms,
    )
    doctor_types = _suggest_doctor_type(
        pcos_probability, thyroid_probability,
        menopause_result['likelihood'], endo_result['likelihood'],
    )

    return jsonify({
        "likelihood": {
            "pcos": {
                "result": "High Risk" if pcos_pred == 1 else "Low Risk",
                "probability": pcos_probability,
            },
            "thyroid": {
                "result": ("Possible Involvement" if thyroid_probability and thyroid_probability >= 0.5 else "Low Risk") if has_thyroid_labs else "Insufficient Data",
                "probability": thyroid_probability,
                "message": thyroid_message,
            },
            "menopause": menopause_result,
            "endometriosis": endo_result,
        },
        "urgency": urgency,
        "next_steps": {
            "recommended_doctors": doctor_types,
            "recommended_tests": (
                ["TSH blood test"] if not has_thyroid_labs else []
            ) + (
                ["Pelvic ultrasound (for follicle count)"] if 'Follicle No. (L)' not in pcos_features else []
            ),
        },
    })


if __name__ == "__main__":
    app.run(debug=True)