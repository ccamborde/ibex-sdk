/**
 * IBEx.Fi Widget — Frontend Application
 * Passkey auth, profile management, token refresh, scoped cache, event log
 */

// ═══════════════════════════════════════════════════════════════════════
// §1  Base64url Codec
// ═══════════════════════════════════════════════════════════════════════
function b64urlToBuffer(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function bufferToB64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ═══════════════════════════════════════════════════════════════════════
// §2  rpId Resolution
// ═══════════════════════════════════════════════════════════════════════
function resolveRpId() {
  const h = location.hostname;
  if (!h || h === 'localhost') return 'localhost';
  if (h === 'ibex.fi' || h.endsWith('.ibex.fi')) return 'ibex.fi';
  return h;
}
const rpId = resolveRpId();

// ═══════════════════════════════════════════════════════════════════════
// §3  Event Logger
// ═══════════════════════════════════════════════════════════════════════
const logEl = document.getElementById('eventLog');

function log(method, url, status, message, detail) {
  const empty = logEl.querySelector('.event-log__empty');
  if (empty) empty.remove();

  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const mCls = method === 'GET' ? 'log-method--get' : 'log-method--post';
  const sCls = status < 400 ? 'log-status--ok' : 'log-status--err';

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML =
    `<span class="log-time">${time}</span>` +
    `<span class="log-method ${mCls}">${method}</span>` +
    `<span class="log-url">${url}</span>` +
    `<span class="log-status ${sCls}">${status}</span>` +
    `<span class="log-msg">${message || ''}</span>` +
    (detail ? `<span class="log-detail">${detail}</span>` : '');

  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function logInfo(msg) {
  const empty = logEl.querySelector('.event-log__empty');
  if (empty) empty.remove();
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<span class="log-time">${time}</span><span class="log-msg">${msg}</span>`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════════════
// §4  API Client (talks to local proxy)
// ═══════════════════════════════════════════════════════════════════════
async function api(method, path, body, auth) {
  const headers = { 'X-Rp-Id': rpId, 'X-RpId': rpId };
  if (body) headers['Content-Type'] = 'application/json';
  if (auth) {
    headers['X-IBEx-Auth'] = `Bearer ${auth}`;
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  const short = path.length > 50 ? '…' + path.slice(-45) : path;
  const detail = typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : '';
  log(method, short, res.status, res.ok ? 'OK' : 'FAIL', detail);

  if (!res.ok) throw { status: res.status, data };
  return data;
}

// ═══════════════════════════════════════════════════════════════════════
// §5  Session Store
// ═══════════════════════════════════════════════════════════════════════
const session = {
  get accessToken()  { return localStorage.getItem('access_token'); },
  set accessToken(v) { localStorage.setItem('access_token', v); },
  get refreshToken() { return localStorage.getItem('refresh_token'); },
  set refreshToken(v){ localStorage.setItem('refresh_token', v); },
  get userId()       { return localStorage.getItem('external_user_id'); },
  set userId(v)      { localStorage.setItem('external_user_id', v); },

  clear() {
    const uid = this.userId;
    if (uid) {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(uid + '_')) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('external_user_id');
  },

  cacheData(data) {
    const uid = this.userId;
    if (!uid || !data) return;
    for (const [k, v] of Object.entries(data)) {
      if (v === null || v === undefined) {
        localStorage.removeItem(`${uid}_${k}`);
      } else {
        localStorage.setItem(`${uid}_${k}`, typeof v === 'string' ? v : JSON.stringify(v));
      }
    }
  },

  getScopedEntries() {
    const uid = this.userId;
    if (!uid) return {};
    const entries = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(uid + '_')) {
        entries[k] = localStorage.getItem(k);
      }
    }
    return entries;
  }
};

// ═══════════════════════════════════════════════════════════════════════
// §6  Token Extraction & Profile Normalization
// ═══════════════════════════════════════════════════════════════════════
function extractTokens(res) {
  const at = res.access_token || res.token;
  const rt = res.refresh_token;
  if (!at) return null;
  return { access_token: at, refresh_token: rt };
}

function normalizeProfile(res) {
  const data = res.data || res.userdata || (() => {
    const { externalUserId, subject, sub, id, ...rest } = res;
    return Object.keys(rest).length ? rest : {};
  })();
  const userId = res.externalUserId || res.subject || res.sub || res.id || null;
  return { userId, data };
}

// ═══════════════════════════════════════════════════════════════════════
// §7  WebAuthn Helpers
// ═══════════════════════════════════════════════════════════════════════
function decodeSignInOptions(opts) {
  if (opts.challenge) opts.challenge = b64urlToBuffer(opts.challenge);
  if (opts.allowCredentials) {
    opts.allowCredentials = opts.allowCredentials.map(c => ({
      ...c, id: b64urlToBuffer(c.id)
    }));
  }
  return opts;
}

function decodeSignUpOptions(opts) {
  if (opts.challenge) opts.challenge = b64urlToBuffer(opts.challenge);
  if (opts.user?.id) opts.user.id = b64urlToBuffer(opts.user.id);
  if (opts.excludeCredentials) {
    opts.excludeCredentials = opts.excludeCredentials.map(c => ({
      ...c, id: b64urlToBuffer(c.id)
    }));
  }
  // PRF extension values — MUST be ArrayBuffer
  if (opts.extensions?.prf?.eval) {
    const e = opts.extensions.prf.eval;
    if (typeof e.first === 'string') e.first = b64urlToBuffer(e.first);
    if (typeof e.second === 'string') e.second = b64urlToBuffer(e.second);
  }
  if (opts.extensions?.prf?.evalByCredential) {
    for (const [k, v] of Object.entries(opts.extensions.prf.evalByCredential)) {
      if (typeof v.first === 'string') v.first = b64urlToBuffer(v.first);
      if (typeof v.second === 'string') v.second = b64urlToBuffer(v.second);
    }
  }
  return opts;
}

function encodeAssertion(cred) {
  return {
    credential: {
      id: cred.id,
      rawId: bufferToB64url(cred.rawId),
      type: cred.type,
      response: {
        authenticatorData: bufferToB64url(cred.response.authenticatorData),
        clientDataJSON: bufferToB64url(cred.response.clientDataJSON),
        signature: bufferToB64url(cred.response.signature),
        userHandle: cred.response.userHandle ? bufferToB64url(cred.response.userHandle) : null,
      },
      clientExtensionResults: cred.getClientExtensionResults?.() || {},
    }
  };
}

function encodeAttestation(cred) {
  return {
    credential: {
      id: cred.id,
      rawId: bufferToB64url(cred.rawId),
      type: cred.type,
      response: {
        attestationObject: bufferToB64url(cred.response.attestationObject),
        clientDataJSON: bufferToB64url(cred.response.clientDataJSON),
      },
      clientExtensionResults: cred.getClientExtensionResults?.() || {},
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════
// §8  Auth Flow with Retry
// ═══════════════════════════════════════════════════════════════════════
async function authenticatedRequest(method, path, body) {
  try {
    return await api(method, path, body, session.accessToken);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      logInfo('⟳ Token expired, attempting refresh…');
      const ok = await refreshToken();
      if (ok) return api(method, path, body, session.accessToken);
      logInfo('✗ Refresh failed — session cleared');
      doLogout();
      throw err;
    }
    throw err;
  }
}

async function refreshToken() {
  try {
    const res = await api('POST', '/api/ibex/auth/refresh', {
      refresh_token: session.refreshToken
    });
    const tokens = extractTokens(res);
    if (!tokens) return false;
    session.accessToken = tokens.access_token;
    if (tokens.refresh_token) session.refreshToken = tokens.refresh_token;
    logInfo('✓ Token refreshed');
    renderSession();
    return true;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// §9  Core Operations
// ═══════════════════════════════════════════════════════════════════════
async function doAuth() {
  setStatus('connecting');
  const btn = document.getElementById('btnAuth');
  btn.classList.add('btn--loading');

  let tokens = null;

  // Step 1: Try sign-in
  try {
    logInfo('→ Attempting sign-in…');
    const qp = `?wallet=passkeys&rpId=${encodeURIComponent(rpId)}`;
    const opts = await api('GET', '/api/ibex/auth/sign-in/options' + qp);
    const pubKey = decodeSignInOptions(opts.credentialRequestOptions);
    const assertion = await navigator.credentials.get({ publicKey: pubKey });
    const result = await api('POST', '/api/ibex/auth/sign-in/complete', encodeAssertion(assertion));
    tokens = extractTokens(result);
  } catch (e) {
    logInfo('⚠ Sign-in failed or cancelled, trying sign-up…');
    tokens = null;
  }

  // Step 2: Fallback to sign-up
  if (!tokens) {
    try {
      const qp = `?wallet=passkeys&rpId=${encodeURIComponent(rpId)}`;
      const opts = await api('GET', '/api/ibex/auth/sign-up/options' + qp);
      const pubKey = decodeSignUpOptions(opts.credentialRequestOptions);
      const attestation = await navigator.credentials.create({ publicKey: pubKey });
      const result = await api('POST', '/api/ibex/auth/sign-up/complete', encodeAttestation(attestation));
      tokens = extractTokens(result);
    } catch (e2) {
      logInfo('✗ Authentication failed completely');
      btn.classList.remove('btn--loading');
      setStatus('disconnected');
      return;
    }
  }

  if (!tokens) {
    logInfo('✗ No tokens received');
    btn.classList.remove('btn--loading');
    setStatus('disconnected');
    return;
  }

  // Step 3: Store tokens — do NOT refresh
  session.accessToken = tokens.access_token;
  if (tokens.refresh_token) session.refreshToken = tokens.refresh_token;
  logInfo('✓ Authenticated — loading profile…');

  // Step 4: Load profile
  await loadProfile();

  btn.classList.remove('btn--loading');
  setStatus('connected');
  showConnected();
}

async function loadProfile() {
  try {
    const raw = await authenticatedRequest('GET', '/api/ibex/users/me');
    const { userId, data } = normalizeProfile(raw);
    if (userId) session.userId = userId;
    session.cacheData(data);
    renderProfile(userId, data);
    renderSession();
    await loadMarketData();
    logInfo('✓ Profile loaded');
  } catch (e) {
    logInfo('✗ Failed to load profile');
  }
}

async function doUpdateData() {
  const key = document.getElementById('inputKey').value.trim();
  const val = document.getElementById('inputValue').value.trim();
  if (!key) return;

  const payload = { data: { [key]: val === '' ? null : val } };
  try {
    await authenticatedRequest('POST', '/api/ibex/users/me', payload);
    logInfo(`✓ Data updated: ${key} = ${val || '(deleted)'}`);
    session.cacheData(payload.data);
    await loadProfile();
  } catch (e) {
    logInfo(`✗ Update failed for key "${key}"`);
  }
}

function doLogout() {
  session.clear();
  setStatus('disconnected');
  showDisconnected();
  logInfo('✓ Logged out — session cleared');
}

// ═══════════════════════════════════════════════════════════════════════
// §10  UI Rendering
// ═══════════════════════════════════════════════════════════════════════
function setStatus(state) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.className = 'status-dot status-dot--' + state;
  const labels = { disconnected: 'Disconnected', connecting: 'Connecting…', connected: 'Connected' };
  txt.textContent = labels[state] || state;
}

function showConnected() {
  document.getElementById('authPanel').style.display = 'none';
  document.getElementById('connectedPanels').style.display = '';
}

function showDisconnected() {
  document.getElementById('authPanel').style.display = '';
  document.getElementById('connectedPanels').style.display = 'none';
}

function truncateToken(t) {
  if (!t) return '—';
  return t.slice(0, 20) + '…' + t.slice(-12);
}

function renderProfile(userId, data) {
  document.getElementById('profileUserId').textContent = userId || '—';
  document.getElementById('profileData').textContent = JSON.stringify(data || {}, null, 2);
}

function renderSession() {
  document.getElementById('sessionAccess').textContent = truncateToken(session.accessToken);
  document.getElementById('sessionRefresh').textContent = truncateToken(session.refreshToken);
  document.getElementById('sessionStorage').textContent = JSON.stringify(session.getScopedEntries(), null, 2);
}

function renderMarketData(resources) {
  const {
    balances,
    transactions,
    address,
    signers,
    tokens,
    pools,
    lending,
  } = resources;
  document.getElementById('balancesData').textContent = JSON.stringify(balances || {}, null, 2);
  document.getElementById('transactionsData').textContent = JSON.stringify(transactions || {}, null, 2);
  document.getElementById('addressData').textContent = JSON.stringify(address || {}, null, 2);
  document.getElementById('signersData').textContent = JSON.stringify(signers || {}, null, 2);
  document.getElementById('tokensData').textContent = JSON.stringify(tokens || {}, null, 2);
  document.getElementById('poolsData').textContent = JSON.stringify(pools || {}, null, 2);
  document.getElementById('lendingData').textContent = JSON.stringify(lending || {}, null, 2);
}

async function loadProtectedResource(path, { query = '', indexing404 = false } = {}) {
  try {
    return await authenticatedRequest('GET', path + query);
  } catch (err) {
    if (indexing404 && err?.status === 404) {
      return { notice: 'Address not indexed yet, retry in a few seconds.', status: 404 };
    }
    return { error: `Failed to load ${path}`, status: err?.status || 0 };
  }
}

async function loadMarketData() {
  const paged = '?page=1&limit=20';
  const resources = {
    balances: await loadProtectedResource('/api/ibex/users/me/balances', { query: paged, indexing404: true }),
    transactions: await loadProtectedResource('/api/ibex/users/me/transactions', { query: paged, indexing404: true }),
    address: await loadProtectedResource('/api/ibex/users/me/address'),
    signers: await loadProtectedResource('/api/ibex/users/me/signers'),
    tokens: await loadProtectedResource('/api/ibex/users/me/tokens'),
    pools: await loadProtectedResource('/api/ibex/users/me/pools', { query: paged, indexing404: true }),
    lending: await loadProtectedResource('/api/ibex/users/me/lending', { query: paged }),
  };
  renderMarketData(resources);
}

// ═══════════════════════════════════════════════════════════════════════
// §11  Event Listeners
// ═══════════════════════════════════════════════════════════════════════
document.getElementById('btnAuth').addEventListener('click', doAuth);
document.getElementById('btnRefreshProfile').addEventListener('click', loadProfile);
document.getElementById('btnUpdate').addEventListener('click', doUpdateData);
document.getElementById('btnRefreshToken').addEventListener('click', async () => {
  const ok = await refreshToken();
  if (!ok) logInfo('✗ Manual refresh failed');
});
document.getElementById('btnLogout').addEventListener('click', doLogout);
document.getElementById('btnReloadMarket').addEventListener('click', loadMarketData);
document.getElementById('btnClearLog').addEventListener('click', () => {
  logEl.innerHTML = '<div class="event-log__empty">Waiting for activity…</div>';
});

// ═══════════════════════════════════════════════════════════════════════
// §12  Init — Restore Session
// ═══════════════════════════════════════════════════════════════════════
(async function init() {
  if (session.accessToken) {
    logInfo('↻ Restoring previous session…');
    setStatus('connecting');
    try {
      await loadProfile();
      setStatus('connected');
      showConnected();
    } catch {
      logInfo('⚠ Previous session expired — please re-authenticate');
      session.clear();
      setStatus('disconnected');
    }
  }
})();
