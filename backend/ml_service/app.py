import json
import os
import time
import threading
import warnings
from functools import wraps

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ── Suppress sklearn feature-name warnings ────────────────────────────────────
warnings.filterwarnings(
    "ignore",
    message="X does not have valid feature names",
    category=UserWarning,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(__file__)
MODEL_DIR    = os.path.join(BASE_DIR, "model")
DATASET_DIR  = os.path.join(BASE_DIR, "dataset")
DATASET_PATH = os.path.join(DATASET_DIR, "dataset.csv")

# ── Model state (module-level, swapped atomically on retrain) ─────────────────
_model_lock = threading.Lock()

class ModelState:
    model        = None
    soil_encoder = None
    crop_encoder = None
    fert_encoder = None
    scaler       = None
    load_errors  = []
    valid_soil   = []
    valid_crop   = []

_state = ModelState()

# ── Load artifacts ─────────────────────────────────────────────────────────────
def _load(filename: str, errors: list):
    path = os.path.join(MODEL_DIR, filename)
    try:
        obj = joblib.load(path)
        print(f"[ML] Loaded {filename}")
        return obj
    except FileNotFoundError:
        msg = f"Model file not found: {path}  →  run python train_model.py first"
        print(f"[ML][ERROR] {msg}")
        errors.append(msg)
        return None
    except Exception as e:
        msg = f"Failed to load {filename}: {e}"
        print(f"[ML][ERROR] {msg}")
        errors.append(msg)
        return None


def _reload_artifacts():
    """Load (or hot-swap) all model artifacts from disk into _state."""
    errors = []
    model        = _load("voting_classifier_model.pkl", errors)
    soil_encoder = _load("soil_encoder.pkl", errors)
    crop_encoder = _load("crop_encoder.pkl", errors)
    fert_encoder = _load("fert_encoder.pkl", errors)
    scaler       = _load("scaler.pkl", errors)

    with _model_lock:
        _state.model        = model
        _state.soil_encoder = soil_encoder
        _state.crop_encoder = crop_encoder
        _state.fert_encoder = fert_encoder
        _state.scaler       = scaler
        _state.load_errors  = errors
        _state.valid_soil   = list(soil_encoder.classes_) if soil_encoder else []
        _state.valid_crop   = list(crop_encoder.classes_) if crop_encoder else []


# Initial load at startup
_reload_artifacts()

MODEL_VERSION    = os.environ.get("MODEL_VERSION", "1.0.0")
INTERNAL_API_KEY = os.environ.get("ML_SERVICE_API_KEY", "")

# ── Auth decorator ─────────────────────────────────────────────────────────────
def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("X-Internal-API-Key", "")
        if not INTERNAL_API_KEY or key != INTERNAL_API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


# ── Feature column names (match training DataFrame columns exactly) ────────────
FEATURE_COLS = [
    "temperature", "humidity", "moisture",
    "soil_type",   "crop_type",
    "nitrogen",    "phosphorous", "potassium",
]

NUMERIC_FIELDS = ["temperature", "humidity", "moisture",
                  "nitrogen", "phosphorous", "potassium"]

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.route("/predict", methods=["POST"])
@require_api_key
def predict():
    if _state.load_errors:
        return jsonify({
            "error": "Model not ready. Run train_model.py first.",
            "details": _state.load_errors,
        }), 503

    data = request.get_json(force=True)

    missing = [f for f in NUMERIC_FIELDS if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    soil_type = data.get("soil_type", "")
    crop_type = data.get("crop_type", "")
    if not soil_type:
        return jsonify({"error": "Missing field: soil_type"}), 400
    if not crop_type:
        return jsonify({"error": "Missing field: crop_type"}), 400

    soil_type_norm = soil_type.strip().title()
    crop_type_norm = crop_type.strip().title()

    with _model_lock:
        valid_soil = _state.valid_soil
        valid_crop = _state.valid_crop

    if soil_type_norm not in valid_soil:
        return jsonify({"error": f"Invalid soil_type '{soil_type}'. Valid: {valid_soil}"}), 400
    if crop_type_norm not in valid_crop:
        return jsonify({"error": f"Invalid crop_type '{crop_type}'. Valid: {valid_crop}"}), 400

    try:
        with _model_lock:
            soil_enc = _state.soil_encoder.transform([soil_type_norm])[0]
            crop_enc = _state.crop_encoder.transform([crop_type_norm])[0]

            raw = pd.DataFrame([[
                float(data["temperature"]),
                float(data["humidity"]),
                float(data["moisture"]),
                float(soil_enc),
                float(crop_enc),
                float(data["nitrogen"]),
                float(data["phosphorous"]),
                float(data["potassium"]),
            ]], columns=FEATURE_COLS)

            scaled = _state.scaler.transform(raw)

        start = time.time()
        with _model_lock:
            pred_encoded    = _state.model.predict(scaled)[0]
            fertilizer_name = _state.fert_encoder.inverse_transform([pred_encoded])[0]

            confidence = None
            if hasattr(_state.model, "predict_proba"):
                proba      = _state.model.predict_proba(scaled)[0]
                confidence = round(float(np.max(proba)), 4)

    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid feature values: {e}"}), 400

    elapsed_ms = round((time.time() - start) * 1000, 2)

    return jsonify({
        "fertilizerName": fertilizer_name,
        "confidence":     confidence,
        "modelVersion":   MODEL_VERSION,
        "processingMs":   elapsed_ms,
    })


@app.route("/retrain", methods=["POST"])
@require_api_key
def retrain():
    """
    Continuous learning endpoint.
    Accepts verified records from the Node server, appends them to the
    dataset, retrains the model in-process, saves new artifacts and
    hot-swaps the running model without restarting the service.
    """
    global MODEL_VERSION

    body = request.get_json(force=True)
    records = body.get("records", [])

    if not records:
        return jsonify({"error": "No records provided."}), 400

    # ── 1. Build new-data DataFrame ───────────────────────────────────────────
    required_cols = ["soil_type", "crop_type", "temperature", "humidity",
                     "moisture", "nitrogen", "phosphorous", "potassium",
                     "fertilizer_name"]

    try:
        new_df = pd.DataFrame(records)
        missing_cols = [c for c in required_cols if c not in new_df.columns]
        if missing_cols:
            return jsonify({"error": f"Missing columns in records: {missing_cols}"}), 400

        # Normalise casing
        new_df["soil_type"]       = new_df["soil_type"].str.strip().str.title()
        new_df["crop_type"]       = new_df["crop_type"].str.strip().str.title()
        new_df["fertilizer_name"] = new_df["fertilizer_name"].str.strip()

        # Keep only the required columns
        new_df = new_df[required_cols]
    except Exception as e:
        return jsonify({"error": f"Invalid record format: {e}"}), 400

    # ── 2. Load existing dataset and append ───────────────────────────────────
    try:
        existing_df = pd.read_csv(DATASET_PATH)
        combined_df = pd.concat([existing_df, new_df], ignore_index=True)
        combined_df.to_csv(DATASET_PATH, index=False)
        print(f"[RETRAIN] Appended {len(new_df)} records → dataset now has {len(combined_df)} rows.")
    except Exception as e:
        return jsonify({"error": f"Failed to update dataset: {e}"}), 500

    # ── 3. Retrain using the refactored pipeline ───────────────────────────────
    try:
        from train_model import train_model_from_df

        # Bump version: 1.0.0 → 1.1.0, 1.9.0 → 1.10.0
        parts = MODEL_VERSION.split(".")
        parts[1] = str(int(parts[1]) + 1)
        new_version = ".".join(parts)

        result = train_model_from_df(combined_df, version=new_version)
    except Exception as e:
        return jsonify({"error": f"Training failed: {e}"}), 500

    # ── 4. Hot-swap artifacts ─────────────────────────────────────────────────
    _reload_artifacts()
    MODEL_VERSION = new_version
    print(f"[RETRAIN] Model hot-swapped → version {MODEL_VERSION}")

    return jsonify({
        "success":      True,
        "newVersion":   new_version,
        "accuracy":     result["accuracy"],
        "trainedAt":    result["trainedAt"],
        "recordsAdded": len(new_df),
        "totalRows":    len(combined_df),
    })


@app.route("/metrics", methods=["GET"])
@require_api_key
def metrics():
    """Return the real test-set accuracy saved by the last train/retrain run."""
    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    if not os.path.exists(metrics_path):
        return jsonify({
            "error": "metrics.json not found — run python train_model.py to generate it"
        }), 404
    with open(metrics_path, "r") as f:
        data = json.load(f)
    data["modelVersion"] = MODEL_VERSION
    return jsonify(data)


@app.route("/health", methods=["GET"])
def health():
    if _state.load_errors:
        return jsonify({
            "status":   "error",
            "message":  "Model artifacts missing — run python train_model.py",
            "details":  _state.load_errors,
        }), 503
    return jsonify({
        "status":         "ok",
        "modelVersion":   MODEL_VERSION,
        "validSoilTypes": _state.valid_soil,
        "validCropTypes": _state.valid_crop,
    })


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("FLASK_ENV") == "development"
    print(f"[ML] Starting on port {port}  (model ready: {not bool(_state.load_errors)})")
    app.run(host="0.0.0.0", port=port, debug=debug)
