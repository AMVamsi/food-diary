# Architecture

Food Diary is built on three layers: an Expo React Native app running on Android, a FastAPI backend deployed on Railway, and Supabase providing the database, authentication, and file storage. The mobile app communicates with the backend over HTTPS REST, and the backend proxies all food recognition requests to the LogMeal API.

All requests to LogMeal are routed through FastAPI. The `LOGMEAL_API_KEY` is set as a Railway environment variable and never appears in the mobile codebase.

---

## System diagram

```
Mobile app (Expo / Android)
        |
        |  HTTPS REST  (Authorization: Bearer <JWT>)
        |  multipart/form-data for image uploads
        v
FastAPI backend (Railway)
  https://food-diary-production-cd15.up.railway.app
  |
  +-- /auth      ---> Supabase Auth
  +-- /profile   ---> Supabase Postgres  (profiles table)
  +-- /diary     ---> Supabase Postgres  (diary_entries table)
  +-- /logmeal   ---> LogMeal API  (HTTPS REST, Bearer API key)
  |                   https://api.logmeal.com/v2
  |
  +-- Supabase Storage SDK
        |
        v
  Supabase Storage  (meal-images bucket)
  public URL stored in diary_entries.image_url
```

---

## Backend routes

### /auth

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /auth/register | No | Create a new user via Supabase Auth. Returns 200 + JWT when email confirmation is disabled; returns 202 + pending when email confirmation is enabled. |
| POST | /auth/login | No | Sign in with email and password. Returns JWT on success; 401 on invalid credentials. |
| POST | /auth/verify-otp | No | Verify the 6-digit OTP sent to the user's email during signup. Tries both `signup` and `email` OTP types to handle differing Supabase project configurations. |
| POST | /auth/resend-otp | No | Resend the signup OTP to the user's email. Returns 204 on success. |

### /profile

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | /profile | Yes | Return the authenticated user's profile row. Returns 404 if no profile has been created yet. |
| PUT | /profile | Yes | Create or update the authenticated user's profile. Recomputes BMI when both weight_kg and height_cm are present: `round(weight_kg / (height_cm / 100) ** 2, 1)`. |

### /logmeal

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /logmeal/segment | Yes | Accept a meal image (multipart/form-data). Proxy to LogMeal segmentation API. Upload image to Supabase Storage and include the public URL in the response (null if upload fails — does not block the response). |
| POST | /logmeal/confirm | Yes | Forward the user's dish confirmation for one or more regions to LogMeal. Payload: imageId, food_item_position[], confirmedClass[]. |
| POST | /logmeal/nutrition | Yes | Fetch nutritional information for a confirmed image. Payload: imageId. Returns ENERC_KCAL in totalNutritients (LogMeal preserves this typo). |
| GET | /logmeal/ingredients | Yes | Return the full LogMeal ingredient catalogue. Checks the Supabase ingredient_cache table before calling LogMeal (see caching section). |
| POST | /logmeal/compute_nutrients | Yes | Compute nutrition for a basket of ingredients. Transforms client field names (id, amount) to LogMeal field names (ingredientId, ingredientAmount) before forwarding. |

### /diary

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /diary | Yes | Create a diary entry. Returns 201 with the created entry. The client sends `amount`; the backend writes it to the `grams` column. |
| GET | /diary | Yes | Return all diary entries for the authenticated user, grouped by date (most recent date first). Each group contains date, total_kcal, and an entries array. |
| DELETE | /diary/{entry_id} | Yes | Delete a diary entry by ID. Returns 204 on success. Returns 404 if the entry does not exist or belongs to a different user — the response is identical in both cases to avoid revealing whether an entry exists for another user. |

---

## Bounding box coordinate scaling

LogMeal's segmentation response includes bounding boxes in `processed_image_size` coordinate space — the pixel dimensions of the image after LogMeal's internal preprocessing. These dimensions differ from the dimensions at which the image is displayed on screen.

Without explicit scaling, boxes appear in incorrect positions because one unit in processed_image_size space does not equal one pixel on the device display.

The exact scaling formula from BboxOverlay.tsx:

```
Scale factors:
  scaleX = displayWidth  / processedImageSize.width
  scaleY = displayHeight / processedImageSize.height

Applied to each bbox [x, y, w, h]:
  screenX = x * scaleX
  screenY = y * scaleY
  screenW = w * scaleX
  screenH = h * scaleY
```

The API response field `processed_image_size` is passed from the segmentation response to BboxOverlay as the `processedImageSize` prop, alongside the display dimensions measured from the React Native layout.

---

## Ingredient catalogue caching

The LogMeal ingredient catalogue is a large list returned by `GET /v2/dataset/ingredients`. Fetching it on every search would be slow and would consume API quota on every keystroke.

The backend caches the catalogue in the Supabase `ingredient_cache` table with a TTL of 24 hours.

Cache check logic:

1. Query `ingredient_cache` for the most recent `fetched_at` timestamp.
2. If the timestamp is within the last 24 hours, read and return all cached rows — LogMeal is not called.
3. If the timestamp is absent or older than 24 hours, fetch fresh data from LogMeal.
4. On a fresh fetch, delete all existing rows and insert the new catalogue with the current UTC timestamp.
5. If the Supabase write fails during cache refresh, the error is silently swallowed. The freshly fetched data is still returned to the client.

The mobile app receives the full catalogue in a single response and filters results client-side as the user types. No API call is made per keystroke.

---

## Database schema

### profiles

| Column | Type | Constraints | Notes |
|---|---|---|---|
| user_id | uuid | PRIMARY KEY, REFERENCES auth.users ON DELETE CASCADE | Supabase Auth user ID |
| age | integer | — | Optional |
| sex | text | — | Optional |
| weight_kg | float | — | Used for BMI calculation |
| height_cm | float | — | Used for BMI calculation |
| goal | text | — | Optional |
| dietary_preference | text | — | Optional |
| activity_level | text | — | Optional |
| bmi | float | — | Computed server-side on PUT /profile |

