const STORAGE_KEYS = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  externalUserId: "external_user_id"
};

const state = {
  profile: null,
  balances: null,
  transactions: null,
  address: null,
  signers: null,
  tokens: null,
  pools: null,
  lending: null,
  isRefreshing: false
};

const el = {
  authBtn: document.querySelector("#authBtn"),
  refreshBtn: document.querySelector("#refreshBtn"),
  reloadBtn: document.querySelector("#reloadBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  profilePanel: document.querySelector("#profilePanel"),
  sessionPanel: document.querySelector("#sessionPanel"),
  marketPanel: document.querySelector("#marketPanel"),
  profileJson: document.querySelector("#profileJson"),
  balancesJson: document.querySelector("#balancesJson"),
  transactionsJson: document.querySelector("#transactionsJson"),
  addressJson: document.querySelector("#addressJson"),
  signersJson: document.querySelector("#signersJson"),
  tokensJson: document.querySelector("#tokensJson"),
  poolsJson: document.querySelector("#poolsJson"),
  lendingJson: document.querySelector("#lendingJson"),
  statusBadge: document.querySelector("#statusBadge"),
  rpIdValue: document.querySelector("#rpIdValue"),
  rpWarning: document.querySelector("#rpWarning"),
  externalUserId: document.querySelector("#externalUserId"),
  accessToken: document.querySelector("#accessToken"),
  refreshToken: document.querySelector("#refreshToken"),
  scopedCache: document.querySelector("#scopedCache"),
  logBox: document.querySelector("#logBox"),
  reloadMarketBtn: document.querySelector("#reloadMarketBtn"),
  updateForm: document.querySelector("#updateForm"),
  keyInput: document.querySelector("#keyInput"),
  valueInput: document.querySelector("#valueInput")
};

function now() {
  return new Date().toLocaleTimeString();
}

function logEvent(label, payload = null, level = "info") {
  const line = document.createElement("div");
  line.className = "log-entry";
  const head = `[${now()}] ${level.toUpperCase()} ${label}`;
  line.textContent = payload ? `${head}\n${JSON.stringify(payload, null, 2)}` : head;
  el.logBox.prepend(line);
}

function setConnected(connected) {
  el.statusBadge.textContent = connected ? "Connected" : "Disconnected";
  el.statusBadge.classList.toggle("badge-online", connected);
  el.statusBadge.classList.toggle("badge-offline", !connected);
  el.profilePanel.classList.toggle("hidden", !connected);
  el.sessionPanel.classList.toggle("hidden", !connected);
  el.marketPanel.classList.toggle("hidden", !connected);
}

function resolveRpId(hostname = window.location.hostname) {
  const host = (hostname || "").trim().toLowerCase();
  if (!host || host === "localhost") return "localhost";
  if (host === "ibex.fi" || host.endsWith(".ibex.fi")) return "ibex.fi";
  return host;
}

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input) {
  const base64 = String(input || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function decodePrfValues(entry) {
  if (!entry || typeof entry !== "object") return entry;
  return {
    ...entry,
    first: entry.first ? fromBase64Url(entry.first) : entry.first,
    second: entry.second ? fromBase64Url(entry.second) : entry.second
  };
}

function normalizeSignInOptions(payload) {
  const o = payload?.credentialRequestOptions || payload?.publicKey || payload || {};
  return {
    challenge: fromBase64Url(o.challenge),
    rpId: o.rpId,
    timeout: o.timeout,
    userVerification: o.userVerification,
    allowCredentials: Array.isArray(o.allowCredentials)
      ? o.allowCredentials.map((item) => ({
          ...item,
          id: fromBase64Url(item.id)
        }))
      : undefined
  };
}

function normalizeSignUpOptions(payload) {
  const o = payload?.credentialRequestOptions || payload?.publicKey || payload || {};
  const extensions = o.extensions && typeof o.extensions === "object" ? { ...o.extensions } : undefined;
  if (extensions?.prf && typeof extensions.prf === "object") {
    const prf = { ...extensions.prf };
    if (prf.eval && typeof prf.eval === "object") {
      prf.eval = decodePrfValues(prf.eval);
    }
    if (prf.evalByCredential && typeof prf.evalByCredential === "object") {
      const decoded = {};
      for (const [key, value] of Object.entries(prf.evalByCredential)) {
        decoded[key] = decodePrfValues(value);
      }
      prf.evalByCredential = decoded;
    }
    extensions.prf = prf;
  }

  return {
    challenge: fromBase64Url(o.challenge),
    rp: o.rp,
    user: {
      ...o.user,
      id: fromBase64Url(o.user?.id)
    },
    pubKeyCredParams: o.pubKeyCredParams || [],
    timeout: o.timeout,
    attestation: o.attestation,
    authenticatorSelection: o.authenticatorSelection,
    excludeCredentials: Array.isArray(o.excludeCredentials)
      ? o.excludeCredentials.map((item) => ({
          ...item,
          id: fromBase64Url(item.id)
        }))
      : undefined,
    extensions
  };
}

function serializeAssertion(credential) {
  const response = credential.response;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: toBase64Url(response.authenticatorData),
      clientDataJSON: toBase64Url(response.clientDataJSON),
      signature: toBase64Url(response.signature),
      userHandle: response.userHandle ? toBase64Url(response.userHandle) : null
    },
    clientExtensionResults: credential.getClientExtensionResults()
  };
}

