# Contributing to Food Diary

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| Python | 3.12+ |
| Expo CLI | latest — `npm install -g expo-cli` |
| Supabase account | [supabase.com](https://supabase.com) — free tier is sufficient |
| LogMeal API key | [logmeal.com](https://logmeal.com) — free trial (20 credits/day) |
| Railway account | [railway.app](https://railway.app) — for backend deployment |

---

## Getting started

Run the one-shot setup script from the repo root:

```bash
bash setup.sh
```

It performs six steps:

1. **Git hooks** — wires `.githooks/commit-msg` as the local commit-msg hook and makes it executable. This hook enforces the `[log:slug]` token format (see [Commit conventions](#commit-conventions)) and validates slugs against `AI_USAGE.md`.
2. **Python virtualenv** — creates `backend/.venv` and installs `backend/requirements.txt`.
3. **Backend `.env`** — copies `backend/.env.example` to `backend/.env` if it does not already exist. You must fill in the three variables before starting the server.
4. **Mobile dependencies** — runs `npm install` inside `mobile/`.
5. **Mobile `.env`** — copies `mobile/.env.example` to `mobile/.env` if absent.
6. **File validation** — checks that key project files (`AI_USAGE.md`, `PRODUCT.md`, etc.) are present and well-formed.

See [README.md](README.md) for the full list of required environment variables and their descriptions.

---

## Git workflow

### Branches

| Branch | Purpose |
|---|---|
| `main` | Protected release branch. Accepts only PR merges. **Never push directly.** |
| `review` | Pre-release review branch. Merges from `test` are verified here before promotion to `main`. |
| `test` | QA and integration testing branch. Feature work is validated here before moving to `review`. |
| `dev` | Integration branch. All feature commits land here first. |
| `feature/issue-N` | Short-lived feature branch, cut from `dev`, one per GitHub issue. |

### Day-to-day flow

```
feature/issue-N  →  dev  →  test  →  review  →  main
```

1. Cut a branch from `dev`:
   ```bash
   git checkout dev && git pull
   git checkout -b feature/issue-42
   ```
2. Commit your work (see [Commit conventions](#commit-conventions) below).
3. Open a PR targeting `dev`.
4. Request a Copilot review — this is **required** before merge.
5. After approval, squash-merge the feature branch into `dev`.
6. Merge `dev` into `test` for QA and integration testing.
7. Once testing passes, open a PR from `test` into `review` for final sign-off.
8. Merge `review` into `main` via PR to cut a release.

### PR conventions

- **One PR per GitHub issue.**
- PR title format: `type(#N): short description`
  Example: `feat(#42): add calorie trend chart`
- Squash-merge feature branches into `dev`; preserve commit history on `dev → test → review → main` promotions.

---

## Commit conventions

Every commit message must follow this format:

```
type(#issue)[log:slug]: short description
```

**Examples:**

```
feat(#42): add calorie trend chart [log:copilot]
fix(#17): correct kcal scaling for ml units [log:manual]
docs(#33): add CONTRIBUTING.md [log:contributing]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Tooling, dependencies, config |
| `test` | Adding or updating tests |
| `ci` | CI/CD workflow changes |
| `perf` | Performance improvement |
| `refactor` | Code restructuring without behaviour change |

### The `[log:slug]` token

The slug is a short identifier that links the commit to an entry in `AI_USAGE.md`.

- **AI-assisted commit** — use a descriptive slug matching the `AI_USAGE.md` row for that work (e.g. `[log:copilot]`, `[log:ci-workflow]`).
- **Manual commit** — use `[log:manual]`.

The commit-msg hook (installed by `setup.sh`) rejects any commit that is missing a `[log:slug]` token or whose slug has no corresponding row in `AI_USAGE.md`.

---

## AI disclosure

Every commit that touches generated code must have:

1. A `[log:slug]` token in the commit message.
2. A matching row in `AI_USAGE.md` with the tool used, files affected, what was generated, and how it was verified.

This is enforced by:
- `.githooks/commit-msg` — blocks the commit locally if the slug is missing or unregistered.
- The `ai-usage-check` CI workflow — re-checks on every push and PR.

See `AI_USAGE.md` for the full disclosure log and row format.

---

## Running tests

**Backend (pytest):**

```bash
cd backend
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pytest
```

**Mobile (Jest):**

```bash
cd mobile
npm test
```

---

## Running linters

**Backend (ruff):**

```bash
cd backend
source .venv/bin/activate
ruff check app/
ruff format --check app/
```

**Mobile (ESLint):**

```bash
cd mobile
npx eslint src/ --ext .ts,.tsx --max-warnings 0
```
