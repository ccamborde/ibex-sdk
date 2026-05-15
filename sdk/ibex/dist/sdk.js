import { browserStorage } from "./storage";
import { defaultResolveRpId, extractAuthTokens, extractExternalUserId, isAuthStatusError, normalizeBalancesResponse, normalizeTransactionsResponse, normalizeUserProfileResponse, normalizeSignInOptions, normalizeSignUpOptions, normalizeUsersMePayload, serializeAssertion, serializeAttestation, } from "./utils";
export const IBEX_TOKEN_KEY = "ibex_jwt";
export const IBEX_REFRESH_TOKEN_KEY = "ibex_refresh_token";
export const IBEX_EXTERNAL_USER_ID_KEY = "ibex_external_user_id";
export const IBEX_SESSION_CHANGED_EVENT = "ibex_session_changed";
export class IbexSdk {
    apiBaseUrl;
    storage;
    fetchImpl;
    blockchainId;
    defaultHeaders;
    resolveRpIdFn;
    keyToken;
    keyRefreshToken;
    keyExternalUserId;
    constructor(config) {
        this.apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, "");
        this.storage = config.storage || browserStorage;
        this.fetchImpl = config.fetchImpl || fetch.bind(globalThis);
        this.blockchainId = config.blockchainId;
        this.defaultHeaders = config.defaultHeaders || {};
        this.resolveRpIdFn = config.resolveRpId || defaultResolveRpId;
        const p = config.storagePrefix ? `${config.storagePrefix}_` : "";
        this.keyToken = `${p}${IBEX_TOKEN_KEY}`;
        this.keyRefreshToken = `${p}${IBEX_REFRESH_TOKEN_KEY}`;
        this.keyExternalUserId = `${p}${IBEX_EXTERNAL_USER_ID_KEY}`;
    }
    resolveRpId(hostname) {
        return this.resolveRpIdFn(hostname);
    }
    getStoredToken() {
        return this.storage.get(this.keyToken);
    }
    getStoredRefreshToken() {
        return this.storage.get(this.keyRefreshToken);
    }
    getStoredExternalUserId() {
        return this.storage.get(this.keyExternalUserId);
    }
    setSession(tokens, externalUserId = null) {
        this.storage.set(this.keyToken, tokens.accessToken);
        if (tokens.refreshToken)
            this.storage.set(this.keyRefreshToken, tokens.refreshToken);
        else
            this.storage.remove(this.keyRefreshToken);
        if (externalUserId)
            this.storage.set(this.keyExternalUserId, externalUserId);
        else
            this.storage.remove(this.keyExternalUserId);
        this.dispatchSessionChanged();
    }
    clearSessionAndScopedStorage() {
        const externalUserId = this.getStoredExternalUserId();
        if (externalUserId) {
            const toDelete = this.storage.keys().filter((key) => key.startsWith(`${externalUserId}_`));
            toDelete.forEach((key) => this.storage.remove(key));
        }
        this.storage.remove(this.keyToken);
        this.storage.remove(this.keyRefreshToken);
        this.storage.remove(this.keyExternalUserId);
        this.dispatchSessionChanged();
    }
    async authenticateWithPasskey() {
        const rpId = this.resolveRpId();
        const rpHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
        let tokens = null;
        try {
            const signInOptionsPayload = await this.jsonFetch("/v1.2/auth/sign-in", {
                method: "GET",
                headers: rpHeaders,
            });
            const signInOptions = normalizeSignInOptions(signInOptionsPayload);
            const assertion = (await navigator.credentials.get({
                publicKey: signInOptions,
            }));
            if (!assertion)
                throw new Error("Aucune assertion WebAuthn retournée");
            const signInPayload = await this.jsonFetch("/v1.2/auth/sign-in", {
                method: "POST",
                headers: rpHeaders,
                body: { credential: serializeAssertion(assertion) },
            });
            tokens = extractAuthTokens(signInPayload);
        }
        catch {
            tokens = null;
        }
        if (!tokens?.accessToken) {
            const signUpHeaders = this.withBlockchainHeader(rpHeaders);
            const signUpOptionsPayload = await this.jsonFetch("/v1.2/auth/sign-up", {
                method: "GET",
                headers: signUpHeaders,
            });
            const signUpOptions = normalizeSignUpOptions(signUpOptionsPayload);
            const attestation = (await navigator.credentials.create({
                publicKey: signUpOptions,
            }));
            if (!attestation)
                throw new Error("Aucune attestation WebAuthn retournée");
            const signUpPayload = await this.jsonFetch("/v1.2/auth/sign-up", {
                method: "POST",
                headers: signUpHeaders,
                body: { credential: serializeAttestation(attestation) },
            });
            tokens = extractAuthTokens(signUpPayload);
        }
        if (!tokens?.accessToken) {
            throw new Error("JWT IBEx introuvable dans la réponse");
        }
        this.setSession(tokens, null);
        return tokens;
    }
    async refreshSession() {
        const details = await this.refreshSessionDetailed();
        return details.tokens.accessToken;
    }
    async refreshSessionDetailed() {
        const refreshToken = this.getStoredRefreshToken();
        if (!refreshToken)
            throw new Error("Refresh token IBEx manquant");
        const path = "/v1.2/auth/refresh";
        const requestBody = { refresh_token: refreshToken };
        let meta;
        try {
            meta = await this.jsonFetchWithMeta(path, {
                method: "POST",
                body: requestBody,
            });
        }
        catch (error) {
            const enriched = error;
            enriched.requestBody = requestBody;
            enriched.path = path;
            throw enriched;
        }
        const tokens = extractAuthTokens(meta.payload);
        if (!tokens?.accessToken)
            throw new Error("Réponse refresh IBEx invalide");
        this.setSession(tokens, this.getStoredExternalUserId());
        return {
            tokens,
            request: {
                url: meta.url,
                path,
                body: requestBody,
            },
            response: {
                status: meta.status,
                requestId: meta.requestId,
                payload: meta.payload,
            },
        };
    }
    async withRefreshOnUnauthorized(operation) {
        const accessToken = this.getStoredToken();
        if (!accessToken)
            throw new Error("Session IBEx absente");
        try {
            return await operation(accessToken);
        }
        catch (error) {
            if (!isAuthStatusError(error))
                throw error;
            try {
                const refreshed = await this.refreshSession();
                return await operation(refreshed);
            }
            catch {
                this.clearSessionAndScopedStorage();
                throw new Error("Session IBEx expirée. Reconnectez votre compte.");
            }
        }
    }
    async getMe() {
        const raw = await this.getMeRaw();
        const normalized = normalizeUserProfileResponse(raw);
        if (normalized.externalUserId)
            this.storage.set(this.keyExternalUserId, normalized.externalUserId);
        return normalized;
    }
    async getMeRaw() {
        const profile = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me", token, {
            method: "GET",
        }));
        const normalized = normalizeUsersMePayload(profile);
        const externalUserId = extractExternalUserId(normalized);
        if (externalUserId)
            this.storage.set(this.keyExternalUserId, externalUserId);
        return normalized;
    }
    async updateMeData(data) {
        const updated = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me", token, {
            method: "POST",
            body: { data },
        }));
        const normalized = normalizeUsersMePayload(updated);
        const externalUserId = extractExternalUserId(normalized);
        if (externalUserId)
            this.storage.set(this.keyExternalUserId, externalUserId);
        return normalized;
    }
    async setAlertFlag(alertKey, enabled) {
        return this.updateMeData({ [alertKey]: enabled });
    }
    async removeAlertFlag(alertKey) {
        return this.updateMeData({ [alertKey]: null });
    }
    async getMeBalances(query = {}) {
        const raw = await this.getMeBalancesRaw(query);
        return normalizeBalancesResponse(raw);
    }
    async getMeBalancesRaw(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/users/me/balances", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    async getMeTransactions(query = {}) {
        const raw = await this.getMeTransactionsRaw(query);
        return normalizeTransactionsResponse(raw);
    }
    async getMeTransactionsRaw(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/users/me/transactions", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    async getMeAddress() {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/address", token, { method: "GET" }));
        return payload;
    }
    async getMeSigners() {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/signers", token, { method: "GET" }));
        return payload;
    }
    async getMeTokens() {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/tokens", token, { method: "GET" }));
        return payload;
    }
    async getMePools(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/users/me/pools", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    async getMeLending(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/users/me/lending", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    // --- Chains ---
    async getChains() {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/chains/", token, { method: "GET" }));
        return (Array.isArray(payload) ? payload : []);
    }
    // --- Recovery ---
    async getRecoveryStatus(safeAddress) {
        const encoded = encodeURIComponent(safeAddress);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/recovery/status/${encoded}`, token, { method: "GET" }));
        return payload;
    }
    // --- User Operations ---
    async getMeOperations(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/users/me/operations", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    // --- Email Validation ---
    async validateEmail(request) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/validate-email", token, {
            method: "POST",
            body: request,
        }));
        return payload;
    }
    async confirmEmail(request) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/confirm-email", token, {
            method: "POST",
            body: request,
        }));
        return payload;
    }
    // --- KYC Iframe ---
    async getKycIframeUrl(request = {}) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/auth/iframe", token, {
            method: "POST",
            body: request,
        }));
        return payload;
    }
    // --- Email Recovery (Public) ---
    async recoverWithEmail(request) {
        const rpId = this.resolveRpId();
        const payload = await this.jsonFetch("/v1.2/auth/email/recover", {
            method: "POST",
            headers: { "X-Rp-Id": rpId, "X-RpId": rpId },
            body: request,
        });
        return payload;
    }
    // --- Address Book ---
    async getMeAddressBook() {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/addressbook", token, { method: "GET" }));
        return payload;
    }
    async createMeAddressBookEntry(input) {
        const hasIban = typeof input.iban === "string" && input.iban.trim().length > 0;
        const hasRespondingPspBic = typeof input.respondingPspBic === "string" && input.respondingPspBic.trim().length > 0;
        if (hasIban !== hasRespondingPspBic) {
            throw new Error("When creating an address book entry, `iban` and `respondingPspBic` must be provided together.");
        }
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/addressbook", token, {
            method: "POST",
            body: input,
        }));
        return payload;
    }
    async updateMeAddressBookEntry(id, input) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/users/me/addressbook/${encodeURIComponent(id)}`, token, {
            method: "PUT",
            body: input,
        }));
        return payload;
    }
    async deleteMeAddressBookEntry(id) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/users/me/addressbook/${encodeURIComponent(id)}`, token, { method: "DELETE" }));
        return payload;
    }
    async addMeAddressBookCrypto(id, input) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/users/me/addressbook/${encodeURIComponent(id)}/crypto`, token, {
            method: "POST",
            body: input,
        }));
        return payload;
    }
    async deleteMeAddressBookCrypto(id, chainId, address) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/users/me/addressbook/${encodeURIComponent(id)}/crypto/${encodeURIComponent(String(chainId))}/${encodeURIComponent(address)}`, token, { method: "DELETE" }));
        return payload;
    }
    async deleteMeAddressBookIban(id, iban) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/users/me/addressbook/${encodeURIComponent(id)}/ibans/${encodeURIComponent(iban)}`, token, { method: "DELETE" }));
        return payload;
    }
    async addSepaIban(payload) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/sepa/iban/add", token, {
            method: "POST",
            body: payload,
        }));
        return response;
    }
    async getSepaIbans() {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/sepa/iban", token, { method: "GET" }));
        return payload;
    }
    async createSepaPaymentIntent(payload) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/sepa/payments", token, {
            method: "POST",
            body: payload,
        }));
        return response;
    }
    async confirmSepaPayment(payload) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/sepa/payments", token, {
            method: "PUT",
            body: payload,
        }));
        return response;
    }
    async getSepaTransactions(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/sepa/transactions", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    async getSepaTransactionById(id) {
        const normalizedId = encodeURIComponent(id);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/sepa/transactions/${normalizedId}`, token, { method: "GET" }));
        return payload;
    }
    async createSepaMandate(payload) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/sepa/mandates", token, {
            method: "POST",
            body: payload,
        }));
        return response;
    }
    async getSepaMandates() {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/sepa/mandates", token, { method: "GET" }));
        return payload;
    }
    async getSepaMandateById(id) {
        const normalizedId = encodeURIComponent(id);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/sepa/mandates/${normalizedId}`, token, { method: "GET" }));
        return payload;
    }
    async updateSepaMandateStatus(id, payload) {
        const normalizedId = encodeURIComponent(id);
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/sepa/mandates/${normalizedId}/status`, token, {
            method: "PATCH",
            body: payload,
        }));
        return response;
    }
    async cancelSepaMandate(id) {
        const normalizedId = encodeURIComponent(id);
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/sepa/mandates/${normalizedId}/cancel`, token, {
            method: "POST",
        }));
        return response;
    }
    // --- Safe Operations ---
    async prepareSafeOperations(request) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/safes/operations", token, {
            method: "POST",
            body: request,
        }));
        return response;
    }
    async executeSafeOperations(request) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/safes/operations", token, {
            method: "PUT",
            body: request,
        }));
        return response;
    }
    async signMessage(safeAddress, message, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "SIGN_MESSAGE", message }],
            ...options,
        });
    }
    async enableRecovery(safeAddress, identity, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "ENABLE_RECOVERY", ...identity }],
            ...options,
        });
    }
    async cancelRecovery(safeAddress, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "CANCEL_RECOVERY" }],
            ...options,
        });
    }
    // --- Swap Quote ---
    async getSwapQuote(query) {
        const path = this.buildPathWithQuery("/v1.2/safes/swap/quote", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    // --- Unified Route Engine ---
    async getRouteCapabilities(query) {
        const path = this.buildPathWithQuery("/v1.2/safes/routes/capabilities", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    async getRouteQuote(payload) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/safes/routes/quote", token, {
            method: "POST",
            body: payload,
        }));
        return response;
    }
    async getRouteStatus(routeId) {
        const encoded = encodeURIComponent(routeId);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(`/v1.2/safes/routes/${encoded}/status`, token, { method: "GET" }));
        return payload;
    }
    async routeFromQuote(safeAddress, routeId, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "ROUTE_FROM_QUOTE", quoteId: routeId }],
            ...options,
        });
    }
    async swapFromQuote(safeAddress, quoteId, options) {
        const { orderUid, ...rest } = options || {};
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "SWAP_FROM_QUOTE", quoteId, ...(orderUid ? { orderUid } : {}) }],
            ...rest,
        });
    }
    async jsonFetch(path, options = {}) {
        const meta = await this.jsonFetchWithMeta(path, options);
        return meta.payload;
    }
    async jsonFetchWithMeta(path, options = {}) {
        const method = options.method || "GET";
        const headers = {
            ...this.defaultHeaders,
            ...(options.headers || {}),
        };
        const init = { method, headers };
        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
            init.body = JSON.stringify(options.body);
        }
        const url = this.buildUrl(path);
        const response = await this.fetchImpl(url, init);
        const payload = (await response.json().catch(() => ({})));
        const requestId = response.headers.get("x-request-id");
        if (!response.ok) {
            const detail = typeof payload.detail === "string"
                ? payload.detail
                : typeof payload.message === "string"
                    ? payload.message
                    : `Erreur ${response.status}`;
            const suffix = requestId ? ` (x-request-id: ${requestId})` : "";
            const error = new Error(`${detail}${suffix}`);
            error.status = response.status;
            error.requestId = requestId;
            error.payload = payload;
            error.url = url;
            throw error;
        }
        return {
            payload,
            status: response.status,
            requestId,
            url,
        };
    }
    async authenticatedJsonFetch(path, accessToken, options) {
        const headers = {
            "X-IBEx-Auth": `Bearer ${accessToken}`,
            "Authorization": `Bearer ${accessToken}`,
            ...(options.headers || {}),
        };
        return this.jsonFetch(path, { ...options, headers });
    }
    withBlockchainHeader(headers) {
        if (!this.blockchainId)
            return headers;
        return { ...headers, "X-Blockchain-Id": this.blockchainId };
    }
    buildUrl(path) {
        const normalized = path.startsWith("/") ? path : `/${path}`;
        return `${this.apiBaseUrl}${normalized}`;
    }
    buildPathWithQuery(path, query) {
        const pairs = Object.entries(query).filter(([, value]) => value !== undefined && value !== null);
        if (pairs.length === 0)
            return path;
        const params = new URLSearchParams();
        pairs.forEach(([key, value]) => {
            params.set(key, String(value));
        });
        return `${path}?${params.toString()}`;
    }
    dispatchSessionChanged() {
        if (typeof window === "undefined")
            return;
        window.dispatchEvent(new Event(IBEX_SESSION_CHANGED_EVENT));
    }
}
export function createIbexSdk(config) {
    return new IbexSdk(config);
}
