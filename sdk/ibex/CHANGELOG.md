# Changelog

All notable changes to this SDK adaptation are documented in this file.

## [0.1.2] - 2026-04-27

### Breaking – Endpoint migration to `/v1.2/`

All SDK API routes are now versioned under `/v1.2/` to match the backend
routing and token validation used in this integration.

- `GET  /ibex/users/me`      → `GET  /v1.2/users/me`
- `POST /ibex/users/me`      → `POST /v1.2/users/me`
- `POST /ibex/auth/refresh`  → `POST /v1.2/auth/refresh`
- `GET  /ibex/auth/sign-in/options`   → `GET  /v1.2/auth/sign-in`
- `POST /ibex/auth/sign-in/complete`  → `POST /v1.2/auth/sign-in`
- `GET  /ibex/auth/sign-up/options`   → `GET  /v1.2/auth/sign-up`
- `POST /ibex/auth/sign-up/complete`  → `POST /v1.2/auth/sign-up`

If your host app still proxies only `/api/ibex/*`, update host routing accordingly.

### Changed

- **`authenticatedJsonFetch()`** — headers now send both `X-IBEx-Auth` and
  `Authorization` with `Bearer <token>`.
- **`refreshSessionDetailed()`** — removed superfluous auth headers on the
  refresh call; the backend validates the refresh token from the request body,
  not from headers.
- **`defaultResolveRpId()`** — keeps the exact host for custom domains
  (for example `widget-light.local`), while still mapping `*.ibex.fi` to `ibex.fi`.

### Fixed

- Fixed `401 Unauthorized` caused by mixed route prefixes.
- Fixed `rpId is not valid` issues on custom local domains caused by RP ID reduction.

---

## [0.1.1] - 2026-04-27

### Added

- Added `refreshSessionDetailed()` in `src/sdk.ts` to expose refresh request/response details:
  - request URL/path/body
  - response status/requestId/payload
- Added HTTP metadata and error typing in `src/types.ts`:
  - `IbexHttpMeta`
  - `IbexRefreshDetails`
  - `IbexHttpError`
- Added HTTP error enrichment in `src/sdk.ts` (`status`, `requestId`, `payload`, `url`).
- Added PRF extension decoding support in `src/utils.ts` for WebAuthn sign-up options:
  - `extensions.prf.eval.first/second`
  - `extensions.prf.evalByCredential.*`

### Changed

- Updated RP ID resolution in `src/utils.ts`:
  - keeps `ibex.fi` for IBEx domains
  - otherwise keeps the **exact current host** (instead of reducing to the last domain pair)
- Updated auth headers for passkey auth in `src/sdk.ts`:
  - sign-in/sign-up now send both `X-Rp-Id` and `X-RpId`
- Updated authenticated JWT calls in `src/sdk.ts`:
  - `/ibex/users/me` requests now send both `X-IBEx-Auth` and `Authorization`
  - `X-Rp-Id` is no longer sent for JWT profile routes
- Updated refresh flow in `src/sdk.ts`:
  - refresh no longer forces RP headers
  - `refreshSession()` now delegates to `refreshSessionDetailed()`

### Documentation

- Translated `tmp/ibex/README.md` to English.
- Added IBEXSAFE prerequisite note:
  - the app `rpId` must be registered in IBEXSAFE
  - otherwise `/users/me` may fail with `400` (`"rpId is not valid"`).
