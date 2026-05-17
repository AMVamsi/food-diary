# Food Diary

> AI-powered mobile food diary — photograph a meal to identify it, or search ingredients manually. Built with React Native, FastAPI, and the LogMeal food recognition API.

[![AI Usage Check](https://github.com/AMVamsi/food-diary/actions/workflows/ai-usage-check.yml/badge.svg)](https://github.com/AMVamsi/food-diary/actions/workflows/ai-usage-check.yml)
![Android](https://img.shields.io/badge/Android-API_29%2B-3DDC84?logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-cross--platform_code-000000?logo=apple&logoColor=white)

![React Native](https://img.shields.io/badge/React_Native-0.76-20232A?logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![React Navigation](https://img.shields.io/badge/React_Navigation-v6-6B52AE?logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-state-433E38?logoColor=white)

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-v2-E92063?logo=pydantic&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-containerised-2496ED?logo=docker&logoColor=white)

![Supabase](https://img.shields.io/badge/Supabase-Auth_%26_DB-3ECF8E?logo=supabase&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-deployed-0B0D0E?logo=railway&logoColor=white)

[![License](https://img.shields.io/badge/license-proprietary-red)]()
---

## What it does

Food Diary lets users track daily calorie intake through two logging flows:

- **Photo log** — take a photo or pick one from the gallery. The image is sent to the LogMeal segmentation API, which returns bounding boxes and top-5 dish candidates for each detected food region. Users confirm (or correct) each region, edit the serving size in grams, and kcal updates instantly without an extra API call.
- **Manual log** — search a locally cached ingredient catalogue (≈3 000 items), add ingredients to a basket, set grams per item, and compute total kcal in one call.

All entries are stored in a date-grouped diary with per-day kcal totals, photo thumbnails, and swipe-to-delete. An optional profile screen tracks weight, height, goal, and dietary preference, with live BMI calculation.

---

## Architecture

```
Android App  (Expo / React Native + TypeScript)
      │
      │  HTTPS + Bearer JWT
      ▼
FastAPI  (Railway)  ─────────────────────────────┐
  ├── /auth       →  Supabase Auth               │
  ├── /profile    →  Supabase Postgres            │
  ├── /diary      →  Supabase Postgres            │
  └── /logmeal/*  →  LogMeal API  (key server-side only)
                                                  │
                     Supabase Storage  ◄──────────┘
                     (meal-images bucket — public URL
                      stored in diary_entries.image_url)
```

The mobile app never calls LogMeal directly. The `LOGMEAL_API_KEY` lives only in Railway environment variables and is never shipped in the APK.

---

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo SDK 54, TypeScript (strict) |
| State | Zustand — one store per domain |
| Backend | Python 3.12, FastAPI 0.115, httpx async |
| Database | Supabase Postgres (profiles, diary entries, ingredient cache) |
| Auth | Supabase Auth — JWT, OTP email verification, auto-refresh |
| Storage | Supabase Storage — meal-images bucket |
| AI | LogMeal API — food segmentation, confirmation, nutrition |
| Deployment | Railway (backend), EAS Build (Android APK) |

---

## Getting started

Run the one-shot setup script to wire git hooks, create the Python virtualenv, install mobile dependencies, and validate project files:

```bash
bash setup.sh
```

Or set up each part manually:

### Prerequisites

| Tool | Version |
|---|---|
| Python | 3.12 |
| Node.js | ≥ 20 |
| EAS CLI | latest — `npm install -g eas-cli` |

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # fill in the three variables below
uvicorn app.main:app --reload
```

Confirm it is running:

```bash
curl http://127.0.0.1:8000/health
# {"status":"ok"}
```

### Mobile

```bash
cd mobile
npm install
```

Create `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://food-diary-production-cd15.up.railway.app
```

Start the dev server and press `a` to open on an Android device or emulator:

```bash
npx expo start
```

---

## Environment variables

### `backend/.env`

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Service role key — **backend only, never in mobile** |
| `LOGMEAL_API_KEY` | LogMeal API bearer token — **backend only, never in mobile** |

### `mobile/.env`

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | FastAPI backend base URL |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (for client-side session refresh) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public — safe in mobile) |

---

## APK

[**Download APK**](https://expo.dev/accounts/amvamsi/projects/food-diary/builds/be5696b1-41d5-4cff-9660-075da7451c98)

Requires Android 10 (API 29) or later. To install: go to **Settings → Apps → Special app access → Install unknown apps**, enable installation from your browser or file manager, open the APK, and tap Install.

---

## Demo

https://www.youtube.com/watch?v=bUg6UNzSWow

---

## Repository structure

```
food-diary/
├── backend/          FastAPI — auth, profile, diary, LogMeal proxy
│   ├── app/
│   │   ├── routers/  auth.py  profile.py  diary.py  logmeal.py
│   │   ├── models/   schemas.py
│   │   ├── middleware/auth_guard.py
│   │   └── db/       supabase.py
│   └── Dockerfile
├── mobile/           Expo React Native — Android app
│   └── src/
│       ├── screens/  PhotoLogScreen  ManualLogScreen  DiaryScreen  ProfileScreen
│       ├── components/BboxOverlay  Toast  Button  Input  PickerField
│       ├── store/    auth.ts  diary.ts
│       ├── api/      client.ts
│       └── theme/    colors  spacing  typography
├── docs/             Architecture and user manual
├── .github/          CI workflow and Copilot instructions
├── .githooks/        Pre-commit AI usage guardrail
├── .vscode/          Recommended extensions, workspace settings, and debug configs
└── setup.sh          One-shot dev environment bootstrap
```

---

## Docs

- [Architecture](docs/ARCHITECTURE.md) — system diagram, API reference, caching and auth design
- [User manual](docs/USER_MANUAL.md) — step-by-step guide for all five flows
- [Performance profiling](docs/profiling/PROFILING.md) — runtime analysis of POST /logmeal/segment
<<<<<<< HEAD
- [Contributing](CONTRIBUTING.md) — git workflow, commit conventions, and AI disclosure rules
=======
>>>>>>> 971e7e6 (perf(#32)[log:profiling]: add pyinstrument profile and PROFILING.md)
- [AI usage disclosure](AI_USAGE.md) — full record of AI-assisted and manual changes
- [Known limitations](LIMITATIONS.md) — free-tier constraints and deliberate design choices

## 📝 License

Proprietary --  All rights reserved by AMVamsi.