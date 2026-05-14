# IBEx SDK Endpoints

This document lists the HTTP endpoints currently integrated in the IBEx SDK (`sdk/ibex`) and explains how client applications should use them through SDK methods.

## Scope

The SDK currently integrates:

- Passkey authentication (sign-in with sign-up fallback)
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
- Safe operations (prepare + execute two-step flow):
  - sign message (EIP-191)
  - enable recovery
  - cancel recovery
  - swap from quote
- Swap quote (get DEX quotes from COWSWAP / 1INCH)
- SEPA resources:
  - IBAN add/list
  - payment intent/confirmation
  - transactions list/detail
  - mandates create/list/detail/status/cancel

### SDK Normalization Pattern

The SDK normalizes complex, nested API responses into stable, flat structures. This shields consumers from API format changes and simplifies data access:

| SDK Method | Returns (normalized) | Raw alternative |
|---|---|---|
| `getMe()` | `IbexNormalizedProfile` | `getMeRaw()` |
| `getMeBalances(query?)` | `IbexNormalizedBalances` | `getMeBalancesRaw(query?)` |
| `getMeTransactions(query?)` | `IbexNormalizedTransactions` | `getMeTransactionsRaw(query?)` |

- **Normalized methods** flatten nested API structures (e.g. `crypto[chainId][walletAddress]` → flat `wallets[]` array) into typed, developer-friendly objects.
- **Raw methods** return the untouched API response for debugging or advanced use cases.
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
| `getMeTokens()` | `GET` | `/v1.2/users/me/tokens` |
| `getMePools(query?)` | `GET` | `/v1.2/users/me/pools` |
| `getMeLending(query?)` | `GET` | `/v1.2/users/me/lending` |
| `getMeAddressBook()` | `GET` | `/v1.2/users/me/addressbook` |
| `createMeAddressBookEntry(input)` | `POST` | `/v1.2/users/me/addressbook` |
| `updateMeAddressBookEntry(id, input)` | `PUT` | `/v1.2/users/me/addressbook/:id` |
| `deleteMeAddressBookEntry(id)` | `DELETE` | `/v1.2/users/me/addressbook/:id` |
| `addMeAddressBookCrypto(id, input)` | `POST` | `/v1.2/users/me/addressbook/:id/crypto` |
| `deleteMeAddressBookCrypto(id, chainId, address)` | `DELETE` | `/v1.2/users/me/addressbook/:id/crypto/:chainId/:address` |
| `deleteMeAddressBookIban(id, iban)` | `DELETE` | `/v1.2/users/me/addressbook/:id/ibans/:iban` |
| `getChains()` | `GET` | `/v1.2/chains/` |
| `addSepaIban(payload)` | `POST` | `/v1.2/sepa/iban/add` |
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

## Detailed Endpoint Usage

### 1) Authentication

### `authenticateWithPasskey()`

Flow implemented by SDK:

1. `GET /v1.2/auth/sign-in` to fetch WebAuthn options
2. Browser passkey assertion via `navigator.credentials.get(...)`
3. `POST /v1.2/auth/sign-in` with serialized `credential`
4. If sign-in does not return usable tokens:
   - `GET /v1.2/auth/sign-up`
   - Browser passkey registration via `navigator.credentials.create(...)`
   - `POST /v1.2/auth/sign-up` with serialized `credential`

Expected SDK result:

- stores `access_token`
- stores `refresh_token` when present

### `refreshSession()` / `refreshSessionDetailed()`

- Endpoint: `POST /v1.2/auth/refresh`
- Request body sent by SDK:
  - `{ "refresh_token": "<stored_refresh_token>" }`
- Behavior:
  - updates stored access/refresh tokens
  - `refreshSessionDetailed()` also returns request/response metadata (`status`, `requestId`, payload)

### 2) User Profile

### `getMe()`

- Endpoint: `GET /v1.2/users/me`
- Purpose: fetch authenticated user profile (aggregator endpoint) and return all sections in a normalized, stable structure
- **Returns `IbexNormalizedProfile`**:
  ```
  {
    externalUserId?: string,
    rpId?: string,
    signerId?: string,
    wallets: [
      { safeAddress, chainIds, threshold, primary, eoaAddresses: [{ type, address }], ... },
      ...
    ],
    signers: [
      { id, type, walletMode, keyName, createdAt, safesCount, ... },
      ...
    ],
    ibans: [...],
    balances?: IbexNormalizedBalances,     // same shape as getMeBalances()
    transactions?: IbexNormalizedTransactions,  // same shape as getMeTransactions()
    kycStatus?: { externalUserId, kycLevel, status, verified },
    addressbook: [...],
    data?: { ... },                        // userdata key-value store
    errors?: { "<section>": { status, message } }
  }
  ```
