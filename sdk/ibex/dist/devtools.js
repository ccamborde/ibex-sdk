export class IbexDevToolsClient {
    apiBaseUrl;
    fetchImpl;
    authHeaders;
    defaultHeaders;
    constructor(config) {
        this.apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, "");
        this.fetchImpl = config.fetchImpl || fetch.bind(globalThis);
        this.defaultHeaders = config.defaultHeaders || {};
        const rpId = config.rpId || "localhost";
        const rpIdHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
        if (config.apiKey) {
            this.authHeaders = { "x-api-key": config.apiKey, ...rpIdHeaders };
        }
        else if (config.basicAuth) {
            const encoded = btoa(`${config.basicAuth.username}:${config.basicAuth.password}`);
            this.authHeaders = { Authorization: `Basic ${encoded}`, ...rpIdHeaders };
        }
        else {
            this.authHeaders = rpIdHeaders;
        }
    }
    // ---------------------------------------------------------------------------
    // KY
    // ---------------------------------------------------------------------------
    async kyList(query = {}) {
        const path = this.buildPathWithQuery("/api/admin/devtools/ky/list", query);
        return (await this.jsonFetch(path));
    }
    async kyGetState(externalUserId) {
        const encoded = encodeURIComponent(externalUserId);
        return (await this.jsonFetch(`/api/admin/devtools/ky/state/${encoded}`));
    }
    async kySetState(input) {
        return (await this.jsonFetch("/api/admin/devtools/ky/state", {
            method: "POST",
            body: input,
        }));
    }
    async kyEnroll(input) {
        return (await this.jsonFetch("/api/admin/devtools/ky/enroll", {
            method: "POST",
            body: input,
        }));
    }
    async kybEnroll(input) {
        return (await this.jsonFetch("/api/admin/devtools/kyb/enroll", {
            method: "POST",
            body: input,
        }));
    }
    async kySmsVerified(input) {
        return (await this.jsonFetch("/api/admin/devtools/ky/sms-verified", {
            method: "POST",
            body: input,
        }));
    }
    // ---------------------------------------------------------------------------
    // Company
    // ---------------------------------------------------------------------------
    async companyCheck(input) {
        const path = this.buildPathWithQuery("/v1.2/domain/company/check", input);
        return (await this.jsonFetch(path));
    }
    async companyCheckPeppol(input) {
        const path = this.buildPathWithQuery("/v1.2/domain/company/check/peppol", input);
        return (await this.jsonFetch(path));
    }
    // ---------------------------------------------------------------------------
    // Domain Users
    // ---------------------------------------------------------------------------
    async domainUsers(query = {}) {
        const path = this.buildPathWithQuery("/v1.2/domain/users", query);
        return (await this.jsonFetch(path));
    }
    async domainUserById(externalUserId) {
        const encoded = encodeURIComponent(externalUserId);
        return (await this.jsonFetch(`/v1.2/domain/users/${encoded}`));
    }
    // ---------------------------------------------------------------------------
    // Faucet
    // ---------------------------------------------------------------------------
    async sepaTopup(input) {
        return (await this.jsonFetch("/api/admin/devtools/sepa/topup", {
            method: "POST",
            body: input,
        }));
    }
    async cryptoTopup(input) {
        return (await this.jsonFetch("/api/admin/devtools/crypto/topup", {
            method: "POST",
            body: input,
        }));
    }
    // ---------------------------------------------------------------------------
    // HTTP internals
    // ---------------------------------------------------------------------------
    async jsonFetch(path, options = {}) {
        const method = options.method || "GET";
        const headers = {
            ...this.defaultHeaders,
            ...this.authHeaders,
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
        return payload;
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
}
export function createIbexDevToolsClient(config) {
    return new IbexDevToolsClient(config);
}
