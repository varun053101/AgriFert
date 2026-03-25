# commit_changes.ps1
# Commits all AgriFert session changes in logical groups.
# Run from the repo root:  .\commit_changes.ps1

Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"

function Commit {
    param([string]$Message)
    $status = git diff --cached --name-only
    if ($status) {
        git commit -m $Message
        Write-Host "`n✅ Committed: $Message`n" -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Nothing staged for: $Message`n" -ForegroundColor Yellow
    }
}

Write-Host "=== AgriFert — Committing all changes ===" -ForegroundColor Cyan

# ─────────────────────────────────────────────────────────────────────────────
# 1. Training pipeline
# ─────────────────────────────────────────────────────────────────────────────
git add backend/ml_service/train_model.py
Commit "feat(ml): add full training pipeline with 12-step preprocessing"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Soil type + crop type as model inputs (full stack)
# ─────────────────────────────────────────────────────────────────────────────
git add backend/ml_service/app.py
git add backend/server/controllers/analyze.controller.js
git add backend/server/services/ml.service.js
git add backend/server/validators/analyze.validator.js
git add backend/server/models/Prediction.js
git add frontend/src/pages/AnalyzeForm.tsx
git add frontend/src/lib/api.ts
Commit "feat(api): add soil type and crop type as required model inputs"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Gemini AI soil health tips
# ─────────────────────────────────────────────────────────────────────────────
git add backend/server/services/gemini.service.js
git add backend/server/package.json
git add backend/server/package-lock.json
Commit "feat(api): add Gemini AI-generated soil health tips"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Dynamic yield improvement + results page fixes
# ─────────────────────────────────────────────────────────────────────────────
git add backend/server/services/ml.service.js
git add frontend/src/pages/Results.tsx
Commit "fix(results): dynamic yield improvement and replace soil pH with crop/soil type summary"

# ─────────────────────────────────────────────────────────────────────────────
# 5. ML service hardening
# ─────────────────────────────────────────────────────────────────────────────
git add backend/ml_service/app.py
git add backend/ml_service/requirements.txt
Commit "fix(ml): graceful model loading, suppress sklearn warning, add pandas and xgboost to requirements"

# ─────────────────────────────────────────────────────────────────────────────
# 6. Git hygiene — gitignore + gitkeep + IDE config
# ─────────────────────────────────────────────────────────────────────────────
git add .gitignore
git add backend/ml_service/model/.gitkeep
git add backend/ml_service/dataset/.gitkeep
git add backend/ml_service/pyrightconfig.json
git add .vscode/settings.json
Commit "chore(git): add gitignore rules, gitkeep for model/dataset dirs, pyright config"

# ─────────────────────────────────────────────────────────────────────────────
# 7. Documentation
# ─────────────────────────────────────────────────────────────────────────────
git add backend/server/.env.example
git add backend/ml_service/.env.example
git add frontend/.env.example
git add backend/README.md
Commit "docs: update .env.example files and README with new fields and setup instructions"

# ─────────────────────────────────────────────────────────────────────────────
# Catch-all for anything leftover
# ─────────────────────────────────────────────────────────────────────────────
$remaining = git status --short
if ($remaining) {
    Write-Host "`n⚠️  Uncommitted changes remaining:" -ForegroundColor Yellow
    Write-Host $remaining
    git add -A
    Commit "chore: miscellaneous cleanup and remaining changes"
}

Write-Host "`n=== All commits done ===" -ForegroundColor Cyan
git log --oneline -10