- The SDK normalizes all nested sections:
  - `balances` → reuses `normalizeBalancesResponse()` (flat `wallets[]` array)
  - `transactions` → reuses `normalizeTransactionsResponse()` (flat `chains[]` array)
  - `addresses.wallets[]` → extracts `eoaAddresses` from `derived.global.eoaAddresses`
  - `signers`, `ibans`, `addressbook`, `kycStatus` → passed through as typed arrays/objects
- Extracts and stores `externalUserId` automatically

### `getMeRaw()`

- Same endpoint as `getMe()`.
- Returns `IbexUserProfile` — the raw API response with minimal normalization (legacy `data`/`userdata` extraction only).
- Use this if you need the original API structure.

### `updateMeData(data)`

- Endpoint: `POST /v1.2/users/me`
- Request body sent by SDK:
  - `{ "data": { ... } }`
- Typical usage:
  - store app-specific user preferences/flags

### `setAlertFlag(alertKey, enabled)` / `removeAlertFlag(alertKey)`

- Built on top of `POST /v1.2/users/me`
- Request body pattern:
  - enable: `{ "data": { "<alertKey>": true|false } }`
  - remove: `{ "data": { "<alertKey>": null } }`

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

### `getMeTransactionsRaw(query?)`

- Same endpoint and query params as `getMeTransactions()`.
- Returns `IbexUserTransactionsResponse` — the raw API response without normalization.
- Use this if you need the original API structure (e.g. for debugging or advanced use cases).

### `getMeAddress()`

- Endpoint: `GET /v1.2/users/me/address`
- Purpose: return user wallet address data

### `getMeSigners()`

- Endpoint: `GET /v1.2/users/me/signers`
- Purpose: return signer identities attached to the authenticated user

### `getMeTokens()`

- Endpoint: `GET /v1.2/users/me/tokens`
- Purpose: return monitored token list available to the user context

### `getMePools(query?)`

- Endpoint: `GET /v1.2/users/me/pools`
- Supported query params in SDK:
  - `walletAddress?: string`
  - `page?: number`
  - `limit?: number`

### `getMeLending(query?)`

- Endpoint: `GET /v1.2/users/me/lending`
- Supported query params in SDK:
  - `walletAddress?: string`
  - `page?: number`
  - `limit?: number`

### `getMeAddressBook()`

- Endpoint: `GET /v1.2/users/me/addressbook`
- Response shape:
  - `{ success: boolean, data: [ { id, name, label?, userValidated?, crypto?, ibans?, createdAt?, updatedAt? } ] }`

### `createMeAddressBookEntry(input)`

- Endpoint: `POST /v1.2/users/me/addressbook`
- Request body:
  - `name: string` (required)
  - `label?: string`
  - `userValidated?: boolean`
  - `crypto?: Array<{ chainId, address }>`
  - `iban?: string` (must be paired with `respondingPspBic`)
  - `respondingPspBic?: string` (must be paired with `iban`)
  - `remittanceInfo?: string`
- SDK behavior:
  - throws a client-side error if only one of `iban` / `respondingPspBic` is provided.
- Integration note:
  - do not call a separate VoP endpoint from the SDK for this flow.
  - VoP is handled internally by `POST /v1.2/users/me/addressbook` when `iban` + `respondingPspBic` are provided.

### `updateMeAddressBookEntry(id, input)`

- Endpoint: `PUT /v1.2/users/me/addressbook/:id`
- Request body supports partial updates:
  - `name?: string`
  - `label?: string`
  - `userValidated?: boolean`

### `deleteMeAddressBookEntry(id)`

- Endpoint: `DELETE /v1.2/users/me/addressbook/:id`

### `addMeAddressBookCrypto(id, input)`

- Endpoint: `POST /v1.2/users/me/addressbook/:id/crypto`
- Request body:
  - `chainId: string | number`
  - `address: string`

### `deleteMeAddressBookCrypto(id, chainId, address)`

- Endpoint: `DELETE /v1.2/users/me/addressbook/:id/crypto/:chainId/:address`
- SDK behavior:
  - URL-encodes `chainId` and `address` path params.

### `deleteMeAddressBookIban(id, iban)`

- Endpoint: `DELETE /v1.2/users/me/addressbook/:id/ibans/:iban`
- SDK behavior:
  - URL-encodes `iban` path param.

### 4) Chain Capability Discovery

### `getChains()`

