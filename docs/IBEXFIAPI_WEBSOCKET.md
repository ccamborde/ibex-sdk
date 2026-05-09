# IBEX FI API WebSocket

## Overview

The IBEX FI API exposes a client WebSocket endpoint at `/ws` for authenticated real-time updates.

- Client endpoint: `wss://<api-host>/ws`
- Auth model: JWT sent in the first WebSocket message (`type: "auth"`)
- Upstream real-time source: BCReader WebSocket (`BCREADER_WS_URL`)
- Upstream fallback for requests: BCReader HTTP (`BCREADER_URL`)

The server supports one active WebSocket session per `(externalUserId, rpId)`.

## Connection and Authentication

### URL

```text
wss://<api-host>/ws?blockchainId=<optional-chain-id>
```

- `blockchainId` is optional.
- If missing, the API uses `DEFAULT_CHAIN_ID`.
- Browser clients should use query params because custom headers are not available in native WebSocket constructor.

### Required first message

```json
{
  "type": "auth",
  "token": "<JWT access token>",
  "clientName": "My App"
}
```

Authentication checks performed by the API:

1. Resolve `rpId` from host/origin middleware context.
2. Verify JWT signature with `JWT_SECRET`.
3. Verify `decoded.iss === rpId`.
4. Resolve user safe for the requested/effective chain.
5. Reject duplicate active session for same `(externalUserId, rpId)`.

### Authentication timeout and close codes

- No auth message after 30 seconds: close code `4001`.
- Auth failure: close code `4002`.
- Duplicate session: close code `4003`.
- Internal server error during handshake: close code `1011`.

## Server to Client Messages

All messages use:

```json
{
  "type": "<event>",
  "data": {},
  "timestamp": "2026-05-04T14:00:00.000Z"
}
```

### Auth and session events

- `auth_success`
- `connection_success` (legacy compatibility event)
- `auth_error`

### Initial data burst after successful auth

The server sends:

- `user_data` (may be skipped once if a very recent HTTP marker exists)
- `balance_data` with `data.mode = "initial"`
- `transaction_data` with `data.mode = "initial"`
- `chainid_data`
- `recovery_data`
- `user_data` again (full post-auth snapshot)

Clients must handle idempotently and should not rely on strict ordering.

### On-demand response events

- `balance_data` with `data.mode = "request"`
- `transaction_data` with `data.mode = "request"`

If `requestId` is sent by client, it is echoed in response payload.

### Push events from upstream (BCReader/system)

- `balance_update`
- `new_transaction`
- `fiat_balance_update`
- `fiat_transaction_update`
- `user_iban_updated`
- `user_ky_updated`

### Error event

- `error` for invalid payloads, unknown message types, or upstream failures.

## Client to Server Messages (post-auth)

### Get balances

```json
{
  "type": "get_balance",
  "requestId": "optional-correlation-id"
}
```

### Get transactions

```json
{
  "type": "get_transactions",
  "requestId": "optional-correlation-id",
  "params": {
    "page": 1,
    "limit": 50,
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }
}
```

`params` are forwarded to BCReader transaction query.

## Chain Resolution Rules

Effective chain for WebSocket session is resolved in this order:

1. `x-blockchain-id` request header (if available in non-browser clients)
2. `blockchainId` query parameter on `/ws`
3. `DEFAULT_CHAIN_ID`

If user has no safe on requested chain, API can fallback to first available user safe.

## Reliability and Fallback

- Server sends ping every 30 seconds; standard clients answer pong automatically.
- If BCReader upstream WS is unavailable, API still serves on-demand reads via BCReader HTTP.
- Recommended client fallback:
  - keep reconnect with exponential backoff
  - fallback to HTTP endpoints when WS cannot recover

## HTTP Fallback Endpoints

- `GET /v1.2/users/me/balances`
- `GET /v1.2/users/me/transactions`
- `GET /v1.2/users/me`

Use:

- `Authorization: Bearer <token>`
- optional `x-blockchain-id` header

## Security Notes

