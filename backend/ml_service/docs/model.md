# ML Model — Architecture & Training

## Overview

AgriFert uses a **VotingClassifier ensemble** (soft voting) trained on the Fertilizer Recommendation dataset to predict the optimal fertilizer given soil and environmental conditions.

---

## Model Files

All serialised artifacts live in `backend/ml_service/model/`:

| File | Contents |
|------|----------|
| `voting_classifier_model.pkl` | Trained VotingClassifier |
| `soil_encoder.pkl` | LabelEncoder for `Soil Type` |
| `crop_encoder.pkl` | LabelEncoder for `Crop Type` |
| `fert_encoder.pkl` | LabelEncoder for `Fertilizer Name` (target) |
| `scaler.pkl` | StandardScaler fitted on training features |

> All files are loaded **once at startup** — not per request — for low-latency inference.

---

## Dataset

**File:** `backend/ml_service/dataset/Fertilizer_Prediction.csv`

| Column | Type | Description |
|--------|------|-------------|
| `Temperature` | float | Ambient temperature (°C) |
| `Humidity` | float | Relative humidity (%) |
| `Moisture` | float | Soil moisture (%) |
| `Soil Type` | categorical | Sandy · Loamy · Black · Red · Clayey |
| `Crop Type` | categorical | Maize · Sugarcane · Cotton · … |
| `Nitrogen` | float | Soil nitrogen content (kg/ha) |
| `Phosphorous` | float | Soil phosphorous content (kg/ha) |
| `Potassium` | float | Soil potassium content (kg/ha) |
| `Fertilizer Name` | categorical | **Target label** |

---

## Training Pipeline

Run `python train_model.py` from `backend/ml_service/`:

```
1. Load CSV dataset
2. LabelEncode: Soil Type, Crop Type, Fertilizer Name
3. Split features / target
4. Train/test split  (80 / 20, stratified)
5. StandardScaler.fit_transform(X_train)
6. VotingClassifier(estimators=[
       ("rf",  RandomForestClassifier(n_estimators=200)),
       ("lr",  LogisticRegression(max_iter=1000)),
       ("knn", KNeighborsClassifier(n_neighbors=5))
   ], voting="soft")
7. .fit(X_train_scaled, y_train)
8. Evaluate on X_test_scaled → accuracy, f1_weighted
9. joblib.dump() all artifacts to model/
```

---

## Feature Column Order

The scaler and model expect columns in **exactly** this order:

```python
["Temperature", "Humidity", "Moisture", "Soil Type", "Crop Type",
 "Nitrogen", "Phosphorous", "Potassium"]
```

Sending features in any other order will produce wrong predictions.

---

## Performance Metrics

Metrics are printed at the end of `train_model.py` and saved to `inspect_out.txt`:

| Metric | Value (example) |
|--------|----------------|
| Accuracy | ~99% |
| F1 (weighted) | ~0.99 |
| Classes | 7 fertilizer types |

> Exact numbers depend on your dataset version and random seed.

---

## Retraining

```bash
cd backend/ml_service
source venv/bin/activate        # or venv\Scripts\activate on Windows
python train_model.py           # overwrites model/*.pkl
python app.py                   # reload service
```

Bump `MODEL_VERSION` in `.env` after each retrain so prediction records track which model version was used.
