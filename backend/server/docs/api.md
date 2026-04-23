# Server REST API Reference

**Base URL:** `http://localhost:5000`  
**Format:** All requests and responses use `application/json`

---

## Authentication

Protected routes require a JWT access token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Admin routes additionally require `role: "admin"` on the authenticated user.

---

## Response Envelope

### Success

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

### Maintenance (503)

Returned by all non-exempt routes while model retraining is in progress:

```json
{
  "success": false,
  "maintenance": true,
  "message": "AgriFert is temporarily under maintenance while the AI model is being retrained. Please try again in a few minutes.",
  "startedAt": "2026-04-23T11:00:00.000Z"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `202` | Accepted (async task started) |
| `400` | Bad Request / Validation error |
| `401` | Unauthenticated |
| `403` | Forbidden (insufficient role) |
| `404` | Not Found |
| `409` | Conflict (e.g. already verified) |
| `429` | Too Many Requests |
| `500` | Internal Server Error |
| `503` | Service Unavailable (maintenance mode) |

---

## App Status — `/api/status`

### `GET /api/status`

No authentication required. Used by the frontend to poll for maintenance mode.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "inMaintenance": false,
    "startedAt": null
  }
}
```

When retraining is active:

```json
{
  "success": true,
  "data": {
    "inMaintenance": true,
    "startedAt": "2026-04-23T11:05:00.000Z"
  }
}
```

> The frontend `MaintenanceOverlay` component polls this endpoint every 10 seconds.
> Exempt from maintenance blocking.

---

## Auth — `/api/auth`

### `POST /api/auth/register`

> **Rate limit:** 3 req / 15 min / IP

Register a new user. Pass `adminKey` to create an admin account.

**Request**