function serializeAttestation(credential) {
  const response = credential.response;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: toBase64Url(response.attestationObject),
      clientDataJSON: toBase64Url(response.clientDataJSON)
    },
    clientExtensionResults: credential.getClientExtensionResults()
  };
}

function extractTokens(payload) {
  const accessToken = payload?.access_token || payload?.token || null;
  const refreshToken = payload?.refresh_token || null;
  if (!accessToken) return null;
  return { accessToken, refreshToken };
}

function normalizeProfile(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const data = root.data && typeof root.data === "object"
    ? root.data
    : root.userdata && typeof root.userdata === "object"
      ? root.userdata
      : root;
  const externalUserId = root.externalUserId || root.subject || root.sub || root.id || null;
  return { raw: root, data, externalUserId };
}

function setSession(tokens, externalUserId = null) {
  localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
  if (tokens.refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
  else localStorage.removeItem(STORAGE_KEYS.refreshToken);
  if (externalUserId) localStorage.setItem(STORAGE_KEYS.externalUserId, externalUserId);
}

function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

function getExternalUserId() {
  return localStorage.getItem(STORAGE_KEYS.externalUserId);
}

function clearSessionAndScopedCache() {
  const externalUserId = getExternalUserId();
  if (externalUserId) {
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${externalUserId}_`)) {
        toDelete.push(key);
      }
    }
    toDelete.forEach((key) => localStorage.removeItem(key));
  }
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.externalUserId);
  state.profile = null;
  render();
}

function cacheScopedData(externalUserId, data) {
  if (!externalUserId || !data || typeof data !== "object") return;
  Object.entries(data).forEach(([key, value]) => {
    const scopedKey = `${externalUserId}_${key}`;
    if (value === null || value === undefined) localStorage.removeItem(scopedKey);
    else localStorage.setItem(scopedKey, String(value));
  });
}

function scopedCacheSnapshot() {
  const externalUserId = getExternalUserId();
  if (!externalUserId) return {};
  const out = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${externalUserId}_`)) {
      out[key] = localStorage.getItem(key);
    }
  }
  return out;
}

function truncateToken(token) {
  if (!token) return "—";
  if (token.length <= 36) return token;
  return `${token.slice(0, 16)}...${token.slice(-12)}`;
}

function render() {
  const connected = Boolean(getAccessToken());
  const rpId = resolveRpId();
  setConnected(connected);
  el.rpIdValue.textContent = rpId;
  el.rpWarning.classList.toggle("hidden", rpId !== "localhost");
  el.profileJson.textContent = JSON.stringify(state.profile?.raw || {}, null, 2);
  el.balancesJson.textContent = JSON.stringify(state.balances || {}, null, 2);
  el.transactionsJson.textContent = JSON.stringify(state.transactions || {}, null, 2);
  el.addressJson.textContent = JSON.stringify(state.address || {}, null, 2);
  el.signersJson.textContent = JSON.stringify(state.signers || {}, null, 2);
  el.tokensJson.textContent = JSON.stringify(state.tokens || {}, null, 2);
  el.poolsJson.textContent = JSON.stringify(state.pools || {}, null, 2);
  el.lendingJson.textContent = JSON.stringify(state.lending || {}, null, 2);
  el.externalUserId.textContent = getExternalUserId() || "—";
  el.accessToken.textContent = truncateToken(getAccessToken());
  el.refreshToken.textContent = truncateToken(getRefreshToken());
  el.scopedCache.textContent = JSON.stringify(scopedCacheSnapshot(), null, 2);
}

