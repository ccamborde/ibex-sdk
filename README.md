# IBEx SDK

## Quick Start

1. Copy the environment file and fill in values:

```bash
cp env/.env.example env/.env.local
```

2. Required environment variables:

| Variable | Example | Description |
|----------|---------|-------------|
| `IBEX_API_URL` | `https://passkeys-testnet.ibex.fi` | Base URL of the IBEx API |
| `IBEX_RP_ID` | `localhost` or `demobaas-prat1.ibex.fi` | WebAuthn Relying Party ID — **must match the browser hostname** (see below) |
| `PORT` | `3001` | Local dev server port |

## rpId and WebAuthn — Local Development Setup

WebAuthn requires that the `rpId` matches the hostname visible in the browser address bar (or a valid registrable domain suffix). **This is enforced by the browser and cannot be bypassed.**

### Scenario A — `localhost` (quick start)

```bash
# env/.env.local
IBEX_RP_ID=localhost
```

Open `http://localhost:5173/` in your browser. All operations work — `localhost` is a registered rpId on **testnet**.

### Scenario B — Custom hostname (full functionality)

1. Add to `/etc/hosts`:
   ```
   127.0.0.1  demobaas-prat1.ibex.fi
   ```
2. Set in `env/.env.local`:
   ```bash
   IBEX_RP_ID=demobaas-prat1.ibex.fi
   ```
3. Open `http://demobaas-prat1.ibex.fi:5173/` in your browser (not `localhost`).

All endpoints work including write operations.

### What does NOT work

| Browser URL | `IBEX_RP_ID` | Result |
|-------------|-------------|--------|
| `http://localhost:5173/` | `localhost` | Everything OK (registered on testnet) |
| `http://demobaas-prat1.ibex.fi:5173/` | `demobaas-prat1.ibex.fi` | Everything OK |
| `http://localhost:5173/` | `demobaas-prat1.ibex.fi` | **FAILS** — WebAuthn rejects rpId |

Users and passkey credentials are namespaced by rpId. A passkey created under `localhost` is invisible under `demobaas-prat1.ibex.fi` and vice versa — this is by design.

## Recommended Model

For best results, use **Claude Opus 4.6 (Thinking)**.

## Deployment Prompt

Use the following prompt:

```text
Read these files carefully in this exact order:

1. `env/.env.local` — configuration (IBEX_API_URL, IBEX_RP_ID, PORT)
2. `docs/IBEXFIAPI_INTEGRATION.md` — complete technical reference for the IBEx.Fi API
3. `docs/IBEXFIAPI_WEBSOCKET.md` — WebSocket protocol, events, close codes, reconnection rules
4. `docs/llms.txt` — quick AI integration guardrails (read first)
5. `docs/llms-full.txt` — full functional specification of the widget
6. `AGENTS.md` — repository-level mandatory AI implementation rules
7. `docs/ai-client-prompt-template.md` — reusable end-to-end task prompt template

Then build a complete web widget that demonstrates IBEx.Fi integration:

- One-click passkey authentication (sign-in -> sign-up fallback)
- Display user profile (GET /users/me)
- Update user data (POST /users/me)
- JWT token refresh
- Local cache scoped by externalUserId
- Real-time log of all API calls

The widget must include:
1. A dev server with a proxy to IBEx (to bypass CORS)
2. The frontend (HTML/CSS/JS or framework of your choice)
3. A premium dark mode design

Follow ALL rules documented in those files:
query params, headers, base64url conversion, session handling, etc.

Run the project with `npm run dev` when ready.
```
