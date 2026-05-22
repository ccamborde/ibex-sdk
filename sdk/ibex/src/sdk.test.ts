import { describe, expect, it, vi } from "vitest";

import { IBEX_EXTERNAL_USER_ID_KEY, IBEX_REFRESH_TOKEN_KEY, IBEX_TOKEN_KEY, createIbexSdk } from "./sdk";
import type { IbexSdkStorage } from "./types";

class MemoryStorage implements IbexSdkStorage {
  private readonly map = new Map<string, string>();

  get(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  remove(key: string): void {
    this.map.delete(key);
  }

  keys(): string[] {
    return Array.from(this.map.keys());
  }
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("IbexSdk users/me endpoints", () => {
  it("builds balances URL and sends auth headers", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(200, { type: "crypto", balance: { tokens: [] } }),
    );
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getMeBalances({
      walletAddress: "0xabc",
      includeZero: true,
      includePrices: false,
      page: 2,
      limit: 25,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/balances?walletAddress=0xabc&includeZero=true&includePrices=false&page=2&limit=25",
    );
    expect(init?.method).toBe("GET");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer access-123");
    expect((init?.headers as Record<string, string>)["X-IBEx-Auth"]).toBe("Bearer access-123");
  });

  it("builds transactions URL with extended query parameters", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { data: [], total: 0 }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getMeTransactions({
      walletAddress: "0xdef",
      iban: "FR76...",
      scope: "mixed",
      blockchainId: 421614,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      direction: "IN",
      tokenType: "ERC20",
      tokenAddress: "0x123",
      hash: "0xabc",
      page: 1,
      limit: 10,
      includePrices: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/transactions?walletAddress=0xdef&iban=FR76...&scope=mixed&blockchainId=421614&startDate=2026-01-01&endDate=2026-12-31&direction=IN&tokenType=ERC20&tokenAddress=0x123&hash=0xabc&page=1&limit=10&includePrices=true",
    );
    expect(init?.method).toBe("GET");
  });

  it("calls users/me/address and users/me/signers with auth headers", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { wallets: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { signers: [] }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getMeAddress();
    await sdk.getMeSigners();

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/address");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/signers");
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-123");
    expect(headers["X-IBEx-Auth"]).toBe("Bearer access-123");
  });

  it("builds tokens URL with optional blockchainId", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getMeTokens();
    await sdk.getMeTokens({ blockchainId: "421614" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/tokens");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/tokens?blockchainId=421614",
    );
  });

  it("builds lending URL with userScoped and blockchainId", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getMeLending();
    await sdk.getMeLending({ userScoped: true, blockchainId: "8453" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/lending");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/lending?userScoped=true&blockchainId=8453",
    );
  });

  it("builds chainTokens and vaults URLs with query parameters", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(200, []));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getChainTokens({ blockchainId: "421614" });
    await sdk.getVaults({ provider: "MORPHO", blockchainId: "8453" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/chain/tokens?blockchainId=421614",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/safes/vaults?provider=MORPHO&blockchainId=8453",
    );
  });

