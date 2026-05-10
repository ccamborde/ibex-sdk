# AGENTS.md

This file defines mandatory rules for AI coding agents working on this repository.

## Read Order (Mandatory)

Before implementing anything, read in this exact order:

1. `env/.env.local`
2. `docs/IBEXFIAPI_INTEGRATION.md`
3. `docs/IBEXFIAPI_ENDPOINTS_v1.2.md`
4. `docs/IBEXFIAPI_WEBSOCKET.md`
5. `docs/IBEXFISDK_ENDPOINTS.md`
6. `docs/llms.txt`
7. `docs/llms-full.txt`

## Integration Invariants (Do Not Break)

- Auth flow must be passkey sign-in first, then sign-up fallback.
- On successful sign-in/sign-up, persist `access_token` and `refresh_token` immediately.
- After auth success, commit session context atomically (`access_token`, `refresh_token`, `rpId`, auth headers source) before starting parallel `/users/me*` bootstrap calls.
- Do not call refresh right after auth success.
- Prefer enriched sign-in data when available (for example `includeBalance`, `includeTransactions`, `includeUserdata`) to reduce post-login request fan-out.
- Protected requests must send both headers:
  - `Authorization: Bearer <access_token>`
  - `X-IBEx-Auth: Bearer <access_token>`
- Always send both rpId header variants:
  - `X-Rp-Id`
  - `X-RpId`
- Propagate rpId/header context consistently on refresh path as well (`POST /v1.2/auth/refresh` in app proxy/session layer).
- Persist `externalUserId` from `/v1.2/users/me` and keep app state scoped per external user.
- Persist/cache user-scoped data in local storage (`${externalUserId}_*`) and use incremental refresh.
- For address-book IBAN creation, always send `iban` and `respondingPspBic` together.
- Do not implement a separate direct VoP call for address-book creation.
  - VoP is handled internally by `POST /v1.2/users/me/addressbook`.

## Refresh Strategy (Critical)

- Implement single-flight refresh:
  - concurrent `401/403` errors must share one in-flight refresh operation.
- Retry a failed protected request once after successful refresh.
- Never attempt recursive refresh on refresh route failure.
- On refresh failure (`401/403`): clear session + scoped cache and move to disconnected state.

## Scope for AI-Generated Clients

Must support:

- passkey auth + robust session lifecycle
- users/me read/write
- address-book (SEPA + crypto)
- balances/transactions/address resources
- SEPA payments and mandates where required by task
- websocket event handling for real-time updates when task requires realtime behavior
- chain capability gating using `/v1.2/chains/` for transfer/recovery/automation/multi-sig

## WebSocket Rules (When Realtime Is In Scope)

- Use `/ws` on API host, with optional `?blockchainId=<id>`.
- Send auth as the first WS message:
  - `{ "type": "auth", "token": "<access_token>", "clientName": "<app>" }`
- Handle close codes explicitly:
  - `4001`: auth timeout
  - `4002`: auth failed / token expired
  - `4003`: duplicate session (do not auto-reconnect until previous session is closed)
- Keep only one active socket per `(externalUserId, rpId)`.
- Initial event burst is not strictly ordered; `user_data` may be sent twice. Client logic must be idempotent.
- On unstable WS, fallback to HTTP reads for users/me, balances, transactions.
- If WS is healthy, prefer WS as primary refresh channel and keep HTTP for fallback/on-demand.

## Chain Capability Rules

- Always query `/v1.2/chains/` before enabling chain-dependent features in UI.
- Do not assume wallet presence implies feature support on that chain.
- Resolve user chain context from `/v1.2/users/me` (`chainid.defaultChainId`, `chainid.chains[].chainId`) and join with `/v1.2/chains/` (`id`) to get chain `name` and `modules`.
- Gate at least transfer, recovery, automation, and multi-sig by chain capability response.
- If a user has a wallet on a chain but a module is disabled in `/v1.2/chains/`, the feature must stay hidden/disabled on that chain.

Out of scope unless explicitly requested:

- cards
- investment products
- domain/rpId management UI
- theme/skin admin

## Delivery Rules

- Use TypeScript strict mode for new TS projects.
- Include `.env.example` with deterministic variables.
- Add concise run/test instructions in project README updates.
- Prefer small, testable modules (API client, session manager, feature modules, realtime module).
- Normalize errors for user-facing messages while preserving technical logs.

## Forbidden Assumptions (Anti-Hallucination)

- Never invent endpoints, request fields, response fields, or auth headers.
- Never invent payload examples as if they were official API contracts.
- Never call `/v1.2/sepa/vop` for address-book creation flow.
  - Use `POST /v1.2/users/me/addressbook` with `iban` + `respondingPspBic`.
- Never invent demo users, IBANs, wallets, or chain IDs unless explicitly requested by a human developer.
- If a value is missing, ask the developer or use only values already documented in this repository.

### Predefined Demo Address Book Data (Use As-Is)

When a task requires mandatory demo address-book entries, reuse these existing values:

- SEPA faucet beneficiaries:
  - `FAUCET_SENDER_ADDRESS_IBAN_01_NAME`: `IBEX Faucet 01`
  - `FAUCET_SENDER_ADDRESS_IBAN_01`: `FR7616748000014733062059352`
  - `FAUCET_SENDER_ADDRESS_IBAN_BIC_01`: `BUMDFRP2`
  - `FAUCET_SENDER_ADDRESS_IBAN_02_NAME`: `IBEX Faucet 02`
  - `FAUCET_SENDER_ADDRESS_IBAN_02`: `FR7616748000011199641458852`
  - `FAUCET_SENDER_ADDRESS_IBAN_BIC_02`: `BUMDFRP2`
- Crypto faucet beneficiaries:
  - `FAUCET_SENDER_ADDRESS_01`: `0x0795239e54A9b6f97413cA84688f7a93b9A0640e`
  - `FAUCET_SENDER_ADDRESS_02`: `0x8E50Be91c0af9279eb6F06baC6B75B113CECcC6D`
  - `FAUCET_SENDER_ADDRESS_03`: `0x02ccfBf5b57a503e1172eA2665455CA1cfe85c0A`
  - `FAUCET_SENDER_ADDRESS_04`: `0x9937383A144592c637D98E2FFa6d78AFDb659200`
  - `FAUCET_SENDER_ADDRESS_05`: `0x59F0f3128a2fD7B7409dB55367C576caB2469Ce2`
