# IBEx SDK Endpoints

This document lists the HTTP endpoints currently integrated in the IBEx SDK (`sdk/ibex`) and explains how client applications should use them through SDK methods.

## Changelog

- **2026-06-23** `modify` `IbexDevToolsCompanyCheckResponse` type: aligned with structured `POST /api/admin/devtools/company/check` response (`existence`, company identity fields, `representatives`, `beneficiairesEffectifs`, screening details) instead of legacy `OK/KO`.
- **2026-06-03** `modify` `addSepaIban(payload)` -> `POST /v1.2/sepa/iban/add`: behavior now depends on domain flag `isSepaIbanAddWebauthnEnabled`. Added `label` optional parameter to request body.
- **2026-06-03** `create` `confirmSepaIbanAdd(request)` -> `PUT /v1.2/sepa/iban/add`: new method to confirm IBAN creation via WebAuthn assertion (used when `isSepaIbanAddWebauthnEnabled=TRUE`).
- **2026-06-03** `create` `modifySepaIbanLabel(request)` -> `PATCH /v1.2/sepa/iban/modify`: new method to update the label of an existing IBAN.
- **2026-06-03** `modify` `IbexSepaIban` type: added `label` field.
- **2026-06-03** `remove` `POST /v1.2/iban/create`: deprecated endpoint removed from API v1.2 (was never exposed as a dedicated SDK method).
- **2026-05-29** `modify` `signInWithSms(request)` -> `GET /v1.2/auth/sign-in?wallet=sms`: added optional `smsDryRun` query parameter in SDK request type and transport.
- **2026-05-29** `note` `POST /v1.2/iban/create`: API now accepts optional `safeAddress`, but this endpoint is not currently exposed as a dedicated SDK method (SDK IBAN creation stays on `addSepaIban()` -> `POST /v1.2/sepa/iban/add`).

## Scope

The SDK currently integrates:

- Passkey authentication (sign-in with sign-up fallback)
- SMS authentication (sign-up KYC/KYB + sign-in two-step OTP)
- Session refresh
- User profile read/write (**normalized**: `getMe()` returns a flat, typed `IbexNormalizedProfile`)
- User wallet and portfolio resources:
  - balances (**normalized**: `getMeBalances()` returns flat `IbexNormalizedBalances`)
  - transactions (**normalized**: `getMeTransactions()` returns flat `IbexNormalizedTransactions`)
  - addresses
  - signers
  - monitored tokens
  - pools
  - lending
- Chain capability discovery
- Recovery status
- User operations tracking
- Email verification (validate + confirm)
- SMS verification (validate + confirm)
- KYC/KYB iframe onboarding
- Email recovery (public)
- Safe operations (prepare + execute two-step flow):
  - sign message (EIP-191)
  - enable recovery
  - cancel recovery
  - swap from quote
  - route from quote (unified route engine)
  - Hyperliquid operations (deposit, enter vault, withdraw vault, withdraw)
- Swap quote (get DEX quotes from COWSWAP / 1INCH)
- Unified route engine (capabilities, quote, status for swap + bridge)
- SEPA resources:
  - IBAN add (direct + WebAuthn two-step flow) / confirm / modify label / list
  - payment intent/confirmation
  - transactions list/detail
  - mandates create/list/detail/status/cancel
- **WebSocket realtime** (`IbexRealtimeClient`):
  - authenticated connection lifecycle (auth, reconnection, close codes)
  - initial data burst (balance_data, transaction_data, user_data, chainid_data, recovery_data)
  - on-demand requests (get_balance, get_transactions)
  - push events (balance_update, new_transaction, fiat_balance_update, fiat_transaction_update, user_iban_updated, user_ky_updated)
  - **same normalized output types** as HTTP methods (format parity)
- **DevTools** (`IbexDevToolsClient` — separate client, API key / Basic auth):
  - KY dossier management (list, read state, force state, KYC enroll, KYB enroll, SMS verified)
  - Company KYB pre-check (SIREN)
  - Faucet topup (SEPA, crypto)

### SDK Normalization Pattern

The SDK normalizes complex, nested API responses into stable, flat structures. This shields consumers from API format changes and simplifies data access:

| SDK Method | Returns (normalized) | Raw alternative |
|---|---|---|
| `getMe()` | `IbexNormalizedProfile` | `getMeRaw()` |
| `getMeBalances(query?)` | `IbexNormalizedBalances` | `getMeBalancesRaw(query?)` |
| `getMeTransactions(query?)` | `IbexNormalizedTransactions` | `getMeTransactionsRaw(query?)` |

| WebSocket Event | Returns (normalized) | Same type as HTTP |
|---|---|---|
| `balance_data` | `IbexNormalizedBalances` | `getMeBalances()` |
| `transaction_data` | `IbexNormalizedTransactions` | `getMeTransactions()` |
| `user_data` | `IbexNormalizedProfile` | `getMe()` |

- **Normalized methods** flatten nested API structures (e.g. `crypto[chainId][walletAddress]` → flat `wallets[]` array) into typed, developer-friendly objects.
- **Raw methods** return the untouched API response for debugging or advanced use cases.
- **WebSocket events** produce the same normalized types as their HTTP counterparts — a `balance_data` WS event yields the same `IbexNormalizedBalances` as `getMeBalances()`. Subscribe to the `raw` event for the untouched WS payload.
- If the API changes its internal structure, only the SDK normalizers need updating — consumer code remains stable.

## Base URL

All SDK calls are sent to:

- `apiBaseUrl + <endpoint path>`

Example:

- `https://passkeys-testnet.ibex.fi/v1.2/users/me`

## Authentication and Headers

### Public auth endpoints

- No bearer token is required for:
  - `GET /v1.2/auth/sign-in`
  - `POST /v1.2/auth/sign-in`
  - `GET /v1.2/auth/sign-up`
  - `POST /v1.2/auth/sign-up`
  - `POST /v1.2/auth/refresh`

### JWT-protected endpoints

For authenticated user endpoints, the SDK sends both headers automatically:

- `Authorization: Bearer <access_token>`
- `X-IBEx-Auth: Bearer <access_token>`

### Extra integration headers

- During passkey flows, the SDK sends:
  - `X-Rp-Id: <rpId>`
  - `X-RpId: <rpId>`
- If `blockchainId` is configured in the SDK, the SDK sends:
  - `X-Blockchain-Id: <blockchainId>`
  - currently applied on sign-up flow requests

## Endpoint Matrix (SDK Method -> HTTP Endpoint)

| SDK Method | HTTP Method | Endpoint |
|---|---|---|
| `authenticateWithPasskey()` | `GET` | `/v1.2/auth/sign-in` |
| `authenticateWithPasskey()` | `POST` | `/v1.2/auth/sign-in` |
| `authenticateWithPasskey()` (fallback) | `GET` | `/v1.2/auth/sign-up` |
| `authenticateWithPasskey()` (fallback) | `POST` | `/v1.2/auth/sign-up` |
| `signUpWithSms(request)` | `POST` | `/v1.2/auth/sign-up` (wallet=sms) |
| `signInWithSms(request)` | `GET` | `/v1.2/auth/sign-in?wallet=sms` |
| `confirmSmsSignIn(request)` | `POST` | `/v1.2/auth/sign-in` (wallet=sms) |
| `refreshSession()` / `refreshSessionDetailed()` | `POST` | `/v1.2/auth/refresh` |
| `getMe()` | `GET` | `/v1.2/users/me` |
| `getMeRaw()` | `GET` | `/v1.2/users/me` |
| `updateMeData(data)` | `POST` | `/v1.2/users/me` |
| `setAlertFlag(alertKey, enabled)` | `POST` | `/v1.2/users/me` |
| `removeAlertFlag(alertKey)` | `POST` | `/v1.2/users/me` |
| `getMeBalances(query?)` | `GET` | `/v1.2/users/me/balances` |
| `getMeBalancesRaw(query?)` | `GET` | `/v1.2/users/me/balances` |
| `getMeTransactions(query?)` | `GET` | `/v1.2/users/me/transactions` |
| `getMeTransactionsRaw(query?)` | `GET` | `/v1.2/users/me/transactions` |
| `getMeAddress()` | `GET` | `/v1.2/users/me/address` |
| `getMeSigners()` | `GET` | `/v1.2/users/me/signers` |
| `getMeTokens(query?)` | `GET` | `/v1.2/users/me/tokens` |
| `getMeLending(query?)` | `GET` | `/v1.2/users/me/lending` |
| `getChainTokens(query?)` | `GET` | `/v1.2/chain/tokens` |
| `getVaults(query?)` | `GET` | `/v1.2/safes/vaults` |
| `getMeAddressBook()` | `GET` | `/v1.2/users/me/addressbook` |
| `createMeAddressBookEntry(input)` | `POST` | `/v1.2/users/me/addressbook` |
| `updateMeAddressBookEntry(id, input)` | `PUT` | `/v1.2/users/me/addressbook/:id` |
| `deleteMeAddressBookEntry(id)` | `DELETE` | `/v1.2/users/me/addressbook/:id` |
| `addMeAddressBookCrypto(id, input)` | `POST` | `/v1.2/users/me/addressbook/:id/crypto` |
| `deleteMeAddressBookCrypto(id, chainId, address)` | `DELETE` | `/v1.2/users/me/addressbook/:id/crypto/:chainId/:address` |
| `deleteMeAddressBookIban(id, iban)` | `DELETE` | `/v1.2/users/me/addressbook/:id/ibans/:iban` |
| `getChains()` | `GET` | `/v1.2/chains/` |
| `getRecoveryStatus(safeAddress)` | `GET` | `/v1.2/recovery/status/:safeAddress` |
| `getMeOperations(query?)` | `GET` | `/v1.2/users/me/operations` |
| `validateEmail(request)` | `POST` | `/v1.2/users/me/validate-email` |
| `confirmEmail(request)` | `POST` | `/v1.2/users/me/confirm-email` |
| `validateSms(request)` | `POST` | `/v1.2/users/me/validate-sms` |
| `confirmSms(request)` | `POST` | `/v1.2/users/me/confirm-sms` |
| `getKycIframeUrl(request?)` | `POST` | `/v1.2/auth/iframe` |
| `recoverWithEmail(request)` | `POST` | `/v1.2/auth/email/recover` |
| `addSepaIban(payload)` | `POST` | `/v1.2/sepa/iban/add` |
| `confirmSepaIbanAdd(request)` | `PUT` | `/v1.2/sepa/iban/add` |
| `modifySepaIbanLabel(request)` | `PATCH` | `/v1.2/sepa/iban/modify` |
| `getSepaIbans()` | `GET` | `/v1.2/sepa/iban` |
| `createSepaPaymentIntent(payload)` | `POST` | `/v1.2/sepa/payments` |
| `confirmSepaPayment(payload)` | `PUT` | `/v1.2/sepa/payments` |
| `getSepaTransactions(query?)` | `GET` | `/v1.2/sepa/transactions` |
| `getSepaTransactionById(id)` | `GET` | `/v1.2/sepa/transactions/:id` |
| `createSepaMandate(payload)` | `POST` | `/v1.2/sepa/mandates` |
| `getSepaMandates()` | `GET` | `/v1.2/sepa/mandates` |
| `getSepaMandateById(id)` | `GET` | `/v1.2/sepa/mandates/:id` |
| `updateSepaMandateStatus(id, payload)` | `PATCH` | `/v1.2/sepa/mandates/:id/status` |
| `cancelSepaMandate(id)` | `POST` | `/v1.2/sepa/mandates/:id/cancel` |
| `prepareSafeOperations(request)` | `POST` | `/v1.2/safes/operations` |
| `executeSafeOperations(request)` | `PUT` | `/v1.2/safes/operations` |
| `signMessage(safeAddress, message, options?)` | `POST` | `/v1.2/safes/operations` |
| `enableRecovery(safeAddress, identity, options?)` | `POST` | `/v1.2/safes/operations` |
| `cancelRecovery(safeAddress, options?)` | `POST` | `/v1.2/safes/operations` |
| `getSwapQuote(query)` | `GET` | `/v1.2/safes/swap/quote` |
| `swapFromQuote(safeAddress, quoteId, options?)` | `POST` | `/v1.2/safes/operations` |
| `getRouteCapabilities(query)` | `GET` | `/v1.2/safes/routes/capabilities` |
| `getRouteQuote(payload)` | `POST` | `/v1.2/safes/routes/quote` |
| `getRouteStatus(routeId)` | `GET` | `/v1.2/safes/routes/:routeId/status` |
| `routeFromQuote(safeAddress, routeId, options?)` | `POST` | `/v1.2/safes/operations` |
| `hyperliquidDeposit(safeAddress, amount, options?)` | `POST` | `/v1.2/safes/operations` |
| `hyperliquidEnterVault(safeAddress, amount, options?)` | `POST` | `/v1.2/safes/operations` |
| `hyperliquidWithdrawVault(safeAddress, amount, options?)` | `POST` | `/v1.2/safes/operations` |
| `hyperliquidWithdraw(safeAddress, to, amount, options?)` | `POST` | `/v1.2/safes/operations` |
| `morphoSupply(safeAddress, params, options?)` | `POST` | `/v1.2/safes/operations` |
| `morphoWithdraw(safeAddress, params, options?)` | `POST` | `/v1.2/safes/operations` |
| `createRealtimeClient(options?)` | WebSocket | `/ws` |

## Detailed Endpoint Usage

### 1) Authentication

### `authenticateWithPasskey()`

- Purpose: authenticate the user via WebAuthn passkey (sign-in first, sign-up fallback)
- Flow implemented by SDK:
  1. `GET /v1.2/auth/sign-in` to fetch WebAuthn options
  2. Browser passkey assertion via `navigator.credentials.get(...)`
  3. `POST /v1.2/auth/sign-in` with serialized `credential` + enrichment flags
  4. If sign-in does not return usable tokens:
     - `GET /v1.2/auth/sign-up`
     - Browser passkey registration via `navigator.credentials.create(...)`
     - `POST /v1.2/auth/sign-up` with serialized `credential`
