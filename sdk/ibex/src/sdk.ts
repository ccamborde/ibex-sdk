import { browserStorage } from "./storage";
import type {
  IbexAddAddressBookCryptoInput,
  IbexAddressBookEntryResponse,
  IbexAddressBookListResponse,
  IbexBalancesQuery,
  IbexCreateAddressBookEntryInput,
  IbexHttpError,
  IbexHttpMeta,
  IbexRefreshDetails,
  IbexSafeEnableRecoveryOperation,
  IbexSafeExecuteRequest,
  IbexSafeExecuteResponse,
  IbexSafeOperationsRequest,
  IbexSafePrepareResponse,
  IbexSepaAddIbanRequest,
  IbexSepaAddIbanResponse,
  IbexSepaCancelMandateResponse,
  IbexSepaConfirmPaymentRequest,
  IbexSepaConfirmPaymentResponse,
  IbexSepaCreateMandateRequest,
  IbexSepaCreateMandateResponse,
  IbexSepaCreatePaymentIntentRequest,
  IbexSepaCreatePaymentIntentResponse,
  IbexSepaIbansResponse,
  IbexSepaMandateDetailResponse,
  IbexSepaMandatesResponse,
  IbexSepaTransactionDetailResponse,
  IbexSepaTransactionsQuery,
  IbexSepaTransactionsResponse,
  IbexSepaUpdateMandateStatusRequest,
  IbexSepaUpdateMandateStatusResponse,
  IbexSdkConfig,
  IbexSdkStorage,
  IbexTokens,
  IbexTransactionsQuery,
  IbexUserAddressResponse,
  IbexUserBalancesResponse,
  IbexUserLendingResponse,
  IbexUserPoolsResponse,
  IbexUserProfile,
  IbexUserResourceQuery,
  IbexUserSignersResponse,
  IbexUserTokensResponse,
  IbexUserTransactionsResponse,
  IbexUpdateAddressBookEntryInput,
  JsonObject,
} from "./types";
import {
  defaultResolveRpId,
  extractAuthTokens,
  extractExternalUserId,
  isAuthStatusError,
  normalizeSignInOptions,
  normalizeSignUpOptions,
  normalizeUsersMePayload,
  serializeAssertion,
  serializeAttestation,
} from "./utils";

export const IBEX_TOKEN_KEY = "klarenfr_ibex_jwt";
export const IBEX_REFRESH_TOKEN_KEY = "klarenfr_ibex_refresh_token";
export const IBEX_EXTERNAL_USER_ID_KEY = "klarenfr_ibex_external_user_id";
export const IBEX_SESSION_CHANGED_EVENT = "klarenfr_ibex_session_changed";

type JsonRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
};

export class IbexSdk {
  private readonly apiBaseUrl: string;
  private readonly storage: IbexSdkStorage;
  private readonly fetchImpl: typeof fetch;
  private readonly blockchainId: string | undefined;
  private readonly defaultHeaders: Record<string, string>;
  private readonly resolveRpIdFn: (hostname?: string) => string;
  private readonly keyToken: string;
  private readonly keyRefreshToken: string;
  private readonly keyExternalUserId: string;

  constructor(config: IbexSdkConfig) {
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

  resolveRpId(hostname?: string): string {
    return this.resolveRpIdFn(hostname);
  }

  getStoredToken(): string | null {
    return this.storage.get(this.keyToken);
  }

  getStoredRefreshToken(): string | null {
    return this.storage.get(this.keyRefreshToken);
  }

  getStoredExternalUserId(): string | null {
    return this.storage.get(this.keyExternalUserId);
  }

  setSession(tokens: IbexTokens, externalUserId: string | null = null): void {
    this.storage.set(this.keyToken, tokens.accessToken);
    if (tokens.refreshToken) this.storage.set(this.keyRefreshToken, tokens.refreshToken);
    else this.storage.remove(this.keyRefreshToken);
    if (externalUserId) this.storage.set(this.keyExternalUserId, externalUserId);
    else this.storage.remove(this.keyExternalUserId);
    this.dispatchSessionChanged();
  }

  clearSessionAndScopedStorage(): void {
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

  async authenticateWithPasskey(): Promise<IbexTokens> {
    const rpId = this.resolveRpId();
    const rpHeaders = { "X-Rp-Id": rpId, "X-RpId": rpId };
    let tokens: IbexTokens | null = null;

    try {
      const signInOptionsPayload = await this.jsonFetch("/v1.2/auth/sign-in", {
        method: "GET",
        headers: rpHeaders,
      });
      const signInOptions = normalizeSignInOptions(signInOptionsPayload);
      const assertion = (await navigator.credentials.get({
        publicKey: signInOptions,
      })) as PublicKeyCredential | null;
      if (!assertion) throw new Error("Aucune assertion WebAuthn retournée");

      const signInPayload = await this.jsonFetch("/v1.2/auth/sign-in", {
        method: "POST",
        headers: rpHeaders,
        body: { credential: serializeAssertion(assertion) },
      });
      tokens = extractAuthTokens(signInPayload);
    } catch {
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
      })) as PublicKeyCredential | null;
      if (!attestation) throw new Error("Aucune attestation WebAuthn retournée");

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

  async refreshSession(): Promise<string> {
    const details = await this.refreshSessionDetailed();
    return details.tokens.accessToken;
  }

  async refreshSessionDetailed(): Promise<IbexRefreshDetails> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) throw new Error("Refresh token IBEx manquant");
    const path = "/v1.2/auth/refresh";
    const requestBody: JsonObject = { refresh_token: refreshToken };
    let meta: IbexHttpMeta;
    try {
      meta = await this.jsonFetchWithMeta(path, {
        method: "POST",
        body: requestBody,
      });
    } catch (error) {
      const enriched = error as IbexHttpError;
      enriched.requestBody = requestBody;
      enriched.path = path;
      throw enriched;
    }

