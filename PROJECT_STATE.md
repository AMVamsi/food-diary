# Project State

Single source of truth for what is built, what is in progress, and what is next.
Update this file at the end of every working session before committing.
Reference it at the start of every Copilot Chat session.

---

## Current status

Day 6 — course-work implementation sprint complete. Issues #26–#35 closed. Pre-merge verification
pass done: ruff lint clean, pytest 16/16, jest 29/29, eslint and prettier clean, CI workflow updated.
Branch `test` is ready for PR merge into `main`. Last updated: 2026-05-17.

---

## Issues

| # | Title | Status |
|---|-------|--------|
| #1 | Repo and folder scaffold | ✅ done |
| #2 | AI usage guardrail | ✅ done |
| #3 | Supabase schema + RLS | ✅ done |
| #4 | FastAPI scaffold + Railway | ✅ done |
| #5 | Expo scaffold + navigation | ✅ done |
| #6 | GitHub issues logged | ✅ done |
| #7 | FastAPI auth router | ✅ done |
| #8 | Login + Signup screens | ✅ done |
| #9 | FastAPI profile router | ✅ done |
| #10 | Profile screen | ✅ done |
| #11 | SPIKE: bbox overlay | ✅ done |
| #12 | FastAPI LogMeal proxy | ✅ done |
| #13 | Photo log screen | ✅ done |
| #14 | Dish confirmation + serving editor | ✅ done |
| #15 | Ingredient catalogue cache | ✅ done |
| #16 | Manual log screen | ✅ done |
| #17 | FastAPI diary router | ✅ done |
| #18 | Diary screen | ✅ done |
| #19 | API error handling | ✅ done |
| #20 | Image upload to Supabase Storage | ✅ done |
| #21 | EAS build — APK | ✅ done |
| #22 | README + architecture docs | ✅ done |
| #23 | Finalise AI_USAGE.md |  ✅ done |
| #24 | Demo video | ✅ done |
| #25 | Final submission | ✅ done|
| #57 | LICENSE file | ✅ done |
| #58 | IDE config (.vscode, ESLint, Prettier, Ruff) | ✅ done |
| #59 | Jest tests (bbox scaling, diary store) | ✅ done |
| #60 | pytest tests (profile, cache, diary) | ✅ done |
| #61 | Full CI workflow (lint, format, test, coverage) | ✅ done |
| #62 | Profiling artefact and PROFILING.md | ✅ done |
| #63 | CONTRIBUTING.md and git workflow docs | ✅ done |
| #64 | GitHub Release v1.0.0-beta and CHANGELOG.md | ✅ done |
| #65 | pyproject.toml and requirements.lock | ✅ done |

---

## What is working

- Repo structure in place
- Pre-commit hook and GitHub Actions AI guardrail active
- GitHub issues #1–#25 created with labels
- Backend: /auth/register, /auth/login, /auth/verify-otp, /auth/resend-otp deployed on Railway
- Backend: /profile GET + PUT deployed
- Backend: /logmeal/segment, /logmeal/confirm, /logmeal/nutrition, /logmeal/ingredients (24h Supabase cache), /logmeal/compute_nutrients deployed
- Backend: POST /diary (201), GET /diary (date-grouped), DELETE /diary/{id} (204) deployed
- Mobile: Login + Signup screens with shared AuthScreenLayout + useAuthForm hook
- Mobile: OTP verification screen with 30s resend cooldown
- Mobile: Profile screen with live BMI, GET/PUT /profile, PickerField modal component
- Mobile: BboxOverlay component with coordinate-space scaling (react-native-svg)
- Mobile: PhotoLogScreen — camera + gallery flows, multipart upload to /logmeal/segment, BboxOverlay, region cards with top-5 candidates, confirm + nutrition flow, serving size editor
- Mobile: ManualLogScreen — catalogue load with Supabase-cached data, search, basket with gram editing, kcal calculation, save to diary
- Mobile: DiaryScreen — useFocusEffect refetch, SectionList with MaskedView gradient kcal headers, PanResponder swipe-to-delete, pull-to-refresh, full-screen image modal
- Mobile: Global 401 token refresh + clearAuth, 429/500 toast feedback
- Mobile: Image upload to Supabase Storage (meal-images bucket) during segmentation
- Docs: README.md, docs/ARCHITECTURE.md, docs/USER_MANUAL.md complete

## Known issues / blockers

- The application uses free-tier services for this submission.

See [LIMITATIONS.md](../LIMITATIONS.md) for specific rate limits and constraints that apply to the current deployment.

## Environment

- Backend deployed at: https://food-diary-production-cd15.up.railway.app
- Supabase project URL: configured in Railway env vars (not in tracked files)
- APK: [placeholder — link to be added after EAS build]
- Demo video: [placeholder — link to be added after APK install verified]