RLS enabled. Users can only read and write their own row (scoped to `auth.uid()`).

### diary_entries

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | uuid | PRIMARY KEY DEFAULT gen_random_uuid() | — |
| user_id | uuid | REFERENCES auth.users ON DELETE CASCADE | — |
| logged_at | timestamptz | DEFAULT now() | Entry timestamp |
| entry_type | text | CHECK IN ('photo', 'manual') | — |
| food_name | text | — | — |
| kcal | float | — | — |
| grams | float | — | Stored as `grams`; exposed as `amount` in the API response |
| image_url | text | — | Public Supabase Storage URL; null for manual entries |
| notes | text | — | Optional |

RLS enabled. Users can only read and write their own rows (scoped to `auth.uid()`).

### ingredient_cache

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | integer | PRIMARY KEY | LogMeal ingredient ID |
| name | text | NOT NULL | Ingredient name |
| fetched_at | timestamptz | NOT NULL | Timestamp of the cache write |

No RLS — this table holds shared reference data with no user-specific content.

---

## Authentication flow

Supabase Auth issues JWTs on successful registration or login. The mobile app stores the access token in `expo-secure-store` under the key `auth_token` and the user ID under `auth_user_id`.

On every request, the axios interceptor in `client.ts` reads the token from the Zustand auth store and attaches it as `Authorization: Bearer <token>`. For non-FormData bodies, it also sets `Content-Type: application/json`. FormData requests (image uploads) must not have Content-Type pre-set — the native XHR layer sets `multipart/form-data` with the boundary automatically.

The FastAPI `get_current_user` dependency — used via `Depends(get_current_user)` on every protected route — extracts the Bearer token from the `Authorization` header and validates it by calling `supabase.auth.get_user(token)`. Any invalid or expired token receives a 401 response.

On a 401, the client interceptor attempts a silent token refresh via the Supabase JS client. If refresh succeeds, the original request is retried once with the new token. If refresh fails, `clearAuth()` is called and the navigation stack switches to the login screen.

`RootNavigator` subscribes to `supabase.auth.onAuthStateChange` to keep the Zustand store in sync when Supabase's background token auto-refresh rotates the JWT without triggering a new login.

---

## Image storage

Meal images are stored in the Supabase Storage `meal-images` bucket, configured as public so images can be served without per-request signed URLs.

Filename pattern: `{user_id}/{uuid}.jpg`. The user_id prefix namespaces each user's images, making it straightforward to list or clean up a user's files.

During `POST /logmeal/segment`, the backend reads the uploaded file content into memory, forwards it to LogMeal, then uploads the same bytes to Supabase Storage. If the Storage upload fails, the error is silently caught, `image_url` is set to null in the response, and the segmentation results are still returned. A storage failure does not block the photo log flow.

The public URL is included in the segmentation response. When the user saves the entry, the mobile app passes `image_url` in the `POST /diary` body and it is stored in `diary_entries.image_url`.

---

## Deployment

### Backend — Railway

The backend is deployed at `https://food-diary-production-cd15.up.railway.app`.

Railway builds the container from `backend/Dockerfile` using `python:3.12-slim` as the base image. The startup command is:

```
sh -c "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
```

Railway injects `PORT` automatically. The Procfile (`web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`) is used when Railway detects it instead of the Dockerfile. Environment variables `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `LOGMEAL_API_KEY` are set in the Railway dashboard. Deployments trigger automatically on push to the main branch.

### Mobile — Expo EAS Build

The app is built with Expo EAS Build using the `preview` profile, which produces a standalone APK for Android (package `com.fooddiary.app`, version `1.0.0-beta`, versionCode 1). The APK can be installed directly on any Android device running API 29 or later without the Play Store.

The application uses free-tier services for this submission.

See [LIMITATIONS.md](../LIMITATIONS.md) for specific rate limits and constraints that apply to the current deployment.

[APK download — link to be added after build]

---

## CI/CD

### Continuous Integration (ci.yml)

Triggers on every push and pull request to `main` and `dev`.

**Backend job:**
1. Install dependencies from `requirements.lock` (falls back to `requirements.txt` if lockfile absent)
2. `ruff check backend/app/` — lint must pass before tests run
3. `ruff format --check backend/app/` — format check
4. `pytest backend/tests/ --cov=backend/app --cov-report=xml` — tests with coverage
5. Upload `coverage.xml` to CodeCov with flag `backend`

**Mobile job:**
1. `npm ci` — reproducible install from `package-lock.json`
2. `npx eslint src/` — lint must pass before tests run
3. `npx prettier --check "src/**/*.{ts,tsx}"` — format check
4. `npm test -- --coverage --coverageReporters=lcov` — tests with coverage
5. Upload `mobile/coverage/lcov.info` to CodeCov with flag `mobile`

CodeCov token is read from `${{ secrets.CODECOV_TOKEN }}` — never hardcoded.

### Continuous Deployment

**Android APK:** built via EAS Build (`preview` profile using `assembleRelease`), attached to GitHub Release v1.0.0-beta.

**Backend:** auto-deploys to Railway on push to `main` via Dockerfile. Railway injects `PORT`; the container starts uvicorn on that port.

### AI Usage CI (ai-usage-check.yml)

Triggers on every push (all branches) and on pull requests to `main`.

Enforces `[log:slug]` token on every non-merge, non-auto-generated commit. Validates that each slug has a corresponding row in `AI_USAGE.md`. Merge commits, Copilot review suggestion commits, and GitHub web-editor "Update *.md" commits are automatically exempted.
