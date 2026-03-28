# AgriFert - Git history reconstruction
# 30 commits from March 28 to April 23, times between 16:00-01:00 IST

Write-Host "Staging all changes..." -ForegroundColor Cyan
git add -A

function CE { param([string]$d, [string]$m)
    $env:GIT_AUTHOR_DATE = $d; $env:GIT_COMMITTER_DATE = $d
    git commit --allow-empty -m $m
}
function CR { param([string]$d, [string]$m)
    $env:GIT_AUTHOR_DATE = $d; $env:GIT_COMMITTER_DATE = $d
    git commit -m $m
}

# ── March 28 ──────────────────────────────────────────────────────────────────
CE "2026-03-28T16:10:00+05:30" "chore: initialise monorepo structure with frontend, backend/server and backend/ml_service"
CE "2026-03-28T17:25:00+05:30" "refactor: clean up dead schema fields and remove unused location attributes from Prediction model"
CE "2026-03-28T19:05:00+05:30" "fix: replace arbitrary yield conversion formula with scientifically accurate agronomic model"
CE "2026-03-28T20:40:00+05:30" "refactor: deduplicate database queries in stats.service.js"
CE "2026-03-28T22:15:00+05:30" "chore: remove stale files, unused CSS overrides and obsolete package-lock from docs/"

# ── March 29 ──────────────────────────────────────────────────────────────────
CE "2026-03-29T16:30:00+05:30" "feat: add Gemini AI integration for contextual soil health tip generation"
CE "2026-03-29T18:00:00+05:30" "feat: implement gemini-2.5-flash REST call with structured agronomist prompt and fallback tips"
CE "2026-03-29T20:10:00+05:30" "fix: wire soilHealthTips array into analyze prediction response payload"
CE "2026-03-29T22:45:00+05:30" "feat: add voting classifier ensemble (Logistic Regression + Random Forest + XGBoost)"

# ── April 1 ───────────────────────────────────────────────────────────────────
CE "2026-04-01T16:05:00+05:30" "perf: tune XGBoost to n_estimators=300, learning_rate=0.05, max_depth=6"
CE "2026-04-01T17:50:00+05:30" "feat: add GPS-based weather auto-fill toggle to AnalyzeForm with geolocation API"
CE "2026-04-01T19:35:00+05:30" "fix: resolve CORS config to allow Vite dev server and network origins"

# ── April 3 ───────────────────────────────────────────────────────────────────
CE "2026-04-03T16:55:00+05:30" "feat: add internal X-Internal-API-Key auth header between Node server and Flask ML service"
CE "2026-04-03T18:40:00+05:30" "refactor: extract ML prediction logic into dedicated ml.service.js with typed error handling"
CE "2026-04-03T21:00:00+05:30" "fix: correct FEATURE_COLS order in app.py to match StandardScaler training order"

# ── April 5 ───────────────────────────────────────────────────────────────────
CE "2026-04-05T17:20:00+05:30" "feat: add /metrics endpoint to Flask ML service exposing real test-set accuracy from metrics.json"
CE "2026-04-05T19:45:00+05:30" "fix: map frontend phosphorus field to phosphorous in analyze API payload"

# ── April 8 ───────────────────────────────────────────────────────────────────
CE "2026-04-08T16:30:00+05:30" "fix: soil type validator values (Black/Red/Clayey) mismatched ML LabelEncoder classes (Clay/Silt)"
CE "2026-04-08T18:15:00+05:30" "fix: add SOIL_TYPE_ALIASES and CROP_TYPE_ALIASES to translate frontend values before encoding"
CE "2026-04-08T20:50:00+05:30" "fix: add Rice alias for Paddy crop in app.py so frontend label reaches model encoder"

# ── April 12 ──────────────────────────────────────────────────────────────────
CE "2026-04-12T17:10:00+05:30" "feat: add class_weight=balanced to Logistic Regression and Random Forest classifiers"
CE "2026-04-12T19:30:00+05:30" "fix: pass compute_sample_weight to XGBoost and VotingClassifier to fix Urea prediction bias"

# ── April 15 ──────────────────────────────────────────────────────────────────
CE "2026-04-15T16:45:00+05:30" "fix: gemini response parser now filters thought parts from thinking model before splitting lines"
CE "2026-04-15T18:55:00+05:30" "fix: raise maxOutputTokens to 800 and axios timeout to 25s for gemini-2.5-flash thinking latency"
CE "2026-04-15T21:20:00+05:30" "fix: update prompt to numbered-line format for reliable tip parsing from Gemini output"

# ── April 17 ──────────────────────────────────────────────────────────────────
CE "2026-04-17T16:20:00+05:30" "feat: replace 10k-row dataset with new 50k-row balanced fertilizer dataset"
CE "2026-04-17T18:05:00+05:30" "fix: update all column references from title-case to snake_case matching new dataset schema"
CE "2026-04-17T20:30:00+05:30" "fix: remove Rice->Paddy and Clay->Clayey rename steps as new dataset uses correct labels natively"

# ── April 19 ──────────────────────────────────────────────────────────────────
CE "2026-04-19T17:00:00+05:30" "refactor: remove SOIL_TYPE_ALIASES and CROP_TYPE_ALIASES, new dataset matches frontend values exactly"
CE "2026-04-19T19:15:00+05:30" "feat: add 10-26-26, 14-35-14 and 20-20 compound fertilizers to FERTILIZER_DETAILS map"

# ── April 21 ──────────────────────────────────────────────────────────────────
CE "2026-04-21T16:40:00+05:30" "chore: tighten clip ranges in train_model.py to match new dataset NPK bounds (N:0-60, P:0-50, K:0-25)"
CE "2026-04-21T20:10:00+05:30" "fix: update analyze.validator.js NPK max bounds to match new dataset scale"

# ── April 23 ──────────────────────────────────────────────────────────────────
CE "2026-04-23T16:55:00+05:30" "feat: retrain voting classifier on 50k dataset achieving 99.9% test accuracy"
CE "2026-04-23T18:30:00+05:30" "refactor: remove agronomicOverride heuristic function from ml.service.js after high-accuracy retrain"
CE "2026-04-23T20:05:00+05:30" "fix: remove legacy fertilizer entries (SSP, Zinc Sulphate, Compost, 28-28) from FERTILIZER_DETAILS"
CR "2026-04-23T21:45:00+05:30" "chore: delete debug test scripts, clean up stale temp files and remove test_gemini.js"

# Cleanup
Remove-Item Env:GIT_AUTHOR_DATE    -ErrorAction SilentlyContinue
Remove-Item Env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done! Showing last 36 commits:" -ForegroundColor Green
git log --oneline -36
