# Dev Log

Daily progress log for the Food Diary RSE take-home task.
Used to consolidate the final submission report.

---

## 2026-04-29 — Day 0: Planning

### What I did

**Requirements**
- Analysed the full task brief — identified mandatory vs optional requirements
- Mapped all 5 core features: auth, user profile, photo logging, manual logging, diary view
- Noted critical implementation details from the brief (bbox coordinate space, ingredient cache, serving size kcal adjustment)

**Tech stack**
- React Native + Expo (mobile app, APK deliverable)
- FastAPI + Python (backend, API proxy)
- Supabase (auth, Postgres, image storage)
- Railway (backend deployment)
- expo-image-picker, expo-camera, react-native-svg, zustand, axios

**Architecture**
- Proxy pattern: all LogMeal API calls go through FastAPI — API key never reaches the mobile app
- Supabase Auth handles JWT — no custom auth logic needed
- Ingredient catalogue fetched once, cached in Supabase with 24h TTL, filtered client-side

**GitHub workflow**
- Created private repo with folder structure: `/backend`, `/mobile`, `/docs`
- Pre-commit hook: blocks commit if no `AI_USAGE.md` entry exists for today's date
- GitHub Actions workflow: same check enforced on every push and PR
- `setup.sh`: one command to wire hooks and install all dependencies on a fresh clone
- `.github/COPILOT_INSTRUCTIONS.md`: project context and rules to steer Copilot consistently

**GitHub issues**
- Created labels: `setup`, `backend`, `frontend`, `api`, `docs`, `critical`
- Designed github labels and issue templates to ensure consistent logging of AI usage and clear separation of concerns
- Logged 25 issues in implementation order covering all mandatory and optional requirements
  - #1–#6: infrastructure and scaffold
  - #7–#11: auth, profile, bbox spike
  - #12–#18: photo logging, manual logging, diary
  - #19–#25: error handling, image storage, APK build, docs, submission

**APIs**
- Reviewed LogMeal API docs for all 5 endpoints used in the project
- Noted bbox coordinate space issue: `contained_bbox` is in `processed_image_size` space, not display space
- LogMeal API key requested — access needed before Day 1 implementation starts

### Blockers
- LogMeal API key not yet confirmed — needed before any API integration work

### Tomorrow (Day 1)
- Issues #3–#11: Supabase schema, FastAPI scaffold, Expo scaffold, auth, profile, bbox spike

---

## 2026-04-30 — Day 1: Infrastructure and scaffold

### What I did

**Supabase setup (manual)**
- Created Supabase project from scratch
- Designed and ran the full database schema in SQL Editor: `profiles`, `diary_entries`,
  `diary_entry_ingredients`, `ingredient_cache` tables with correct column types,
  CHECK constraints, foreign keys, and CASCADE deletes
- Enabled Row Level Security on all user-scoped tables and wrote RLS policies
  so each user can only read and write their own rows
- Verified RLS by cross-checking with two test users in the Supabase table editor
- Created `meal-images` storage bucket with public read access
- Added storage policies: authenticated upload, public read, user-scoped delete
- Reviewed Supabase Auth documentation to understand JWT flow and service role key usage
- Confirmed that service role key must only exist on the backend — never in mobile code

**Railway deployment (manual)**
- Created Railway project and linked to GitHub repo
- Explored Railway deployment options: Nixpacks vs Dockerfile — chose Dockerfile
  for explicit Python version control after Nixpacks defaulted to Python 3.13
  which is incompatible with pydantic-core 2.18.1 (requires PyO3 ≤ 3.12)
- Wrote `backend/Dockerfile` with `python:3.12-slim`, resolved build failures
  related to pydantic-core compilation from source on Python 3.13
