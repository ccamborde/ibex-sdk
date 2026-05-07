# Changelog

All notable changes to this repository are documented in this file.

## [Unreleased]

### Initial SDK baseline (first 5 endpoints)

The public SDK baseline includes:

- `GET /v1.2/auth/sign-in` + `POST /v1.2/auth/sign-in` (passkey sign-in)
- `GET /v1.2/auth/sign-up` + `POST /v1.2/auth/sign-up` (sign-up fallback)
- `POST /v1.2/auth/refresh` (JWT refresh)
- `GET /v1.2/users/me` (profile read)
- `POST /v1.2/users/me` (profile update)

### 4/29/2026

#### New `/users/me/*` endpoints in SDK

- Added `getMeBalances(query?)` for `GET /v1.2/users/me/balances`
- Added `getMeTransactions(query?)` for `GET /v1.2/users/me/transactions`
- Added `getMeAddress()` for `GET /v1.2/users/me/address`
- Added `getMeSigners()` for `GET /v1.2/users/me/signers`
- Added `getMeTokens()` for `GET /v1.2/users/me/tokens`
- Added `getMePools(query?)` for `GET /v1.2/users/me/pools`
- Added `getMeLending(query?)` for `GET /v1.2/users/me/lending`
- Added typed query/response models for balances and transactions in `sdk/ibex/src/types.ts`
- Extended typed models to cover address/signers/tokens/pools/lending payloads

#### Quality and test coverage

- Added Vitest to `sdk/ibex` (`test`, `test:watch`, `vitest.config.ts`)
- Added unit tests for:
  - URL/query construction
  - auth headers
  - refresh/retry flow on `401/403`
  - session cleanup when refresh fails
  - new users/me resources (`address`, `signers`, `tokens`, `pools`, `lending`)

#### Visual validation samples

- Extended sample proxies with:
  - `GET /api/ibex/users/me/balances`
  - `GET /api/ibex/users/me/transactions`
- Extended `sample1` and `sample2` UIs to display balances/transactions payloads
- Added manual reload actions for visual human validation
- Replaced header icon with `logo-IBEx.svg` in both samples

#### Repository hygiene

- Added a root `.gitignore` adapted for this workspace (`node_modules`, env files, logs, coverage, vitest cache)