- Expected result: stores `access_token` and `refresh_token`
- Example:
  ```typescript
  const sdk = new IbexClient({ apiBaseUrl: "https://passkeys-testnet.ibex.fi" });
  
  await sdk.authenticateWithPasskey();
  // Browser prompts for passkey → SDK stores tokens automatically
  // The enriched sign-in response includes balance, transactions, userdata
  
  const profile = await sdk.getMe();
  console.log("Logged in as:", profile.externalUserId);
  ```
- Notes:
  - The SDK always sends enrichment flags (`includeBalance`, `includeTransactions`, `includeUserdata`) in the POST sign-in body
  - Do not call `getMe()` immediately after auth for data that is already in the enriched sign-in response
  - `externalUserId` is extracted from the auth response `subject` field and stored by the SDK

#### Step 1 — GET `/v1.2/auth/sign-in` (fetch WebAuthn options)

- Query parameters:
  | Param | Type | Default | Description |
  |---|---|---|---|
  | `wallet` | string | `passkeys` | Wallet type: `passkeys`, `kdf`, or `email` |
  | `externalUserId` | string | — | Required for `wallet=kdf` and `wallet=email` |

- Response (passkey challenge):
  ```json
  {
    "credentialRequestOptions": {
      "challenge": "<base64url>",
      "rpId": "demobaas-prat1.ibex.fi",
      "userVerification": "required",
      "timeout": 60000,
      "allowCredentials": [{ "id": "<base64url>", "type": "public-key" }]
    }
  }
  ```
- The SDK passes `credentialRequestOptions` to `navigator.credentials.get()` (after normalizing PRF extensions from base64url to ArrayBuffer).

#### Step 2 — POST `/v1.2/auth/sign-in` (complete assertion)

- Request body sent by SDK:
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `credential` | object | Yes | Serialized `PublicKeyCredential` from `navigator.credentials.get()` |
  | `credential.id` | string | Yes | Credential ID (base64url) |
  | `credential.rawId` | string | Yes | Raw credential ID (base64url) |
  | `credential.type` | string | Yes | Always `"public-key"` |
  | `credential.response.authenticatorData` | string | Yes | Authenticator data (base64url) |
  | `credential.response.clientDataJSON` | string | Yes | Client data (base64url) |
  | `credential.response.signature` | string | Yes | Assertion signature (base64url) |
  | `credential.response.userHandle` | string | — | User handle (base64url, if provided by authenticator) |
  | `credential.clientExtensionResults` | object | — | Client extension outputs (e.g. PRF results) |
  | `includeBalance` | boolean | Yes (SDK default: `true`) | Include token balances in response |
  | `includeTransactions` | boolean | Yes (SDK default: `true`) | Include transaction history in response |
  | `includeUserdata` | boolean | Yes (SDK default: `true`) | Include user custom data in response |
  | `chainId` | number | — | Target chain for balance/transactions (defaults to platform default) |
  | `asyncData` | boolean | — | If `true`, enrichment data is returned asynchronously via `dataRequestId` |
  | `safeAddress` | string | — | Checksummed address to select a specific Safe for the session |
  | `deploySaltNonce` | string | — | `""` for primary Safe, or nonce used at provision |

- Response (200 — passkey, enriched):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "issuer": "demobaas-prat1.ibex.fi",
    "audience": "demobaas-prat1.ibex.fi",
    "subject": "<externalUserId>",
    "roles": ["USER"],
    "authMethod": "PASSKEY",
    "hasPasskey": true,
    "safeAddress": {
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
    "balance": { "...enriched balances..." },
    "transactions": { "...enriched transactions..." },
    "userdata": { "...enriched userdata..." }
  }
  ```
- Response fields extracted by SDK:
  | Field | SDK usage |
  |---|---|
  | `access_token` | Stored for `Authorization` / `X-IBEx-Auth` headers |
  | `refresh_token` | Stored for `refreshSession()` |
  | `subject` | Stored as `externalUserId` |
  | `issuer` | Used as `rpId` for subsequent requests |
  | `balance`, `transactions`, `userdata` | Available immediately — no need to call `getMe()` after sign-in |

- Async enrichment mode (`asyncData: true`): the response returns immediately with `dataRequestId` and `dataStatus: "PENDING"` instead of inline data. Poll `GET /v1.2/auth/sign-in/data/:dataRequestId` for `READY` status (TTL ~180s).

### `refreshSession()` / `refreshSessionDetailed()`

- Endpoint: `POST /v1.2/auth/refresh`
- Purpose: refresh an expired session using the stored refresh token
- Returns: updated tokens (stored automatically by SDK)
- Request body sent by SDK:
  - `{ "refresh_token": "<stored_refresh_token>" }`
- Behavior:
  - updates stored access/refresh tokens
  - `refreshSessionDetailed()` also returns request/response metadata (`status`, `requestId`, payload)
- Example:
  ```typescript
  // Automatic: the SDK retries on 401/403 with a refresh internally
  // Manual refresh if needed:
  await sdk.refreshSession();
  
  // Detailed version (for debugging/logging):
  const details = await sdk.refreshSessionDetailed();
  console.log("Refresh status:", details.status);
  console.log("New token expires in:", details.expires_in, "seconds");
  ```
- Notes:
  - Normally you do not need to call this manually — the SDK auto-refreshes on `401`/`403`
  - Uses single-flight lock: concurrent 401s share one refresh call
  - On refresh failure, the SDK clears session and scoped cache

### 1b) SMS Authentication (`wallet=sms`)

### `signUpWithSms(request)`

- Endpoint: `POST /v1.2/auth/sign-up`
- Purpose: create a new user account with SMS-based authentication (KYC individual or KYB company). Single POST — no prior GET required.
- Returns: `IbexSmsSignUpResponse`
- Auth: PUBLIC (no JWT), but sends rpId headers
- Request body:
  - `telephone: string` (required) — E.164 format (e.g. `+33612345678`)
  - `phonePolicy?: "frMobile" | "any"` — phone validation policy
  - `smsDryRun?: boolean` — if `false`, send a real SMS. Default: `true` in non-production (skip SMS, return `code` in response). Ignored in production.
  - `email?: string` — required for KYB (company) sign-up
  - `companyRegistrationNumber?: string` — SIREN (9 digits) for KYB sign-up
- The SDK automatically adds `wallet: "sms"` to the request body.
- On success: stores `access_token`, `refresh_token`, and `externalUserId` in session.
- Response fields:
  | Field | Description |
  |---|---|
  | `access_token` | JWT for authenticated requests |
  | `refresh_token` | Token for session refresh |
  | `authMethod` | Always `"SMS"` |
  | `externalUserId` | User identifier |
  | `sessionId` | KYC session ID (if applicable) |
  | `chatbotFullURL` | KYC chatbot URL (if applicable) |
  | `code` | OTP code (dev/dryRun mode only — never in production) |
- Example:
  ```typescript
  // KYC (individual) sign-up
  const result = await sdk.signUpWithSms({
    telephone: "+33612345678",
    phonePolicy: "frMobile",
  });
  console.log("Signed up:", result.externalUserId);
  // Session is automatically persisted — SDK is ready for authenticated calls

  // KYB (company) sign-up
  const kybResult = await sdk.signUpWithSms({
    telephone: "+33612345678",
    email: "contact@company.fr",
    companyRegistrationNumber: "123456789",
  });
  ```
- Rate limiting: 3 SMS/day per phone number, 10/day per IP, 100/day per tenant (shared with sign-in).
- Error responses: `400` invalid phone format or missing fields · `429` rate limit exceeded

### `signInWithSms(request)`

- Endpoint: `GET /v1.2/auth/sign-in?wallet=sms&telephone=...`
- Purpose: trigger an OTP SMS to the registered phone number (step 1 of SMS sign-in)
- Returns: `IbexSmsSignInStep1Response`
- Auth: PUBLIC (no JWT), sends rpId headers
- Request:
  - `telephone: string` (required) — E.164 format
  - `phonePolicy?: "frMobile" | "any"`
  - `smsDryRun?: boolean` — if `false`, force real SMS delivery when environment allows it
- Does NOT persist session (OTP not yet confirmed).
- Behavior:
  - If `smsDryRun` is omitted, server default applies (dry-run by default outside production/preprod).
  - In dry-run mode, flood SMS limits are bypassed and `code` can be returned in the response.
- Response fields:
  | Field | Description |
  |---|---|
  | `wallet` | Always `"sms"` |
  | `code` | OTP code (dev/dryRun mode only — never in production) |
- Example:
  ```typescript
  // Step 1: trigger OTP
  const step1 = await sdk.signInWithSms({
    telephone: "+33612345678",
    smsDryRun: false, // optional: request a real SMS when allowed by environment
  });
  // In dev mode, step1.code contains the OTP for testing
  ```
- Rate limiting: same shared counters as sign-up (3/day per phone, 10/day per IP, 100/day per tenant).

### `confirmSmsSignIn(request)`

- Endpoint: `POST /v1.2/auth/sign-in`
- Purpose: confirm the OTP code and obtain a JWT session (step 2 of SMS sign-in)
- Returns: `IbexTokens` (`{ accessToken, refreshToken }`)
- Auth: PUBLIC (no JWT), sends rpId headers
- Request body:
  - `telephone: string` (required) — same phone as step 1
  - `code: string` (required) — 4-8 digit OTP received by SMS
  - `phonePolicy?: "frMobile" | "any"`
- The SDK automatically adds `wallet: "sms"` to the request body.
- On success: stores `access_token`, `refresh_token`, and `externalUserId` in session.
- Example:
  ```typescript
  // Step 2: confirm OTP
  const tokens = await sdk.confirmSmsSignIn({
    telephone: "+33612345678",
    code: "123456",
  });
  console.log("Signed in, token:", tokens.accessToken);
  // Session is persisted — SDK is ready for authenticated calls
  ```
- Error responses: `400` invalid/expired code or missing GET step · `404` phone not registered · `429` rate limit exceeded

#### Full SMS sign-in flow example

```typescript
const sdk = createIbexSdk({ apiBaseUrl: "https://passkeys-testnet.ibex.fi" });

// Step 1: trigger OTP
const step1 = await sdk.signInWithSms({ telephone: "+33612345678" });

// Step 2: user enters code from SMS (or use step1.code in dev mode)
const tokens = await sdk.confirmSmsSignIn({
  telephone: "+33612345678",
  code: userEnteredCode,
});