- Endpoint: `GET /v1.2/chains/`
- Purpose: return active chains and their enabled modules. Used to gate features (transfer, recovery, automation, multi-sig, cowswap) per chain before enabling them in UI.
- Response shape:
  - `Array<{ id: number, name?: string, modules?: { billing?, cowswap?, recovery?, automation? } }>`
- Usage:
  - Resolve user chain context from `getMe()` → `wallets[].chainIds[]` (each wallet lists its chain IDs)
  - Join wallet chain IDs with `getChains()` entries by `id` to get chain `name` and `modules`
  - If a user has a wallet on a chain but a module is `false` in `getChains()`, the feature must stay hidden/disabled for that chain

### 5) SEPA Endpoints

### `addSepaIban(payload)`

- Endpoint: `POST /v1.2/sepa/iban/add`
- Request body:
  - `holderName: string` (required)
  - `safeAddress?: string`
  - `blockchainId?: number`
- Response shape:
  - `{ success: boolean, data: { iban metadata... } }`

### `getSepaIbans()`

- Endpoint: `GET /v1.2/sepa/iban`
- Response shape:
  - `{ success: boolean, data: [ { iban metadata... } ] }`

### `createSepaPaymentIntent(payload)`

- Endpoint: `POST /v1.2/sepa/payments`
- Purpose: create a payment approval intent and return a passkey challenge.
- Request body:
  - `reference`, `channel`, `amount`, `currency`, optional `remittanceInfo`
  - `debtor: { name, iban }`
  - `creditor: { name, iban }`
- Response shape:
  - `{ success: boolean, data: { approvalId, approvalHash, expiresAt, credentialRequestOptions } }`

### `confirmSepaPayment(payload)`

- Endpoint: `PUT /v1.2/sepa/payments`
- Purpose: execute an existing approval intent.
- Request body:
  - `approvalId: string`
  - `credential: <serialized WebAuthn assertion>`
- Response shape:
  - `{ success: boolean, data: { approvalId, approvalHash, payment } }`

### `getSepaTransactions(query?)`

- Endpoint: `GET /v1.2/sepa/transactions`
- Supported query params in SDK:
  - `iban?: string`
  - `type?: "SEPA_IN" | "SEPA_OUT"`
  - `status?: string`
  - `statusCode?: string`
  - `search?: string`
  - `page?: number`
  - `limit?: number`
- Response shape:
  - `{ success: boolean, data: [ ... ], pagination: { total, page, limit, pages } }`

### `getSepaTransactionById(id)`

- Endpoint: `GET /v1.2/sepa/transactions/:id`
- Purpose: return the full SEPA transaction payload for a single transaction id.

### `createSepaMandate(payload)`

- Endpoint: `POST /v1.2/sepa/mandates`
- Purpose: create and persist a SEPA mandate, then trigger the downstream SEPA synchronization.
- Request body:
  - `sourceIban: string`
  - `destinationIban: string`
  - `destinationName?: string`
  - `destinationBic?: string`
  - `percent: number`
  - `trigger?: { mode: "all" | "whitelist", whitelistRules?: [...] }`
  - `signature: { message: string, signature: string, safeOperationUserOpHash?: string }`
- Response shape:
  - `{ success: boolean, data: { mandate... }, sepaSync?: { ... } }`

### `getSepaMandates()`

- Endpoint: `GET /v1.2/sepa/mandates`
- Purpose: return all stored mandates for the authenticated user context.
- Response shape:
  - `{ success: boolean, data: [ { mandate... } ] }`

### `getSepaMandateById(id)`

- Endpoint: `GET /v1.2/sepa/mandates/:id`
- SDK behavior:
  - URL-encodes `id` path param.
- Purpose: return one mandate by id.

### `updateSepaMandateStatus(id, payload)`

- Endpoint: `PATCH /v1.2/sepa/mandates/:id/status`
- SDK behavior:
  - URL-encodes `id` path param.
- Request body:
  - `{ status: "validated" | "suspended" | "cancelled" }`
- Purpose: update mandate status and trigger downstream synchronization.

### `cancelSepaMandate(id)`

- Endpoint: `POST /v1.2/sepa/mandates/:id/cancel`
- SDK behavior:
  - URL-encodes `id` path param.
- Purpose: convenience cancellation endpoint for mandate termination.

### 6) Safe Operations

All Safe operations follow a two-step flow: **prepare** (POST) returns a WebAuthn challenge, then **execute** (PUT) submits the signed credential.

### `prepareSafeOperations(request)`

