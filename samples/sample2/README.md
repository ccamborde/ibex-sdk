# Sample 2 - Minimal Widget

Lean IBEx.Fi integration example focused on:

- Passkey auth flow
- Profile fetch/update
- JWT refresh and auto-retry
- Scoped localStorage cache
- API request/response logging
- Unified address book proxy routes
- SEPA proxy integration (IBAN, payments, transactions)
- Chain capability discovery (`/v1.2/chains/`)
- Atomic auth bootstrap + single-flight refresh lock

## Start

```bash
npm install
npm run dev
```

Default env source: `../../env/.env.local`.

## Address book proxy endpoints

The local server also exposes:

- `GET /api/ibex/users/me/addressbook`
- `POST /api/ibex/users/me/addressbook`
- `PUT /api/ibex/users/me/addressbook/:id`
- `DELETE /api/ibex/users/me/addressbook/:id`
- `POST /api/ibex/users/me/addressbook/:id/crypto`
- `DELETE /api/ibex/users/me/addressbook/:id/crypto/:chainId/:address`
- `DELETE /api/ibex/users/me/addressbook/:id/ibans/:iban`

Addressbook IBAN creation reminder:
- when posting an IBAN contact, send `iban` and `respondingPspBic` together.
- do not call a direct VoP endpoint from the client.

## SEPA proxy endpoints

The local server exposes:

- `POST /api/ibex/sepa/iban/add`
- `GET /api/ibex/sepa/iban`
- `POST /api/ibex/sepa/payments`
- `PUT /api/ibex/sepa/payments`
- `GET /api/ibex/sepa/transactions`
- `GET /api/ibex/sepa/transactions/:id`

## Chains proxy endpoint

- `GET /api/ibex/chains` -> `/v1.2/chains/`

Use it with `/api/ibex/users/me` chain context (`chainid.defaultChainId`, `chainid.chains[]`) to map chain ids to names/modules and gate features.

## SEPA payment flow (2 steps)

1. Create intent via `POST /api/ibex/sepa/payments`.
2. Confirm via `PUT /api/ibex/sepa/payments` after a WebAuthn assertion.

For manual testing in the browser console, helper methods are available under `window.ibexSepa`.