  it("refreshes token and retries when balances returns 401", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Unauthorized" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: "new-access",
          refresh_token: "new-refresh",
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { balance: { tokens: [{ symbol: "EURe" }] } }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "old-access", refreshToken: "old-refresh" }, "user-1");
    const result = await sdk.getMeBalances();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.wallets).toBeDefined();
    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer new-access");
    expect(sdk.getStoredToken()).toBe("new-access");
    expect(sdk.getStoredRefreshToken()).toBe("new-refresh");
  });

  it("clears session and throws explicit error when refresh fails", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Unauthorized" }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "old-access", refreshToken: "old-refresh" }, "user-42");
    storage.set("user-42_cached-data", "hello");

    await expect(sdk.getMeTransactions()).rejects.toThrow("Session IBEx expirée. Reconnectez votre compte.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(storage.get(IBEX_TOKEN_KEY)).toBeNull();
    expect(storage.get(IBEX_REFRESH_TOKEN_KEY)).toBeNull();
    expect(storage.get(IBEX_EXTERNAL_USER_ID_KEY)).toBeNull();
    expect(storage.get("user-42_cached-data")).toBeNull();
  });

  it("calls validateSms and confirmSms with correct URLs and bodies", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, { smsVerified: true, telephone: "+33612345678" }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.validateSms({ telephone: "+33612345678", externalUserId: "user-1", phonePolicy: "frMobile" });
    await sdk.confirmSms({ telephone: "+33612345678", code: "123456", externalUserId: "user-1" });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/validate-sms");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    const body0 = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body0.telephone).toBe("+33612345678");
    expect(body0.phonePolicy).toBe("frMobile");

    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/confirm-sms");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    const body1 = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(body1.code).toBe("123456");
  });
});

describe("IbexSdk SMS authentication (wallet=sms)", () => {
  const resolveRpId = () => "localhost";

  it("signUpWithSms sends POST with wallet=sms and persists session", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(200, {
        access_token: "sms-access-token",
        refresh_token: "sms-refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
        authMethod: "SMS",
        hasPasskey: false,
        wallet: "sms",
        externalUserId: "user-sms-1",
        subject: "user-sms-1",
        sessionId: "sess-123",
        chatbotFullURL: "https://safe-testnet.ib.exchange/chatbot/?session=sess-123",
        code: "654321",
      }),
    );
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
      resolveRpId,
    });

    const result = await sdk.signUpWithSms({ telephone: "+33612345678", phonePolicy: "frMobile" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://passkeys-testnet.ibex.fi/v1.2/auth/sign-up");
    expect(opts?.method).toBe("POST");
    const body = JSON.parse(opts?.body as string);
    expect(body.wallet).toBe("sms");
    expect(body.telephone).toBe("+33612345678");
    expect(body.phonePolicy).toBe("frMobile");

    expect(result.authMethod).toBe("SMS");
    expect(result.code).toBe("654321");
    expect(storage.get(IBEX_TOKEN_KEY)).toBe("sms-access-token");
    expect(storage.get(IBEX_REFRESH_TOKEN_KEY)).toBe("sms-refresh-token");
    expect(storage.get(IBEX_EXTERNAL_USER_ID_KEY)).toBe("user-sms-1");
  });

  it("signUpWithSms sends KYB fields when provided", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(200, {
        access_token: "kyb-access",
        refresh_token: "kyb-refresh",
        authMethod: "SMS",
        wallet: "sms",
        subject: "company-1",
      }),
    );
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
      resolveRpId,
    });

    await sdk.signUpWithSms({
      telephone: "+33612345678",
      email: "contact@company.fr",
      companyRegistrationNumber: "123456789",
    });

    const body = JSON.parse(fetchMock.mock.calls[0]![1]?.body as string);
    expect(body.wallet).toBe("sms");
    expect(body.email).toBe("contact@company.fr");
    expect(body.companyRegistrationNumber).toBe("123456789");
  });

  it("signInWithSms triggers OTP via GET with query params", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(200, { wallet: "sms", code: "123456" }),
    );
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
      resolveRpId,
    });

    const result = await sdk.signInWithSms({ telephone: "+33612345678", phonePolicy: "frMobile" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0]!;
    const urlStr = String(url);
    expect(urlStr).toContain("/v1.2/auth/sign-in?");
    expect(urlStr).toContain("wallet=sms");
    expect(urlStr).toContain("telephone=%2B33612345678");
    expect(urlStr).toContain("phonePolicy=frMobile");
    expect(opts?.method).toBe("GET");
    expect(result.wallet).toBe("sms");
    expect(result.code).toBe("123456");
  });

  it("confirmSmsSignIn sends POST and persists session", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(200, {
        access_token: "confirmed-access",
        refresh_token: "confirmed-refresh",
        token_type: "Bearer",
        expires_in: 3600,
        authMethod: "SMS",
        subject: "user-sms-2",
      }),
    );
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
      resolveRpId,
    });

    const tokens = await sdk.confirmSmsSignIn({ telephone: "+33612345678", code: "123456" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://passkeys-testnet.ibex.fi/v1.2/auth/sign-in");
    expect(opts?.method).toBe("POST");
    const body = JSON.parse(opts?.body as string);
    expect(body.wallet).toBe("sms");
    expect(body.telephone).toBe("+33612345678");
    expect(body.code).toBe("123456");

    expect(tokens.accessToken).toBe("confirmed-access");
    expect(tokens.refreshToken).toBe("confirmed-refresh");
    expect(storage.get(IBEX_TOKEN_KEY)).toBe("confirmed-access");
    expect(storage.get(IBEX_REFRESH_TOKEN_KEY)).toBe("confirmed-refresh");
    expect(storage.get(IBEX_EXTERNAL_USER_ID_KEY)).toBe("user-sms-2");
  });

  it("confirmSmsSignIn throws when no access_token in response", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      jsonResponse(200, { error: "invalid_code" }),
    );
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
      resolveRpId,
    });

    await expect(
      sdk.confirmSmsSignIn({ telephone: "+33612345678", code: "000000" }),
    ).rejects.toThrow("JWT IBEx introuvable dans la réponse SMS sign-in");
  });
});