// Authenticated — use SDK normally
const profile = await sdk.getMe();
```

#### SMS Auth Types

| Type | Purpose |
|---|---|
| `IbexSmsSignUpRequest` | Input for `signUpWithSms` |
| `IbexSmsSignUpResponse` | Full response from SMS sign-up (tokens + metadata) |
| `IbexSmsSignInStep1Request` | Input for `signInWithSms` (trigger OTP) |
| `IbexSmsSignInStep1Response` | Response from step 1 (wallet confirmation + dev code) |
| `IbexSmsSignInConfirmRequest` | Input for `confirmSmsSignIn` (confirm OTP) |

### 2) User Profile

### `getMe()`

- Endpoint: `GET /v1.2/users/me`
- Purpose: fetch authenticated user profile (aggregator endpoint) and return all sections in a normalized, stable structure
- Returns: `IbexNormalizedProfile`
- The SDK normalizes all nested sections:
  - `balances` → reuses `normalizeBalancesResponse()` (flat `wallets[]` array)
  - `transactions` → reuses `normalizeTransactionsResponse()` (flat `chains[]` array)
  - `addresses.wallets[]` → extracts `eoaAddresses` from `derived.global.eoaAddresses`
  - `signers`, `ibans`, `addressbook`, `kycStatus` → passed through as typed arrays/objects
- Extracts and stores `externalUserId` automatically
- Example response:
  ```json
  {
    "externalUserId": "081d27b9-e104-4bb1-8642-c2d0a6a054db",
    "rpId": "demobaas-prat1.ibex.fi",
    "signerId": "rmnbKSPCYpxpItqnwA5sjQ",
    "wallets": [
      {
        "safeAddress": "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
        "chainIds": [421614],
        "threshold": 1,
        "primary": true,
        "eoaAddresses": [
          { "type": "EVM", "address": "0xdF8cdB35B17D3CD8E70998Fc966F161B241F7c03" },
          { "type": "SOLANA", "address": "FRZqVAAEXmD83Lza143RMxBC9EW3FD83PtXi9D8muz8T" },
          { "type": "BITCOIN_P2WPKH", "address": "bc1qtfce4a3g3757k0m6sruw8jalu853sjpl8hnspk" }
        ]
      },
      {
        "safeAddress": "0x67B3A55a4327c2e1e5ea805fFD3cC91d20707e79",
        "chainIds": [100],
        "threshold": 1,
        "primary": false,
        "eoaAddresses": [
          { "type": "EVM", "address": "0xdF8cdB35B17D3CD8E70998Fc966F161B241F7c03" }
        ]
      }
    ],
    "signers": [
      {
        "id": "rmnbKSPCYpxpItqnwA5sjQ",
        "type": "PASSKEY",
        "walletMode": "SAFE_4337",
        "keyName": "TEST",
        "createdAt": "2026-05-10T13:41:35.132Z",
        "safesCount": 2
      }
    ],
    "ibans": [],
    "balances": {
      "timestamp": "2026-05-14T19:14:57.613Z",
      "prices_available": true,
      "wallets": [
        {
          "chainId": "421614",
          "walletAddress": "0x391ff3676e591b1772c5f89b0a6c569ee42d30b8",
          "tokens": [
            { "symbol": "BTC-IBEX", "balance": "0.01137212", "price_eur": 62726.4, "value_eur": "713.33" },
            { "symbol": "ETH-IBEX", "balance": "0.005", "price_eur": 903.96, "value_eur": "4.52" },
            { "symbol": "EUR-IBEX", "balance": "0.020221", "price_eur": 0.740937, "value_eur": "0.01" }
          ],
          "pending": []
        }
      ],
      "totals": {
        "crypto_total_value_eur": "729.69",
        "grand_total_value_eur": "729.69",
        "conversion_rate_eur_usd": 1.1797
      }
    },
    "transactions": {
      "type": "mixed",
      "timestamp": "2026-05-14T19:14:57.719Z",
      "prices_available": true,
      "chains": [
        {
          "chainId": "421614",
          "total": 20,
          "page": 1,
          "limit": 50,
          "totalPages": 1,
          "transactions": [
            {
              "id": 151762,
              "transactionHash": "0x32ba10bb358009c9c333d9bd42714d2cc75206e2e97860d20e9a974c7e76fd40",
              "from": "0x0795239e54a9b6f97413ca84688f7a93b9a0640e",
              "to": "0x391ff3676e591b1772c5f89b0a6c569ee42d30b8",
              "tokenSymbol": "XAU-IBEX",
              "valueFormatted": 0.006,
              "direction": "IN",
              "value_eur": "11.81"
            }
          ]
        }
      ],
      "fiat": { "total": 0, "page": 1, "limit": 50, "totalPages": 0, "transactions": [] }
    },
    "kycStatus": {
      "externalUserId": "081d27b9-e104-4bb1-8642-c2d0a6a054db",
      "kycLevel": "0",
      "status": "not_started",
      "verified": false
    },
    "addressbook": [],
    "data": null
  }
  ```

### `getMeRaw()`

- Endpoint: `GET /v1.2/users/me`
- Purpose: return the raw API aggregator response without SDK normalization
- Returns: `IbexUserProfile`
- Use this if you need the original API structure (nested `addresses.wallets[].derived.global.eoaAddresses`, `balances.crypto[chainId][walletAddress]`, `transactions.crypto.chains[]`, etc.)

### `updateMeData(data)`

- Endpoint: `POST /v1.2/users/me`
- Purpose: write arbitrary key-value data for the authenticated user
- Returns: `IbexUserProfile`
- Request body sent by SDK:
  - `{ "data": { ... } }`
- Example request:
  ```json
  {
    "data": {
      "email": "user@example.com",
      "language": "fr",
      "optin.newsletter": true,
      "private.tier": "gold"
    }
  }
  ```
- Example response:
  ```json
  { "success": true }
  ```
- Notes:
  - Keys prefixed with `private.` are stored but never returned by `GET /v1.2/users/me`
  - Commonly used for: language, email, notification preferences, optin flags

### `setAlertFlag(alertKey, enabled)` / `removeAlertFlag(alertKey)`

- Endpoint: `POST /v1.2/users/me` (built on top of `updateMeData`)
- Purpose: toggle or remove a single flag key in userdata
- Returns: `IbexUserProfile`
- Example — enable:
  ```typescript
  await sdk.setAlertFlag("optin.newsletter", true);
  // sends: { "data": { "optin.newsletter": true } }
  ```
- Example — remove:
  ```typescript
  await sdk.removeAlertFlag("optin.newsletter");
  // sends: { "data": { "optin.newsletter": null } }
  ```

### 3) Portfolio and Wallet Resources

### `getMeBalances(query?)`

- Endpoint: `GET /v1.2/users/me/balances`
- Supported query params in SDK:
  - `walletAddress?: string` — scope to a single wallet
  - `iban?: string` — scope to a single IBAN (mutually exclusive with `walletAddress`)
  - `blockchainId?: string | number` — scope to a single chain; omit for all-chain aggregated mode
  - `includeZero?: boolean`
  - `includePrices?: boolean`
  - `page?: number`
  - `limit?: number`
- **Returns `IbexNormalizedBalances`** — the SDK normalizes the API response into a stable, flat structure regardless of the API mode (aggregated or scoped):
  ```
  {
    timestamp?: string,
    prices_available?: boolean,
    wallets: [
      { chainId, walletAddress, tokens: [...], pending: [...] },
      { chainId, walletAddress, tokens: [...], pending: [...] },
      ...
    ],
    totals?: { grand_total_value_eur, grand_total_value_usd, ... }
  }
  ```
- The `wallets` array is always flat — the SDK flattens the API's nested `crypto[chainId][walletAddress]` structure automatically.
- Token fields include: `tokenAddress`, `primaryAddress`, `symbol`, `decimals`, `balance`, `price_usd`, `price_eur`, `value_usd`, `value_eur`, `price_source`, etc.
- Example response:
  ```json
  {
    "timestamp": "2026-05-14T19:14:57.613Z",
    "prices_available": true,
    "wallets": [
      {
        "chainId": "421614",
        "walletAddress": "0x391ff3676e591b1772c5f89b0a6c569ee42d30b8",
        "tokens": [
          {
            "tokenAddress": "0xb21ef1146d0cba9d4ad0d5494731bfc0b8ef7637",
            "primaryAddress": "0xb21ef1146d0cba9d4ad0d5494731bfc0b8ef7637",
            "secondaryAddress": null,
            "active": true,
            "symbol": "BTC-IBEX",
            "decimals": 8,
            "balance": "0.01137212",
            "price_usd": 67744.28,
            "price_eur": 62726.4,
            "value_usd": "770.40",
            "value_eur": "713.33",
            "price_updated_at": "2026-05-14T19:14:01.862Z",
            "price_source": "FAUCET_PRICE"
          },
          {
            "tokenAddress": "0x12bfd5e8b232f8067976a6238f29864cb440c12d",
            "primaryAddress": "0x12bfd5e8b232f8067976a6238f29864cb440c12d",
            "secondaryAddress": null,
            "active": true,
            "symbol": "ETH-IBEX",
            "decimals": 18,
            "balance": "0.005",
            "price_usd": 976.75,
            "price_eur": 903.96,
            "value_usd": "4.88",
            "value_eur": "4.52",
            "price_updated_at": "2026-05-14T19:14:01.916Z",
            "price_source": "FAUCET_PRICE"
          }
        ],
        "pending": []
      }
    ],
    "totals": {
      "crypto_total_value_eur": "729.69",
      "fiat_total_value_eur": "0.00",
      "grand_total_value_eur": "729.69",
      "crypto_total_value_usd": "788.08",
      "fiat_total_value_usd": "0.00",
      "grand_total_value_usd": "788.08",
      "conversion_rate_eur_usd": 1.1797
    }
  }
  ```

### `getMeBalancesRaw(query?)`

- Same endpoint and query params as `getMeBalances()`.
- Returns `IbexUserBalancesResponse` — the raw API response without normalization.
- Use this if you need the original API structure (e.g. for debugging or advanced use cases).

### `getMeTransactions(query?)`

- Endpoint: `GET /v1.2/users/me/transactions`
- Supported query params in SDK:
  - `walletAddress?: string`
  - `iban?: string`
  - `scope?: "mixed" | "crypto" | "fiat"`
  - `blockchainId?: string | number`
  - `startDate?: string`
  - `endDate?: string`
  - `direction?: string`
  - `tokenType?: string`
  - `tokenAddress?: string`
  - `hash?: string`
  - `page?: number`
  - `limit?: number`
  - `includePrices?: boolean`
- **Returns `IbexNormalizedTransactions`** — the SDK normalizes the API response into a stable, flat structure regardless of the API mode (aggregated or scoped):
  ```
  {
    type?: string,           // "mixed" | "crypto" | "fiat"
    timestamp?: string,
    prices_available?: boolean,
    chains: [
      {
        chainId: "421614",
        total: 117,
        page: 1,
        limit: 50,
        totalPages: 3,
        transactions: [ { id, transactionHash, from, to, tokenSymbol, valueFormatted, direction, ... }, ... ]
      },
      {
        chainId: "100",
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
        transactions: [...]
      }
    ],
    fiat?: { total, page, limit, totalPages, transactions: [...] }
  }
  ```
- The `chains` array is always flat — the SDK flattens the API's nested `crypto.transactions[chainId]` structure automatically.
- Each transaction includes: `id`, `transactionHash`, `from`, `to`, `tokenAddress`, `tokenSymbol`, `value`, `valueFormatted`, `direction`, `blockchainId`, `price_usd`, `price_eur`, `value_usd`, `value_eur`, etc.
- Pagination info (`total`, `page`, `limit`, `totalPages`) is preserved per chain.
- Example response:
  ```json
  {
    "type": "mixed",
    "timestamp": "2026-05-14T19:19:45.703Z",
    "prices_available": true,
    "chains": [
      {
        "chainId": "421614",
        "total": 20,
        "page": 1,
        "limit": 50,
        "totalPages": 1,
        "transactions": [
          {
            "id": 151762,
            "blockNumber": 268319481,
            "transactionHash": "0x32ba10bb358009c9c333d9bd42714d2cc75206e2e97860d20e9a974c7e76fd40",
            "timestamp": "2026-05-14T10:38:56.000Z",
            "from": "0x0795239e54a9b6f97413ca84688f7a93b9a0640e",
            "to": "0x391ff3676e591b1772c5f89b0a6c569ee42d30b8",
            "tokenAddress": "0xd04041a2b7cd12dc0e34ca974cdd3afbde70c6f7",
            "tokenSymbol": "XAU-IBEX",
            "tokenType": "ERC20",
            "value": "6000000000000000",
            "valueFormatted": 0.006,
            "direction": "IN",
            "blockchainId": "421614",
            "price_usd": 2111.62,
            "price_eur": 1955.48,
            "value_usd": "12.67",
            "value_eur": "11.73",
            "price_source": "FAUCET_PRICE"
          },
          {
            "id": 151744,
            "blockNumber": 268315543,
            "transactionHash": "0xf45802b3ffe091ebfe805c86beb441e39f5b785808deec67d8815390b2a3bac8",
            "timestamp": "2026-05-14T10:22:12.000Z",
            "from": "0xc45b875fe9a7166eb977ea4e7c7df1ec4b0ce8bd",
            "to": "0x391ff3676e591b1772c5f89b0a6c569ee42d30b8",
            "tokenAddress": "0x12bfd5e8b232f8067976a6238f29864cb440c12d",
            "tokenSymbol": "ETH-IBEX",
            "tokenType": "ERC20",
            "value": "5000000000000000",
            "valueFormatted": 0.005,
            "direction": "IN",
            "blockchainId": "421614",
            "price_usd": 979.99,
            "price_eur": 906.98,
            "value_usd": "4.90",
            "value_eur": "4.53",
            "price_source": "FAUCET_PRICE"
          }
        ]
      },
      {
        "chainId": "100",
        "total": 1,
        "page": 1,
        "limit": 50,
        "totalPages": 1,
        "transactions": [
          {
            "id": 151927,
            "transactionHash": "0x4d8249e797bd491f33cfc53e2b1ca60af4ebbd077903efc7de605ed26ab4fad3",
            "timestamp": "2026-05-14T14:53:55.000Z",
            "from": "0x93d708cd8e669a0b8bd3e2bc3b58ce02168322b4",
            "to": "0x67b3a55a4327c2e1e5ea805ffd3cc91d20707e79",
            "tokenAddress": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
            "tokenSymbol": "EURe",
            "tokenType": "ERC20",
            "valueFormatted": 2,
            "direction": "IN",
            "blockchainId": "100",
            "price_eur": 1,
            "value_eur": "2.00"
          }
        ]
      }
    ],
    "fiat": { "total": 0, "page": 1, "limit": 50, "totalPages": 0, "transactions": [] }
  }
  ```

### `getMeTransactionsRaw(query?)`

- Same endpoint and query params as `getMeTransactions()`.
- Returns `IbexUserTransactionsResponse` — the raw API response without normalization.
- Use this if you need the original API structure (e.g. for debugging or advanced use cases).

### `getMeAddress()`

- Endpoint: `GET /v1.2/users/me/address`
- Purpose: return user wallet addresses grouped per Safe across all deployed chains, including per-chain module status (recovery, automation) and derived addresses (EOA, Solana, Bitcoin, etc.)
- Returns: `IbexUserAddressResponse`
- Example response:
  ```json
  {
    "rpId": "demobaas-prat1.ibex.fi",
    "externalUserId": "081d27b9-e104-4bb1-8642-c2d0a6a054db",
    "signerId": "rmnbKSPCYpxpItqnwA5sjQ",
    "count": 2,
    "wallets": [
      {
        "safeAddress": "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
        "chainIds": [421614],
        "threshold": 1,
        "chains": [
          { "chainId": 421614 }
        ],
        "createdAt": "2026-05-10T13:41:35.183Z",
        "updatedAt": "2026-05-10T13:41:35.230Z",
        "primary": true,
        "derived": {
          "perSafe": {},
          "global": {
            "eoaAddresses": [
              { "type": "EVM", "address": "0xdF8cdB35B17D3CD8E70998Fc966F161B241F7c03" },
              { "type": "SOLANA", "address": "FRZqVAAEXmD83Lza143RMxBC9EW3FD83PtXi9D8muz8T" },
              { "type": "BITCOIN_P2WPKH", "address": "bc1qtfce4a3g3757k0m6sruw8jalu853sjpl8hnspk" },
              { "type": "BITCOIN_P2TR", "address": "bc1pjf26w7zgq3ycfwmu8wqs0f4hhv3xm6svlvqzn23e549c60jymq5st9r2hn" },
              { "type": "BITCOIN_P2WPKH_TESTNET", "address": "tb1qtfce4a3g3757k0m6sruw8jalu853sjpld3gr69" },
              { "type": "BITCOIN_P2TR_TESTNET", "address": "tb1pjf26w7zgq3ycfwmu8wqs0f4hhv3xm6svlvqzn23e549c60jymq5sud49du" },
              { "type": "COSMOS", "address": "cosmos1ckdg8zhvtjylkaf9jph5z8hhcuwe3q8z2nr27j" },
              { "type": "POLKADOT", "address": "1LHqnBWNP4TH6fHHybRWwJBqGKiB8N7gRracuAt15j2oJfn" },
              { "type": "TEZOS_TZ1", "address": "tz1fWJooYCsyuPkd8QgDwYRzEsmhvxVrLK5s" },
              { "type": "TEZOS_TZ2", "address": "tz28gusVPy1UwXH1Yg6C54A33xEXCMPqEJe2" }
            ]
          }
        }
      },
      {
        "safeAddress": "0x67B3A55a4327c2e1e5ea805fFD3cC91d20707e79",
        "chainIds": [100],
        "threshold": 1,
        "chains": [
          { "chainId": 100 }
        ],
        "createdAt": "2026-05-10T13:41:36.080Z",
        "updatedAt": "2026-05-10T13:41:36.080Z",
        "primary": false,
        "derived": {
          "perSafe": {},
          "global": {
            "eoaAddresses": [
              { "type": "EVM", "address": "0xdF8cdB35B17D3CD8E70998Fc966F161B241F7c03" },
              { "type": "SOLANA", "address": "FRZqVAAEXmD83Lza143RMxBC9EW3FD83PtXi9D8muz8T" }
            ]
          }
        }
      }
    ]
  }
  ```

### `getMeSigners()`

- Endpoint: `GET /v1.2/users/me/signers`
- Purpose: return signer identities attached to the authenticated user (PASSKEY, EOA, EMAIL_TOKEN)
- Returns: `IbexUserSignersResponse`
- Example response:
  ```json
  {
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
  }
  ```

### `getMeTokens(query?)`

- Endpoint: `GET /v1.2/users/me/tokens`
- Purpose: return the tokens the authenticated user has interacted with (based on transaction history)
- Returns: `IbexUserTokensResponse`
- Supported query params (`IbexTokensQuery`):
  - `blockchainId?: string | number` — scope to a single chain (flat array); omit for all chains (grouped)
- Behavior:
  - With `blockchainId`: returns a flat array of tokens for that chain
  - Without `blockchainId`: returns tokens grouped by `blockchainId`
- Example response (chain 421614 — all tokens from testnet faucet catalog):
  ```json
  [
    {
      "address": "0x18e632ae0704ab92cf4f49472b583498ff5258cc",
      "symbol": "EUR-IBEX",
      "name": "EUR-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0x5a0fc8a0d0d4aabc4506dc348d1dd9258ce78f4d",
      "symbol": "USD-IBEX",
      "name": "USD-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0xcef99a37939d4db1adbc89d4d2f62913557d592d",
      "symbol": "GBP-IBEX",
      "name": "GBP-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0x69ebf0518202681e27480e9cd0cdd576c8157a40",
      "symbol": "CHF-IBEX",
      "name": "CHF-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0xb21ef1146d0cba9d4ad0d5494731bfc0b8ef7637",
      "symbol": "BTC-IBEX",
      "name": "BTC-IBEX",
      "decimals": 8,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0x12bfd5e8b232f8067976a6238f29864cb440c12d",
      "symbol": "ETH-IBEX",
      "name": "ETH-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0xd04041a2b7cd12dc0e34ca974cdd3afbde70c6f7",
      "symbol": "XAU-IBEX",
      "name": "XAU-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0x9f52564b705d2c415987cd1458efd04da165de86",
      "symbol": "JPY-IBEX",
      "name": "JPY-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0x551acb8977ef83849aa61aa3f823fd69029c4ac3",
      "symbol": "CAD-IBEX",
      "name": "CAD-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0x878fc5582e7cdf95485f36038e3f72b9b1d0f791",
      "symbol": "AUD-IBEX",
      "name": "AUD-IBEX",
      "decimals": 18,
      "blockchainId": "421614",
      "secondaryAddress": null,
      "active": true
    },
    {
      "address": "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
      "symbol": "EURe",
      "name": "Monerium EUR emoney",
      "decimals": 18,
      "blockchainId": "100",
      "secondaryAddress": "0xcb444e90d8198415266c6a2724b7900fb12fc56e",
      "active": true
    }
  ]
  ```

### `getMeLending(query?)`

- Endpoint: `GET /v1.2/users/me/lending`
- Purpose: return the lending/vault catalog. Supports AAVE, MORPHO, and HYPERLIQUID providers.
- Returns: `IbexUserLendingResponse` (array of `IbexLendingEntry`)
- Supported query params (`IbexLendingQuery`):
  - `userScoped?: boolean` — when `true`, restricts results to chains where the user has watched addresses (replaces former `/me/pools`)
  - `blockchainId?: string | number` — filter by chain ID
- Example request:
  ```typescript
  const allLending = await sdk.getMeLending();
  const userLending = await sdk.getMeLending({ userScoped: true });
  const baseLending = await sdk.getMeLending({ blockchainId: "8453" });
  ```
- Response fields per entry: `id`, `blockchainId`, `provider` (`"AAVE"` | `"MORPHO"` | `"HYPERLIQUID"`), `address`, `name`, `assetTicker`, `assetAddress`, `assetDecimals`, `apy`, `tvl`, `isDefault`, `acceptedTokenAddresses`, `leader`, `leaderCommission`
- Notes:
  - `userScoped=true` with no watched addresses returns `404`
  - The former `getMePools()` method has been removed — use `getMeLending({ userScoped: true })` instead

### `getChainTokens(query?)`

- Endpoint: `GET /v1.2/chain/tokens`
- Purpose: return the full token catalog (all monitored tokens, not user-scoped). Prefer `getMeTokens()` for user-specific tokens.
- Returns: `IbexUserTokensResponse`
- Supported query params (`IbexTokensQuery`):
  - `blockchainId?: string | number` — scope to a single chain
- Example request:
  ```typescript
  const allTokens = await sdk.getChainTokens();
  const chainTokens = await sdk.getChainTokens({ blockchainId: "421614" });
  ```
- Notes:
  - This is a configuration-oriented endpoint — it serves the full token catalog, not user balances

### `getVaults(query?)`

- Endpoint: `GET /v1.2/safes/vaults`
- Purpose: return the catalog of active DeFi lending pools/vaults across providers (AAVE, MORPHO, HYPERLIQUID)
- Returns: `IbexVaultsResponse` (array of `IbexVaultEntry`)
- Supported query params (`IbexVaultsQuery`):
  - `provider?: "AAVE" | "MORPHO" | "HYPERLIQUID"` — filter by provider
  - `blockchainId?: string | number` — filter by chain ID
- Example request:
  ```typescript
  const allVaults = await sdk.getVaults();
  const morphoVaults = await sdk.getVaults({ provider: "MORPHO", blockchainId: "8453" });
  ```
- Response fields per entry: `id`, `blockchainId`, `provider`, `poolAddress`, `name`, `assetTicker`, `assetAddress`, `assetDecimals`, `apy`, `tvl`, `isDefault`, `metadata` (provider-specific), `supplyToken`

### `getMeAddressBook()`

- Endpoint: `GET /v1.2/users/me/addressbook`
- Purpose: return the user's unified address book (SEPA + crypto contacts in a single list)
- Response shape:
  - `{ success: boolean, data: [ { id, name, label?, userValidated?, crypto?, ibans?, createdAt?, updatedAt? } ] }`
- Example response:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "a3f7c892-1d4e-4b8a-9c2f-6e5d3a1b0f47",
        "name": "IBEX Faucet 01",
        "label": "Testnet faucet",
        "userValidated": true,
        "crypto": [
          { "chainId": "421614", "address": "0x0795239e54A9b6f97413cA84688f7a93b9A0640e" }
        ],
        "ibans": [
          {
            "iban": "FR7616748000014733062059352",
            "bic": "BUMDFRP2",
            "holderName": "IBEX Faucet 01",
            "vop": true,
            "vopResult": "MTCH",
            "createdAt": "2026-05-10T14:22:11.000Z"
          }
        ],
        "createdAt": "2026-05-10T14:22:11.000Z",
        "updatedAt": "2026-05-12T09:30:45.000Z"
      },
      {
        "id": "b8e4d156-3a7f-42c1-b5e9-8f2a1c6d0e93",
        "name": "Wallet B",
        "label": null,
        "userValidated": false,
        "crypto": [
          { "chainId": "421614", "address": "0x74a9b04c7bab3d3bad1a0a06589a24a67a6f9127" },
          { "chainId": "100", "address": "0x74a9b04c7bab3d3bad1a0a06589a24a67a6f9127" }
        ],
        "ibans": [],
        "createdAt": "2026-05-11T16:05:33.000Z",
        "updatedAt": "2026-05-11T16:05:33.000Z"
      }
    ]
  }
  ```

