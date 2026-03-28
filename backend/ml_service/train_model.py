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
 13. Save model + encoders + scaler + metrics

Can also be used as a module:
    from train_model import train_model_from_df
    result = train_model_from_df(df, version="1.1.0")
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODEL_DIR   = os.path.join(BASE_DIR, "model")

DATASET_PATH = os.path.join(DATASET_DIR, "dataset.csv")

os.makedirs(MODEL_DIR, exist_ok=True)


# ===========================================================================
# Core Training Function (callable by app.py for continuous learning)
# ===========================================================================
def train_model_from_df(df: pd.DataFrame, version: str = None) -> dict:
    """
    Train the full VotingClassifier pipeline on the given DataFrame,
    save all artifacts to model/, and return metrics.

    Parameters
    ----------
    df      : DataFrame with columns matching the dataset schema
    version : optional version string written into metrics.json

    Returns
    -------
    dict with keys: accuracy, trainedAt, trainSize, testSize, version
    """
    print("=" * 60)
    print(f"TRAINING  (rows={len(df)}, version={version})")
    print("=" * 60)

    # ── 3. Clean ──────────────────────────────────────────────────────────────
    df = df.dropna(subset=["fertilizer_name"]).dropna().drop_duplicates().copy()
    print(f"Shape after cleaning: {df.shape}")

    # ── 4. Remove single-member classes ──────────────────────────────────────
    counts = df["fertilizer_name"].value_counts()
    singles = counts[counts == 1].index
    if not singles.empty:
        print(f"Removing single-member classes: {list(singles)}")
        df = df[~df["fertilizer_name"].isin(singles)].copy()

    # ── 5-7. Noise + clip ─────────────────────────────────────────────────────
    numeric_cols = ["temperature", "humidity", "moisture", "nitrogen", "phosphorous", "potassium"]
    np.random.seed(42)
    for col in numeric_cols:
        noise = np.random.normal(0, 0.01 * df[col].std(), size=len(df))
        df[col] = df[col] + noise

    df["temperature"]  = df["temperature"].clip(10, 50)
    df["humidity"]     = df["humidity"].clip(10, 100)
    df["moisture"]     = df["moisture"].clip(5, 100)
    df["nitrogen"]     = df["nitrogen"].clip(0, 60)
    df["phosphorous"]  = df["phosphorous"].clip(0, 50)
    df["potassium"]    = df["potassium"].clip(0, 25)

    # ── 8. Shuffle ────────────────────────────────────────────────────────────
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    # ── 9. Encode ─────────────────────────────────────────────────────────────
    soil_encoder = LabelEncoder()
    crop_encoder = LabelEncoder()
    fert_encoder = LabelEncoder()

    df["soil_type"]       = soil_encoder.fit_transform(df["soil_type"])
    df["crop_type"]       = crop_encoder.fit_transform(df["crop_type"])
    df["fertilizer_name"] = fert_encoder.fit_transform(df["fertilizer_name"])

    print("Soil classes:", list(soil_encoder.classes_))
    print("Crop classes:", list(crop_encoder.classes_))
    print("Fertilizer classes:", list(fert_encoder.classes_))

    # ── 10. Split ─────────────────────────────────────────────────────────────
    FEATURE_COLS = ["temperature", "humidity", "moisture",
                    "soil_type",  "crop_type",
                    "nitrogen",   "phosphorous", "potassium"]
    TARGET_COL = "fertilizer_name"

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train size: {X_train.shape[0]} | Test size: {X_test.shape[0]}")

    # ── 11. Scale ─────────────────────────────────────────────────────────────
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)

    # ── 12. Train ─────────────────────────────────────────────────────────────
    sample_weights = compute_sample_weight(class_weight="balanced", y=y_train)

    log_model = LogisticRegression(max_iter=1000, random_state=42, class_weight="balanced")
    rf_model  = RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1, class_weight="balanced")
    xgb_model = XGBClassifier(
        n_estimators=300, learning_rate=0.05, max_depth=6,
        subsample=0.9, colsample_bytree=0.9, eval_metric="mlogloss",
        random_state=42, use_label_encoder=False
    )

    models_to_fit = {
        "Logistic Regression": (log_model, {}),
        "Random Forest":       (rf_model,  {}),
        "XGBoost":             (xgb_model, {"sample_weight": sample_weights}),
    }
    for name, (m, fit_kwargs) in models_to_fit.items():
        print(f"Training {name}...")
        m.fit(X_train_scaled, y_train, **fit_kwargs)
        acc = accuracy_score(y_test, m.predict(X_test_scaled))
        print(f"  {name} Accuracy: {acc:.4f}")

    print("Training Voting Ensemble (soft voting)...")
    voting_model = VotingClassifier(
        estimators=[("lr", log_model), ("rf", rf_model), ("xgb", xgb_model)],
        voting="soft",
        n_jobs=-1,
    )
    voting_model.fit(X_train_scaled, y_train, sample_weight=sample_weights)
    voting_pred = voting_model.predict(X_test_scaled)
    voting_acc  = accuracy_score(y_test, voting_pred)
    print(f"Voting Ensemble Accuracy: {voting_acc:.4f}")
    print(classification_report(y_test, voting_pred, target_names=fert_encoder.classes_))
    print("Confusion Matrix:\n", confusion_matrix(y_test, voting_pred))

    # ── 13. Save ──────────────────────────────────────────────────────────────
    joblib.dump(voting_model,  os.path.join(MODEL_DIR, "voting_classifier_model.pkl"))
    joblib.dump(soil_encoder,  os.path.join(MODEL_DIR, "soil_encoder.pkl"))
    joblib.dump(crop_encoder,  os.path.join(MODEL_DIR, "crop_encoder.pkl"))
    joblib.dump(fert_encoder,  os.path.join(MODEL_DIR, "fert_encoder.pkl"))
    joblib.dump(scaler,        os.path.join(MODEL_DIR, "scaler.pkl"))

    trained_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    metrics_payload = {
        "accuracy":  round(float(voting_acc), 4),
        "trainedAt": trained_at,
        "testSize":  int(X_test.shape[0]),
        "trainSize": int(X_train.shape[0]),
    }
    if version:
        metrics_payload["modelVersion"] = version

    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)

    print(f"Saved artifacts to model/  (accuracy={voting_acc:.4f})")
    return {
        "accuracy":   round(float(voting_acc), 4),
        "trainedAt":  trained_at,
        "trainSize":  int(X_train.shape[0]),
        "testSize":   int(X_test.shape[0]),
        "version":    version,
    }


# ===========================================================================
# Standalone script entry point
# ===========================================================================
if __name__ == "__main__":
    print("=" * 60)
    print("STEP 1 — Loading dataset")
    print("=" * 60)
    df = pd.read_csv(DATASET_PATH)
    print(f"Shape: {df.shape}")
    print("Columns:", df.columns.tolist())
    print(df.head())
    print(df.describe())

    # Derive version from existing metrics if available
    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    version = "1.0.0"
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path) as f:
                existing = json.load(f)
            version = existing.get("modelVersion", "1.0.0")
        except Exception:
            pass

    result = train_model_from_df(df, version=version)
    print(f"\nTraining complete! Accuracy: {result['accuracy']:.4f}")