```json
{
  "name":     "Varun",
  "email":    "varun@example.com",
  "password": "Secret123!",
  "adminKey": "(optional) matches ADMIN_SECRET_KEY env var"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | 2–60 chars, required |
| `email` | string | valid email, unique, required |
| `password` | string | min 8 chars, required |
| `adminKey` | string | optional |

**Response `201`**

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "_id": "...", "name": "Varun", "email": "...", "role": "user" },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

---

### `POST /api/auth/login`

> **Rate limit:** 5 req / 15 min / IP

**Request**

```json
{
  "email":    "varun@example.com",
  "password": "Secret123!"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "_id": "...", "name": "Varun", "email": "...", "role": "user" },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>"
  }
}
```

---

### `POST /api/auth/refresh`

Exchange a refresh token for a new token pair.

**Request**

```json
{ "refreshToken": "<jwt>" }
```

**Response `200`**

```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "accessToken": "<new-jwt>",
    "refreshToken": "<new-jwt>"
  }
}
```

---

### `POST /api/auth/logout` 🔒

Invalidate the current session's refresh token.

**Response `200`**

```json
{ "success": true, "message": "Logged out successfully" }
```

---

### `GET /api/auth/me` 🔒

Return the currently authenticated user.

**Response `200`**

```json
{
  "success": true,
  "message": "User fetched",
  "data": {
    "user": {
      "_id": "...", "name": "Varun", "email": "...",
      "role": "user", "isActive": true, "createdAt": "2025-03-24T..."
    }
  }
}
```

---

## Analyze — `/api/analyze` 🔒

> All routes require `Authorization: Bearer <token>`  
> **Rate limit (POST):** 20 req / 15 min / IP

### `POST /api/analyze`

Submit soil and crop parameters to receive a fertilizer recommendation.

**Request**

```json
{
  "soilType":    "Sandy",
  "cropType":    "Rice",
  "temperature": 28.5,
  "humidity":    72,
  "moisture":    45,
  "nitrogen":    40,
  "phosphorous": 30,
  "potassium":   20,
  "coordinates": { "lat": 18.52, "lon": 73.85 }
}
```

| Field | Type | Required | Notes |
|-------|------|:---:|-------|
| `soilType` | string | ✓ | See [valid values](../ml_service/docs/api.md#valid-input-values) |
| `cropType` | string | ✓ | See [valid values](../ml_service/docs/api.md#valid-input-values) |
| `temperature` | number | ✓ | °C |
| `humidity` | number | ✓ | % |
| `moisture` | number | ✓ | % |
| `nitrogen` | number | ✓ | kg/ha, min 0 |
| `phosphorous` | number | ✓ | kg/ha, min 0 |
| `potassium` | number | ✓ | kg/ha, min 0 |
| `coordinates` | object | – | `{ lat, lon }` — used for live weather lookup |

**Response `201`**

```json
{
  "success": true,
  "message": "Analysis complete",
  "data": {
    "predictionId": "6612abc...",
    "fertilizer": {
      "name": "Urea",
      "quantity": { "nitrogen": 80, "phosphorus": 40, "potassium": 20 },
      "totalQuantity": 140,
      "unit": "kg/ha"
    },
    "yieldImprovement": {
      "percentage": 18.4,
      "bushelsPerAcre": 31
    },
    "soilHealthTips": [
      "Add organic compost to improve soil structure.",
      "Test soil pH every season."
    ],
    "modelConfidence": 0.9214,
    "processingMs": 23.4
  }
}
```

> After receiving results, the user can download a formatted PDF report via the browser print dialog.

---

### `GET /api/analyze/history`

Paginated prediction history for the authenticated user.

**Query Parameters**

| Param | Type | Default | Max |
|-------|------|---------|-----|
| `page` | integer | `1` | — |
| `limit` | integer | `10` | `50` |

**Response `200`**

```json
{
  "success": true,
  "message": "History fetched",
  "data": {
    "predictions": [ { "..." } ],
    "pagination": { "total": 42, "page": 1, "limit": 10, "totalPages": 5 }
  }
}
```

---

### `GET /api/analyze/:id`

Fetch a single prediction. Users can only access their own records.

**Errors:** `404` if not found or belongs to another user.

---

## Weather — `/api/weather` 🔒

### `GET /api/weather`

Proxy to OpenWeatherMap. Returns weather for the given coordinates.

**Query Parameters**

| Param | Required | Description |
|-------|:---:|-------------|
| `lat` | ✓ | Latitude |
| `lon` | ✓ | Longitude |

**Response `200`**

```json
{
  "success": true,
  "message": "Weather fetched",
  "data": {
    "temperature": 28.5,
    "humidity":    72,
    "moisture":    45,
    "description": "broken clouds",
    "city":        "Pune"
  }
}
```

---

## User Profile — `/api/users` 🔒

### `GET /api/users/profile`

Returns the authenticated user's profile and aggregated stats.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "name": "Varun", "email": "...", "role": "user", "createdAt": "..." },
    "stats": {
      "totalAnalyses": 12,
      "avgYieldImprovement": 14.3,
      "avgModelConfidence": 0.871,
      "topFertilizer": "Urea",
      "topCrop": "rice"
    }
  }
}
```

---

### `GET /api/users/profile/history`

Paginated prediction history for the authenticated user.

| Param | Default | Max |
|-------|---------|-----|
| `page` | `1` | — |
| `limit` | `10` | `50` |

---

## Admin — `/api/admin` 🔒🛡️

> Requires `role: "admin"` in addition to a valid JWT.  
> These routes are **exempt from maintenance mode blocking**.

### `GET /api/admin/stats`

Aggregate dashboard statistics.

**Response `200`**

```json
{
  "success": true,
  "message": "Admin stats fetched",
  "data": {
    "totalSubmissions": 940,
    "totalUsers": 128,
    "cropDistribution": [ { "name": "rice", "value": 312 } ],
    "fertilizerUsage":  [ { "name": "Urea", "usage": 312 } ],
    "yieldTrends":      [ { "month": "Apr 2026", "yield": 18.2, "count": 45 } ],
    "modelMetrics": {
      "modelVersion": "1.2.0",
      "predictions": 940,
      "accuracy": 99.1,
      "lastUpdate": "2026-04-23T10:00:00Z"
    },
    "continuousLearning": {
      "totalVerified": 120,
      "verifiedSinceLastRetrain": 3,
      "retrainThreshold": 50,
      "pendingVerifications": 37
    },
    "averageTemperature": 28.4,
    "averageHumidity": 71.2,
    "averageMoisture": 44.8,
    "averageNPK": { "n": 41.3, "p": 30.1, "k": 19.7 },
    "averageYieldImprovement": 16.8
  }
}
```

