# IBEx.Fi API Integration — Passkey Authentication & User Data

This document describes everything needed to integrate IBEx.Fi passkey authentication and user data management into any application, regardless of technology stack.

---

## 1. Overview

IBEx.Fi provides a WebAuthn-based passkey authentication system with JWT session management. The integration covers:

- **Sign-up**: Create a new account via WebAuthn `navigator.credentials.create()`
- **Sign-in**: Reconnect an existing account via WebAuthn `navigator.credentials.get()`
- **Token refresh**: Keep JWT sessions alive without re-authentication
- **User data**: Read and write arbitrary key/value data scoped to each user

The recommended UX is a **single-button flow**: attempt sign-in first, fall back to sign-up automatically. The user never has to choose.

---

## 2. Environment

| Variable | Example | Purpose |
|----------|---------|---------|
| `IBEX_API_URL` | `https://passkeys-testnet.ibex.fi` | Base URL of the IBEx API |
| `IBEX_RP_ID` | `localhost` or `demobaas-prat1.ibex.fi` | WebAuthn Relying Party ID — **must match the browser hostname** |
| `PORT` | `3001` | Local dev server port |

### rpId resolution rules

- `*.ibex.fi` or `ibex.fi` → `ibex.fi`
- Any other domain → use as-is (e.g. `widget-light.local`)
- Empty/localhost → `localhost`

### rpId / WebAuthn consistency (critical)

**`IBEX_RP_ID` must always match the hostname visible in the browser address bar.** This is a fundamental WebAuthn security constraint enforced by the browser — it cannot be bypassed by headers, query parameters, or code changes.

#### How the auth chain works

```
Browser hostname ──► WebAuthn rpId ──► JWT issuer ──► API request rpId header
       │                   │                │                    │
       └───── all four must be the same value ─────────────────┘
```

1. The browser enforces that WebAuthn `rpId` is the page hostname (or a valid registrable domain suffix)
2. IBEx signs the JWT with `issuer = rpId` from the sign-in request
3. On subsequent API calls, the server verifies `JWT.iss == request rpId` — mismatch → 401
4. The server verifies `authenticatorData.rpIdHash` against the rpId — mismatch → 401
5. Users/credentials are stored per rpId — different rpId = different user namespace

#### Valid local development configurations

| Scenario | Browser URL | `IBEX_RP_ID` | Auth | Read | Write |
|----------|-------------|-------------|------|------|-------|
| A — localhost | `http://localhost:5173/` | `localhost` | OK | OK | OK (registered on testnet) |
| B — custom host | `http://demobaas-prat1.ibex.fi:5173/` | `demobaas-prat1.ibex.fi` | OK | OK | OK (registered on testnet) |

Both `localhost` and `demobaas-prat1.ibex.fi` are registered rpIds on **testnet** (`passkeys-testnet.ibex.fi`). The rpId must be registered in IBEXSAFE for write operations — ask your IBEx administrator if deploying to a different environment.

**Scenario A** is the simplest for quick dev iteration. **Scenario B** uses the production-like hostname:

1. Add `127.0.0.1  demobaas-prat1.ibex.fi` to `/etc/hosts`
2. Set `IBEX_RP_ID=demobaas-prat1.ibex.fi`
3. Open `http://demobaas-prat1.ibex.fi:5173/` in browser

#### Common mistake: rpId mismatch from localhost

Setting `IBEX_RP_ID=demobaas-prat1.ibex.fi` while the browser is on `http://localhost:5173/` **will not work**:
- WebAuthn will refuse the ceremony ("rpId is not a registrable domain suffix of the current domain")
- Even if forced via header manipulation, the server will reject the credential (`rpIdHash` mismatch → 401)
- Attempting to "split" rpId (API headers → `demobaas-prat1.ibex.fi`, WebAuthn → `localhost`) also fails because the server verifies both against the same rpId

#### Proxy behavior

When a Node.js proxy forwards requests to IBEx, there is no browser `Origin` header. IBEx resolves rpId from `X-Rp-Id` / `X-RpId` headers (or `rpId` query parameter). The proxy must send the same rpId that the browser used for the WebAuthn ceremony — which must match the browser hostname.

