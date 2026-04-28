# IBEx SDK

## Recommended Model

For best results, use **Claude Opus 4.6 (Thinking)**.

## Deployment Prompt

Use the following prompt:

```text
Read these files carefully in this exact order:

1. `env/.env.local` — configuration (IBEX_API_URL, PORT)
2. `docs/IBEXFIAPI_INTEGRATION.md` — complete technical reference for the IBEx.Fi API
3. `docs/llms-full.txt` — functional specification of the widget to build

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
