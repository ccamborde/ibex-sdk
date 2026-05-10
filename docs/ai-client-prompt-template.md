# IBEx Web Client — Task Prompt Template

Use this template when asking an AI agent to build an end-to-end IBEx client.

## System Context

- You are a senior full-stack engineer.
- Build from scratch a production-grade web client for IBEx.
- Prefer frontend-first architecture with a minimal secure backend proxy.

## Mandatory References

Read these files first (in order):

1. `env/.env.local`
2. `docs/IBEXFIAPI_INTEGRATION.md`
3. `docs/IBEXFIAPI_ENDPOINTS_v1.2.md`
4. `docs/IBEXFIAPI_WEBSOCKET.md`
5. `docs/IBEXFISDK_ENDPOINTS.md`
6. `docs/llms.txt`
7. `docs/llms-full.txt`
8. `AGENTS.md`

If a requirement conflicts with those files, follow repository files.

## Environment

- `IBEX_API_URL=https://passkeys-testnet.ibex.fi`

## Core Goals

Implement:

1. Passkey sign-up/sign-in + robust refresh lifecycle
2. Users/me profile read/write
3. Address book (SEPA + crypto)
4. Balances/transactions/address views
5. SEPA payment intent + confirmation
6. Optional crypto transfer flow (if backend route exists in project scope)
7. WebSocket realtime listeners for userdata/balances/transactions updates

Out of scope unless explicitly requested:

- cards
- investment products
- domain/rpId management UI
- theme/skin admin UI

## Critical Constraints

- Sign-in first, sign-up fallback.
- Persist auth tokens immediately on auth success.
- Commit auth session context atomically (`access_token`, `refresh_token`, `rpId`, auth-header source) before launching parallel protected bootstrap calls.
- Prefer enriched sign-in payload when supported (for example `includeBalance`, `includeTransactions`, `includeUserdata`) to minimize immediate HTTP fetches.
- Never refresh immediately after successful auth.
- Refresh only on `401/403` with single-flight lock.
- Never refresh recursively on refresh endpoint failure.
- Persist and propagate `externalUserId` in app session/proxy context.
- Ensure rpId propagation is consistent for all IBEX calls, including refresh path (`POST /v1.2/auth/refresh`) in your proxy/session layer.
- WS auth is message-based (`type: "auth"`), sent immediately after socket open.
- Respect WS close codes:
  - `4001` auth timeout,
  - `4002` auth failure/expired token,
  - `4003` duplicate session (no blind auto-reconnect).
- Handle WS initial burst idempotently (`user_data` can be emitted twice; ordering is not strict).
- If WS is healthy, use WS events as primary refresh for balances/transactions/KY/IBAN and keep HTTP as fallback/on-demand.
- Persist data in scoped local storage (`${externalUserId}_*`) and implement incremental refresh from cache + network.
- For address book IBAN flow, always send:
  - `iban`
  - `respondingPspBic`
- Do not implement direct VoP endpoint calls for address-book creation.
  - VoP is handled via `POST /v1.2/users/me/addressbook`.
- Do not invent API endpoints, payload fields, or demo data unless explicitly requested by the developer.

## Mandatory Demo Address Book Seed (Reuse Existing Test Data)

When the task includes address-book initialization, use these exact faucet values:

1. SEPA beneficiaries
   - `FAUCET_SENDER_ADDRESS_IBAN_01_NAME`: `IBEX Faucet 01`
   - `FAUCET_SENDER_ADDRESS_IBAN_01`: `FR7616748000014733062059352`
   - `FAUCET_SENDER_ADDRESS_IBAN_BIC_01`: `BUMDFRP2`
   - `FAUCET_SENDER_ADDRESS_IBAN_02_NAME`: `IBEX Faucet 02`
   - `FAUCET_SENDER_ADDRESS_IBAN_02`: `FR7616748000011199641458852`
   - `FAUCET_SENDER_ADDRESS_IBAN_BIC_02`: `BUMDFRP2`
2. Crypto beneficiaries
   - `FAUCET_SENDER_ADDRESS_01`: `0x0795239e54A9b6f97413cA84688f7a93b9A0640e`
   - `FAUCET_SENDER_ADDRESS_02`: `0x8E50Be91c0af9279eb6F06baC6B75B113CECcC6D`
   - `FAUCET_SENDER_ADDRESS_03`: `0x02ccfBf5b57a503e1172eA2665455CA1cfe85c0A`
   - `FAUCET_SENDER_ADDRESS_04`: `0x9937383A144592c637D98E2FFa6d78AFDb659200`
   - `FAUCET_SENDER_ADDRESS_05`: `0x59F0f3128a2fD7B7409dB55367C576caB2469Ce2`

Seed logic must be idempotent: do not create duplicates on reruns.

## Chain Capability Gating (Mandatory)

- Call `GET /v1.2/chains/` and gate feature availability by chain capability.
- Read `/v1.2/users/me` chain context (`chainid.defaultChainId`, `chainid.chains[].chainId`) and join with `/v1.2/chains/` by chain id.
- Use `/v1.2/chains/` response to resolve both:
  - chain display name (`name`)
  - module toggles (`modules`)
- A wallet existing on a chain does not imply all services are enabled on that chain.
- Use chain capabilities to decide whether to expose:
  - transfer
  - recovery
  - automation
  - multi-sig

## Architecture Requirements

- TypeScript strict mode
- Layered modules:
  - API client
  - auth/session manager
  - feature modules (profile, address book, sepa, transfer, ws)
  - UI state management
- Error normalization:
  - user-friendly messages
  - technical diagnostics in logs

## Test Requirements

Add basic coverage for:

- auth/session refresh lifecycle
- refresh single-flight behavior
- address-book IBAN+BIC validation
- address-book idempotent seed behavior
- SEPA intent + confirm flow
- WS reconnect behavior

## Deliverables

1. Complete runnable project
2. `.env.example`
3. Seed routine for demo beneficiaries
4. README with run/test/e2e notes
5. Short architecture decision notes

## Final Acceptance Checklist

- [ ] Sign-up/sign-in works with passkeys
- [ ] Session refresh is transparent and stable
- [ ] No refresh storms under parallel request failures
- [ ] `externalUserId` is persisted and propagated correctly
- [ ] Addressbook IBAN flow sends IBAN + BIC together
- [ ] No direct VoP endpoint usage for addressbook creation
- [ ] SEPA payment intent + confirmation works
- [ ] WS updates are consumed and reflected in UI
- [ ] Build and tests pass