- JWT issuer must match resolved tenant `rpId`.
- WebSocket carries user-scoped data; do not reuse tokens across tenants.
- Duplicate-session protection is intentional; clients should explicitly close old sockets on re-login.

## Version Notes (code-aligned)

- Public client endpoint: `/ws`
- Client auth is message-based (`type: "auth"`), not a mandatory WS header flow.
- Upstream BCReader subscription mode uses a global `all_data` subscription in the backend service.

---

Last verified against code: May 2026
# IBEX FI API WebSocket Integration Guide

## Overview

The IBEX FI API provides a **WebSocket** endpoint for real-time balance and transaction updates. Data is synchronized with the blockchain via the BCReader infrastructure. The API uses a hybrid design: WebSocket for real-time push and HTTP for fallback or on-demand requests.

### Benefits

- **Real-time**: Balance and new-transaction events pushed as soon as they are available
- **Automatic initial data**: After authentication, the server sends balance, transactions, chain info, recovery status, and user data
- **On-demand requests**: After auth, the client can send `get_balance` and `get_transactions` to refresh data
- **Secure**: JWT authentication; `rpId` is derived from the connection host and must match the JWT issuer
- **Chain-aware**: Optional `X-Blockchain-Id` or query `blockchainId` to target a chain; the server forwards it to BCReader and resolves the user’s Safe (with fallback if no Safe on the default chain)
- **Fallback**: HTTP endpoints (`/v1/users/me/balances`, `/v1/users/me/transactions`, `/v1/bcreader/...`) when WebSocket is unavailable

## Architecture

```
[Blockchain] → [BCReader] ←→ [IBEX FI API] ←→ [Your Application]
                   ↑              ↑ WS              ↑
                   |              | HTTP            |
                   └──────────────┴─────────────────┘
```

- The **client** connects to the IBEX FI API WebSocket and authenticates with a JWT.
- The **API** subscribes to BCReader (or uses HTTP) for the user’s Safe address(es) and pushes updates to the client.
- The **client** can also request balance/transactions on demand with `get_balance` / `get_transactions` after auth.

## WebSocket Connection

### Endpoint

The WebSocket is exposed at path **`/ws`** on the same host as the REST API (same scheme: `wss://` in production, `ws://` locally).

```text
wss://<api-host>/ws
```

Examples:

- Staging: `wss://api-staging.ibex.fi/ws`
- Testnet: `wss://api-testnet.ibex.fi/ws`
- Production: `wss://api.ibex.fi/ws`
- Custom / preprod: `wss://passkeys-preprod.ibex.fi/ws` (or your configured host)

**Note:** Browsers cannot set custom headers on the WebSocket constructor. To target a specific chain, append a query parameter: `wss://<host>/ws?blockchainId=421614`. The server uses this (or the default chain) to resolve the user’s Safe and to send `X-Blockchain-Id` to BCReader.

### Authentication

1. Open the WebSocket to `wss://<host>/ws` (and optionally `?blockchainId=<id>`).
2. As soon as the connection is open, send a single JSON message:

```json
{
  "type": "auth",
  "token": "<your_jwt_access_token>",
  "clientName": "My App"
}
```

- **token** (required): JWT obtained from sign-in/sign-up (e.g. `POST /v1/auth/sign-in` or `/v1.2/auth/sign-in`).
- **clientName** (optional): Label for monitoring.

The server:

- Derives `rpId` from the request host.
- Verifies that the JWT’s `iss` matches the expected `rpId`.
- Resolves the user’s Safe (using `blockchainId` from query or header if present, otherwise the server default; if no Safe exists on that chain, the server may use the first available Safe on another chain).
- Stores the connection and subscribes to updates for that Safe.

On failure (e.g. invalid or expired token, rpId mismatch), the server sends an **`auth_error`** message and closes the connection shortly after (close code `4002`).

> **Single session per user:** Only **one active WebSocket connection per user per rpId** is allowed. If a user tries to open a second connection while the first is still alive, the server rejects the new connection with `error_code: "ALREADY_CONNECTED"` and close code `4003`. The client should close the existing session before reconnecting.

> **Authentication timeout:** The client has **30 seconds** to send the `auth` message after opening the WebSocket. If no auth message is received within this window, the server closes the connection with close code `4001`.

