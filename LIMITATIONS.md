# Known Limitations

This document lists resource and platform constraints that apply to the current deployment. These are limitations of the free-tier services and trial APIs used, not of the application architecture.

---

## LogMeal API

The project uses a 30-day free trial account for the LogMeal API.

| Constraint | Limit | Impact |
|---|---|---|
| Image analysis credits | 20 per day across all users | Demo and evaluation use only — not production scale |
| API plan | Free trial | Expires after 30 days from account creation |
| Credit consumption | 1 credit per segmentation request | Each photo log attempt consumes one credit |

Credit usage is tracked via response headers (`X-RateLimit-Remaining`).
The backend returns HTTP 429 with a clear message when the limit is reached.
A production deployment would require a paid LogMeal plan with higher credit limits.

---

## Supabase Auth

The project uses the Supabase free tier.

| Constraint | Limit | Impact |
|---|---|---|
| Email confirmations (OTP) | 2 emails per hour per user | Limits how quickly a user can re-request OTP verification |
| Sign-up and sign-in rate | 30 requests per 5 minutes per IP | Sufficient for demo use, not for concurrent multi-user testing |
| Session duration | 1 hour by default | Users are automatically signed out after 1 hour of inactivity |
| Token refresh | 150 requests per 5 minutes per IP | Not a practical constraint for normal use |

The 1-hour session timeout is a Supabase Auth default. The mobile app
handles token expiry gracefully — the user is redirected to the login
screen with a clear message when their session expires.

A production deployment would configure longer session durations and use Supabase's token refresh mechanism to extend sessions transparently.

---

## iOS Build

An iOS build (.ipa) was not produced for this submission.

Building for iOS requires:
- An Apple Developer account ($99/year subscription)
- A macOS machine with Xcode for signing

The submission includes an Android APK which can be installed directly on any Android device without a developer account or app store listing.

The codebase is cross-platform (React Native + Expo) and will produce a valid iOS build given the above prerequisites.

---

## Railway Deployment

The backend is deployed on Railway's free tier (Hobby plan trial).

| Constraint | Limit | Impact |
|---|---|---|
| Sleep on inactivity | Service may sleep after inactivity | First request after sleep has a cold-start delay of 2–5 seconds |
| Execution hours | Limited on free tier | Sufficient for demo and evaluation |

The `/health` endpoint can be used to wake the service before testing.

---

## Supabase Storage

The project uses the Supabase free tier for meal image storage.

| Constraint | Limit | Impact |
|---|---|---|
| Storage size | 1 GB total | Sufficient for demo use |
| File size limit | 50 MB per file | Well above typical meal photo size |

---

## Not Limitations of the Application

The following are deliberate design decisions, not limitations:

- **Ingredient catalogue caching** — the LogMeal ingredient list is cached in Supabase with a 24-hour TTL to avoid redundant API calls. This is  intentional, not a workaround.

- **No iOS APK equivalent** — there is no sideloading mechanism on iOS equivalent to Android APK installation. This is an Apple platform constraint.

- **Single backend region** — the Railway deployment runs in a single region. Latency for users outside that region is expected. A production deployment  would use a CDN and multi-region deployment strategy.