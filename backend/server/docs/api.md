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

---

## Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request / Validation error |
| `401` | Unauthenticated |
| `403` | Forbidden (insufficient role) |
| `404` | Not Found |
| `429` | Too Many Requests |
| `500` | Internal Server Error |

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
  "state":       "Maharashtra",
  "district":    "Pune",
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
| `state` | string | – | Location metadata |
| `district` | string | – | Location metadata |
| `coordinates` | object | – | `{ lat, lon }` |

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

**Response `200`**

```json
{
  "success": true,
  "message": "Prediction fetched",
  "data": { "prediction": { "..." } }
}
```

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

## Admin — `/api/admin` 🔒🛡️

> Requires `role: "admin"` in addition to a valid JWT.

### `GET /api/admin/stats`

Aggregate dashboard statistics.

**Response `200`**

```json
{
  "success": true,
  "message": "Admin stats fetched",
  "data": {
    "totalUsers": 128,
    "totalPredictions": 940,
    "topFertilizers": [
      { "name": "Urea", "count": 312 }
    ],
    "predictionsPerDay": [
      { "date": "2025-03-24", "count": 45 }
    ],
    "avgConfidence": 0.877
  }
}
```

---

### `GET /api/admin/predictions`

All predictions with filtering and pagination.

**Query Parameters**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `20` | Items per page (max `100`) |
| `cropType` | — | Filter by crop name |
| `sortBy` | `createdAt` | Sort field |
| `order` | `desc` | `asc` or `desc` |

**Response `200`**

```json
{
  "success": true,
  "message": "Predictions fetched",
  "data": {
    "predictions": [ { "..." } ],
    "pagination": { "total": 940, "page": 1, "limit": 20, "totalPages": 47 }
  }
}
```

---

### `GET /api/admin/users`

List all users (passwords and refresh tokens excluded).

**Query Parameters**

| Param | Default | Max |
|-------|---------|-----|
| `page` | `1` | — |
| `limit` | `20` | `100` |

**Response `200`**

```json
{
  "success": true,
  "message": "Users fetched",
  "data": {
    "users": [
      { "_id": "...", "name": "Varun", "email": "...", "role": "user", "isActive": true }
    ],
    "pagination": { "total": 128, "page": 1, "limit": 20, "totalPages": 7 }
  }
}
```

---

### `PATCH /api/admin/users/:id/deactivate`

Deactivate a user and immediately invalidate their session.

**Response `200`**

```json
{ "success": true, "message": "User deactivated successfully" }
```

**Errors:** `400` self-deactivation, `404` user not found.

---

## Health Check

### `GET /health`

No authentication. No rate limit.

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
