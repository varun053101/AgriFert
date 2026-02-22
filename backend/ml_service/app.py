import os
import time
from functools import wraps

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request
from dotenv import load_dotenv


load_dotenv()

app = Flask(__name__)

# ── Load model + encoders + scaler at startup ─────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

def _load(filename):
    import joblib
    path = os.path.join(MODEL_DIR, filename)
    try:
        obj = joblib.load(path)
        print(f"[ML] Loaded {filename}")
        return obj
    except FileNotFoundError:
        print(f"[ML][FATAL] Not found: {path}")
        raise SystemExit(1)
    except Exception as e:
        print(f"[ML][FATAL] Failed to load {filename}: {e}")
        raise SystemExit(1)

model        = _load("voting_classifier_model.pkl")
soil_encoder = _load("soil_encoder.pkl")
crop_encoder = _load("crop_encoder.pkl")
fert_encoder = _load("fert_encoder.pkl")
scaler       = _load("scaler.pkl")

MODEL_VERSION    = os.environ.get("MODEL_VERSION", "1.0.0")
INTERNAL_API_KEY = os.environ.get("ML_SERVICE_API_KEY", "")

# Valid label sets (from training encoders)
VALID_SOIL_TYPES = list(soil_encoder.classes_)
VALID_CROP_TYPES = list(crop_encoder.classes_)

# ── Auth decorator ────────────────────────────────────────────────────────────
def require_api_key(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        key = request.headers.get("X-Internal-API-Key", "")
        if not INTERNAL_API_KEY or key != INTERNAL_API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

# ── Feature order — matches training exactly ─────────────────────────────────
# Temperature, Humidity, Moisture, Soil Type (encoded), Crop Type (encoded),
# Nitrogen, Phosphorous, Potassium
NUMERIC_FIELDS = ["temperature", "humidity", "moisture",
                  "nitrogen", "phosphorous", "potassium"]

# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.route("/predict", methods=["POST"])
@require_api_key
def predict():
    data = request.get_json(force=True)

    # Validate numeric fields
    missing = [f for f in NUMERIC_FIELDS if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # Validate categorical fields
    soil_type = data.get("soil_type", "")
    crop_type = data.get("crop_type", "")

    if not soil_type:
        return jsonify({"error": "Missing field: soil_type"}), 400
    if not crop_type:
        return jsonify({"error": "Missing field: crop_type"}), 400

    # Normalise casing to match encoder classes (title-case)
    soil_type_norm = soil_type.strip().title()
    crop_type_norm = crop_type.strip().title()

    if soil_type_norm not in VALID_SOIL_TYPES:
        return jsonify({
            "error": f"Invalid soil_type '{soil_type}'. Valid: {VALID_SOIL_TYPES}"
        }), 400
    if crop_type_norm not in VALID_CROP_TYPES:
        return jsonify({
            "error": f"Invalid crop_type '{crop_type}'. Valid: {VALID_CROP_TYPES}"
        }), 400

    try:
        soil_enc = soil_encoder.transform([soil_type_norm])[0]
        crop_enc = crop_encoder.transform([crop_type_norm])[0]

        # Build named DataFrame in training column order so the scaler
        # doesn't warn about missing feature names
        FEATURE_COLS = [
            "Temperature", "Humidity", "Moisture",
            "Soil Type", "Crop Type",
            "Nitrogen", "Phosphorous", "Potassium",
        ]
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

        scaled = scaler.transform(raw)

    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid feature values: {e}"}), 400

    start = time.time()
    pred_encoded = model.predict(scaled)[0]
    fertilizer_name = fert_encoder.inverse_transform([pred_encoded])[0]

    confidence = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(scaled)[0]
        confidence = round(float(np.max(proba)), 4)

    elapsed_ms = round((time.time() - start) * 1000, 2)

    return jsonify({
        "fertilizerName": fertilizer_name,
        "confidence":     confidence,
        "modelVersion":   MODEL_VERSION,
        "processingMs":   elapsed_ms,
    })


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status":       "ok",
        "modelVersion": MODEL_VERSION,
        "validSoilTypes": VALID_SOIL_TYPES,
        "validCropTypes": VALID_CROP_TYPES,
    })


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("FLASK_ENV") == "development"
    print(f"[ML] Starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
