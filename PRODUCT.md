# Product — Food Diary

## What we are building
A mobile food diary application for tracking daily meal intake.
Users log meals either by photographing food or searching ingredients manually.
The app uses the LogMeal API for AI-powered food recognition and nutrition data.

---

## Users and flows

### 1. Auth
- User registers with email and password
- User logs in and receives a JWT
- All features are gated behind authentication
- JWT persists across app restarts via expo-secure-store

### 2. Profile (optional but implemented)
- User enters: age, sex, weight (kg), height (cm), goal, dietary preference, activity level
- BMI is calculated automatically: weight_kg / (height_m ** 2), rounded to 1dp
- BMI is displayed with colour coding: underweight / normal / overweight / obese
- Profile is saved to Supabase and persists across sessions

### 3. Photo meal logging (mandatory)
- User takes a photo or picks from gallery
- Image is sent to the backend which proxies to LogMeal segmentation API
- LogMeal returns detected food regions, each with a bounding box and top-5 dish candidates
- Bounding boxes are drawn on the image using react-native-svg
- User confirms one dish per region (or picks a different candidate from the top 5)
- Confirmed selection is sent to LogMeal confirm API
- Nutrition data (kcal) is fetched from LogMeal nutrition API
- User can edit the serving size in grams — kcal updates instantly
- User saves the entry to the diary or cancels

### 4. Manual meal logging (mandatory)
- User searches the LogMeal ingredient catalogue by name
- Catalogue is fetched once and cached — search filters client-side with no API calls
- User selects one or more ingredients and sets grams per item
- App computes total kcal via LogMeal compute_nutrients API
- User saves the composed meal to the diary or cancels

### 5. Food diary (mandatory)
- All logged meals are listed grouped by date
- Each entry shows: food name, grams, kcal
- Daily kcal total shown per date group
- Photo entries show a thumbnail — tapping opens full image
- User can delete any entry

---

## LogMeal API — endpoints used

| Endpoint | Method | When used |
|----------|--------|-----------|
| /v2/image/segmentation/complete | POST | Photo logging — detect food regions |
| /v2/image/confirm/dish | POST | Photo logging — submit user's dish selection |
| /v2/nutrition/recipe/nutritionalInfo | POST | Photo logging — fetch kcal after confirmation |
| /v2/dataset/ingredients | GET | Manual logging — fetch ingredient catalogue |
| /v2/nutrition/recipe/compute_nutrients | POST | Manual logging — compute kcal for basket |

Base URL: https://api.logmeal.com
Auth: Bearer token from LOGMEAL_API_KEY (backend only — never in mobile)

### Critical: bounding box coordinate space
contained_bbox is returned as [x, y, width, height] in processed_image_size space.
Display dimensions differ. Always scale before drawing:
  scaleX = displayWidth / processed_image_size.width
  scaleY = displayHeight / processed_image_size.height
This applies only in BboxOverlay.tsx using react-native-svg.

### Ingredient catalogue caching
- Fetched once from LogMeal on first request
- Stored in Supabase ingredient_cache table with fetched_at timestamp
- Re-fetched only if cache is older than 24 hours
- Client receives the full list and filters locally — no API call on keystroke

### kcal adjustment formula
When user edits serving grams after nutrition is fetched:
  adjusted_kcal = (base_kcal / base_grams) * user_grams
This is a client-side calculation — no extra API call needed.

---

## Database schema

```sql
-- Auth managed by Supabase Auth (auth.users)

CREATE TABLE profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age          integer,
  sex          text,
  weight_kg    float,
  height_cm    float,
  goal         text,
  dietary_preference text,
  activity_level     text,
  bmi          float
);

CREATE TABLE diary_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_at    timestamptz DEFAULT now(),
  entry_type   text CHECK (entry_type IN ('photo', 'manual')),
  food_name    text,
  kcal         float,
  grams        float,
  image_url    text,
  notes        text
);

CREATE TABLE ingredient_cache (
  id              integer PRIMARY KEY,
  name            text NOT NULL,
  fetched_at      timestamptz NOT NULL,
  avg_quantity    float,        -- written when present in LogMeal response
  modifier_type   text,         -- written when present in LogMeal response
  state           text,         -- written when present in LogMeal response
  unit            text          -- written when present in LogMeal response
);
```

RLS is enabled on profiles and diary_entries.
All queries are scoped to auth.uid() — users can only access their own data.
Meal images are stored in the meal-images Supabase Storage bucket.
File path: {user_id}/{uuid}.jpg — public URL stored in diary_entries.image_url.

---

## Architecture

React Native (Expo)
↓  REST + multipart/form-data
FastAPI (Railway)
├── /auth        → Supabase Auth
├── /profile     → Supabase Postgres (profiles table)
├── /diary       → Supabase Postgres (diary_entries table)
└── /logmeal/*   → LogMeal API proxy (API key never leaves backend)
↓
Supabase Storage (meal-images bucket)

The mobile app never calls LogMeal directly.
All LogMeal requests are proxied through FastAPI so the API key stays server-side.

---

## Deliverables
- Android APK (EAS Build, not Expo Go)
- Backend deployed on Railway
- Source code in GitHub repository
- AI_USAGE.md — disclosure of all AI-assisted changes
- DEVLOG.md — daily progress log
- docs/ARCHITECTURE.md — architecture and setup instructions
- docs/USER_MANUAL.md — step-by-step user guide
- Demo video — all 5 flows recorded on the installed APK
