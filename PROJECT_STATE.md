# Project State

Single source of truth for what is built, what is in progress, and what is next.
Update this file at the end of every working session before committing.
Reference it at the start of every Copilot Chat session.

---

## Current status
#17 done — diary router fully implemented: POST /diary (201), GET /diary (grouped by date), DELETE /diary/{id} (204); Pydantic models moved to schemas.py.
#18 done — DiaryScreen fully implemented: useFocusEffect fetch, state machine (loading/error/empty/populated), SectionList with gradient kcal headers, swipe-to-delete (PanResponder), pull-to-refresh, full-screen image modal.
Railway redeploy required to activate new /logmeal endpoints, POST /diary, GET /diary, DELETE /diary/{id}.

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
| #9 | FastAPI profile router | ✅ done — Railway redeploy required |
| #10 | Profile screen | ✅ done |
| #11 | SPIKE: bbox overlay | ✅ done |
| #12 | FastAPI LogMeal proxy | ✅ done — Railway redeploy required |
| #13 | Photo log screen | ✅ done |
| #14 | Dish confirmation + serving editor | ✅ done |
| #15 | Ingredient catalogue cache | ✅ done — Railway redeploy required |
| #16 | Manual log screen | ✅ done |
| #17 | FastAPI diary router | ✅ done — Railway redeploy required |
| #18 | Diary screen | ✅ done |
| #19 | API error handling | ✅ done |
| #20 | Image upload to Supabase Storage | ✅ done |
| #21 | EAS build — APK | ⬜ not started |
| #22 | README + architecture docs | ⬜ not started |
| #23 | Finalise AI_USAGE.md | ⬜ not started |
| #24 | Demo video | ⬜ not started |
| #25 | Final submission | ⬜ not started |

---

## What is working
- Repo structure in place
- Pre-commit hook and GitHub Actions AI guardrail active
- GitHub issues #1–#25 created with labels
- Backend: /auth/register, /auth/login deployed on Railway
- Backend: /profile GET + PUT implemented — Railway redeploy needed to go live
- Mobile: Login + Signup screens, shared AuthScreenLayout + useAuthForm hook
- Mobile: Profile screen with live BMI, GET/PUT /profile, PickerField modal component
- Mobile: BboxOverlay component with coordinate-space scaling (react-native-svg)
- Mobile: PhotoLogScreen — camera + gallery flows with permissions, multipart upload to /logmeal/segment, BboxOverlay wired to real API response, region cards with top-5 candidates, error state with status-code mapping, empty-segmentation path, #14 confirm placeholder
- Backend: /logmeal/segment, /logmeal/confirm, /logmeal/nutrition implemented — Railway redeploy required
- Backend: /logmeal/ingredients (with Supabase 24h cache), /logmeal/compute_nutrients implemented — Railway redeploy required
- Mobile: ManualLogScreen — catalogue load/cache, search, basket with gram editing, kcal calculation, save to diary
- Backend: POST /diary (201), GET /diary (date-grouped, sorted), DELETE /diary/{id} (204, user-scoped); DiaryEntryIn, DiaryEntryOut, DiaryDayOut added to schemas.py
- Mobile: DiaryScreen — useFocusEffect refetch, loading/error/empty/populated states, SectionList with MaskedView gradient kcal headers, PanResponder swipe-to-delete, pull-to-refresh, full-screen image modal

## Known issues / blockers
- #9 profile router needs Railway redeploy to activate
- #12 logmeal router needs Railway redeploy to activate (LOGMEAL_API_KEY must be set in Railway env vars)

## Environment
- Backend deployed at: https://food-diary-production-cd15.up.railway.app
- Supabase project URL: configured (see backend/.env)
- APK: not yet built