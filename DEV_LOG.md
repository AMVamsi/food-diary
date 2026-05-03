# Dev Log

Daily progress log for the Food Diary RSE take-home task.
Used to consolidate the final submission report.

---

## 2026-04-29 — Day 0: Planning

### Setup completed
- Analysed task brief — identified 5 mandatory features: auth, profile, photo logging, manual logging, diary
- Decided stack: React Native + Expo, FastAPI, Supabase, Railway
- Designed architecture: proxy pattern — all LogMeal API calls go through FastAPI so the API key never reaches the mobile app; Supabase Auth handles JWT; ingredient catalogue cached in Supabase with 24h TTL
- Created GitHub repo with folder structure: `/backend`, `/mobile`, `/docs`
- Wrote `commit-msg` pre-commit hook and `ai-usage-check.yml` GitHub Actions workflow to enforce `[log:slug]` token and AI_USAGE.md entry on every commit
- Wrote `setup.sh` for one-command hook + dependency install on fresh clone
- Wrote `.github/COPILOT_INSTRUCTIONS.md` with project rules and stack constraints
- Created labels (`setup`, `backend`, `frontend`, `api`, `docs`, `critical`) and 25 GitHub issues in implementation order (#1–#6 infra, #7–#11 auth/profile/bbox, #12–#18 LogMeal/diary, #19–#25 errors/storage/APK/docs/submission)
- Reviewed LogMeal API docs for all 5 endpoints — noted `contained_bbox` is in `processed_image_size` space, not display space
- Requested LogMeal API key access

### Blockers
- LogMeal API key not yet confirmed

---

## 2026-04-30 — Day 1: Infrastructure

Note: auth-router (#7) was committed at 00:59 on 2026-05-01 at the end of the Apr 30 working session; the Copilot PR review for auth endpoints followed at 01:18. Auth screens and everything from #8 onwards are Day 2.

### Issues completed
- #1 Repo and folder scaffold — folder structure, `.gitignore`, `.env.example`, initial `AI_USAGE.md`, `DEV_LOG.md`
- #2 AI usage guardrail — `commit-msg` hook, `ai-usage-check.yml` GitHub Actions, `COPILOT_INSTRUCTIONS.md`, standing slugs `copilot`/`manual`/`coplit`
- #3 Supabase schema + RLS — `profiles`, `diary_entries`, `ingredient_cache` tables with CHECK constraints, foreign keys, CASCADE deletes; RLS policies scoped to `auth.uid()`; `meal-images` storage bucket with authenticated upload and public read policies
- #4 FastAPI scaffold + Railway — FastAPI app with `/health` and `/health/db`; `Dockerfile` with `python:3.12-slim`; deployed to Railway with `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `LOGMEAL_API_KEY`
- #5 Expo scaffold + navigation — TypeScript template; all packages installed; `RootNavigator` with auth/main stack split on token; `client.ts` axios instance with Bearer token interceptor
- #7 FastAPI auth router — `POST /auth/register` and `POST /auth/login` with Supabase Auth; `get_current_user` FastAPI dependency; committed at 00:59 May 1 at end of session

### Manual work
- Supabase: created project, executed full SQL schema in SQL Editor, wrote RLS policies, created `meal-images` bucket with storage policies; verified with two test users
- Railway: created project, wrote `Dockerfile`, set environment variables in dashboard, set root directory to `backend/`
- CI/CD: designed `[log:slug]` commit token convention; debugged 5 CI failure patterns (merge commits, Copilot suggestion commits, SHA-based merges, first-push zero SHA, `coplit` typo in one commit message)
- Copilot PR review applied to `auth.py` and `auth_guard.py`: exception handler for `ErrorResponse` format, case-insensitive Bearer token parsing, sync/async mismatch fixes

### Blockers resolved
- pydantic-core source compilation failed on Python 3.13 — pinned to `python:3.12-slim` in Dockerfile
- Railway did not detect Dockerfile — set builder to Dockerfile explicitly and root directory to `backend/`
- CI failing on merge commit message formats — extended regex to cover all GitHub-generated merge message variants
- CI failing on Copilot "Apply suggestions from code review" commits — added pattern match to auto-pass
- `coplit` typo in commit message — added standing entry to `AI_USAGE.md` to recover without CI failure

### Tomorrow
- Issues #8–#12: auth screens, OTP flow, profile, bbox overlay, LogMeal proxy

---

## 2026-05-01 — Day 2: Auth and Proxy

### Issues completed
- #8 Login + Signup screens — `LogoMark`, `Input`, `Button`, `ErrorMessage` reusable components; `LoginScreen` and `SignupScreen` with client-side validation and API calls; JWT persisted via `expo-secure-store`; `AuthScreenLayout` and `useAuthForm` hook extracted via Copilot PR review
- #9 FastAPI profile router — `GET /profile` (404 if no profile), `PUT /profile` with upsert and server-side BMI: `round(weight_kg / (height_m ** 2), 1)`
- #10 Profile screen — `PickerField` modal bottom-sheet component; `ProfileScreen` with live BMI badge (colour-coded blue/green/amber/red), section cards, save/error/success banners, sign-out button
- #11 SPIKE: bbox overlay — `BboxOverlay` with coordinate-space scaling (`scaleX = displayWidth / processedImageSize.width`, `scaleY = displayHeight / processedImageSize.height`); three-tier label placement (above/inside/below box); dark theme applied to tab bar and header; `OtpScreen` with 30s resend cooldown added to `AuthStack`
- #12 FastAPI LogMeal proxy — `POST /segment` (30s timeout, MIME normalisation, Supabase Storage upload, `image_url` in response); `POST /confirm` (all regions batched with `food_item_position`/`confirmedClass`/`source` arrays); `POST /nutrition`; `GET /ingredients` (24h Supabase cache, replace-on-miss, write failure does not block response); `POST /compute_nutrients` (field transform: `ingredientId`/`ingredientAmount`)

### Manual work
- Colour theme tokens defined (`colors.ts`, `spacing.ts`, `typography.ts`); auth schema (`AuthRequest`, `AuthResponse`) and Supabase auth routes verified against backend
- `POST /auth/verify-otp` and `POST /auth/resend-otp` endpoints added to `auth.py` and `schemas.py`; `OtpScreen` and `AuthStack` wired in mobile
- `BboxOverlay` three-tier label placement fixed (above/inside/below thresholds); `displayHeight` computed from aspect ratio to avoid letterboxing; `spacing.lg` token replaced hardcoded padding
- Copilot PR review applied to `profile.py`: HTTPException added for empty `updated.data` response
- Railway redeployed after `logmeal-proxy` commit; POST /segment tested via curl with sample JPEG

### Tomorrow
- Issues #13–#16: photo log screen, dish confirmation flow, ingredient catalogue, manual log screen

---

## 2026-05-02 — Day 3: PhotoLog and Manual

### Issues completed
- #13 Photo log screen — camera + gallery with permission handling; multipart upload to `/logmeal/segment`; `BboxOverlay` wired to live API response; per-region cards with top-5 candidates; empty-segmentation path; status-code error mapping
- #14 Dish confirmation + serving editor — per-region dish selection (state keyed by region index); Step A confirm to `/logmeal/confirm` + Step B nutrition from `/logmeal/nutrition` + Step C serving editor with live kcal adjustment; `POST /diary` save with `image_url`
- #15 Ingredient catalogue cache — `GET /ingredients` checks Supabase `ingredient_cache` freshness; fetches from LogMeal on cache miss; replaces full cache; write failure does not block response
- #16 Manual log screen — catalogue loaded on mount, client-side search (no API call on keystroke), basket with gram editing, `POST /compute_nutrients` for kcal, save to diary

### Manual work
- MIME type normalised (`image/jpg` → `image/jpeg`) in `logmeal.py` to pass LogMeal validation; `expo-image-manipulator` added to `client.ts` for JPEG conversion + resize on Android
- Axios Android type failure identified and fixed in `client.ts`
- `RootNavigator` updated to handle 1h Supabase token expiry: forced logout on 401 after refresh
- Per-region confirm selection fixed: selection state keyed by region index, not a single global boolean
- `diary.py` food_name updated to include region ID
- `compute_nutrients` payload renamed to match LogMeal field names (`ingredientId`, `ingredientAmount`)
- Keyboard dismiss on tap-outside and clear-search button fixed in `ManualLogScreen`
- Copilot PR review applied to `logmeal.py` GET /ingredients cache query

### Blockers resolved
- LogMeal rejected `image/jpg` MIME type with 400 — normalised to `image/jpeg` before forwarding in `/segment`
- Per-region confirm selection shared a single boolean state — fixed to key selection by region index
- `compute_nutrients` payload field names did not match LogMeal API spec — renamed `id`→`ingredientId`, `amount`→`ingredientAmount`

### Tomorrow
- Issues #17–#20: diary backend + screen, error handling, image upload

---

## 2026-05-03 — Day 4: Diary and Polish

### Issues completed
- #17 FastAPI diary router — `POST /diary` (201), `GET /diary` (date-grouped descending, entries sorted ascending within each group), `DELETE /diary/{id}` (204, user-scoped ownership check, identical 404 for not-found and wrong-user)
- #18 Diary screen — `useFocusEffect` refetch; `SectionList` with `MaskedView` gradient kcal headers; `TouchableOpacity` delete button; `RefreshControl` pull-to-refresh; full-screen `Modal` image viewer
- #19 API error handling — `Toast` component with animated fade/slide (module-level ref, `showToast` helper); axios interceptors for 401 refresh-retry + `clearAuth` redirect, 429 warning toast, 5xx error toast, network error toast; `ToastProvider` mounted in `App.tsx`
- #20 Image upload to Supabase Storage — image uploaded to `meal-images` bucket during segmentation; public URL included in `/segment` response and stored in `diary_entries.image_url` on diary save

### Manual work
- kcal calculation corrected: extraction path changed to `nutritional_info.totalNutritients.ENERC_KCAL.quantity` after cross-referencing LogMeal API docs
- Debug `console.log` statements added to `logmeal.py`, `DiaryScreen.tsx`, and `ManualLogScreen.tsx` for error analysis; removed in subsequent cleanup
- Unified 401 error shape in `auth_guard.py`; Supabase calls in `profile.py` wrapped in try/except
- Dead `_raise_for_logmeal_status` function and unused `JSONResponse` import removed from `logmeal.py`
- `/confirm` payload debugged via print logs: `food_item_position` and `confirmedClass` must be equal-length arrays; `source` array generated server-side; field name corrected iteratively across three commits (`confirm-debug` → `photo-log-confirm-fix` → `field-name` → `required-field`)
- Confirm endpoint changed to batch all detected regions in one call (`all-regions`)
- Delete button replaced: `PanResponder` swipe inaccessible on some devices; replaced with always-visible `TouchableOpacity` button in `DiaryScreen` (`delete-btn`)
- Code audit: removed debug print statements from `auth.py` (`verify_otp`, `resend_otp`) and `logmeal.py` (all 5 endpoints); removed unused imports; added `-> dict` return types to health endpoints
- Mobile cleanup: 9 color tokens added to `colors.ts` (BMI categories, success banner, modalBackdrop, loadingImageOverlay); hardcoded hex replaced with tokens in `ProfileScreen`, `DiaryScreen`, `PhotoLogScreen`, `BboxOverlay`; dead `hasProfile` state removed from `ProfileScreen`

### Build and integration
- Railway redeployed throughout the day after each fix
- `eas.json` created with development/preview/production/preview-simulator profiles; `app.json` updated with `android.package`, `android.versionCode`, `ios.bundleIdentifier`; `buildType "aab"` corrected to `"app-bundle"` to pass EAS schema validation
- `expo-font` installed via `npx expo install expo-font` to resolve expo doctor peer-dependency failure blocking EAS build
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` set in Expo Cloud (preview environment) via `eas env:create --scope project`; confirmed with `eas env:list`
- App icons and navigation tab icons updated in `assets/` and `MainTabs.tsx`; `app.json` icon paths verified

### Blockers resolved
- `/confirm` call returned "missing fields" — payload shape debugged; `food_item_position` and `confirmedClass` must be arrays, not per-region scalars
- All regions must be confirmed in one batch call — rewrote payload to send arrays covering all detected regions
- kcal showed 0 after `compute_nutrients` — traced to wrong response path; corrected to `totalNutritients.ENERC_KCAL.quantity`
- `PanResponder` swipe delete not reliably triggerable — replaced with always-visible delete button

### Tomorrow
- Documentation: README, ARCHITECTURE, USER_MANUAL, LIMITATIONS
- AI_USAGE.md review and cleanup
- APK download link and demo video

---

## 2026-05-04 — Day 5: Documentation

### Issues completed
- #22 README + architecture docs — `README.md`, `docs/ARCHITECTURE.md`, `docs/USER_MANUAL.md`, `LIMITATIONS.md` written
- #23 Finalise AI_USAGE.md — all rows reviewed and improved (this session)

### Manual work
- `README.md`: project overview, stack, setup instructions for backend and mobile, APK install guide (Android 10+), Railway URL, required environment variables
- `docs/ARCHITECTURE.md`: system diagram, component responsibilities, Supabase schema, Railway deployment config, local run instructions for backend and mobile
- `docs/USER_MANUAL.md`: step-by-step guide for all 5 flows — auth (register/login/OTP), profile, photo logging, manual logging, diary view and delete
- `LIMITATIONS.md`: free-tier constraints documented — LogMeal (20 credits/day), Supabase Auth OTP rate limits, Railway cold-start delay, iOS build not produced and why
- `DEV_LOG.md` reviewed and updated (this session)
- `AI_USAGE.md` reviewed and all vague/incomplete entries cleaned (this session)

### Build status
- EAS build triggered after Expo Cloud env vars confirmed; APK pending download link — #21 complete pending link
- Demo video: pending APK install verification on device — #24 not started
- Final submission: #25 not started
