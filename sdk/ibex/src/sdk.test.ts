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