### `createMeAddressBookEntry(input)`

- Endpoint: `POST /v1.2/users/me/addressbook`
- Purpose: create a new contact in the unified address book (SEPA + crypto)
- Returns: created entry object
- Request body:
  - `name: string` (required)
  - `label?: string`
  - `userValidated?: boolean`
  - `crypto?: Array<{ chainId, address }>`
  - `iban?: string` (must be paired with `respondingPspBic`)
  - `respondingPspBic?: string` (must be paired with `iban`)
  - `remittanceInfo?: string`
- SDK behavior:
  - throws a client-side error if only one of `iban` / `respondingPspBic` is provided
- Example — crypto-only contact:
  ```typescript
  const entry = await sdk.createMeAddressBookEntry({
    name: "IBEX Faucet 01",
    label: "Testnet faucet",
    crypto: [
      { chainId: "421614", address: "0x0795239e54A9b6f97413cA84688f7a93b9A0640e" }
    ]
  });
  console.log("Created entry:", entry.id);
  ```
- Example — SEPA contact (with automatic VoP):
  ```typescript
  const entry = await sdk.createMeAddressBookEntry({
    name: "IBEX Faucet 01",
    iban: "FR7616748000014733062059352",
    respondingPspBic: "BUMDFRP2"
  });
  // VoP is executed internally — do not call a separate VoP endpoint
  ```
- Example — combined SEPA + crypto contact:
  ```typescript
  const entry = await sdk.createMeAddressBookEntry({
    name: "IBEX Faucet 01",
    label: "Testnet faucet",
    crypto: [
      { chainId: "421614", address: "0x0795239e54A9b6f97413cA84688f7a93b9A0640e" }
    ],
    iban: "FR7616748000014733062059352",
    respondingPspBic: "BUMDFRP2"
  });
  ```

### `updateMeAddressBookEntry(id, input)`

- Endpoint: `PUT /v1.2/users/me/addressbook/:id`
- Purpose: update metadata of an existing address book entry
- Returns: updated entry object
- Request body supports partial updates:
  - `name?: string`
  - `label?: string`
  - `userValidated?: boolean`
- Example:
  ```typescript
  await sdk.updateMeAddressBookEntry("a3f7c892-1d4e-4b8a-9c2f-6e5d3a1b0f47", {
    label: "Main faucet",
    userValidated: true
  });
  ```

### `deleteMeAddressBookEntry(id)`

- Endpoint: `DELETE /v1.2/users/me/addressbook/:id`
- Purpose: permanently delete an address book entry and all its sub-resources (crypto addresses, IBANs)
- Example:
  ```typescript
  await sdk.deleteMeAddressBookEntry("b8e4d156-3a7f-42c1-b5e9-8f2a1c6d0e93");
  ```

### `addMeAddressBookCrypto(id, input)`

- Endpoint: `POST /v1.2/users/me/addressbook/:id/crypto`
- Purpose: add a crypto address to an existing address book entry
- Request body:
  - `chainId: string | number`
  - `address: string`
- Example:
  ```typescript
  await sdk.addMeAddressBookCrypto("a3f7c892-1d4e-4b8a-9c2f-6e5d3a1b0f47", {
    chainId: "100",
    address: "0x0795239e54A9b6f97413cA84688f7a93b9A0640e"
  });
  ```

### `deleteMeAddressBookCrypto(id, chainId, address)`

- Endpoint: `DELETE /v1.2/users/me/addressbook/:id/crypto/:chainId/:address`
- Purpose: remove a specific crypto address from an address book entry
- SDK behavior: URL-encodes `chainId` and `address` path params
- Example:
  ```typescript
  await sdk.deleteMeAddressBookCrypto(
    "a3f7c892-1d4e-4b8a-9c2f-6e5d3a1b0f47",
    "100",
    "0x0795239e54A9b6f97413cA84688f7a93b9A0640e"
  );
  ```

### `deleteMeAddressBookIban(id, iban)`

- Endpoint: `DELETE /v1.2/users/me/addressbook/:id/ibans/:iban`
- Purpose: remove a specific IBAN from an address book entry
- SDK behavior: URL-encodes `iban` path param
- Example:
  ```typescript
  await sdk.deleteMeAddressBookIban(
    "a3f7c892-1d4e-4b8a-9c2f-6e5d3a1b0f47",
    "FR7616748000014733062059352"
  );
  ```

### 4) Chain Capability Discovery

### `getChains()`

