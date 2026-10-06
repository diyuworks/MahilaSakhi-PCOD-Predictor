"""Replaces silent mean-imputation in the legacy /predict. RF runs only with real clinical inputs."""
REQUIRED = ["Follicle No. (L)", "Follicle No. (R)"]


def predict_clinical(model, feature_names, user_input: dict):
    missing = [k for k in REQUIRED if user_input.get(k) is None]
    if missing:
        return {"status": "insufficient_data", "missing": missing,
                "message": "This model needs ultrasound findings. Without them we won't show a "
                           "probability. Use the personalised care map instead."}
    import pandas as pd
    row = {n: user_input.get(n) for n in feature_names}      # NaNs handled by the pipeline imputer
    df = pd.DataFrame([row], columns=feature_names)
    return {"status": "ok", "probability": round(float(model.predict_proba(df)[0][1]), 3),
            "note": "Resembles PCOS-positive records in a clinical dataset. Not a diagnosis."}
