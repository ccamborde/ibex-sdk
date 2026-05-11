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

- Faucet source/return coordinates (canonical testnet set):
  - `FAUCET_TENANT_RPID`: `demobaas-prat1.ibex.fi`
  - `FAUCET_CHAIN_ID`: `421614`
  - `FAUCET_IBAN`: `FR7616748000014733062059352`
  - `FAUCET_BIC`: `BUMDFRP2`
  - `FAUCET_HOLDER_NAME`: `IBEX Faucet 01`
  - `FAUCET_WALLET`: `0x0795239e54A9b6f97413cA84688f7a93b9A0640e`
- Faucet token catalog (same chain):
  - `EUR-IBEX`: `0x18e632ae0704ab92cf4f49472b583498ff5258cc` (`18`)
  - `USD-IBEX`: `0x5a0fc8a0d0d4aabc4506dc348d1dd9258ce78f4d` (`18`)
  - `GBP-IBEX`: `0xcef99a37939d4db1adbc89d4d2f62913557d592d` (`18`)
  - `CHF-IBEX`: `0x69ebf0518202681e27480e9cd0cdd576c8157a40` (`18`)
  - `BTC-IBEX`: `0xb21ef1146d0cba9d4ad0d5494731bfc0b8ef7637` (`8`)
  - `ETH-IBEX`: `0x12bfd5e8b232f8067976a6238f29864cb440c12d` (`18`)
  - `XAU-IBEX`: `0xd04041a2b7cd12dc0e34ca974cdd3afbde70c6f7` (`18`)
  - `JPY-IBEX`: `0x9f52564b705d2c415987cd1458efd04da165de86` (`18`)
  - `CAD-IBEX`: `0x551acb8977ef83849aa61aa3f823fd69029c4ac3` (`18`)
  - `AUD-IBEX`: `0x878fc5582e7cdf95485f36038e3f72b9b1d0f791` (`18`)