---

## 3. API Endpoints

All endpoints are relative to `IBEX_API_URL`.

### 3.1 Sign-up (create account + get JWT)

#### A) Get sign-up options

```
GET /v1.2/auth/sign-up?wallet=passkeys&rpId=<rpId>
Headers: X-Rp-Id: <rpId>
         X-RpId: <rpId>
```

**Response** — WebAuthn creation options:

```json
{
  "credentialRequestOptions": {
    "challenge": "<base64url>",
    "rp": { "id": "widget-light.local", "name": "widget-light.local" },
    "user": {
      "id": "<base64url>",
      "name": "widget-light.local xxxx",
      "displayName": "widget-light.local xxxx"
    },
    "pubKeyCredParams": [{ "type": "public-key", "alg": -7 }],
    "attestation": "none",
    "excludeCredentials": [],
    "timeout": 60000,
    "extensions": {
      "prf": {
        "eval": { "first": "<base64url>", "second": "<base64url>" }
      }
    }
  }
}
```

#### B) Complete sign-up

```
POST /v1.2/auth/sign-up
Headers: Content-Type: application/json
         X-Rp-Id: <rpId>
         X-RpId: <rpId>
```

**Request body** — serialized WebAuthn attestation:

```json
{
  "credential": {
    "id": "<string>",
    "rawId": "<base64url>",
    "type": "public-key",
    "response": {
      "attestationObject": "<base64url>",
      "clientDataJSON": "<base64url>"
    },
    "clientExtensionResults": {}
  }
}
```

**Response** — JWT tokens:

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 3.2 Sign-in (reconnect existing account)

#### A) Get sign-in options

```
GET /v1.2/auth/sign-in?wallet=passkeys&rpId=<rpId>
Headers: X-Rp-Id: <rpId>
         X-RpId: <rpId>
```

**Response** — WebAuthn request options:

```json
{
  "credentialRequestOptions": {
    "challenge": "<base64url>",
    "rpId": "widget-light.local",
    "timeout": 60000,
    "userVerification": "required",
    "allowCredentials": []
  }
}
```

#### B) Complete sign-in

```
POST /v1.2/auth/sign-in
Headers: Content-Type: application/json
         X-Rp-Id: <rpId>
         X-RpId: <rpId>
```

**Request body** — serialized WebAuthn assertion + enrichment flags:

```json
{
  "credential": {
    "id": "<string>",
    "rawId": "<base64url>",
    "type": "public-key",
    "response": {
      "authenticatorData": "<base64url>",
      "clientDataJSON": "<base64url>",
      "signature": "<base64url>",
      "userHandle": "<base64url or null>"
    },
    "clientExtensionResults": {}
  },
  "includeBalance": true,
  "includeTransactions": true,
  "includeUserdata": true
}
```

**Always include the three `include*` flags.** This returns all user data in the auth response, eliminating the need for a separate `GET /users/me` call after sign-in.

**Response** — JWT tokens + enriched data:

```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "subject": "<externalUserId>",
  "issuer": "<rpId>",
  "authMethod": "PASSKEY",
  "safeAddress": { "421614": "0x..." },
  "balance": { "0x...": { "address": "0x...", "balance": "123.45" } },
  "transactions": { "total": 2, "page": 1, "data": [] },
  "userdata": {
    "addresses": { "status": 200, "data": { "count": 1, "wallets": [] } },
    "balances": { "status": 200, "data": {} },
    "kycStatus": { "status": 200, "data": { "kycLevel": "0", "verified": false } }
  }
}
```

Key fields: `subject` = `externalUserId`, `userdata` = same shape as `GET /users/me` response.

### 3.3 Refresh token

```
POST /v1.2/auth/refresh
Headers: Content-Type: application/json
```

**Request body:**

```json
{
  "refresh_token": "<current_refresh_token>"
}
```

**Response** — new JWT pair (same structure as sign-up/sign-in).

### 3.4 Read user data

```
GET /v1.2/users/me
Headers: Authorization: Bearer <access_token>
         X-IBEx-Auth: Bearer <access_token>
         X-Rp-Id: <rpId>
         X-RpId: <rpId>
```

