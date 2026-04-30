# Dev Log

Daily progress log for the Food Diary RSE take-home task.
Used to consolidate the final submission report.

---

## 2026-04-30 -- Day 0: Planning

### What I did

**Requirements**
- Analysed the full task brief - identified mandatory vs optional requirements
- Mapped all 5 core features: auth, user profile, photo logging, manual logging, diary view
- Noted critical implementation details from the brief (bbox coordinate space, ingredient cache, serving size kcal adjustment)

**Tech stack**
- React Native + Expo (mobile app, APK deliverable)
- FastAPI + Python (backend, API proxy)
- Supabase (auth, Postgres, image storage)
- Railway (backend deployment)
- expo-image-picker, expo-camera, react-native-svg, zustand, axios

**Architecture**
- Proxy pattern: all LogMeal API calls go through FastAPI -- API key never reaches the mobile app
- Supabase Auth handles JWT -- no custom auth logic needed
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
- LogMeal API key requested -- access needed before Day 1 implementation starts

### Blockers
- LogMeal API key not yet confirmed -- needed before any API integration work

### Tomorrow (Day 1)
- Issues #1–#11: scaffold setup, Supabase schema, FastAPI scaffold, Expo scaffold, auth, profile, bbox spike

## 2026-04-30 -- Day 1: Implementation

### What I did
