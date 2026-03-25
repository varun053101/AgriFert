# Agri-Fert Backend — Setup & Run Guide

Two services must run at the same time:
- **Node API** (port 5000) — handles auth, routes, DB, Gemini tips
- **Flask ML service** (port 8000) — loads trained model + encoders, serves predictions

---

## Prerequisites

| Tool | Min version | Check |
|------|-------------|-------|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Python | 3.10+ | `python --version` |
| pip | any | `pip --version` |
| MongoDB Atlas | free tier | atlas.mongodb.com |

---

## One-time Setup

### A — ML Service

**1. Place the dataset**
```
backed/ml_service/dataset/   ← put filtered_fertilizer_data.csv here
```
> The `dataset/` and `model/` folders exist in git (via `.gitkeep`) but their contents are gitignored.
> Large binary/CSV files must be placed manually after cloning.

**2. Create virtual environment and install packages**
```bash
cd backend/ml_service

python -m venv venv

# Activate (every time you open a new terminal for this service):
venv\Scripts\Activate.ps1         # Windows PowerShell
source venv/bin/activate           # Mac / Linux

pip install -r requirements.txt
```

**3. Train the model** (generates all 5 `.pkl` files into `model/`):
```bash
python train_model.py
```

This produces in `model/`:
- `voting_classifier_model.pkl`
- `soil_encoder.pkl`
- `crop_encoder.pkl`
- `fert_encoder.pkl`
- `scaler.pkl`

**2. Create ML `.env`**
```bash
cp .env.example .env
```
Fill in `ml_service/.env`:
```env
ML_SERVICE_API_KEY=any_long_random_string_you_choose   # must match server/.env
MODEL_VERSION=1.0.0
PORT=8000
FLASK_ENV=development
```

---

### B — Node Server

**1. Install packages**
```bash
cd backend/server
npm install
```

**2. Create server `.env`**
```bash
cp .env.example .env
```

**3. Generate secrets — run this 3 times:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**4. Fill in `server/.env` completely:**
```env
PORT=5000
NODE_ENV=development

# From MongoDB Atlas → your cluster → Connect → Drivers
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/agrifert

JWT_SECRET=<secret 1>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<secret 2>
JWT_REFRESH_EXPIRES_IN=30d

# Flask is on localhost:8000
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=<secret 3>    # MUST match ML_SERVICE_API_KEY in ml_service/.env

# Free key from openweathermap.org/api
WEATHER_API_KEY=<your key>
WEATHER_API_BASE=https://api.openweathermap.org/data/2.5

# Gemini — https://aistudio.google.com/app/apikey
GEMINI_API_KEY=<your key>

LOGIN_LIMIT_MAX=5
REGISTER_LIMIT_MAX=3
ANALYZE_LIMIT_MAX=20

ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080

# Secret phrase required when registering the first admin account
ADMIN_SECRET_KEY=any_secret_phrase_you_choose
```

---

## Running the Servers

Open two terminal windows.

### Terminal 1 — Flask ML Service
```bash
cd backend/ml_service
venv\Scripts\Activate.ps1      # Windows (or: source venv/bin/activate on Mac/Linux)
python app.py
```

Expected output:
```
[ML] Loaded voting_classifier_model.pkl
[ML] Loaded soil_encoder.pkl
[ML] Loaded crop_encoder.pkl
[ML] Loaded fert_encoder.pkl
[ML] Loaded scaler.pkl
[ML] Starting on port 8000  (model ready: True)
 * Running on http://0.0.0.0:8000
```

> **If you see `model ready: False`**: the `.pkl` files are missing.  
> Run `python train_model.py` inside the virtual environment first.

Quick check:
```bash
curl http://localhost:8000/health
# {"status":"ok","modelVersion":"1.0.0","validSoilTypes":[...],"validCropTypes":[...]}
```

### Terminal 2 — Node API
```bash
cd backend/server
npm run dev
```

Expected output:
```
[DB] Connected: cluster0.xxxxx.mongodb.net
[SERVER] Running on port 5000 (development)
```

Quick check:
```bash
curl http://localhost:5000/health
# {"status":"ok","env":"development","uptime":2}
```

---

## Create Your First Admin Account

Run once after both servers are running:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@example.com",
    "password": "SecurePass1",
    "adminKey": "<value of ADMIN_SECRET_KEY from server/.env>"
  }'