- Endpoint: `POST /v1.2/safes/operations`
- Purpose: prepare one or more Safe operations and receive a WebAuthn challenge for signing.
- Request body:
  - `safeAddress: string` (required)
  - `operations: IbexSafeOperation[]` (required)
  - `chainId?: number`
  - `signerId?: string`
  - `walletMode?: "SAFE_4337" | "EOA_7702"`
  - `eoaKeySelection?: { family: string, index: number, safeAddress?: string }`
- Response shape:
  - `{ credentialRequestOptions: { challenge, rpId, timeout, allowCredentials, userVerification, extensions, data } }`

### `executeSafeOperations(request)`

- Endpoint: `PUT /v1.2/safes/operations`
- Purpose: submit the WebAuthn assertion obtained after `prepareSafeOperations` to execute the operation on-chain.
- Request body:
  - `credential: object` (required, serialized WebAuthn assertion)
  - `chainId?: number`
- Response shape:
  - `{ userOpHash?: string, txHash?: string, walletMode?: string, success?: boolean }`

### `signMessage(safeAddress, message, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `SIGN_MESSAGE` operation.
- Parameters:
  - `safeAddress: string` (required)
  - `message: string` (required)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge for EIP-191 personal_sign)

### `enableRecovery(safeAddress, identity, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `ENABLE_RECOVERY` operation.
- Parameters:
  - `safeAddress: string` (required)
  - `identity: { firstName, lastName, birthDate, birthCity, birthCountry }` (required, `birthDate` format `YYYY-MM-DD`)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Note: Safe must already be deployed on-chain.

### `cancelRecovery(safeAddress, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `CANCEL_RECOVERY` operation.
- Parameters:
  - `safeAddress: string` (required)
  - `options?: { chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Note: Safe must already have recovery enabled.

### 7) Swap Quote

### `getSwapQuote(query)`

- Endpoint: `GET /v1.2/safes/swap/quote`
- Purpose: get a swap quote from COWSWAP and/or 1INCH. Uses the authenticated user's first Safe as receiver when `safeAddress` is not provided.
- Supported query params in SDK:
  - `sellTokenAddress: string` (required, EVM token address to sell)
  - `buyTokenAddress: string` (required, EVM token address to buy)
  - `amount: string` (required, human-readable sell amount)
  - `chainId?: number` (optional, defaults to environment chain)
  - `safeAddress?: string` (optional, defaults to user's first Safe)
  - `provider?: "COWSWAP" | "1INCH" | "BOTH"` (optional, defaults to `"BOTH"`)
- Response shape:
  - `{ quoteId?, orderUid?, buyAmount?, sellAmount?, fee?, validUntil?, provider?, ... }`
- The returned `quoteId` is used with `SWAP_FROM_QUOTE` in `POST /v1.2/safes/operations`.

### `swapFromQuote(safeAddress, quoteId, options?)`

- Convenience wrapper around `prepareSafeOperations` with a single `SWAP_FROM_QUOTE` operation.
- Parameters:
  - `safeAddress: string` (required)
  - `quoteId: string` (required, obtained from `getSwapQuote`)
  - `options?: { orderUid?, chainId?, walletMode?, eoaKeySelection? }`
- Returns: `IbexSafePrepareResponse` (WebAuthn challenge)
- Typical flow:
  1. `getSwapQuote(...)` → obtain `quoteId`
  2. `swapFromQuote(safeAddress, quoteId)` → obtain WebAuthn challenge
  3. Sign with `navigator.credentials.get()`
  4. `executeSafeOperations({ credential })` → on-chain execution

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

## What Is Not Exposed by This SDK (Current Version)

The following API families are not wrapped by high-level SDK methods in `sdk/ibex` yet:

- email validation/confirmation routes
- domain/admin/config endpoints
- safe-provision routes (deploy, lazy-create)
- batch operations (`batch-intent` / `batch-execute`)
- automation module config (`PUT /v1.2/safes/{safeAddress}/automation-module/config`)

## Recommended Client Integration Order

1. Initialize SDK with `apiBaseUrl` (and optional `blockchainId`).
2. Call `authenticateWithPasskey()`.
3. Load full profile with `getMe()` — this single call returns **all** normalized user data:
   - `wallets[]` (with `eoaAddresses[]`), `signers[]`, `ibans[]`
   - `balances` (same structure as `getMeBalances()`)
   - `transactions` (same structure as `getMeTransactions()`)
   - `kycStatus`, `addressbook[]`, `data` (userdata)
4. For subsequent partial refreshes, use dedicated methods (`getMeBalances()`, `getMeTransactions()`, etc.) instead of reloading the full profile.
5. Persist user settings via `updateMeData(...)` as needed.
6. Let SDK auto-refresh/retry protected requests when session expires.
