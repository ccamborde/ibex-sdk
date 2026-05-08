# Sample 1 - Premium Widget

Advanced IBEx.Fi widget example with:

- One-click passkey auth (sign-in with sign-up fallback)
- User profile read/update
- JWT refresh flow
- externalUserId-scoped local cache
- Detailed real-time API event log
- Unified address book proxy routes
- SEPA proxy integration (IBAN, payments, transactions)

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

## SEPA proxy endpoints

The local server exposes:

- `POST /api/ibex/sepa/iban/add`
- `GET /api/ibex/sepa/iban`
- `POST /api/ibex/sepa/payments`
- `PUT /api/ibex/sepa/payments`
- `GET /api/ibex/sepa/transactions`
- `GET /api/ibex/sepa/transactions/:id`

## SEPA payment flow (2 steps)

1. Create intent via `POST /api/ibex/sepa/payments`.
2. Confirm via `PUT /api/ibex/sepa/payments` after a WebAuthn assertion.

For manual testing in the browser console, helper methods are available under `window.ibexSepa`.