function makeRpHeaders() {
  const rpId = resolveRpId();
  return { "X-Rp-Id": rpId, "X-RpId": rpId };
}

async function apiFetch(path, { method = "GET", body, auth = false, retryOnAuth = true } = {}) {
  const headers = { ...makeRpHeaders() };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getAccessToken();
    headers.Authorization = `Bearer ${token}`;
    headers["X-IBEx-Auth"] = `Bearer ${token}`;
  }

  const requestInfo = { method, path, headers, body: body ?? null };
  logEvent("API request", requestInfo);
  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  logEvent("API response", { method, path, status: response.status, payload }, response.ok ? "info" : "error");

  if ((response.status === 401 || response.status === 403) && auth && retryOnAuth) {
    await refreshSession(true);
    return apiFetch(path, { method, body, auth, retryOnAuth: false });
  }

  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function refreshSession(fromAutoRetry = false) {
  if (state.isRefreshing) {
    throw new Error("Refresh already running");
  }
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  try {
    state.isRefreshing = true;
    const payload = await apiFetch("/api/ibex/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
      auth: false,
      retryOnAuth: false
    });
    const tokens = extractTokens(payload);
    if (!tokens) throw new Error("Invalid refresh payload");
    setSession(tokens, getExternalUserId());
    logEvent(fromAutoRetry ? "Session refreshed after 401/403" : "Session refreshed manually");
    render();
  } catch (error) {
    logEvent("Refresh failed, clearing session", { error: String(error) }, "error");
    clearSessionAndScopedCache();
    throw error;
  } finally {
    state.isRefreshing = false;
  }
}

async function loadProfile() {
  const payload = await apiFetch("/api/ibex/users/me", { auth: true });
  const profile = normalizeProfile(payload);
  state.profile = profile;
  if (profile.externalUserId) {
    localStorage.setItem(STORAGE_KEYS.externalUserId, profile.externalUserId);
    cacheScopedData(profile.externalUserId, profile.data);
  }
  render();
}

async function loadMarketData() {
  const query = "?page=1&limit=20";
  try {
    state.balances = await apiFetch(`/api/ibex/users/me/balances${query}`, { auth: true });
  } catch (error) {
    if (error.status === 404) {
      state.balances = { notice: "Address not indexed yet, retry in a few seconds.", status: 404 };
    } else {
      state.balances = { error: String(error), status: error.status || 0 };
    }
  }

  try {
    state.transactions = await apiFetch(`/api/ibex/users/me/transactions${query}`, { auth: true });
  } catch (error) {
    if (error.status === 404) {
      state.transactions = { notice: "Address not indexed yet, retry in a few seconds.", status: 404 };
    } else {
      state.transactions = { error: String(error), status: error.status || 0 };
    }
  }

  try {
    state.address = await apiFetch("/api/ibex/users/me/address", { auth: true });
  } catch (error) {
    state.address = { error: String(error), status: error.status || 0 };
  }

  try {
    state.signers = await apiFetch("/api/ibex/users/me/signers", { auth: true });
  } catch (error) {
    state.signers = { error: String(error), status: error.status || 0 };
  }

  try {
    state.tokens = await apiFetch("/api/ibex/users/me/tokens", { auth: true });
  } catch (error) {
    state.tokens = { error: String(error), status: error.status || 0 };
  }

  try {
    state.pools = await apiFetch(`/api/ibex/users/me/pools${query}`, { auth: true });
  } catch (error) {
    if (error.status === 404) {
      state.pools = { notice: "Address not indexed yet, retry in a few seconds.", status: 404 };
    } else {
      state.pools = { error: String(error), status: error.status || 0 };
    }
  }

  try {
    state.lending = await apiFetch(`/api/ibex/users/me/lending${query}`, { auth: true });
  } catch (error) {
    state.lending = { error: String(error), status: error.status || 0 };
  }

  render();
}