### Connection lifecycle (minimal)

```javascript
const url = 'wss://api-staging.ibex.fi/ws?blockchainId=421614';
const ws = new WebSocket(url);

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'auth', token: jwtToken, clientName: 'My App' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case 'auth_success':
    case 'connection_success':
      console.log('Connected, Safe:', msg.data.safeAddress);
      break;
    case 'auth_error':
      if (msg.data?.error_code === 'ALREADY_CONNECTED') {
        console.warn('Session already active — close existing connection first');
      } else {
        console.error('Auth failed:', msg.data?.message);
      }
      break;
    case 'balance_data':
    case 'balance_update':
    case 'new_transaction':
    case 'fiat_balance_update':
    case 'fiat_transaction_update':
    case 'transaction_data':
    case 'chainid_data':
    case 'recovery_data':
    case 'user_data':
    case 'user_iban_updated':
    case 'user_ky_updated':
      // handle...
      break;
    case 'error':
      console.error('Error:', msg.data?.message);
      break;
  }
};

ws.onclose = (event) => {
  console.log('Closed', event.code, event.reason);
  if (event.code === 4003) {
    // Duplicate session — do NOT auto-reconnect
    console.warn('Another session is already active');
  } else if (event.code === 4001) {
    // Auth timeout — reconnect and send auth faster
    setTimeout(() => reconnect(), 1000);
  } else {
    // Reconnect with exponential backoff
    setTimeout(() => reconnect(), backoff());
  }
};

ws.onerror = (err) => {
  console.error('WS error', err);
  // Fallback to HTTP
};
```

## Chain selection (blockchainId)

- **At connection time:** Use the query parameter `blockchainId` on the URL (e.g. `wss://host/ws?blockchainId=421614`). This is the only way to pass chain from a browser, since custom headers are not supported on `new WebSocket()`.
- **Effect:** The server uses this value to choose which Safe to use for the connection and to send **X-Blockchain-Id** to BCReader when fetching balances/transactions. If the user has no Safe on that chain but has one on another, the server uses that Safe and the effective chain is stored for subsequent BCReader calls.
- If `blockchainId` is omitted, the server uses its configured default chain (e.g. `DEFAULT_CHAIN_ID`).

## Messages (server → client)

After **successful auth**, the server sends (in order) initial data, then pushes updates and responds to on-demand requests.

### Initial sequence (after auth_success)

1. **auth_success**
2. **connection_success** (legacy compatibility event; same Safe context)
3. **user_data** (sent early; may be skipped if recently sent via HTTP — 3s dedup window)
4. **balance_data**
5. **transaction_data**
6. **chainid_data**
7. **recovery_data**
8. **user_data** (sent again unconditionally after recovery_data)

> **Note:** `user_data` may be received twice in the initial burst. Clients should handle this gracefully (e.g. overwrite previous data). The order of messages 2–8 should not be relied upon for application logic.

### Message types

All messages are JSON with: **type**, **data**, **timestamp** (ISO string).

#### auth_success