- Endpoint: `GET /v1.2/chains/`
- Purpose: return active chains and their enabled modules. Used to gate features (transfer, recovery, automation, multi-sig, cowswap) per chain before enabling them in UI.
- Returns: `IbexChainsResponse` — `Array<IbexChain>`
- Example response:
  ```json
  [
    {
      "id": 421614,
      "name": "Arbitrum Sepolia",
      "icon": "https://passkeys-prat1.ibex.fi/images/arbitrum-logo.png",
      "explorerAddress": "https://sepolia.arbiscan.io/address/",
      "explorerTx": "https://sepolia.arbiscan.io/tx/",
      "modules": {
        "billing": true,
        "cowswap": false,
        "recovery": true,
        "automation": true
      }
    },
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
- Usage:
  - Resolve user chain context from `getMe()` → `wallets[].chainIds[]` (each wallet lists its chain IDs)
  - Join wallet chain IDs with `getChains()` entries by `id` to get chain `name` and `modules`
  - If a user has a wallet on a chain but a module is `false` in `getChains()`, the feature must stay hidden/disabled for that chain
- Example — feature gating:
  ```typescript
  const profile = await sdk.getMe();
  const chains = await sdk.getChains();
  
  for (const wallet of profile.wallets) {
    for (const chainId of wallet.chainIds) {
      const chain = chains.find(c => c.id === chainId);
      console.log(`${wallet.safeAddress} on ${chain?.name}:`);
      console.log(`  Recovery: ${chain?.modules?.recovery ? "enabled" : "disabled"}`);
      console.log(`  CowSwap: ${chain?.modules?.cowswap ? "enabled" : "disabled"}`);
    }
  }
  ```

### 5) Recovery

### `getRecoveryStatus(safeAddress)`

- Endpoint: `GET /v1.2/recovery/status/:safeAddress`
- Purpose: retrieve the recovery status of a Safe, including pending and executed recovery operations
- Returns: `IbexRecoveryStatusResponse`
- Parameters:
  - `safeAddress: string` (required, EVM address, case-insensitive)
- Example:
  ```typescript
  const status = await sdk.getRecoveryStatus("0x391ff3676e591b1772C5f89B0a6C569EE42d30b8");
  
  if (status.recoveryEnabled) {
    console.log("Recovery is active");
    console.log("Recovery address:", status.recoveryAddress);
    console.log("Delay:", status.delay, "seconds");
  } else {
    console.log("Recovery not enabled — use enableRecovery() to activate");
  }
  
  if (status.pendingRecovery) {
    console.log("Pending recovery operations:", status.pending?.length);
  }
  ```
- Example response:
  ```json
  {
    "safeAddress": "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
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
- Notes:
  - Complements `enableRecovery()` and `cancelRecovery()` — call this to check status before toggling
  - Chain scope can be set via `blockchainId` at SDK initialization

### 6) User Operations

### `getMeOperations(query?)`

- Endpoint: `GET /v1.2/users/me/operations`
- Purpose: retrieve all on-chain operations for the authenticated user's wallets, grouped by Safe address
- Returns: `IbexUserOperationsResponse`
- Supported query params in SDK:
  - `status?: string` — filter by operation status (`CREATED`, `SIGNED`, `EXECUTED`, `CONFIRMED`, `FAILED`)
  - `limit?: number`
  - `offset?: number`
- Example:
  ```typescript
  const ops = await sdk.getMeOperations();
  
  for (const [safeAddress, operations] of Object.entries(ops.data || {})) {
    console.log(`Safe ${safeAddress}: ${operations.length} operations`);
    for (const op of operations) {
      console.log(`  ${op.type} — ${op.safeOperation?.status} — ${op.safeOperation?.userOpHash}`);
    }
  }
  
  // Filter by status
  const pending = await sdk.getMeOperations({ status: "SIGNED" });
  ```
- Example response:
  ```json
  {
    "data": {
      "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8": [
        {
          "id": "op_01HXYZ8K3S7W...",
          "createdAt": "2026-05-14T16:58:19.903Z",
          "updatedAt": "2026-05-14T16:58:19.903Z",
          "index": 0,
          "type": "TRANSFER_TOKEN",
          "data": {},
          "safeOperation": {
            "userOpHash": "0x6cdab85147c3472499aa9859e1af51844d853f098d57ca14baf977a83c6f7400",
            "status": "EXECUTED",
            "paymaster": "SPONSORED",
            "safeAddress": "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
            "transactionHash": "0x32ba10bb358009c9c333d9bd42714d2cc75206e2e97860d20e9a974c7e76fd40",
            "signatures": [
              {
                "createdAt": "2026-05-14T16:58:20.100Z",
                "signerId": "rmnbKSPCYpxpItqnwA5sjQ"
              }
            ]
          }
        }
      ]
    }
  }
  ```
- Notes:
  - Operations are grouped by Safe address (map structure)
  - Ordered by `createdAt` descending (most recent first)
  - Useful for displaying operation history and tracking pending transactions after `executeSafeOperations()`

### 7) Email Verification

### `validateEmail(request)`

- Endpoint: `POST /v1.2/users/me/validate-email`
- Purpose: send an email verification code to the user (step 1 of email onboarding)
- Returns: `IbexValidateEmailResponse` (upstream passthrough)
- Request body:
  - `email: string` (required)
  - `externalUserId: string` (required)
- Example:
  ```typescript
  // Step 1: Send verification code
  await sdk.validateEmail({
    email: "user@example.com",
    externalUserId: "081d27b9-e104-4bb1-8642-c2d0a6a054db"
  });
  console.log("Verification code sent to user@example.com");
  
  // Step 2: User enters the code received by email
  const result = await sdk.confirmEmail({
    email: "user@example.com",
    code: "123456",
    externalUserId: "081d27b9-e104-4bb1-8642-c2d0a6a054db"
  });
  console.log("Email verified:", result);
  ```

### `confirmEmail(request)`

- Endpoint: `POST /v1.2/users/me/confirm-email`
- Purpose: confirm the email verification code (step 2 of email onboarding)
- Returns: `IbexConfirmEmailResponse` (upstream passthrough)
- Request body:
  - `email: string` (required)
  - `code: string` (required, OTP received by email)
  - `externalUserId: string` (required)
- Example:
  ```typescript
  const result = await sdk.confirmEmail({
    email: "user@example.com",
    code: "123456",
    externalUserId: "081d27b9-e104-4bb1-8642-c2d0a6a054db"
  });
  ```
- Notes:
  - Must be called after `validateEmail()` — the code is time-limited
  - On success, the email is associated with the user profile
  - Combined with `updateMeData({ email: "..." })` if you also want to persist the email in userdata

### 7b) SMS Verification

### `validateSms(request)`

- Endpoint: `POST /v1.2/users/me/validate-sms`
- Purpose: send a 6-digit SMS verification code to a phone number (step 1 of SMS onboarding)
- Returns: `IbexValidateSmsResponse` (upstream passthrough)
- Request body:
  - `telephone: string` (required) — phone number (E.164 or local format, normalized server-side)
  - `externalUserId: string` (required)
  - `phonePolicy?: "frMobile" | "any"` — validation policy (`"any"` by default)
- Notes:
  - Code expires after 1 hour. Max 5 attempts per hour.
  - Response is always `200` for security reasons. In non-production environments, the response may include `{ "code": "..." }` for testing.

### `confirmSms(request)`

- Endpoint: `POST /v1.2/users/me/confirm-sms`
- Purpose: confirm the SMS verification code (step 2 of SMS onboarding)
- Returns: `IbexConfirmSmsResponse` (`{ smsVerified, telephone }`)
- Request body:
  - `telephone: string` (required) — same phone number as sent to `validateSms`
  - `code: string` (required) — 6-digit code received by SMS
  - `externalUserId: string` (required)
  - `phonePolicy?: "frMobile" | "any"` — must match the policy used in `validateSms`
  - `persistTelephoneToKyb?: boolean` — if `true`, also persists the verified phone number into the KYB `telephone` field
- Example:
  ```typescript
  // Step 1: Send verification code
  await sdk.validateSms({
    telephone: "+33612345678",
    externalUserId: "081d27b9-e104-4bb1-8642-c2d0a6a054db",
    phonePolicy: "frMobile"
  });

  // Step 2: User enters the code received by SMS
  const result = await sdk.confirmSms({
    telephone: "+33612345678",
    code: "123456",
    externalUserId: "081d27b9-e104-4bb1-8642-c2d0a6a054db",
    persistTelephoneToKyb: true
  });
  console.log("SMS verified:", result.smsVerified, result.telephone);
  ```
- Error responses: `400` invalid/expired code or invalid phone number

### 8) KYC/KYB Onboarding

### `getKycIframeUrl(request?)`

- Endpoint: `POST /v1.2/auth/iframe`
- Purpose: start a KYC/KYB session and obtain iframe/redirect URLs for identity verification
- Returns: `IbexKycIframeResponse`
- Request body:
  - `language?: string` — language code for the KYC UI (e.g. `"en"`, `"fr"`)
  - `requireSmsVerification?: boolean` — if `true`, the KYC flow will require SMS phone verification before proceeding
- Example:
  ```typescript
  const kyc = await sdk.getKycIframeUrl({ language: "fr" });
  
  if (kyc.alreadySent) {
    console.log("KYC already submitted — check status with getMe().kycStatus");
  } else {
    // Open the KYC iframe/redirect
    console.log("KYC session:", kyc.sessionId);
    console.log("Iframe URL:", kyc.chatbotURL);
    console.log("Full page URL:", kyc.chatbotFullURL);
    // Embed kyc.chatbotURL in an iframe or redirect to kyc.chatbotFullURL
  }
  ```
- Example response:
  ```json
  {
    "chatbotURL": "https://go.idnow.de/ibex/identifications/start?token=abc123",
    "sessionId": "abc123",
    "chatbotFullURL": "https://go.idnow.de/ibex/identifications/abc123",
    "alreadySent": false
  }
  ```
- Notes:
  - Call `getMe()` after KYC completion to check `kycStatus.status` and `kycStatus.kycLevel`
  - Typical flow: `authenticateWithPasskey()` → `getKycIframeUrl()` → user completes KYC → `getMe()` to verify status
  - The `alreadySent` flag indicates if the user has already initiated a KYC session

### 9) Email Recovery (Public)

### `recoverWithEmail(request)`

- Endpoint: `POST /v1.2/auth/email/recover`
- Purpose: recover access using email OTP flow (for email-wallet users, no passkey)
- Returns: `IbexEmailRecoverResponse` — recovery/challenge data for completing sign-in
- Auth: **public** (no JWT required — this is a recovery entry point)
- Request body:
  - `email: string` (required)
  - `emailOtp?: string` — OTP received by email
  - `code?: string` — alternative field name for OTP
  - `externalUserId?: string`
- Example:
  ```typescript
  // Step 1: Initiate email recovery (triggers OTP email)
  const recovery = await sdk.recoverWithEmail({
    email: "user@example.com"
  });
  
  // Step 2: User receives OTP, submit it
  const challenge = await sdk.recoverWithEmail({
    email: "user@example.com",
    emailOtp: "654321",
    externalUserId: "081d27b9-e104-4bb1-8642-c2d0a6a054db"
  });
  // challenge data is used to complete POST /v1.2/auth/sign-in (wallet=email)
  ```
- Notes:
  - This is a **public** endpoint (no JWT) — used when the user cannot authenticate with passkey
  - Part of the email-wallet authentication flow (alternative to passkey)
  - The response data is typically used to complete the sign-in via `POST /v1.2/auth/sign-in`

### 10) SEPA Endpoints

### `addSepaIban(payload)`

- Endpoint: `POST /v1.2/sepa/iban/add`
- Purpose: create an IBAN for the authenticated user (subject to per-user quota)
- Behavior depends on domain flag `isSepaIbanAddWebauthnEnabled`:
  - `TRUE` (default): passkey-gated mode — returns `approvalId` + `credentialRequestOptions`. Actual creation requires a follow-up call to `confirmSepaIbanAdd()`.
  - `FALSE`: direct mode — executes IBAN creation immediately and returns the created IBAN.
- Returns: `{ success: boolean, data: IbexSepaIban | IbexSepaAddIbanApproval }`
- Request body:
  - `holderName: string` (required)
  - `safeAddress?: string` — must belong to the authenticated user
  - `blockchainId?: number`
  - `label?: string` — free-text label (max 100 chars)
- Example (direct mode):
  ```typescript
  const result = await sdk.addSepaIban({
    holderName: "Alice Martin",
    safeAddress: "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    blockchainId: 421614,
    label: "Main account"
  });
  console.log("IBAN created:", result.data.iban);
  // "FR7615589275690931505605139"
  ```
- Example (WebAuthn mode — two-step flow):
  ```typescript
  const intent = await sdk.addSepaIban({ holderName: "Alice Martin", label: "Savings" });
  // intent.data contains approvalId + credentialRequestOptions
  const assertion = await navigator.credentials.get({ publicKey: intent.data.credentialRequestOptions });
  const confirmed = await sdk.confirmSepaIbanAdd({
    approvalId: intent.data.approvalId,
    credential: serializeAssertion(assertion)
  });
  console.log("IBAN created:", confirmed.data.iban.iban);
  ```
- Example response (WebAuthn mode):
  ```json
  {
    "success": true,
    "data": {
      "approvalId": "a87a3c1f-cc5d-4d1a-91ea-2d4f7c4fdd8c",
      "approvalHash": "53ca9be6c85f9f1b5c8f9e56f67b7af4f14966e2f78f1336af0b8db7a2043db9",
      "expiresAt": "2026-06-01T14:24:00.000Z",
      "credentialRequestOptions": { "challenge": "Y2hhbGxlbmdl...", "rpId": "app.ibex.fi" }
    }
  }
  ```
- Example response (direct mode):
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
      "status": "active",
      "safeAddress": "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
      "blockchainId": 421614,
      "dateUsed": "2026-05-14T10:00:00.000Z"
    }
  }
  ```

### `confirmSepaIbanAdd(request)`

- Endpoint: `PUT /v1.2/sepa/iban/add`
- Purpose: confirm IBAN creation by verifying a WebAuthn assertion (used only when `isSepaIbanAddWebauthnEnabled=TRUE`)
- Request body:
  - `approvalId: string` — returned by `addSepaIban()` in WebAuthn mode
  - `credential: object` — serialized WebAuthn assertion from `navigator.credentials.get()`
- Returns: `{ success: boolean, data: { approvalId, approvalHash, iban: IbexSepaIban } }`
- Example:
  ```typescript
  const confirmed = await sdk.confirmSepaIbanAdd({
    approvalId: "a87a3c1f-cc5d-4d1a-91ea-2d4f7c4fdd8c",
    credential: { id: "...", type: "public-key", rawId: "...", response: { ... } }
  });
  console.log("IBAN:", confirmed.data.iban.iban);
  console.log("Label:", confirmed.data.iban.label);
  ```
- Example response:
  ```json
  {
    "success": true,
    "data": {
      "approvalId": "a87a3c1f-cc5d-4d1a-91ea-2d4f7c4fdd8c",
      "approvalHash": "53ca9be6...",
      "iban": {
        "id": 42,
        "iban": "FR7615589275690931505605139",
        "formatted": "FR76 1558 9275 6909 3150 5605 139",
        "bic": "AGRIFRPPXXX",
        "holderName": "Alice Martin",
        "label": "Main account",
        "status": "active",
        "safeAddress": "0xd676...",
        "blockchainId": 100
      }
    }
  }
  ```

### `modifySepaIbanLabel(request)`

- Endpoint: `PATCH /v1.2/sepa/iban/modify`
- Purpose: update the label of an existing IBAN owned by the authenticated user
- Request body:
  - `iban: string` — the IBAN to modify (must belong to the authenticated user)
  - `label: string` — new label value (max 100 chars, empty string clears the label)
- Returns: `{ success: boolean, data: { iban, label } }`
- Example:
  ```typescript
  const result = await sdk.modifySepaIbanLabel({
    iban: "FR7615589275690931505605139",
    label: "Savings account"
  });
  console.log("Updated label:", result.data.label);
  // "Savings account"
  ```
- Example response:
  ```json
  {
    "success": true,
    "data": {
      "iban": "FR7615589275690931505605139",
      "label": "Savings account"
    }
  }
  ```

### `getSepaIbans()`

- Endpoint: `GET /v1.2/sepa/iban`
- Purpose: list all IBANs owned by the authenticated user
- Returns: `{ success: boolean, data: [ iban entries ] }`
- Note: response now includes `label` field on each IBAN entry
- Example:
  ```typescript
  const ibans = await sdk.getSepaIbans();
  for (const entry of ibans.data) {
    console.log(`${entry.iban} (${entry.status}) — ${entry.holderName} [${entry.label || "no label"}]`);
  }
  ```
- Example response:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 42,
        "iban": "FR7615589275690931505605139",
        "bic": "AGRIFRPPXXX",
        "holderName": "Alice Martin",
        "label": "Main account",
        "status": "active",
        "safeAddress": "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
        "blockchainId": 421614,
        "dateUsed": "2026-05-14T10:00:00.000Z"
      }
    ]
  }
  ```

