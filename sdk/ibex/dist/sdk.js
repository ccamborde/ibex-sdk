import { browserStorage } from "./storage";
import { IbexRealtimeClient } from "./realtime";
import { IbexDevToolsClient } from "./devtools";
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
    webauthnProvider;
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
        this.webauthnProvider = config.webauthnProvider;
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
    getCredentialProvider() {
        if (this.webauthnProvider)
            return this.webauthnProvider;
        if (typeof navigator !== "undefined" && navigator.credentials) {
            return {
                async create(options) {
                    const cred = await navigator.credentials.create({ publicKey: options });
                    if (!cred)
                        throw new Error("Aucune attestation WebAuthn retournée");
                    return cred;
                },
                async get(options) {
                    const cred = await navigator.credentials.get({ publicKey: options });
                    if (!cred)
                        throw new Error("Aucune assertion WebAuthn retournée");
                    return cred;
                },
            };
        }
        throw new Error("WebAuthn non disponible. Fournissez webauthnProvider dans IbexSdkConfig pour un environnement Node.js.");
    }
    async signInWithPasskey() {
        const rpId = this.resolveRpId();
        const rpHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
        const provider = this.getCredentialProvider();
        const signInOptionsPayload = await this.jsonFetch("/v1.2/auth/sign-in", {
            method: "GET",
            headers: rpHeaders,
        });
        const signInOptions = normalizeSignInOptions(signInOptionsPayload);
        const assertion = await provider.get(signInOptions);
        const signInPayload = await this.jsonFetch("/v1.2/auth/sign-in", {
            method: "POST",
            headers: rpHeaders,
            body: { credential: serializeAssertion(assertion) },
        });
        const tokens = extractAuthTokens(signInPayload);
        if (!tokens?.accessToken) {
            throw new Error("JWT IBEx introuvable dans la réponse sign-in");
        }
        this.setSession(tokens, null);
        return tokens;
    }
    async signUpWithPasskey() {
        const rpId = this.resolveRpId();
        const rpHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
        const signUpHeaders = this.withBlockchainHeader(rpHeaders);
        const provider = this.getCredentialProvider();
        const signUpOptionsPayload = await this.jsonFetch("/v1.2/auth/sign-up", {
            method: "GET",
            headers: signUpHeaders,
        });
        const signUpOptions = normalizeSignUpOptions(signUpOptionsPayload);
        const attestation = await provider.create(signUpOptions);
        const signUpPayload = await this.jsonFetch("/v1.2/auth/sign-up", {
            method: "POST",
            headers: signUpHeaders,
            body: { credential: serializeAttestation(attestation) },
        });
        const tokens = extractAuthTokens(signUpPayload);
        if (!tokens?.accessToken) {
            throw new Error("JWT IBEx introuvable dans la réponse sign-up");
        }
        this.setSession(tokens, null);
        return tokens;
    }
    async authenticateWithPasskey() {
        try {
            return await this.signInWithPasskey();
        }
        catch {
            // sign-in failed, fallback to sign-up
        }
        return this.signUpWithPasskey();
    }
    async initSmsSignUp(request) {
        const rpId = this.resolveRpId();
        const rpHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
        const params = new URLSearchParams({ wallet: "sms", telephone: request.telephone });
        if (request.phonePolicy)
            params.set("phonePolicy", request.phonePolicy);
        if (typeof request.smsDryRun === "boolean")
            params.set("smsDryRun", String(request.smsDryRun));
        const payload = await this.jsonFetch(`/v1.2/auth/sign-up?${params.toString()}`, {
            method: "GET",
            headers: rpHeaders,
        });
        return payload;
    }
    async confirmSmsSignUp(request) {
        const rpId = this.resolveRpId();
        const rpHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
        const payload = await this.jsonFetch("/v1.2/auth/sign-up", {
            method: "POST",
            headers: rpHeaders,
            body: { wallet: "sms", ...request },
        });
        const response = payload;
        const tokens = extractAuthTokens(payload);
        if (tokens?.accessToken) {
            const externalUserId = extractExternalUserId(payload);
            this.setSession(tokens, externalUserId);
        }
        return response;
    }
    /** @deprecated Use initSmsSignUp() + confirmSmsSignUp() for the 2-step flow */
    async signUpWithSms(request) {
        const step1 = await this.initSmsSignUp({
            telephone: request.telephone,
            phonePolicy: request.phonePolicy,
            smsDryRun: request.smsDryRun,
        });
        const code = step1.code;
        if (!code) {
            throw new Error("signUpWithSms requires dry-run mode (code returned in step 1) or use initSmsSignUp + confirmSmsSignUp separately");
        }
        return this.confirmSmsSignUp({
            externalUserId: step1.externalUserId,
            telephone: request.telephone,
            code,
            phonePolicy: request.phonePolicy,
            email: request.email,
            companyRegistrationNumber: request.companyRegistrationNumber,
        });
    }
    async signInWithSms(request) {
        const rpId = this.resolveRpId();
        const rpHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
        const params = new URLSearchParams({ wallet: "sms", telephone: request.telephone });
        if (request.phonePolicy)
            params.set("phonePolicy", request.phonePolicy);
        if (typeof request.smsDryRun === "boolean")
            params.set("smsDryRun", String(request.smsDryRun));
        const payload = await this.jsonFetch(`/v1.2/auth/sign-in?${params.toString()}`, {
            method: "GET",
            headers: rpHeaders,
        });
        return payload;
    }
    async confirmSmsSignIn(request) {
        const rpId = this.resolveRpId();
        const rpHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
        const payload = await this.jsonFetch("/v1.2/auth/sign-in", {
            method: "POST",
            headers: rpHeaders,
            body: { wallet: "sms", ...request },
        });
        const tokens = extractAuthTokens(payload);
        if (!tokens?.accessToken) {
            throw new Error("JWT IBEx introuvable dans la réponse SMS sign-in");
        }
        const externalUserId = extractExternalUserId(payload);
        this.setSession(tokens, externalUserId);
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
    async getMeTokens(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/users/me/tokens", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    async getMeLending(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/users/me/lending", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    async getChainTokens(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/chain/tokens", query);
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch(path, token, { method: "GET" }));
        return payload;
    }
    async getVaults(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/safes/vaults", query);
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
    // --- SMS Verification ---
    async validateSms(request) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/validate-sms", token, {
            method: "POST",
            body: request,
        }));
        return payload;
    }
    async confirmSms(request) {
        const payload = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/users/me/confirm-sms", token, {
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
    async confirmSepaIbanAdd(request) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/sepa/iban/add", token, {
            method: "PUT",
            body: request,
        }));
        return response;
    }
    async modifySepaIbanLabel(request) {
        const response = await this.withRefreshOnUnauthorized(async (token) => this.authenticatedJsonFetch("/v1.2/sepa/iban/modify", token, {
            method: "PATCH",
            body: request,
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
    // --- Hyperliquid ---
    async hyperliquidDeposit(safeAddress, amount, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "HYPERLIQUID_DEPOSIT", hyperliquidData: { action: "DEPOSIT", amount } }],
            ...options,
        });
    }
    async hyperliquidEnterVault(safeAddress, amount, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "HYPERLIQUID_ENTER_VAULT", hyperliquidData: { action: "ENTER_VAULT", amount } }],
            ...options,
        });
    }
    async hyperliquidWithdrawVault(safeAddress, amount, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "HYPERLIQUID_WITHDRAW_VAULT", hyperliquidData: { action: "WITHDRAW", amount } }],
            ...options,
        });
    }
    async hyperliquidWithdraw(safeAddress, to, amount, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "HYPERLIQUID_WITHDRAW", hyperliquidData: { action: "WITHDRAW_WALLET", to, amount } }],
            ...options,
        });
    }
    // --- Morpho ---
    async morphoSupply(safeAddress, params, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "MORPHO_SUPPLY", ...params }],
            ...options,
        });
    }
    async morphoWithdraw(safeAddress, params, options) {
        return this.prepareSafeOperations({
            safeAddress,
            operations: [{ type: "MORPHO_WITHDRAW", ...params }],
            ...options,
        });
    }
    // --- DevTools ---
    createDevToolsClient(config) {
        return new IbexDevToolsClient({
            apiBaseUrl: config.apiBaseUrl ?? this.apiBaseUrl,
            fetchImpl: this.fetchImpl,
            ...config,
        });
    }
    // --- Realtime (WebSocket) ---
    createRealtimeClient(options) {
        return new IbexRealtimeClient({
            apiBaseUrl: this.apiBaseUrl,
            blockchainId: options?.blockchainId ?? this.blockchainId,
            clientName: options?.clientName,
            getToken: () => this.getStoredToken(),
            onTokenExpired: () => {
                this.refreshSession().catch(() => {
                    this.clearSessionAndScopedStorage();
                });
            },
            reconnect: options?.reconnect,
            wsImpl: options?.wsImpl,
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
        const rpId = this.resolveRpId();
        const headers = {
            "X-IBEx-Auth": `Bearer ${accessToken}`,
            "Authorization": `Bearer ${accessToken}`,
            "X-Rp-Id": rpId,
            "X-RpId": rpId,
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