**Response** — aggregated user profile with sections:

```json
{
  "addresses": { "count": 1, "wallets": [] },
  "balances": { "type": "crypto", "identifier": "0x..." },
  "ibans": { "count": 5, "ibans": [] },
  "signers": { "count": 1, "signers": [] },
  "transactions": { "type": "crypto", "data": [] },
  "kycStatus": {
    "externalUserId": "604a81ce-...",
    "kycLevel": "2",
    "status": "verified",
    "verified": true
  },
  "addressbook": { "entries": [] }
}
```

**Important — `externalUserId` is NOT at the top level of this response.** See section 3.5 below for how to obtain it.

Notes:
- `GET /users/me` is an **aggregator** that returns multiple sections. If one section fails, it is omitted and an `errors` object may be present.
- User data (key/value pairs set via `POST /users/me`) may appear inside the sections, not as a flat top-level `data` object.
- Do **not** try to extract `externalUserId` from this response — it is not reliably present here (e.g. `kycStatus` may be absent if the user has no KY).

### 3.5 Where to find `externalUserId`

The `externalUserId` is the unique user identifier used for scoping local storage and session context. It is **not** in `GET /users/me` — extract it from auth responses.

| Source | Location | Reliability |
|--------|----------|-------------|
| Auth response (sign-in/sign-up/refresh) | `response.subject` | **Always present** — preferred source |
| JWT token | Decode JWT → `sub` claim | **Always present** — works anytime you have a stored token |

**Best practice**: extract `externalUserId` from the **auth response `subject` field** immediately after sign-in/sign-up, then persist it in session.

```
// After POST /v1.2/auth/sign-in or POST /v1.2/auth/sign-up:
authResponse = { access_token, refresh_token, subject, ... }
externalUserId = authResponse.subject   // ← this IS the externalUserId
store(externalUserId)
```

**Fallback**: if you need the `externalUserId` later and didn't persist it from auth, decode the stored `access_token` JWT and read the `sub` claim.

**Common mistakes**:
- Looking for `externalUserId` at the top level of `GET /users/me` — it does not exist there. The response is an aggregated object with sections (`addresses`, `balances`, `kycStatus`, etc.).
- Looking for `externalUserId` in `kycStatus.externalUserId` — this only works if the user has KY data, which is not guaranteed.

### 3.6 Update user data

```
POST /v1.2/users/me
Headers: Authorization: Bearer <access_token>
         X-IBEx-Auth: Bearer <access_token>
         X-Rp-Id: <rpId>
         X-RpId: <rpId>
         Content-Type: application/json
```

**Request body — set keys:**

```json
{
  "data": {
    "app_key": "new_value"
  }
}
```

**Delete a key** — send `null`:

```json
{
  "data": {
    "app_key": null
  }
}
```

---

## 4. Authentication Flow (pseudocode)

```
function authenticate():
    rpId = resolveRpId(hostname)
    tokens = null

    // Step 1: Try sign-in
    try:
        options = GET /v1.2/auth/sign-in?wallet=passkeys&rpId={rpId}
                  with headers { X-Rp-Id, X-RpId }
        webauthnOptions = normalizeForWebAuthn(options.credentialRequestOptions)
        assertion = navigator.credentials.get({ publicKey: webauthnOptions })
        response = POST /v1.2/auth/sign-in
                   with body { credential: serialize(assertion) }
                   with headers { Content-Type, X-Rp-Id, X-RpId }
        tokens = extractTokens(response)
    catch:
        tokens = null   // expected for new users

    // Step 2: Fallback to sign-up
    if tokens is null:
        options = GET /v1.2/auth/sign-up?wallet=passkeys&rpId={rpId}
        webauthnOptions = normalizeForWebAuthn(options.credentialRequestOptions)
        attestation = navigator.credentials.create({ publicKey: webauthnOptions })
        response = POST /v1.2/auth/sign-up
                   with body { credential: serialize(attestation) }
        tokens = extractTokens(response)

    // Step 3: Store tokens + externalUserId from auth response
    store(tokens.access_token, tokens.refresh_token)
    externalUserId = tokens.subject   // ← auth response always has subject = externalUserId
    store(externalUserId)

    // Step 4: Use enriched data from auth response — do NOT call GET /users/me
    // If includeUserdata was set in POST sign-in body:
    //   tokens.userdata = same aggregated data as GET /users/me
    // If includeBalance was set:
    //   tokens.balance = user balances
    // If includeTransactions was set:
    //   tokens.transactions = transaction history
    cacheUserData(tokens.userdata)    // scope: ${externalUserId}_*
```