describe("IbexSdk address book endpoints", () => {
  it("calls list/create/update/delete entry endpoints", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "entry-1" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "entry-1", name: "Alice" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "entry-1", deleted: true } }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getMeAddressBook();
    await sdk.createMeAddressBookEntry({ name: "Alice", label: "Friend" });
    await sdk.updateMeAddressBookEntry("entry-1", { name: "Alice Smith", userValidated: true });
    await sdk.deleteMeAddressBookEntry("entry-1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/addressbook");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/addressbook");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/addressbook/entry-1");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("PUT");
    expect(String(fetchMock.mock.calls[3]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/addressbook/entry-1");
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("DELETE");
  });

  it("requires iban and respondingPspBic together on create entry", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { success: true, data: { id: "entry-1" } }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await expect(
      sdk.createMeAddressBookEntry({
        name: "Alice",
        iban: "FR7616748000011234037943644",
      }),
    ).rejects.toThrow("`iban` and `respondingPspBic` must be provided together.");

    await expect(
      sdk.createMeAddressBookEntry({
        name: "Alice",
        respondingPspBic: "AGRIFRPPXXX",
      }),
    ).rejects.toThrow("`iban` and `respondingPspBic` must be provided together.");

    await sdk.createMeAddressBookEntry({
      name: "Alice",
      iban: "FR7616748000011234037943644",
      respondingPspBic: "AGRIFRPPXXX",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("calls crypto and iban delete endpoints with encoded path params", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "entry-1" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "entry-1" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "entry-1" } }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.addMeAddressBookCrypto("entry-1", { chainId: 42161, address: "0xAbc123" });
    await sdk.deleteMeAddressBookCrypto("entry-1", 42161, "0xAbc/123");
    await sdk.deleteMeAddressBookIban("entry-1", "FR76 1234/5678");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/addressbook/entry-1/crypto",
    );
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/addressbook/entry-1/crypto/42161/0xAbc%2F123",
    );
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("DELETE");
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/addressbook/entry-1/ibans/FR76%201234%2F5678",
    );
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("DELETE");
  });
});

