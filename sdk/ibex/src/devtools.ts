import type {
  IbexDevToolsCompanyCheckInput,
  IbexDevToolsCompanyCheckPeppolResponse,
  IbexDevToolsCompanyCheckResponse,
  IbexDevToolsConfig,
  IbexDevToolsCryptoTopupInput,
  IbexDevToolsCryptoTopupResponse,
  IbexDevToolsKybEnrollInput,
  IbexDevToolsKybEnrollResponse,
  IbexDevToolsKyEnrollInput,
  IbexDevToolsKyEnrollResponse,
  IbexDevToolsKyListQuery,
  IbexDevToolsKyListResponse,
  IbexDevToolsKySetStateInput,
  IbexDevToolsKySetStateResponse,
  IbexDevToolsKySmsVerifiedInput,
  IbexDevToolsKySmsVerifiedResponse,
  IbexDevToolsKyStateResponse,
  IbexDevToolsSepaTopupInput,
  IbexDevToolsSepaTopupResponse,
  IbexHttpError,
  JsonObject,
} from "./types";

type JsonRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
};

export class IbexDevToolsClient {
  private readonly apiBaseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly authHeaders: Record<string, string>;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: IbexDevToolsConfig) {
    this.apiBaseUrl = config.apiBaseUrl.replace(/\/+$/, "");
    this.fetchImpl = config.fetchImpl || fetch.bind(globalThis);
    this.defaultHeaders = config.defaultHeaders || {};

    const rpId = config.rpId || "localhost";
    const rpIdHeaders: Record<string, string> = { "X-Rp-Id": rpId, "X-RpId": rpId };

    if (config.apiKey) {
      this.authHeaders = { "x-api-key": config.apiKey, ...rpIdHeaders };
    } else if (config.basicAuth) {
      const encoded = btoa(`${config.basicAuth.username}:${config.basicAuth.password}`);
      this.authHeaders = { Authorization: `Basic ${encoded}`, ...rpIdHeaders };
    } else {
      this.authHeaders = rpIdHeaders;
    }
  }

  // ---------------------------------------------------------------------------
  // KY
  // ---------------------------------------------------------------------------

  async kyList(query: IbexDevToolsKyListQuery = {}): Promise<IbexDevToolsKyListResponse> {
    const path = this.buildPathWithQuery("/api/admin/devtools/ky/list", query as JsonObject);
    return (await this.jsonFetch(path)) as unknown as IbexDevToolsKyListResponse;
  }

  async kyGetState(externalUserId: string): Promise<IbexDevToolsKyStateResponse> {
    const encoded = encodeURIComponent(externalUserId);
    return (await this.jsonFetch(`/api/admin/devtools/ky/state/${encoded}`)) as unknown as IbexDevToolsKyStateResponse;
  }

  async kySetState(input: IbexDevToolsKySetStateInput): Promise<IbexDevToolsKySetStateResponse> {
    return (await this.jsonFetch("/api/admin/devtools/ky/state", {
      method: "POST",
      body: input,
    })) as unknown as IbexDevToolsKySetStateResponse;
  }

  async kyEnroll(input: IbexDevToolsKyEnrollInput): Promise<IbexDevToolsKyEnrollResponse> {
    return (await this.jsonFetch("/api/admin/devtools/ky/enroll", {
      method: "POST",
      body: input,
    })) as unknown as IbexDevToolsKyEnrollResponse;
  }

  async kybEnroll(input: IbexDevToolsKybEnrollInput): Promise<IbexDevToolsKybEnrollResponse> {
    return (await this.jsonFetch("/api/admin/devtools/kyb/enroll", {
      method: "POST",
      body: input,
    })) as unknown as IbexDevToolsKybEnrollResponse;
  }

  async kySmsVerified(input: IbexDevToolsKySmsVerifiedInput): Promise<IbexDevToolsKySmsVerifiedResponse> {
    return (await this.jsonFetch("/api/admin/devtools/ky/sms-verified", {
      method: "POST",
      body: input,
    })) as unknown as IbexDevToolsKySmsVerifiedResponse;
  }

  // ---------------------------------------------------------------------------
  // Company
  // ---------------------------------------------------------------------------

  async companyCheck(input: IbexDevToolsCompanyCheckInput): Promise<IbexDevToolsCompanyCheckResponse> {
    const path = this.buildPathWithQuery("/v1.2/domain/company/check", input as JsonObject);
    return (await this.jsonFetch(path)) as unknown as IbexDevToolsCompanyCheckResponse;
  }

  async companyCheckPeppol(input: IbexDevToolsCompanyCheckInput): Promise<IbexDevToolsCompanyCheckPeppolResponse> {
    const path = this.buildPathWithQuery("/v1.2/domain/company/check/peppol", input as JsonObject);
    return (await this.jsonFetch(path)) as unknown as IbexDevToolsCompanyCheckPeppolResponse;
  }

  // ---------------------------------------------------------------------------
  // Faucet
  // ---------------------------------------------------------------------------

  async sepaTopup(input: IbexDevToolsSepaTopupInput): Promise<IbexDevToolsSepaTopupResponse> {
    return (await this.jsonFetch("/api/admin/devtools/sepa/topup", {
      method: "POST",
      body: input,
    })) as unknown as IbexDevToolsSepaTopupResponse;
  }

  async cryptoTopup(input: IbexDevToolsCryptoTopupInput): Promise<IbexDevToolsCryptoTopupResponse> {
    return (await this.jsonFetch("/api/admin/devtools/crypto/topup", {
      method: "POST",
      body: input,
    })) as unknown as IbexDevToolsCryptoTopupResponse;
  }

  // ---------------------------------------------------------------------------
  // HTTP internals
  // ---------------------------------------------------------------------------

  private async jsonFetch(path: string, options: JsonRequestOptions = {}): Promise<JsonObject> {
    const method = options.method || "GET";
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...this.authHeaders,
      ...(options.headers || {}),
    };
    const init: RequestInit = { method, headers };
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const url = this.buildUrl(path);
    const response = await this.fetchImpl(url, init);
    const payload = (await response.json().catch(() => ({}))) as JsonObject;
    const requestId = response.headers.get("x-request-id");
    if (!response.ok) {
      const detail =
        typeof payload.detail === "string"
          ? payload.detail
          : typeof payload.message === "string"
            ? payload.message
            : `Erreur ${response.status}`;
      const suffix = requestId ? ` (x-request-id: ${requestId})` : "";
      const error = new Error(`${detail}${suffix}`) as IbexHttpError;
      error.status = response.status;
      error.requestId = requestId;
      error.payload = payload;
      error.url = url;
      throw error;
    }
    return payload;
  }

  private buildUrl(path: string): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${this.apiBaseUrl}${normalized}`;
  }

  private buildPathWithQuery(path: string, query: JsonObject): string {
    const pairs = Object.entries(query).filter(([, value]) => value !== undefined && value !== null);
    if (pairs.length === 0) return path;
    const params = new URLSearchParams();
    pairs.forEach(([key, value]) => {
      params.set(key, String(value));
    });
    return `${path}?${params.toString()}`;
  }
}

export function createIbexDevToolsClient(config: IbexDevToolsConfig): IbexDevToolsClient {
  return new IbexDevToolsClient(config);
}