---

## 5. Session Management Rules

### Token storage

Store these three values locally (e.g. localStorage, secure storage):
- `access_token` — JWT for authenticated requests
- `refresh_token` — JWT for session renewal
- `external_user_id` — UUID from `/users/me`, used as scope prefix

### Scoped data caching

Profile data from `/users/me` is cached with a user-scoped key:
```
${externalUserId}_${key} = value
```
This prevents collisions when multiple users share the same browser/device.

### Refresh strategy

1. On 401 or 403 from any authenticated endpoint: call `POST /v1.2/auth/refresh` once.
2. Retry the original request with the new `access_token`.
3. If the refresh itself fails (401/403): clear ALL stored data and require re-authentication.
4. **Never** call refresh immediately after a successful sign-in/sign-up — the token is already valid.

### Session cleanup

When clearing a session, remove:
1. All scoped entries matching `${externalUserId}_*`
2. `access_token`
3. `refresh_token`
4. `external_user_id`

---

## 6. WebAuthn Data Conversion Rules

IBEx API uses **base64url-encoded strings** for all binary WebAuthn fields. The browser WebAuthn API requires **ArrayBuffer**. You must convert between the two.

### Fields to decode (base64url → ArrayBuffer) BEFORE calling WebAuthn:

**Sign-in options:**
- `challenge`
- `allowCredentials[].id`

**Sign-up options:**
- `challenge`
- `user.id`
- `excludeCredentials[].id`
- `extensions.prf.eval.first` and `extensions.prf.eval.second`
- `extensions.prf.evalByCredential.*` values

### Fields to encode (ArrayBuffer → base64url) AFTER WebAuthn returns:

**Sign-in assertion:**
- `rawId`
- `response.authenticatorData`
- `response.clientDataJSON`
- `response.signature`
- `response.userHandle`

**Sign-up attestation:**
- `rawId`
- `response.attestationObject`
- `response.clientDataJSON`

### PRF extension values are critical

If not decoded from base64url to ArrayBuffer before `navigator.credentials.create()`:
```
TypeError: Failed to read the 'extensions' property ...
The provided value is not of type '(ArrayBuffer or ArrayBufferView)'
```

---

## 7. Header Rules

### RP ID headers

IBEx may check either `X-Rp-Id` or `X-RpId` depending on environment. **Always send both.**

### Auth headers for `/users/me`

Send **both**:
- `Authorization: Bearer <access_token>`
- `X-IBEx-Auth: Bearer <access_token>`

IBEx may validate either depending on endpoint and version.

### Query parameters for sign-in/sign-up options

GET requests for WebAuthn options **must** include:
```
?wallet=passkeys&rpId=<rpId>
```

---

## 8. CORS Considerations

If calling IBEx from a browser, direct requests will be blocked by CORS:
```
Access-Control-Allow-Headers does not include "Authorization"
```

**Solution**: Use a backend/server-side proxy that:
1. Receives requests from the browser on the same origin
2. Forwards them server-side to `IBEX_API_URL`
3. Maps browser `X-IBEx-Auth` to upstream `Authorization`
4. Returns responses without CORS restrictions

If using a proxy with auto-decompression (e.g. Node.js `fetch`), strip `content-encoding`, `content-length`, and `transfer-encoding` from upstream responses to avoid `ERR_CONTENT_DECODING_FAILED`.

---

## 9. rpId Registration Prerequisite

The `rpId` used for WebAuthn **must be registered in IBEXSAFE** for write operations.

| rpId status | Sign-in/Sign-up | GET /users/me | POST /users/me |
|-------------|-----------------|---------------|----------------|
| Registered  | ✅ Works        | ✅ Works       | ✅ Works        |
| Not registered | ✅ Works | ✅ Works | ❌ 400 `rpId is not valid` |

