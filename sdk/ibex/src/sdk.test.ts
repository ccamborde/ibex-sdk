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

  it("builds transactions URL with query parameters", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { data: [], total: 0 }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getMeTransactions({ walletAddress: "0xdef", page: 1, limit: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/transactions?walletAddress=0xdef&page=1&limit=10",
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

  it("builds pools and lending URLs with query parameters", async () => {
    const storage = new MemoryStorage();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { data: [] }));
    const sdk = createIbexSdk({
      apiBaseUrl: "https://passkeys-testnet.ibex.fi",
      fetchImpl: fetchMock,
      storage,
    });

    sdk.setSession({ accessToken: "access-123", refreshToken: "refresh-123" }, null);
    await sdk.getMeTokens();
    await sdk.getMePools({ walletAddress: "0xaaa", page: 2, limit: 5 });
    await sdk.getMeLending({ walletAddress: "0xbbb", page: 1, limit: 15 });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://passkeys-testnet.ibex.fi/v1.2/users/me/tokens");
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/pools?walletAddress=0xaaa&page=2&limit=5",
    );
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe(
      "https://passkeys-testnet.ibex.fi/v1.2/users/me/lending?walletAddress=0xbbb&page=1&limit=15",
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
    expect(result.balance?.tokens?.[0]?.symbol).toBe("EURe");
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
