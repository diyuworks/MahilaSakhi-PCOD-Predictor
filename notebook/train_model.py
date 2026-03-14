import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Load dataset from second sheet (actual data)
data = pd.read_excel(
    "../dataset/PCOS_data_without_infertility.xlsx",
    sheet_name=1
)

# Clean column names
data.columns = data.columns.astype(str).str.strip()

print("\nDetected Columns:\n")
for col in data.columns:
    print(col)

# -----------------------------
# Helper function to find columns
# -----------------------------
def find_column(keyword):
    for col in data.columns:
        if keyword.lower() in col.lower():
            return col
    raise ValueError(f"Column containing '{keyword}' not found")

# -----------------------------
# Automatically detect columns
# -----------------------------
age_col = find_column("Age")
weight_col = find_column("Weight")
bmi_col = find_column("BMI")
weight_gain_col = find_column("Weight gain")
cycle_col = find_column("Cycle")
hair_col = find_column("Hair")
pimples_col = find_column("Pimples")
skin_col = find_column("Skin")
hormone_col = find_column("FSH")
exercise_col = find_column("Exercise")
target_col = find_column("PCOS")

features = [
    age_col,
    weight_col,
    bmi_col,
    weight_gain_col,
    cycle_col,
    hair_col,
    pimples_col,
    skin_col,
    hormone_col,
    exercise_col
]

print("\nUsing features:\n", features)

# Prepare dataset
X = data[features]
y = data[target_col]

X = X.fillna(X.mean())

# Split dataset
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier(
    n_estimators=200,
    random_state=42
)

model.fit(X_train, y_train)

# Evaluate model
pred = model.predict(X_test)
accuracy = accuracy_score(y_test, pred)

print("\nModel Accuracy:", accuracy)

# Save model
joblib.dump(model, "../model/pcod_model.pkl")

print("\nModel saved successfully → model/pcod_model.pkl")