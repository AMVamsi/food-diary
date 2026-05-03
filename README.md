# Food Diary

AI-powered mobile food diary. Users log meals by photographing food or searching ingredients manually. The app uses the LogMeal API for food recognition and nutrition data.

Built as a take-home task for the AI in Health and Nutrition Lab RSE position.

## Stack

| Layer | Technology | Purpose |
|---|---|---|
| Mobile | React Native + Expo SDK 54 | Android app |
| Backend | Python 3.12, FastAPI | API server, LogMeal proxy |
| Database | Supabase Postgres | Profiles, diary entries, ingredient cache |
| Auth | Supabase Auth | JWT-based authentication |
| Storage | Supabase Storage | Meal image storage |
| AI | LogMeal API | Food recognition and nutrition data |
| Deployment | Railway (backend), EAS Build (APK) | Cloud hosting, APK distribution |

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.12 | https://python.org/downloads |
| Node.js | ≥20 | https://nodejs.org |
| Expo CLI | latest | `npm install -g expo-cli` |
| EAS CLI | latest | `npm install -g eas-cli` |

## Backend setup

1. Clone the repository and move to the backend directory:
   ```
   git clone <repo-url>
   cd food-diary/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate

   # Windows
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Copy the example env file and fill in the three required values:
   ```
   cp .env.example .env
   ```

5. Start the server:
   ```
   uvicorn app.main:app --reload
   ```

6. Verify the server is running:
   ```
   curl http://127.0.0.1:8000/health
   # expected: {"status":"ok"}
   ```

## Mobile setup

1. Move to the mobile directory and install dependencies:
   ```
   cd food-diary/mobile
   npm install
   ```

2. Create a `.env` file in `mobile/` and set the backend URL:
   ```
   EXPO_PUBLIC_API_URL=https://food-diary-production-cd15.up.railway.app
   ```

3. Start the development server:
   ```
   npx expo start
   ```

4. Press `a` to open the app on an Android emulator or connected device.

## Environment variables

### backend/.env

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Yes | Supabase service role secret key (backend only — never in mobile) |
| `LOGMEAL_API_KEY` | Yes | LogMeal API bearer token |

### mobile/.env

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Yes | FastAPI backend base URL |

## APK

[APK download — link to be added after EAS build]

To install: enable "Install unknown apps" for your browser or file manager in Android Settings, open the downloaded APK file, and tap Install. Requires Android 10 (API 29) or later. The Food Diary icon will appear on your home screen after installation.

## Demo video

[Demo video — link to be added]

Demonstrates account creation, photo meal logging, manual meal logging, and diary view on the installed APK.

## Repository structure

```
food-diary/
├── backend/      FastAPI application — API server and LogMeal proxy
├── mobile/       Expo React Native application — Android app
├── docs/         Architecture documentation and user manual
├── .github/      GitHub Actions workflows and Copilot instructions
└── .githooks/    Pre-commit AI usage guardrail
```

## Links

- [Architecture](docs/ARCHITECTURE.md)
- [User manual](docs/USER_MANUAL.md)
- [AI usage disclosure](AI_USAGE.md)