    const tokens = extractAuthTokens(meta.payload);
    if (!tokens?.accessToken) throw new Error("Réponse refresh IBEx invalide");
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

  async withRefreshOnUnauthorized<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
    const accessToken = this.getStoredToken();
    if (!accessToken) throw new Error("Session IBEx absente");
    try {
      return await operation(accessToken);
    } catch (error) {
      if (!isAuthStatusError(error)) throw error;
      try {
        const refreshed = await this.refreshSession();
        return await operation(refreshed);
      } catch {
        this.clearSessionAndScopedStorage();
        throw new Error("Session IBEx expirée. Reconnectez votre compte.");
      }
    }
  }

  async getMe(): Promise<IbexUserProfile> {
    const profile = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/users/me", token, {
        method: "GET",
      }),
    );
    const normalized = normalizeUsersMePayload(profile);
    const externalUserId = extractExternalUserId(normalized);
    if (externalUserId) this.storage.set(this.keyExternalUserId, externalUserId);
    return normalized;
  }

  async updateMeData(data: JsonObject): Promise<IbexUserProfile> {
    const updated = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/users/me", token, {
        method: "POST",
        body: { data },
      }),
    );
    const normalized = normalizeUsersMePayload(updated);
    const externalUserId = extractExternalUserId(normalized);
    if (externalUserId) this.storage.set(this.keyExternalUserId, externalUserId);
    return normalized;
  }

  async setAlertFlag(alertKey: string, enabled: boolean): Promise<IbexUserProfile> {
    return this.updateMeData({ [alertKey]: enabled });
  }

  async removeAlertFlag(alertKey: string): Promise<IbexUserProfile> {
    return this.updateMeData({ [alertKey]: null });
  }

  async getMeBalances(query: IbexBalancesQuery = {}): Promise<IbexUserBalancesResponse> {
    const path = this.buildPathWithQuery("/v1.2/users/me/balances", query as JsonObject);
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(path, token, { method: "GET" }),
    );
    return payload as IbexUserBalancesResponse;
  }

  async getMeTransactions(query: IbexTransactionsQuery = {}): Promise<IbexUserTransactionsResponse> {
    const path = this.buildPathWithQuery("/v1.2/users/me/transactions", query as JsonObject);
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(path, token, { method: "GET" }),
    );
    return payload as IbexUserTransactionsResponse;
  }

  async getMeAddress(): Promise<IbexUserAddressResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/users/me/address", token, { method: "GET" }),
    );
    return payload as IbexUserAddressResponse;
  }

  async getMeSigners(): Promise<IbexUserSignersResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/users/me/signers", token, { method: "GET" }),
    );
    return payload as IbexUserSignersResponse;
  }

  async getMeTokens(): Promise<IbexUserTokensResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/users/me/tokens", token, { method: "GET" }),
    );
    return payload as IbexUserTokensResponse;
  }

  async getMePools(query: IbexUserResourceQuery = {}): Promise<IbexUserPoolsResponse> {
    const path = this.buildPathWithQuery("/v1.2/users/me/pools", query as JsonObject);
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(path, token, { method: "GET" }),
    );
    return payload as IbexUserPoolsResponse;
  }

  async getMeLending(query: IbexUserResourceQuery = {}): Promise<IbexUserLendingResponse> {
    const path = this.buildPathWithQuery("/v1.2/users/me/lending", query as JsonObject);
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(path, token, { method: "GET" }),
    );
    return payload as IbexUserLendingResponse;
  }

  async getMeAddressBook(): Promise<IbexAddressBookListResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/users/me/addressbook", token, { method: "GET" }),
    );
    return payload as IbexAddressBookListResponse;
  }

  async createMeAddressBookEntry(input: IbexCreateAddressBookEntryInput): Promise<IbexAddressBookEntryResponse> {
    const hasIban = typeof input.iban === "string" && input.iban.trim().length > 0;
    const hasRespondingPspBic = typeof input.respondingPspBic === "string" && input.respondingPspBic.trim().length > 0;
    if (hasIban !== hasRespondingPspBic) {
      throw new Error("When creating an address book entry, `iban` and `respondingPspBic` must be provided together.");
    }
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/users/me/addressbook", token, {
        method: "POST",
        body: input,
      }),
    );
    return payload as IbexAddressBookEntryResponse;
  }

  async updateMeAddressBookEntry(id: string, input: IbexUpdateAddressBookEntryInput): Promise<IbexAddressBookEntryResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(`/v1.2/users/me/addressbook/${encodeURIComponent(id)}`, token, {
        method: "PUT",
        body: input,
      }),
    );
    return payload as IbexAddressBookEntryResponse;
  }

  async deleteMeAddressBookEntry(id: string): Promise<IbexAddressBookEntryResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(`/v1.2/users/me/addressbook/${encodeURIComponent(id)}`, token, { method: "DELETE" }),
    );
    return payload as IbexAddressBookEntryResponse;
  }

  async addMeAddressBookCrypto(id: string, input: IbexAddAddressBookCryptoInput): Promise<IbexAddressBookEntryResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(`/v1.2/users/me/addressbook/${encodeURIComponent(id)}/crypto`, token, {
        method: "POST",
        body: input,
      }),
    );
    return payload as IbexAddressBookEntryResponse;
  }

  async deleteMeAddressBookCrypto(id: string, chainId: string | number, address: string): Promise<IbexAddressBookEntryResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(
        `/v1.2/users/me/addressbook/${encodeURIComponent(id)}/crypto/${encodeURIComponent(String(chainId))}/${encodeURIComponent(address)}`,
        token,
        { method: "DELETE" },
      ),
    );
    return payload as IbexAddressBookEntryResponse;
  }

  async deleteMeAddressBookIban(id: string, iban: string): Promise<IbexAddressBookEntryResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(
        `/v1.2/users/me/addressbook/${encodeURIComponent(id)}/ibans/${encodeURIComponent(iban)}`,
        token,
        { method: "DELETE" },
      ),
    );
    return payload as IbexAddressBookEntryResponse;
  }

  async addSepaIban(payload: IbexSepaAddIbanRequest): Promise<IbexSepaAddIbanResponse> {
    const response = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/sepa/iban/add", token, {
        method: "POST",
        body: payload,
      }),
    );
    return response as IbexSepaAddIbanResponse;
  }

  async getSepaIbans(): Promise<IbexSepaIbansResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/sepa/iban", token, { method: "GET" }),
    );
    return payload as IbexSepaIbansResponse;
  }

  async createSepaPaymentIntent(
    payload: IbexSepaCreatePaymentIntentRequest,
  ): Promise<IbexSepaCreatePaymentIntentResponse> {
    const response = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/sepa/payments", token, {
        method: "POST",
        body: payload,
      }),
    );
    return response as IbexSepaCreatePaymentIntentResponse;
  }

  async confirmSepaPayment(payload: IbexSepaConfirmPaymentRequest): Promise<IbexSepaConfirmPaymentResponse> {
    const response = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/sepa/payments", token, {
        method: "PUT",
        body: payload,
      }),
    );
    return response as IbexSepaConfirmPaymentResponse;
  }

  async getSepaTransactions(query: IbexSepaTransactionsQuery = {}): Promise<IbexSepaTransactionsResponse> {
    const path = this.buildPathWithQuery("/v1.2/sepa/transactions", query as JsonObject);
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(path, token, { method: "GET" }),
    );
    return payload as IbexSepaTransactionsResponse;
  }

  async getSepaTransactionById(id: string): Promise<IbexSepaTransactionDetailResponse> {
    const normalizedId = encodeURIComponent(id);
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(`/v1.2/sepa/transactions/${normalizedId}`, token, { method: "GET" }),
    );
    return payload as IbexSepaTransactionDetailResponse;
  }

  async createSepaMandate(payload: IbexSepaCreateMandateRequest): Promise<IbexSepaCreateMandateResponse> {
    const response = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/sepa/mandates", token, {
        method: "POST",
        body: payload,
      }),
    );
    return response as IbexSepaCreateMandateResponse;
  }

  async getSepaMandates(): Promise<IbexSepaMandatesResponse> {
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/sepa/mandates", token, { method: "GET" }),
    );
    return payload as IbexSepaMandatesResponse;
  }

  async getSepaMandateById(id: string): Promise<IbexSepaMandateDetailResponse> {
    const normalizedId = encodeURIComponent(id);
    const payload = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(`/v1.2/sepa/mandates/${normalizedId}`, token, { method: "GET" }),
    );
    return payload as IbexSepaMandateDetailResponse;
  }

  async updateSepaMandateStatus(
    id: string,
    payload: IbexSepaUpdateMandateStatusRequest,
  ): Promise<IbexSepaUpdateMandateStatusResponse> {
    const normalizedId = encodeURIComponent(id);
    const response = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(`/v1.2/sepa/mandates/${normalizedId}/status`, token, {
        method: "PATCH",
        body: payload,
      }),
    );
    return response as IbexSepaUpdateMandateStatusResponse;
  }

  async cancelSepaMandate(id: string): Promise<IbexSepaCancelMandateResponse> {
    const normalizedId = encodeURIComponent(id);
    const response = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch(`/v1.2/sepa/mandates/${normalizedId}/cancel`, token, {
        method: "POST",
      }),
    );
    return response as IbexSepaCancelMandateResponse;
  }

  // --- Safe Operations ---

  async prepareSafeOperations(request: IbexSafeOperationsRequest): Promise<IbexSafePrepareResponse> {
    const response = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/safes/operations", token, {
        method: "POST",
        body: request,
      }),
    );
    return response as IbexSafePrepareResponse;
  }

  async executeSafeOperations(request: IbexSafeExecuteRequest): Promise<IbexSafeExecuteResponse> {
    const response = await this.withRefreshOnUnauthorized(async (token) =>
      this.authenticatedJsonFetch("/v1.2/safes/operations", token, {
        method: "PUT",
        body: request,
      }),
    );
    return response as IbexSafeExecuteResponse;
  }

  async signMessage(
    safeAddress: string,
    message: string,
    options?: { chainId?: number; walletMode?: IbexSafeOperationsRequest["walletMode"]; eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"] },
  ): Promise<IbexSafePrepareResponse> {
    return this.prepareSafeOperations({
      safeAddress,
      operations: [{ type: "SIGN_MESSAGE", message }],
      ...options,
    });
  }

  async enableRecovery(
    safeAddress: string,
    identity: Omit<IbexSafeEnableRecoveryOperation, "type">,
    options?: { chainId?: number; walletMode?: IbexSafeOperationsRequest["walletMode"]; eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"] },
  ): Promise<IbexSafePrepareResponse> {
    return this.prepareSafeOperations({
      safeAddress,
      operations: [{ type: "ENABLE_RECOVERY", ...identity }],
      ...options,
    });
  }

  async cancelRecovery(
    safeAddress: string,
    options?: { chainId?: number; walletMode?: IbexSafeOperationsRequest["walletMode"]; eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"] },
  ): Promise<IbexSafePrepareResponse> {
    return this.prepareSafeOperations({
      safeAddress,
      operations: [{ type: "CANCEL_RECOVERY" }],
      ...options,
    });
  }

  private async jsonFetch(path: string, options: JsonRequestOptions = {}): Promise<JsonObject> {
    const meta = await this.jsonFetchWithMeta(path, options);
    return meta.payload;
  }

  private async jsonFetchWithMeta(path: string, options: JsonRequestOptions = {}): Promise<IbexHttpMeta> {
    const method = options.method || "GET";
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
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
    return {
      payload,
      status: response.status,
      requestId,
      url,
    };
  }

  private async authenticatedJsonFetch(path: string, accessToken: string, options: JsonRequestOptions): Promise<JsonObject> {
    const headers = {
      "X-IBEx-Auth": `Bearer ${accessToken}`,
      "Authorization": `Bearer ${accessToken}`,
      ...(options.headers || {}),
    };
    return this.jsonFetch(path, { ...options, headers });
  }

  private withBlockchainHeader(headers: Record<string, string>): Record<string, string> {
    if (!this.blockchainId) return headers;
    return { ...headers, "X-Blockchain-Id": this.blockchainId };
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

  private dispatchSessionChanged(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(IBEX_SESSION_CHANGED_EVENT));
  }
}

export function createIbexSdk(config: IbexSdkConfig): IbexSdk {
  return new IbexSdk(config);
}
