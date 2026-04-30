# Copilot Instructions — Food Diary RSE Task

## Behaviour rules
- DO NOT read, edit, or suggest changes to any file you were not explicitly assigned to work on
- DO NOT implement anything beyond the current request
- If a change affects existing functionality or touches an out-of-scope file, STOP and ask
- When done, summarise: files changed, what was done, what to test
- Always end with an AI_USAGE.md reminder and a suggested commit message with a [log:slug] token

## Project
Mobile food diary — React Native (Expo) + FastAPI + Supabase + LogMeal API for food recognition.

## Stack — do not suggest alternatives
- Mobile: React Native + Expo SDK 51, TypeScript strict mode
- Backend: Python 3.12, FastAPI, httpx async, supabase-py
- Auth + DB + Storage: Supabase
- State: Zustand — one store per domain in mobile/src/store/
- Navigation: React Navigation v6
- Bounding box overlay: react-native-svg

## Code rules
- Python: snake_case, type hints on all signatures, Pydantic for all request/response shapes
- TypeScript: no `any`, functional components only, StyleSheet at bottom of file, no inline styles
- All mobile API calls go through mobile/src/api/client.ts — never call axios/fetch directly in a screen
- FastAPI error shape: always `{"error": str, "detail": str}`
- LOGMEAL_API_KEY lives only in Railway env vars — never in mobile code

## LogMeal critical notes
- bbox contained_bbox is [x, y, w, h] in processed_image_size space — always scale before drawing:
  scaleX = displayWidth / processed_image_size.width
  scaleY = displayHeight / processed_image_size.height
- Ingredient catalogue: fetch once, cache in Supabase with 24h TTL, filter client-side only
- kcal adjustment: adjusted_kcal = (base_kcal / base_grams) * user_grams

## Supabase rules
- Service role key on backend only — never in mobile
- RLS enabled — all queries scoped to auth.uid()
- Meal images → meal-images storage bucket → public URL stored in diary_entries.image_url

## AI_USAGE.md — mandatory after every code generation
Remind me to add a row:
| slug | date | GitHub Copilot | #issue | files | what was generated | how verified | modifications |
Slug must match the [log:slug] token in the commit message.
For manual changes: Tool = manual, remaining columns = —

## Commit rules
When suggesting a commit message, always append [log:copilot] to the message.
Example: `fix: correct kcal calculation (#14) [log:copilot]`