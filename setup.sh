#!/bin/bash
set -e

echo ""
echo "  Food Diary — dev environment setup"
echo ""

# ── Git hooks ──────────────────────────────────────────────────────────────
echo "[1/6] Wiring local git hooks..."
git config core.hooksPath .githooks
chmod +x .githooks/commit-msg
echo "      commit-msg hook active"

# ── Python backend ─────────────────────────────────────────────────────────
echo "[2/6] Setting up Python backend..."
cd backend
python -m venv .venv

# Activate venv cross-platform
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
elif [ -f ".venv/Scripts/activate" ]; then
  source .venv/Scripts/activate
else
  echo "      ERROR: could not find venv activate script"
  exit 1
fi

pip install -r requirements.txt --quiet
deactivate
cd ..
echo "      virtualenv created and dependencies installed"

# ── Backend .env ───────────────────────────────────────────────────────────
echo "[3/6] Checking backend .env..."
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "      backend/.env created from .env.example"
  echo "      ACTION REQUIRED: fill in backend/.env before running the server"
else
  echo "      backend/.env already exists, skipping"
fi

# ── Expo / mobile ──────────────────────────────────────────────────────────
echo "[4/6] Installing mobile dependencies..."
cd mobile
npm install --silent
cd ..
echo "      node_modules installed"

# ── Validate key project files ─────────────────────────────────────────────
echo "[5/6] Validating project files..."

WARNINGS=0

check_file() {
  if [ -f "$1" ]; then
    echo "      found $1"
  else
    echo "      WARNING: $1 missing"
    WARNINGS=$((WARNINGS + 1))
  fi
}

check_contains() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo "      $1 looks valid"
  else
    echo "      WARNING: $1 exists but may be malformed (expected: '$2')"
    WARNINGS=$((WARNINGS + 1))
  fi
}

check_file "AI_USAGE.md"
check_contains "AI_USAGE.md" "^## Entries"

check_file "PRODUCT.md"
check_file "PROJECT_STATE.md"
check_file "DEVLOG.md"

check_file ".github/COPILOT_INSTRUCTIONS.md"
check_file ".github/workflows/ai-usage-check.yml"

check_file "docs/ARCHITECTURE.md"
check_file "docs/USER_MANUAL.md"

if [ $WARNINGS -eq 0 ]; then
  echo "      all project files present"
else
  echo "      $WARNINGS warning(s) — review the items above before starting"
fi

# ── Commit-msg hook smoke test ─────────────────────────────────────────────
echo "[6/6] Smoke-testing commit-msg hook..."
if [ -x ".githooks/commit-msg" ]; then
  echo "      hook is executable"
else
  echo "      WARNING: .githooks/commit-msg is not executable — run: chmod +x .githooks/commit-msg"
  WARNINGS=$((WARNINGS + 1))
fi

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
if [ $WARNINGS -eq 0 ]; then
  echo "  Setup complete — no issues found."
else
  echo "  Setup complete with $WARNINGS warning(s) — resolve before committing."
fi

echo ""
echo "  Run the backend:"
echo "    cd backend"
echo "    source .venv/bin/activate        # Mac/Linux"
echo "    .venv\\Scripts\\activate           # Windows"
echo "    uvicorn app.main:app --reload"
echo ""
echo "  Run the mobile app:"
echo "    cd mobile && npx expo start"
echo ""
echo "  Before every commit:"
echo "    1. Add a row to AI_USAGE.md with today's slug"
echo "    2. Include [log:<slug>] in your commit message"
echo "    3. For manual changes use [log:manual]"
echo ""