### `createSepaPaymentIntent(payload)`

- Endpoint: `POST /v1.2/sepa/payments`
- Purpose: create a payment approval intent and return a WebAuthn passkey challenge for confirmation
- Returns: `{ success: boolean, data: { approvalId, approvalHash, expiresAt, credentialRequestOptions } }`
- Request body:
  - `reference: string` — payment reference
  - `channel: "SEPA" | "SEPAINSTANT"`
  - `amount: string` — amount in EUR (e.g. `"150.00"`)
  - `currency: "EUR"`
  - `remittanceInfo?: string`
  - `debtor: { name: string, iban: string }` — must be a user-owned IBAN
  - `creditor: { name: string, iban: string }`
- Example:
  ```typescript
  const intent = await sdk.createSepaPaymentIntent({
    reference: "PAY-2026-001",
    channel: "SEPAINSTANT",
    amount: "150.00",
    currency: "EUR",
    remittanceInfo: "Invoice 2026-001",
    debtor: {
      name: "Alice Martin",
      iban: "FR7615589275690931505605139"
    },
    creditor: {
      name: "IBEX Faucet 01",
      iban: "FR7616748000014733062059352"
    }
  });
  
  // intent.data.credentialRequestOptions contains the WebAuthn challenge
  const assertion = await navigator.credentials.get({
    publicKey: intent.data.credentialRequestOptions
  });
  
  // Then confirm with the signed credential:
  const payment = await sdk.confirmSepaPayment({
    approvalId: intent.data.approvalId,
    credential: serializeCredential(assertion)
  });
  ```
- Example response:
  ```json
  {
    "success": true,
    "data": {
      "approvalId": "6d8f6db4-53b0-43f3-87f3-35b68a68d2f7",
      "approvalHash": "4ed4a8f8e472e6f8f2f38e6f9f58b3f5f89f7b2f17a6f70db0f0f1d4b2d2d40a",
      "expiresAt": "2026-05-14T13:15:00.000Z",
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

### `confirmSepaPayment(payload)`

- Endpoint: `PUT /v1.2/sepa/payments`
- Purpose: execute a previously initiated payment approval intent using the signed WebAuthn credential
- Returns: `{ success: boolean, data: { approvalId, approvalHash, payment } }`
- Request body:
  - `approvalId: string`
  - `credential: object` (serialized WebAuthn assertion)
- Example:
  ```typescript
  const result = await sdk.confirmSepaPayment({
    approvalId: "6d8f6db4-53b0-43f3-87f3-35b68a68d2f7",
    credential: serializedAssertion
  });
  console.log("Payment status:", result.data.payment.data.status);
  // "completed"
  ```
- Example response:
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
          "transactionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "reference": "PAY-2026-001",
          "status": "completed",
          "statusCode": "DONE"
        }
      }
    }
  }
  ```

### `getSepaTransactions(query?)`

- Endpoint: `GET /v1.2/sepa/transactions`
- Purpose: list SEPA transactions for the authenticated user's IBANs
- Returns: `{ success: boolean, data: [...], pagination: { total, page, limit, pages } }`
- Supported query params in SDK:
  - `iban?: string` — scope to a single IBAN (must belong to the user)
  - `type?: "SEPA_IN" | "SEPA_OUT"`
  - `status?: string` — `ask | pending | completed | cancelled | failed | rejected`
  - `statusCode?: string`
  - `search?: string`
  - `page?: number` (default `1`)
  - `limit?: number` (default `20`, max `200`)
- Example:
  ```typescript
  // List all SEPA transactions
  const txs = await sdk.getSepaTransactions();
  
  // Filter by type and IBAN
  const outgoing = await sdk.getSepaTransactions({
    type: "SEPA_OUT",
    iban: "FR7615589275690931505605139",
    page: 1,
    limit: 50
  });
  
  for (const tx of outgoing.data) {
    console.log(`${tx.reference}: ${tx.amount} ${tx.currency} (${tx.status})`);
  }
  console.log(`Page ${outgoing.pagination.page}/${outgoing.pagination.pages}`);
  ```
