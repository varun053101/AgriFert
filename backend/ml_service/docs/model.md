# ML Model — Architecture & Training

## Overview

AgriFert uses a **VotingClassifier ensemble** (soft voting) trained on a
50,000-row Fertilizer Recommendation dataset to predict the optimal fertilizer
given soil and environmental conditions.

---

## Model Files

All serialised artifacts live in `backend/ml_service/model/` (git-ignored):

| File | Contents |
|------|----------|
| `voting_classifier_model.pkl` | Trained VotingClassifier |
| `soil_encoder.pkl` | LabelEncoder for `soil_type` |
| `crop_encoder.pkl` | LabelEncoder for `crop_type` |
| `fert_encoder.pkl` | LabelEncoder for `fertilizer_name` (target) |
| `scaler.pkl` | StandardScaler fitted on training features |
| `metrics.json` | Accuracy, train/test sizes, version, trained timestamp |

> All files are loaded **once at startup** and **hot-swapped on retrain** —
> not per request — for low-latency inference.

---

## Dataset

**File:** `backend/ml_service/dataset/dataset.csv`

| Column | Type | Description |
|--------|------|-------------|
| `temperature` | float | Ambient temperature (°C) |
| `humidity` | float | Relative humidity (%) |
| `moisture` | float | Soil moisture (%) |
| `soil_type` | categorical | Black · Clayey · Loamy · Red · Sandy |
| `crop_type` | categorical | Maize · Sugarcane · Cotton · … |
| `nitrogen` | float | Soil nitrogen content (kg/ha) |
| `phosphorous` | float | Soil phosphorous content (kg/ha) |
| `potassium` | float | Soil potassium content (kg/ha) |
| `fertilizer_name` | categorical | **Target label** |

> The dataset grows over time as admin-verified records are appended via
> the Continuous Learning retrain pipeline.

---

## Training Pipeline

The core pipeline lives in `train_model_from_df(df, version)` inside
`train_model.py`. It is invoked both by the standalone script and the
Flask `/retrain` endpoint.

```
1.  Load DataFrame (from CSV on first run; from /retrain payload on CL retrain)
2.  Drop nulls, drop duplicates, remove single-member classes
3.  Add small Gaussian noise (1% std) to numeric features → regularisation
4.  Clip unrealistic values (temp 10–50°C, humidity 10–100%, etc.)
5.  Shuffle dataset (random_state=42)
6.  LabelEncode: soil_type, crop_type, fertilizer_name
7.  Train/test split  (80 / 20, stratified)
8.  StandardScaler.fit_transform(X_train)
9.  Train three base estimators with class balancing:
     ┌── LogisticRegression(class_weight="balanced", max_iter=1000)
     ├── RandomForestClassifier(n_estimators=300, class_weight="balanced")
     └── XGBClassifier(n_estimators=300, use_label_encoder=False,
                       sample_weight=balanced_weights)
10. VotingClassifier(estimators=[lr, rf, xgb], voting="soft")
    → fit on balanced sample weights
11. Evaluate on X_test_scaled → accuracy + classification report
12. Save all .pkl artifacts + metrics.json
13. Hot-swap in-process model (only during /retrain — no Flask restart needed)
```

---

## Feature Column Order

The scaler and model expect columns in **exactly** this order:

```python
["temperature", "humidity", "moisture", "soil_type", "crop_type",
 "nitrogen", "phosphorous", "potassium"]
```

> Sending features in any other order will produce wrong predictions.

---

## Performance Metrics

Stored in `model/metrics.json` after every train/retrain:

```json
{
  "accuracy":     0.9914,
  "trainedAt":    "2026-04-23T10:00:00+00:00",
  "trainSize":    40000,
  "testSize":     10000,
  "modelVersion": "1.2.0"
}
```

Served by `GET /metrics` so the Admin Dashboard always reflects the live model accuracy.

---

## Retraining

### Initial training (first run / manual reset)

```bash
cd backend/ml_service
venv\Scripts\Activate.ps1   # Windows
# source venv/bin/activate  # macOS / Linux
python train_model.py       # overwrites model/*.pkl and metrics.json
```

The script reads `MODEL_VERSION` from `.env`. Bump it manually if you want to
mark a major change; the CL pipeline auto-increments the minor version
(e.g. `1.0.0 → 1.1.0`) on each successful retrain.

### Continuous Learning (fully automatic)

Retraining is **triggered automatically** by the Node server — there is
no manual "Retrain Now" button. The flow is:

```
1. Admin verifies a prediction on the Verification Centre page
   POST /api/admin/verifications/:id/verify
2. Server creates a VerifiedRecord in MongoDB
3. Server counts usedInRetrain=false records
4. If count ≥ RETRAIN_THRESHOLD (default 50):
   a. maintenanceMode.set(true)
      → all non-admin API routes return 503
      → frontend MaintenanceOverlay blocks the UI
   b. Server → POST /retrain (Flask) with verified records payload
   c. Flask appends records to dataset.csv
   d. Flask retrains full pipeline (steps 1–12 above)
   e. Flask saves new artifacts + bumps minor version
   f. Flask hot-swaps in-process model
   g. Server marks all consumed VerifiedRecords usedInRetrain=true
   h. maintenanceMode.set(false)
      → 503 lifted, UI automatically resumes
```

See [architecture.md](../../../docs/architecture.md) for the full sequence.

---

## Target Classes (Fertilizer Labels)

| Label | Description |
|-------|-------------|
| `10-26-26` | High phosphorus-potassium blend |
| `14-35-14` | Balanced NPK with high phosphorus |
| `17-17-17` | Balanced NPK |
| `20-20` | Nitrogen-phosphorus blend |
| `28-28` | High nitrogen-phosphorus blend |
| `DAP` | Di-Ammonium Phosphate |
| `Urea` | High-nitrogen fertilizer |

---

## Agronomic Heuristic Override

After model inference the Flask service applies a rule-based heuristic
layer that overrides predictions when soil-nutrient levels are severely
imbalanced (e.g. very high nitrogen → Urea is suppressed in favour of a
phosphorus or potassium source). This ensures recommendations remain
agronomically sound even when the model is marginally confident.
