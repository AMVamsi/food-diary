# Food Diary

AI-powered food diary -- RSE take-home task submission.

## Stack
- **Mobile**: React Native + Expo
- **Backend**: FastAPI (Python) -- deployed on Railway
- **Database + Auth**: Supabase (Postgres + Auth + Storage)
- **AI**: LogMeal API (food recognition + nutrition)

## Repo structure
\`\`\`
food-diary/
├── backend/      FastAPI app
├── mobile/       Expo React Native app
├── docs/         Architecture + user manual
├── AI_USAGE.md   GenAI disclosure log (enforced by pre-commit hook)
└── .githooks/    pre-commit AI guardrail
\`\`\`

## Setup
See docs/ARCHITECTURE.md for full instructions.

## APK

Download link: [to be added after build]

Requires Android 10 (API 29) or later. To install, enable "Install unknown apps" for your browser or file manager, open the downloaded APK, and follow the on-screen prompts — the "Food Diary" icon will appear on your home screen.