async function authenticate() {
  const rpId = resolveRpId();
  const query = new URLSearchParams({ wallet: "passkeys", rpId }).toString();

  let tokens = null;
  try {
    const signInOptionsPayload = await apiFetch(`/api/ibex/auth/sign-in/options?${query}`, {
      method: "GET",
      retryOnAuth: false
    });
    const publicKey = normalizeSignInOptions(signInOptionsPayload);
    const assertion = await navigator.credentials.get({ publicKey });
    if (!assertion) throw new Error("No assertion returned by WebAuthn");
    const signInPayload = await apiFetch("/api/ibex/auth/sign-in/complete", {
      method: "POST",
      body: { credential: serializeAssertion(assertion) },
      retryOnAuth: false
    });
    tokens = extractTokens(signInPayload);
    logEvent("Sign-in succeeded");
  } catch (error) {
    logEvent("Sign-in failed, fallback to sign-up", { error: String(error) }, "error");
  }

  if (!tokens) {
    const signUpOptionsPayload = await apiFetch(`/api/ibex/auth/sign-up/options?${query}`, {
      method: "GET",
      retryOnAuth: false
    });
    const publicKey = normalizeSignUpOptions(signUpOptionsPayload);
    const attestation = await navigator.credentials.create({ publicKey });
    if (!attestation) throw new Error("No attestation returned by WebAuthn");
    const signUpPayload = await apiFetch("/api/ibex/auth/sign-up/complete", {
      method: "POST",
      body: { credential: serializeAttestation(attestation) },
      retryOnAuth: false
    });
    tokens = extractTokens(signUpPayload);
    if (!tokens) throw new Error("Missing tokens after sign-up");
    logEvent("Sign-up succeeded");
  }

  // Do not refresh right after auth; the issued token is already valid.
  setSession(tokens, null);
  await loadProfile();
  await loadMarketData();
}

async function validateSessionOnInit() {
  const accessToken = getAccessToken();
  if (!accessToken) return;
  try {
    await loadProfile();
    await loadMarketData();
    logEvent("Existing session restored");
  } catch (error) {
    logEvent("Stored session invalid, clearing", { error: String(error) }, "error");
    clearSessionAndScopedCache();
  }
}

async function onUpdateFormSubmit(event) {
  event.preventDefault();
  const key = el.keyInput.value.trim();
  if (!key) return;
  const rawValue = el.valueInput.value;
  const value = rawValue === "" ? null : rawValue;
  try {
    await apiFetch("/api/ibex/users/me", {
      method: "POST",
      auth: true,
      body: { data: { [key]: value } }
    });
    await loadProfile();
    logEvent("Profile key updated", { key, value });
    el.valueInput.value = "";
  } catch (error) {
    logEvent("Profile update failed", { error: String(error), key }, "error");
  }
}

async function withButtonLoading(button, fn) {
  const old = button.textContent;
  button.disabled = true;
  button.textContent = "Loading...";
  try {
    await fn();
  } finally {
    button.disabled = false;
    button.textContent = old;
  }
}

el.authBtn.addEventListener("click", () =>
  withButtonLoading(el.authBtn, async () => {
    try {
      await authenticate();
    } catch (error) {
      logEvent("Authentication flow failed", { error: String(error) }, "error");
      clearSessionAndScopedCache();
    }
  })
);

el.refreshBtn.addEventListener("click", () =>
  withButtonLoading(el.refreshBtn, async () => {
    try {
      await refreshSession(false);
      await loadProfile();
    } catch (error) {
      logEvent("Manual refresh failed", { error: String(error) }, "error");
    }
  })
);

el.reloadBtn.addEventListener("click", () =>
  withButtonLoading(el.reloadBtn, async () => {
    try {
      await loadProfile();
      await loadMarketData();
      logEvent("Profile reloaded");
    } catch (error) {
      logEvent("Profile reload failed", { error: String(error) }, "error");
    }
  })
);

el.logoutBtn.addEventListener("click", () => {
  clearSessionAndScopedCache();
  logEvent("Session cleared manually");
});

el.updateForm.addEventListener("submit", onUpdateFormSubmit);
el.reloadMarketBtn.addEventListener("click", () =>
  withButtonLoading(el.reloadMarketBtn, async () => {
    await loadMarketData();
    logEvent("Market data reloaded");
  })
);

render();
logEvent("rpId resolved", { rpId: resolveRpId() });
validateSessionOnInit();
