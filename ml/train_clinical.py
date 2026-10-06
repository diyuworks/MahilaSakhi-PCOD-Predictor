"""
Train calibrated clinical-mode PCOS Random Forest model.
Features include ultrasound findings (Follicle count L/R).
Uses StratifiedKFold cross-validation, median imputation inside pipeline,
and Platt/Isotonic probability calibration.
Evaluates AUC, precision, recall, Brier score, and plots calibration curves.
Saves model as model/pcod_clinical_v3.pkl.
"""
import os
import sys
import numpy as np
import pandas as pd
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import (
    roc_auc_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss,
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "dataset", "PCOS_data_without_infertility.xlsx")
MODEL_OUT = os.path.join(os.path.dirname(__file__), "..", "model", "pcod_clinical_v3.pkl")
FEATURES_OUT = os.path.join(os.path.dirname(__file__), "..", "model", "pcod_features_v3.pkl")
DOCS_DIR = os.path.join(os.path.dirname(__file__), "..", "docs")
PLOT_OUT = os.path.join(DOCS_DIR, "calibration_plot.png")

CLINICAL_FEATURES = [
    "Skin darkening (Y/N)",
    "Weight gain(Y/N)",
    "hair growth(Y/N)",
    "Cycle(R/I)",
    "Cycle length(days)",
    "BMI",
    "Weight (Kg)",
    "Follicle No. (L)",
    "Follicle No. (R)",
    "AMH(ng/mL)",
    "FSH(mIU/mL)",
    "LH(mIU/mL)",
    "FSH/LH",
    "TSH (mIU/L)",
]


def train():
    os.makedirs(DOCS_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)

    print(f"Loading dataset from {DATA_PATH}...")
    df = pd.read_excel(DATA_PATH, sheet_name="Full_new")
    df.columns = [c.strip() for c in df.columns]

    y = df["PCOS (Y/N)"].astype(int).values
    X = df[CLINICAL_FEATURES].apply(pd.to_numeric, errors="coerce")

    print(f"Dataset shape: {X.shape}, Class distribution: {np.bincount(y)} (Positives={sum(y==1)}, Negatives={sum(y==0)})")

    # Define base pipeline with imputer inside CV
    base_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("rf", RandomForestClassifier(
            n_estimators=300,
            max_depth=6,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight="balanced"
        )),
    ])

    # 5-fold Stratified Cross Validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # Perform out-of-fold calibrated evaluation
    oof_preds = np.zeros(len(y))
    oof_probs_uncal = np.zeros(len(y))
    oof_probs_cal = np.zeros(len(y))

    for fold, (train_idx, val_idx) in enumerate(cv.split(X, y)):
        X_train, y_train = X.iloc[train_idx], y[train_idx]
        X_val, y_val = X.iloc[val_idx], y[val_idx]

        # Base uncalibrated model
        base_pipeline.fit(X_train, y_train)
        oof_probs_uncal[val_idx] = base_pipeline.predict_proba(X_val)[:, 1]

        # Calibrated model (using internal 3-fold sigmoid calibration on training fold)
        calibrated_fold = CalibratedClassifierCV(
            estimator=base_pipeline,
            method="sigmoid",
            cv=3
        )
        calibrated_fold.fit(X_train, y_train)
        probs_cal = calibrated_fold.predict_proba(X_val)[:, 1]
        oof_probs_cal[val_idx] = probs_cal
        oof_preds[val_idx] = (probs_cal >= 0.5).astype(int)

    # Calculate metrics
    auc_uncal = roc_auc_score(y, oof_probs_uncal)
    auc_cal = roc_auc_score(y, oof_probs_cal)
    acc = accuracy_score(y, oof_preds)
    prec = precision_score(y, oof_preds)
    rec = recall_score(y, oof_preds)
    f1 = f1_score(y, oof_preds)
    brier_uncal = brier_score_loss(y, oof_probs_uncal)
    brier_cal = brier_score_loss(y, oof_probs_cal)

    print("\n" + "=" * 60)
    print(" 5-FOLD STRATIFIED OUT-OF-FOLD EVALUATION RESULTS")
    print("=" * 60)
    print(f"  • ROC-AUC (Uncalibrated) : {auc_uncal:.4f}")
    print(f"  • ROC-AUC (Calibrated)   : {auc_cal:.4f}")
    print(f"  • Accuracy               : {acc:.4f} ({acc*100:.1f}%)")
    print(f"  • Precision              : {prec:.4f}")
    print(f"  • Recall (Sensitivity)   : {rec:.4f}")
    print(f"  • F1-Score               : {f1:.4f}")
    print(f"  • Brier Score (Uncal)    : {brier_uncal:.4f}")
    print(f"  • Brier Score (Cal)      : {brier_cal:.4f}  (Lower is better calibration)")
    print("=" * 60)

    # Plot Calibration Curve
    prob_true_uncal, prob_pred_uncal = calibration_curve(y, oof_probs_uncal, n_bins=10)
    prob_true_cal, prob_pred_cal = calibration_curve(y, oof_probs_cal, n_bins=10)

    plt.figure(figsize=(7, 6))
    plt.plot([0, 1], [0, 1], "k:", label="Perfect Calibration")
    plt.plot(prob_pred_uncal, prob_true_uncal, "s-", color="#868E96", label=f"Uncalibrated RF (Brier={brier_uncal:.3f})")
    plt.plot(prob_pred_cal, prob_true_cal, "o-", color="#C2255C", linewidth=2, label=f"Calibrated Platt/Sigmoid (Brier={brier_cal:.3f})")
    plt.xlabel("Mean Predicted Probability")
    plt.ylabel("Observed Fraction of Positives")
    plt.title("Reliability Diagram (Calibration Curve) — MahilaSakhi Clinical RF")
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(PLOT_OUT, dpi=200)
    plt.close()
    print(f"Saved calibration curve plot to {PLOT_OUT}")

    # Train final full model with calibration
    print("\nFitting final calibrated model on all 541 samples...")
    final_calibrated_model = CalibratedClassifierCV(
        estimator=base_pipeline,
        method="sigmoid",
        cv=5
    )
    final_calibrated_model.fit(X, y)

    # Save model and feature names
    joblib.dump(final_calibrated_model, MODEL_OUT)
    joblib.dump(CLINICAL_FEATURES, FEATURES_OUT)
    print(f"Model saved to {MODEL_OUT}")
    print(f"Features saved to {FEATURES_OUT}")

    return {
        "auc": round(auc_cal, 3),
        "accuracy": round(acc, 3),
        "precision": round(prec, 3),
        "recall": round(rec, 3),
        "f1": round(f1, 3),
        "brier_uncal": round(brier_uncal, 3),
        "brier_cal": round(brier_cal, 3),
    }


if __name__ == "__main__":
    train()
