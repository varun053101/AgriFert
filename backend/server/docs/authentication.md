# Server — Authentication & Authorization

## Overview

AgriFert uses a **JWT access + refresh token** pattern combined with a
**maintenance middleware** layer that temporarily blocks user traffic during
model retraining.

```
Client                        Server
  │── POST /api/auth/login ──►│
  │◄── accessToken (7d)  ─────│
  │◄── refreshToken (30d)─────│
  │                            │
  │── GET /api/analyze/history │  Authorization: Bearer <accessToken>
  │   (protected route)    ──►│  ← maintenanceMiddleware → authenticate
  │◄── 200 data ──────────────│
  │                            │
  │  (access token expires)    │
  │── POST /api/auth/refresh ─►│  body: { refreshToken }
  │◄── new accessToken ────────│
  │◄── new refreshToken ───────│
  │                            │
  │  (retrain in progress)     │
  │── POST /api/analyze    ──►│  ← maintenanceMiddleware
  │◄── 503 maintenance ────────│
```

---

## Token Lifetimes

| Token | Default TTL | Env Var |
|-------|-------------|---------|
| Access token | 7 days | `JWT_EXPIRES_IN` |
| Refresh token | 30 days | `JWT_REFRESH_EXPIRES_IN` |

---

## Middleware Chain

```
Request
  │
  ├─ helmet()                  # security headers
  ├─ cors()                    # origin allow-list (ALLOWED_ORIGINS)
  ├─ mongoSanitize()           # NoSQL injection prevention
  ├─ express.json()            # body parsing (10kb limit)
  ├─ globalLimiter             # rate limiting
  ├─ maintenanceMiddleware()   # 🔧 503 non-exempt routes during retrain
  ├─ authenticate()            # 🔒 verify JWT, attach req.user
  └─ authorizeAdmin()          # 🛡️ admin-only routes: check role
```

---

## `maintenanceMiddleware`

Activated automatically during model retraining. Returns `503` for all
routes except:

| Exempted path | Reason |
|---|---|
| `/api/auth/*` | Admins must be able to log in |
| `/api/admin/*` | Admins monitor the dashboard during retrain |
| `/health` | Uptime monitoring must not be blocked |
| `/api/status` | Frontend polls this to render the maintenance overlay |

**503 Response**

```json
{
  "success": false,
  "maintenance": true,
  "message": "AgriFert is temporarily under maintenance while the AI model is being retrained. Please try again in a few minutes.",
  "startedAt": "2026-04-23T11:05:00.000Z"
}
```

The Node server sets `maintenanceMode = true` before calling `POST /retrain`
and always sets it back to `false` in the `finally` block (even on error).

---

## `authenticate` Middleware

1. Reads `Authorization: Bearer <token>` header
2. Verifies signature with `JWT_SECRET`
3. Checks token hasn't expired
4. Fetches user from DB, confirms `isActive: true`
5. Attaches user to `req.user` (no `passwordHash`, no `refreshToken`)
6. Calls `next()` — or throws `401` on any failure

---

## `authorizeAdmin` Middleware

Runs **after** `authenticate`. Checks `req.user.role === "admin"`. Throws `403` otherwise.

> Admin routes are also exempt from `maintenanceMiddleware`, so admins retain
> full dashboard access while the model is retraining.

---

## Registering an Admin User

Pass the `adminKey` field matching `ADMIN_SECRET_KEY` in `.env`:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@agrifert.dev",
    "password": "StrongPass1!",
    "adminKey": "your_admin_secret_here"
  }'
```

---

## Generating Secure Secrets

```bash
# JWT_SECRET / JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Error Reference

| Scenario | HTTP | Message |
|----------|------|---------|
| No `Authorization` header | `401` | Token missing |
| Malformed / invalid token | `401` | Invalid token |
| Expired access token | `401` | Token expired |
| User not found or inactive | `401` | Unauthorized |
| Non-admin on admin route | `403` | Forbidden: admin only |
| Any route during retrain | `503` | Under maintenance |
