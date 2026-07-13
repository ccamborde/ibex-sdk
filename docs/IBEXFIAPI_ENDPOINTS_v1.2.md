# IBEX FI API – Endpoints Reference (v1.2)

## Changelog

- **2026-07-10** `create` `GET /v1.2/domain/users` — new tenant-facing endpoint to list externalUserIds with optional KY state filter and pagination (API_KEY auth)
- **2026-07-07** `create` `GET/POST /v1.2/auth/sign-up` and `GET/POST /v1.2/auth/sign-in` — new optional header `X-End-User-IP` allows B2B backends (authenticated via `x-api-key`) to forward the real end-user IP for rate limiting and audit trail. Ignored when no API key is present (anti-spoofing)
- **2026-07-07** `modify` `GET /v1.2/auth/sign-up` and `GET /v1.2/auth/sign-in` (wallet=sms) — removed per-IP SMS rate limit (was 10/day, caused false positives for B2B backends sharing a single server IP). Per-phone limit (10/day) and per-rpId limit (10 000/day) remain enforced
- **2026-07-06** `modify` `POST /v1.2/auth/enroll` and `POST /v1.2/auth/sign-up` (wallet=sms, KYB) — duplicate SIREN validation is now automatically bypassed when the domain has `isKybSkipSirenCheck` enabled (per-rpId setting, configurable via admin)
- **2026-07-07** `modify` `GET /v1.2/domain/company/check/peppol` — added `smpUrl`, `naptrDomain`, `docTypes[]` fields from upstream IbexSafe
- **2026-07-06** `create` `GET /v1.2/domain/company/check/peppol` — Peppol Directory lookup on a French SIREN number (registered, participantId, entityName)
- **2026-07-06** `create` `GET /v1.2/domain/company/check` — new tenant-facing KYB pre-check on a French SIREN number (API_KEY auth, replaces devtools-only endpoint)
- **2026-07-06** `modify` `GET /v1.2/domain/users/:id` — `ky` field now reflects real-time KY status from upstream verification (was previously not persisted)
- **2026-07-06** `modify` `POST /v1.2/auth/sign-in` (wallet=sms) — response now includes `chatbotURL`, `chatbotFullURL` and `sessionId` when user KYC is not yet completed (KY=0), matching sign-up behavior
- **2026-07-01** `modify` `GET /v1.2/auth/sign-up` (wallet=sms) — SMS sign-up is now a 2-step flow: `GET` triggers OTP via IbexSafe and returns `externalUserId`, `POST` confirms OTP code and performs KY enrollment
- **2026-07-01** `modify` `POST /v1.2/auth/sign-up` (wallet=sms) — requires `externalUserId` + `code` from GET step; no longer creates user inline (reuses user from GET)
- **2026-06-24** `modify` `POST /api/admin/devtools/sepa/topup` — removed internal `userId` from response example (`identity` now exposes `externalUserId` + `rpId`)
- **2026-06-24** `modify` `GET/PUT/PATCH /v1.2/domain/kv` — removed internal `userId` from tenant webhook contract (envelope + `data`)
- **2026-06-24** `modify` `POST /v1.2/auth/iframe` and `POST /v1.2/auth/enroll` — internal `userId` is stripped from proxied KYC/KYB responses
- **2026-06-24** `modify` `GET/PUT/PATCH /v1.2/domain/kv` — clarified KYC webhook payload uses tenant `externalUserId` only (no `userId` in `data`)
- **2026-06-24** `modify` `GET/PUT/PATCH /v1.2/domain/kv` — documented tenant webhook payload examples for `user.ky.updated` (including `status`, `firstName`, `lastName`) and `user.iban.updated`
- **2026-06-23** `modify` `POST /api/admin/devtools/company/check` — response now returns full structured company data (existence, representatives, beneficial owners, sanctions/PEP screening) instead of simple OK/KO
- **2026-06-01** `remove` `POST /v1.2/iban/create` — deprecated provider-agnostic flow removed from v1.2
- **2026-06-01** `modify` `POST /v1.2/sepa/iban/add` — behavior is now controlled by domain flag `isSepaIbanAddWebauthnEnabled` (direct POST when `FALSE`, approval challenge when `TRUE`)
- **2026-06-01** `create` `PUT /v1.2/sepa/iban/add` — confirms WebAuthn and executes upstream IBAN creation in IBEXSAFE
- **2026-05-29** `modify` `GET /v1.2/auth/sign-in` (wallet=sms) — added `smsDryRun` query parameter; default dry-run outside production/preprod and bypassed SMS flood limits in dry-run mode
- **2026-05-28** `modify` `POST /v1.2/auth/sign-up` (wallet=sms) — added `smsDryRun` parameter to control SMS sending in non-production
- **2026-05-21** `create` `PATCH /v1.2/sepa/iban/modify` — new endpoint to update the label of an existing IBAN
- **2026-05-21** `modify` `POST /v1.2/sepa/iban/add` — added optional `label` parameter
- **2026-05-21** `modify` `GET /v1.2/sepa/iban` — response now includes `label` field
- **2026-05-21** `create` `POST /v1.2/auth/sign-up` (wallet=sms) — new SMS-based signup (KYC & KYB), single POST creates user + triggers IbexSafe phone verification
- **2026-05-21** `create` `GET /v1.2/auth/sign-in` (wallet=sms) — new SMS-based sign-in step 1, triggers OTP via IbexSafe
- **2026-05-21** `create` `POST /v1.2/auth/sign-in` (wallet=sms) — new SMS-based sign-in step 2, confirms OTP and returns JWT
- **2026-05-20** `create` `POST /api/admin/devtools/company/check` — new DevTools endpoint for fast KYB pre-check on a SIREN
- **2026-05-18** `create` `POST /v1.2/users/me/validate-sms` — new SMS verification endpoint (send code)
- **2026-05-18** `create` `POST /v1.2/users/me/confirm-sms` — new SMS verification endpoint (confirm code)
- **2026-05-18** `create` `POST /api/admin/devtools/ky/sms-verified` — new DevTools endpoint to manually set SMS verification data
- **2026-05-18** `modify` `POST /v1.2/auth/iframe` — added `requireSmsVerification` body parameter
- **2026-05-18** `modify` `GET /v1.2/users/me/tokens` — added `iconUrl`, `type`, `secondaryAddress` fields to response schema and documentation
- **2026-05-18** `modify` structure — merged Config, Pools, Lending, Swaps, Checks and Admin sections into a single **Administration & Configuration API** chapter with domain sub-sections
- **2026-05-18** `modify` `GET /v1.2/users/me/lending` — merged pools into lending; added `?userScoped=true` query param to scope results to user's chains (replaces former `/me/pools`)
- **2026-05-18** `modify` `GET /v1.2/users/me/balances` — clarified ownership enforcement and scoping wording
- **2026-05-18** `modify` `GET /v1.2/users/me/transactions` — clarified ownership enforcement and scoping wording
- **2026-05-18** `modify` `GET /v1.2/users/me/tokens` — simplified description
- **2026-05-18** `modify` `GET /v1.2/chain/tokens` — clarified as full token catalog
- **2026-05-18** `modify` `GET /v1.2/safes/vaults` — clarified data-source description
- **2026-05-18** `fix` global — standardized example domain to `app.ibex.fi`, rpId to `ibex.fi`

## Overview

This document describes the IBEX FI API **v1.2** — routes under the **`/v1.2/`** prefix (and related `api` paths documented below) unless stated otherwise.

- **Domains**: Tenant registration and administration under **`/v1.2/domains/`** — DNS TXT challenge (public), then JWT/API-key protected create/list/detail/update/quota. See the dedicated section below and the portal page `/docs/api-reference/admin/domains`.

**Authentication**

- **JWT**: `Authorization: Bearer <token>`
- **API_KEY**: header `x-api-key` (and optionally `X-Blockchain-Id` for chain scope)
- **PUBLIC**: no auth

**Host / rpId**

- Requests are scoped by `Host` (or origin). Use the same domain as your app (e.g. `https://app.ibex.fi`).

**Optional headers**

| Header | Auth required | Used by | Description |
|--------|---------------|---------|-------------|
| `X-End-User-IP` | `x-api-key` | sign-up, sign-in | Real end-user IP address forwarded by a B2B backend. Used for SMS rate limiting and Login audit trail. **Only trusted when the request is authenticated via `x-api-key`** — ignored otherwise to prevent IP spoofing from browser clients. Value must be a valid IPv4 or IPv6 address (e.g. `93.23.45.12`, `2001:db8::1`). When absent, the server falls back to `X-Forwarded-For` / `X-Real-IP` / socket IP. |

---

## Version matrix (summary)

| Area            | Endpoint (logical)                    | v1.2 |
|-----------------|---------------------------------------|------|
| Auth            | GET/POST sign-up, sign-in, POST refresh, POST email/recover | ✓    |
| Auth extra Safe | POST sign-in/safe-provision           | ✓    |
| Users           | me, me/operations, :id, me/balances, me/transactions, me/address, **me/addressbook** (unified SEPA+crypto) | ✓    |
| Recovery        | GET status/:safeAddress               | ✓    |
| Safes wallets   | POST `/safes/:safeAddress/wallets` | ✓   |
| Safes           | automation-module/config, swap/quote, operations, batch-*, bitcoin | ✓    |
| SEPA            | iban/add, payments, transactions, mandates | ✓    |
| Domains (`/v1.2/domains/`) | dns-challenge, PUT create, list, detail, update, quota | ✓ |
| Domain KV (`/v1.2/domain/kv`) | GET/PUT/PATCH JSON store, users/:id, company/check (API key only) | ✓    |

---

## Authentication

### Sign-up (get options)

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| GET | `/v1.2/auth/sign-up` | PUBLIC | **v1.2** |

**Query parameters (optional):**

| Parameter | Type | v1.2 | Description |
|-----------|------|------|-------------|
| `wallet` | string | ✓ | `passkeys` (default), `kdf`, `email`, `7702`, `sms` |
| `flow` | string | ✓ | e.g. `pin-kdf` (same as wallet=kdf) |
| `email` | string | ✓ | Required if `wallet=email` |
| `telephone` | string | ✓ | Required if `wallet=sms` (E.164 format, e.g. `+33612345678`) |
| `phonePolicy` | string | ✓ | `wallet=sms` only: `frMobile` or `any` (default) |
| `smsDryRun` | boolean | ✓ | `wallet=sms` only: if `false`, send real SMS. Default `true` outside production/preprod |
| `user.name`, `userName` | string | ✓ | Override WebAuthn user.name |
| `user.displayname`, `userDisplayName` | string | ✓ | Override WebAuthn user.displayName |
| `keyName`, `keyDisplayName` | string | ✓ | Passkey display name |
| `passkeys` | string | (legacy) | `TRUE` / `FALSE` |

**Optional headers:**

