"""Honest evaluation: how much of the RF accuracy comes from ultrasound/lab leakage?
Usage: python ml/ablation.py path/to/PCOS_data_without_infertility.xlsx"""
import sys, numpy as np, pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import StratifiedKFold, cross_validate

df = pd.read_excel(sys.argv[1], sheet_name="Full_new")
df.columns = [c.strip() for c in df.columns]
y = df["PCOS (Y/N)"].astype(int)
X = df.drop(columns=["PCOS (Y/N)", "Sl. No", "Patient File No.", "Unnamed: 44"], errors="ignore")
X = X.apply(pd.to_numeric, errors="coerce")

ULTRA = [c for c in X.columns if "Follicle" in c or "Avg. F size" in c or "Endometrium" in c]
LABS = [c for c in X.columns if any(k in c for k in ("FSH", "LH", "AMH", "TSH", "PRL", "PRG", "Vit D3", "beta-HCG", "RBS"))]
SYMPTOM = ["Age (yrs)", "BMI", "Cycle(R/I)", "Cycle length(days)", "Weight gain(Y/N)", "hair growth(Y/N)",
           "Skin darkening (Y/N)", "Hair loss(Y/N)", "Pimples(Y/N)", "Fast food (Y/N)", "Reg.Exercise(Y/N)"]
sets = {"full": list(X.columns),
        "no_ultrasound": [c for c in X.columns if c not in ULTRA],
        "no_ultrasound_no_labs": [c for c in X.columns if c not in ULTRA + LABS],
        "symptoms_only": [c for c in SYMPTOM if c in X.columns]}
cv = StratifiedKFold(5, shuffle=True, random_state=42)
for name, cols in sets.items():
    pipe = make_pipeline(SimpleImputer(strategy="median"),
                         RandomForestClassifier(300, random_state=42, class_weight="balanced"))
    r = cross_validate(pipe, X[cols], y, cv=cv, scoring=["roc_auc", "accuracy", "precision", "recall"])
    print(f"{name:24s} n_feat={len(cols):2d}  AUC={r['test_roc_auc'].mean():.3f}  "
          f"acc={r['test_accuracy'].mean():.3f}  prec={r['test_precision'].mean():.3f}  rec={r['test_recall'].mean():.3f}")