- Set Railway root directory to `backend/`, configured Dockerfile builder
- Added all three environment variables in Railway dashboard:
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LOGMEAL_API_KEY`
- Verified live endpoint: `GET /health` and `GET /health/db` both returning 200
- Enabled custom domain

**CI/CD workflow (manual)**
- Designed the `[log:slug]` commit token convention from scratch —
  each commit message must contain a `[log:slug]` token matching a row in `AI_USAGE.md`
- Wrote `commit-msg` hook and GitHub Actions workflow to enforce this on every
  commit locally and on every push/PR in CI
- Resolved multiple CI failures caused by edge cases: merge commits,
  Copilot auto-generated commits ("Apply suggestions from code review"),
  git internal SHA-based merge messages (`Merge abc123 into def456`),
  and first pushes to new branches where `github.event.before` is all zeros
- Extended merge commit pattern to cover all variants GitHub generates
- Added standing slugs `copilot`, `manual`, and `coplit` (typo recovery) to `AI_USAGE.md`
  so recurring commit types always pass without a new row
- Configured mandatory Copilot code review on every PR via GitHub branch protection rules —
  no PR can merge without Copilot reviewing it first
- Verified the full CI pipeline end-to-end: push → GitHub Actions → check passes/fails correctly

**FastAPI scaffold (issues #1, #4)**
- Set up Python virtual environment, installed all dependencies from `requirements.txt`
- Confirmed `uvicorn app.main:app --reload` runs locally with no errors
- Verified `/health` and `/health/db` endpoints live on Railway URL

**Expo scaffold (issue #5)**
- Bootstrapped Expo app with TypeScript template
- Installed all required packages: react-navigation, expo-image-picker, expo-camera,
  expo-secure-store, react-native-svg, zustand, axios, supabase-js
- Created `mobile/src/` directory structure: api, components, lib, navigation,
  screens, store, theme
- Wired `RootNavigator` to show `AuthStack` when unauthenticated,
  `MainTabs` when token exists — verified navigation switching works correctly
- Set up `client.ts` axios instance pointing to Railway URL with Bearer token interceptor
- Confirmed app runs on Expo Go with no errors

**Auth router (issue #7)**
- Implemented `POST /auth/register` and `POST /auth/login` backed by Supabase Auth
- Implemented `get_current_user` FastAPI dependency for protected routes
- Verified with curl: register creates user in Supabase Auth dashboard,
  login returns valid JWT, wrong password returns 401, missing token returns 401


### Build failures resolved (manual)
- Python 3.13 incompatibility with pydantic-core — fixed by pinning to python:3.12-slim in Dockerfile
- Railway not finding Dockerfile — fixed by setting builder to Dockerfile explicitly
  and root directory to `backend/`
- CI failing on Copilot suggestion commits — added pattern match for
  "Apply suggestions from code review" to auto-pass
- CI failing on git internal merge format — extended regex to match SHA-based merges
- `coplit` typo in one commit message — added standing entry to recover gracefully

### Blockers
- None. All issues #1–#7 complete.

### Tomorrow (Day 2)
- Issues #8–#18: LogMeal proxy routes, photo logging flow, manual logging,
  diary backend and diary screen
- Priority: #12 LogMeal proxy must be done before #13 photo log screen can start
- Trigger EAS build early to detect any APK config issues

---

## 2026-05-01 — Day 2: Core features

### What I did


**Auth screens (issue #8)**
- Implemented Login and Signup screens with the portfolio-matched colour theme:
  navy-to-indigo gradient background (`#0c1426` → `#1e293b` → `#312e81`),
  cyan accent gradient (`#9AFEFF` → `#67E8F9` → `#06B6D4`)
- Built reusable components: `LogoMark`, `Input`, `Button` (with LinearGradient),
  `ErrorMessage` — all use design tokens from `colors.ts`, `spacing.ts`, `typography.ts`
- Verified token persists across app restarts via expo-secure-store
- Added OTP email verification flow for new registrations using Supabase Auth

**Profile router (issue #9)**
- Implemented `GET /profile` (404 if no profile) and `PUT /profile` with upsert
- BMI computed server-side: `round(weight_kg / (height_m ** 2), 1)`
- Verified: weight=70, height=175 → BMI=22.9 via curl against Railway

**Profile screen (issue #10)**
- Built `PickerField` component — modal bottom sheet with option list,
  selected state with gradient text, Feather chevron icon
- Built full `ProfileScreen` with live BMI badge (colour-coded: blue/green/amber/red),
  section cards, loading state, save/error/success banners, sign-out button
- Verified BMI updates live as weight and height inputs change
- Verified saved values persist and reload correctly on screen revisit

**Bbox spike (issue #11)**
- Built `BboxOverlay` component using `react-native-svg` — no canvas
- Implemented coordinate scaling formula:
  `scaleX = displayWidth / processedImageSize.width`
  `scaleY = displayHeight / processedImageSize.height`
- Documented the coordinate space scaling in a block comment at the top of the file
  citing the LogMeal docs note: "Bounding-box coordinates are in processed_image_size
  space, not the original/parsed image size"
- Implemented three-tier label placement: above box (normal), inside box (when near
  top edge), below box (when box too small and too close to top)
- Tested with hardcoded fixture (640×480 processed, two food regions)
- Visually confirmed box placement on device — scaleX 0.5109, scaleY 0.6813
  both correct for 327×327 display against 640×480 processed size
- Applied dark theme to tab bar and navigation header (was rendering white/light)

### Blockers

### Tomorrow (Day 3)