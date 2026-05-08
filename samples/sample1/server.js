/**
 * IBEx.Fi Widget — Dev Server with CORS Proxy
 *
 * Routes:
 *   GET  /api/ibex/auth/sign-in/options   → GET  /v1.2/auth/sign-in
 *   POST /api/ibex/auth/sign-in/complete   → POST /v1.2/auth/sign-in
 *   GET  /api/ibex/auth/sign-up/options    → GET  /v1.2/auth/sign-up
 *   POST /api/ibex/auth/sign-up/complete   → POST /v1.2/auth/sign-up
 *   POST /api/ibex/auth/refresh            → POST /v1.2/auth/refresh
 *   GET  /api/ibex/users/me                → GET  /v1.2/users/me
 *   POST /api/ibex/users/me                → POST /v1.2/users/me
 *   POST /api/ibex/sepa/iban/add           → POST /v1.2/sepa/iban/add
 *   GET  /api/ibex/sepa/iban               → GET  /v1.2/sepa/iban
 *   POST /api/ibex/sepa/payments           → POST /v1.2/sepa/payments
 *   PUT  /api/ibex/sepa/payments           → PUT /v1.2/sepa/payments
 *   GET  /api/ibex/sepa/transactions       → GET /v1.2/sepa/transactions
 *   GET  /api/ibex/sepa/transactions/:id   → GET /v1.2/sepa/transactions/:id
 */

import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const repoEnvPath = join(__dirname, '..', '..', 'env', '.env.local');
const localEnvPath = join(__dirname, '.env.local');

dotenv.config({ path: repoEnvPath });
dotenv.config({ path: localEnvPath, override: true });

const app  = express();
const PORT = process.env.PORT || 3001;
const IBEX = process.env.IBEX_API_URL || 'https://passkeys-testnet.ibex.fi';

// ── Middleware ───────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ── Proxy helpers ────────────────────────────────────────────────────────
const STRIP_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
]);

async function proxyToIbex(req, res, { method, upstreamPath }) {
  const url = new URL(upstreamPath, IBEX);

  // Forward query string
  for (const [k, v] of Object.entries(req.query)) {
    url.searchParams.set(k, v);
  }

  // Build upstream headers
  const headers = {};
  if (req.headers['x-rp-id'])      headers['X-Rp-Id']  = req.headers['x-rp-id'];
  if (req.headers['x-rpid'])       headers['X-RpId']    = req.headers['x-rpid'];
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];

  // Map X-IBEx-Auth → Authorization (send both upstream)
  const ibexAuth = req.headers['x-ibex-auth'];
  if (ibexAuth) {
    headers['Authorization'] = ibexAuth;
    headers['X-IBEx-Auth']   = ibexAuth;
  }

  const fetchOpts = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    fetchOpts.body = JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(url.toString(), fetchOpts);

    // Forward status
    res.status(upstream.status);

    // Forward safe headers (strip encoding-related ones)
    for (const [key, value] of upstream.headers.entries()) {
      if (!STRIP_HEADERS.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // Stream body
    const body = await upstream.text();
    res.send(body);
  } catch (err) {
    console.error('[PROXY ERROR]', err.message);
    res.status(502).json({ error: 'Proxy error', details: err.message });
  }
}

// ── Proxy Routes ─────────────────────────────────────────────────────────

// Auth — Sign-in
app.get('/api/ibex/auth/sign-in/options', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/auth/sign-in' })
);
app.post('/api/ibex/auth/sign-in/complete', (req, res) =>
  proxyToIbex(req, res, { method: 'POST', upstreamPath: '/v1.2/auth/sign-in' })
);

// Auth — Sign-up
app.get('/api/ibex/auth/sign-up/options', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/auth/sign-up' })
);
app.post('/api/ibex/auth/sign-up/complete', (req, res) =>
  proxyToIbex(req, res, { method: 'POST', upstreamPath: '/v1.2/auth/sign-up' })
);

// Auth — Refresh
app.post('/api/ibex/auth/refresh', (req, res) =>
  proxyToIbex(req, res, { method: 'POST', upstreamPath: '/v1.2/auth/refresh' })
);

// Users
app.get('/api/ibex/users/me', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me' })
);
app.post('/api/ibex/users/me', (req, res) =>
  proxyToIbex(req, res, { method: 'POST', upstreamPath: '/v1.2/users/me' })
);
app.get('/api/ibex/users/me/balances', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me/balances' })
);
app.get('/api/ibex/users/me/transactions', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me/transactions' })
);
app.get('/api/ibex/users/me/address', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me/address' })
);
app.get('/api/ibex/users/me/signers', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me/signers' })
);
app.get('/api/ibex/users/me/tokens', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me/tokens' })
);
app.get('/api/ibex/users/me/pools', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me/pools' })
);
app.get('/api/ibex/users/me/lending', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me/lending' })
);
app.get('/api/ibex/users/me/addressbook', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/users/me/addressbook' })
);
app.post('/api/ibex/users/me/addressbook', (req, res) =>
  proxyToIbex(req, res, { method: 'POST', upstreamPath: '/v1.2/users/me/addressbook' })
);
app.put('/api/ibex/users/me/addressbook/:id', (req, res) =>
  proxyToIbex(req, res, {
    method: 'PUT',
    upstreamPath: `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}`,
  })
);
app.delete('/api/ibex/users/me/addressbook/:id', (req, res) =>
  proxyToIbex(req, res, {
    method: 'DELETE',
    upstreamPath: `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}`,
  })
);
app.post('/api/ibex/users/me/addressbook/:id/crypto', (req, res) =>
  proxyToIbex(req, res, {
    method: 'POST',
    upstreamPath: `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}/crypto`,
  })
);
app.delete('/api/ibex/users/me/addressbook/:id/crypto/:chainId/:address', (req, res) =>
  proxyToIbex(req, res, {
    method: 'DELETE',
    upstreamPath: `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}/crypto/${encodeURIComponent(req.params.chainId)}/${encodeURIComponent(req.params.address)}`,
  })
);
app.delete('/api/ibex/users/me/addressbook/:id/ibans/:iban', (req, res) =>
  proxyToIbex(req, res, {
    method: 'DELETE',
    upstreamPath: `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}/ibans/${encodeURIComponent(req.params.iban)}`,
  })
);

// SEPA
app.post('/api/ibex/sepa/iban/add', (req, res) =>
  proxyToIbex(req, res, { method: 'POST', upstreamPath: '/v1.2/sepa/iban/add' })
);
app.get('/api/ibex/sepa/iban', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/sepa/iban' })
);
app.post('/api/ibex/sepa/payments', (req, res) =>
  proxyToIbex(req, res, { method: 'POST', upstreamPath: '/v1.2/sepa/payments' })
);
app.put('/api/ibex/sepa/payments', (req, res) =>
  proxyToIbex(req, res, { method: 'PUT', upstreamPath: '/v1.2/sepa/payments' })
);
app.get('/api/ibex/sepa/transactions', (req, res) =>
  proxyToIbex(req, res, { method: 'GET', upstreamPath: '/v1.2/sepa/transactions' })
);
app.get('/api/ibex/sepa/transactions/:id', (req, res) =>
  proxyToIbex(req, res, {
    method: 'GET',
    upstreamPath: `/v1.2/sepa/transactions/${encodeURIComponent(req.params.id)}`,
  })
);

// ── SPA fallback ─────────────────────────────────────────────────────────
app.get('*', (_req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

// ── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🔐 IBEx.Fi Widget running at http://localhost:${PORT}`);
  console.log(`  📡 Proxying to ${IBEX}\n`);
});