| Header | Description |
|--------|-------------|
| `X-End-User-IP` | Real end-user IP (B2B only — requires `x-api-key` auth). Used for SMS rate limiting and Login audit trail. See [Optional headers](#optional-headers) above. |

**Response (200):**  
- **Passkeys (default)**: `credentialRequestOptions` (rp, user, challenge, pubKeyCredParams, authenticatorSelection, attestation, timeout).  
- **wallet=kdf**: JWT + `authMethod`, `flow`, `salt`, `kdf`, `challenge`, `serverSignature`, etc.  
- **wallet=email**: JWT + `authMethod`, `emailOtpExpiresAt`, `challenge`, etc.  
- **wallet=sms**: `{ wallet, externalUserId, code? }` — OTP sent via SMS; `code` is included only in dry-run/non-production mode.  
- **passkeys=FALSE** + email (legacy): JWT + `emailValidationRequired`.

**Example request (passkeys):**
```http
GET /v1.2/auth/sign-up
Host: app.ibex.fi
```

**Example response (passkeys):**
```json
{
  "credentialRequestOptions": {
    "rp": { "id": "app.ibex.fi", "name": "app.ibex.fi" },
    "user": { "id": "<base64url>", "name": "...", "displayName": "..." },
    "challenge": "<base64url>",
    "pubKeyCredParams": [{ "alg": -7, "type": "public-key" }],
    "authenticatorSelection": { "residentKey": "preferred", "userVerification": "preferred" },
    "attestation": "none",
    "timeout": 60000
  },
  "emailValidationRequired": false
}
```

**WebAuthn PRF integration note (signup / registration):**

If your frontend enables PRF during registration, apply the same conversion rule before `navigator.credentials.create()`:
- IBEX can return PRF extension inputs as **base64url strings**
- browser APIs expect **BufferSource / ArrayBuffer** for PRF binary fields

In practice, convert PRF fields (`extensions.prf.eval.first/second` and `extensions.prf.evalByCredential[*].first/second`) from base64url to `ArrayBuffer` in `webauthn.js` before passing `publicKey` to WebAuthn.

Also keep standard WebAuthn conversions in place (`challenge`, and `user.id` for registration).

**200 Response (wallet=kdf):**
```json
{
  "externalUserId": "<externalUserId>",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "authMethod": "PIN_KDF_PENDING",
  "flow": "pin-kdf",
  "salt": "base64-salt",
  "saltVersion": 1,
  "kdf": { "algo": "argon2id", "memory": 65536, "iterations": 3, "parallelism": 1 },
  "kdfParamsVersion": 1,
  "challenge": "base64-nonce",
  "challengeExpiresAt": "2025-12-11T10:15:00Z",
  "serverSignature": "sig(challenge||exp||externalUserId||appId)",
  "serverKeyId": "kid-1",
  "opaque": {
    "envelope": "b64-opaque-envelope",
    "serverPub": "b64-opaque-server-pub"
  },
  "emailValidationRequired": false,
  "hasPasskey": false
}
```

**200 Response (wallet=email):**
```json
{
  "externalUserId": "<externalUserId>",
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "authMethod": "EMAIL_TOKEN_PENDING",
  "flow": "email",
  "wallet": "email",
  "emailOtpExpiresAt": "2025-12-11T10:15:00Z",
  "emailOtp": "123456",                         // local/tests only (do not return in production)
  "challenge": "base64-nonce",
  "challengeExpiresAt": "2025-12-11T10:15:00Z",
  "serverSignature": "sig(challenge||exp||externalUserId||appId)",
  "serverKeyId": "email-token-hmac-v1",
  "hasPasskey": false
}
```

---

### Sign Up – Complete Registration (2/2)

- **POST** `/v1.2/auth/sign-up`
- **Auth**: PUBLIC (EXTERNAL)
- **Tags**: EXTERNAL, Authentication
- **Description**: Complete signup by validating passkey credential and/or email code

**Optional headers:** `X-End-User-IP` — see [GET /sign-up](#sign-up-get-options).

**Request body:**
- `credential` (object, required if passkeys=TRUE in GET): WebAuthn credential from `navigator.credentials.create()`
- `emailCode` (string, optional): Email validation code (legacy; not supported with `wallet=passkeys`)
- `externalUserId` (string, optional): ExternalUserId from GET /sign-up (for deferred passkey creation)
- `chainIds` (array, optional): Chain IDs for multi-chain Safe deployment
- `chainId` (number, optional): Single chain ID (alternative to chainIds)
- `provisioning` (object, optional, passkeys mode only): advanced provisioning block. If omitted, signup behavior is unchanged.
  - `provisioning.safes[]`:
    - `chainId` (number, required): Safe chain to provision during signup.
    - `derive[]` (optional): per-safe derivation requests (`family`, `count`).
  - `provisioning.global` (optional):
    - `derive[]` (optional): signer-global derivation requests (`family`, `count`).
    - `chainId` (optional): client orchestration hint; global derivation remains signer-scoped.
- `keyName`, `keyDisplayName` (string, optional): Passkey metadata
- **PIN/KDF flow (only if passkeys=FALSE + flow=pin-kdf in GET):**
  - `publicKey` (string, required): derived public key/address
  - `signature` (string, required): signature over the canonical message `{challenge, challengeExpiresAt, challengeId?, externalUserId, saltVersion, kdfParamsVersion, appId, timestamp, nonce}`
  - `challenge`, `challengeExpiresAt`, `challengeId?` (string): from GET
  - `saltVersion`, `kdfParamsVersion` (numbers): from GET
  - `nonce`, `timestamp` (required): client-provided, checked for replay/skew
  - `serverSignature`, `serverKeyId` (required): from GET
  - `opaqueLoginRequest` (string, optional): OPAQUE login request if PAKE enabled

**Validation rules:**

1. **If wallet=passkeys (or passkeys=TRUE legacy) in GET:**
   - `credential` is REQUIRED (reject if missing/invalid)
   - `emailCode` is ignored (passkeys+email validation removed)

2. **If passkeys=FALSE and email provided in GET:**
   - `emailCode` is REQUIRED (reject if missing/invalid)
   - `credential` is ignored

3. **Deferred passkey creation:**
   - If `externalUserId` provided (from previous GET with passkeys=FALSE), can add passkey later
   - `credential` required in this case

4. **If passkeys=FALSE + flow=pin-kdf in GET:**
   - Ignore any passkey credential fields
   - Require the PIN/KDF proof fields (`publicKey`, `signature`, `challenge`, `saltVersion`, `kdfParamsVersion`, `nonce`, `timestamp`, `serverSignature`; optional `opaqueLoginRequest`)
   - Enforce single-use challenge, skew checks on `timestamp`, and first-bind of `externalUserId` → `publicKey` (or controlled rotation if already bound)

5. **If `provisioning` is present (passkeys mode):**
   - Signup still deploys Safe(s) as usual, and then executes optional derivation provisioning.
   - If signer has no sealed master, provisioning derivation fails with `409 NO_MASTER`.
   - If `provisioning` is absent, behavior is strictly identical to legacy signup.

**200 Response (passkey created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issuer": "foo.domain",
  "audience": "foo.domain",
  "subject": "<externalUserId>",
  "roles": ["USER"],
  "authMethod": "PASSKEY",
  "hasPasskey": true,
  "safeAddress": {
    "100": "0x18D89744F87a0EC3259289c2Eaf728D567DaF13b",
    "421614": "0xd676c6188195372EC269E9C2cAf815C56436A679"
  },
  "chainId": 421614,
  "keyName": "my-passkey",
  "keyDisplayName": "My Passkey",
  "eoaAddress": "0x...",
  "eoaAddresses": [
    { "type": "EVM", "address": "0x..." },
    { "type": "SOLANA", "address": "..." },
    { "type": "BITCOIN_P2WPKH", "address": "bc1q..." }
  ],
  "prfCapable": true
}
```

> **`safeAddress` format:** This field is a **JSON object** (not a string) that maps **chain IDs to Safe smart contract wallet addresses**. Each key is a blockchain chain ID as a string (e.g. `"100"` for Gnosis, `"421614"` for Arbitrum Sepolia), and each value is the user's deployed Safe address (`0x...`) on that chain. If the user has Safes deployed on multiple chains, there will be multiple entries. Example:
> ```json
> "safeAddress": {
>   "100": "0x18D8...F13b",     // Gnosis chain (chainId=100) → Safe address
>   "421614": "0xd676...A679"   // Arbitrum Sepolia (chainId=421614) → Safe address
> }
> ```

**200 Response (PIN/KDF signer bound):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "authMethod": "PIN_KDF",
  "hasPasskey": false,
  "flow": "pin-kdf",
  "signerBound": true,
  "signerVersion": 1,
  "publicKey": "0x...",
  "safeAddress": {
    "100": "0x18D89744F87a0EC3259289c2Eaf728D567DaF13b",
    "421614": "0xd676c6188195372EC269E9C2cAf815C56436A679"
  }
}
```

> **`safeAddress` format:** Same as above — a `{ chainId: safeAddress }` mapping object. See passkey response above for full explanation.
```

**200 Response (email validated, passkeys=FALSE):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issuer": "app.ibex.fi",
  "subject": "<externalUserId>",
  "roles": ["USER"],
  "hasPasskey": true,
  "safeAddress": { "421614": "0x..." }
}
```

**Note:** passkey + email validation is no longer supported in v1.2 (use `wallet=email` instead).

**Notes:**
- `safeAddress` (object, optional): A **`{ chainId: safeAddress }` mapping object**. Each key is a blockchain chain ID as a string (e.g. `"100"`, `"421614"`), and each value is the user's deployed Safe smart contract wallet address (`0x...`) on that chain. Present only if the user has a passkey. Contains one entry per chain where a Safe was deployed during sign-up. This is NOT a single address string — it is a key-value map allowing multi-chain support.
- `eoaAddresses` is an array of `{ type, address }` entries for derived wallet addresses. This array is filtered by the server-side sign-in wallet-family policy (for example "EVM,SOLANA,BITCOIN_P2WPKH"). All addresses are generated internally, but only the allowed subset is returned in the response.
- `eoaAddress` is the EVM address (for backward compatibility).
- `prfCapable` indicates whether PRF (hmac-secret) was used for this credential (only if passkey exists).
- `provisioning` (optional, when requested): summary of additional safes/global derivations executed during signup.

---

### Sign Up — SMS wallet (`wallet=sms`)

Two-step flow: `GET` triggers the SMS OTP, then `POST` confirms the code and creates the user account with KYC/KYB enrollment.

> **B2B backends:** pass `X-End-User-IP` header (requires `x-api-key`) to forward the real end-user IP for rate limiting and audit. See [Optional headers](#optional-headers).

**Step 1 — Trigger OTP:**

```http
GET /v1.2/auth/sign-up?wallet=sms&telephone=+33612345678
Host: app.ibex.fi
```

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `wallet` | string | Yes | Must be `"sms"` |
| `telephone` | string | Yes | E.164 format (e.g. `+33612345678`) |
| `phonePolicy` | string | No | `"frMobile"` or `"any"` (default) |
| `smsDryRun` | boolean | No | If `false`, send a real SMS. Default: `true` outside production/preprod |

Triggers an SMS OTP to the provided phone number via IbexSafe. A user and `externalUserId` are created and returned for the next step.

**200 Response:**

```json
{ "wallet": "sms", "externalUserId": "550e8400-e29b-41d4-a716-446655440000" }
```

> **Dry-run behavior:** When dry-run is active (`smsDryRun=true`, default outside production/preprod), the response includes a `code` field: `{ "wallet": "sms", "externalUserId": "...", "code": "320824" }`. In production/preprod, dry-run is ignored upstream and no code is returned.

**Rate limiting:** 10 SMS/day per phone number, 10 000/day per tenant rpId. Shared counters with sign-in SMS. Rate limits only enforced when `smsDryRun=false`.

**Step 2 — Confirm OTP + KY enrollment:**

```http
POST /v1.2/auth/sign-up
Content-Type: application/json

{ "wallet": "sms", "externalUserId": "550e8400-...", "telephone": "+33612345678", "code": "123456" }
```

**Body (KYC — individual):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wallet` | string | Yes | Must be `"sms"` |
| `externalUserId` | string | Yes | From GET response (step 1) |
| `telephone` | string | Yes | Same phone as step 1 |
| `code` | string | Yes | 4-8 digit OTP received by SMS |
| `phonePolicy` | string | No | `"frMobile"` or `"any"` |

**Body (KYB — company):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wallet` | string | Yes | Must be `"sms"` |
| `externalUserId` | string | Yes | From GET response (step 1) |
| `telephone` | string | Yes | Same phone as step 1 |
| `code` | string | Yes | 4-8 digit OTP received by SMS |
| `email` | string | Yes | Contact email |
| `companyRegistrationNumber` | string | Yes | SIREN (9 digits) |
| `phonePolicy` | string | No | `"frMobile"` or `"any"` |

> In KYB mode, `telephone` is forwarded to the enrollment flow as the initial SMS OTP value (still editable by the end-user in the verification UI).
>
> If the domain has `isKybSkipSirenCheck` enabled, duplicate SIREN validation is automatically bypassed (allows re-enrollment with the same SIREN for a different user).

**200 Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "authMethod": "SMS",
  "hasPasskey": false,
  "wallet": "sms",
  "externalUserId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "94de008e-e21f-4934-993b-0aaab2f977a6",
  "chatbotURL": "https://safe.ib.exchange/chatbot/",
  "chatbotFullURL": "https://safe.ib.exchange/chatbot/?session=94de008e-..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `sessionId` | string | KYC session identifier |
| `chatbotURL` | string | Base URL for the KYC chatbot |
| `chatbotFullURL` | string | Full URL including the session parameter — use this to redirect the user to complete KYC |

**Errors:** `400` invalid phone format, missing fields, invalid/expired code, externalUserId mismatch · `429` rate limit exceeded

---

### Sign-in — SMS wallet (`wallet=sms`)

> **B2B backends:** pass `X-End-User-IP` header (requires `x-api-key`) to forward the real end-user IP for rate limiting and audit. See [Optional headers](#optional-headers).

**Step 1 — Trigger OTP:**

```http
GET /v1.2/auth/sign-in?wallet=sms&telephone=+33612345678
Host: app.ibex.fi
```

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `wallet` | string | Yes | Must be `"sms"` |
| `telephone` | string | Yes | E.164 format |
| `phonePolicy` | string | No | `"frMobile"` or `"any"` |
| `smsDryRun` | boolean | No | If `false`, enforce rate limits and send a real SMS. Default: `true` outside production/preprod. |

Triggers an SMS OTP to the registered phone number via IbexSafe.

**200 Response:**

```json
{ "wallet": "sms" }
```

> **Dry-run behavior:** When dry-run is active (`smsDryRun=true`, default outside production/preprod), the response includes a `code` field: `{ "wallet": "sms", "code": "123456" }` for testing. In production/preprod, dry-run is ignored upstream and no code is returned.

**Rate limiting:** Same shared counters as sign-up (10/day per phone, 10 000/day per tenant rpId) **only when `smsDryRun=false`**.

**Step 2 — Confirm OTP:**

```http
POST /v1.2/auth/sign-in
Host: app.ibex.fi
Content-Type: application/json

{ "wallet": "sms", "telephone": "+33612345678", "code": "123456" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wallet` | string | Yes | Must be `"sms"` |
| `telephone` | string | Yes | Same phone as step 1 |
| `code` | string | Yes | 4-8 digit OTP received by SMS |
| `phonePolicy` | string | No | `"frMobile"` or `"any"` |

**200 Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "authMethod": "SMS",
  "hasPasskey": false,
  "wallet": "sms"
}
```

**KYC fields (when KY is not completed):**

When the user's KYC status is still pending (KY=0), the response additionally includes the KYC session fields, allowing the client to redirect the user to complete identity verification — same behavior as the sign-up response:

| Field | Type | Condition | Description |
|-------|------|-----------|-------------|
| `chatbotURL` | string | KY pending | Base URL for the KYC chatbot |
| `chatbotFullURL` | string | KY pending | Full URL including the session parameter |
| `sessionId` | string | KY pending | KYC session identifier |

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "authMethod": "SMS",
  "hasPasskey": false,
  "wallet": "sms",
  "chatbotURL": "https://safe.ib.exchange/chatbot/",
  "chatbotFullURL": "https://safe.ib.exchange/chatbot/?session=94de008e-...",
  "sessionId": "94de008e-e21f-4934-993b-0aaab2f977a6"
}
```

> **Note:** Once KYC is completed, these fields are no longer returned — only the standard JWT response is sent.

**Errors:** `400` invalid/expired code, missing GET step · `404` phone not registered · `429` rate limit exceeded

---

### Sign-in (get options)

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| GET | `/v1.2/auth/sign-in` | PUBLIC | **v1.2** |
| POST | `/v1.2/auth/sign-in` | PUBLIC | **v1.2** |

**Optional headers:**

| Header | Description |
|--------|-------------|
| `X-End-User-IP` | Real end-user IP (B2B only — requires `x-api-key` auth). Used for SMS rate limiting and Login audit trail. See [Optional headers](#optional-headers) above. |

**Query parameters:**
- `wallet` (string, optional): `passkeys` (default), `kdf`, `email`, `sms`
- `externalUserId` (string, optional): required for `wallet=kdf` and `wallet=email`
- `flow` (string, optional, **deprecated**): `pin-kdf` (prefer `wallet=kdf`)

| Parameter | Type | Description |
|-----------|------|-------------|
| `email` | string | With `externalUserId`: send email code |
| `externalUserId` | string | With email: send code; alone: return JWT directly (no challenge) |
| `flow` | string | v1.2: `pin-kdf` for PIN/KDF materials |
| `wallet` | string | v1.2: `kdf`, `email` |

1. **No params (default)**: Returns WebAuthn authentication options (passkey challenge)
2. **wallet=kdf + externalUserId**: Returns PIN/KDF derive materials (challenge/salt/kdf params)
3. **wallet=email + externalUserId**: Sends email OTP (30s), returns `emailOtpExpiresAt`

**Response enrichment (available on POST sign-in, step 2):**

When completing sign-in via `POST /sign-in` (step 2), you can include optional boolean flags in the request body to receive additional data alongside the JWT tokens. This avoids extra API calls after sign-in.

| Flag | Type | What it adds |
|------|------|-------------|
| `includeBalance` | boolean | `balance` — all monitored token balances for the wallet on the requested chain, **including tokens with zero balance**. This effectively gives you the full list of the user's watched tokens/addresses. |
| `includeTransactions` | boolean | `transactions` — paginated transaction history for the wallet |
| `includeUserdata` | boolean | `userdata` — stored user preferences (language, email, etc.) |
| `asyncData` | boolean | When `true` (and at least one include flag is enabled), returns quickly with `dataRequestId`; heavy include data is prepared asynchronously and fetched via poll endpoint |

Use `chainId` in the POST body to select which chain to query (defaults to the platform's default chain).

#### Async include mode (v1.2)

When `POST /v1.2/auth/sign-in` is called with:
- one or more include flags (`includeBalance`, `includeTransactions`, `includeUserdata`)
- and `asyncData: true`

the endpoint returns the sign-in payload immediately plus:
- `dataRequestId`
- `dataStatus: "PENDING"`

Then poll:

| Method | Path | Auth |
|--------|------|------|
| GET | `/v1.2/auth/sign-in/data/:dataRequestId` | Bearer `access_token` |

Polling response states:
- `PENDING`: include payload still computing
- `READY`: include payload available in `data` (`balance`, `transactions`, `userdata` depending on requested flags)
- `FAILED`: async preparation failed (`error` field)

Notes:
- `dataRequestId` is scoped to the authenticated user and `rpId`.
- Async payload is short-lived (ephemeral cache, current TTL ~180s).

See POST sign-in section below for full details and response examples.

**Example request (passkeys):**
```http
GET /v1.2/auth/sign-in
Host: app.ibex.fi
```

**Example response (passkey challenge):**
```json
{
  "credentialRequestOptions": {
    "challenge": "<base64url>",
    "rpId": "app.ibex.fi",
    "userVerification": "required",
    "timeout": 60000,
    "allowCredentials": [{ "id": "<base64url>", "type": "public-key" }]
  }
}
```

**WebAuthn PRF integration note (important):**

Some clients receive this browser error when calling `navigator.credentials.get()`:

`TypeError: extensions.prf.eval.first is not instance of ArrayBuffer`

Root cause: IBEX returns PRF extension values as **base64url strings**, while browsers expect **BufferSource / ArrayBuffer** for:
- `publicKey.extensions.prf.eval.first`
- `publicKey.extensions.prf.eval.second` (if present)
- `publicKey.extensions.prf.evalByCredential[credentialId].first/second`

Convert these fields in your `webauthn.js` before passing options to WebAuthn:

```js
function b64urlToArrayBuffer(input) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function normalizePrfExtensions(publicKey) {
  const prf = publicKey?.extensions?.prf;
  if (!prf) return publicKey;

  if (prf.eval?.first) prf.eval.first = b64urlToArrayBuffer(prf.eval.first);
  if (prf.eval?.second) prf.eval.second = b64urlToArrayBuffer(prf.eval.second);

  if (prf.evalByCredential && typeof prf.evalByCredential === "object") {
    for (const key of Object.keys(prf.evalByCredential)) {
      const entry = prf.evalByCredential[key];
      if (entry?.first) entry.first = b64urlToArrayBuffer(entry.first);
      if (entry?.second) entry.second = b64urlToArrayBuffer(entry.second);
    }
  }

  return publicKey;
}

// usage
const publicKey = normalizePrfExtensions(credentialRequestOptions);
await navigator.credentials.get({ publicKey });
```

Also keep standard WebAuthn conversions in place (`challenge`, `allowCredentials[].id`, and `user.id` on registration).

**200 Response (wallet=email — OTP sent):**
```json
{
  "externalUserId": "<externalUserId>",
  "wallet": "email",
  "hasPasskey": false,
  "emailOtpExpiresAt": "2025-12-11T10:15:30Z",
  "emailOtp": "123456"  // local/tests only (not returned in production)
}
```

**200 Response (wallet=kdf):**
```json
{
  "externalUserId": "<externalUserId>",
  "wallet": "kdf",
  "flow": "pin-kdf",
  "salt": "base64-salt",
  "saltVersion": 1,
  "kdf": { "algo": "argon2id", "memory": 65536, "iterations": 3, "parallelism": 1 },
  "kdfParamsVersion": 1,
  "challenge": "base64-nonce",
  "challengeExpiresAt": "2025-12-11T10:15:00Z",
  "serverSignature": "sig(challenge||exp||externalUserId||appId)",
  "serverKeyId": "pin-kdf-hmac-v1",
  "hasPasskey": false
}
```

### Additional Safe (same passkey, same chain) — v1.2

Registers another **counterfactual Safe4337** address for the same passkey signer on a given EVM chain, using a custom **CREATE2 `saltNonce`** (Safe relay-kit `predictedSafe.safeDeploymentConfig.saltNonce`). The primary Safe from sign-up / multi-chain expansion uses the **default** salt (stored in DB as empty `deploySaltNonce`).

| Step | Method | Path | Auth |
|------|--------|------|------|
| 1 | POST | `/v1.2/auth/sign-in` | PUBLIC (passkey body + `intent`) |
| 2 | POST | `/v1.2/auth/sign-in/safe-provision` | Bearer `safe_provision_token` |

**Step 1 — POST /v1.2/auth/sign-in**

- Send the usual WebAuthn `credential` (and optional `chainId`, enrichment flags).
- Add **`intent`: `"safe_provision"`** in the JSON body or as query `?intent=safe_provision`.
- Signer must be **PASSKEY** with **`walletMode=SAFE_4337`** (rejects EOA-7702-only signers).
- Response includes the normal session tokens plus:
  - **`safe_provision_token`**: short-lived JWT (TTL `safe_provision_expires_in`, typically 300 seconds).
  - **`safe_provision_expires_in`**: seconds.

The provision token is **single-use** and reserved until step 2 consumes it.

**Step 2 — POST /v1.2/auth/sign-in/safe-provision**

- Header: **`Authorization: Bearer <safe_provision_token>`** (use the token from step 1, not `access_token`).
- Body:

| Field | Type | Description |
|-------|------|-------------|
| `blockchainId` | number | Target chain (must be active and Safe-enabled). |
| `saltNonce` | string (decimal) | Must be `>= 1` and unique per signer+chain; distinct values yield distinct predicted addresses. |

**Response (200):** `address`, `blockchainId`, `saltNonce`, `deploySaltNonce` (same as `saltNonce`).

**Optional fields on POST sign-in (passkey)** — choose which Safe the session attaches to:

| Field | Description |
|-------|-------------|
| `safeAddress` | Checksummed address; must belong to the signer on the effective `chainId`. |
| `deploySaltNonce` | String; `""` selects the primary Safe for that chain; otherwise the slot used at provision (e.g. `"1"`). |

When multiple Safes exist on one chain, **`safeAddress`** enrichment in the sign-in response prefers the **primary** (empty `deploySaltNonce`) for that chain.

---

### Per-Safe derived EOAs — v1.2

Each Safe of the authenticated signer can hold its own indexed set of **derived EOA addresses**, one list per chain family (`EVM`, `SOLANA`, `BITCOIN_P2WPKH`, `BITCOIN_P2TR`, `BITCOIN_P2WPKH_TESTNET`, `BITCOIN_P2TR_TESTNET`, `COSMOS`, `POLKADOT`, `TEZOS_TZ1`, `TEZOS_TZ2`, `TEZOS_TZ3`, `NEAR`, `STELLAR`, `CARDANO`).

These addresses are **independent from the global signer set** (the one returned at sign-up / sign-in via `eoaAddresses`). Both sets share the same passkey master, but the per-Safe set uses a Safe-scoped derivation path.

Index is 0-based and contiguous. The derivation is fully deterministic — calling the endpoint with the same inputs always yields the same address.

**Auth model:** standard JWT (`Authorization: Bearer <access_token>`). The Safe must belong to the signer identified by the `sid` claim. **No WebAuthn ceremony is required**. Signers without a derivation master (e.g. legacy or wallet-signin) get `409 NO_MASTER`.

**Limits:**

| Limit | Value |
|-------|-------|
| Max indices per family per Safe | 100 |
| Max indices added per request   | 10  |
| Rate limit                      | ~5s per signer |

#### POST `/v1.2/safes/:safeAddress/wallets`

Append new derived addresses to the per-Safe lists. Each entry in `add[]` adds `count` (default `1`, max `10`) fresh indices to that family for this Safe.

**Body:**

```json
{
  "add": [
    { "family": "EVM",    "count": 2 },
    { "family": "SOLANA"               }
  ]
}
```

**Field rules:**

| Field | Type | Constraints |
|-------|------|-------------|
| `add` | array | min 1 item |
| `add[].family` | string | one of the supported families above |
| `add[].count` | integer | optional, in `[1..10]`, default `1` |

**Response (200):**

```json
{
  "safeAddress": "0xd676c6188195372EC269E9C2cAf815C56436A679",
  "added": [
    { "family": "EVM",    "index": 2, "address": "0x..." },
    { "family": "EVM",    "index": 3, "address": "0x..." },
    { "family": "SOLANA", "index": 1, "address": "..." }
  ],
  "perSafe": {
    "EVM":    ["0x... (idx 0)", "0x... (idx 1)", "0x... (idx 2)", "0x... (idx 3)"],
    "SOLANA": ["... (idx 0)", "... (idx 1)"]
  }
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| `400`  | invalid family / count out of range / no `add[]` | bad body |
| `400`  | `MAX_INDEX_PER_FAMILY exceeded for ...` | hard cap reached for a family on this Safe |
| `401`  | JWT missing or `sid` claim absent | unauthenticated |
| `404`  | Safe not found for the authenticated signer | `:safeAddress` not owned by the JWT `sid` |
| `409`  | `NO_MASTER: ...` | signer has no sealed master (cannot derive) |
| `429`  | rate limit | wait the `Retry-After` window |

---

### Refresh token

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| POST | `/v1.2/auth/refresh` | PUBLIC | **v1.2** |

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `refresh_token` | string | Yes |

**Response (200):** New `access_token` and `refresh_token`, plus `token_type`, `expires_in`, `issuer`, `subject`, `roles`.

**Example body:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issuer": "foo.domain",
  "audience": "foo.domain",
  "subject": "<externalUserId>",
  "roles": ["USER"],
  "authMethod": "PASSKEY",
  "hasPasskey": true,
  "safeAddress": {
    "100": "0x18D89744F87a0EC3259289c2Eaf728D567DaF13b",
    "421614": "0xd676c6188195372EC269E9C2cAf815C56436A679"
  },
  "chainId": 421614,
  "keyName": "my-passkey",
  "keyDisplayName": "My Passkey",
  "eoaAddress": "0x...",
  "eoaAddresses": [
    { "type": "EVM", "address": "0x..." },
    { "type": "SOLANA", "address": "..." },
    { "type": "BITCOIN_P2WPKH", "address": "bc1q..." }
  ],
  "prfCapable": true,
  "balance": {},
  "transactions": {},
  "userdata": {}
}
```

**Example response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issuer": "foo.domain",
  "audience": "foo.domain",
  "subject": "<externalUserId>",
  "roles": ["USER"],
  "authMethod": "EMAIL",
  "hasPasskey": false
}
```

**200 Response (PIN/KDF):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issuer": "foo.domain",
  "audience": "foo.domain",
  "subject": "<externalUserId>",
  "roles": ["USER"],
  "authMethod": "PIN_KDF",
  "hasPasskey": false,
  "flow": "pin-kdf",
  "publicKey": "0x...",
  "signerVersion": 1,
  "safeAddress": {
    "100": "0x18D89744F87a0EC3259289c2Eaf728D567DaF13b",
    "421614": "0xd676c6188195372EC269E9C2cAf815C56436A679"
  },
  "balance": {},
  "transactions": {},
  "userdata": {}
}
```

**Note:** passkey + email validation is no longer supported in v1.2 (use `wallet=email` instead).

**Notes:**
- `balance`, `transactions`, and `userdata` are included only if the corresponding `include*` flags are set to `true` in the request body.
- The `access_token` (JWT) should be used in subsequent API calls as: `Authorization: Bearer <token>`

---

### Refresh Token

- **POST** `/v1.2/auth/refresh`
- **Auth**: PUBLIC (EXTERNAL)
- **Tags**: EXTERNAL, Authentication
- **Description**: Refresh JWT token using a refresh token

**Request body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**200 Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "issuer": "foo.domain",
  "audience": "foo.domain",
  "subject": "<externalUserId>",
  "roles": ["USER"]
}
```

---

### Email recovery (v1.2 only)

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| POST | `/v1.2/auth/email/recover` | PUBLIC | **v1.2** |

**Purpose:** In the email Safe wallet flow: after GET sign-in with `wallet=email`, user receives OTP; POST here with OTP to get recovery payload and challenge for **POST /v1.2/auth/sign-in**.

**Request body:** Typically `email`, `emailOtp` (or `code`), `externalUserId`; exact shape depends on upstream. See OpenAPI or upstream IBEX Safe docs.

**Response (200):** Recovery/challenge data used by the client to complete POST sign-in (wallet=email).

---

### KYC/KYB bootstrap (authenticated)

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| POST | `/v1.2/auth/iframe` | JWT | **v1.2** |
| POST | `/v1.2/auth/enroll` | JWT | **v1.2** |

**`POST /v1.2/auth/iframe`**

- Purpose: start a KYC session and return iframe/redirect URLs.
- Body (optional): `{ "language": "en", "requireSmsVerification": true }`.
  - `language` (string): UI language code.
  - `requireSmsVerification` (boolean): if `true`, SMS verification of phone number will be required before KYC/KYB submission.
- Response (200): usually includes `chatbotURL`, `sessionId`, `chatbotFullURL`, `alreadySent`.

**`POST /v1.2/auth/enroll`**

- Purpose: start KYB enrollment (business onboarding), proxied to IBEX Safe.
- Body (required): `{ "email", "companyRegistrationNumber", "returnUrl?" }`.
- If the domain has `isKybSkipSirenCheck` enabled, duplicate SIREN validation is automatically bypassed (allows re-enrollment with the same SIREN).
- Response (200): enrollment/session payload (e.g. `status`, `sessionId`, `chatbotFullURL`).
- Response (409): conflict when an enrollment already exists or is not eligible for a new one.

---

## Users

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| GET | `/v1.2/users/me` | JWT | **v1.2** |
| POST | `/v1.2/users/me` | JWT | **v1.2** |
| GET | `/v1.2/users/me/operations` | JWT | **v1.2** |
| GET | `/v1.2/domain/users/:id` | API_KEY | **v1.2** |
| GET | `/v1.2/domain/company/check` | API_KEY | **v1.2** |
| GET | `/v1.2/domain/company/check/peppol` | API_KEY | **v1.2** |
| GET | `/v1.2/users/me/balances` | JWT | **v1.2** (`type` / `identifier` envelope) |
| GET | `/v1.2/users/me/transactions` | JWT | **v1.2** (same crypto envelope) |
| GET | `/v1.2/users/me/lending` | JWT | **v1.2** (lending catalog; `?userScoped=true` for user-scoped) |
| GET | `/v1.2/users/me/tokens` | JWT | **v1.2** (user tokens) |
| GET | `/v1.2/users/me/ibans` | JWT | **v1.2** |
| GET | `/v1.2/users/me/signers` | JWT | **v1.2** |
| GET | `/v1.2/users/kyc/status` | JWT | **v1.2** |
| POST | `/v1.2/users/me/validate-email` | JWT | **v1.2** |
| POST | `/v1.2/users/me/confirm-email` | JWT | **v1.2** |
| POST | `/v1.2/users/me/validate-sms` | JWT | **v1.2** |
| POST | `/v1.2/users/me/confirm-sms` | JWT | **v1.2** |
| GET/POST/PUT/DELETE | `/v1.2/users/me/addressbook` (+ `/:id`, sub-routes crypto / IBAN) | JWT | **v1.2** (unified contacts — IBEXSAFE `addressbook.entry.*`) |
| GET | `/v1.2/users/me/chainid` | JWT | **v1.2** |
| GET | `/v1.2/users/me/address` | JWT | **v1.2** |
| POST | `/v1.2/users/me/wallets/global` | JWT | **v1.2** (append signer-global derived addresses) |

---

### JWT anti-flood policy (external routes)

For external JWT routes, the API applies a global anti-flood guard and returns `429` with `Retry-After` when limits are hit.

The guard is evaluated per tenant/user and has two layers:

1. **Strict replay layer**: blocks immediate replays of the exact same request fingerprint  
   (`rpId + externalUserId + method + routePattern + canonicalQuery + canonicalBody`).
2. **Per-route budget layer**: applies a short window quota by  
   `rpId + externalUserId + method + routePattern + business dimensions` (endpoint-specific key).

Examples of business dimensions used by the budget key:
- `GET /v1.2/users/me/transactions`: `scope`, `blockchainId`, `walletAddress`, `iban`
- `GET /v1.2/users/me/balances`: `blockchainId`, `walletAddress`, `iban`, `includePrices`, `includeZero`
- aggregate and mutation routes use dedicated policy keys (signer, action identifiers, etc.).

This policy is intentionally strict to prevent repeated polling/flood patterns with small payload mutations.

### GET /v1.2/users/me

**Headers:** `Authorization: Bearer <access_token>`.

**Response (200):**

Aggregator endpoint for the authenticated user scope.  
It proxies the following routes and returns one top-level key per section (compact format, no `{ status, data }` wrapper on success):

- `GET /v1.2/users/me/address`
- `GET /v1.2/users/me/balances`
- `GET /v1.2/users/me/ibans`
- `GET /v1.2/users/me/lending`
- `GET /v1.2/users/me/pools`
- `GET /v1.2/users/me/signers`
- `GET /v1.2/users/me/transactions`
- `GET /v1.2/users/kyc/status`
- `GET /v1.2/users/me/addressbook`

Notes about pagination/defaults:
- The aggregator does not apply extra hidden caps on top of dedicated endpoints.
- `transactions` section now uses the same defaults as `GET /v1.2/users/me/transactions` when query params are omitted (`page=1`, `limit=50`, `includePrices=true`).
- `balances` section keeps the same behavior as `GET /v1.2/users/me/balances` (no additional aggregator-only limit override).
- If one or more sections fail, the response adds an optional `errors` object:  
  `errors.<section> = { status, message }`.
- Failed sections are omitted from top-level section keys and represented in `errors`.

**Example:**
```http
GET /v1.2/users/me
Authorization: Bearer <access_token>
Host: app.ibex.fi
```
```json
{
  "addresses": {
    "rpId": "ibex.fi",
    "externalUserId": "081d27b9-...",
    "signerId": "rmnbKSPCYpxpItqnwA5sjQ",
    "count": 2,
    "wallets": [
      {
        "safeAddress": "0x391ff367...",
        "chainIds": [421614],
        "threshold": 1,
        "chains": [{ "chainId": 421614 }],
        "createdAt": "2026-05-10T13:41:35.183Z",
        "updatedAt": "2026-05-10T13:41:35.230Z",
        "primary": true,
        "derived": {
          "perSafe": {},
          "global": {
            "eoaAddresses": [
              { "type": "EVM", "address": "0xdF8cdB35..." },
              { "type": "SOLANA", "address": "FRZqVAAE..." },
              { "type": "BITCOIN_P2WPKH", "address": "bc1qtfce4a..." },
              { "type": "BITCOIN_P2TR", "address": "bc1pjf26w7..." },
              { "type": "COSMOS", "address": "cosmos1ckdg8..." },
              { "type": "POLKADOT", "address": "1LHqnBWN..." },
              { "type": "TEZOS_TZ1", "address": "tz1fWJoo..." },
              { "type": "TEZOS_TZ2", "address": "tz28gusV..." }
            ]
          }
        }
      },
      {
        "safeAddress": "0x67B3A55a...",
        "chainIds": [100],
        "threshold": 1,
        "chains": [{ "chainId": 100 }],
        "primary": false,
        "derived": { "perSafe": {}, "global": { "eoaAddresses": ["...same as above..."] } }
      }
    ]
  },
  "balances": {
    "timestamp": "2026-05-14T19:14:57.613Z",
    "crypto": {
      "421614": {
        "0x391ff367...": {
          "tokens": [
            { "tokenAddress": "0x12bfd5e8...", "symbol": "ETH-IBEX", "decimals": 18, "balance": "0.005", "price_usd": 976.75, "price_eur": 903.96, "value_usd": "4.88", "value_eur": "4.52", "price_source": "FAUCET_PRICE" },
            { "tokenAddress": "0xb21ef114...", "symbol": "BTC-IBEX", "decimals": 8, "balance": "0.01137212", "price_usd": 67744.28, "value_usd": "770.40", "price_source": "FAUCET_PRICE" }
          ],
          "pending": []
        }
      }
    },
    "fiat": {},
    "totals": {
      "crypto_total_value_eur": "729.69",
      "fiat_total_value_eur": "0.00",
      "grand_total_value_eur": "729.69",
      "crypto_total_value_usd": "788.08",
      "fiat_total_value_usd": "0.00",
      "grand_total_value_usd": "788.08",
      "conversion_rate_eur_usd": 1.1797
    },
    "prices_available": true
  },
  "ibans": { "count": 0, "ibans": [] },
  "signers": {
    "count": 1,
    "signers": [
      {
        "id": "rmnbKSPCYpxpItqnwA5sjQ",
        "type": "PASSKEY",
        "typeDescription": "WebAuthn passkey credential",
        "walletMode": "SAFE_4337",
        "keyName": "TEST",
        "keyDisplayName": "TEST",
        "createdAt": "2026-05-10T13:41:35.132Z",
        "safesCount": 2
      }
    ]
  },
  "transactions": {
    "type": "mixed",
    "timestamp": "2026-05-14T19:14:57.719Z",
    "crypto": {
      "blockchainId": "421614",
      "total": 20,
      "page": 1,
      "limit": 50,
      "totalPages": 1,
      "data": [
        { "transactionHash": "0x32ba10bb...", "timestamp": "2026-05-14T10:38:56.000Z", "from": "0x079523...", "to": "0x391ff3...", "tokenSymbol": "XAU-IBEX", "valueFormatted": 0.006, "direction": "IN", "watchedAddress": "0x391ff3...", "blockchainId": "421614", "price_usd": 2125.36, "value_usd": "12.75", "walletAddress": "0x391ff3..." }
      ],
      "chains": [
        {
          "blockchainId": "421614",
          "total": 20,
          "wallets": [
            {
              "walletAddress": "0x391ff3...",
              "total": 20,
              "data": [
                { "transactionHash": "0x32ba10bb...", "tokenSymbol": "XAU-IBEX", "valueFormatted": 0.006, "direction": "IN" }
              ]
            }
          ]
        }
      ]
    },
    "fiat": {
      "ibans": [],
      "total": 0,
      "page": 1,
      "limit": 50,
      "totalPages": 0,
      "data": [],
      "filters": { "type": null, "status": null, "startDate": "2025-01-01", "endDate": "2026-05-15" }
    }
  },
  "kycStatus": {
    "externalUserId": "081d27b9-...",
    "kycLevel": "0",
    "status": "not_started",
    "verified": false
  },
  "addressbook": {
    "success": true,
    "data": []
  }
}
```

Notes:
- `addresses.wallets[]` contains multi-chain Safe wallets with `chainIds[]` and derived EOA/non-EVM addresses in `derived.global.eoaAddresses[]`.
- `balances.crypto` is keyed by chain ID → wallet address → `tokens[]` (same format as `GET /v1.2/users/me/balances`). Empty wallets/chains are stripped by default.
- `transactions.crypto` includes both a flat `data[]` with pagination and a grouped `chains[].wallets[]` view.
- Each transaction in `data[]` includes a `walletAddress` field (added by the aggregator).
- `signers[]` includes `type`, `walletMode`, `keyName`, `safesCount`.

**Example (partial failure):**
```json
{
  "addresses": { "count": 1, "wallets": [] },
  "balances": { "timestamp": "...", "crypto": {}, "fiat": {}, "totals": {} },
  "errors": {
    "transactions": { "status": 500, "message": "Internal server error" }
  }
}
```

---

### POST /v1.2/users/me

Write arbitrary key/value data for the authenticated user (`data` object). Keys prefixed with `private.` are stored but never returned by `GET /v1.2/users/me`.

**Headers:** JWT.

**Body:**

```json
{
  "data": {
    "email": "jane.doe@foo.domain",
    "language": "en",
    "private.tier": "gold"
  }
}
```

**Response (200):**

```json
{ "success": true }
```

---

### GET /v1.2/users/me/operations

**Headers:** JWT. **Query (optional):** `status`, `limit`, `offset`, pagination params.

**Response (200):** List of user operations (e.g. `userOpHash`, `status`, `safeAddress`, `transactionHash`, timestamps).

---

### GET /v1.2/domain/users/:id

**Path:** `:id` = tenant `externalUserId` (API_KEY only).

**Headers:** `x-api-key` (tenant API key) ; `Origin` (must match the tenant domain).

**Response (200):** User object scoped to the tenant `rpId`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | The `externalUserId`. |
| `ky` | string | KY verification status (`"0"` = pending, `"5"` = verified, etc.). Updated in real time when upstream verification completes. |
| `signers` | array | Signers linked to this user, each with `id`, `addresses[]`, and `safes[]`. |

```json
{
  "id": "9d61adb4-0bdb-4ab5-ba36-1d7b337eefe5",
  "ky": "5",
  "signers": [
    {
      "id": "0xdbae11fdfb98a2ef64d8c86255379853c83b1c43",
      "addresses": [
        { "type": "EVM", "address": "0xdbae11fdfb98a2ef64d8c86255379853c83b1c43" }
      ],
      "safes": [
        { "address": "0x67b3a55a4327c2e1e5ea805ffd3cc91d20707e79", "blockchainId": 100, "threshold": 1 }
      ]
    }
  ]
}
```

---

### GET /v1.2/domain/users

**Auth:** API_KEY (`x-api-key` header).

**Headers:** `x-api-key` (tenant API key) ; `Origin` (must match the tenant domain).

**Description:** Returns a paginated list of `externalUserId`s for the current tenant, optionally filtered by KY state. Useful for back-office dashboards to segment users by verification progress.

**Query parameters:**

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ky` | string | No | — | Filter by KY state. Valid values: `0` (not started), `2` (submitted), `3` (info requested), `4` (rejected), `5` (accepted), `22` (signature requested), `23` (signature received), `55` (temporary blocked). If omitted, returns all users. |
| `page` | integer | No | 1 | Page number (1-indexed). |
| `limit` | integer | No | 50 | Number of results per page (max: 200). |

**Response (200):**

```json
{
  "users": [
    { "externalUserId": "9d61adb4-0bdb-4ab5-ba36-1d7b337eefe5", "ky": "5", "createdAt": "2025-06-15T10:42:00.000Z" },
    { "externalUserId": "a1b2c3d4-5678-90ab-cdef-1234567890ab", "ky": "5", "createdAt": "2025-06-14T08:30:00.000Z" }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 127
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `users[].externalUserId` | string | The tenant-scoped user identifier. |
| `users[].ky` | string | Current KY state value. |
| `users[].createdAt` | string (ISO 8601) | User creation timestamp. |
| `pagination.page` | integer | Current page. |
| `pagination.limit` | integer | Page size used. |
| `pagination.total` | integer | Total number of matching users. |

**Error responses:**

| Code | Condition |
|------|-----------|
| 400 | Invalid `ky` value (not in the allowed set). |
| 401 | Invalid or missing `x-api-key`. |

---

### GET /v1.2/domain/company/check

**Auth:** API_KEY (`x-api-key` header).

**Headers:** `x-api-key` (tenant API key) ; `Origin` (must match the tenant domain).

**Description:** Performs a quick KYB eligibility pre-check on a French SIREN number without creating any record. Looks up the company via INPI / Recherche Entreprises, screens representatives and beneficial owners against sanctions lists and PEP databases, and returns structured company data with an eligibility verdict.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `siren` | string | Yes | 9-digit French SIREN number (e.g. `952547255`). |

**Response (200):** Pre-check result with eligibility verdict and KYC-eligible persons.

```json
{
  "result": "OK",
  "kycEligiblePersons": [
    {
      "firstName": "Christophe",
      "lastName": "CAMBORDE",
      "role": "Président de SAS",
      "birthDate": "1975-11"
    }
  ]
}
```

**Error responses:**

| Code | Condition |
|------|-----------|
| 400 | Invalid SIREN format (not exactly 9 digits), company not found, or company inactive. |
| 401 | Invalid or missing `x-api-key`. |

---

### GET /v1.2/domain/company/check/peppol

**Auth:** API_KEY (`x-api-key` header).

**Headers:** `x-api-key` (tenant API key) ; `Origin` (must match the tenant domain).

**Description:** Checks whether a company identified by its SIREN is registered in the [Peppol e-invoicing directory](https://directory.peppol.eu). This is an independent lookup — it does not create any record and does not affect the KYB pre-check verdict.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `siren` | string | Yes | 9-digit French SIREN number (e.g. `833754302`). |

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| `registered` | boolean | `true` if the SIREN is found in the Peppol Directory, `false` otherwise. |
| `participantId` | string\|null | Peppol participant identifier (e.g. `0225:833754302`). Present only when `registered` is `true`. |
| `entityName` | string\|null | Entity name as registered in Peppol. Present only when `registered` is `true`. |
| `countryCode` | string\|null | ISO 3166-1 alpha-2 country code. Present only when `registered` is `true`. |
| `additionalInfo` | string\|null | Additional information (e.g. `FR_ASSUJETTI_ACTIVE`). Present only when `registered` is `true`. |
| `smpUrl` | string\|null | Access point URL (SMP) resolved via DNS NAPTR lookup. `null` if DNS lookup fails. |
| `naptrDomain` | string\|null | Computed NAPTR DNS domain (SHA-256 hash of participant value, Base32-encoded). |
| `docTypes` | array | List of accepted Peppol document types. Each object contains `label` (human-readable name) and `urn` (raw document type identifier). Empty array when `registered` is `false`. |

```json
{
  "registered": true,
  "participantId": "0225:833754302",
  "entityName": "ARTEMIS CONSEIL",
  "countryCode": "FR",
  "additionalInfo": "FR_ASSUJETTI_ACTIVE",
  "smpUrl": "https://peppol-smp-public.production.qonto-snc.co",
  "naptrDomain": "FJVAYBOCKQKK5J44236CKQT72SBBRFGHOZQ2YD7FZSINFCQ63RYQ.iso6523-actorid-upis.participant.sml.prod.tech.peppol.org",
  "docTypes": [
    { "label": "Peppol BIS Billing UBL Invoice V3", "urn": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0::2.1" },
    { "label": "France UBL Invoice CIUS", "urn": "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2::Invoice##urn:cen.eu:en16931:2017#compliant#urn:peppol:france:billing:cius:1.0::2.1" }
  ]
}
```

```json
{
  "registered": false,
  "docTypes": []
}
```

**Error responses:**

| Code | Condition |
|------|-----------|
| 400 | Invalid SIREN format (not exactly 9 digits). |
| 401 | Invalid or missing `x-api-key`. |

---

<a id="get-v12-usersmebalances"></a>

### GET /v1.2/users/me/balances

**Headers:** JWT ; optional **`X-Blockchain-Id`** (or query `blockchainId`) to scope to a single chain.

**Query (optional):** `walletAddress`, `iban`, `blockchainId`, `includeZero`, `includeEmpty`, `includePrices`, `page`, `limit`.

Default values:
- `includePrices=true` (if omitted).
- `includeEmpty=false` — by default, wallets with no tokens and chains containing only empty wallets are stripped from the response. Set `includeEmpty=true` to include them.
- `page` / `limit`: standard pagination defaults apply when omitted.

`externalUserId` is taken from the JWT (not from query params on this endpoint).

Chain behavior in aggregated mode:
- **No explicit `blockchainId`** (neither header nor query): returns balances across **all chains** for the user. The platform default chain is **not** applied as a filter.
- **Explicit `blockchainId`** (header `X-Blockchain-Id` or query `?blockchainId=100`): returns balances for that chain only.

Scope behavior:
- If only `externalUserId` is present (via JWT), with no `walletAddress` and no `iban`: aggregated user mode (`/v1.2/balances`) that returns all balances across all wallets and all IBANs linked to the authenticated user, across all chains (unless `blockchainId` is explicitly provided).
- `walletAddress`: scoped mode (`/v1.2/balances/:identifier`) for one wallet.
- `iban`: scoped mode (`/v1.2/balances/:identifier`) for one IBAN.
- `walletAddress` + `iban`: rejected (`400`, ambiguous scope).

`walletAddress` accepted values:
- a Safe address from `GET /v1.2/users/me/address` (`wallets[].safeAddress`)
- a derived EOA address from `GET /v1.2/users/me/address?includeDerived=true` (`wallets[].derived.global.eoaAddresses[].address`)

When a derived EOA is provided, the API resolves it to a Safe of the same signer (prefers the requested chain context when available).  
If the address is not owned by the authenticated user, the API returns `400`.

`iban` is normalized (spaces removed, uppercase) before processing.

Ownership enforcement:
- the API scopes every call to the authenticated user (`externalUserId` from JWT).

**Recommended example (aggregated mode):** `GET /v1.2/users/me/balances?includePrices=true` (with JWT carrying `externalUserId`).

**Response (200):** JSON payload with post-processing (`includeEmpty` filter).

The `crypto` object is keyed by chain ID. Each chain contains wallets keyed by address. Each wallet has `tokens[]` and `pending[]`.

```json
{
  "timestamp": "2026-05-14T19:07:41.697Z",
  "crypto": {
    "100": {
      "0x67b3a55a4327c2e1e5ea805ffd3cc91d20707e79": {
        "tokens": [
          {
            "tokenAddress": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
            "primaryAddress": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
            "secondaryAddress": "0xcb444e90d8198415266c6a2724b7900fb12fc56e",
            "active": true,
            "symbol": "EURe",
            "decimals": 18,
            "balance": "2.0",
            "price_usd": 1.1797,
            "price_eur": 1,
            "value_usd": "2.36",
            "value_eur": "2.00",
            "price_updated_at": "2026-05-14T19:07:40.854577",
            "price_source": "coinbase"
          }
        ],
        "pending": []
      }
    },
    "421614": {
      "0x391ff3676e591b1772c5f89b0a6c569ee42d30b8": {
        "tokens": [
          {
            "tokenAddress": "0x12bfd5e8b232f8067976a6238f29864cb440c12d",
            "symbol": "ETH-IBEX",
            "decimals": 18,
            "balance": "0.005",
            "price_usd": 987.32,
            "price_eur": 913.74,
            "value_usd": "4.94",
            "value_eur": "4.57",
            "price_source": "FAUCET_PRICE"
          }
        ],
        "pending": []
      }
    }
  },
  "fiat": {},
  "totals": {
    "crypto_total_value_eur": "720.75",
    "fiat_total_value_eur": "0.00",
    "grand_total_value_eur": "720.75",
    "crypto_total_value_usd": "778.42",
    "fiat_total_value_usd": "0.00",
    "grand_total_value_usd": "778.42",
    "conversion_rate_eur_usd": 1.1797
  },
  "prices_available": true
}
```

Notes:
- When `includeEmpty=false` (default), only chains and wallets with at least one token in `tokens[]` are included.
- Token rows include `price_usd` / `price_eur`, `value_usd` / `value_eur`, `primaryAddress`, `secondaryAddress`, `price_source`, `price_updated_at`, etc.
- `totals` provides aggregated values across all chains and wallets.

---

<a id="get-v12-usersmetransactions"></a>

### GET /v1.2/users/me/transactions

**Headers:** JWT ; optional **`X-Blockchain-Id`**.

**Query (optional):** `walletAddress`, `iban`, `scope`, `blockchainId`, `startDate`, `endDate`, `direction`, `tokenType`, `tokenAddress`, `hash`, `page`, `limit`, `includePrices`.

Default values (when omitted):
- `startDate=2025-01-01`
- `endDate=<tomorrow UTC date>`
- `page=1`
- `limit=50`
- `includePrices=true`
- `scope=mixed`

Pagination note:
- Response is paginated (`page`, `limit`, `total`, `totalPages`) for both `crypto` and `fiat` sections.
- For full history, iterate over pages client-side.

`externalUserId` is taken from the JWT (not from query params on this endpoint).

Scope behavior:
- If only JWT user scope is present (no `walletAddress`, no `iban`): aggregated user mode across all user wallets and all user IBANs.
- `walletAddress`: scoped mode (`/v1.2/transactions/:identifier`) for one wallet.
- `iban`: scoped mode (`/v1.2/transactions/:identifier`) for one IBAN.
- `walletAddress` + `iban`: rejected (`400`, ambiguous scope).

Chain behavior in aggregated mode:
- If `blockchainId` is explicitly provided (query) **or** `X-Blockchain-Id` is explicitly provided, only this chain is aggregated.
- If no explicit chain selector is provided, aggregation runs across all chains where the user has wallets.

Transaction-class filter:
- `scope=mixed` (default): returns both `crypto` and `fiat`.
- `scope=crypto`: returns only `crypto`.
- `scope=fiat`: returns only `fiat`.

`walletAddress` accepted values:
- a Safe address from `GET /v1.2/users/me/address` (`wallets[].safeAddress`)
- a derived EOA address from `GET /v1.2/users/me/address?includeDerived=true` (`wallets[].derived.global.eoaAddresses[].address`)

When a derived EOA is provided, the API resolves it to a Safe of the same signer (prefers the requested chain context when available).  
If the address is not owned by the authenticated user, the API returns `400`.

`iban` is normalized (spaces removed, uppercase) before processing.

Ownership enforcement:
- the API scopes every call to the authenticated user (`externalUserId` from JWT).

Pagination/filtering remain available (`page`, `limit`, date/token filters, `includePrices`).

**Response (200):**

- `scope=mixed` (default):
  - `type: "mixed"`
  - `crypto` section + `fiat` section
- `scope=crypto`:
  - `type: "crypto"`
  - only `crypto` section
- `scope=fiat`:
  - `type: "fiat"`
  - only `fiat` section

Aggregated `crypto` includes:
- classic pagination fields: `total`, `page`, `limit`, `totalPages`, `data`
- grouped view: `chains[]` where each chain contains `wallets[]`

Aggregated `fiat` includes:
- classic pagination fields: `total`, `page`, `limit`, `totalPages`, `data`
- grouped view by IBAN: `ibans[]`

WebSocket parity (`transaction_data`):
- The WebSocket `transaction_data` payload uses the exact same transactions envelope as this endpoint (`type`, `timestamp`, and `crypto` / `fiat` sections depending on `scope`).
- This parity applies to:
  - the initial WS push after auth (`mode: "initial"`)
  - explicit WS requests (`type: "get_transactions"` -> `type: "transaction_data"`, `mode: "request"`)
- Query params sent in `get_transactions.params` follow the same semantics and defaults as this HTTP endpoint.

Example (`scope=mixed`, aggregated mode — no `walletAddress`, no `iban`):

The `crypto` section contains a `transactions` object keyed by chain ID. Each chain has its own pagination (`total`, `page`, `limit`, `totalPages`) and `data[]` array. Transactions within `data[]` include the `watchedAddress` field indicating which user wallet received/sent the transaction.

```json
{
  "type": "mixed",
  "timestamp": "2026-05-14T19:19:16.194Z",
  "crypto": {
    "timestamp": "2026-05-14T19:19:16.194Z",
    "transactions": {
      "100": {
        "total": 1,
        "page": 1,
        "limit": 50,
        "totalPages": 1,
        "data": [
          {
            "id": 151927,
            "blockNumber": 46172038,
            "transactionHash": "0x4d8249e797bd491f33cfc53e2b1ca60af4ebbd077903efc7de605ed26ab4fad3",
            "timestamp": "2026-05-14T14:53:55.000Z",
            "from": "0x93d708cd8e669a0b8bd3e2bc3b58ce02168322b4",
            "to": "0x67b3a55a4327c2e1e5ea805ffd3cc91d20707e79",
            "tokenAddress": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
            "tokenType": "ERC20",
            "tokenId": null,
            "value": "2000000000000000000",
            "valueFormatted": 2,
            "direction": "IN",
            "watchedAddress": "0x67b3a55a4327c2e1e5ea805ffd3cc91d20707e79",
            "blockchainId": "100",
            "primaryAddress": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
            "secondaryAddress": "0xcb444e90d8198415266c6a2724b7900fb12fc56e",
            "tokenSymbol": "EURe",
            "balance": 2,
            "price_usd": 1.18,
            "price_eur": 1,
            "value_usd": "2.36",
            "value_eur": "2.00",
            "price_source": "APIPRICE_CONVERSION"
          }
        ]
      },
      "421614": {
        "total": 117,
        "page": 1,
        "limit": 50,
        "totalPages": 3,
        "data": [
          {
            "id": 151890,
            "transactionHash": "0x0e092597...",
            "timestamp": "2026-05-14T14:24:10.000Z",
            "from": "0x74a9b04c...",
            "to": "0x67b3a55a...",
            "tokenAddress": "0x551acb89...",
            "tokenType": "ERC20",
            "valueFormatted": 0.009526,
            "direction": "IN",
            "watchedAddress": "0x67b3a55a4327c2e1e5ea805ffd3cc91d20707e79",
            "blockchainId": "421614",
            "tokenSymbol": "CAD-IBEX",
            "price_usd": 0.892099,
            "price_eur": 0.892099,
            "price_source": "FAUCET_PRICE"
          }
        ]
      }
    },
    "prices_available": true
  },
  "fiat": {
    "ibans": [],
    "total": 0,
    "page": 1,
    "limit": 50,
    "totalPages": 0,
    "data": [],
    "filters": {
      "type": null,
      "status": null,
      "startDate": "2025-01-01",
      "endDate": "2026-12-31"
    }
  }
}
```

Transaction fields per item:
- `id`, `blockNumber`, `transactionHash`, `timestamp` — block/tx metadata
- `from`, `to` — sender/receiver addresses
- `tokenAddress`, `tokenType` (`ERC20`, `ERC721`, `ERC1155`, `NATIVE`), `tokenId`, `tokenSymbol` — token info
- `value` (raw wei), `valueFormatted` (human-readable decimal) — amounts
- `direction` (`IN` / `OUT`) — relative to `watchedAddress`
- `watchedAddress` — the user's wallet address involved
- `blockchainId` — chain identifier as string
- `primaryAddress`, `secondaryAddress`, `active` — token contract metadata
- `balance` — current balance of this token at query time
- `price_usd`, `price_eur`, `value_usd`, `value_eur`, `price_updated_at`, `price_source` — pricing (when `includePrices=true`)

---

### GET /v1.2/users/me/tokens

Returns the tokens the authenticated user has interacted with (based on transaction history).

**Headers:** JWT. Optional `X-Blockchain-Id` to scope to one chain.

**Behavior:**

- With `X-Blockchain-Id`: returns a flat array of tokens filtered to that chain.
- Without `X-Blockchain-Id`: returns tokens grouped by `blockchainId` (`[{ blockchainId, tokens }]`).

**Response (200):**

Token object fields:

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | Primary smart-contract address of the token. |
| `secondaryAddress` | string \| null | Alternate or updated contract address for the same token (e.g. after a token migration). `null` when not applicable. |
| `symbol` | string | Ticker symbol (e.g. `EURe`, `USDC`). |
| `name` | string | Human-readable token name. |
| `decimals` | number | Number of decimals used by the token contract. |
| `blockchainId` | string | Chain identifier (e.g. `"421614"`). |
| `active` | boolean | Whether the token is currently active on the platform. |
| `iconUrl` | string \| null | URL to the token icon image hosted by the platform (e.g. `https://app.ibex.fi/images/tokens/eure.png`). `null` when no icon is available. |
| `type` | string \| null | Token classification in uppercase. Possible values: `STABLECOIN_EUR`, `STABLECOIN_USD`, `STABLECOIN_GBP`, `STABLECOIN_CHF`, `GAS`, `BLOCKCHAIN`, `WRAPPED`, `AAVE`, `DAO`, `MEMECOIN`, `LOCAL`, `FAKE`, `TEST`, `OTHER`. `null` when unclassified. |

**Error responses:**

- `404`: no watched addresses found for this user.

**Example (single-chain style, with `X-Blockchain-Id: 421614`):**

```json
[
  {
    "address": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
    "secondaryAddress": null,
    "symbol": "EURe",
    "name": "Monerium EUR emoney",
    "decimals": 18,
    "blockchainId": "421614",
    "active": true,
    "iconUrl": "https://app.ibex.fi/images/tokens/eure.png",
    "type": "STABLECOIN_EUR"
  }
]
```

**Example (grouped multi-chain style, without `X-Blockchain-Id`):**

```json
[
  {
    "blockchainId": "100",
    "tokens": [
      {
        "address": "0xcb444e90d8198415266c6a2724b7900fb12fc56e",
        "secondaryAddress": null,
        "symbol": "EURe",
        "name": "Monerium EUR emoney",
        "decimals": 18,
        "active": true,
        "iconUrl": "https://app.ibex.fi/images/tokens/eure.png",
        "type": "STABLECOIN_EUR"
      }
    ]
  },
  {
    "blockchainId": "421614",
    "tokens": [
      {
        "address": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
        "secondaryAddress": null,
        "symbol": "EURe",
        "name": "Monerium EUR emoney",
        "decimals": 18,
        "active": true,
        "iconUrl": "https://app.ibex.fi/images/tokens/eure.png",
        "type": "STABLECOIN_EUR"
      }
    ]
  }
]
```

---

### GET /v1.2/users/me/lending

Returns active lending/vault entries. All lending endpoints are **v1.2 only**.

**Headers:** JWT. Optional `X-Blockchain-Id` to filter by chain; omit to get all chains.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `userScoped` | `true` \| `false` | `false` | When `true`, restricts results to chains where the authenticated user has watched addresses (lightweight DB lookup, no on-chain RPC). When `false` (default), returns the full catalog. |
| `blockchainId` | string | – | Filter by chain ID (alternative to `X-Blockchain-Id` header) |

**Response (200):** JSON array. Each entry contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Entry ID |
| `blockchainId` | string | Chain ID (e.g. `"1"`, `"42161"`) |
| `provider` | string | `"AAVE"`, `"MORPHO"`, or `"HYPERLIQUID"` |
| `address` | string | Pool/vault contract address |
| `name` | string\|null | Human-readable pool/vault name |
| `assetTicker` | string\|null | Asset symbol (e.g. `"USDC"`, `"WETH"`) |
| `assetAddress` | string\|null | Underlying asset contract address |
| `assetDecimals` | integer\|null | Asset decimals |
| `apy` | float\|null | Current APY as decimal |
| `tvl` | float\|null | Total value locked in USD |
| `isDefault` | boolean | `true` for the highest-TVL entry per asset |
| `acceptedTokenAddresses` | array\|null | Token addresses accepted (AAVE) |
| `leader` | string\|null | Vault leader address (HYPERLIQUID only) |
| `leaderCommission` | float\|null | Leader commission (HYPERLIQUID only) |

**Error responses (when `userScoped=true`):**

- `404`: no watched addresses found for this user.

---

### Unified address book (`/v1.2/users/me/addressbook`)

**Auth:** JWT. **Storage:** IBEXSAFE userdata — one flat key per **entry**: `addressbook.entry.<uuid>`. Each entry combines **SEPA IBAN rows** (see below) and **crypto recipients** in a single contact.

**Entry JSON (conceptual):**

- `id`, `name`, optional `label`, `userValidated`, `createdAt`, `updatedAt`
- `crypto`: `[{ "chainId", "address" }, …]` — at most **50** per entry; **global** uniqueness of `(chainId, address)` across all entries for the user
- `ibans`: `[{ "iban", "vop", "vopResult?", "matchedName?", "respondingPspBic?", "label?", "verifiedAt" }, …]` — populated by VOP verification flow when upstream returns **MTCH**; **global** uniqueness of `iban` across all entries

To add an IBAN at contact creation, clients should provide both:
- the beneficiary IBAN (`iban`)
- the beneficiary bank BIC (`respondingPspBic`)

Internal VOP calls are rate-limited to **10 failed verifications per user per UTC day**. Successful (`MTCH`) verifications do not consume this quota. When reached, API returns `429`.

On supported EVM chains, crypto `address` must be valid `0x` + 40 hex and is checksum-normalized. At most **500** entries per user.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1.2/users/me/addressbook` | List entries (`success` + `data[]`). |
| POST | `/v1.2/users/me/addressbook` | Body `{ "name", "label?", "userValidated?", "crypto?", "iban?", "respondingPspBic?", "remittanceInfo?" }`. Creates an entry; if `iban` + `respondingPspBic` are provided, VOP is executed internally and the IBAN row is attached only on `MTCH` (otherwise `400` and no entry is created). Daily VOP cap: **10 failed verifications/user/day (UTC)**, then `429`. |
| PUT | `/v1.2/users/me/addressbook/:id` | Partial update: `name`, `label`, `userValidated` only. |
| DELETE | `/v1.2/users/me/addressbook/:id` | Tombstones `addressbook.entry.<id>`. |
| POST | `/v1.2/users/me/addressbook/:id/crypto` | Body `{ "chainId", "address" }` — append one crypto row. |
| DELETE | `/v1.2/users/me/addressbook/:id/crypto/:chainId/:address` | Remove one crypto row (address URL-encoded if needed). |
| DELETE | `/v1.2/users/me/addressbook/:id/ibans/:iban` | Remove one IBAN row from the entry (no VOP). |

**Response shape:** top-level `success` + `data` (array or object depending on route).

---

### GET /v1.2/users/me/chainid

**Headers:** JWT.

Returns **all active platform chains** (`Chains.isActive=true`) for the authenticated signer (`sid` from JWT when present), plus signer wallets and per-chain module statuses.

Chains without any signer wallet are still included with `wallets: []`.

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| `defaultChainId` | number | Current/default chain ID resolved from request context (or server default). |
| `chains` | array | All active chains on the platform. |
| `chains[].chainId` | number | Chain ID. |
| `chains[].chainName` | string | Human-readable chain name. |
| `chains[].modules` | object | Aggregated module flags for signer wallets on this chain. |
| `chains[].modules.recovery` | boolean \| `"N/A"` | `"N/A"` if recovery is not available on this chain (`recoveryContract` and `recoveryModuleMasterAddress` are both missing); otherwise `true` if activated on at least one signer wallet, else `false`. |
| `chains[].modules.automation` | boolean \| `"N/A"` | `"N/A"` if automation is not available on this chain (`automationModuleAddress` missing); otherwise `true` if activated on at least one signer wallet, else `false`. |
| `chains[].modules.multisig` | `true` \| `"N/A"` | `true` if Safe multisig is available on this chain (`isSafeWallet=true`), otherwise `"N/A"`. |
| `chains[].wallets` | array | Wallet addresses on this chain for the authenticated signer; can be empty (`[]`). |
| `chains[].wallets[].address` | string | Safe wallet address. |

**Example (200):**

```json
{
  "defaultChainId": 421614,
  "chains": [
    {
      "chainId": 421614,
      "chainName": "Arbitrum Testnet Sepolia",
      "modules": {
        "recovery": "N/A",
        "automation": true
      },
      "wallets": [
        { "address": "0x490E...cAC2" }
      ]
    },
    {
      "chainId": 100,
      "chainName": "Gnosis",
      "modules": {
        "recovery": false,
        "automation": true
      },
      "wallets": [
        { "address": "0x490E...cAC2" }
      ]
    }
  ]
}
```

---

### GET /v1.2/users/me/address

Returns wallet addresses grouped per Safe across all deployed chains for the authenticated user/signer.

Use this endpoint as the **source of truth** for recovery activation status (`wallets[].chains[].modules.recovery.enabled`) per Safe and per chain.

**Headers:** JWT.

**Query (optional):**

- `includeDerived` (boolean): when `true`, each `wallets[]` item is enriched with:
  - `derived.perSafe` (per-family addresses for this Safe)
  - `derived.global.eoaAddresses` (signer-global derived addresses, without sign-in response filtering)

**Signer filtering (`sid` in JWT):**

- If the JWT includes `sid`, only wallets of that signer are returned.
- If `sid` is missing (legacy tokens), the endpoint falls back to all signers for the user.

**Response status:**

- `200` with payload when at least one wallet exists.
- `204` (No Content) when no wallet is found for the current filter.

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| `rpId` | string | Current rpId namespace. |
| `externalUserId` | string | Authenticated external user id. |
| `signerId` | string (optional) | Signer ID from JWT (`sid`) when available. |
| `count` | number | Number of distinct Safe addresses in `wallets`. |
| `wallets` | array | List of Safes for the signer/user scope. |
| `wallets[].safeAddress` | string | Safe wallet address. |
| `wallets[].chainIds` | number[] | Chain IDs where this Safe is deployed (sorted ascending). |
| `wallets[].threshold` | number | Safe multisig threshold. |
| `wallets[].chains` | array | Per-chain details, sorted by `chainId`. |
| `wallets[].chains[].chainId` | number | Chain ID for this entry. |
| `wallets[].chains[].modules` | object (optional) | Present only when at least one module is configured on that chain. |
| `wallets[].chains[].modules.recovery.enabled` | boolean | Recovery module activation status. |
| `wallets[].chains[].modules.recovery.moduleAddress` | string (optional) | Recovery module address if known. |
| `wallets[].chains[].modules.automation.enabled` | boolean | Automation/allowance effective status (`false` if module exists but disabled). |
| `wallets[].chains[].modules.automation.moduleAddress` | string (optional) | Automation module address. |
| `wallets[].chains[].modules.automation.targetAddress` | string (optional) | Target address configured for automation. |
| `wallets[].chains[].modules.automation.transferMode` | string (optional) | Transfer mode (`PERCENT_OF_RECEIVED` or `FIXED_AMOUNT`). |
| `wallets[].chains[].modules.automation.percentage` | number (optional) | Configured automation percentage. |
| `wallets[].chains[].modules.automation.fixedAmount` | string (optional) | Fixed transfer amount (token units, human-readable). |
| `wallets[].chains[].modules.automation.maxWalletPercentage` | number (optional) | Optional cap (% of wallet balance) applied in fixed-amount mode at transfer time. |
| `wallets[].chains[].modules.automation.minIntervalMinutes` | number (optional) | Minimum delay between automatic transfers (minutes). |
| `wallets[].chains[].modules.automation.periodCapAmount` | string (optional) | Maximum cumulative amount per window (token units). |
| `wallets[].chains[].modules.automation.periodCapMinutes` | number (optional) | Window length used by the cumulative cap (minutes). |
| `wallets[].chains[].modules.automation.frequency` | string (optional) | Automation execution frequency. |
| `wallets[].chains[].modules.automation.tokenAddress` | string (optional) | Token used by automation. |
| `wallets[].createdAt` | string (date-time) | Earliest Safe creation timestamp across returned chain rows. |
| `wallets[].updatedAt` | string (date-time) | Latest update timestamp across returned chain rows. |
| `wallets[].primary` | boolean | `true` for the first wallet in response ordering. |
| `wallets[].derived` | object (optional) | Present only when `includeDerived=true`. |
| `wallets[].derived.perSafe` | object | Per-family derived addresses for this Safe (`{ family: [address...] }`). |
| `wallets[].derived.global.eoaAddresses` | array | Signer-global derived addresses as `{ type, address }`. |

**Example (200):**

```json
{
  "rpId": "ibex.fi",
  "externalUserId": "c76302cb-f845-40f4-9c56-29710323afba",
  "signerId": "AVZs0qRCBSmfThZWu37g...",
  "count": 1,
  "wallets": [
    {
      "safeAddress": "0xd676c6188195372EC269E9C2cAf815C56436A679",
      "chainIds": [100, 421614],
      "threshold": 1,
      "chains": [
        { "chainId": 100 },
        {
          "chainId": 421614,
          "modules": {
            "recovery": {
              "enabled": true,
              "moduleAddress": "0xRecov..."
            },
            "automation": {
              "enabled": true,
              "moduleAddress": "0xAllow...",
              "targetAddress": "0xDest...",
              "transferMode": "PERCENT_OF_RECEIVED",
              "percentage": 25,
              "minIntervalMinutes": 60,
              "periodCapAmount": "1000",
              "periodCapMinutes": 10080,
              "frequency": "DAILY",
              "tokenAddress": "0xUSDC..."
            }
          }
        }
      ],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-03-20T14:00:00.000Z",
      "primary": true
    }
  ]
}
```

**Example (200) with `includeDerived=true`:**

```json
{
  "rpId": "ibex.fi",
  "externalUserId": "c76302cb-f845-40f4-9c56-29710323afba",
  "count": 1,
  "wallets": [
    {
      "safeAddress": "0xd676c6188195372EC269E9C2cAf815C56436A679",
      "chainIds": [421614],
      "threshold": 1,
      "chains": [{ "chainId": 421614 }],
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-03-20T14:00:00.000Z",
      "primary": true,
      "derived": {
        "perSafe": {
          "EVM": ["0xAbc...", "0xDef..."],
          "SOLANA": ["..."]
        },
        "global": {
          "eoaAddresses": [
            { "type": "EVM", "address": "0x..." },
            { "type": "SOLANA", "address": "..." }
          ]
        }
      }
    }
  ]
}
```

---

### GET /v1.2/users/me/ibans

Returns all IBAN records linked to the authenticated user's Safe wallets.

**Headers:** JWT.

**Response (200):** `{ "count": number, "ibans": [...] }` with fields such as `safeAddress`, `blockchainId`, `status`, `provider`, `createdAt`, `updatedAt`.

---

### GET /v1.2/users/me/signers

Returns all signers attached to the authenticated user (PASSKEY, EOA, EMAIL_TOKEN).

**Headers:** JWT.

**Response (200):** `{ "count": number, "signers": [...] }` including `id`, `type`, `walletMode`, optional passkey labels, timestamps, and `safesCount`.

---

### POST /v1.2/users/me/wallets/global

Derives and appends new **signer-global** addresses (not tied to a Safe).

This endpoint extends `signer.data.derivation.globalIndexed[family]` and keeps backward compatibility with legacy global fields (`eoaAddress`, `solanaAddress`, etc.) by seeding index `0` from legacy values when available.

**Headers:** JWT.

**Body:**

```json
{
  "add": [
    { "family": "EVM", "count": 2 },
    { "family": "SOLANA", "count": 1 }
  ]
}
```

**Field rules:**

| Field | Type | Constraints |
|-------|------|-------------|
| `add` | array | min 1 item |
| `add[].family` | string | one of: `EVM`, `SOLANA`, `BITCOIN_P2WPKH`, `BITCOIN_P2TR`, `BITCOIN_P2WPKH_TESTNET`, `BITCOIN_P2TR_TESTNET`, `COSMOS`, `POLKADOT`, `TEZOS_TZ1`, `TEZOS_TZ2`, `TEZOS_TZ3`, `NEAR`, `STELLAR`, `CARDANO` |
| `add[].count` | integer | optional, in `[1..10]`, default `1` |

**Response (200):**

```json
{
  "added": [
    { "family": "EVM", "index": 1, "address": "0x..." },
    { "family": "EVM", "index": 2, "address": "0x..." },
    { "family": "SOLANA", "index": 1, "address": "..." }
  ],
  "globalIndexed": {
    "EVM": ["0xLegacyIndex0...", "0x...", "0x..."],
    "SOLANA": ["LegacyOrDerivedIndex0...", "..."]
  },
  "globalEoaAddresses": [
    { "type": "EVM", "address": "0xLegacyIndex0..." },
    { "type": "EVM", "address": "0x..." },
    { "type": "SOLANA", "address": "..." }
  ],
  "limits": {
    "maxIndexPerFamily": 100,
    "maxCountPerRequest": 10,
    "supportedFamilies": ["EVM", "SOLANA", "BITCOIN_P2WPKH", "BITCOIN_P2TR", "BITCOIN_P2WPKH_TESTNET", "BITCOIN_P2TR_TESTNET", "COSMOS", "POLKADOT", "TEZOS_TZ1", "TEZOS_TZ2", "TEZOS_TZ3", "NEAR", "STELLAR", "CARDANO"]
  }
}
```

**Errors:**

| Status | Code | Cause |
|--------|------|-------|
| `400`  | invalid family / count out of range / no `add[]` | bad body |
| `400`  | `MAX_INDEX_PER_FAMILY exceeded for ...` | hard cap reached for a family |
| `401`  | JWT missing or `sid` claim absent | unauthenticated |
| `409`  | `NO_MASTER: ...` | signer has no sealed master (cannot derive) |
| `429`  | rate limit | wait the `Retry-After` window |

---

### GET /v1.2/users/kyc/status

Returns KYC status for the authenticated user.

**Headers:** JWT.

**Response (200):**

- `externalUserId`
- `kycLevel` (`0`, `1`, `2`)
- `status` (`not_started`, `pending`, `verified`, or `unknown`)
- `verified` (boolean)

---

### POST /v1.2/users/me/validate-email

Sends an email verification code through IBEX Safe.

**Headers:** JWT.

**Body:** `{ "email", "externalUserId" }`

**Response (200):** validation result payload.

---

### POST /v1.2/users/me/confirm-email

Confirms the email verification code through IBEX Safe.

**Headers:** JWT.

**Body:** `{ "email", "code", "externalUserId" }`

**Response (200):** confirmation result payload.

---

### POST /v1.2/users/me/validate-sms

Sends a 6-digit SMS verification code to a phone number. Code expires after 1 hour. Max 5 attempts per hour.

**Headers:** JWT.

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `telephone` | string | Yes | Phone number (E.164 or local format, normalized server-side) |
| `externalUserId` | string | Yes | External user identifier |
| `phonePolicy` | string | No | Validation policy: `"frMobile"` (French mobile only) or `"any"` (default) |

**Response (200):** Always `200` for security reasons. When SMS sending is disabled for the tenant (non-production config), the response includes `{ "code": "..." }` for testing.

---

### POST /v1.2/users/me/confirm-sms

Confirms the SMS verification code sent to the phone number. On success, stores the verified phone number and timestamp in user data.

**Headers:** JWT.

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `telephone` | string | Yes | Phone number (same as sent to validate-sms) |
| `code` | string | Yes | 6-digit verification code received by SMS |
| `externalUserId` | string | Yes | External user identifier |
| `phonePolicy` | string | No | Validation policy (must match the one used in validate-sms) |
| `persistTelephoneToKyb` | boolean | No | If `true`, also persists the verified phone number into the KYB `telephone` field |

**Response (200):**

```json
{ "smsVerified": true, "telephone": "+33612345678" }
```

**Error Responses:** `400` invalid/expired code or invalid phone number.

---

## IBAN

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1.2/iban/transactions` | JWT | IBAN/FIAT transactions are available via `GET /v1.2/users/me/transactions` (use `iban` query param for scoped view) |
| GET | `/v1.2/iban/balances` | JWT | IBAN/FIAT balances are available via `GET /v1.2/users/me/balances` (use `iban` query param for scoped view) |
| POST | `/v1.2/iban/revoke` | JWT | Currently returns `501 Not Implemented` |

`POST /v1.2/iban/create` has been removed.  
Use `POST /v1.2/sepa/iban/add` for IBAN creation: direct execution when `isSepaIbanAddWebauthnEnabled=FALSE`, or `POST` + `PUT /v1.2/sepa/iban/add` with WebAuthn confirmation when `isSepaIbanAddWebauthnEnabled=TRUE`.

---

### GET /v1.2/iban/transactions

`/v1.2/iban/transactions` remains a placeholder route.

To retrieve IBAN/FIAT transactions, use `GET /v1.2/users/me/transactions` instead:
- scoped IBAN view: `?iban=<IBAN>`
- aggregated user view (default): no `walletAddress` / no `iban`, with IBAN/FIAT data in the aggregated response sections.

See the canonical endpoint details in [`GET /v1.2/users/me/transactions`](#get-v12-usersmetransactions).

**Current response on `/v1.2/iban/transactions`:** `501 Not Implemented`.

---

### GET /v1.2/iban/balances

`/v1.2/iban/balances` remains a placeholder route.

To retrieve IBAN/FIAT balances, use `GET /v1.2/users/me/balances` instead:
- scoped IBAN view: `?iban=<IBAN>`
- aggregated user view (default): no `walletAddress` / no `iban`, with IBAN/FIAT sections in the combined payload (e.g. `crypto`, `fiat`, `totals`).

See the canonical endpoint details in [`GET /v1.2/users/me/balances`](#get-v12-usersmebalances).

**Current response on `/v1.2/iban/balances`:** `501 Not Implemented`.

---

### POST /v1.2/iban/revoke

Placeholder route.

**Headers:** JWT.

**Body:** `{ "safeAddress", "chainId?" }`

**Response:** `501 Not Implemented`.

---

## Chains and Chain Config

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/v1.2/chains/` | JWT | Active chains with module availability |
| GET | `/v1.2/domain/chainid` | API_KEY | Tenant aggregate view (same payload shape as `/v1.2/users/me/chainid`) |
| GET | `/v1.2/chain/tokens` | JWT | Full token catalog (compat route) |

### GET /v1.2/chains/

Returns active chains, chain icon URL, explorer address/transaction URLs, and enabled modules (`billing`, `cowswap`, `recovery`, `automation`).

**Headers:** JWT.

**Response (200):** array of `{ id, name, icon, explorerAddress, explorerTx, modules }`.

`icon` is an absolute URL pointing to the chain logo served by the API (`/images/...`).
`explorerAddress` and `explorerTx` come from chain explorer URLs stored in `Chains` (`explorerWallet`, `explorerTx`).

**Example (200):**

```json
[
  {
    "id": 100,
    "name": "Gnosis",
    "icon": "https://passkeys-prat1.ibex.fi/images/gnosis-chain-logo.png",
    "explorerAddress": "https://gnosisscan.io/address/",
    "explorerTx": "https://gnosisscan.io/tx/",
    "modules": {
      "billing": true,
      "cowswap": true,
      "recovery": false,
      "automation": false
    }
  }
]
```

---

### GET /v1.2/domain/chainid

Returns active chains enriched with wallets and module status for the current tenant (`rpId`) resolved from host/origin + `x-api-key`.

The payload shape matches `GET /v1.2/users/me/chainid`:
- `defaultChainId`
- `chains[]` with `chainId`, `chainName`, `modules`, `wallets[]`

**Headers:** `X-API-Key: <key>`.

**Request:**

```http
GET /v1.2/domain/chainid
X-API-Key: <key>
```

**Response (200):** tenant aggregate chain/wallet/module view.
| `rpcUrlHttp` / `rpcUrlHttpBackup` | string | HTTP RPC endpoint(s) |
| `rpcUrlWs` / `rpcUrlWsBackup` | string | WebSocket RPC endpoint(s) |
| `explorerTx` | string | Base explorer URL for transactions |
| `explorerWallet` | string | Base explorer URL for addresses |
| `explorerToken` | string | Base explorer URL for tokens |
| `chainLogo` | string | Chain logo URL |
| `createdAt` / `updatedAt` | string (date-time) | Record timestamps |

**Example (200):**

```json
[
  {
    "id": 1,
    "chainName": "Arbitrum Sepolia",
    "chainId": "421614",
    "chainSymbol": "ARB_SEP",
    "networkType": "testnet",
    "rpcUrlWs": "wss://arb-sepolia.g.alchemy.com/v2/...",
    "rpcUrlWsBackup": "wss://ws.quicknode.com/...",
    "rpcUrlHttp": "https://arb-sepolia.g.alchemy.com/v2/...",
    "rpcUrlHttpBackup": "https://rpc.quicknode.com/...",
    "explorerTx": "https://sepolia.arbiscan.io/tx/",
    "explorerWallet": "https://sepolia.arbiscan.io/address/",
    "explorerToken": "https://sepolia.arbiscan.io/token/",
    "chainLogo": "https://app.ibex.fi/images/arbitrum-logo.png",
    "createdAt": "2025-06-02T13:30:45.000Z",
    "updatedAt": "2025-06-02T13:30:45.000Z"
  }
]
```

**Error responses:**

- `401/403`: missing or invalid API key.
- `500`: internal error.

**Important:**

- This endpoint is **configuration-oriented** and does not expose per-user or per-Safe state.
- For module activation (`recovery`, `automation`, etc.): use `GET /v1.2/chains/` (aggregated) or `GET /v1.2/users/me/address` (per Safe/per chain source of truth).

---

### GET /v1.2/chain/tokens

Compatibility alias for monitored token configuration.

Returns the full token catalog (all tokens, not user-scoped). Prefer `GET /v1.2/users/me/tokens` for user-specific tokens.

**Headers:**

- `Authorization: Bearer <access_token>` (JWT required)
- Optional `X-Blockchain-Id: <id>` for chain scoping

**Behavior:**

- With `X-Blockchain-Id`: returns tokens for one chain (flat token array).
- Without `X-Blockchain-Id`: returns multi-chain data (often grouped by chain).

**Response (200):**

Array payload. Fields can evolve. Typical token fields include:

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Internal token row id |
| `address` | string | Token contract address |
| `secondaryAddress` | string \| null | Optional alternate/bridged address |
| `symbol` | string | Ticker symbol |
| `name` | string | Token name |
| `decimals` | number | Token decimals |
| `type` | string | Token type (for example `ERC20`) |
| `active` | boolean | Whether token is enabled in config |
| `blockchainId` | string | Chain identifier (example: `"421614"`) |
| `createdAt` / `updatedAt` | string (date-time) | Record timestamps (when available) |

**Example request (single-chain):**

```http
GET /v1.2/chain/tokens
Authorization: Bearer <access_token>
X-Blockchain-Id: 421614
```

**Example response (single-chain style):**

```json
[
  {
    "address": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
    "symbol": "EURe",
    "name": "Monerium EUR emoney",
    "decimals": 18,
    "blockchainId": "421614",
    "active": true
  }
]
```

**Example response (grouped multi-chain style):**

```json
[
  {
    "blockchainId": "100",
    "tokens": [
      {
        "address": "0x...",
        "symbol": "xDAI",
        "decimals": 18
      }
    ]
  },
  {
    "blockchainId": "421614",
    "tokens": [
      {
        "address": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
        "symbol": "EURe",
        "decimals": 18
      }
    ]
  }
]
```

**Error responses:**

- `401`: missing/invalid JWT.
- `500`: internal error.

**Notes:**

- This is a compatibility route that returns the **full token catalog** (all monitored tokens). Prefer `GET /v1.2/users/me/tokens` for user-facing integrations — it returns only tokens the user has interacted with.
- This endpoint serves token **configuration data**, not user balances.

---

## Recovery

Recovery has two parts: **reading status** (GET) and **enabling/cancelling recovery** (on-chain via Safes operations). There is **no dedicated endpoint to enable recovery for a Safe that is not yet deployed** (lazy mode). Enabling recovery is an on-chain operation and requires the Safe to already exist and be known to the API (the Safe must appear in the backend for the authenticated user and rpId).

### GET – Recovery status

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| GET | `/v1.2/recovery/status/:safeAddress` | JWT | **v1.2** |

**Path:** `safeAddress` – Safe address (EVM, case-insensitive).

**Headers:** `Authorization: Bearer <token>`, optional `X-Blockchain-Id` or `?blockchainId=` for chain scope.

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| `safeAddress` | string | The Safe address queried |
| `recoveryEnabled` | boolean | Whether recovery is enabled on-chain for this Safe |
| `recoveryAddress` | string \| null | Recovery module address if enabled |
| `delay` | number \| null | Recovery delay in seconds (if applicable) |
| `pendingRecovery` | boolean | Whether a recovery operation is pending (signed but not yet confirmed on-chain) |
| `canExecute` | boolean | Whether recovery can be executed now (currently always `false`) |
| `executeAfter` | string \| null | ISO timestamp after which recovery can be executed (if applicable) |
| `dataRecovery` | boolean | Whether recovery data exists in the IBEX Safe service |
| `pending` | array | Pending recovery operations (with `userOpHash`, `status`, `createdAt`, `updatedAt`) |
| `executed` | array | Executed recovery operations (with `userOpHash`, `transactionHash`, `status`, timestamps) |
| `userOpHash` | string \| null | Latest SafeOperation userOpHash for this Safe |
| `transactionHash` | string \| null | Latest transaction hash if executed |

**Example request:**
```http
GET /v1.2/recovery/status/0xd676c6188195372EC269E9C2cAf815C56436A679
Authorization: Bearer <access_token>
Host: app.ibex.fi
X-Blockchain-Id: 421614
```

- Request example (query fallback):
```
GET /api/v1.2/balances/0xabc...?blockchainId=421614
X-API-Key: <key>
```

---

## Administration & Configuration API

This section groups all endpoints under `/api/…` — blockchain configuration, pool/lending/swap management, and admin/DevTools tooling.

| Auth model | Routes | Description |
|------------|--------|-------------|
| **API_KEY** (`x-api-key`) | `/api/v1.2/config/*`, `/api/v1.2/pools`, `/api/v1.2/lending`, `/api/v1.2/check-transaction`, `/api/v1.2/swap/*` | Tenant configuration & monitoring |
| **HTTP Basic / admin session** | `/api/admin/*` | Admin UI, DevTools (KY, SEPA topup, crypto faucet) |

---

### Config

Endpoints under `/api/v1.2/config/*` require `X-Blockchain-Id` (or `?blockchainId=`). Unless stated otherwise, responses should include `blockchainId` in returned objects when applicable.

#### GET `/api/v1.2/config/addresses`
- Response: array of monitored addresses (scoped to `blockchainId`)

#### POST `/api/v1.2/config/addresses`
- Body: `{ address, issuer?, ibexid? }`
- Response: `{ message, address }` (address created for the selected `blockchainId`)

#### DELETE `/api/v1.2/config/addresses/:id`
- Response: `{ message }`

#### GET `/api/v1.2/config/tokens`
- Response: `Token[]` (scoped to `blockchainId`)
  - Each item includes optional `secondaryAddress` (alternate/updated token address if applicable) and `active` (boolean)
  - Header `X-Blockchain-Id` supported to scope results (e.g., `421614`)

Example response:
```json
[
  {
    "id": 1,
    "address": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
    "secondaryAddress": null,
    "active": true,
    "iconUrl": "https://app.ibex.fi/images/tokens/eure.png",
    "blockchainId": "421614",
    "symbol": "EURe",
    "name": "Monerium EURe (EURe)",
    "decimals": 18,
    "type": "stablecoin",
    "createdAt": "2025-10-17T12:34:56.000Z",
    "updatedAt": "2025-10-17T12:34:56.000Z"
  }
]
```

#### GET `/api/v1.2/config/tokens/symbol/:symbol`
- Response: same as above, filtered by `Token.symbol` (case-insensitive)
  - Header `X-Blockchain-Id` supported to scope results (e.g., `421614`)

#### GET `/api/v1.2/config/tokens/blockchain/:blockchainId`
- Response: same as above, filtered by `Token.blockchainId`
  - Header `X-Blockchain-Id` supported to scope results (e.g., `421614`)

#### GET `/api/v1.2/config/tokens/address/:address`
- Response: same as above, filtered by primary `Token.address` (lowercased)
  - Header `X-Blockchain-Id` supported to scope results (e.g., `421614`)

#### GET `/api/v1.2/config/tokens/secondary-address/:secondaryAddress`
- Response: same as above, filtered by `Token.secondaryAddress` (lowercased)
  - Header `X-Blockchain-Id` supported to scope results (e.g., `421614`)

#### POST `/api/v1.2/config/tokens`
- Body: `{ address, symbol, name?, decimals? }`
- Response: `{ message, token: Token }`

#### PUT `/api/v1.2/config/tokens/:id`
- Body: `{ symbol?, name?, decimals?, active? }`
- Response: `{ message, token: Token }`

#### DELETE `/api/v1.2/config/tokens/:id`
- Response: `{ message }`

### Config Tokens

Endpoints under `/api/v1.2/config/tokens/*` provide enhanced token listing with automatic grouping by `blockchainId` when the `X-Blockchain-Id` header is not provided.

#### Behavior
- **With `X-Blockchain-Id` header**: Returns a flat array of tokens for the specified blockchain (same as the per-chain flat list without grouping)
- **Without `X-Blockchain-Id` header**: Returns tokens grouped by `blockchainId` in the format `[{ blockchainId, tokens: [...] }]`
- **Token type**: The `type` field is returned in uppercase (e.g., `STABLECOIN_EUR`, `STABLECOIN_USD`, `OTHER`, `DAO`, `GAS`, `MEMECOIN`, `FAKE`, `BLOCKCHAIN`, `LOCAL`, `AAVE`, `WRAPPED`, `TEST`)

#### GET `/api/v1.2/config/tokens`
- Response format depends on header presence:
  - **With header**: `Token[]` (flat array, scoped to `blockchainId`)
  - **Without header**: `[{ blockchainId: string, tokens: Token[] }]` (grouped by blockchainId)

#### GET `/api/v1.2/config/tokens/symbol/:symbol`
- Response format depends on header presence (same behavior as `/api/v1.2/config/tokens`)
- Filters by `Token.symbol` (case-insensitive)

#### GET `/api/v1.2/config/tokens/blockchain/:blockchainId`
- Response format depends on header presence (same behavior as `/api/v1.2/config/tokens`)
- Filters by `Token.blockchainId` (path parameter)
- If `X-Blockchain-Id` header is provided, it must match the path parameter

#### GET `/api/v1.2/config/tokens/address/:address`
- Response format depends on header presence (same behavior as `/api/v1.2/config/tokens`)
- Filters by primary `Token.address` (lowercased)

#### GET `/api/v1.2/config/tokens/secondary-address/:secondaryAddress`
- Response format depends on header presence (same behavior as `/api/v1.2/config/tokens`)
- Filters by `Token.secondaryAddress` (lowercased)

#### Pools configuration

Endpoints under `/api/v1.2/config/pools/*` manage/read monitored protocol pools. The optional header `X-Blockchain-Id` scopes results to a specific chain (e.g., `421614`).

#### GET `/api/v1.2/config/pools`
- Response: list of pools with fields: `id`, `blockchainId`, `provider`, `addressesProvider`, `poolAddress`, `active`, timestamps
- Header `X-Blockchain-Id` supported

#### GET `/api/v1.2/config/pools/blockchain/:blockchainId`
- Response: same as above, filtered by `blockchainId`

#### GET `/api/v1.2/config/pools/provider/:provider`
- Response: same as above, filtered by `provider` (e.g., `AAVE`); supports `X-Blockchain-Id`

#### GET `/api/v1.2/config/pools/pool-address/:poolAddress`
- Response: same as above, filtered by `poolAddress` (0x...); supports `X-Blockchain-Id`

#### GET `/api/v1.2/config/pools/addresses-provider/:addressesProvider`
- Response: same as above, filtered by `addressesProvider` (0x...); supports `X-Blockchain-Id`

#### GET `/api/v1.2/config/pools/active/:active`
- Response: same as above, filtered by `active` (true|false); supports `X-Blockchain-Id`

#### Lending configuration

Endpoints under `/api/v1.2/config/lending/*` manage monitored lending pools. The optional header `X-Blockchain-Id` scopes results to a specific chain (e.g., `421614`).

#### GET `/api/v1.2/config/lending`
- Response: list of lendings with fields: `id`, `address`, `blockchainId`, `acceptedTokenAddresses` (array), `active`, timestamps
- Header `X-Blockchain-Id` supported

#### GET `/api/v1.2/config/lending/blockchain/:blockchainId`
- Response: same as above, filtered by `blockchainId`

#### GET `/api/v1.2/config/lending/address/:address`
- Response: same as above, filtered by `address` (0x...); supports `X-Blockchain-Id`

#### GET `/api/v1.2/config/lending/active/:active`
- Response: same as above, filtered by `active` (true|false); supports `X-Blockchain-Id`

#### POST `/api/v1.2/config/lending`
- Body: `{ address, acceptedTokenAddresses?: string[], active?: boolean }`
- Response: `{ message, lending }`

#### PUT `/api/v1.2/config/lending/:id`
- Body: any subset of `{ address, acceptedTokenAddresses, active }`
- Response: `{ message, lending }`

#### DELETE `/api/v1.2/config/lending/:id`
- Response: `{ message }`

#### GET `/api/v1.2/config/walletreconcilequeue`
- Query (optional): `status`, `address`, `page`, `limit`
- Response: `{ page, limit, total, data[] }` (scoped to `blockchainId`)

---

### Pools

#### GET `/api/v1.2/pools` (auth required)
- Returns active pools for the selected `blockchainId`.
- Required chain selector: header `X-Blockchain-Id: <id>` (or `?blockchainId=<id>`)
- Response: array of pool objects
- Fields: `{ id, blockchainId, provider, poolAddress?, addressesProvider?, metadata?, active, supplyToken?, borrowToken?, poolToken? }`
- Token objects (`supplyToken`, `borrowToken`, `poolToken`) resolve to the corresponding `Token` shape:
  - `{ address, symbol, name, decimals }`

Example:
```json
[
  {
    "id": 1,
    "blockchainId": "421614",
    "provider": "AAVE",
    "poolAddress": "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    "addressesProvider": "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A",
    "metadata": { "network": "arbitrum-sepolia", "version": "v3" },
    "active": true,
    "supplyToken": {
      "address": "0x...WBTC",
      "symbol": "WBTC",
      "name": "Wrapped BTC",
      "decimals": 8
    },
    "borrowToken": {
      "address": "0x...WBTC",
      "symbol": "WBTC",
      "name": "Wrapped BTC",
      "decimals": 8
    },
    "poolToken": {
      "address": "0x...aEthUSDC",
      "symbol": "aEthUSDC",
      "name": "Aave Arbitrum Sepolia USDC aToken",
      "decimals": 6
    }
  }
]
```

#### GET `/api/v1.2/pools/:address` (auth required)
- Goal: expose per‑provider pool balances and yields for a watched `:address`.
- Query (optional): `includeZero=true` — include items with zero balance.
- Required chain selector: header `X-Blockchain-Id: <id>` (or `?blockchainId=<id>`)
- Address must be watched; otherwise `404` is returned.
- Response: `{ timestamp, blockchainId, address, pools: [{ provider, items: [{ tokenAddress, symbol, decimals, baseBalance, currentBalance?, gain?, gainPct?, method?, apr?, apy? }] }] }`

Example:
```json
{
  "timestamp": "2025-06-02T13:30:45Z",
  "blockchainId": "421614",
  "address": "0xabc…",
  "pools": [
    {
      "provider": "AAVE",
      "items": [
        {
          "tokenAddress": "0xEURE…",
          "symbol": "EURE",
          "decimals": 18,
          "baseBalance": "100.0000",
          "currentBalance": "101.2345",
          "gain": "1.2345",
          "gainPct": 0.0123,
          "method": "ATOKEN_INDEX",
          "apr": 0.0456,
          "apy": 0.0467
        }
      ]
    }
  ]
}
```

---

### Lending

#### GET `/api/v1.2/lending` (auth required)
- Returns active lending entries for the selected `blockchainId`.
- Required chain selector: header `X-Blockchain-Id: <id>` (or `?blockchainId=<id>`)
- Response: array of lending objects
- Fields: `{ id, blockchainId, address, acceptedTokenAddresses?, active, createdAt, updatedAt }`

#### GET `/api/v1.2/lending/:address` (auth required)
- Returns one lending entry by `address` for the selected `blockchainId`.
- Required chain selector: header `X-Blockchain-Id: <id>` (or `?blockchainId=<id>`)
- Response: `{ id, blockchainId, address, acceptedTokenAddresses?, active, createdAt, updatedAt }`

#### GET `/api/v1.2/lending/name/:name` (auth required)
- Returns lending entries filtered by `name` (case-insensitive) on the selected `blockchainId`.

---

### Checks

#### POST `/api/v1.2/check-transaction`
- Purpose: verify a transaction exists and is consistent for the selected `blockchainId`.
- Body: `{ transactionHash }`
- Response: `{ blockchainId, exists, transaction? }`

---

### Swaps

#### POST `/api/v1.2/swap/order/create` (auth required)
- Purpose: start tracking a CoWSwap or 1INCH order and trigger an immediate status check.
- Body (required):
  - `safeAddress` (string, 0x…): owner address (must be a monitored address for the given chain)
  - `uid` (string): CoWSwap order UID (required when `provider=COWSWAP`, ignored for 1INCH)
  - `txHash` (string, 0x…): 1INCH swap transaction hash (required when `provider=1INCH`, ignored for COWSWAP)
  - `provider` (string): currently `COWSWAP` or `1INCH`
  - `blockchainId` (string): e.g., `100` for Gnosis
- Behavior:
  - Creates a swap tracking entry without initial `status` (nullable at creation)
  - Immediately fetches order and status from CoWSwap/1INCH and updates fields
- Response: `{ message, order }` where `order` is the refreshed DB row

Example:
```bash
curl -sS -k \
  -H "accept: application/json" \
  -H "x-api-key: <API_KEY>" \
  -X POST \
  -H "content-type: application/json" \
  -d '{
        "safeAddress": "0xfaA672C06e4aBDcB4a1513E9a31c3c498a321468",
        "uid": "0xd9c6...69069a35",
        "provider": "COWSWAP",
        "blockchainId": "100"
      }' \
  "https://<host>/api/v1.2/swap/order/create" | jq
```

Example response:
```json
{
  "message": "Monitored order created",
  "order": {
    "id": 1,
    "uid": "0xd9c6...69069a35",
    "blockchainId": "100",
    "safeAddress": "0xfaa672c06e4abdcb4a1513e9a31c3c498a321468",
    "provider": "COWSWAP",
    "status": "fulfilled",
    "type": "traded",
    "executedSell": "8999454",
    "executedBuy": "7704892248123160929",
    "surplus": "0",
    "lastCheckedAt": "2025-11-02T12:10:35.000Z",
    "createdAt": "2025-11-02T12:10:34.000Z",
    "updatedAt": "2025-11-02T12:10:35.000Z"
  }
}
```

Notes:
- If `safeAddress` is not monitored for the provided `blockchainId`, request is rejected (400).
- `status` is nullable on creation and set after the first CoWSwap/1INCH fetch.

#### GET `/api/v1.2/swap/order/:id` (auth required)
- Purpose: fetch one tracked order by UID or by txHash.
- Resolution logic: if `:id` matches `0x` + 64 hex → search by `txHash` (lowercased); otherwise → by `uid`.
- Response: swap tracking fields:
  - `{ id, uid?, txHash?, blockchainId, safeAddress, provider, status?, type?, executedSell?, executedBuy?, surplus?, statusPayload?, lastCheckedAt?, createdAt, updatedAt }`

---

### Admin & DevTools

Admin routes are under `/api/` (e.g. `/api/admin/cron/vars`, `/api/admin/cron/stats`, `/api/admin/cron/force`, etc.). Most routes require **HTTP Basic** (same credentials as the admin UI) **or** an `admin_session` cookie after `POST /api/admin/login`. Cron sub-routes may also accept a dedicated cron API key via `x-api-key`.

#### DevTools — KY (IBEXSAFE proxy)

These endpoints provide operational tooling around KY/KYB test flows and state management (list state, read state, force state, start KYC/KYB enrollment).

| Concern | Behaviour |
|---------|-----------|
| **Intended usage** | For admin operations and integration testing flows. Not part of the standard end-user API surface. |
| **Auth — browser / operator** | Same as other admin API calls: **Basic** auth and/or **admin session** cookie (after `POST /api/admin/login`). |
| **Auth — tenant (dApp server)** | Header **`x-api-key: <Domain.apiKey>`**. The API key maps to a tenant (`rpId`) and enforces tenant scoping (see below). |
| **Development localhost bypass** | On development deployments, all `/api/admin/devtools/*` endpoints also accept requests with explicit `rpId=localhost` (query/header `rpId` / `x-rpid` variants), without requiring admin Basic/session auth or a Domain API key. This is a local development-only bypass and forces DevTools tenant scope to `localhost`. |
| **Scoping (Domain API key)** | Client-facing identifier is **`externalUserId`**. The API resolves internal `userId` server-side before calling IBEXSAFE. For Domain key auth, **list** responses only include KY rows whose `user_id` is linked to at least one `ExternalUser` for that `rpId`. **Read / set state / enroll** require an `externalUserId` linked to the tenant; otherwise **404**. |
| **Tenant consistency requirement** | Do not mix tenants in the same test flow. The JWT issuer (`iss`), resolved `rpId`, `externalUserId`, and faucet source mapping must belong to the same tenant. Use hostname-form `rpId` only (for example `demobaas-prat1.ibex.fi`, **not** `https://demobaas-prat1.ibex.fi/`). |

**Base URL:** same host as the public API (e.g. `https://passkeys-prat1.ibex.fi`).

##### GET `/api/admin/devtools/ky/list`

Paginated list of KY dossiers.

**Query parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `page` | integer | `1` | Page number (≥ 1). |
| `limit` | integer | `20` | Page size (1–100). |

**Response (200):** `items[]`, `total`, `page`, `limit`, `totalPages`. Each item includes at least `user_id`, `entity_type`, `ky_state_id`, `ky_state_code`.

**Domain API key:** pages are aggregated (up to 15 × 100 rows), filtered to users belonging to the resolved `rpId`, then **re-paginated** using the requested `page` / `limit` (so `total` / `totalPages` reflect the filtered set).

##### GET `/api/admin/devtools/ky/state/:externalUserId`

Current KY state for one `externalUserId`.

**Path parameters**

| Name | Type | Description |
|------|------|-------------|
| `externalUserId` | string | External user identifier (URL-encoded if needed). |

**Response (200):** JSON (for example `state`, `kyStateCode`, `allowedStates`, …).

**Errors:**
- `404` if `externalUserId` is unknown or (with Domain key) not in tenant.
- `404` outside development deployments because DevTools routes are disabled.

##### POST `/api/admin/devtools/ky/state`

Force KY state transition.

**Headers:** `Content-Type: application/json`

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | string | Yes | External user identifier whose KY state should change. |
| `newStateId` | integer | Yes | One of: `2` (submitted), `3` (additional info), `4` (rejected), `5` (accepted), `22` (signature requested), `23` (signature received), `55` (temporary block). |
| `entityType` | string | Conditional | Required when `newStateId=5` and entity type is missing. Allowed values: `individual`, `company`. |
| `firstName` | string | Conditional | Required for `entityType=individual` when `newStateId=5` and first name is missing. |
| `lastName` | string | Conditional | Required for `entityType=individual` when `newStateId=5` and last name is missing. |
| `companyName` | string | Conditional | Required for `entityType=company` when `newStateId=5` and company name is missing. |

When forcing `newStateId=5`, the endpoint forwards identity enrichment fields to IBEXSAFE to satisfy accepted-state prerequisites used by IBAN provisioning.

**Response (200):** JSON (for example `success`, `fromStateId`, `toStateId`, …).

**Errors:**
- `400` invalid payload (`newStateId`, conditional identity fields when forcing `newStateId=5`).
- `404` unknown `externalUserId` (or not in tenant with Domain key).
- `404` outside development deployments.

**Example (curl, Domain API key — development API only)**

```http
POST /api/admin/devtools/ky/state
Host: passkeys-prat1.ibex.fi
Content-Type: application/json
x-api-key: <Domain.apiKey for your rpId>

{"externalUserId":"YOUR_EXTERNAL_USER_ID","newStateId":5,"entityType":"individual","firstName":"John","lastName":"Doe"}
```

##### POST `/api/admin/devtools/ky/enroll`

Create a KYC session through admin DevTools.

**Headers:** `Content-Type: application/json`

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | string | Yes | External user identifier. |
| `language` | string | No | Preferred language (`en`, `fr`, ...). |
| `email` | string | No | User e-mail. |
| `trustedEmail` | boolean | No | Optional trusted flag. |
| `rpId` | string | No | Forwarded as provided unless Domain API key auth is used (then forced to tenant `rpId`). |
| `data` | object | No | Additional payload. |

**Response (200):** KYC response (typically includes `sessionId`, `chatbotURL`, `chatbotFullURL`, ...). **404** if `externalUserId` is not found (or not linked to tenant with Domain API key).

##### POST `/api/admin/devtools/kyb/enroll`

Create a KYB enrollment through admin DevTools.

**Headers:** `Content-Type: application/json`

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | string | Yes | External user identifier. |
| `email` | string | Yes | Contact e-mail for KYB flow. |
| `companyRegistrationNumber` | string | Yes | Company identifier (e.g. SIREN). |
| `submit` | boolean | No | Not supported on this endpoint. |
| `idDocumentPage1` | string | No | Base64 data URL of first ID page. |
| `idDocumentPage2` | string | No | Base64 data URL of second ID page. |
| `rpId` | string | No | Forwarded as provided unless Domain API key auth is used (then forced to tenant `rpId`). |
| `returnUrl` | string | No | Return URL for deferred flow. |

**Response (200):** KYB session response (typically `pending_submit` or `pending_id_document` with `sessionId`/`chatbotFullURL`). **404** if `externalUserId` is not found (or not linked to tenant with Domain API key).

##### POST `/api/admin/devtools/ky/sms-verified`

Manually set SMS verification data for a user without sending a real SMS. Useful for testing flows that require SMS verification (`requireSmsVerification: true` on KY session).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | string | Yes | External user identifier. |
| `smsVerifiedTelephone` | string | Conditional | Phone number (normalized to E.164). At least one of `smsVerifiedTelephone` or `smsVerifiedAt` is required. |
| `smsVerifiedAt` | string | Conditional | ISO timestamp. Defaults to `now` when only `smsVerifiedTelephone` is provided. |

**Response (200):**

```json
{
  "success": true,
  "kyCustomerId": 42,
  "smsVerifiedTelephone": "+33612345678",
  "smsVerifiedAt": "2026-05-18T15:00:00.000Z"
}
```

**Error Responses:** `400` missing fields or invalid phone/date. `404` KY customer not found or `externalUserId` not linked to tenant.

##### POST `/api/admin/devtools/company/check`

Performs a quick KYB eligibility pre-check on a French SIREN number without creating any record.
Looks up the company via INPI and Recherche Entreprises, screens all representatives and beneficial owners against sanctions lists (OpenSanctions) and French PEP databases, computes a KYB risk score, and returns structured company data.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `siren` | string | Yes | French SIREN number (exactly 9 digits, pattern `^\d{9}$`). |

**Example request:**

```http
POST /api/admin/devtools/company/check
Host: passkeys-prat1.ibex.fi
Content-Type: application/json
x-api-key: <Domain.apiKey>

{
  "siren": "443061841"
}
```

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| `existence` | object | Source availability flags (`exists`, `inpi`, `rechercheEntreprises`) |
| `companyName` | string \| null | Company legal name |
| `companyRegistrationNumber` | string \| null | SIREN (9 digits) |
| `siret` | string \| null | SIRET when available |
| `companyRegistrationDate` | string \| null | Registration/creation date |
| `companyType` | string \| null | Mapped legal form |
| `naf` | string \| null | NAF/APE code |
| `address` | string \| null | Registered address |
| `postalCode` | string \| null | Registered postal code |
| `city` | string \| null | Registered city |
| `companyInseeCityCode` | string \| null | INSEE city code |
| `representatives` | array | Company representatives/directors (with `opensanctionsResult` and `ppeResult` screening) |
| `beneficiairesEffectifs` | array | Beneficial owners when available from INPI (with screening) |

```json
{
  "existence": {
    "exists": true,
    "inpi": true,
    "rechercheEntreprises": true
  },
  "companyName": "GOOGLE FRANCE",
  "companyRegistrationNumber": "443061841",
  "siret": "44306184100047",
  "companyRegistrationDate": "2002-08-14",
  "companyType": "Société à responsabilité limitée (sans autre indication)",
  "naf": "62.02A",
  "address": "8 RUE DE LONDRES 75009 PARIS 9E ARRONDISSEMENT",
  "postalCode": "75009",
  "city": "PARIS 9E ARRONDISSEMENT",
  "companyInseeCityCode": "75109",
  "representatives": [
    {
      "source": "inpi",
      "type": "personne physique",
      "firstName": "PAUL",
      "lastName": "Manicle",
      "fullName": "PAUL Manicle",
      "role": "Gérant",
      "secondRole": null,
      "birthDate": "1975-10",
      "opensanctionsResult": { "count": 0, "results": [] },
      "ppeResult": { "is_elu": false, "total_mandats": 0, "results": [] }
    }
  ],
  "beneficiairesEffectifs": [
    {
      "type": "personne physique",
      "firstName": "Larry",
      "lastName": "PAGE",
      "fullName": "Larry PAGE",
      "birthDate": "1972-12-12",
      "nationalityCode": "USA",
      "birthCountry": "ETATS-UNIS",
      "birthPlace": "Michigan",
      "address": {
        "street": "171 Main Street Apt #282",
        "postalCode": null,
        "city": "Los Altos, Californie 94022",
        "country": "ÉTATS-UNIS"
      },
      "detentionCapitalPct": 0,
      "detentionDroitDeVotePct": 27.2,
      "opensanctionsResult": { "count": 0, "results": [] },
      "ppeResult": { "is_elu": false, "total_mandats": 0, "results": [] }
    }
  ]
}
```

**Error Responses:**

| Code | Condition | Example message |
|------|-----------|-----------------|
| `400` | Missing or invalid SIREN (not 9 digits) | `"siren must be exactly 9 digits"` |
| `400` | Company not found for this SIREN | `"Entreprise introuvable pour ce SIREN"` |
| `400` | Company is inactive (cessée) | `"Entreprise cessée"` |
| `401` | Invalid or missing API key / admin auth | `"bad key"`, `"Unauthorized"` |
| `404` | Endpoint called outside development deployments | `"Not Found"` |

##### POST `/api/admin/devtools/sepa/topup`

Development-only helper to trigger a direct SEPA payment topup without the user passkey approval flow.

This endpoint:
- only works on development deployments (otherwise returns `404 Not Found`);
- selects one configured faucet source pair at random;
- resolves source identity from DB;
- calls the SEPA payments service directly and bypasses the app-level POST/PUT passkey approval flow.

**Headers:** `Content-Type: application/json`

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetIban` | string | Yes | Beneficiary IBAN to top up. |
| `targetName` | string | No | Beneficiary name (default: `IBEX User`). |
| `amount` | string | No | Payment amount as string. |
| `amountEur` | integer | No | Payment amount as integer EUR. If both `amount` and `amountEur` are missing, default is `1`. |
| `channel` | string | No | `SEPA` (default) or `SEPAINSTANT`. |
| `remittanceInfo` | string | No | Remittance information (default: `IBEX DevTools SEPA topup`). |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "source": {
      "slot": 3,
      "suffix": "03",
      "sourceIban": "FR7630001007941234567890185",
      "safeAddress": "0xAbCdEf0123456789abcdef0123456789ABCDEF01"
    },
    "identity": {
      "externalUserId": "user_ext_abc123",
      "rpId": "passkeys-prat1.ibex.fi"
    },
    "payment": {
      "success": true,
      "data": {
        "transactionId": "..."
      }
    }
  }
}
```

Possible errors:
- `404` when not in development mode;
- `400` when no valid faucet source slot is configured or `targetIban` is missing;
- `404` when no identity can be resolved for configured source slots;
- `429` when the SEPA faucet program is disabled;
- `500` when payment call fails.

##### POST `/api/admin/devtools/crypto/topup`

Development-only helper to trigger a crypto faucet topup for a user wallet.

Behavior notes:
- DevTools picks one token from the configured faucet token catalog and one amount using faucet randomization rules.
- Candidate wallets include Safe wallets on faucet chain scope and signer-derived EOA addresses.
- If `wallet` is omitted and multiple candidates exist, the endpoint rejects (`400`) to avoid ambiguity.

**Headers:** `Content-Type: application/json`

**Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `externalUserId` | string | Yes | Target user external identifier. |
| `wallet` | string | No | Wallet address to top up. Required when the user has multiple eligible wallets. |

**Response (200):** faucet topup result including selected wallet, token, amount, and `txHash`.

Possible errors:
- `404` when not in development mode;
- `429` when crypto faucet program is disabled;
- `400` when `externalUserId` is missing/invalid, when `wallet` format is invalid, or when `wallet` is required (ambiguous user wallets);
- `404` when `externalUserId` is unknown for the current tenant or when no eligible wallet is found;
- `500` on transfer failure.

##### DevTools roundtrip test data (FIAT + CRYPTO)

Use this checklist for an end-to-end "fund -> user action -> return to faucet" test.

**1) Keep tenant/rpId consistent**
- Use one tenant only for the full flow (`demobaas-prat1.ibex.fi` **or** another tenant, but never mixed).
- Use hostname-form rpId (`demobaas-prat1.ibex.fi`), not URL form.

**2) Gather user-side targets**
- **User FIAT target:** `GET /v1.2/users/me/ibans`
  - pick `iban`, `bic`, `holderName`.
- **User CRYPTO target:** `GET /v1.2/users/me/address`
  - pick `safeAddress` on target chain (for example chain `421614`).

**3) Gather faucet-side source/return addresses**
- Use explicit faucet coordinates (example currently used for demobaas-prat1/testnet flows):
  - `tenantRpId`: `demobaas-prat1.ibex.fi`
  - `chainId`: `421614`
  - `faucetIban`: `FR7616748000014733062059352`
  - `faucetBic`: `BUMDFRP2`
  - `faucetHolderName`: `IBEX Faucet 01`
  - `faucetWallet`: `0x0795239e54A9b6f97413cA84688f7a93b9A0640e`
- Faucet token catalog (same chain, explicit values):
  - `EUR-IBEX` -> `0x18e632ae0704ab92cf4f49472b583498ff5258cc` (`18`)
  - `USD-IBEX` -> `0x5a0fc8a0d0d4aabc4506dc348d1dd9258ce78f4d` (`18`)
  - `GBP-IBEX` -> `0xcef99a37939d4db1adbc89d4d2f62913557d592d` (`18`)
  - `CHF-IBEX` -> `0x69ebf0518202681e27480e9cd0cdd576c8157a40` (`18`)
  - `BTC-IBEX` -> `0xb21ef1146d0cba9d4ad0d5494731bfc0b8ef7637` (`8`)
  - `ETH-IBEX` -> `0x12bfd5e8b232f8067976a6238f29864cb440c12d` (`18`)
  - `XAU-IBEX` -> `0xd04041a2b7cd12dc0e34ca974cdd3afbde70c6f7` (`18`)
  - `JPY-IBEX` -> `0x9f52564b705d2c415987cd1458efd04da165de86` (`18`)
  - `CAD-IBEX` -> `0x551acb8977ef83849aa61aa3f823fd69029c4ac3` (`18`)
  - `AUD-IBEX` -> `0x878fc5582e7cdf95485f36038e3f72b9b1d0f791` (`18`)

**4) Recommended test tuple to record**

| Field | Example source |
|------|----------------|
| `tenantRpId` | `demobaas-prat1.ibex.fi` |
| `chainId` | `421614` |
| `userExternalUserId` | JWT `sub` |
| `userIban` | `GET /v1.2/users/me/ibans` |
| `userBic` | `GET /v1.2/users/me/ibans` |
| `userHolderName` | `GET /v1.2/users/me/ibans` |
| `userWallet` | `GET /v1.2/users/me/address` |
| `faucetIban` | `FR7616748000014733062059352` |
| `faucetBic` | `BUMDFRP2` |
| `faucetHolderName` | `IBEX Faucet 01` |
| `faucetWallet` | `0x0795239e54A9b6f97413cA84688f7a93b9A0640e` |

**5) Typical roundtrip sequence**
- `POST /api/admin/devtools/sepa/topup` (`targetIban=userIban`)
- `POST /api/admin/devtools/crypto/topup` (`externalUserId` + optional explicit `wallet`)
- User sends FIAT back to faucet IBAN via standard `/v1.2/sepa/payments` flow
- User sends CRYPTO back to faucet wallet via Safe operation flow

---

## Safes operations

Safe operations endpoints live under `/v1.2/safes/…` and implement wallet operations through Safe Global smart contract wallets.

### POST `/v1.2/safes/operations` (auth required)
- **Purpose**: request one or several Safe transactions to be prepared and signed/executed by the wallet.
- **Authentication**: JWT
- **Tags**: EXTERNAL, Blockchain
- **Body**:
  - `safeAddress` (string, 0x…): Safe owner address
  - `walletMode?` (string): execution mode override
    - `SAFE_4337`: default account-abstraction flow (UserOperation relayed via bundler)
    - `EOA_7702`: delegated EOA execution flow (EIP-7702)
    - if omitted, backend uses signer default mode
  - `eoaKeySelection?` (object, EOA_7702 only): optional key selector for delegated execution
    - `family`: currently `"EVM"` only
    - `index`: integer `>= 0`
    - `safeAddress?`: if provided, selects a per-safe derived key for that Safe (must match the operation Safe)
  - `operations` (array): list of operation objects (see types below)
  - `signerId?` (string): optional signer identifier
  - `chainId?` (number): optional EVM chain id. If omitted, server uses its default configured chain.

- **Supported operation types**:
  - **TRANSFER_EURe** (existing, unchanged for backward compatibility)
    - Shape: `{ type: "TRANSFER_EURe", to: 0x…, amount: "<human>" }`
    - Behavior: resolves EURe token for the target chain and builds an ERC20 `transfer(to, amount)`.
  - **TRANSFER_TOKEN** (generic token transfer — ERC20 & native)
    - Shape: `{ type: "TRANSFER_TOKEN", tokenAddress: "0x…", to: "0x…", amount: "<human>", decimals?: <number> }`
    - Chain selection: `chainId` from request body (falls back to server default)
    - **ERC20 tokens**: server verifies that the token exists and is active on the selected chain, then builds an ERC20 `transfer(to, amount)` call.
    - **Native tokens (ETH, xDAI, etc.)**: use the EVM sentinel address `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` or `0x0000000000000000000000000000000000000000` as `tokenAddress`. The server detects this and builds a simple value transfer (`{ to, value, data: '0x' }`) instead of an ERC20 call. Native detection also works when token metadata indicates `type: 'NATIVE'`.
    - `decimals` is optional: auto-resolved by the backend if omitted (fallback to 18).
    - **Solana chains** (chainId `900`/`901`): uses a 2-step workflow. Step 1 (POST): the server prepares the Solana transaction (native SOL via `SystemProgram.transfer` or SPL token via `createTransferInstruction`), sends it to the fee payer, and returns a WebAuthn challenge. Step 2 (PUT): user signs with passkey, server completes the Solana transaction. For native SOL, use token address `So11111111111111111111111111111111111111111` or `So11111111111111111111111111111111111111112`.
  - **MONERIUM_CREATE_IBAN**
    - Shape: `{ "type": "MONERIUM_CREATE_IBAN" }`
  - **MONERIUM_WITHDRAW_EURe**
    - Shape: `{ "type": "MONERIUM_WITHDRAW_EURe", "to": "<IBAN>", "amount": "<human>", "label": "<string>", "recipientInfo": { "firstName": "<string>", "lastName": "<string>", "country": "<string>" } }`
  - **SIGN_MESSAGE**
    - Shape: `{ "type": "SIGN_MESSAGE", "message": "<string>" }`
  - **ENABLE_RECOVERY**
    - Shape: `{ "type": "ENABLE_RECOVERY", "newOwners": ["0x..."], "threshold": 1, "firstName": "<string>", "lastName": "<string>", "birthDate": "YYYY-MM-DD", "birthCity": "<string>", "birthCountry": "<string>" }`
  - **CANCEL_RECOVERY**
    - Shape: `{ "type": "CANCEL_RECOVERY" }`
  - **AAVE_SUPPLY**
    - Shape (one of):
      - `{ "type": "AAVE_SUPPLY", "amount": "<human>", "assetTicker": "<string>" }`
      - `{ "type": "AAVE_SUPPLY", "amount": "<human>", "tokenAddress": "0x…", "decimals": <number> }`
    - Optional: `referralCode` (number 0..65535)
    - Pool resolution: via `/api/v1.2/config/pools` for the selected chain; optional fallback `poolAddress: 0x…`
  - **AAVE_WITHDRAW**
    - Shape (one of):
      - `{ "type": "AAVE_WITHDRAW", "amount": "<human>", "assetTicker": "<string>" }`
      - `{ "type": "AAVE_WITHDRAW", "amount": "<human>", "tokenAddress": "0x…", "decimals": <number> }`
    - Pool resolution: via `/api/v1.2/config/pools` for the selected chain; optional fallback `poolAddress: 0x…`
  - **MORPHO_SUPPLY**
    - Shape (one of):
      - `{ "type": "MORPHO_SUPPLY", "amount": "<human>", "assetTicker": "<string>" }`
      - `{ "type": "MORPHO_SUPPLY", "amount": "<human>", "tokenAddress": "0x…", "decimals": <number> }`
    - Vault resolution: via `/api/v1.2/config/pools?provider=MORPHO` for the selected chain; optional override `vaultAddress: 0x…`
    - On-chain: `approve(vaultAddress, amount)` + ERC-4626 `deposit(amount, safeAddress)`
  - **MORPHO_WITHDRAW**
    - Shape – by shares (recommended for full exit):
      - `{ "type": "MORPHO_WITHDRAW", "shares": "<bigint-string>", "vaultAddress": "0x…" }`
    - Shape – by asset amount (partial withdrawal):
      - `{ "type": "MORPHO_WITHDRAW", "amount": "<human>", "assetTicker": "<string>" }`
      - `{ "type": "MORPHO_WITHDRAW", "amount": "<human>", "tokenAddress": "0x…", "decimals": <number> }`
    - Vault resolution: via `/api/v1.2/config/pools?provider=MORPHO` for the selected chain; optional override `vaultAddress: 0x…`
    - On-chain: ERC-4626 `redeem(shares, safe, safe)` or `withdraw(amount, safe, safe)`
  - **SWAP_FROM_QUOTE**
    - Shape: `{ "type": "SWAP_FROM_QUOTE", "quoteId": "<string>" }`
  - **ROUTE_FROM_QUOTE**
    - Shape: `{ "type": "ROUTE_FROM_QUOTE", "quoteId": "<routeId>" }`
    - Notes: Executes unified route quotes created by `POST /v1.2/safes/routes/quote` (same-chain swap or cross-chain bridge).
  - **BITCOIN_SEND** (non-EVM, special-case)
    - Shape: `{ "type": "BITCOIN_SEND", "from": "<btc-address>", "to": "<btc-address>", "amountSat": <number>, "network": "testnet"|"mainnet", "sendAll": false, "feeProfile": "standard"|"slow"|"fast", "externalFeeSponsor": false }`
    - Behavior: builds a Bitcoin transaction using UTXO selection. The server fetches UTXOs from `/v1.2/safes/bitcoin/utxos` and fee rates from `/v1.2/safes/bitcoin/fees`, estimates vbytes, and constructs inputs/outputs with change.
    - `from` (required): sender Bitcoin address (user's derived BTC wallet).
    - `amountSat` (required if `sendAll=false`): amount in satoshis.
    - `sendAll` (optional, default `false`): if `true`, sends entire balance minus fees.
    - `feeProfile` (optional, default `standard`): fee rate profile (`slow`, `standard`, `fast`).
    - `externalFeeSponsor` (optional, default `false`): if `true`, fees are paid externally (not deducted from user balance).
    - Response includes `prepared` with: `from`, `to`, `amountSat`, `feeSat`, `inputsUsed`, `outputs`, `change`, `network`, `sponsorShortfallSat`.
  - **HYPERLIQUID_ENTER_VAULT** (server-side, post-execution)
    - Shape: `{ "type": "HYPERLIQUID_ENTER_VAULT", "hyperliquidData": { "action": "ENTER_VAULT", "amount": <number> } }`
    - Behavior: after the Safe operation is executed on-chain, the server calls the Hyperliquid API to enter a vault with the specified amount, using server-side Hyperliquid credentials and configured vault routing.
    - Note: not supported in batch mode (throws `NOT_IMPLEMENTED` if used in `batch-intent`).
  - **HYPERLIQUID_WITHDRAW_VAULT** (server-side, post-execution)
    - Shape: `{ "type": "HYPERLIQUID_WITHDRAW_VAULT", "hyperliquidData": { "action": "WITHDRAW", "amount": <number> } }`
    - Behavior: after execution, calls Hyperliquid API to exit a vault with the specified amount.
    - Note: not supported in batch mode.
  - **HYPERLIQUID_WITHDRAW** (server-side, post-execution)
    - Shape: `{ "type": "HYPERLIQUID_WITHDRAW", "hyperliquidData": { "action": "WITHDRAW_WALLET", "to": "0x…", "amount": <number> } }`
    - Behavior: after execution, calls Hyperliquid API to withdraw funds to the specified wallet address.
    - Note: not supported in batch mode.
  - **HYPERLIQUID_DEPOSIT** (server-side, post-execution)
    - Shape: `{ "type": "HYPERLIQUID_DEPOSIT", "hyperliquidData": { "action": "DEPOSIT", "amount": <number> } }`
    - Behavior: after execution, calls Hyperliquid API to deposit USDC via the configured bridge contract on the target chain.
    - Note: not supported in batch mode.

- **Example request (TRANSFER_TOKEN — ERC20)**:
```json
{
  "safeAddress": "0xSAFE000000000000000000000000000000000000",
  "walletMode": "SAFE_4337",
  "chainId": 421614,
  "operations": [
    {
      "type": "TRANSFER_TOKEN",
      "tokenAddress": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
      "to": "0xDEST000000000000000000000000000000000000",
      "amount": "1.23"
    }
  ]
}
```

- **Example request (TRANSFER_TOKEN — EOA_7702 with global derived EVM key index 1)**:
```json
{
  "safeAddress": "0xSAFE000000000000000000000000000000000000",
  "walletMode": "EOA_7702",
  "eoaKeySelection": {
    "family": "EVM",
    "index": 1
  },
  "chainId": 100,
  "operations": [
    {
      "type": "TRANSFER_TOKEN",
      "tokenAddress": "0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0",
      "to": "0xDEST000000000000000000000000000000000000",
      "amount": "0.01"
    }
  ]
}
```

- **Example request (TRANSFER_TOKEN — Native xDAI on Gnosis chain 100)**:
```json
{
  "safeAddress": "0xSAFE000000000000000000000000000000000000",
  "chainId": 100,
  "operations": [
    {
      "type": "TRANSFER_TOKEN",
      "tokenAddress": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      "to": "0xDEST000000000000000000000000000000000000",
      "amount": "0.5",
      "decimals": 18
    }
  ]
}
```

- **Example request (BITCOIN_SEND)**:
```json
{
  "safeAddress": "0xSAFE000000000000000000000000000000000000",
  "operations": [
    {
      "type": "BITCOIN_SEND",
      "from": "tb1q...",
      "to": "tb1q...",
      "amountSat": 50000,
      "network": "testnet",
      "feeProfile": "standard"
    }
  ]
}
```

- **Example request (HYPERLIQUID_DEPOSIT)**:
```json
{
  "safeAddress": "0xSAFE000000000000000000000000000000000000",
  "chainId": 421614,
  "operations": [
    {
      "type": "HYPERLIQUID_DEPOSIT",
      "hyperliquidData": {
        "action": "DEPOSIT",
        "amount": 100
      }
    }
  ]
}
```

- **Example response (POST /v1.2/safes/operations)**:
```json
{
  "batchId": "c559ddd07fe211fe3b34cbe7",
  "expiresAt": "2025-11-24T00:56:49.225Z",
  "credentialRequestOptions": {
    "rpId": "ibex.fi",
    "challenge": "HES8DdwboMB9vI0fHt_WtkZuHa67KMYKbDKSnyfT1lE",
    "allowCredentials": [
      {
        "id": "_BSUV-JB3OahXllQtfdssAY03gZOnBAH60-6_0DPJGU",
        "type": "public-key"
      }
    ],
    "timeout": 60000,
    "userVerification": "required"
  }
}
```

- **Example response (PUT /v1.2/safes/operations, SAFE_4337)**:
```json
{
  "userOpHash": "0x6cdab85147c3472499aa9859e1af51844d853f098d57ca14baf977a83c6f7400"
}
```

- **Example response (PUT /v1.2/safes/operations, EOA_7702)**:
```json
{
  "userOpHash": "0x3b3f23afd9429b1804aa76cf249b721cc1a5880a1bda115b4f50ea684dc0c8f6",
  "success": true,
  "txHash": "0x455b306f80751d014b7886e762475de86cd0b8d50294f30f8469758cab5cdeda",
  "walletMode": "EOA_7702"
}
```

- **Notes**:
  - **Backward compatibility**: `TRANSFER_EURe` remains available and unchanged.
  - The chain must be selected via header `X-Blockchain-Id` or query `?blockchainId=`; the server passes the selected chain id when validating the token.
  - If token is not found or `active=false`, the request is rejected (4xx).

### PUT `/v1.2/safes/operations` (auth required)
- **Purpose**: Submit WebAuthn credential to finalize Safe operation (4337 or 7702 depending on prepared intent)
- **Authentication**: JWT
- **Tags**: EXTERNAL, Blockchain
- **Request body**:
```json
{
  "credential": {
    "id": "AVZs0qRCBSmfThZWu37g...",
    "rawId": "AVZs0qRCBSmfThZWu37g...",
    "type": "public-key",
    "response": {
      "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4/krrmihjLHmVzzuoMdl2MFAAAAAQ...",
      "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoi...",
      "signature": "MEUCIQC..."
    }
  }
}
```

### GET `/v1.2/safes/operations/:userOpHash/status` (auth required)
- **Purpose**: Check the status of a Safe operation via its operation hash
- **Authentication**: JWT
- **Tags**: EXTERNAL, Blockchain
- **Path parameters**:
  - `userOpHash` (string, required): Operation hash returned by `PUT /v1.2/safes/operations` or `PUT /v1.2/safes/operations/batch-execute` (4337 userOpHash or 7702 operation hash key).

- **200 Response**:
```json
{
  "userOpHash": "0x2ef4b34e62fad41fcf91b8a3f5bd4bb0f6d3ad56be2fb8217849e471b7ba0b16",
  "safeAddress": "0xA0C2503b722DF36e638323A139cd6961f3Ced151",
  "chainId": 100,
  "status": "CONFIRMED",
  "transactionHash": "0x789...abc",
  "createdAt": "2025-01-15T10:30:00.000Z",
  "updatedAt": "2025-01-15T10:35:00.000Z",
  "operations": [
    { "index": 0, "type": "TRANSFER_TOKEN" }
  ],
  "error": null
}
```

- **Response fields**:
  - `userOpHash` (string): UserOperation hash (4337).
  - `safeAddress` (string): Associated Safe address.
  - `chainId` (number): Blockchain ID.
  - `status` (string): Operation status. Possible values:
    - `CREATED`: Operation created but not signed.
    - `SIGNED`: Operation signed but not executed.
    - `EXECUTED`: Operation executed on-chain.
    - `CONFIRMED`: Operation confirmed with enough blocks (may be set asynchronously by a worker).
    - `FAILED`: Execution failed.
  - `transactionHash` (string, nullable): On-chain transaction hash. Present only when the operation has been executed on-chain.
  - `createdAt` (string): Operation creation date (ISO 8601).
  - `updatedAt` (string): Last operation update date (ISO 8601).
  - `operations` (array): List of operations included in this SafeOperation, with their index and type.
  - `error` (object, nullable): Error details when `status=FAILED`.

---

## Multioperation & Batch Operations

The multioperation feature allows grouping multiple Safe operations into a single transaction using MultiSend, reducing gas costs and improving user experience by requiring only one WebAuthn authentication for multiple operations.

### Batch Operations (Intent & Execute)

#### POST `/v1.2/safes/operations/batch-intent` (auth required)
- **Purpose**: Prepare a batch of multiple Safe operations to be executed atomically with a single WebAuthn authentication (supports SAFE_4337 and EOA_7702).
- **Authentication**: JWT
- **Tags**: EXTERNAL, Blockchain
- **Description**: Builds a batch of heterogeneous Safe operations into a single MultiSend transaction. The endpoint freezes the operations (order preserved) and returns a `batchId`, an expiration timestamp, and WebAuthn `credentialRequestOptions` (challenge bound to the prepared operation hash for the selected wallet mode). It does not execute anything; use `PUT /v1.2/safes/operations/batch-execute` to submit the WebAuthn `credential`.

- **Request body**:
  - `safeAddress` (string, required): Safe address (EVM format, e.g., `0x...`).
  - `walletMode` (string, optional): `SAFE_4337` or `EOA_7702` (if omitted, signer default is used).
  - `eoaKeySelection` (object, optional, EOA_7702 only): same selector as `POST /v1.2/safes/operations` (`family`, `index`, optional `safeAddress`).
  - `chainId` (number, optional): Target blockchain ID. If omitted, server uses its default configured chain.
  - `idempotencyKey` (string, optional): Client-provided idempotency key to avoid duplicate batch creation.
  - `options` (object, optional):
    - `atomic` (boolean, default `true`): If `true`, all operations in the batch must succeed; if any fails, the entire batch is reverted.
    - `autoApprove` (boolean, default `true`): Automatically insert required ERC20 approvals before token transfers.
    - `ttlSec` (number, default `300`): Time-to-live in seconds for the intent and any frozen quotes. Range: 60-3600 seconds.
    - `reorder` (boolean, default `false`): Preserve the exact client order (recommended: `false` to maintain order).
  - `operations` (array, required, min 1): Array of operation objects. Same elementary operations as supported by `POST /v1.2/safes/operations`:
    - `TRANSFER_EURe`, `TRANSFER_TOKEN` (ERC20, native, or Solana)
    - `MONERIUM_CREATE_IBAN`, `MONERIUM_WITHDRAW_EURe`
    - `SIGN_MESSAGE`
    - `ENABLE_RECOVERY`, `CANCEL_RECOVERY`
    - `AAVE_SUPPLY`, `AAVE_WITHDRAW`
    - `MORPHO_SUPPLY`, `MORPHO_WITHDRAW`
    - `SWAP_FROM_QUOTE`
    - `BITCOIN_SEND` (non-EVM, special-case — handled outside MultiSend)
    - `HYPERLIQUID_ENTER_VAULT`, `HYPERLIQUID_WITHDRAW_VAULT`, `HYPERLIQUID_WITHDRAW`, `HYPERLIQUID_DEPOSIT` (⚠️ not yet supported in batch mode, will throw `NOT_IMPLEMENTED`)
    - If at least one `SWAP_FROM_QUOTE` is present, you must supply either a server-issued `quoteId` (pre-frozen) or explicit execution parameters (`aggregator`, `calldata`, `minOut`, `deadline`). The server validates and freezes quotes/constraints at intent time.

- **200 Response**:
```json
{
  "batchId": "b-7890abcdef123456",
  "expiresAt": "2025-11-08T12:00:00.000Z",
  "credentialRequestOptions": {
    "rpId": "ibex.fi",
    "challenge": "<base64url-encoded-challenge>",
    "timeout": 60000,
    "allowCredentials": [
      {
        "id": "<base64url-encoded-credential-id>",
        "type": "public-key"
      }
    ],
    "userVerification": "preferred",
    "extensions": {
      "credProps": true,
      "uvm": true
    },
    "data": {
      "userOpHash": "0x..."
    }
  }
}
```

- **Example request** (two TRANSFER_EURe and one SWAP_FROM_QUOTE):
```json
{
  "safeAddress": "0xA0C2503b722DF36e638323A139cd6961f3Ced151",
  "chainId": 100,
  "idempotencyKey": "client-req-2025-11-08-001",
  "options": {
    "atomic": true,
    "autoApprove": true,
    "ttlSec": 300,
    "reorder": false
  },
  "operations": [
    {
      "type": "TRANSFER_EURe",
      "to": "0x45e097ec63cea4b301ab7288bd5ec4e2f6679d6b",
      "amount": "50.00"
    },
    {
      "type": "SWAP_FROM_QUOTE",
      "quoteId": "q-17fe72b1b1d44f4db7f5"
    },
    {
      "type": "TRANSFER_EURe",
      "to": "0x9E8f0F6dF7dD6bB6aB8B5A2f1E0C8E20F7bB1234",
      "amount": "12.34"
    }
  ]
}
```

- **Notes**:
  - The server preserves the order of operations and computes a deterministic MultiSend payload for the frozen operations and options.
  - If at least one `SWAP_FROM_QUOTE` is present, the quote/constraints are frozen at intent time and must remain valid until execution.
  - Multiple operations are combined into a single MultiSend delegate call transaction, reducing gas costs compared to individual transactions.
  - The `batchId` is used to reference the batch in subsequent calls to `batch-execute`.

- **Common errors**:
  - `400 VALIDATION`: Malformed operations array or invalid SWAP parameters.
  - `401 UNAUTHORIZED`: Missing or invalid JWT.
  - `403 FORBIDDEN`: The authenticated user has no access to the target Safe, or operation restricted by user lock state.
  - `409 CONFLICT`: Attempting `ENABLE_RECOVERY` on a Safe where recovery is already enabled (idempotency safeguard).
  - `410 GONE` / `422 EXPIRED`: Intent or quotes expired (`ttlSec`, `quoteValidUntil`).

#### PUT `/v1.2/safes/operations/batch-execute` (auth required)
- **Purpose**: Submit a previously prepared batch (by `batchId`) together with the WebAuthn `credential` obtained from the client's `startAuthentication` call.
- **Authentication**: JWT
- **Tags**: EXTERNAL, Blockchain
- **Description**: On success, the batch is relayed to chain according to prepared wallet mode: SAFE_4337 (UserOperation) or EOA_7702 (delegated transaction). Execution is immediate upon successful validation.

- **Request body**:
  - `batchId` (string, required): Batch identifier returned by `POST /v1.2/safes/operations/batch-intent`.
  - `credential` (object, required): The result of `startAuthentication({ optionsJSON: credentialRequestOptions })` from the WebAuthn library.

- **200 Response**:
```json
{
  "batchId": "b-7890abcdef123456",
  "userOpHash": "0x...",
  "status": "SUBMITTED"
}
```

- **Example request**:
```json
{
  "batchId": "b-7890abcdef123456",
  "credential": {
    "id": "Az...Ig",
    "rawId": "Az...Ig",
    "response": {
      "authenticatorData": "...",
      "clientDataJSON": "...",
      "signature": "...",
      "userHandle": null
    },
    "type": "public-key",
    "clientExtensionResults": {}
  }
}
```

- **Notes**:
  - Execution is immediate upon successful validation. If a nonce mismatch occurs, the server returns `409 STALE_NONCE`.
  - You can poll the batch status using `GET /v1.2/safes/operations/batch/{batchId}/status` (if implemented).
  - The batch operations are executed atomically: all succeed or all fail (if `atomic: true` was set in the intent).

- **Common errors**:
  - `400 VALIDATION`: Missing or invalid `credential`, or unknown `batchId`.
  - `401 UNAUTHORIZED`: Missing or invalid JWT.
  - `409 STALE_NONCE`: The Safe nonce changed since intent; re-run intent.
  - `410 GONE` / `422 EXPIRED`: Intent or quotes expired.

---

## User Operations (detailed)

### GET `/v1.2/users/me/operations` (auth required)
- **Purpose**: Retrieve all onchain operations related to the authenticated user's wallet(s), grouped by Safe address.
- **Authentication**: JWT
- **Tags**: EXTERNAL, Users
- **Description**: Returns operations grouped by Safe address, providing a clear view of all operations per Safe for the authenticated user.

- **200 Response**:
```json
{
  "data": {
    "0xd676c6188195372EC269E9C2cAf815C56436A679": [
      {
        "id": "op_01HXYZ8K3S7W...",
        "createdAt": "2025-08-24T16:58:19.903Z",
        "updatedAt": "2025-08-24T16:58:19.903Z",
        "index": 0,
        "type": "TRANSFER_TOKEN",
        "data": {},
        "safeOperation": {
          "userOpHash": "0xabc...123",
          "createdAt": "2025-08-24T16:58:20.100Z",
          "updatedAt": "2025-08-24T16:59:10.450Z",
          "paymaster": "SPONSORED",
          "status": "EXECUTED",
          "error": null,
          "safeAddress": "0xd676c6188195372EC269E9C2cAf815C56436A679",
          "transactionHash": "0xdef...456",
          "signatures": [
            {
              "createdAt": "2025-08-24T16:58:20.100Z",
              "data": {},
              "signerId": "l4yDVsiZVsJeaXKPbtfysg"
            }
          ]
        }
      }
    ],
    "0xAnotherSafeAddress...": [
      {
        "id": "op_01HXYZ8K3S7X...",
        "createdAt": "2025-08-24T17:00:00.000Z",
        "updatedAt": "2025-08-24T17:00:00.000Z",
        "index": 0,
        "type": "TRANSFER_EURe",
        "data": {
          "to": "0x...",
          "amount": "100.00"
        },
        "safeOperation": {
          "userOpHash": "0x...",
          "status": "SIGNED",
          "safeAddress": "0xAnotherSafeAddress...",
          "transactionHash": null,
          "signatures": []
        }
      }
    ]
  }
}
```

- **Response fields**:
  - `data` (object): Map of Safe addresses to arrays of operations.
    - Each operation includes:
      - `id`: Operation unique identifier.
      - `createdAt`, `updatedAt`: Timestamps.
      - `index`: Position of the operation within the batch (0-based).
      - `type`: Operation type (e.g., `TRANSFER_TOKEN`, `TRANSFER_EURe`, `AAVE_SUPPLY`, etc.).
      - `data`: Operation-specific data (e.g., `to`, `amount` for transfers).
      - `safeOperation`: Associated Safe operation details:
        - `userOpHash`: User operation hash (4337).
        - `status`: Operation status (`CREATED`, `SIGNED`, `EXECUTED`, `CONFIRMED`, `FAILED`).
        - `paymaster`: Paymaster used (`SPONSORED`).
        - `safeAddress`: Safe address.
        - `transactionHash`: On-chain transaction hash (null if not yet executed).
        - `signatures`: Array of signatures applied to this operation.

- **Notes**:
  - Operations are ordered by `createdAt` descending (most recent first).
  - Operations are grouped by Safe address, making it easy to see all operations per Safe.
  - This endpoint only returns operations for Safes accessible by the authenticated user (based on `rpId` and `externalUserId`).

- **Common errors**:
  - `401 UNAUTHORIZED`: Missing or invalid JWT.

---

## Recovery (detailed)

### GET `/v1.2/recovery/status/:safeAddress` (auth required)
- **Purpose**: Retrieve the recovery status of a Safe with pending and executed recovery operations.
- **Authentication**: JWT
- **Tags**: EXTERNAL, Users
- **Description**: Returns comprehensive recovery status including whether recovery is enabled, pending recovery operations, and executed recovery operations.

- **Path parameters**:
  - `safeAddress` (string, required): Safe address (EVM format, case-insensitive).

- **200 Response**:
```json
{
  "safeAddress": "0xd676c6188195372EC269E9C2cAf815C56436A679",
  "recoveryEnabled": false,
  "recoveryAddress": null,
  "delay": null,
  "pendingRecovery": false,
  "canExecute": false,
  "executeAfter": null,
  "dataRecovery": false,
  "pending": [],
  "executed": [],
  "userOpHash": null,
  "transactionHash": null
}
```

---

### Enabling recovery (on-chain)

**Enabling recovery** is done via **POST /v1.2/safes/operations** with an operation of type **`ENABLE_RECOVERY`**. The Safe **must already be deployed** and known to the API (otherwise you get "unknown safe address").

**Flow:**

1. **POST /v1.2/safes/operations** with body below → server returns `credentialRequestOptions` (WebAuthn challenge).
2. User signs with passkey (e.g. `navigator.credentials.get()`).
3. **PUT /v1.2/safes/operations** with body `{ "credential": <WebAuthn get result> }` → server executes the operation and returns `userOpHash`.

**POST /v1.2/safes/operations body for ENABLE_RECOVERY:**

```json
{
  "safeAddress": "0x...",
  "chainId": 421614,
  "operations": [
    {
      "type": "ENABLE_RECOVERY",
      "firstName": "Jean",
      "lastName": "Dupont",
      "birthDate": "1990-01-15",
      "birthCity": "Paris",
      "birthCountry": "France"
    }
  ]
}
```

**Required fields for `ENABLE_RECOVERY`:**
- `type`: `"ENABLE_RECOVERY"`
- `firstName`, `lastName`: strings
- `birthDate`: string, format `YYYY-MM-DD`
- `birthCity`, `birthCountry`: strings

Personal data is used to register recovery with the IBEX Safe service after the on-chain transaction is confirmed. The backend will call the recovery module’s `enableModule` on the Safe; no `newOwners` or `threshold` are required in the request body for this operation.

**Cancelling recovery:** use **POST /v1.2/safes/operations** with a single operation `{ "type": "CANCEL_RECOVERY" }` (no personal data). The Safe must already have recovery enabled.

---

### Summary

| Goal | Endpoint | Body / notes |
|------|----------|--------------|
| Read recovery status | GET `/v1.2/recovery/status/:safeAddress` | No body |
| Enable recovery (Safe must be deployed) | POST `/v1.2/safes/operations` | `safeAddress`, `chainId`, `operations`: [{ `type`: `"ENABLE_RECOVERY"`, `firstName`, `lastName`, `birthDate`, `birthCity`, `birthCountry` }] |
| Submit signature after intent | PUT `/v1.2/safes/operations` | `credential` (WebAuthn get result) |
| Cancel recovery | POST `/v1.2/safes/operations` | `operations`: [{ `type`: `"CANCEL_RECOVERY"` }] |

There is **no** endpoint to enable recovery for a Safe that is not yet deployed (lazy mode). If the Safe is not in the backend (e.g. not yet created on-chain), the API returns an error (e.g. "unknown safe address") and you must deploy the Safe first, then use POST /v1.2/safes/operations with ENABLE_RECOVERY.

---

---

## Safes (DeFi lending catalog)

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| GET | `/v1.2/safes/vaults` | JWT | **v1.2** |

**Purpose:** Returns the catalog of active DeFi lending pools/vaults. Supports AAVE, MORPHO, and HYPERLIQUID providers. Data is refreshed periodically.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | No | Filter by provider: `AAVE`, `MORPHO`, or `HYPERLIQUID` |

**Headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `X-Blockchain-Id` | No | Chain ID to scope the results (e.g., `1`, `8453`, `42161`). Omit to get all chains. |

**Response (200):** JSON array of vault/pool objects:

```json
[
  {
    "id": 42,
    "blockchainId": "8453",
    "provider": "MORPHO",
    "poolAddress": "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB",
    "name": "Morpho Steakhouse USDC",
    "assetTicker": "USDC",
    "assetAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "assetDecimals": 6,
    "apy": 0.052,
    "tvl": 150000000,
    "isDefault": true,
    "metadata": { "curator": "Steakhouse Financial" },
    "supplyToken": { "address": "0x...", "symbol": "mUSDC", "name": "Morpho USDC", "decimals": 6 }
  },
  {
    "id": 15,
    "blockchainId": "8453",
    "provider": "AAVE",
    "poolAddress": "0x...",
    "name": "AAVE USDC",
    "assetTicker": "USDC",
    "assetAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "assetDecimals": 6,
    "apy": 0.038,
    "tvl": 500000000,
    "isDefault": true,
    "metadata": { "poolContract": "0x...", "market": "Aave V3 Base" },
    "supplyToken": { "address": "0x...", "symbol": "aBasUSDC", "name": "Aave Base USDC", "decimals": 6 }
  }
]
```

**Provider-specific metadata:**

| Provider | Metadata fields |
|----------|----------------|
| AAVE | `poolContract` (Aave Pool address), `market` (market name) |
| MORPHO | `curator` (vault curator name) |
| HYPERLIQUID | `leader` (vault leader address), `isClosed`, `relationship` |

**Examples:**

```bash
# All vaults on Base
curl -H "Authorization: Bearer <JWT>" -H "X-Blockchain-Id: 8453" \
  https://api.ibex.fi/api/v1.2/safes/vaults

# Only Morpho vaults
curl -H "Authorization: Bearer <JWT>" -H "X-Blockchain-Id: 8453" \
  "https://api.ibex.fi/api/v1.2/safes/vaults?provider=MORPHO"

# Only AAVE pools
curl -H "Authorization: Bearer <JWT>" -H "X-Blockchain-Id: 42161" \
  "https://api.ibex.fi/api/v1.2/safes/vaults?provider=AAVE"

# Only Hyperliquid vaults
curl -H "Authorization: Bearer <JWT>" -H "X-Blockchain-Id: 42161" \
  "https://api.ibex.fi/api/v1.2/safes/vaults?provider=HYPERLIQUID"
```

---

## Safes (swap quote)

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| GET | `/v1.2/safes/swap/quote` | JWT | **v1.2** |

**Purpose:** Get a swap quote from COWSWAP and/or 1INCH. Uses the authenticated user’s first Safe as receiver when `safeAddress` is not provided.

**Query parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sellTokenAddress` | string | Yes | Token to sell (EVM address) |
| `buyTokenAddress` | string | Yes | Token to buy (EVM address) |
| `amount` | string | Yes | Human-readable sell amount |
| `chainId` | number | No | Chain (default from env) |
| `safeAddress` | string | No | Safe address (default: user’s first Safe) |
| `provider` | string | No | `COWSWAP`, `1INCH`, or `BOTH` (default) |

**Response (200):** Quote(s) from COWSWAP and/or 1INCH (structure depends on provider). May include `quoteId`, `orderUid`, `buyAmount`, `sellAmount`, fee, validity, etc. Used with **SWAP_FROM_QUOTE** in POST /v1.2/safes/operations.

---

## Safes (automation module config)

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| PUT | `/v1.2/safes/{safeAddress}/automation-module/config` | JWT | **v1.2** |

**Purpose:** Update automation module configuration for a specific Safe.

**Path parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `safeAddress` | string | Yes | Safe address (EVM `0x...`) |

**Body (at least one field required):**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetAddress` | string | No | Recipient/target address used by automation |
| `mode` | string | No | `PERCENT_OF_RECEIVED` or `FIXED_AMOUNT`. |
| `percentage` | number | No | Used with `mode=PERCENT_OF_RECEIVED` (`0` to `100`). |
| `fixedAmount` | string \| null | No | Used with `mode=FIXED_AMOUNT` (token units, human-readable, e.g. `"10.5"`). Set `null` to clear. |
| `maxWalletPercentage` | number | No | Optional cap (`0` to `100`) for `FIXED_AMOUNT`: effective transfer is capped by this % of wallet balance at execution time. |
| `minIntervalMinutes` | number | No | Minimum delay between 2 automatic transfers (minutes). |
| `periodCapAmount` | string \| null | No | Optional cumulative cap per period (token units, human-readable). Set `null` to disable the period cap. |
| `periodCap` | string \| null | No | Optional predefined period for `periodCapAmount`: `HOURLY`, `DAILY`, `WEEKLY`, `MONTHLY`. |
| `periodCapMinutes` | number \| null | No | Optional custom period (minutes) for `periodCapAmount`. Mutually exclusive with `periodCap`. |
| `frequency` | string | No | `DAILY`, `WEEKLY`, `90_DAYS`, `NONE` |
| `tokenAddress` | string | No | Token address used by automation |
| `enabled` | boolean | No | Enable/disable automation module |

**Validation rules:**
- `percentage` is valid only with `mode=PERCENT_OF_RECEIVED`.
- `fixedAmount` and `maxWalletPercentage` are valid only with `mode=FIXED_AMOUNT`.
- Use either `periodCap` or `periodCapMinutes`, not both.
- `periodCap` / `periodCapMinutes` require `periodCapAmount`.

**Execution semantics:**
- `minIntervalMinutes` defines the minimum delay between 2 automatic transfers.
- `periodCapAmount` + (`periodCap` or `periodCapMinutes`) defines a rolling cumulative cap.
- With `mode=FIXED_AMOUNT`, the effective transfer amount is:
  - fixed amount,
  - capped by `maxWalletPercentage` (if set),
  - capped by remaining `periodCapAmount` (if configured),
  - capped by current wallet balance.
- With `mode=PERCENT_OF_RECEIVED`, the base amount is `%` of the received amount, then capped by period/balance constraints.

**Response (200):**

```json
{
  "success": true,
  "updated": [
    "moduleTransferMode",
    "moduleFixedAmount",
    "moduleMinIntervalMinutes",
    "modulePeriodCapAmount",
    "modulePeriodCapMinutes"
  ]
}
```

**Common errors:**

| HTTP | Meaning |
|------|---------|
| `400` | Invalid `safeAddress`, invalid field combinations, or empty body (`No fields to update`) |
| `404` | Safe not found for current chain scope |

---

## Safes operations

All listed paths use the `/v1.2` API prefix.

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| POST | `/v1.2/safes/operations` | JWT | **v1.2** |
| PUT  | `/v1.2/safes/operations` | JWT | **v1.2** |
| POST | `/v1.2/safes/operations/batch-intent` | JWT | **v1.2** |
| PUT  | `/v1.2/safes/operations/batch-execute` | JWT | **v1.2** |
| GET  | `/v1.2/safes/operations/batch/:batchId/status` | JWT | **v1.2** |
| GET  | `/v1.2/safes/operations/:userOpHash/status` | JWT | **v1.2** |

**Constraint:** The Safe must belong to the authenticated user for the current `rpId`. Unknown Safe → 400 (e.g. "unknown safe address").

---

## Safes (multisig)

There is no dedicated `POST /v1.2/safes/multisig` runtime endpoint.  
Multisig owner/threshold changes are executed via the standard two-step flow:

1. `POST /v1.2/safes/operations` (prepare WebAuthn challenge)
2. `PUT /v1.2/safes/operations` (execute signed operation)

Supported multisig operation types:

| Type | Required fields |
|------|-----------------|
| `ADD_OWNER` | `owner`, `threshold` |
| `REMOVE_OWNER` | `owner`, `threshold` |
| `CHANGE_THRESHOLD` | `threshold` |

Examples:

```json
{
  "safeAddress": "0x...",
  "chainId": 421614,
  "operations": [
    {
      "type": "ADD_OWNER",
      "owner": "0xNewOwnerAddress",
      "threshold": 2
    }
  ]
}
```

```json
{
  "safeAddress": "0x...",
  "chainId": 421614,
  "operations": [
    {
      "type": "REMOVE_OWNER",
      "owner": "0xOwnerToRemove",
      "threshold": 1
    }
  ]
}
```

```json
{
  "safeAddress": "0x...",
  "chainId": 421614,
  "operations": [
    {
      "type": "CHANGE_THRESHOLD",
      "threshold": 2
    }
  ]
}
```

---

### POST /v1.2/safes/operations (prepare)

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `safeAddress` | string | Yes | Safe (EVM) address |
| `operations` | array | Yes | One or more operation objects (see table below) |
| `chainId` | number | No | Chain (default from header or env) |
| `signerId` | string | No | Specific signer to use |
| `walletMode` | string | No | `SAFE_4337` or `EOA_7702` (override signer default mode) |
| `eoaKeySelection` | object | No | 7702 key selector (`family`, `index`, optional `safeAddress`) |

**Response (200):** `credentialRequestOptions` (WebAuthn challenge) and operation metadata. Client then calls **PUT /v1.2/safes/operations** with the signed `credential`.

---

### PUT /v1.2/safes/operations (execute)

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `credential` | object | Yes | WebAuthn assertion from `navigator.credentials.get()` |
| `chainId` | number | No | Chain (optional) |

**Response (200):**
- SAFE_4337 example: `{ "userOpHash": "0x..." }`
- EOA_7702 example: `{ "userOpHash": "0x...", "txHash": "0x...", "walletMode": "EOA_7702", "success": true }`

---

### Operation types and request body (per item in `operations`)

| Type | Required fields (besides `type`) | Optional | Notes |
|------|----------------------------------|----------|--------|
| `TRANSFER_EURe` | `receiver`, `amount` | – | EURe transfer |
| `TRANSFER_TOKEN` | `tokenAddress`, `to`, `amount` | `decimals` | ERC-20 transfer |
| `SIGN_MESSAGE` | `message` | – | EIP-191 / personal_sign |
| `ENABLE_RECOVERY` | `firstName`, `lastName`, `birthDate`, `birthCity`, `birthCountry` | – | Safe must be deployed; `birthDate` YYYY-MM-DD |
| `CANCEL_RECOVERY` | – | – | Safe must have recovery enabled |
| `SWAP_FROM_QUOTE` | `quoteId` | `orderUid` | Use quote from GET /v1.2/safes/swap/quote |
| `ROUTE_FROM_QUOTE` | `quoteId` | – | Use routeId from POST /v1.2/safes/routes/quote |
| `AAVE_SUPPLY` | `amount` | `assetTicker`, `tokenAddress`, `decimals`, `referralCode`, `poolAddress` | Supply to Aave |
| `AAVE_WITHDRAW` | `amount` | `assetTicker`, `tokenAddress`, `decimals`, `poolAddress` | Withdraw from Aave |
| `MORPHO_SUPPLY` | `amount` | `assetTicker`, `tokenAddress`, `decimals`, `vaultAddress` | Deposit into Morpho Vault (ERC-4626) |
| `MORPHO_WITHDRAW` | `shares` or `amount` | `assetTicker`, `tokenAddress`, `decimals`, `vaultAddress` | Withdraw from Morpho Vault (redeem shares or withdraw assets) |
| `ADD_OWNER` | `owner`, `threshold` | – | EVM address, new threshold |
| `REMOVE_OWNER` | `owner`, `threshold` | – | EVM address, new threshold |
| `CHANGE_THRESHOLD` | `threshold` | – | New signature threshold |
| `MONERIUM_CREATE_IBAN` | (none) | – | Create Monerium IBAN for Safe |
| `MONERIUM_WITHDRAW_EURe` | (context from Safe) | – | Withdraw EURe via Monerium |
| `HYPERLIQUID_ENTER_VAULT`, `HYPERLIQUID_WITHDRAW_VAULT`, `HYPERLIQUID_WITHDRAW`, `HYPERLIQUID_DEPOSIT` | (see backend) | – | Hyperliquid operations |

**Example – TRANSFER_TOKEN:**
```json
{
  "safeAddress": "0xSAFE...",
  "chainId": 421614,
  "operations": [
    {
      "type": "TRANSFER_TOKEN",
      "tokenAddress": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
      "to": "0xDEST...",
      "amount": "1.23"
    }
  ]
}
```

**Example – ENABLE_RECOVERY:** Safe must already be deployed.
```json
{
  "safeAddress": "0xSAFE...",
  "chainId": 421614,
  "operations": [
    {
      "type": "ENABLE_RECOVERY",
      "firstName": "Jean",
      "lastName": "Dupont",
      "birthDate": "1990-01-15",
      "birthCity": "Paris",
      "birthCountry": "France"
    }
  ]
}
```

---

### POST /v1.2/safes/operations/batch-intent

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `safeAddress` | string | Yes | Safe address |
| `operations` | array | Yes | Same operation objects as above |
| `chainId` | number | No | Chain |
| `idempotencyKey` | string | No | Idempotency key |
| `walletMode` | string | No | `SAFE_4337` or `EOA_7702` |
| `eoaKeySelection` | object | No | 7702 key selector (`family`, `index`, optional `safeAddress`) |
| `options` | object | No | `atomic`, `autoApprove`, `ttlSec`, `reorder` |

**Response (200):** `credentialRequestOptions` (WebAuthn challenge) and `batchId`. Client then calls **PUT /v1.2/safes/operations/batch-execute** with `batchId` and `credential`.

---

### PUT /v1.2/safes/operations/batch-execute

**Request body:**

| Field | Type | Required |
|-------|------|----------|
| `batchId` | string | Yes |
| `credential` | object | Yes (WebAuthn get result) |

**Response (200):** Execution result (`userOpHash`, and in 7702 mode may include `txHash`, `walletMode`, `success`). Batch status can be checked via GET batch status.

---

### GET /v1.2/safes/operations/batch/:batchId/status

**Path:** `batchId` from batch-intent response.

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| `batchId` | string | Same as path |
| `safeAddress` | string \| null | Safe used |
| `chainId` | number \| null | Chain |
| `status` | string | e.g. PENDING, SIGNED, EXECUTED |
| `userOpHash` | string | UserOperation hash |
| `operations` | array | `{ index, type }` per op |
| `expiresAt` | string \| null | Batch intent expiry |

---

### GET /v1.2/safes/operations/:userOpHash/status

**Path:** `userOpHash` = hash returned by PUT operations or batch-execute.

**Response (200):**

| Field | Type | Description |
|-------|------|-------------|
| `userOpHash` | string | Operation hash |
| `status` | string | PENDING, SIGNED, EXECUTED, FAILED, etc. |
| `safeAddress` | string | Safe address |
| `transactionHash` | string \| null | On-chain tx hash when executed |
| `createdAt`, `updatedAt` | string | Timestamps |
| `error` | string \| null | Error message if failed |
| `Chains` | object | `{ id: chainId }` |
| `Operations` | array | `{ index, type }` |

---

## Bitcoin

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| GET  | `/v1.2/safes/bitcoin/info` | JWT | **v1.2** |
| GET  | `/v1.2/safes/bitcoin/fees` | JWT | **v1.2** |
| GET  | `/v1.2/safes/bitcoin/utxos` | JWT | **v1.2** |
| POST | `/v1.2/safes/bitcoin/psbt/build` | JWT | **v1.2** |
| POST | `/v1.2/safes/bitcoin/tx/broadcast` | JWT | **v1.2** |
| POST | `/v1.2/safes/bitcoin/send/prepare` | JWT | **v1.2** |

---

### GET /v1.2/safes/bitcoin/info

**Query (optional):** `network`: `mainnet` \| `testnet`.

**Response (200):** `{ "network": "mainnet"|"testnet", "rpc": { ... } }` where `rpc` is from `getblockchaininfo` (chain, blocks, etc.).

---

### GET /v1.2/safes/bitcoin/fees

**Query (optional):** `network`: `mainnet` \| `testnet`.

**Response (200):** `{ "feeRateSatVb": { "fast": <number>, "standard": <number>, "slow": <number> } }` (sat/vB from `estimatesmartfee` for 1, 6, 12 blocks).

---

### GET /v1.2/safes/bitcoin/utxos

**Query:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Bitcoin address to scan |
| `network` | string | No | `mainnet` \| `testnet` |

**Response (200):** `{ "address": "<address>", "network": "...", "utxos": [ { "txid", "vout", "value" (sat), "scriptPubKey" } ] }`.

---

### POST /v1.2/safes/bitcoin/psbt/build

**Status:** Returns **501 Not Implemented**. Server-side PSBT building is not available; build PSBT client-side.

**Body (documented for future use):** `inputs`, `outputs`, `changeAddress`, `sendAll`, `feeProfile` (`slow` \| `standard` \| `fast`), `network`.

---

### POST /v1.2/safes/bitcoin/tx/broadcast

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rawtx` | string | Yes | Signed raw transaction (hex) |
| `network` | string | No | `mainnet` \| `testnet` |

**Response (200):** `{ "txid": "<txid>" }`.

---

### POST /v1.2/safes/bitcoin/send/prepare

**Purpose:** Select UTXOs, estimate fee, compute change. Client uses result to build a PSBT.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Sender Bitcoin address |
| `to` | string | Yes | Recipient address |
| `amountSat` | number | No* | Amount in satoshis (*required if `sendAll` is false) |
| `sendAll` | boolean | No | If true, send full balance (minus fee) |
| `feeProfile` | string | No | `slow` \| `standard` \| `fast` (default `standard`) |
| `network` | string | No | `mainnet` \| `testnet` |
| `externalFeeSponsor` | boolean | No | If true, fee not taken from sender UTXOs (collaborative) |

**Response (200):** `{ "from", "to", "amountSat", "feeSat", "inputsUsed", "outputs", "change", "externalFeeSponsor", "sponsorShortfallSat" }`. `inputsUsed` and `outputs` can be used to construct the PSBT.

---

## SEPA (IBEx SEPA proxy)

User-facing wrapper around the IBEx SEPA stack (IBAN pool, payments, transactions, Verification of Payee). All endpoints require a JWT and operate on behalf of the authenticated user.

No private user data is persisted in `ibex-fi-api`: the IBANs picked by a user and their unified address book live in IBEXSAFE under flat dot-namespaced keys, mirroring the conventions already in use (`optin.*`, `marketing.*`, `audit.history`, etc.):

- `sepa.iban.<IBAN>` — JSON: `{ id, iban, formatted, bic, holderName, externStack, accountNumber, bankCode, branchCode, dateUsed, status, safeAddress?, blockchainId? }`
- `addressbook.entry.<UUID>` — unified contact: `name`, optional `label`, `userValidated`, `crypto[]`, `ibans[]` (IBAN sub-rows are written only by the VOP verification flow on **MTCH**)
- `sepa.mandate.<MANDATE_ID>` — JSON mandate object: routing (`sourceIban`, `sourceName?`, `sourceBic?`, `destinationIban`, `destinationName?`, `destinationBic?`), allocation (`percent`), trigger (`all|whitelist` + advanced rules), signature hashes, status (`validated|suspended|cancelled`), timestamps, position
- `sepa.mandate.order` — JSON string array preserving mandate order (`["<id1>", "<id2>", ...]`)

Ownership of an IBAN is enforced by checking the IBAN data available in IBEXSAFE for the user (legacy `sepa.iban.<IBAN>` keys and/or provider-managed `tractial` IBAN records).

| Method | Path | Auth | Available in |
|--------|------|------|----------------|
| POST   | `/v1.2/sepa/iban/add`            | JWT | **v1.2** |
| PUT    | `/v1.2/sepa/iban/add`            | JWT | **v1.2** |
| GET    | `/v1.2/sepa/iban`                | JWT | **v1.2** |
| POST   | `/v1.2/sepa/payments`            | JWT | **v1.2** |
| PUT    | `/v1.2/sepa/payments`            | JWT | **v1.2** |
| GET    | `/v1.2/sepa/transactions`        | JWT | **v1.2** |
| GET    | `/v1.2/sepa/transactions/:id`    | JWT | **v1.2** |
| POST   | `/v1.2/sepa/mandates`            | JWT | **v1.2** |
| GET    | `/v1.2/sepa/mandates`            | JWT | **v1.2** |
| GET    | `/v1.2/sepa/mandates/:id`        | JWT | **v1.2** |
| PATCH  | `/v1.2/sepa/mandates/:id/status` | JWT | **v1.2** |
| POST   | `/v1.2/sepa/mandates/:id/cancel` | JWT | **v1.2** |

---

### POST /v1.2/sepa/iban/add

Creates an IBAN for the authenticated user. Behavior depends on domain flag `isSepaIbanAddWebauthnEnabled`:

- `TRUE` (default): passkey-gated mode — this endpoint returns `approvalId` + `credentialRequestOptions`; actual creation is done by `PUT /v1.2/sepa/iban/add`.
- `FALSE`: direct mode — this endpoint executes IBEXSAFE `POST /iban/add` immediately and returns the created IBAN payload (no `PUT` required).

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `holderName`   | string | Yes | Name of the IBAN holder (used later as the reference value for VOP matching) |
| `safeAddress`  | string | No  | Optional Safe wallet to associate with this IBAN. Must belong to the authenticated user (404 otherwise) |
| `blockchainId` | number | No  | Optional chain id stored alongside `safeAddress` |
| `label`        | string | No  | Free-text label for this IBAN (e.g. "Savings account", "Main"). Max 100 chars, alphanumeric + spaces/dots/dashes/underscores only. Modifiable later via `PATCH /v1.2/sepa/iban/modify`. |

**Response (200) — WebAuthn mode (`isSepaIbanAddWebauthnEnabled=TRUE`):**

```json
{
  "success": true,
  "data": {
    "approvalId": "a87a3c1f-cc5d-4d1a-91ea-2d4f7c4fdd8c",
    "approvalHash": "53ca9be6c85f9f1b5c8f9e56f67b7af4f14966e2f78f1336af0b8db7a2043db9",
    "expiresAt": "2026-06-01T14:24:00.000Z",
    "credentialRequestOptions": {
      "challenge": "Y2hhbGxlbmdl...",
      "rpId": "app.ibex.fi"
    }
  }
}
```

Errors: `400` missing/invalid fields · `404` `safeAddress` provided but does not belong to the user · `429` quota reached (`maxIbanPerUser`).

**Response (200) — direct mode (`isSepaIbanAddWebauthnEnabled=FALSE`):**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "iban": "FR7615589275690931505605139",
    "formatted": "FR76 1558 9275 6909 3150 5605 139",
    "bic": "AGRIFRPPXXX",
    "holderName": "Alice Martin",
    "label": "Main account",
    "externStack": "IBEXFIAPI",
    "accountNumber": "09315056051",
    "bankCode": "15589",
    "branchCode": "27569",
    "dateUsed": "2026-04-22T10:00:00.000Z",
    "status": "active",
    "safeAddress": "0xd676…",
    "blockchainId": 100
  }
}
```

---

### PUT /v1.2/sepa/iban/add

Confirms an IBAN creation intent by verifying a WebAuthn assertion, then executes IBEXSAFE `POST /iban/add`.
This endpoint is used only when `isSepaIbanAddWebauthnEnabled=TRUE`.

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `approvalId` | string | Yes | Approval identifier returned by `POST /v1.2/sepa/iban/add` |
| `credential` | object | Yes | WebAuthn assertion generated by the client |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "approvalId": "a87a3c1f-cc5d-4d1a-91ea-2d4f7c4fdd8c",
    "approvalHash": "53ca9be6c85f9f1b5c8f9e56f67b7af4f14966e2f78f1336af0b8db7a2043db9",
    "iban": {
      "id": 42,
      "iban": "FR7615589275690931505605139",
      "formatted": "FR76 1558 9275 6909 3150 5605 139",
      "bic": "AGRIFRPPXXX",
      "holderName": "Alice Martin",
      "label": "Main account",
      "externStack": "IBEXFIAPI",
      "accountNumber": "09315056051",
      "bankCode": "15589",
      "branchCode": "27569",
      "dateUsed": "2026-04-22T10:00:00.000Z",
      "status": "active",
      "safeAddress": "0xd676…",
      "blockchainId": 100
    }
  }
}
```

Errors: `400` invalid/missing `approvalId` or `credential` · `401`/`403` invalid signer/challenge · `404` approval not found or `safeAddress` not owned · `409` already consumed/expired approval · `429` quota reached · upstream IBEXSAFE errors are forwarded (`403`/`404`/`409`/`502`, etc.).

---

### GET /v1.2/sepa/iban

Returns the list of IBAN entries available in IBEXSAFE for the authenticated user (`sepa.iban.*` legacy keys and `tractial` provider records).

**Response (200):**

```json
{
  "success": true,
  "data": [
    { "id": 42, "iban": "FR76…", "bic": "AGRIFRPPXXX", "holderName": "Alice Martin", "label": "Main account", "status": "active", "safeAddress": "0xd676…", "blockchainId": 100, "dateUsed": "2026-04-22T10:00:00.000Z" }
  ]
}
```

---

### PATCH /v1.2/sepa/iban/modify

Update the `label` of an existing IBAN owned by the authenticated user. Pass an empty string to clear the label.

**Request body:**

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `iban`  | string | Yes      | The IBAN to modify (must belong to the authenticated user) |
| `label` | string | Yes      | New label value. Max 100 chars, alphanumeric + spaces/dots/dashes/underscores only. Empty string clears the label. |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "iban": "FR7615589275690931505605139",
    "label": "Savings account"
  }
}
```

Errors: `400` missing or invalid fields · `403` IBAN does not belong to the authenticated user · `404` IBAN not found upstream.

---

### POST /v1.2/sepa/payments

Initiates a passkey-gated SEPA / SEPA Instant payment intent. The debtor IBAN **must** belong to the authenticated user.
This endpoint does **not** execute the payment directly anymore: execution happens on `PUT /v1.2/sepa/payments` after WebAuthn verification.

If the creditor IBAN is not present in any unified address book entry (`addressbook.entry.*`) with `vop=true` on the matching `ibans[]` row, a non-blocking warning is logged server-side (the payment is still attempted — VoP also runs upstream as part of the pipeline).

**Request body:**

```json
{
  "reference": "PAY-2026-001",
  "channel": "SEPAINSTANT",
  "amount": "150.00",
  "currency": "EUR",
  "remittanceInfo": "Invoice 2026-001",
  "debtor":   { "name": "John Doe",   "iban": "FR7616748000014468183681821" },
  "creditor": { "name": "Jane Smith", "iban": "FR7616748000011234037943644" }
}
```

`channel` ∈ `SEPA | SEPAINSTANT`. `currency` is `EUR`.

**Response (200):** payment approval intent + passkey challenge.

```json
{
  "success": true,
  "data": {
    "approvalId": "6d8f6db4-53b0-43f3-87f3-35b68a68d2f7",
    "approvalHash": "4ed4a8f8e472e6f8f2f38e6f9f58b3f5f89f7b2f17a6f70db0f0f1d4b2d2d40a",
    "expiresAt": "2026-05-07T13:15:00.000Z",
    "credentialRequestOptions": {
      "challenge": "base64url-challenge",
      "timeout": 60000,
      "rpId": "demobaas-prat1.ibex.fi",
      "userVerification": "required",
      "allowCredentials": [{ "id": "credential-id", "type": "public-key", "transports": ["internal"] }]
    }
  }
}
```

Errors: `400` missing fields or no PASSKEY signer · `403` debtor IBAN does not belong to the authenticated user.

---

### PUT /v1.2/sepa/payments

Confirms and executes a previously initiated payment approval intent using WebAuthn authentication.

**Request body:**

```json
{
  "approvalId": "6d8f6db4-53b0-43f3-87f3-35b68a68d2f7",
  "credential": {
    "id": "credential-id",
    "rawId": "credential-id",
    "type": "public-key",
    "response": {
      "authenticatorData": "...",
      "clientDataJSON": "...",
      "signature": "...",
      "userHandle": null
    },
    "clientExtensionResults": {}
  }
}
```

**Response (200):** approval + upstream payment payload.

```json
{
  "success": true,
  "data": {
    "approvalId": "6d8f6db4-53b0-43f3-87f3-35b68a68d2f7",
    "approvalHash": "4ed4a8f8e472e6f8f2f38e6f9f58b3f5f89f7b2f17a6f70db0f0f1d4b2d2d40a",
    "payment": {
      "success": true,
      "message": "Payment processed",
      "data": {
        "transactionId": "uuid",
        "reference": "PAY-2026-001",
        "status": "completed",
        "statusCode": "DONE"
      }
    }
  }
}
```

Errors: `400` invalid body · `404` unknown approval · `409` expired/already consumed/already executed approval · upstream SEPA execution errors are returned after proof persistence.

---

### GET /v1.2/sepa/transactions

Lists SEPA transactions touching any IBAN owned by the authenticated user.

| Query | Type | Description |
|-------|------|-------------|
| `iban`       | string | Optional. If provided, must belong to the user (else `403`). If omitted, the endpoint fans out to SEPA `GET /transactions?iban=<X>` for each user IBAN, merges and dedupes by `id`, sorts by `createdAt DESC`, paginates in memory |
| `type`       | string | `SEPA_IN` or `SEPA_OUT` |
| `status`     | string | `ask | pending | completed | cancelled | failed | rejected` |
| `statusCode` | string | Upstream status code |
| `search`     | string | Free-text search forwarded to SEPA |
| `page`       | number | Default `1` |
| `limit`      | number | Default `20`, max `200` |

**Response (200):**

```json
{
  "success": true,
  "data": [ { "id": "uuid", "iban": "FR76…", "type": "SEPA_OUT", "status": "completed", "amount": "150.00", "currency": "EUR", "senderIban": "FR76…", "beneficiaryIban": "FR76…", "reference": "PAY-2026-001", "createdAt": "..." } ],
  "pagination": { "total": 1234, "page": 1, "limit": 20, "pages": 62 }
}
```

---

### GET /v1.2/sepa/transactions/:id

Returns the full SEPA transaction (including the linked SEPA message). Returns `404` when the transaction does not involve any IBAN owned by the authenticated user (intentionally hiding existence to avoid enumeration).

**Response (200):** Upstream SEPA payload `{ success, data: { /* transaction + sepaMessage */ } }`.

---

### POST /v1.2/sepa/mandates

Creates a SEPA mandate in IBEXSAFE and immediately pushes it to the IBEx SEPA mandates endpoint (`POST /api/v1/mandates`).

The source IBAN must belong to the authenticated user (IBEXSAFE-backed IBAN records). Signature data is provided by the client (typically after a `SIGN_MESSAGE` flow), and the API stores only hashes (`messageHash`, `signatureHash`) plus the signed message string.

**Request body (example):**

```json
{
  "sourceIban": "FR7615589275690931505605139",
  "destinationIban": "FR7616748000011234037943644",
  "destinationName": "Jean Dupont",
  "destinationBic": "AGRIFRPPXXX",
  "percent": 25,
  "trigger": {
    "mode": "whitelist",
    "whitelistRules": [
      { "kind": "senderIban", "operator": "in", "values": ["FR7616748000014468183681821"] },
      { "kind": "amount", "operator": "between", "minAmount": "10.00", "maxAmount": "500.00", "currency": "EUR" }
    ]
  },
  "signature": {
    "message": "IBEX_SEPA_MANDATE_V1 ...",
    "signature": "0xabcdef...",
    "safeOperationUserOpHash": "0x1234..."
  }
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "validated",
    "position": 1,
    "routing": {
      "sourceIban": "FR76...",
      "sourceName": "Alice Martin",
      "sourceBic": "AGRIFRPPXXX",
      "destinationIban": "FR76...",
      "destinationName": "Jean Dupont",
      "destinationBic": "AGRIFRPPXXX"
    },
    "allocation": { "percent": 25 },
    "trigger": { "mode": "whitelist", "whitelistRules": [] },
    "signature": {
      "message": "IBEX_SEPA_MANDATE_V1 ...",
      "messageHash": "sha256hex",
      "signatureHash": "sha256hex",
      "safeOperationUserOpHash": "0x1234...",
      "signatureCapturedAt": "2026-04-26T11:00:00.000Z"
    },
    "createdAt": "2026-04-26T11:00:00.000Z",
    "updatedAt": "2026-04-26T11:00:00.000Z",
    "version": 1
  },
  "sepaSync": { "success": true }
}
```

Errors: `400` invalid payload (`percent`, `trigger`, signature) · `403` source IBAN not owned by user · upstream IBEx SEPA errors are forwarded.

### GET /v1.2/sepa/mandates

Returns all mandates from IBEXSAFE (`sepa.mandate.*`) in `sepa.mandate.order`.

### GET /v1.2/sepa/mandates/:id

Returns one mandate by id (`404` if missing).

### PATCH /v1.2/sepa/mandates/:id/status

Updates mandate status with body `{ "status": "validated|suspended|cancelled" }`.

Rules:
- `cancelled` is terminal (cannot go back to `validated`/`suspended`).
- Every status update is persisted to IBEXSAFE and pushed to IBEx SEPA.
- For `cancelled`, the IBEx SEPA push uses the same `/api/v1/mandates` endpoint and supports minimal payload (`mandateKey`, `mandateId`, `status`).

### POST /v1.2/sepa/mandates/:id/cancel

Convenience endpoint for cancellation (equivalent to `PATCH .../status` with `cancelled`), and also triggers the minimal cancel payload push to IBEx SEPA.

---

## Domain key-value store (v1.2)

Arbitrary **JSON object** per tenant (`rpId`), stored in table **`DomainKeyValueStore`**. Isolated by domain: only requests whose **`x-api-key`** matches the **`Domain.apiKey`** for the resolved **`rpId`** (same rules as other `API_KEY` routes: correct **Origin** / host → `ibex_rpId`) can read or write.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1.2/domain/kv` | **API_KEY** | Returns `{ "data": { ... } }`. Empty object if never written. |
| PUT | `/v1.2/domain/kv` | **API_KEY** | Body `{ "data": { ... } }` — **replaces** the entire stored JSON for this domain. |
| PATCH | `/v1.2/domain/kv` | **API_KEY** | Body `{ "patch": { "key": value, ... } }` — **shallow merge** at the top level into the existing object (creates row if missing). |

**Limits:** serialized JSON size must not exceed **1 MiB** (1024×1024 bytes; PUT body or merged result after PATCH); otherwise **400**.

**Concurrency:** last write wins if multiple clients PATCH/PUT concurrently.

**Operations:** if the API returns **503** for this feature, the storage backend may not be initialized on that environment — contact support or your deployment administrator.

**Note:** This is **not** end-user userdata (no JWT); it is **tenant configuration** for whoever holds the domain API key (backend, CI, partner dashboard).

**Webhook contract (recommended for system event fan-out):**

```json
{
  "webhooks": {
    "userEvents": {
      "enabled": true,
      "url": "https://tenant.example/webhooks/ibex",
      "events": ["user.ky.updated", "user.iban.updated"],
      "headers": {
        "X-Webhook-Key": "replace-with-shared-secret"
      },
      "timeoutMs": 3000
    }
  }
}
```

- `enabled` (optional, default `true`): enables/disables outgoing tenant webhooks.
- `url` (required when enabled): HTTPS endpoint called by IBEx API.
- `events` (optional): whitelist of events to send (`user.ky.updated`, `user.iban.updated`); if omitted, both events are eligible.
- `headers` (optional): additional static HTTP headers.
- `timeoutMs` (optional): request timeout in milliseconds (bounded server-side).

**Outgoing payload examples:**

`user.ky.updated` (`data` object):

```json
{
  "signal": "changed",
  "status": "5",
  "firstName": "Jean",
  "lastName": "Dupont",
  "externalUserId": "32f5e35d-8696-4201-a219-95edebe0d432"
}
```

Notes:
- `status` is sent as a string.
- `firstName` / `lastName` are included when provided by upstream KYC updates.
- `data` is tenant-facing and uses tenant `externalUserId` (no `userId` field in `data`).

`user.iban.updated` (`data` object):

```json
{
  "signal": "changed",
  "externalUserId": "32f5e35d-8696-4201-a219-95edebe0d432"
}
```

---

## Tenant Endpoints (`/v1.2/domain/*` and tenant read under `/v1.2/domains/*`)

This section groups the domain-tenant endpoints intended for backend/server usage with a tenant domain key (`x-api-key`).

### Tenant API key scope

- The key is tenant-scoped: requests run under one resolved `rpId`.
- `/v1.2/domain/*` is writable tenant config storage.
- `/v1.2/domains/:rpId` and `/v1.2/domains/:rpId/quota` are read-only with API key, and only for the same `rpId` as the key.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1.2/domain/kv` | **API_KEY** | Read tenant JSON config blob. |
| PUT | `/v1.2/domain/kv` | **API_KEY** | Replace tenant JSON config blob. |
| PATCH | `/v1.2/domain/kv` | **API_KEY** | Merge top-level keys in tenant JSON config blob. |
| GET | `/v1.2/domain/users/:id` | **API_KEY** | Read one tenant user by `externalUserId` (includes `ky` status, signers, safes). |
| GET | `/v1.2/domain/company/check` | **API_KEY** | KYB pre-check on a French SIREN number (eligibility verdict + company data). |
| GET | `/v1.2/domain/company/check/peppol` | **API_KEY** | Peppol Directory lookup on a French SIREN number (registered, participantId, entityName). |
| GET | `/v1.2/domain/chainid` | **API_KEY** | Tenant aggregate chain/wallet/module view (same payload shape as `/v1.2/users/me/chainid`). |
| GET | `/v1.2/domains/:rpId` | **API_KEY** (or JWT admin) | Read tenant domain metadata and counters; API key only for same `rpId`. |
| GET | `/v1.2/domains/:rpId/quota` | **API_KEY** (or JWT admin) | Read tenant quota stats; API key only for same `rpId`. |

---

## Domains (under `/v1.2/domains/`)

Tenant **`Domain`** rows (WebAuthn **`rpId`**, feature flags, **`apiKey`** for `x-api-key`) are managed under **`/v1.2/domains/...`** on the same host as the other `/v1.2/...` routes.

**Typical onboarding (two steps):** (1) call the **public** challenge endpoint, publish the DNS TXT record, then (2) call **`PUT /v1.2/domains`** with a **user JWT** so the server verifies TXT and returns **`rpId`**, **`apiKey`**, and **`primaryRpId`**.

That is **not** a contradiction: step 1 does not create anything or attach anyone; step 2 both **proves DNS** and **names the human account** that will administer the tenant.

### Why `GET …/dns-challenge` is public but `PUT /v1.2/domains` requires JWT

| Call | What is being decided? | Auth |
|------|------------------------|------|
| **GET** `/v1.2/domains/dns-challenge` | Only: “here is the TXT record to publish, and here is the token the server will expect later.” No `Domain` row is written; **no user is chosen** as admin. Anyone can request instructions for a hostname — but **without DNS control** they cannot complete `PUT`. | **PUBLIC** — avoids forcing a JWT before you even know the operator has DNS access; works from scripts / runbooks. |
| **PUT** `/v1.2/domains` | “DNS matches **and** this **authenticated user** becomes **domain admin** (DB relation `Domain` ↔ `User`).” The implementation **connects** the JWT subject’s user to the domain after verification. | **JWT** — the API must know **which account** receives admin rights; that identity does not exist on the GET. |

DNS ownership is enforced when **PUT** runs (live TXT lookup). The GET does not “trust” the caller with a domain — it only issues a **time-bound challenge**; the **claim** happens on the authenticated PUT.

### Summary — all `/v1.2/domains` endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|-----------|
| GET | `/v1.2/domains/dns-challenge?domain=<fqdn>` | **PUBLIC** | Issue DNS TXT challenge (`_ibex-verify.<domain>` → `ibex-verify=<token>`); token stored in Redis (~1 h). |
| PUT | `/v1.2/domains` | **JWT** | After TXT is visible to the API, verify DNS and **create** (or upgrade) the domain; connect authenticated user as **domain admin**; returns `rpId`, `apiKey`, `primaryRpId`. |
| GET | `/v1.2/domains` | **JWT** | List domains where the user is an **admin** (metadata only — **no** `apiKey`). |
| GET | `/v1.2/domains/:rpId` | **JWT** or **API_KEY** | Domain detail (flags, related domains, assets, admin list, user/signer/safe counts) — **no** `apiKey`; JWT requires admin rights, API key is limited to its own `rpId`. |
| PUT | `/v1.2/domains/:rpId` | **JWT** | Update domain (`primaryRpId`, feature flags, `dailySignupQuota`, `maxIbanPerUser`, …) — admin only. |
| GET | `/v1.2/domains/:rpId/quota` | **JWT** or **API_KEY** | Signup quota stats (rolling 24 h); JWT requires admin rights, API key is limited to its own `rpId`. |

The other **five** routes require **`Authorization: Bearer <access_token>`** (same JWT family as `/v1.2/auth/*`). They are “admin” in the sense of **domain administrator** (user linked as `Domain` admin), not the separate **`/api/admin/…`** HTTP Basic admin UI.

### GET `/v1.2/domains/dns-challenge`

**Query (required):** `domain` — FQDN to verify (e.g. `app.ibex.fi`).

**Response (200):** `domain`, `record` (TXT hostname, e.g. `_ibex-verify.app.ibex.fi`), `type` (`TXT`), `value` (full string including `ibex-verify=` prefix), `ttl` (seconds).

**Errors:** **400** if `domain` missing.

### PUT `/v1.2/domains`

**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json` (and normal `Origin` / `rpId` resolution rules for authenticated routes).

**Body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `domain` | Yes | Same FQDN as in the challenge; must match published TXT. |
| `primaryRpId` | No | Omit → default primary passkey-domain linkage. **`null`** → standalone domain. Non-empty string → ROR link to an existing **standalone** primary domain. |

**Response (200):** `rpId`, `apiKey` (tenant key for `x-api-key`), `primaryRpId` (nullable).

**Typical errors:** no prior challenge / expired (**400**), DNS TXT missing or wrong value (**404** / **400**), domain already verified (**409**), invalid `primaryRpId` (**400**).

### GET `/v1.2/domains`

**Headers:** `Authorization: Bearer <token>`

**Response (200):** JSON array of domains the user administers (`rpId`, `primaryRpId`, quotas, feature flags as strings/enums, `requireApiKeyForAuth`, `createdAt`, …).

**`apiKey`:** **not** returned — tenant API keys are only exposed in the **`PUT /v1.2/domains`** response when the domain is created or DNS-upgraded; list/detail never echo them (same pattern as many APIs: show the secret once at issuance).

### GET `/v1.2/domains/:rpId`

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Full domain payload including `relatedDomains`, `assets`, `admins`, `users` / `signers` / `safes` counts, billing/partner fields when set.

**`apiKey`:** **not** returned here either.

**Errors:** **404** if not found or caller is not an admin of that `rpId`.

### PUT `/v1.2/domains/:rpId`

**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Body:** optional fields only — `primaryRpId` (nullable), `isSwap`, `isLending`, `isTransfer`, `isPrivateLending` (booleans), `dailySignupQuota` (number), `maxIbanPerUser` (number, default `2`). Same ROR / subdomain validation rules as create.

**Errors:** **400** if nothing to update; **404** if not admin.

### GET `/v1.2/domains/:rpId/quota`

**Headers:** `Authorization: Bearer <token>`

**Response (200):** `quota`, `used`, `remaining`, `period` (signup quota service).

**Errors:** **403** if not authorized for that domain’s quota.

---

## Compatibility summary

- **v1.2** — Auth (sign-up, sign-in, email/recover, refresh), recovery, users (including **domain key-value** at `GET`/`PUT`/`PATCH /v1.2/domain/kv`, **user listing** at `GET /v1.2/domain/users` with KY filter, **user lookup** at `GET /v1.2/domain/users/:id`, **KYB pre-check** at `GET /v1.2/domain/company/check`, and **Peppol lookup** at `GET /v1.2/domain/company/check/peppol` — all with domain `x-api-key`), safes, operations, and related `api/…` usage documented above.
- **Domains** (`/v1.2/domains/`): one **public** DNS challenge; create/list/update are **JWT** routes (domain admins); detail/quota can be read with **JWT** (admin) or tenant **`x-api-key`** scoped to its own `rpId`. See the **Domains** section above.

Use **X-Blockchain-Id** (or `blockchainId` query) where chain scope is required (operations, recovery, and chain-scoped `api` routes).

---

## Unified Route Engine (swap + bridge)

The unified route engine is protected behind feature flags:

- `ROUTE_ENGINE_ENABLED=true` to enable route endpoints.
- `ROUTE_ENGINE_BRIDGE_ENABLED=true` to allow cross-chain bridge routes.

When enabled, clients can discover and execute both same-chain swaps and cross-chain bridge routes with a single flow.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1.2/safes/routes/capabilities` | JWT | Returns route mode and supported providers for `(sourceChainId, destinationChainId)` |
| POST | `/v1.2/safes/routes/quote` | JWT | Returns candidate routes and stores the best route as `routeId` |
| GET | `/v1.2/safes/routes/:routeId/status` | JWT | Returns route lifecycle status and execution metadata |

### Route modes

- `SAME_CHAIN_SWAP`: route executed through existing CoW/1inch swap mechanics.
- `CROSS_CHAIN_BRIDGE`: source-chain bridge transaction, destination settlement is asynchronous.
- `UNSUPPORTED`: no provider available for the requested pair/chains.

### Operations integration

New operation type: `ROUTE_FROM_QUOTE`.

- Prepare: `POST /v1.2/safes/operations` with operation `{ "type": "ROUTE_FROM_QUOTE", "quoteId": "<routeId>" }`
- Execute: `PUT /v1.2/safes/operations` with WebAuthn `credential`

### Route status lifecycle

Typical statuses:

- `CREATED`
- `SOURCE_PREPARED`
- `SOURCE_SUBMITTED`
- `SOURCE_CONFIRMED`
- `DEST_PENDING`
- `DEST_COMPLETED`
- `FAILED`