```

Save the `accessToken` from the response — required for all protected routes.

---

## Test a Prediction End-to-End

**Step 1 — Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePass1"}'
```

**Step 2 — Call analyze** (replace `YOUR_TOKEN`):
```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "soilType":    "Black",
    "cropType":    "Wheat",
    "temperature": 26,
    "humidity":    52,
    "moisture":    38,
    "nitrogen":    37,
    "potassium":   20,
    "phosphorous": 15
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Analysis complete",
  "data": {
    "predictionId": "...",
    "fertilizer": {
      "name": "Urea",
      "quantity": { "nitrogen": 46, "phosphorus": 0, "potassium": 0 },
      "totalQuantity": 46,
      "unit": "kg per acre"
    },
    "yieldImprovement": { "percentage": 20, "bushelsPerAcre": 34 },
    "soilHealthTips": ["<Gemini-generated tip 1>", "..."],
    "modelConfidence": 0.94,
    "processingMs": 120
  }
}
```

---

## Model Features

The model uses **8 features** in this exact training order:

| Field | Type | Range / Values |
|-------|------|----------------|
| `soilType` | string | `Black`, `Sandy`, `Red`, `Loamy`, `Clayey` |
| `cropType` | string | `Cotton`, `Sugarcane`, `Wheat`, `Maize`, `Paddy` |
| `temperature` | number (°C) | 10 – 50 |
| `humidity` | number (%) | 10 – 100 |
| `moisture` | number (%) | 5 – 100 |
| `nitrogen` | number (kg/ha) | 0 – 150 |
| `phosphorous` | number (kg/ha) | 0 – 150 |
| `potassium` | number (kg/ha) | 0 – 150 |

`soilType` and `cropType` are encoded internally by the Flask service using the saved `LabelEncoder` files — send them as plain strings.

---

## Gemini AI Tips

After prediction, the Node server calls **Gemini 1.5 Flash** to generate 5 short, context-specific soil health tips. Tips are personalized to the crop, soil type, fertilizer, and sensor readings.

- Set `GEMINI_API_KEY` in `server/.env`
- Get a free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- If the key is missing or the API call fails, the service falls back to static hardcoded tips gracefully

---

## API Reference

Base URL: `http://localhost:5000/api`  
Protected routes require: `Authorization: Bearer <accessToken>`

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/auth/register` | No | Create account |
| POST | `/auth/login` | No | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | No | Body: `{"refreshToken":"..."}` → new tokens |
| POST | `/auth/logout` | Yes | Revokes refresh token |
| GET | `/auth/me` | Yes | Current user profile |

### Analyze
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/analyze` | Yes | Run prediction, save result to DB |
| GET | `/analyze/history?page=1&limit=10` | Yes | Your prediction history |
| GET | `/analyze/:id` | Yes | Single prediction detail |

### Weather
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/weather?state=punjab&district=ludhiana` | Yes | Weather by location name |
| GET | `/weather?lat=30.9&lng=75.8` | Yes | Weather by GPS coordinates |

### Admin (role = admin only)
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/admin/stats` | Yes | Full dashboard stats |
| GET | `/admin/predictions?page=1&limit=20&cropType=Wheat` | Yes | All predictions, paginated |
| GET | `/admin/users?page=1&limit=20` | Yes | All users, paginated |
| PATCH | `/admin/users/:id/deactivate` | Yes | Deactivate a user account |

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing required environment variables` | `.env` not filled | Check every field in `server/.env` |
| `ML service is not running` | Flask not started | Run `python app.py` in Terminal 1 |
| `Model file not found` | `.pkl` missing | Run `python train_model.py` first |
| `Invalid soil_type / crop_type` | Bad value sent | Use exact values from the table above |
| `Database connection error` | Wrong MongoDB URL | Re-copy from Atlas, check IP whitelist |
| `Invalid token` | Token expired | Login again to get fresh tokens |
| `origin is not allowed` | Frontend URL not in CORS | Add your URL to `ALLOWED_ORIGINS` |
| Port 5000 in use | Another process | Change `PORT` in `server/.env` |
| Port 8000 in use | Another process | Change `PORT` in `ml_service/.env` and update `ML_SERVICE_URL` |
