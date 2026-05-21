import { describe, expect, it, vi } from "vitest";

import { createIbexDevToolsClient, IbexDevToolsClient } from "./devtools";

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const BASE = "https://passkeys-prat1.ibex.fi";

// ---------------------------------------------------------------------------
// Auth header modes
// ---------------------------------------------------------------------------

describe("IbexDevToolsClient auth modes", () => {
  it("sends x-api-key + rpId headers when apiKey is provided", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, apiKey: "key-123", rpId: "demo.ibex.fi", fetchImpl: fetchMock });

    await client.kyList();

    const [, init] = fetchMock.mock.calls[0]!;
    const h = init?.headers as Record<string, string>;
    expect(h["x-api-key"]).toBe("key-123");
    expect(h["X-Rp-Id"]).toBe("demo.ibex.fi");
    expect(h["X-RpId"]).toBe("demo.ibex.fi");
    expect(h.Authorization).toBeUndefined();
  });

  it("sends Basic auth header when basicAuth is provided", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, basicAuth: { username: "admin", password: "secret" }, fetchImpl: fetchMock });

    await client.kyList();

    const [, init] = fetchMock.mock.calls[0]!;
    const h = init?.headers as Record<string, string>;
    expect(h.Authorization).toBe(`Basic ${btoa("admin:secret")}`);
    expect(h["x-api-key"]).toBeUndefined();
  });

  it("sends rpId headers only (localhost bypass) when no apiKey/basicAuth", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, fetchImpl: fetchMock });

    await client.kyList();

    const [, init] = fetchMock.mock.calls[0]!;
    const h = init?.headers as Record<string, string>;
    expect(h["X-Rp-Id"]).toBe("localhost");
    expect(h["X-RpId"]).toBe("localhost");
    expect(h["x-api-key"]).toBeUndefined();
    expect(h.Authorization).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// KY endpoints
// ---------------------------------------------------------------------------

describe("IbexDevToolsClient KY endpoints", () => {
  function makeClient(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>): IbexDevToolsClient {
    return createIbexDevToolsClient({ apiBaseUrl: BASE, apiKey: "k", fetchImpl: fetchMock });
  }

  it("kyList builds correct URL with query params", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 2, limit: 50, totalPages: 0 }));
    const client = makeClient(fetchMock);

    await client.kyList({ page: 2, limit: 50 });

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/ky/list?page=2&limit=50`);
  });

  it("kyList builds URL without query when no params", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));
    const client = makeClient(fetchMock);

    await client.kyList();

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/ky/list`);
  });

  it("kyGetState URL-encodes externalUserId", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { state: "accepted", kyStateCode: "ACCEPTED" }));
    const client = makeClient(fetchMock);

    await client.kyGetState("user/special@id");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/ky/state/${encodeURIComponent("user/special@id")}`);
    expect(init?.method).toBe("GET");
  });

  it("kySetState sends POST with body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { success: true, fromStateId: 2, toStateId: 5 }));
    const client = makeClient(fetchMock);

    await client.kySetState({
      externalUserId: "u1",
      newStateId: 5,
      entityType: "individual",
      firstName: "John",
      lastName: "Doe",
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/ky/state`);
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.externalUserId).toBe("u1");
    expect(body.newStateId).toBe(5);
    expect(body.entityType).toBe("individual");
  });

  it("kyEnroll sends POST with body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { sessionId: "sess-1", chatbotURL: "https://chat" }));
    const client = makeClient(fetchMock);

    await client.kyEnroll({ externalUserId: "u1", language: "fr", email: "a@b.c" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/ky/enroll`);
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.externalUserId).toBe("u1");
    expect(body.language).toBe("fr");
  });

  it("kybEnroll sends POST with body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { sessionId: "sess-2", chatbotFullURL: "https://full" }));
    const client = makeClient(fetchMock);

    await client.kybEnroll({ externalUserId: "u1", email: "a@b.c", companyRegistrationNumber: "123456789" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/kyb/enroll`);
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.companyRegistrationNumber).toBe("123456789");
  });

  it("kySmsVerified sends POST with body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(200, { success: true, kyCustomerId: 42, smsVerifiedTelephone: "+33612345678", smsVerifiedAt: "2026-05-18T15:00:00.000Z" }),
    );
    const client = makeClient(fetchMock);

    await client.kySmsVerified({ externalUserId: "u1", smsVerifiedTelephone: "+33612345678" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/ky/sms-verified`);
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.smsVerifiedTelephone).toBe("+33612345678");
  });
});

// ---------------------------------------------------------------------------
// Company endpoint
// ---------------------------------------------------------------------------

describe("IbexDevToolsClient company endpoint", () => {
  it("companyCheck sends POST with siren", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { success: true, data: { result: "OK" } }));
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, apiKey: "k", fetchImpl: fetchMock });

    const result = await client.companyCheck({ siren: "123456789" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/company/check`);
    expect(init?.method).toBe("POST");
    expect(result.success).toBe(true);
    expect(result.data.result).toBe("OK");
  });
});