describe("IbexSdk SEPA endpoints", () => {
  it("calls add and list IBAN endpoints with auth headers", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: 42, iban: "FR76..." } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [{ id: 42, iban: "FR76..." }] }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.addSepaIban({ holderName: "Alice Martin", safeAddress: "0xabc", blockchainId: 100 });
    await sdk.getSepaIbans();

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/sepa/iban/add");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/sepa/iban");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("GET");
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-123");
    expect(headers["X-IBEx-Auth"]).toBe("Bearer access-123");
  });

  it("calls payment intent and confirm endpoints", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: {
            approvalId: "approval-1",
            credentialRequestOptions: { challenge: "challenge" },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          data: { approvalId: "approval-1", payment: { success: true } },
        }),
      );
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.createSepaPaymentIntent({
      reference: "PAY-2026-001",
      channel: "SEPAINSTANT",
      amount: "150.00",
      currency: "EUR",
      remittanceInfo: "Invoice 2026-001",
      debtor: { name: "John Doe", iban: "FR7616748000014468183681821" },
      creditor: { name: "Jane Smith", iban: "FR7616748000011234037943644" },
    });
    await sdk.confirmSepaPayment({
      approvalId: "approval-1",
      credential: { id: "credential-id", type: "public-key" },
    });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/sepa/payments");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/sepa/payments");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("PUT");
  });

  it("builds sepa transactions URLs with filters and id", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [], pagination: { total: 0 } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "tx/1" } }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getSepaTransactions({
      iban: "FR76...",
      type: "SEPA_OUT",
      status: "completed",
      statusCode: "DONE",
      search: "alice",
      page: 2,
      limit: 50,
    });
    await sdk.getSepaTransactionById("tx/1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/sepa/transactions?iban=FR76...&type=SEPA_OUT&status=completed&statusCode=DONE&search=alice&page=2&limit=50",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/sepa/transactions/tx%2F1");
  });

  it("calls sepa mandates endpoints with expected methods and encoded ids", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "mandate-1", status: "validated" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "mandate/1", status: "validated" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "mandate/1", status: "suspended" } }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { id: "mandate/1", status: "cancelled" } }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.createSepaMandate({
      sourceIban: "FR7615589275690931505605139",
      destinationIban: "FR7616748000011234037943644",
      destinationName: "Jean Dupont",
      destinationBic: "AGRIFRPPXXX",
      percent: 25,
      trigger: {
        mode: "whitelist",
        whitelistRules: [{ kind: "senderIban", operator: "in", values: ["FR7616748000014468183681821"] }],
      },
      signature: {
        message: "IBEX_SEPA_MANDATE_V1 ...",
        signature: "0xabcdef",
        safeOperationUserOpHash: "0x1234",
      },
    });
    await sdk.getSepaMandates();
    await sdk.getSepaMandateById("mandate/1");
    await sdk.updateSepaMandateStatus("mandate/1", { status: "suspended" });
    await sdk.cancelSepaMandate("mandate/1");

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/sepa/mandates");
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/sepa/mandates");
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe("GET");
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/sepa/mandates/mandate%2F1");
    expect(fetchMock.mock.calls[2]?.[1]?.method).toBe("GET");
    expect(String(fetchMock.mock.calls[3]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/sepa/mandates/mandate%2F1/status",
    );
    expect(fetchMock.mock.calls[3]?.[1]?.method).toBe("PATCH");
    expect(String(fetchMock.mock.calls[4]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/sepa/mandates/mandate%2F1/cancel",
    );
    expect(fetchMock.mock.calls[4]?.[1]?.method).toBe("POST");
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer access-123");
    expect(headers["X-IBEx-Auth"]).toBe("Bearer access-123");
  });

  it("refreshes and retries when sepa endpoint returns 401", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(401, { detail: "Unauthorized" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: "new-access",
          refresh_token: "new-refresh",
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: [] }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "old-access", refreshToken: "old-refresh" }, "user-1");
    await sdk.getSepaIbans();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryHeaders = fetchMock.mock.calls[2]?.[1]?.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe("Bearer new-access");
    expect(sdk.getStoredToken()).toBe("new-access");
    expect(sdk.getStoredRefreshToken()).toBe("new-refresh");
  });
});
