# ML Service API Reference

**Base URL:** `http://localhost:8000`  
**Caller:** Express server only — **not** exposed to the browser.

---

## Authentication

Every request must include the shared internal API key:

```
X-Internal-API-Key: <ML_SERVICE_API_KEY>
```

This key is set in both `backend/ml_service/.env` and `backend/server/.env`.  
Missing or wrong key returns `401 Unauthorized`.

---

## Endpoints

### `POST /predict`

Run model inference and return fertilizer recommendation.

**Headers**

```
Content-Type: application/json
X-Internal-API-Key: <key>
```

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
  "modelVersion":   "1.0.0",
  "processingMs":   21.3
}
```

| Field | Type | Description |
|-------|------|-------------|
| `fertilizerName` | string | Predicted fertilizer name |
| `confidence` | float | Probability of top class (0–1) |
| `modelVersion` | string | Version tag from `MODEL_VERSION` env var |
| `processingMs` | float | Inference wall-clock time in ms |

**Errors**

| Code | Reason |
|------|--------|
| `400` | Missing fields or invalid values |
| `401` | Missing or incorrect `X-Internal-API-Key` |
| `422` | NaN or non-numeric values in numeric fields |

---

### `GET /health`

Health check — no API key required.

**Response `200`**

```json
{
  "status": "ok",
  "modelVersion": "1.0.0",
  "validSoilTypes": ["Black", "Clayey", "Loamy", "Red", "Sandy"],
  "validCropTypes": [
    "Barley", "Cotton", "Ground Nuts", "Maize", "Millets",
    "Oil seeds", "Paddy", "Pulses", "Sugarcane", "Tobacco", "Wheat"
  ]
}
```

---

## Valid Input Values

### `soil_type`

| Value | Notes |
|-------|-------|
| `Sandy` | |
| `Loamy` | |
| `Black` | |
| `Red` | |
| `Clayey` | |

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
   │    Temperature, Humidity, Moisture,
   │    Soil Type, Crop Type,
   │    Nitrogen, Phosphorous, Potassium
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
