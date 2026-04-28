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
| `rpId` | `widget-light.local`, `ibex.fi` | WebAuthn Relying Party ID — resolved from hostname |

### rpId resolution rules

- `*.ibex.fi` or `ibex.fi` → `ibex.fi`
- Any other domain → use as-is (e.g. `widget-light.local`)
- Empty/localhost → `localhost`

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

**Request body** — serialized WebAuthn assertion:

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
  }
}
```

**Response** — same JWT structure as sign-up.

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

**Response:**

```json
{
  "externalUserId": "32365339-da63-440a-af96-b68759221d2e",
  "subject": "32365339-da63-440a-af96-b68759221d2e",
  "data": {
    "app_key": "value"
  }
}
```

Notes:
- Response shape may vary: data may appear under `data`, `userdata`, or as a flat object. Normalize accordingly.
- The `externalUserId` (or `subject`) is the unique user identifier used for scoping local storage.

### 3.5 Update user data

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

    // Step 3: Store tokens
    store(tokens.access_token, tokens.refresh_token)

    // Step 4: Load profile (do NOT refresh first — JWT is already valid)
    profile = GET /v1.2/users/me
              with headers { Authorization: Bearer <token>, X-IBEx-Auth: Bearer <token> }
    store(profile.externalUserId)
    cacheProfileData(profile.data)   // scope: ${externalUserId}_${key}
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

The `rpId` used for WebAuthn **must be registered in IBEXSAFE**.

| rpId status | Sign-in/Sign-up | GET /users/me | POST /users/me |
|-------------|-----------------|---------------|----------------|
| Registered  | ✅ Works        | ✅ Works       | ✅ Works        |
| Not registered (e.g. `localhost`) | ✅ Works | ✅ Works | ❌ 400 `rpId is not valid` |

Write operations to `/users/me` **require** a registered rpId. Read operations work regardless.

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

The external user identifier may appear as:
- `externalUserId`
- `subject`
- `sub`
- `id`

Check in that priority order.

---

## 11. Quick Debug Checklist

- [ ] `IBEX_API_URL` is configured and reachable
- [ ] `rpId` resolves correctly from hostname
- [ ] Sign-in/sign-up options include `?wallet=passkeys&rpId=<rpId>`
- [ ] Both `X-Rp-Id` and `X-RpId` headers are sent
- [ ] base64url values are decoded to ArrayBuffer before WebAuthn calls
- [ ] PRF extension values are decoded to ArrayBuffer (not left as strings)
- [ ] Auth requests include both `Authorization` and `X-IBEx-Auth`
- [ ] No refresh call after successful auth (token is already valid)
- [ ] POST `/users/me` uses a registered rpId (not `localhost`)
- [ ] CORS is handled via proxy (not direct browser-to-IBEx)
- [ ] Proxy strips `content-encoding` from upstream responses
