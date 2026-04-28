# IBEx SDK (tmp/ibex)

TypeScript SDK built from the real project integration:

- passkey sign-in (`GET/POST /v1.2/auth/sign-in`)
- sign-up fallback (`GET/POST /v1.2/auth/sign-up`)
- token refresh (`POST /v1.2/auth/refresh`)
- profile read/write (`GET/POST /v1.2/users/me`)
- local session management + user-scoped storage cleanup

## Local installation

```bash
cd tmp/ibex
npm install
npm run build
```

## Quick usage

```ts
import { createIbexSdk } from "./src";

const ibex = createIbexSdk({
  apiBaseUrl: "https://passkeys-testnet.ibex.fi",
  // optional, depending on IBEx environment
  blockchainId: "421614",
});

// 1) Passkey auth (sign-in, then sign-up fallback)
await ibex.authenticateWithPasskey();

// 2) Read /users/me
const me = await ibex.getMe();

// 3) Write an application flag
await ibex.updateMeData({
  foo_993056795_alert: true,
});
```

## Main API

- `authenticateWithPasskey()`
  - tries sign-in, then sign-up fallback
  - stores `accessToken` + `refreshToken`
- `getMe()`
  - calls `/v1.2/users/me` with `X-IBEx-Auth` + `Authorization`
  - automatic refresh/retry on 401/403
- `updateMeData(data)`
  - posts `{ data }` to `/v1.2/users/me`
- `setAlertFlag(alertKey, enabled)` / `removeAlertFlag(alertKey)`
- `refreshSession()`
- `refreshSessionDetailed()`
- `clearSessionAndScopedStorage()`

## Important notes

- IBEXSAFE prerequisite: the app `rpId` must be created/registered in IBEXSAFE.
  - Without this prerequisite, `GET /users/me` and `POST /users/me` may fail with `400` (`"rpId is not valid"`).
  - Check this first if auth succeeds but `/users/me` fails.
- RP ID is resolved dynamically (`ibex.fi` on IBEx domains, otherwise the exact current host).
- WebAuthn Base64url <-> ArrayBuffer conversion is handled in `src/utils.ts`.
- `/users/me` normalization:
  - if upstream returns `userdata`, SDK exposes it as `data`.
  - if upstream returns a flat object, SDK still forces a `data` field.
- User localStorage keys are cleaned with prefix `${externalUserId}_` when the session expires.
