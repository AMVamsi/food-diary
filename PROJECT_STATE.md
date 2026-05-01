# Project State

Single source of truth for what is built, what is in progress, and what is next.
Update this file at the end of every working session before committing.
Reference it at the start of every Copilot Chat session.

---

## Current status
#12 done — LogMeal proxy router implemented; Railway redeploy needed to activate /logmeal endpoints.

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
| #13 | Photo log screen | ⬜ not started |
| #14 | Dish confirmation + serving editor | ⬜ not started |
| #15 | Ingredient catalogue cache | ⬜ not started |
| #16 | Manual log screen | ⬜ not started |
| #17 | FastAPI diary router | ⬜ not started |
| #18 | Diary screen | ⬜ not started |
| #19 | API error handling | ⬜ not started |
| #20 | Image upload to Supabase Storage | ⬜ not started |
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
- Mobile: BboxOverlay component with coordinate-space scaling (react-native-svg); PhotoLogScreen test harness showing pizza image with three cyan bounding boxes (tiers 1–3) and debug card
- Backend: /logmeal/segment, /logmeal/confirm, /logmeal/nutrition implemented — Railway redeploy required

## Known issues / blockers
- #9 profile router needs Railway redeploy to activate
- #12 logmeal router needs Railway redeploy to activate (LOGMEAL_API_KEY must be set in Railway env vars)

## Environment
- Backend deployed at: https://food-diary-production-cd15.up.railway.app
- Supabase project URL: configured (see backend/.env)
- APK: not yet built