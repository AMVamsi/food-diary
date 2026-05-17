# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [1.0.0-beta] — 2026-05-04

### Added
- Photo-based meal logging with LogMeal AI food recognition
- Bounding box overlay with three-tier label placement (SVG)
- Manual ingredient search with 24-hour cached catalogue
- Calorie diary with date-grouped view and swipe-to-delete
- User profile with BMI calculation and colour-coded badge
- FastAPI backend proxy (keeps LogMeal API key server-side)
- Supabase Auth, Postgres, and Storage integration
- Row Level Security on all user tables
- GitHub Actions AI usage disclosure enforcement
- Pre-commit hook enforcing `[log:slug]` convention
- Android APK via EAS Build (preview profile)
- Railway deployment with Dockerfile

### Known limitations
- LogMeal free trial: 20 API credits per day
- Supabase Auth: 2 OTP emails per hour per user
- iOS build requires Apple Developer account (not included)
- Railway free tier: 2–5 second cold start
