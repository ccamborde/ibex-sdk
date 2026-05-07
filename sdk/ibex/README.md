# IBEx SDK

TypeScript SDK for IBEx Wallet API integrations.

Supported flows:

- Passkey sign-in (`GET/POST /v1.2/auth/sign-in`)
- Sign-up fallback (`GET/POST /v1.2/auth/sign-up`)
- JWT refresh (`POST /v1.2/auth/refresh`)
- User profile read/write (`GET/POST /v1.2/users/me`)
- User balances (`GET /v1.2/users/me/balances`)
- User transactions (`GET /v1.2/users/me/transactions`)
- User addresses (`GET /v1.2/users/me/address`)
- User signers (`GET /v1.2/users/me/signers`)
- User monitored tokens (`GET /v1.2/users/me/tokens`)
- User liquidity pools (`GET /v1.2/users/me/pools`)
- User lending positions (`GET /v1.2/users/me/lending`)
- Local session management + external-user scoped storage cleanup

## Local setup

```bash
cd sdk/ibex
npm install
npm run build
```

## Quick usage

```ts
import { createIbexSdk } from "./src";

const ibex = createIbexSdk({
  apiBaseUrl: "https://passkeys-testnet.ibex.fi",
  blockchainId: "421614", // optional
});

await ibex.authenticateWithPasskey();

const me = await ibex.getMe();
const balances = await ibex.getMeBalances({ page: 1, limit: 20 });
const transactions = await ibex.getMeTransactions({ page: 1, limit: 20 });
const addresses = await ibex.getMeAddress();
const signers = await ibex.getMeSigners();
const tokens = await ibex.getMeTokens();
const pools = await ibex.getMePools({ page: 1, limit: 20 });
const lending = await ibex.getMeLending({ page: 1, limit: 20 });

await ibex.updateMeData({
  "optin.newsletter": true,
});
```

## Main API

- `authenticateWithPasskey()`
- `getMe()`
- `updateMeData(data)`
- `getMeBalances(query?)`
- `getMeTransactions(query?)`
- `getMeAddress()`
- `getMeSigners()`
- `getMeTokens()`
- `getMePools(query?)`
- `getMeLending(query?)`
- `setAlertFlag(alertKey, enabled)` / `removeAlertFlag(alertKey)`
- `refreshSession()` / `refreshSessionDetailed()`
- `clearSessionAndScopedStorage()`

`getMeBalances(query?)` accepts:
- `walletAddress?: string`
- `includeZero?: boolean`
- `includePrices?: boolean`
- `page?: number`
- `limit?: number`

`getMeTransactions(query?)` accepts:
- `walletAddress?: string`
- `page?: number`
- `limit?: number`

`getMePools(query?)` and `getMeLending(query?)` accept:
- `walletAddress?: string`
- `page?: number`
- `limit?: number`

All authenticated methods send both `Authorization: Bearer ...` and `X-IBEx-Auth: Bearer ...`, and automatically retry once after a refresh when the API returns `401` or `403`.

## Test

```bash
cd sdk/ibex
npm test
```

## Notes

- IBEXSAFE prerequisite: your app `rpId` must exist in IBEXSAFE, or user endpoints may fail with `400` (`rpId is not valid`).
- `GET /users/me/balances` and `GET /users/me/transactions` can return `404` while address indexing is still in progress. Retry after a short delay.
- `/users/me` normalization:
  - if upstream returns `userdata`, SDK exposes it as `data`
  - if upstream returns a flat object, SDK still forces a `data` field