---

### `GET /api/admin/predictions`

All predictions with filtering and pagination.

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20` | Items per page (max `100`) |
| `cropType` | — | Filter by crop name |
| `sortBy` | `createdAt` | Sort field |
| `order` | `desc` | `asc` or `desc` |

---

### `GET /api/admin/users`

List all users (passwords and refresh tokens excluded).

| Param | Default | Max |
|-------|---------|-----|
| `page` | `1` | — |
| `limit` | `20` | `100` |

---

### `PATCH /api/admin/users/:id/deactivate`

Deactivate a user and immediately invalidate their session.

**Response `200`**

```json
{ "success": true, "message": "User deactivated successfully" }
```

**Errors:** `400` self-deactivation, `404` user not found.

---

## Continuous Learning — `/api/admin` 🔒🛡️

### `GET /api/admin/verifications`

Returns all predictions that have **not** yet been verified by an admin.  
Displayed in the dedicated **Verification Centre** at `/admin/verifications`.  
Cards are collapsed by default (summary row); clicking expands full model output.

| Param | Default | Max |
|-------|---------|-----|
| `page` | `1` | — |
| `limit` | `20` | `100` |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "_id": "...",
        "userId": { "_id": "...", "name": "Farmer Joe", "email": "joe@farm.com" },
        "input": {
          "soilType": "Black",
          "cropType": "rice",
          "temperature": 28.5,
          "humidity": 72,
          "moisture": 45,
          "nitrogen": 40,
          "phosphorous": 30,
          "potassium": 20
        },
        "output": {
          "fertilizerName": "Urea",
          "totalQty": 140,
          "yieldImprovement": 18,
          "modelConfidence": 0.9214,
          "soilHealthTips": ["Add organic compost...", "Test soil pH..."]
        },
        "createdAt": "2026-04-01T10:00:00Z"
      }
    ],
    "pagination": { "total": 38, "page": 1, "limit": 20, "totalPages": 2 }
  }
}
```

> The admin can **Download PDF** from any expanded card (browser print dialog).

---

### `POST /api/admin/verifications/:predictionId/verify`

Mark a prediction as verified after the admin has contacted the farmer and confirmed the outcome.  
Creates a `VerifiedRecord` and asynchronously triggers a retrain if `RETRAIN_THRESHOLD` is reached.  
During retraining, **maintenance mode is automatically activated and then cleared**.

**Request (optional)**

```json
{ "note": "Farmer confirmed good yield this season." }
```

**Response `201`**

```json
{
  "success": true,
  "message": "Prediction verified successfully",
  "data": {
    "verified": { "_id": "...", "predictionId": "...", "usedInRetrain": false }
  }
}
```

**Errors:** `404` prediction not found, `409` already verified.

---

## Health Check

### `GET /health`

No authentication. No rate limit. Exempt from maintenance mode.

**Response `200`**

```json
{
  "status": "ok",
  "env":    "production",
  "uptime": 3600
}
```

---

## Rate Limits Summary

| Route | Limit |
|-------|-------|
| `POST /api/auth/register` | 3 req / 15 min / IP |
| `POST /api/auth/login` | 5 req / 15 min / IP |
| `POST /api/analyze` | 20 req / 15 min / IP |
| All other `/api/*` | Global limiter (env-configurable) |

---

## Auto-Cleanup (Unverified Prediction TTL)

The server runs a daily job that deletes unverified predictions older than
`UNVERIFIED_TTL_DAYS` (default **90 days**). Predictions with a corresponding
`VerifiedRecord` are never auto-deleted.
