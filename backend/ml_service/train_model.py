"""
AgriFert - Fertilizer Recommendation Model Training Script
===========================================================
Steps:
  1. Load dataset
  2. Inspect structure
  3. Remove missing values & duplicates
  4. Check class balance
  5. Inspect feature ranges
  6. Add small noise to numeric features
  7. Clip unrealistic values
  8. Shuffle dataset
  9. Encode categorical variables
 10. Train-test split
 11. Feature scaling
 12. Train models (Logistic Regression, Random Forest, XGBoost, Voting Ensemble)
 13. Save model + encoders + scaler
"""

import os
import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from xgboost import XGBClassifier

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODEL_DIR   = os.path.join(BASE_DIR, "model")

DATASET_PATH = os.path.join(DATASET_DIR, "filtered_fertilizer_data.csv")

os.makedirs(MODEL_DIR, exist_ok=True)

# ===========================================================================
# 1. Load Dataset
# ===========================================================================
print("=" * 60)
print("STEP 1 — Loading dataset")
print("=" * 60)
df = pd.read_csv(DATASET_PATH)
print(f"Shape: {df.shape}")

# ===========================================================================
# 2. Inspect Structure
# ===========================================================================
print("\nSTEP 2 — Inspecting structure")
print("Columns:", df.columns.tolist())
print(df.head())
print(df.info())
print(df.describe())

# ===========================================================================
# 3. Remove Missing Values & Duplicates
# ===========================================================================
print("\nSTEP 3 — Removing missing values and duplicates")
print("Null counts before:\n", df.isnull().sum())

df.dropna(subset=["Fertilizer Name"], inplace=True)
df.dropna(inplace=True)
df = df.drop_duplicates()
print(f"Shape after cleaning: {df.shape}")

# ===========================================================================
# 4. Check Class Balance
# ===========================================================================
print("\nSTEP 4 — Class balance")
print(df["Fertilizer Name"].value_counts())

# Remove single-member classes (cannot stratify on them)
value_counts = df["Fertilizer Name"].value_counts()
single_member_classes = value_counts[value_counts == 1].index
if not single_member_classes.empty:
    print(f"Removing single-member classes: {list(single_member_classes)}")
    df = df[~df["Fertilizer Name"].isin(single_member_classes)].copy()

# ===========================================================================
# 5. Inspect Feature Ranges
# ===========================================================================
print("\nSTEP 5 — Feature ranges")
numeric_cols = ["Temperature", "Humidity", "Moisture", "Nitrogen", "Phosphorous", "Potassium"]
print(df[numeric_cols].describe())

# ===========================================================================
# 6. Add Small Noise to Numeric Features
# ===========================================================================
print("\nSTEP 6 — Adding small Gaussian noise to numeric features")
np.random.seed(42)
for col in numeric_cols:
    noise = np.random.normal(0, 0.01 * df[col].std(), size=len(df))
    df[col] = df[col] + noise

# ===========================================================================
# 7. Clip Unrealistic Values
# ===========================================================================
print("\nSTEP 7 — Clipping unrealistic values")
df["Temperature"]  = df["Temperature"].clip(10, 50)
df["Humidity"]     = df["Humidity"].clip(10, 100)
df["Moisture"]     = df["Moisture"].clip(5, 100)
df["Nitrogen"]     = df["Nitrogen"].clip(0, 150)
df["Phosphorous"]  = df["Phosphorous"].clip(0, 150)
df["Potassium"]    = df["Potassium"].clip(0, 150)

# ===========================================================================
# 8. Shuffle Dataset
# ===========================================================================
print("\nSTEP 8 — Shuffling dataset")
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# ===========================================================================
# 9. Encode Categorical Variables
# ===========================================================================
print("\nSTEP 9 — Encoding categorical variables")
soil_encoder = LabelEncoder()
crop_encoder = LabelEncoder()
fert_encoder = LabelEncoder()

df["Soil Type"]       = soil_encoder.fit_transform(df["Soil Type"])
df["Crop Type"]       = crop_encoder.fit_transform(df["Crop Type"])
df["Fertilizer Name"] = fert_encoder.fit_transform(df["Fertilizer Name"])

print("Soil Type classes:", list(soil_encoder.classes_))
print("Crop Type classes:", list(crop_encoder.classes_))
print("Fertilizer classes:", list(fert_encoder.classes_))

# ===========================================================================
# 10. Train-Test Split
# ===========================================================================
print("\nSTEP 10 — Train-test split")
FEATURE_COLS = ["Temperature", "Humidity", "Moisture",
                "Soil Type", "Crop Type",
                "Nitrogen", "Phosphorous", "Potassium"]
TARGET_COL = "Fertilizer Name"

X = df[FEATURE_COLS]
y = df[TARGET_COL]

print("Value counts of y before split:")
print(y.value_counts())

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)
print(f"Train size: {X_train.shape[0]} | Test size: {X_test.shape[0]}")

# ===========================================================================
# 11. Feature Scaling
# ===========================================================================
print("\nSTEP 11 — Feature scaling")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ===========================================================================
# 12. Train Models
# ===========================================================================
print("\nSTEP 12 — Training models")

# --- Logistic Regression (baseline) ---
log_model = LogisticRegression(max_iter=1000, random_state=42)

# --- Random Forest ---
rf_model = RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1)

# --- XGBoost ---
xgb_model = XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.9,
    colsample_bytree=0.9,
    eval_metric="mlogloss",
    random_state=42,
    use_label_encoder=False
)

models = {
    "Logistic Regression": log_model,
    "Random Forest":       rf_model,
    "XGBoost":             xgb_model,
}

for name, model in models.items():
    print(f"\nTraining {name}...")
    model.fit(X_train_scaled, y_train)
    pred = model.predict(X_test_scaled)
    acc  = accuracy_score(y_test, pred)
    print(f"{name} Accuracy: {acc:.4f}")
    print(classification_report(y_test, pred, target_names=fert_encoder.classes_))

# --- Voting Ensemble ---
print("\nTraining Voting Ensemble (soft voting)...")
voting_model = VotingClassifier(
    estimators=[
        ("lr",  log_model),
        ("rf",  rf_model),
        ("xgb", xgb_model),
    ],
    voting="soft",
    n_jobs=-1,
)
voting_model.fit(X_train_scaled, y_train)
voting_pred = voting_model.predict(X_test_scaled)
voting_acc  = accuracy_score(y_test, voting_pred)
print(f"\nVoting Ensemble Accuracy: {voting_acc:.4f}")
print(classification_report(y_test, voting_pred, target_names=fert_encoder.classes_))
print("Confusion Matrix:\n", confusion_matrix(y_test, voting_pred))

# ===========================================================================
# 13. Save Model, Encoders & Scaler
# ===========================================================================
print("\nSTEP 13 — Saving artifacts to model/")

joblib.dump(voting_model,  os.path.join(MODEL_DIR, "voting_classifier_model.pkl"))
joblib.dump(soil_encoder,  os.path.join(MODEL_DIR, "soil_encoder.pkl"))
joblib.dump(crop_encoder,  os.path.join(MODEL_DIR, "crop_encoder.pkl"))
joblib.dump(fert_encoder,  os.path.join(MODEL_DIR, "fert_encoder.pkl"))
joblib.dump(scaler,        os.path.join(MODEL_DIR, "scaler.pkl"))

print("Saved:")
print(f"  model/voting_classifier_model.pkl")
print(f"  model/soil_encoder.pkl")
print(f"  model/crop_encoder.pkl")
print(f"  model/fert_encoder.pkl")
print(f"  model/scaler.pkl")
print("\nTraining complete!")
