# AgriFert — Architecture Overview

This document describes the high-level architecture of the AgriFert monorepo.

## Repository Structure

```
AgriFert/
├── README.md
├── .gitignore
├── docs/
│   └── architecture.md        ← this file
├── backend/
│   ├── server/                # Node.js · Express · Mongoose
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   └── maintenanceMiddleware.js  # blocks non-admin routes during retrain
│   │   ├── models/
│   │   │   ├── Prediction.js
│   │   │   └── VerifiedRecord.js         # denormalised CL records
│   │   ├── services/
│   │   │   └── retrain.service.js        # Node → Flask retrain handshake
│   │   ├── utils/
│   │   │   └── maintenanceMode.js        # in-memory maintenance flag
│   │   └── docs/
│   │       ├── api.md         # REST endpoint reference
│   │       └── authentication.md
│   └── ml_service/            # Python · Flask · scikit-learn
│       ├── dataset/           # dataset.csv (grows on each retrain)
│       ├── model/             # Trained .pkl files + metrics.json (git-ignored)
│       └── docs/
│           ├── api.md         # ML service endpoint reference
│           └── model.md       # Model architecture & features
└── frontend/                  # React · Vite · TypeScript · Tailwind
    └── src/
        ├── components/
        │   └── MaintenanceOverlay.tsx   # full-screen maintenance screen
        └── pages/
            ├── AdminDashboard.tsx       # stats, charts, CL progress
            ├── VerificationPage.tsx     # dedicated /admin/verifications page
            └── Results.tsx              # analysis results + PDF download
```

## System Architecture

```
┌─────────────────── Browser ─────────────────────┐
│           React SPA (Vite · TypeScript)          │
│               http://localhost:5173              │
│                                                  │
│  MaintenanceOverlay polls GET /api/status        │
│  every 10 s → shows maintenance screen if        │
│  inMaintenance = true                            │
└─────────────────────┬───────────────────────────┘
                       │  HTTPS · JWT Bearer
                       ▼
┌─────────────────── Express Server ──────────────┐
│  PORT 5000  ·  Node 18  ·  Mongoose             │
│                                                  │
│  maintenanceMiddleware → 503 non-admin routes    │
│  /api/status          → maintenance check        │
│  /api/auth            → auth.controller          │
│  /api/analyze         → analyze.controller       │
│  /api/weather         → weather.controller       │
│  /api/admin           → admin.controller         │
│  /api/users           → user.controller          │
└───┬──────────┬──────────────────┬───────────────┘
    │          │                  │
    │ Axios    │ Axios            │ Gemini REST API
    ▼          ▼                  ▼
┌────────┐  ┌──────────────┐  ┌──────────────────┐
│ Flask  │  │ OpenWeather  │  │  Gemini API      │
│  ML    │  │  Map API     │  │  REST (axios)    │
│ :8000  │  └──────────────┘  └──────────────────┘
│        │
│/predict│  ┌──────────────┐
│/retrain│  │ MongoDB Atlas│
│/metrics│  │              │
│/health │  │ · Users      │
└────────┘  │ · Predictions│
            │ · VerifiedRec│
            └──────────────┘
```

## Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| **Frontend** | UI, auth state, form submission, results + PDF download, admin dashboard with sticky KPI bar, dedicated verification page with collapsible cards |
| **Server** | Auth, routing, orchestration, data persistence, CL scheduling, maintenance mode, TTL cleanup |
| **ML Service** | Feature encoding, model inference, continuous-learning retrain endpoint, in-process hot-swap |
| **MongoDB** | Users, Predictions, VerifiedRecords |
| **OpenWeatherMap** | Real-time temperature, humidity & moisture |
| **Gemini API** | AI-generated soil health tips per prediction |

## Data Flow — Analyze Request

```
1. User submits soil form (frontend)
2. POST /api/analyze (server)  ← JWT auth check + rate limit
3. Server → POST /predict (ml_service)  ← internal API key
4. ml_service encodes features → model.predict() → returns fertilizer + confidence
5. Server → GET weather (OpenWeatherMap)  if lat/lon provided
6. Server → Gemini.generateContent()  → soil health tips
7. Server saves Prediction doc to MongoDB
8. Server returns unified response to frontend
9. User can download a PDF report via browser print dialog
```

## Data Flow — Continuous Learning

```
1. Admin opens Verification Centre (/admin/verifications)
2. Admin expands a prediction card to see full model output
   (fertilizer, yield improvement, NPK bars, confidence, AI tips)
3. Admin contacts farmer offline to confirm outcome
4. Admin clicks "Mark Verified" → POST /api/admin/verifications/:id/verify
5. Server creates VerifiedRecord (denormalised input + output)
6. Server counts usedInRetrain=false records
7. If count ≥ RETRAIN_THRESHOLD:
   a. retrain.service.js sets maintenanceMode = true
      → all non-admin API routes return 503
      → frontend MaintenanceOverlay blocks the UI
   b. Server → POST /retrain (ml_service) with verified records payload
   c. Flask appends records to dataset.csv
   d. Flask retrains VotingClassifier pipeline
   e. Flask saves new model artifacts + bumps version in metrics.json
   f. Flask hot-swaps in-process model (no restart needed)
   g. Server marks VerifiedRecords usedInRetrain=true
   h. retrain.service.js sets maintenanceMode = false
      → 503 lifted, frontend overlay clears automatically
8. Admin can download a verification report as PDF at any point
```

## Maintenance Mode

```
Component: backend/server/utils/maintenanceMode.js
           backend/server/middleware/maintenanceMiddleware.js

- Singleton in-memory flag (resets on server restart)
- SET to true  → immediately before POST /retrain call to Flask
- SET to false → in the `finally` block (always clears, even on error)

Exempted routes (always pass through):
  /api/auth/*        ← admins can still log in
  /api/admin/*       ← admins can monitor the dashboard
  /health            ← uptime monitoring
  /api/status        ← used by frontend poll

Frontend polling:
  GET /api/status every 10 s (react-query refetchInterval)
  When inMaintenance = true → renders <MaintenanceOverlay>
  When inMaintenance = false → app resumes normally
```

## Auto-Cleanup (Unverified Predictions TTL)

```
- A daily scheduled job runs in the Node server (setTimeout + setInterval)
- It deletes Prediction documents older than UNVERIFIED_TTL_DAYS (default 90)
  that have NO corresponding VerifiedRecord
- Verified predictions (VerifiedRecord exists) are never auto-deleted
- Schedule fires immediately on server start, then every 24 h
```

## Security Model

| Concern | Mechanism |
|---------|-----------|
| XSS/clickjacking | `helmet` middleware |
| NoSQL injection | `express-mongo-sanitize` |
| Brute force | `express-rate-limit` per route |
| CORS | allow-list via `ALLOWED_ORIGINS` env var |
| Auth | JWT access token (7d) + refresh token (30d) |
| ML service | `X-Internal-API-Key` header; not exposed to browser |
| Admin access | `role: "admin"` checked server-side after JWT verify |
| Retrain endpoint | Same `X-Internal-API-Key`; only callable from Node server |
| Maintenance bypass | Admin routes exempted from `maintenanceMiddleware` |
