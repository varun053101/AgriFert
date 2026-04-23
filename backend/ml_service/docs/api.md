# ML Service API Reference

**Base URL:** `http://localhost:8000`  
**Caller:** Express server only — **not** exposed to the browser.

---

## Authentication

Every request (except `/health`) must include the shared internal API key:

```
X-Internal-API-Key: <ML_SERVICE_API_KEY>
```

This key is set in both `backend/ml_service/.env` and `backend/server/.env`.  
Missing or wrong key returns `401 Unauthorized`.

---

## Endpoints

### `POST /predict`

Run model inference and return fertilizer recommendation.

**Request Body**

```json
{
  "temperature": 28.5,
  "humidity":    72,
  "moisture":    45,
  "soil_type":   "Sandy",
  "crop_type":   "Rice",
  "nitrogen":    40,
  "phosphorous": 30,
  "potassium":   20
}
```

| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `temperature` | float | ✓ | °C |
| `humidity` | float | ✓ | % |
| `moisture` | float | ✓ | % |
| `soil_type` | string | ✓ | Case-insensitive, title-cased internally |
| `crop_type` | string | ✓ | Case-insensitive, title-cased internally |
| `nitrogen` | float | ✓ | kg/ha |
| `phosphorous` | float | ✓ | kg/ha |
| `potassium` | float | ✓ | kg/ha |

**Response `200`**

```json
{
  "fertilizerName": "Urea",
  "confidence":     0.9214,
  "modelVersion":   "1.2.0",
  "processingMs":   21.3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `fertilizerName` | string | Predicted fertilizer name |
| `confidence` | float | Probability of top class (0–1) |
| `modelVersion` | string | Version tag from `metrics.json` |
| `processingMs` | float | Inference wall-clock time in ms |

**Errors**

| Code | Reason |
|------|--------|
| `400` | Missing fields or invalid values |
| `401` | Missing or incorrect `X-Internal-API-Key` |
| `422` | NaN or non-numeric values in numeric fields |

---

### `GET /metrics`

Returns the real test-set accuracy from the last train/retrain run.  
Requires `X-Internal-API-Key`.

**Response `200`**

```json
{
  "accuracy":     0.9914,
  "trainedAt":    "2026-04-23T10:00:00+00:00",
  "trainSize":    40000,
  "testSize":     10000,
  "modelVersion": "1.2.0"
}
```

---

### `GET /health`

Health check — no API key required.

**Response `200`**

```json
{
  "status": "ok",
  "modelVersion": "1.2.0",
  "validSoilTypes": ["Black", "Clayey", "Loamy", "Red", "Sandy"],
  "validCropTypes": [
    "Barley", "Cotton", "Ground Nuts", "Maize", "Millets",
    "Oil seeds", "Paddy", "Pulses", "Sugarcane", "Tobacco", "Wheat"
  ]
}
```

---

### `POST /retrain`

**Continuous Learning endpoint.** Called **automatically** by the Node server
when the verified-record count reaches `RETRAIN_THRESHOLD`. This endpoint is
never called manually from the admin dashboard.

During this call the Node server activates **maintenance mode** — all
non-admin frontend routes return `503` until retraining completes.

**Request Body**

```json
{
  "records": [
    {
      "soil_type":       "Black",
      "crop_type":       "Rice",
      "temperature":     28.5,
      "humidity":        72,
      "moisture":        45,
      "nitrogen":        40,
      "phosphorous":     30,
      "potassium":       20,
      "fertilizer_name": "Urea"
    }
  ]
}
```

**What happens internally**

1. Records are appended to `dataset/dataset.csv`
2. Full combined dataset is re-trained through the complete pipeline
3. New `.pkl` artifacts overwrite the old ones
4. In-process model is hot-swapped (no Flask restart required)
5. `model/metrics.json` is updated with new accuracy and version

**Response `200`**

```json
{
  "success":      true,
  "newVersion":   "1.3.0",
  "accuracy":     0.9921,
  "trainedAt":    "2026-04-23T11:00:00+00:00",
  "recordsAdded": 50,
  "totalRows":    50050
}
```

**Errors**

| Code | Reason |
|------|--------|
| `400` | Empty `records` array or missing required columns |
| `401` | Missing / incorrect `X-Internal-API-Key` |
| `500` | Dataset write or training failure |

> ⚠️ Retraining typically takes **2–5 minutes** on a standard machine.
> The Node server uses a 5-minute timeout for this request.
> Users see the `MaintenanceOverlay` during this window.

---

## Valid Input Values

### `soil_type`

| Value |
|-------|
| `Sandy` |
| `Loamy` |
| `Black` |
| `Red` |
| `Clayey` |

### `crop_type`

| Value |
|-------|
| `Maize` |
| `Sugarcane` |
| `Cotton` |
| `Tobacco` |
| `Paddy` |
| `Barley` |
| `Wheat` |
| `Millets` |
| `Oil seeds` |
| `Pulses` |
| `Ground Nuts` |

> Values are normalised to **title-case** before lookup. Sending `"sandy"` or `"SANDY"` is valid.

---

## Feature Pipeline

```
Raw JSON
   │
   ├─ Validate fields (missing → 400)
   ├─ Normalise soil_type / crop_type → title-case
   ├─ LabelEncoder: soil_type → integer
   ├─ LabelEncoder: crop_type → integer
   ├─ Build DataFrame with training column order:
   │    temperature, humidity, moisture,
   │    soil_type, crop_type,
   │    nitrogen, phosphorous, potassium
   ├─ StandardScaler.transform()
   └─ VotingClassifier.predict() + predict_proba()
```

---

## Error Reference

```json
{ "error": "Missing fields: humidity, moisture" }
{ "error": "Invalid soil_type 'clay'. Valid: ['Black', 'Clayey', ...]" }
{ "error": "Invalid feature values: could not convert string to float: 'abc'" }
{ "error": "Unauthorized" }
```