- Example response:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "iban": "FR7615589275690931505605139",
        "type": "SEPA_OUT",
        "status": "completed",
        "amount": "150.00",
        "currency": "EUR",
        "senderIban": "FR7615589275690931505605139",
        "beneficiaryIban": "FR7616748000014733062059352",
        "reference": "PAY-2026-001",
        "createdAt": "2026-05-14T10:30:00.000Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
  ```

### `getSepaTransactionById(id)`

- Endpoint: `GET /v1.2/sepa/transactions/:id`
- Purpose: return the full SEPA transaction payload (including linked SEPA message) for a single transaction
- Returns: `{ success: boolean, data: { transaction + sepaMessage } }`
- Example:
  ```typescript
  const tx = await sdk.getSepaTransactionById("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
  console.log("Transaction:", tx.data.reference, tx.data.status);
  ```
- Notes:
  - Returns `404` if the transaction does not involve any IBAN owned by the authenticated user

### `createSepaMandate(payload)`

- Endpoint: `POST /v1.2/sepa/mandates`
- Purpose: create and persist a SEPA mandate, then trigger downstream SEPA synchronization
- Returns: `{ success: boolean, data: { mandate }, sepaSync?: { ... } }`
- Request body:
  - `sourceIban: string` — must belong to the authenticated user
  - `destinationIban: string`
  - `destinationName?: string`
  - `destinationBic?: string`
  - `percent: number` — percentage of incoming amount to forward (0-100)
  - `trigger?: { mode: "all" | "whitelist", whitelistRules?: [...] }`
  - `signature: { message: string, signature: string, safeOperationUserOpHash?: string }`
- Example:
  ```typescript
  const mandate = await sdk.createSepaMandate({
    sourceIban: "FR7615589275690931505605139",
    destinationIban: "FR7616748000014733062059352",
    destinationName: "IBEX Faucet 01",
    destinationBic: "BUMDFRP2",
    percent: 25,
    trigger: {
      mode: "whitelist",
      whitelistRules: [
        { kind: "senderIban", operator: "in", values: ["FR7616748000014468183681821"] },
        { kind: "amount", operator: "between", minAmount: "10.00", maxAmount: "500.00", currency: "EUR" }
      ]
    },
    signature: {
      message: "IBEX_SEPA_MANDATE_V1 ...",
      signature: "0xabcdef...",
      safeOperationUserOpHash: "0x1234..."
    }
  });
  console.log("Mandate created:", mandate.data.id, mandate.data.status);
  ```
- Example response:
  ```json
  {
    "success": true,
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "validated",
      "position": 1,
      "routing": {
        "sourceIban": "FR7615589275690931505605139",
        "sourceName": "Alice Martin",
        "sourceBic": "AGRIFRPPXXX",
        "destinationIban": "FR7616748000014733062059352",
        "destinationName": "IBEX Faucet 01",
        "destinationBic": "BUMDFRP2"
      },
      "allocation": { "percent": 25 },
      "trigger": { "mode": "whitelist", "whitelistRules": [] },
      "createdAt": "2026-05-14T11:00:00.000Z",
      "updatedAt": "2026-05-14T11:00:00.000Z",
      "version": 1
    },
    "sepaSync": { "success": true }
  }
  ```

### `getSepaMandates()`

- Endpoint: `GET /v1.2/sepa/mandates`
- Purpose: return all stored mandates for the authenticated user context
- Returns: `{ success: boolean, data: [ mandates ] }`
- Example:
  ```typescript
  const mandates = await sdk.getSepaMandates();
  for (const m of mandates.data) {
    console.log(`Mandate ${m.id}: ${m.status} — ${m.allocation.percent}% from ${m.routing.sourceIban}`);
  }
  ```

### `getSepaMandateById(id)`

- Endpoint: `GET /v1.2/sepa/mandates/:id`
- Purpose: return one mandate by id
- Returns: `{ success: boolean, data: { mandate } }`
- SDK behavior: URL-encodes `id` path param
- Example:
  ```typescript
  const mandate = await sdk.getSepaMandateById("550e8400-e29b-41d4-a716-446655440000");
  console.log("Status:", mandate.data.status);
  console.log("Routing:", mandate.data.routing.sourceIban, "→", mandate.data.routing.destinationIban);
  ```

### `updateSepaMandateStatus(id, payload)`

- Endpoint: `PATCH /v1.2/sepa/mandates/:id/status`
- Purpose: update mandate status and trigger downstream SEPA synchronization
- Returns: updated mandate
- SDK behavior: URL-encodes `id` path param
- Request body:
  - `{ status: "validated" | "suspended" | "cancelled" }`
- Example:
  ```typescript
  // Suspend a mandate
  await sdk.updateSepaMandateStatus("550e8400-e29b-41d4-a716-446655440000", {
    status: "suspended"
  });
  
  // Reactivate it
  await sdk.updateSepaMandateStatus("550e8400-e29b-41d4-a716-446655440000", {
    status: "validated"
  });
  ```
- Notes:
  - `cancelled` is terminal — cannot go back to `validated` or `suspended`
  - Every status update is persisted and pushed to IBEx SEPA

### `cancelSepaMandate(id)`

- Endpoint: `POST /v1.2/sepa/mandates/:id/cancel`
- Purpose: convenience endpoint for permanent mandate cancellation
- SDK behavior: URL-encodes `id` path param
- Example:
  ```typescript
  await sdk.cancelSepaMandate("550e8400-e29b-41d4-a716-446655440000");
  // Equivalent to updateSepaMandateStatus(id, { status: "cancelled" })
  ```

### 11) Safe Operations

All Safe operations follow a two-step flow: **prepare** (POST) returns a WebAuthn challenge, then **execute** (PUT) submits the signed credential.

### `prepareSafeOperations(request)`

- Endpoint: `POST /v1.2/safes/operations`
- Purpose: prepare one or more Safe operations and receive a WebAuthn challenge for signing
- Returns: `IbexSafePrepareResponse` — WebAuthn `credentialRequestOptions`
- Request body:
  - `safeAddress: string` (required)
  - `operations: IbexSafeOperation[]` (required)
  - `chainId?: number`
  - `signerId?: string`
  - `walletMode?: "SAFE_4337" | "EOA_7702"`
  - `eoaKeySelection?: { family: string, index: number, safeAddress?: string }`
- Example — ERC20 token transfer:
  ```typescript
  const prepare = await sdk.prepareSafeOperations({
    safeAddress: "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    chainId: 421614,
    operations: [
      {
        type: "TRANSFER_TOKEN",
        to: "0x0795239e54A9b6f97413cA84688f7a93b9A0640e",
        tokenAddress: "0x18e632ae0704ab92cf4f49472b583498ff5258cc",
        amount: "10.5"
      }
    ]
  });
  
  // Sign with WebAuthn
  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });
  
  // Execute on-chain
  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("UserOp hash:", result.userOpHash);
  ```
- Example response:
  ```json
  {
    "batchId": "c559ddd07fe211fe3b34cbe7",
    "expiresAt": "2026-05-14T13:56:49.225Z",
    "credentialRequestOptions": {
      "rpId": "demobaas-prat1.ibex.fi",
      "challenge": "HES8DdwboMB9vI0fHt_WtkZuHa67KMYKbDKSnyfT1lE",
      "allowCredentials": [
        { "id": "_BSUV-JB3OahXllQtfdssAY03gZOnBAH60-6_0DPJGU", "type": "public-key" }
      ],
      "timeout": 60000,
      "userVerification": "required"
    }
  }
  ```

### `executeSafeOperations(request)`

- Endpoint: `PUT /v1.2/safes/operations`
- Purpose: submit the WebAuthn assertion obtained after `prepareSafeOperations` to execute the operation on-chain
- Returns: `{ userOpHash?: string, txHash?: string, walletMode?: string, success?: boolean }`
- Request body:
  - `credential: object` (required, serialized WebAuthn assertion)
  - `chainId?: number`
- Example:
  ```typescript
  const result = await sdk.executeSafeOperations({
    credential: serializedAssertion
  });
  console.log("UserOp hash:", result.userOpHash);
  // "0x6cdab85147c3472499aa9859e1af51844d853f098d57ca14baf977a83c6f7400"
  ```
- Example response (SAFE_4337 mode):
  ```json
  {
    "userOpHash": "0x6cdab85147c3472499aa9859e1af51844d853f098d57ca14baf977a83c6f7400"
  }
  ```
- Example response (EOA_7702 mode):
  ```json
  {
    "userOpHash": "0x3b3f23afd9429b1804aa76cf249b721cc1a5880a1bda115b4f50ea684dc0c8f6",
    "success": true,
    "txHash": "0x455b306f80751d014b7886e762475de86cd0b8d50294f30f8469758cab5cdeda",
    "walletMode": "EOA_7702"
  }
  ```

### `signMessage(safeAddress, message, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `SIGN_MESSAGE` operation
- Purpose: prepare an EIP-191 personal_sign on behalf of the Safe
- Parameters:
  - `safeAddress: string` (required)
  - `message: string` (required)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  // Step 1: Prepare the message signing
  const prepare = await sdk.signMessage(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    "IBEX_SEPA_MANDATE_V1 I authorize mandate #12345"
  );
  
  // Step 2: Sign with passkey
  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });
  
  // Step 3: Execute
  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Signed on-chain:", result.userOpHash);
  ```

### `enableRecovery(safeAddress, identity, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `ENABLE_RECOVERY` operation
- Purpose: activate the recovery module on a deployed Safe
- Parameters:
  - `safeAddress: string` (required)
  - `identity: { firstName, lastName, birthDate, birthCity, birthCountry }` (required, `birthDate` format `YYYY-MM-DD`)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  // Step 1: Prepare recovery activation
  const prepare = await sdk.enableRecovery(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    {
      firstName: "Alice",
      lastName: "Martin",
      birthDate: "1990-03-15",
      birthCity: "Paris",
      birthCountry: "FR"
    },
    { chainId: 421614 }
  );
  
  // Step 2: Sign with passkey
  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });
  
  // Step 3: Execute on-chain
  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Recovery enabled:", result.userOpHash);
  ```
- Notes:
  - Safe must already be deployed on-chain (lazy/undeployed Safes will receive an error)
  - Identity data is used to register recovery with the IBEX Safe service after on-chain confirmation

### `cancelRecovery(safeAddress, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `CANCEL_RECOVERY` operation
- Purpose: disable a previously enabled recovery module on a Safe
- Parameters:
  - `safeAddress: string` (required)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  // Step 1: Prepare recovery cancellation
  const prepare = await sdk.cancelRecovery(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    { chainId: 421614 }
  );
  
  // Step 2: Sign with passkey
  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });
  
  // Step 3: Execute on-chain
  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Recovery cancelled:", result.userOpHash);
  ```
- Notes:
  - Safe must already have recovery enabled

### 12) Swap Quote

### `getSwapQuote(query)`

- Endpoint: `GET /v1.2/safes/swap/quote`
- Purpose: get a swap quote from COWSWAP and/or 1INCH. Uses the authenticated user's first Safe as receiver when `safeAddress` is not provided.
- Returns: `IbexSwapQuoteResponse` — quote details including `quoteId`
- Supported query params in SDK:
  - `sellTokenAddress: string` (required, EVM token address to sell)
  - `buyTokenAddress: string` (required, EVM token address to buy)
  - `amount: string` (required, human-readable sell amount)
  - `chainId?: number` (optional, defaults to environment chain)
  - `safeAddress?: string` (optional, defaults to user's first Safe)
  - `provider?: "COWSWAP" | "1INCH" | "BOTH"` (optional, defaults to `"BOTH"`)
- Example — swap EUR-IBEX for BTC-IBEX:
  ```typescript
  const quote = await sdk.getSwapQuote({
    sellTokenAddress: "0x18e632ae0704ab92cf4f49472b583498ff5258cc",  // EUR-IBEX
    buyTokenAddress: "0xb21ef1146d0cba9d4ad0d5494731bfc0b8ef7637",   // BTC-IBEX
    amount: "100",
    chainId: 421614,
    provider: "COWSWAP"
  });
  
  console.log("Quote ID:", quote.quoteId);
  console.log("Buy amount:", quote.buyAmount);
  console.log("Valid until:", quote.validUntil);
  ```
- Notes:
  - The returned `quoteId` is used with `swapFromQuote()` to execute the swap
  - Quotes have a limited validity window (`validUntil`)

### `swapFromQuote(safeAddress, quoteId, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `SWAP_FROM_QUOTE` operation
- Purpose: execute a token swap from a previously obtained quote
- Parameters:
  - `safeAddress: string` (required)
  - `quoteId: string` (required, obtained from `getSwapQuote`)
  - `options?: { orderUid?, chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example — full swap flow:
  ```typescript
  // Step 1: Get a quote
  const quote = await sdk.getSwapQuote({
    sellTokenAddress: "0x18e632ae0704ab92cf4f49472b583498ff5258cc",  // EUR-IBEX
    buyTokenAddress: "0xb21ef1146d0cba9d4ad0d5494731bfc0b8ef7637",   // BTC-IBEX
    amount: "100",
    chainId: 421614
  });
  
  // Step 2: Prepare the swap operation
  const prepare = await sdk.swapFromQuote(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    quote.quoteId,
    { orderUid: quote.orderUid, chainId: 421614 }
  );
  
  // Step 3: Sign with passkey
  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });
  
  // Step 4: Execute on-chain
  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Swap executed:", result.userOpHash);
  ```

### Legacy vs Unified Route Engine

- `getSwapQuote()` / `swapFromQuote()` remain available for same-chain swap legacy flows.
- For new swap + bridge unified flows, use `getRouteCapabilities()` + `getRouteQuote()` + `routeFromQuote()` + `getRouteStatus()`.

### 13) Unified Route Engine (Swap + Bridge)

The SDK supports the new route engine endpoints and operation type `ROUTE_FROM_QUOTE`.

### `getRouteCapabilities(query)`

- Endpoint: `GET /v1.2/safes/routes/capabilities`
- Purpose: discover route mode and available providers for a source/destination chain pair.
- Parameters:
  - `sourceChainId: number` (required)
  - `destinationChainId: number` (required)
- Returns: `IbexRouteCapabilitiesResponse`
- Route modes:
  - `SAME_CHAIN_SWAP`
  - `CROSS_CHAIN_BRIDGE`
  - `UNSUPPORTED`
- Response fields (typical):
  - `mode?: "SAME_CHAIN_SWAP" | "CROSS_CHAIN_BRIDGE" | "UNSUPPORTED"`
  - `providers?: string[]`

### `getRouteQuote(payload)`

- Endpoint: `POST /v1.2/safes/routes/quote`
- Purpose: request route candidates and retrieve the persisted best route identifier (`routeId`).
- Required payload fields:
  - `sourceChainId: number`
  - `destinationChainId: number`
  - `sellTokenAddress: string`
  - `buyTokenAddress: string`
  - `amount: string` (human-readable sell amount)
- Optional payload fields:
  - `safeAddress?: string`
  - `provider?: string`
- Returns: `IbexRouteQuoteResponse`
- Response fields (typical):
  - `routeId?: string` (used for execution and status polling)
  - `mode?: "SAME_CHAIN_SWAP" | "CROSS_CHAIN_BRIDGE" | "UNSUPPORTED"`
  - `provider?: string`
  - `buyAmount?: string`
  - `sellAmount?: string`
  - `candidates?: Array<object>`
- Notes:
  - The backend stores the best candidate route and exposes its identifier as `routeId`.
  - Candidate selection is performed server-side (best route semantics are backend-defined).

### `getRouteStatus(routeId)`

- Endpoint: `GET /v1.2/safes/routes/:routeId/status`
- Purpose: track route lifecycle after execution.
- Parameters:
  - `routeId: string` (required, returned by `getRouteQuote`)
- Returns: `IbexRouteStatusResponse`
- Typical statuses:
  - `CREATED`
  - `SOURCE_PREPARED`
  - `SOURCE_SUBMITTED`
  - `SOURCE_CONFIRMED`
  - `DEST_PENDING`
  - `DEST_COMPLETED`
  - `FAILED`
- Response fields (typical):
  - `routeId?: string`
  - `status?: string`
  - `mode?: "SAME_CHAIN_SWAP" | "CROSS_CHAIN_BRIDGE" | "UNSUPPORTED"`
  - `sourceUserOpHash?: string | null`
  - `transactionHash?: string | null`

### `routeFromQuote(safeAddress, routeId, options?)`

- Convenience wrapper around `prepareSafeOperations` with operation `{ type: "ROUTE_FROM_QUOTE", quoteId: routeId }`.
- Purpose: prepare route execution from a previously quoted route.
- Parameters:
  - `safeAddress: string` (required)
  - `routeId: string` (required, quote identifier from `getRouteQuote`)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Execute step:
  - Use `executeSafeOperations()` afterwards with the signed WebAuthn credential.

For complete end-to-end usage examples (capabilities -> quote -> routeFromQuote -> execute -> status polling), see `docs/IBEXFISDK_EXAMPLES.md`.

### 14) Hyperliquid

Hyperliquid operations are **server-side post-execution**: after the Safe operation is executed on-chain, the IBEx server calls the Hyperliquid API using server-side credentials and configured vault/bridge routing. These operations are **not supported in batch mode**.

All four methods follow the standard two-step Safe operations flow (prepare → WebAuthn sign → execute).

### `hyperliquidDeposit(safeAddress, amount, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `HYPERLIQUID_DEPOSIT` operation
- Purpose: deposit USDC to Hyperliquid via the configured bridge contract on the target chain
- Parameters:
  - `safeAddress: string` (required)
  - `amount: number` (required, USDC amount to deposit)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  // Step 1: Prepare the deposit
  const prepare = await sdk.hyperliquidDeposit(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    100,
    { chainId: 421614 }
  );

  // Step 2: Sign with passkey
  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });

  // Step 3: Execute on-chain (then server deposits to Hyperliquid)
  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Deposit initiated:", result.userOpHash);
  ```

### `hyperliquidEnterVault(safeAddress, amount, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `HYPERLIQUID_ENTER_VAULT` operation
- Purpose: enter a Hyperliquid vault with the specified amount (server-side vault routing)
- Parameters:
  - `safeAddress: string` (required)
  - `amount: number` (required, amount to allocate to the vault)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  const prepare = await sdk.hyperliquidEnterVault(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    50,
    { chainId: 421614 }
  );

  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });

  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Entered vault:", result.userOpHash);
  ```

### `hyperliquidWithdrawVault(safeAddress, amount, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `HYPERLIQUID_WITHDRAW_VAULT` operation
- Purpose: withdraw funds from a Hyperliquid vault
- Parameters:
  - `safeAddress: string` (required)
  - `amount: number` (required, amount to withdraw from the vault)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  const prepare = await sdk.hyperliquidWithdrawVault(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    25,
    { chainId: 421614 }
  );

  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });

  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Vault withdrawal:", result.userOpHash);
  ```

### `hyperliquidWithdraw(safeAddress, to, amount, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `HYPERLIQUID_WITHDRAW` operation
- Purpose: withdraw funds from Hyperliquid to a specified wallet address
- Parameters:
  - `safeAddress: string` (required)
  - `to: string` (required, destination wallet address `0x...`)
  - `amount: number` (required, amount to withdraw)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  const prepare = await sdk.hyperliquidWithdraw(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    "0x0795239e54A9b6f97413cA84688f7a93b9A0640e",
    100,
    { chainId: 421614 }
  );

  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });

  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Withdrawal initiated:", result.userOpHash);
  ```
- Notes:
  - Unlike the other Hyperliquid operations, this one requires a destination wallet address (`to`)
  - The server calls `WITHDRAW_WALLET` on the Hyperliquid API after on-chain execution

### 14b) Morpho

Morpho operations interact with ERC-4626 vaults (Morpho protocol). Both methods follow the standard two-step Safe operations flow (prepare -> WebAuthn sign -> execute).

### `morphoSupply(safeAddress, params, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `MORPHO_SUPPLY` operation
- Purpose: deposit assets into a Morpho Vault (ERC-4626)
- Parameters:
  - `safeAddress: string` (required)
  - `params: { amount, assetTicker, tokenAddress, decimals, vaultAddress }` (required)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  const prepare = await sdk.morphoSupply(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    {
      amount: "1000000",
      assetTicker: "USDC",
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      vaultAddress: "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB",
    },
    { chainId: 8453 }
  );

  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });

  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Morpho supply:", result.userOpHash);
  ```

### `morphoWithdraw(safeAddress, params, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `MORPHO_WITHDRAW` operation
- Purpose: withdraw assets from a Morpho Vault (redeem shares or withdraw by amount)
- Parameters:
  - `safeAddress: string` (required)
  - `params: { assetTicker, tokenAddress, decimals, vaultAddress, shares?, amount? }` (required — provide `shares` to redeem or `amount` to withdraw)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Example:
  ```typescript
  const prepare = await sdk.morphoWithdraw(
    "0x391ff3676e591b1772C5f89B0a6C569EE42d30b8",
    {
      assetTicker: "USDC",
      tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      vaultAddress: "0xBEEF01735c132Ada46AA9aA4c54623cAA92A64CB",
      shares: "500000",
    },
    { chainId: 8453 }
  );

  const assertion = await navigator.credentials.get({
    publicKey: prepare.credentialRequestOptions
  });

  const result = await sdk.executeSafeOperations({
    credential: serializeCredential(assertion)
  });
  console.log("Morpho withdraw:", result.userOpHash);
  ```

### 15) WebSocket Realtime

The SDK provides `IbexRealtimeClient` for real-time updates over WebSocket. The WS events for balances, transactions, and user data produce the **same normalized types** as the corresponding HTTP methods — no format conversion needed on the consumer side.

For the full WebSocket protocol specification (message formats, close codes, chain resolution), see `docs/IBEXFIAPI_WEBSOCKET.md`.

### `createRealtimeClient(options?)`

- Creates an `IbexRealtimeClient` pre-wired to the SDK's `apiBaseUrl` and stored token.
- Available on `IbexSdk` instance or as standalone `createRealtimeClient(config)`.
- Parameters (when called on SDK instance):
  - `blockchainId?: string` — chain filter for WS connection (query param on `/ws`)
  - `clientName?: string` — label sent in auth message
  - `reconnect?: boolean | { enabled?, maxAttempts?, baseDelayMs?, maxDelayMs? }` — reconnection policy (default: enabled, 10 attempts, exponential backoff)
  - `wsImpl?` — custom WebSocket constructor (for Node.js environments)
- Returns: `IbexRealtimeClient`

### `IbexRealtimeClient` API

| Method / Property | Description |
|---|---|
| `connect()` | Open the WebSocket and send auth message |
| `disconnect()` | Close the WebSocket and stop reconnection |
| `connected` (getter) | `true` if the socket is open |
| `authenticated` (getter) | `true` after `auth_success` is received |
| `on(event, handler)` | Subscribe to typed events; returns unsubscribe function |
| `requestBalances(requestId?)` | Send `get_balance` message (response via `balance_data` event) |
| `requestTransactions(params?, requestId?)` | Send `get_transactions` message (response via `transaction_data` event) |

### Events

#### Normalized events (same output types as HTTP)

| Event | Emitted type | HTTP equivalent |
|---|---|---|
| `balance_data` | `IbexNormalizedBalances` | `getMeBalances()` |
| `transaction_data` | `IbexNormalizedTransactions` | `getMeTransactions()` |
| `user_data` | `IbexNormalizedProfile` | `getMe()` |

These events are emitted both during the initial data burst (after auth) and as responses to `requestBalances()` / `requestTransactions()`.

#### Auth and session events

| Event | Emitted type | Description |
|---|---|---|
| `auth_success` | `{ safeAddress, message? }` | Authentication succeeded |
| `auth_error` | `{ message, error_code?, context? }` | Authentication failed (connection closes after) |
| `connection_success` | `{ safeAddress, message? }` | Legacy compatibility event (same as auth_success) |

#### Push events (deltas from upstream)

| Event | Emitted type | Description |
|---|---|---|
| `balance_update` | `{ address, balance, updated_at }` | Crypto balance changed |
| `new_transaction` | `{ address, newTransaction, recentTransactions?, ... }` | New crypto transaction detected |
| `fiat_balance_update` | `{ iban, balance, currency, updated_at }` | Fiat balance changed |
| `fiat_transaction_update` | `{ iban, transactionId, event, status, amount, currency }` | Fiat transaction event |
| `user_iban_updated` | `{ iban: "changed" }` | IBAN status signal (refresh signal) |
| `user_ky_updated` | `{ ky: "changed" }` | KYC status signal (refresh signal) |

#### Other events

| Event | Emitted type | Description |
|---|---|---|
| `chainid_data` | `{ defaultChainId, supportedChainIds }` | Chain configuration |
| `recovery_data` | `IbexRecoveryStatusResponse` | Recovery status for the session Safe |
| `error` | `{ message, context?, error_code? }` | Server-side error |
| `open` | `undefined` | WebSocket opened |
| `close` | `{ code, reason }` | WebSocket closed |
| `raw` | `{ type, data, timestamp? }` | Raw JSON of every server message (for debugging) |

### Close codes

| Code | Meaning | SDK behavior |
|---|---|---|
| `4001` | Auth timeout (30s) | Reconnect (if enabled) |
| `4002` | Auth failed / token expired | Calls `onTokenExpired` callback (SDK auto-refreshes) |
| `4003` | Duplicate session | No reconnect (close existing session first) |
| `1006` / `1011` | Network / server error | Reconnect with exponential backoff |

### Example — basic usage via SDK instance

```typescript
const sdk = createIbexSdk({ apiBaseUrl: "https://passkeys-testnet.ibex.fi" });
await sdk.authenticateWithPasskey();

const ws = sdk.createRealtimeClient({ clientName: "my-app" });

ws.on("auth_success", (data) => {
  console.log("WS authenticated, Safe:", data.safeAddress);
});

ws.on("balance_data", (balances) => {
  // Same IbexNormalizedBalances as sdk.getMeBalances()
  for (const wallet of balances.wallets) {
    console.log(`Chain ${wallet.chainId}: ${wallet.tokens.length} tokens`);
  }
});

ws.on("transaction_data", (transactions) => {
  // Same IbexNormalizedTransactions as sdk.getMeTransactions()
  for (const chain of transactions.chains) {
    console.log(`Chain ${chain.chainId}: ${chain.total} transactions`);
  }
});

ws.on("user_data", (profile) => {
  // Same IbexNormalizedProfile as sdk.getMe()
  console.log("User:", profile.externalUserId);
  console.log("Wallets:", profile.wallets.length);
});

ws.on("balance_update", (update) => {
  console.log(`Balance changed: ${update.address} → ${update.balance}`);
});

ws.on("new_transaction", (tx) => {
  console.log(`New tx: ${tx.newTransaction.hash} (${tx.newTransaction.direction})`);
});

ws.on("close", (event) => {
  if (event.code === 4003) {
    console.warn("Duplicate session — close existing connection first");
  }
});

ws.connect();

// On-demand refresh:
ws.requestBalances("my-request-1");
ws.requestTransactions({ page: 1, limit: 50 }, "my-request-2");

// Cleanup:
ws.disconnect();
```

### Example — standalone usage (without IbexSdk)

```typescript
import { IbexRealtimeClient } from "ibex-sdk";

const ws = new IbexRealtimeClient({
  apiBaseUrl: "https://passkeys-testnet.ibex.fi",
  blockchainId: "421614",
  clientName: "standalone-app",
  getToken: () => localStorage.getItem("ibex_jwt"),
  onTokenExpired: () => {
    console.warn("Token expired — refresh and reconnect");
  },
  reconnect: { maxAttempts: 5, baseDelayMs: 2000 },
});

ws.on("balance_data", (balances) => {
  console.log("Balances:", balances.wallets);
});

ws.connect();
```

### HTTP fallback pattern

When WS is unavailable, fall back to HTTP methods that return the same types:

```typescript
ws.on("close", (event) => {
  if (event.code !== 4003) {
    // WS failed — fall back to HTTP
    const balances = await sdk.getMeBalances();   // same IbexNormalizedBalances
    const txs = await sdk.getMeTransactions();     // same IbexNormalizedTransactions
    const profile = await sdk.getMe();             // same IbexNormalizedProfile
  }
});
```

## Session Lifecycle and Retry Behavior

- SDK stores session tokens in configured storage.
- On successful sign-in/sign-up, API already returns a valid JWT session:
  - `access_token` (typically `expires_in = 3600`, i.e. ~1 hour)
  - `refresh_token`
- Do not call refresh immediately after auth success. Use the issued `access_token` first.
- For authenticated endpoints, SDK retries once automatically on `401`/`403`:
  1. refresh via `POST /v1.2/auth/refresh`
  2. replay original request with new token
- If refresh fails:
  - SDK clears session data and external-user-scoped cached keys.

## DevTools (`IbexDevToolsClient`)

The SDK exposes admin/development tooling via a **separate client** (`IbexDevToolsClient`) because DevTools endpoints use a different authentication model (API key / HTTP Basic / localhost bypass) than the standard passkey JWT auth.

### Authentication

DevTools auth is resolved in priority order:

1. **`apiKey`** — header `x-api-key: <value>` + rpId headers.
2. **`basicAuth`** (`{ username, password }`) — header `Authorization: Basic <base64>`.
3. **None** (localhost bypass) — rpId headers only (`X-Rp-Id`, `X-RpId` with configured `rpId` or `localhost`).

### Creating the client

```typescript
import { createIbexDevToolsClient } from "ibex-sdk";

// Standalone
const devtools = createIbexDevToolsClient({
  apiBaseUrl: "https://passkeys-prat1.ibex.fi",
  apiKey: "my-domain-api-key",
});

// Or via IbexSdk (inherits apiBaseUrl + fetchImpl)
const devtools = sdk.createDevToolsClient({ apiKey: "my-domain-api-key" });
```

### Endpoint mapping

| SDK Method | HTTP Method | API Endpoint | Description |
|---|---|---|---|
| `devtools.kyList(query?)` | `GET` | `/api/admin/devtools/ky/list` | Paginated list of KY dossiers |
| `devtools.kyGetState(externalUserId)` | `GET` | `/api/admin/devtools/ky/state/:externalUserId` | Current KY state for one user |
| `devtools.kySetState(input)` | `POST` | `/api/admin/devtools/ky/state` | Force KY state transition |
| `devtools.kyEnroll(input)` | `POST` | `/api/admin/devtools/ky/enroll` | Create a KYC session |
| `devtools.kybEnroll(input)` | `POST` | `/api/admin/devtools/kyb/enroll` | Create a KYB enrollment |
| `devtools.kySmsVerified(input)` | `POST` | `/api/admin/devtools/ky/sms-verified` | Manually set SMS verification data |
| `devtools.companyCheck(input)` | `POST` | `/api/admin/devtools/company/check` | Fast KYB pre-check on a SIREN |
| `devtools.sepaTopup(input)` | `POST` | `/api/admin/devtools/sepa/topup` | SEPA faucet topup (dev only) |
| `devtools.cryptoTopup(input)` | `POST` | `/api/admin/devtools/crypto/topup` | Crypto faucet topup (dev only) |

### Types

| Type | Role |
|---|---|
| `IbexDevToolsConfig` | Client configuration (apiBaseUrl, apiKey?, basicAuth?, rpId?, fetchImpl?) |
| `IbexDevToolsKyListQuery` | Query params for `kyList` (page?, limit?) |
| `IbexDevToolsKyListResponse` | Paginated list response (items[], total, page, limit, totalPages) |
| `IbexDevToolsKyStateResponse` | KY state (state, kyStateCode, allowedStates, ...) |
| `IbexDevToolsKySetStateInput` | Input for `kySetState` (externalUserId, newStateId, entityType?, ...) |
| `IbexDevToolsKySetStateResponse` | State transition result (success, fromStateId, toStateId) |
| `IbexDevToolsKyEnrollInput` | Input for `kyEnroll` (externalUserId, language?, email?, ...) |
| `IbexDevToolsKyEnrollResponse` | KYC session (sessionId, chatbotURL, chatbotFullURL) |
| `IbexDevToolsKybEnrollInput` | Input for `kybEnroll` (externalUserId, email, companyRegistrationNumber, ...) |
| `IbexDevToolsKybEnrollResponse` | KYB session (sessionId, chatbotFullURL) |
| `IbexDevToolsKySmsVerifiedInput` | Input for `kySmsVerified` (externalUserId, smsVerifiedTelephone?, smsVerifiedAt?) |
| `IbexDevToolsKySmsVerifiedResponse` | SMS verified result (success, kyCustomerId, smsVerifiedTelephone, smsVerifiedAt) |
| `IbexDevToolsCompanyCheckInput` | Input for `companyCheck` (siren) |
| `IbexDevToolsCompanyCheckResponse` | Structured company check payload (`existence`, company identity fields, `representatives`, `beneficiairesEffectifs`, screening details) |
| `IbexDevToolsSepaTopupInput` | Input for `sepaTopup` (targetIban, targetName?, amount?, amountEur?, channel?, remittanceInfo?) |
| `IbexDevToolsSepaTopupResponse` | Topup result (success, data: { source, identity, payment }) |
| `IbexDevToolsCryptoTopupInput` | Input for `cryptoTopup` (externalUserId, wallet?) |
| `IbexDevToolsCryptoTopupResponse` | Topup result (success?, wallet?, token?, amount?, txHash?) |

## What Is Not Exposed by This SDK (Current Version)

The following API families are not wrapped by high-level SDK methods in `sdk/ibex` yet:

- domain/admin/config endpoints (`/v1.2/domain/*`, `/v1.2/domains/*`)
- safe-provision routes (deploy, lazy-create)
- batch operations (`batch-intent` / `batch-execute`)
- automation module config (`PUT /v1.2/safes/{safeAddress}/automation-module/config`)
- Bitcoin PSBT/broadcast (`/v1.2/safes/bitcoin/*`)
- signer enrollment (`POST /v1.2/auth/enroll`)

Note: WebSocket realtime is now fully supported via `IbexRealtimeClient` (see section 15).

## Recommended Client Integration Order

1. Initialize SDK with `apiBaseUrl` (and optional `blockchainId`).
2. Call `authenticateWithPasskey()`.
3. Load full profile with `getMe()` — this single call returns **all** normalized user data:
   - `wallets[]` (with `eoaAddresses[]`), `signers[]`, `ibans[]`
   - `balances` (same structure as `getMeBalances()`)
   - `transactions` (same structure as `getMeTransactions()`)
   - `kycStatus`, `addressbook[]`, `data` (userdata)
4. Open a WebSocket for real-time updates:
   - `sdk.createRealtimeClient()` → `ws.connect()`
   - Subscribe to `balance_data`, `transaction_data`, `user_data` for the same normalized types as HTTP
   - Subscribe to push events (`balance_update`, `new_transaction`, etc.) for incremental updates
5. For on-demand partial refreshes, use `ws.requestBalances()` / `ws.requestTransactions()` (over WS) or `getMeBalances()` / `getMeTransactions()` (over HTTP fallback).
6. Persist user settings via `updateMeData(...)` as needed.
7. Let SDK auto-refresh/retry protected requests when session expires.
8. Call `ws.disconnect()` on logout or app close.
