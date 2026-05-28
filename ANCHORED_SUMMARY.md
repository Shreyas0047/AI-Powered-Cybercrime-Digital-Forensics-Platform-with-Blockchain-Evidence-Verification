# Anchored Summary — Last active: 2026-05-22

## Goal
Fix 10 identified architectural issues in the auth system (role naming, token management, error handling, OTP dev mode, etc.) without redesigning the UI or creating duplicate infra.

## Constraints & Preferences
- Reuse existing OTP/email infra (SMTP, in-memory OTP map, JWT tokens).
- Do not create duplicate auth systems or redesign UI unnecessarily.
- Enterprise-grade security: bcrypt, OTP expiry, rate limiting, email enumeration prevention.

## Progress
All 10 fixes are complete. Both backend and frontend compile with `npx tsc --noEmit` — 0 errors.

| Fix | Description | Files Changed |
|-----|------------|--------------|
| 1 | Dev mode OTP bypass (`OTP_DEV_MODE` returns OTP in response body when set) | `otp.service.ts`, `config/index.ts` |
| 2 | Removed role dropdown from login page (auto-detects from backend) | `LoginPage.tsx` |
| 3 | Role naming handled by middleware `normalizeRole()` (accepts both `analyst` and `forensic_analyst`) | `auth.middleware.ts` (pre-existing) |
| 4 | Added `firstName`/`lastName` fields to registration | `RegisterPage.tsx` |
| 5 | Centralized password regex in `backend/src/constants.ts` | `constants.ts` (NEW), `auth.service.ts`, `auth.routes.ts` |
| 6 | Email normalization (trim + toLowerCase) on login and register | `LoginPage.tsx`, `RegisterPage.tsx` |
| 7 | Consolidated token storage: `accessToken` is single source of truth in localStorage; api.ts interceptor uses it; authStore syncs on login/register; refresh token interceptor added to api.ts | `api.ts`, `authStore.ts`, `socket.ts`, `RegisterPage.tsx` |
| 8 | OTP resend cooldown timer on RegisterPage (30s, matches ForgotPasswordPage) | `RegisterPage.tsx` |
| 9 | Auth pages display backend error messages directly instead of generic replacements | `LoginPage.tsx`, `RegisterPage.tsx` |
| 10 | OTP token JWT secret uses `config.otpTokenSecret` (not `JWT_REFRESH_SECRET`) | `otp.service.ts`, `config/index.ts` |

## Relevant Files
- `backend/src/constants.ts` — `PASSWORD_REGEX`, `PASSWORD_ERROR` shared constants
- `backend/src/services/otp.service.ts` — Dev mode, dedicated JWT secret, password reset OTP
- `backend/src/services/auth.service.ts` — Imports shared regex; `resetPassword()` with audit
- `backend/src/controllers/auth.controller.ts` — `forgotPassword()`, `verifyResetOtp()`, `resetPassword()`
- `backend/src/routes/auth.routes.ts` — 3 new password reset routes; imports shared regex
- `backend/src/config/index.ts` — `otpDevMode`, `otpTokenSecret` added
- `backend/src/types/index.ts` — `PASSWORD_RESET_COMPLETE` audit action
- `frontend/src/pages/LoginPage.tsx` — No role selector, email normalization, early null return
- `frontend/src/pages/RegisterPage.tsx` — firstName/lastName fields, OTP cooldown, email normalization, localStorage token sync
- `frontend/src/pages/ForgotPasswordPage.tsx` — NEW 4-step forgot password flow
- `frontend/src/services/api.ts` — Refresh token interceptor, `accessToken` single source, `forgotPassword()`/`verifyResetOtp()`/`resetPassword()`
- `frontend/src/services/socket.ts` — Reads `accessToken` only (no `token` fallback)
- `frontend/src/stores/authStore.ts` — Syncs `accessToken` to localStorage on login/checkAuth
- `frontend/src/router/AppRoutes.tsx` — `/forgot-password` route

## Key Decisions
- Dev mode bypass avoids SMTP dependency for testing OTP flow end-to-end.
- Role selection removed from login because backend owns role data.
- `analyst` ↔ `forensic_analyst` mapping handled entirely in middleware `normalizeRole()` — route definitions use `analyst` shorthand.
- Token storage consolidated to `accessToken` key; old `token` key fully removed (api.ts, socket.ts, localStorage reads/writes).
- Refresh token interceptor queues concurrent 401 failures and retries them after a single refresh call.

## Critical Context
- Backend port 3000, frontend port 5173 (Vite proxy forwards `/api`).
- User `amcecshreyas@gmail.com` (admin) exists in MongoDB with valid 60-char bcrypt hash.
- OTP service is in-memory (Map); OTPs lost on server restart.
- `authLimiter` rate limiting on all auth endpoints.
- Password reset flow tested: OTP sent → verified → password reset — all 200.
- Both backend and frontend pass `npx tsc --noEmit` with 0 errors.