// ---------------------------------------------------------------------------
// Faucet endpoints
// ---------------------------------------------------------------------------

describe("IbexDevToolsClient faucet endpoints", () => {
  it("sepaTopup sends POST with body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(200, { success: true, data: { source: {}, identity: {}, payment: { success: true } } }),
    );
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, apiKey: "k", fetchImpl: fetchMock });

    await client.sepaTopup({ targetIban: "FR7630001...", amountEur: 10, channel: "SEPAINSTANT" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/sepa/topup`);
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.targetIban).toBe("FR7630001...");
    expect(body.amountEur).toBe(10);
    expect(body.channel).toBe("SEPAINSTANT");
  });

  it("cryptoTopup sends POST with body", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse(200, { success: true, wallet: "0xabc", token: "EUR-IBEX", amount: "1.5", txHash: "0xdef" }),
    );
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, apiKey: "k", fetchImpl: fetchMock });

    await client.cryptoTopup({ externalUserId: "u1", wallet: "0xabc" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/crypto/topup`);
    expect(init?.method).toBe("POST");
    const body = JSON.parse(init?.body as string);
    expect(body.externalUserId).toBe("u1");
    expect(body.wallet).toBe("0xabc");
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("IbexDevToolsClient error handling", () => {
  it("throws IbexHttpError on non-OK response", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(404, { message: "Not Found" }));
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, apiKey: "k", fetchImpl: fetchMock });

    try {
      await client.kyGetState("unknown");
      expect.unreachable("should have thrown");
    } catch (err: unknown) {
      const e = err as Error & { status?: number; payload?: unknown };
      expect(e.message).toContain("Not Found");
      expect(e.status).toBe(404);
      expect(e.payload).toEqual({ message: "Not Found" });
    }
  });

  it("throws with detail field from payload", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(400, { detail: "Invalid SIREN" }));
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, apiKey: "k", fetchImpl: fetchMock });

    await expect(client.companyCheck({ siren: "bad" })).rejects.toThrow("Invalid SIREN");
  });

  it("throws generic error when payload has no detail/message", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(500, {}));
    const client = createIbexDevToolsClient({ apiBaseUrl: BASE, apiKey: "k", fetchImpl: fetchMock });

    await expect(client.sepaTopup({ targetIban: "FR..." })).rejects.toThrow("Erreur 500");
  });
});

// ---------------------------------------------------------------------------
// Factory via IbexSdk
// ---------------------------------------------------------------------------

describe("IbexSdk.createDevToolsClient", () => {
  it("inherits apiBaseUrl and fetchImpl from parent SDK", async () => {
    const { createIbexSdk } = await import("./sdk");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));
    const sdk = createIbexSdk({ apiBaseUrl: BASE, fetchImpl: fetchMock, storage: new MemoryStorage() });
    const devtools = sdk.createDevToolsClient({ apiKey: "inherited-key" });

    await devtools.kyList();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe(`${BASE}/api/admin/devtools/ky/list`);
    expect((init?.headers as Record<string, string>)["x-api-key"]).toBe("inherited-key");
  });

  it("allows overriding apiBaseUrl", async () => {
    const { createIbexSdk } = await import("./sdk");

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, { items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));
    const sdk = createIbexSdk({ apiBaseUrl: BASE, fetchImpl: fetchMock, storage: new MemoryStorage() });
    const devtools = sdk.createDevToolsClient({ apiBaseUrl: "https://other.ibex.fi", apiKey: "k2" });

    await devtools.kyList();

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe("https://other.ibex.fi/api/admin/devtools/ky/list");
  });
});

// Minimal MemoryStorage for SDK factory tests
class MemoryStorage {
  private readonly map = new Map<string, string>();
  get(key: string): string | null { return this.map.has(key) ? this.map.get(key)! : null; }
  set(key: string, value: string): void { this.map.set(key, value); }
  remove(key: string): void { this.map.delete(key); }
  keys(): string[] { return Array.from(this.map.keys()); }
}