```json
{
  "type": "auth_success",
  "data": {
    "safeAddress": "0x7CDb9e9b831C1639376aD8408650cE1a83D51D5a",
    "message": "Connected to real-time updates"
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

`auth_success.data.safeAddress` is the Safe selected for this WS connection context (based on requested/default `blockchainId` and Safe resolution fallback). It is **not** the full wallet inventory.

For the full canonical wallet list, always read:
- `user_data.addresses.data.wallets` (same source as `GET /v1.2/users/me/address?includeDerived=true`)
- or call `GET /v1.2/users/me/address` directly.

#### connection_success

```json
{
  "type": "connection_success",
  "data": {
    "safeAddress": "0x7CDb9e9b831C1639376aD8408650cE1a83D51D5a",
    "message": "Connected to real-time updates"
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

This legacy-compatible message is emitted right after `auth_success`.

#### auth_error

Sent when authentication fails. The connection is closed shortly after (500ms grace period for the client to read the message).

```json
{
  "type": "auth_error",
  "data": {
    "message": "JWT token expired, please refresh your token",
    "context": "auth_process",
    "error_code": "TOKEN_EXPIRED"
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

When a user already has an active session:

```json
{
  "type": "auth_error",
  "data": {
    "message": "Already connected — close the existing session first",
    "error_code": "ALREADY_CONNECTED",
    "existingConnectionId": "uuid-of-existing-connection",
    "context": "duplicate_session"
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

| error_code | Close code | Meaning |
|---|---|---|
| `TOKEN_EXPIRED` | `4002` | JWT has expired; refresh and reconnect |
| `ALREADY_CONNECTED` | `4003` | User already has an active session on this rpId |
| *(other)* | `4002` | Invalid token, rpId mismatch, user not found, etc. |
| *(timeout)* | `4001` | No auth message received within 30 seconds |

#### balance_data

**Variant A — initial push after auth**

```json
{
  "type": "balance_data",
  "data": {
    "mode": "initial",
    "safeAddress": "0x...",
    "balance": { "...": "..." }
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

**Variant B — response to `get_balance`**

```json
{
  "type": "balance_data",
  "data": {
    "mode": "request",
    "safeAddress": "0x...",
    "timestamp": "2026-05-04T13:38:11.000Z",
    "crypto": { "...": "..." },
    "fiat": { "...": "..." },
    "totals": { "...": "..." },
    "requestId": "optional-client-request-id"
  },
  "timestamp": "2026-05-04T13:38:11.100Z"
}
```

If the client sent **requestId** in `get_balance`, the same **requestId** is echoed in `data.requestId`.

#### transaction_data

**Variant A — initial push after auth**

```json
{
  "type": "transaction_data",
  "data": {
    "mode": "initial",
    "safeAddress": "0x...",
    "transactions": { "...": "..." }
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

**Variant B — response to `get_transactions`**

```json
{
  "type": "transaction_data",
  "data": {
    "mode": "request",
    "safeAddress": "0x...",
    "type": "mixed",
    "crypto": { "...": "..." },
    "fiat": { "...": "..." },
    "requestId": "optional-client-request-id"
  },
  "timestamp": "2026-05-04T13:38:11.100Z"
}
```

#### balance_update (push)

When the balance changes (e.g. after a new transaction):

```json
{
  "type": "balance_update",
  "data": {
    "address": "0x...",
    "balance": "1250000000000000000",
    "updated_at": "2025-08-01T07:36:04.083Z"
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

#### new_transaction (push)

When a new transaction is detected:

```json
{
  "type": "new_transaction",
  "data": {
    "address": "0x...",
    "newTransaction": {
      "hash": "0x...",
      "blockNumber": 12345678,
      "timestamp": "2025-08-01T07:36:04.083Z",
      "from": "0x...",
      "to": "0x...",
      "tokenAddress": "0x...",
      "tokenType": "ERC20",
      "tokenSymbol": "EURe",
      "value": "100.0",
      "direction": "IN"
    },
    "recentTransactions": [ ... ],
    "transactionCount": 1,
    "historyLimit": 5
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

#### fiat_balance_update (push)

When a FIAT balance update is received for a user IBAN:

```json
{
  "type": "fiat_balance_update",
  "data": {
    "iban": "FR7616748000019510905637369",
    "balance": "241.90",
    "currency": "EUR",
    "updated_at": "2026-05-03T21:36:04.083Z",
    "externalUserId": "<optional-external-user-id>"
  },
  "timestamp": "2026-05-03T21:36:04.083Z"
}
```

- Routing is **externalUserId-first** when present (preferred for reliability), with IBAN matching as fallback when `externalUserId` is absent.

#### fiat_transaction_update (push)

When a FIAT transaction webhook update is received for a user IBAN:

```json
{
  "type": "fiat_transaction_update",
  "data": {
    "iban": "FR7616748000019510905637369",
    "transactionId": "713d14d2-1ba2-43a0-b3ea-4890f7a99747",
    "event": "payment.completed",
    "status": "completed",
    "previousStatus": null,
    "amount": "1.00",
    "currency": "EUR",
    "externalUserId": "<optional-external-user-id>"
  },
  "timestamp": "2026-05-03T21:36:04.083Z"
}
```

- FIAT realtime mirrors crypto behavior: transaction event + balance event, both routed to matching connected sessions.
- As with crypto, this is a push update (not a full snapshot response).
- This event can be produced either from BCReader WS input or from HTTP fallback `PUT /system/users/tx/fiat`.

#### chainid_data

```json
{
  "type": "chainid_data",
  "data": {
    "defaultChainId": 100,
    "supportedChainIds": [100]
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

#### recovery_data

```json
{
  "type": "recovery_data",
  "data": {
    "safeAddress": "0x...",
    "recoveryEnabled": false,
    "recoveryAddress": null,
    "delay": null,
    "pendingRecovery": false,
    "canExecute": false,
    "executeAfter": null
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

#### user_data

`user_data` reuses the exact aggregated payload returned by `GET /v1.2/users/me` (same canonical source as sign-in with `includeUserdata=true`).

```json
{
  "type": "user_data",
  "data": {
    "addresses": { "status": 200, "data": { "...": "..." } },
    "balances": { "status": 200, "data": { "...": "..." } },
    "chainid": { "status": 200, "data": { "...": "..." } },
    "ibans": { "status": 200, "data": { "...": "..." } },
    "lending": { "status": 200, "data": { "...": "..." } },
    "pools": { "status": 200, "data": { "...": "..." } },
    "signers": { "status": 200, "data": { "...": "..." } },
    "transactions": { "status": 200, "data": { "...": "..." } },
    "kycStatus": { "status": 200, "data": { "...": "..." } },
    "addressbook": { "status": 200, "data": { "...": "..." } }
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

- Shape is section-based: each section keeps its own `{ status, data }`.
- Current sections are: `addresses`, `balances`, `chainid`, `ibans`, `lending`, `pools`, `signers`, `transactions`, `kycStatus`, `addressbook`.
- This payload is chain-aware via `blockchainId` resolution (`query > header > default`).
- Because it is shared with `GET /v1.2/users/me`, any evolution of that endpoint propagates automatically to WS `user_data`.
- Section `data` content can evolve over time; clients should rely on section names + `{ status, data }` envelope and parse section payloads defensively.

#### user_iban_updated (push)

Emitted when the API receives a signal on `PUT /system/users/iban`. Broadcast to connected clients by Safe address.

```json
{
  "type": "user_iban_updated",
  "data": {
    "iban": "changed"
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

- `data` is intentionally minimal and acts as a refresh signal.
- Use `timestamp` as the event time.

#### user_ky_updated (push)

Emitted when the API receives a signal on `PUT /system/users/ky`. Broadcast to connected clients by Safe address.

```json
{
  "type": "user_ky_updated",
  "data": {
    "ky": "changed"
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

- `data` is intentionally minimal and acts as a refresh signal.
- Use `timestamp` as the event time.
- If the user has multiple Safe addresses, a message may be sent on each connected Safe channel.

#### error

Generic error (e.g. for unknown message type or failed get_balance/get_transactions):

```json
{
  "type": "error",
  "data": {
    "message": "Failed to retrieve balance",
    "context": "balance",
    "error_code": "BALANCE_FETCH_FAILED",
    "error": "..."
  },
  "timestamp": "2025-08-01T07:36:04.083Z"
}
```

## Client → server messages (after auth)

Once authenticated, the client can request balance or transactions on demand.

### get_balance

```json
{
  "type": "get_balance",
  "requestId": "optional-string-for-correlation"
}
```

Server responds with **balance_data** (or **error**). If **requestId** was sent, it is echoed in **data.requestId**.

### get_transactions

```json
{
  "type": "get_transactions",
  "requestId": "optional-string",
  "params": {
    "limit": 50,
    "startDate": "2025-01-01",
    "endDate": "2025-12-31"
  }
}
```

**params** are optional; server applies defaults (e.g. limit, date range). Server responds with **transaction_data** (or **error**). **requestId** is echoed when provided.

**Note:** Any message other than `auth` before authentication, or an unknown **type** after auth, may result in **auth_error** or **error**.

## HTTP fallback

When the WebSocket is unavailable or after repeated failures, use the REST API:

| Purpose           | Method | Endpoint |
|-------------------|--------|----------|
| Balances          | GET    | `/v1.2/users/me/balances` |
| Transactions      | GET    | `/v1.2/users/me/transactions?limit=50&startDate=...&endDate=...` |
| Aggregated user data | GET | `/v1.2/users/me` |

Send **Authorization: Bearer &lt;token&gt;** and, when relevant, **X-Blockchain-Id: &lt;chainId&gt;** (or `?blockchainId=`).

Example:

```javascript
const base = 'https://api-staging.ibex.fi';
const res = await fetch(`${base}/v1.2/users/me/balances`, {
  headers: { 'Authorization': `Bearer ${jwtToken}`, 'X-Blockchain-Id': '421614' }
});
const data = await res.json();
```

## Keep-alive (ping/pong)

The server sends a WebSocket ping periodically (e.g. every 30 seconds). Standard clients reply with pong automatically; no extra logic is required on the client.

## Error handling

- **auth_error**: Invalid/expired JWT, rpId mismatch, or duplicate session. Check `data.error_code` for programmatic handling.
- **error**: Request failed or invalid client message. Check **data.message**, **data.context**, and **data.error_code**.
  - Common contexts: `balance`, `transactions`, `message_handler`, `parsing`.

### Close codes

| Code | Meaning | Client action |
|------|---------|---------------|
| `1000` | Normal closure | Reconnect if needed |
| `1006` | Abnormal closure (network) | Reconnect with backoff |
| `1008` | Policy violation | Check server logs |
| `1011` | Internal server error | Reconnect with backoff |
| `4000` | Superseded (server-side cleanup) | No action needed |
| `4001` | Authentication timeout (30s) | Reconnect and send `auth` faster |
| `4002` | Authentication failed | Refresh JWT and reconnect |
| `4003` | Duplicate session | Close existing session first, then reconnect |

For codes `1006` and `1011`, implement reconnection with exponential backoff and a maximum attempt count; after that, switch to HTTP fallback. For code `4003`, do **not** reconnect automatically — close the existing session first.

## Best practices

1. **Auth:** Send the auth message as soon as the WebSocket opens (within 30 seconds). Validate or refresh the JWT before connecting if possible.
2. **Single session:** Ensure only one WebSocket is open per user at a time. Close the previous connection before opening a new one. On `error_code: "ALREADY_CONNECTED"`, close the existing session before retrying.
3. **Chain:** For multi-chain apps, pass `?blockchainId=<id>` on the WebSocket URL so the server and BCReader use the correct chain.
4. **Reconnect:** Use exponential backoff and a max retry limit; then fall back to HTTP. Do **not** auto-reconnect on close code `4003` (duplicate session).
5. **Cleanup:** Close the WebSocket when the user logs out or the app is closed. This frees the session slot for future connections.
6. **Correlation:** Use **requestId** in `get_balance` / `get_transactions` to match responses to requests.

## Changelog

### v1.2.10
- **WS event-name normalization:** status push events now use snake_case names for client consistency: `user_iban_updated` and `user_ky_updated`.
- **Client naming consistency:** removed mixed dotted names from client-facing WS status events.

### v1.2.9
- **Client WS neutrality:** removed dedicated technical fallback push events for crypto and fiat from client-facing WS.
- **Fallback behavior:** both fallback endpoints now emit only business WS events (`fiat_transaction_update` for FIAT; crypto stays on standard business realtime flow).

### v1.2.8
- **Legacy auth compatibility:** `connection_success` is now emitted right after `auth_success`.
- **WS shape uniformization:** `balance_data` and `transaction_data` include explicit `data.mode` (`initial` or `request`) and include `safeAddress` in both variants.
- **Fallback TX WS signals:** `user.tx.crypto.received` was initially emitted for accepted non-deduplicated crypto fallback webhooks.
- **FIAT WS alignment:** FIAT fallback emits only the business event `fiat_transaction_update` (no dedicated technical fallback event to clients).
- **Error taxonomy:** standardized `data.error_code` usage across auth and generic WS errors.

### v1.2.6
- **`user_data` contract clarification:** documented as a canonical mirror of `GET /v1.2/users/me` with section envelopes `{ status, data }`.
- **Section list refreshed:** explicit list of current sections (`addresses`, `balances`, `chainid`, `ibans`, `lending`, `pools`, `signers`, `transactions`, `kycStatus`, `addressbook`).
- **Forward-compat guidance:** section payload internals may evolve; clients should parse section `data` defensively.

### v1.2.4
- **Signal-only WS payloads:** `user_iban_updated` and `user_ky_updated` now send minimal data (`{ "iban": "changed" }` / `{ "ky": "changed" }`).
- **Timestamp cleanup:** removed duplicate `updatedAt` from event data; clients should use top-level `timestamp`.
- **Webhook trigger semantics:** clarified that these WS events are triggered by incoming signals on `/system/users/iban` and `/system/users/ky`.

### v1.2.3
- **Wallet source-of-truth clarification:** documented that `auth_success.data.safeAddress` is the WS connection Safe only; full wallet inventory is in `user_data.addresses.data.wallets` (or `GET /v1.2/users/me/address`).
- **IBAN scope clarification:** documented that WS `user_data.ibans.data.ibans` returns the complete IBAN list for the authenticated user scope.
- **Alignment confirmation:** WS `user_data` and sign-in `includeUserdata=true` are produced from the same aggregated helper (`GET /v1.2/users/me`), keeping `/` and `/websocket` consistent.

### v1.2.2
- **WS user_data alignment:** `user_data` now uses the same aggregated payload helper as `GET /v1.2/users/me` and sign-in `includeUserdata=true`.
- **WS wallet data alignment:** initial `balance_data` and `transaction_data` now use the same shared wallet-data helper as sign-in enrichments (strategy-based: `recent` for WS initial burst, `full` for sign-in).
- **Docs update:** REST fallback examples now reference `/v1.2/...` endpoints.

### v1.2.1
- **Single session enforcement:** Only one active WebSocket connection is allowed per user per rpId. Duplicate connections are rejected with `error_code: "ALREADY_CONNECTED"` and close code `4003`.
- **Auth timeout:** Connections that do not send an `auth` message within 30 seconds are automatically closed (close code `4001`).
- **Auth failure closes connection:** All authentication errors now close the WebSocket after a 500ms grace period (close code `4002`), preventing orphaned unauthenticated connections.
- **Close codes table:** Documented all custom close codes (`4000`–`4003`) with meanings and recommended client actions.

### v1.2
- **user_data payload fix:** Corrected `iban` field — only contains `{ chainId }` when approved; `iban` and `bic` strings are not exposed over WebSocket.
- **user_iban_updated / user_ky_updated:** Added full JSON payload documentation with field descriptions.
- **Initial sequence:** Corrected order — `user_data` is sent before `balance_data` and may be sent twice (dedup + unconditional).
- **Code example:** Added `user_iban_updated` and `user_ky_updated` to the message handler switch.
- **FIAT realtime updates:** Added `fiat_transaction_update` and `fiat_balance_update` push events with IBAN-first routing semantics.

### v1.1
- **Chain selection:** Support for `?blockchainId=` on the WebSocket URL and for forwarding **X-Blockchain-Id** to BCReader. Safe resolution fallback when the user has no Safe on the default chain.
- **On-demand requests:** Client can send **get_balance** and **get_transactions** after auth; optional **requestId** and **params** for transactions.
- **Auth flow:** Documented rpId vs JWT issuer check and auth_error payload.

### v1.0
- WebSocket at `/ws` with JWT auth.
- Initial push: auth_success, balance_data, transaction_data, chainid_data, recovery_data, user_data.
- Push events: balance_update, new_transaction, fiat_balance_update, fiat_transaction_update, user_iban_updated, user_ky_updated.
- HTTP fallback: /v1/users/me/balances, /v1/users/me/transactions, /v1/bcreader/...

---

**Last updated:** May 2026  
**Version:** 1.2.10
