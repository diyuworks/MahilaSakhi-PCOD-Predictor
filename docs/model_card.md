# MahilaSakhi v3 Clinical Model Card: Random Forest PCOS Classifier

## Model Overview
- **Model Name:** `pcod_clinical_v3.pkl`
- **Architecture:** Scikit-Learn Pipeline (`SimpleImputer(strategy="median")` + `RandomForestClassifier(300 trees, class_weight="balanced")`) wrapped with `CalibratedClassifierCV(method="sigmoid", cv=5)`
- **Version:** 3.0.0
- **Task:** Binary clinical resemblance classification (Resembles PCOS-positive clinical records: 1, Negative: 0)
- **Input Modality:** 14 structured clinical features, strictly requiring bilateral pelvic ultrasound follicle counts (`Follicle No. (L)` and `Follicle No. (R)`)

---

## Dataset & Provenance
- **Source:** Clinical dataset of female patients collected from hospitals in Kerala, India (Kottayam region)
- **Total Samples:** 541 patients
- **Class Balance:**
  - PCOS Positive ($y=1$): **177 cases** (32.7%)
  - PCOS Negative ($y=0$): **364 cases** (67.3%)
- **Preprocessing:** Median imputation encapsulated strictly inside cross-validation folds to prevent out-of-fold data leakage.

---

## Model Limitations & Ablation Study
A historical issue with early versions of this app and academic literature on this dataset was quoting an inflated **"98% accuracy"**, caused by uncalibrated evaluation, data leakage, and heavy reliance on transvaginal/pelvic ultrasound variables.

To honestly quantify the contribution of ultrasound and lab values, we executed `ml/ablation.py`:

| Feature Subset | Number of Features | ROC-AUC | Accuracy | Precision | Recall (Sensitivity) |
|---|---|---|---|---|---|
| **Full Clinical Set (Ultrasound + Labs + Symptoms)** | 41 | **0.962** | 89.1% | 0.910 | **0.740** |
| **No Ultrasound (Labs + Symptoms only)** | 36 | 0.886 | 81.9% | 0.800 | 0.593 |
| **No Ultrasound & No Labs (Questionnaire only)** | 25 | 0.885 | 81.7 | 0.791 | 0.605 |
| **Symptoms Only (11 Basic History questions)** | 11 | 0.891 | 83.4% | 0.781 | 0.689 |

### Key Clinical Insights:
1. **Ultrasound Leakage:** Removing pelvic ultrasound drops true recall from 74.0% to 59.3%. Pelvic ultrasound follicle count is a foundational diagnostic pillar under the Rotterdam Criteria, not a questionnaire proxy.
2. **Honesty Principle:** Without ultrasound findings, a binary machine learning model cannot reliably rule in or rule out PCOS. MahilaSakhi v3 explicitly refuses to output a prediction percentage when ultrasound is absent, routing the user to the holistic Care Map instead.

---

## Calibrated Performance Metrics (5-Fold Stratified Cross-Validation)
The v3 model incorporates Platt/Sigmoid probability calibration inside nested 5-fold stratified cross-validation:

| Evaluation Metric | Score (Out-of-Fold) |
|---|---|
| **ROC-AUC (Calibrated)** | **0.9593** |
| **Accuracy** | **90.2%** |
| **Precision** | **87.35%** |
| **Recall (Sensitivity)** | **81.92%** |
| **F1-Score** | **84.55%** |
| **Brier Score (Calibrated)** | **0.0735** *(vs. 0.0811 uncalibrated)* |

*A calibration reliability diagram is generated and preserved at `docs/calibration_plot.png` demonstrating tight alignment between predicted probability bins and observed prevalence.*

---

## Ethical Considerations & Intended Use

### Intended Use
- Educational care-navigation support to prepare patients for clinical discussions.
- Secondary clinical pattern reflection when official lab reports and pelvic ultrasound scans are provided.

### Out-of-Scope & Prohibited Use
- **Not a Medical Diagnosis:** The model outputs an assessment indicating resemblance to positive records in a clinical dataset. It does not establish a diagnosis.
- **Home Diagnostic Self-Reliance:** Under no circumstances should users rely on this model in place of an obstetrician/gynecologist or endocrinologist visit.
- **Geographic Generalizability Warning:** The dataset was collected from a localized hospital cohort in South India. Thresholds and phenotypic presentations may vary across diverse ethnicities and age brackets.