Write operations to `/users/me` **require** a registered rpId. Read operations work regardless.

> **Note**: Both `localhost` and `demobaas-prat1.ibex.fi` are registered rpIds on **TESTNET** (`passkeys-testnet.ibex.fi`). The rpId must be registered in IBEXSAFE for your target environment — ask your IBEx administrator if unsure.

### rpId mismatch — the #1 integration pitfall

The most common integration failure is a **rpId mismatch** between the WebAuthn ceremony and subsequent API calls. This manifests as:

1. Sign-in succeeds (200)
2. First API calls succeed (same rpId)
3. Some API calls suddenly return 401 — because a different part of the app sends a different rpId

**Root cause**: the JWT has `issuer = rpId_from_signin`, but a subsequent request sends a different rpId in headers → server rejects with 401.

**Diagnosis checklist**:
- Check that the **browser hostname** matches `IBEX_RP_ID`
- Check that the **proxy** forwards the same rpId value in `X-Rp-Id` / `X-RpId` headers as the one used at sign-in
- Check that there is no code path that overrides rpId to a different value after auth
- Remember: users are namespaced by rpId. A user created with `rpId=localhost` does not exist under `rpId=demobaas-prat1.ibex.fi`

### Local development setup

| Scenario | Browser URL | IBEX_RP_ID | Notes |
|----------|-------------|-----------|-------|
| A — Quick start | `http://localhost:5173/` | `localhost` | Everything works (registered on testnet) |
| B — Custom hostname | `http://demobaas-prat1.ibex.fi:5173/` | `demobaas-prat1.ibex.fi` | Everything works (requires `/etc/hosts`: `127.0.0.1 demobaas-prat1.ibex.fi`) |
| ⛔ Invalid | `http://localhost:5173/` | `demobaas-prat1.ibex.fi` | WebAuthn refuses the rpId. Cannot work. |

---

## 10. Response Payload Normalization

### Token extraction

Auth endpoints may return tokens under different keys:
- `access_token` (standard) or `token`
- `refresh_token`

Always check both `access_token` and `token` fields.

### User profile shape drift

`/users/me` response structure varies by environment/version:

| Shape | Location of user data |
|-------|----------------------|
| Standard | `response.data` |
| Legacy | `response.userdata` |
| Flat | Directly on `response` |

Always normalize: check `data` → `userdata` → root object.

### User ID extraction

The `externalUserId` is **not** in the `GET /users/me` response. Extract it from:
1. **Auth response** (`POST sign-in/sign-up/refresh`): always returned as `subject`
2. **JWT `sub` claim**: decode the stored `access_token`

Do **not** look for `externalUserId` at the top level of `GET /users/me` — it is an aggregated response with sections, not a flat user object.

---

## 11. Quick Debug Checklist

- [ ] `IBEX_API_URL` is configured and reachable
- [ ] **`IBEX_RP_ID` matches the hostname in the browser address bar** (e.g. `localhost` for `http://localhost:5173/`, `demobaas-prat1.ibex.fi` for `http://demobaas-prat1.ibex.fi:5173/`)
- [ ] rpId is consistent across the entire chain: browser WebAuthn → proxy headers → JWT issuer → API verification
- [ ] Sign-in/sign-up options include `?wallet=passkeys&rpId=<rpId>`
- [ ] Both `X-Rp-Id` and `X-RpId` headers are sent
- [ ] base64url values are decoded to ArrayBuffer before WebAuthn calls
- [ ] PRF extension values are decoded to ArrayBuffer (not left as strings)
- [ ] Auth requests include both `Authorization` and `X-IBEx-Auth`
- [ ] No refresh call after successful auth (token is already valid)
- [ ] POST `/users/me` uses a registered rpId (both `localhost` and `demobaas-prat1.ibex.fi` are registered on testnet)
- [ ] CORS is handled via proxy (not direct browser-to-IBEx)
- [ ] Proxy strips `content-encoding` from upstream responses
- [ ] No attempt to "split" rpId between API headers and WebAuthn ceremony
