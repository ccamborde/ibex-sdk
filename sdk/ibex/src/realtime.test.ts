import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { IbexRealtimeClient } from "./realtime";
import {
  unwrapSection,
  normalizeWsBalanceData,
  normalizeWsTransactionData,
  normalizeWsUserData,
  parseWsMessage,
} from "./utils";
import type { IbexWsConfig, JsonObject } from "./types";

// --- Mock WebSocket ---

type WsHandler = ((event: { data: string }) => void) | null;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  url: string;
  readyState = 0; /* CONNECTING */
  onopen: (() => void) | null = null;
  onmessage: WsHandler = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  sent: string[] = [];
  closeCode?: number;
  closeReason?: string;

  constructor(url: string | URL) {
    this.url = String(url);
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closeCode = code;
    this.closeReason = reason;
    this.readyState = 3;
  }

  simulateOpen(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateMessage(msg: unknown): void {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  simulateClose(code: number, reason = ""): void {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}

function createConfig(overrides?: Partial<IbexWsConfig>): IbexWsConfig {
  return {
    apiBaseUrl: "https://api-test.ibex.fi",
    getToken: () => "jwt-token-123",
    clientName: "test-app",
    wsImpl: MockWebSocket as unknown as IbexWsConfig["wsImpl"],
    reconnect: false,
    ...overrides,
  };
}

function lastWs(): MockWebSocket {
  return MockWebSocket.instances[MockWebSocket.instances.length - 1]!;
}

beforeEach(() => {
  MockWebSocket.instances = [];
});

// --- parseWsMessage ---

describe("parseWsMessage", () => {
  it("parses valid message", () => {
    const result = parseWsMessage(JSON.stringify({ type: "auth_success", data: { safeAddress: "0x1" }, timestamp: "T" }));
    expect(result).toEqual({ type: "auth_success", data: { safeAddress: "0x1" }, timestamp: "T" });
  });

  it("returns null for invalid JSON", () => {
    expect(parseWsMessage("not json")).toBeNull();
  });

  it("returns null when type is missing", () => {
    expect(parseWsMessage(JSON.stringify({ data: {} }))).toBeNull();
  });

  it("defaults data to empty object when absent", () => {
    const result = parseWsMessage(JSON.stringify({ type: "ping" }));
    expect(result).toEqual({ type: "ping", data: {}, timestamp: undefined });
  });
});

// --- unwrapSection ---

describe("unwrapSection", () => {
  it("unwraps { status, data } envelope", () => {
    const section = { status: 200, data: { wallets: [{ safeAddress: "0x1" }] } };
    expect(unwrapSection(section)).toEqual({ wallets: [{ safeAddress: "0x1" }] });
  });

  it("returns non-envelope objects as-is", () => {
    const section = { wallets: [{ safeAddress: "0x1" }] };
    expect(unwrapSection(section)).toBe(section);
  });

  it("handles null and undefined", () => {
    expect(unwrapSection(null)).toBeNull();
    expect(unwrapSection(undefined)).toBeUndefined();
  });

  it("handles status-like objects without data key", () => {
    const section = { status: 200, wallets: [] };
    expect(unwrapSection(section)).toBe(section);
  });
});

// --- normalizeWsBalanceData ---

describe("normalizeWsBalanceData", () => {
  it("normalizes initial variant (balance bucket)", () => {
    const wsData: JsonObject = {
      mode: "initial",
      safeAddress: "0xABC",
      balance: {
        tokens: [{ symbol: "EURe", balance: "100" }],
        pending: [],
      },
      blockchainId: "421614",
      identifier: "0xABC",
    };
    const result = normalizeWsBalanceData(wsData);
    expect(result.wallets).toHaveLength(1);
    expect(result.wallets[0]!.chainId).toBe("421614");
    expect(result.wallets[0]!.walletAddress).toBe("0xABC");
    expect(result.wallets[0]!.tokens[0]!.symbol).toBe("EURe");
  });

  it("normalizes request variant (crypto/fiat/totals)", () => {
    const wsData: JsonObject = {
      mode: "request",
      safeAddress: "0xABC",
      requestId: "req-1",
      timestamp: "2026-05-16T14:00:00Z",
      crypto: {
        "421614": {
          "0xABC": {
            tokens: [{ symbol: "EURe", balance: "200" }],
            pending: [],
          },
        },
      } as unknown as JsonObject,
      fiat: {} as unknown as JsonObject,
      totals: { grand_total_value_eur: "200.00" } as unknown as JsonObject,
    };
    const result = normalizeWsBalanceData(wsData);
    expect(result.wallets).toHaveLength(1);
    expect(result.wallets[0]!.chainId).toBe("421614");
    expect(result.wallets[0]!.tokens[0]!.symbol).toBe("EURe");
    expect(result.totals?.grand_total_value_eur).toBe("200.00");
    expect(result.timestamp).toBe("2026-05-16T14:00:00Z");
  });

  it("strips mode/safeAddress/requestId from output", () => {
    const wsData: JsonObject = { mode: "initial", safeAddress: "0x1", balance: { tokens: [] } };
    const result = normalizeWsBalanceData(wsData) as unknown as Record<string, unknown>;
    expect(result.mode).toBeUndefined();
    expect(result.safeAddress).toBeUndefined();
    expect(result.requestId).toBeUndefined();
  });
});

// --- normalizeWsTransactionData ---

describe("normalizeWsTransactionData", () => {
  it("normalizes transaction_data with crypto.data (flat format)", () => {
    const wsData: JsonObject = {
      mode: "initial",
      safeAddress: "0xABC",
      type: "mixed",
      timestamp: "2026-05-16T14:00:00Z",
      crypto: {
        blockchainId: "421614",
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
        data: [
          { transactionHash: "0xaaa", direction: "IN", value: "10" },
          { transactionHash: "0xbbb", direction: "OUT", value: "5" },
        ],
      } as unknown as JsonObject,
      fiat: {
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
        data: [{ id: "fiat-tx-1", amount: "100.00" }],
      } as unknown as JsonObject,
    };
    const result = normalizeWsTransactionData(wsData);
    expect(result.type).toBe("mixed");
    expect(result.chains).toHaveLength(1);
    expect(result.chains[0]!.chainId).toBe("421614");
    expect(result.chains[0]!.transactions).toHaveLength(2);
    expect(result.chains[0]!.total).toBe(2);
    expect(result.fiat).toBeDefined();
    expect(result.fiat!.total).toBe(1);
    expect(result.fiat!.transactions).toHaveLength(1);
  });

  it("normalizes transaction_data with crypto.chains (grouped format)", () => {
    const wsData: JsonObject = {
      mode: "request",
      safeAddress: "0xABC",
      requestId: "req-2",
      type: "crypto",
      crypto: {
        chains: [
          {
            blockchainId: "421614",
            total: 1,
            wallets: [{ data: [{ transactionHash: "0xccc", direction: "IN" }] }],
          },
        ],
      } as unknown as JsonObject,
    };
    const result = normalizeWsTransactionData(wsData);
    expect(result.chains).toHaveLength(1);
    expect(result.chains[0]!.chainId).toBe("421614");
    expect(result.chains[0]!.transactions[0]!.transactionHash).toBe("0xccc");
  });
});

// --- normalizeWsUserData ---

describe("normalizeWsUserData", () => {
  it("normalizes user_data with { status, data } section envelopes", () => {
    const wsData: JsonObject = {
      addresses: {
        status: 200,
        data: {
          externalUserId: "user-42",
          rpId: "localhost",
          wallets: [{ safeAddress: "0xABC", chainIds: [421614] }],
        },
      } as unknown as JsonObject,
      signers: {
        status: 200,
        data: { signers: [{ id: "signer-1", type: "passkey" }] },
      } as unknown as JsonObject,
      ibans: {
        status: 200,
        data: { ibans: [{ iban: "FR76..." }] },
      } as unknown as JsonObject,
      balances: {
        status: 200,
        data: {
          crypto: {
            "421614": {
              "0xABC": { tokens: [{ symbol: "EURe", balance: "500" }], pending: [] },
            },
          },
        },
      } as unknown as JsonObject,
      transactions: {
        status: 200,
        data: {
          type: "mixed",
          crypto: { blockchainId: "421614", total: 0, page: 1, limit: 50, totalPages: 0, data: [] },
          fiat: { total: 0, page: 1, limit: 50, totalPages: 0, data: [] },
        },
      } as unknown as JsonObject,
      kycStatus: {
        status: 200,
        data: { verified: true, kycLevel: "full" },
      } as unknown as JsonObject,
      addressbook: {
        status: 200,
        data: { data: [{ id: "entry-1", name: "Alice" }] },
      } as unknown as JsonObject,
    };

    const result = normalizeWsUserData(wsData);
    expect(result.externalUserId).toBe("user-42");
    expect(result.rpId).toBe("localhost");
    expect(result.wallets).toHaveLength(1);
    expect(result.wallets[0]!.safeAddress).toBe("0xABC");
    expect(result.signers).toHaveLength(1);
    expect(result.ibans).toHaveLength(1);
    expect(result.balances).toBeDefined();
    expect(result.balances!.wallets).toHaveLength(1);
    expect(result.balances!.wallets[0]!.tokens[0]!.symbol).toBe("EURe");
    expect(result.transactions).toBeDefined();
    expect(result.transactions!.type).toBe("mixed");
    expect(result.kycStatus?.verified).toBe(true);
    expect(result.addressbook).toHaveLength(1);
  });

  it("normalizes user_data without { status, data } envelopes", () => {
    const wsData: JsonObject = {
      addresses: {
        externalUserId: "user-99",
        wallets: [{ safeAddress: "0xDEF", chainIds: [100] }],
      } as unknown as JsonObject,
      signers: { signers: [] } as unknown as JsonObject,
      ibans: { ibans: [] } as unknown as JsonObject,
    };

    const result = normalizeWsUserData(wsData);
    expect(result.externalUserId).toBe("user-99");
    expect(result.wallets).toHaveLength(1);
    expect(result.signers).toHaveLength(0);
    expect(result.ibans).toHaveLength(0);
  });
});

// --- IbexRealtimeClient ---

describe("IbexRealtimeClient", () => {
  describe("connection and auth", () => {
    it("connects to correct WS URL and sends auth on open", () => {
      const client = new IbexRealtimeClient(createConfig());
      client.connect();
      expect(MockWebSocket.instances).toHaveLength(1);
      expect(lastWs().url).toBe("wss://api-test.ibex.fi/ws");

      lastWs().simulateOpen();
      expect(lastWs().sent).toHaveLength(1);
      const authMsg = JSON.parse(lastWs().sent[0]!);
      expect(authMsg).toEqual({ type: "auth", token: "jwt-token-123", clientName: "test-app" });
    });

    it("includes blockchainId in URL query when configured", () => {
      const client = new IbexRealtimeClient(createConfig({ blockchainId: "421614" }));
      client.connect();
      expect(lastWs().url).toBe("wss://api-test.ibex.fi/ws?blockchainId=421614");
    });

    it("emits auth_success and sets authenticated", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("auth_success", handler);
      client.connect();
      lastWs().simulateOpen();

      expect(client.authenticated).toBe(false);
      lastWs().simulateMessage({ type: "auth_success", data: { safeAddress: "0xABC", message: "OK" } });
      expect(client.authenticated).toBe(true);
      expect(handler).toHaveBeenCalledWith({ safeAddress: "0xABC", message: "OK" });
    });

    it("emits auth_error on failure", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("auth_error", handler);
      client.connect();
      lastWs().simulateOpen();
      lastWs().simulateMessage({
        type: "auth_error",
        data: { message: "Token expired", error_code: "TOKEN_EXPIRED" },
      });

      expect(client.authenticated).toBe(false);
      expect(handler).toHaveBeenCalledWith({ message: "Token expired", error_code: "TOKEN_EXPIRED" });
    });

    it("closes WS when no token is available", () => {
      const client = new IbexRealtimeClient(createConfig({ getToken: () => null }));
      client.connect();
      lastWs().simulateOpen();
      expect(lastWs().closeCode).toBe(4002);
      expect(lastWs().sent).toHaveLength(0);
    });
  });

  describe("close codes", () => {
    it("calls onTokenExpired on 4002", () => {
      const onTokenExpired = vi.fn();
      const client = new IbexRealtimeClient(createConfig({ onTokenExpired }));
      client.connect();
      lastWs().simulateOpen();
      lastWs().simulateClose(4002, "auth failed");
      expect(onTokenExpired).toHaveBeenCalledOnce();
    });

    it("does not reconnect on 4003 (duplicate session)", () => {
      const client = new IbexRealtimeClient(createConfig({ reconnect: true }));
      client.connect();
      lastWs().simulateOpen();
      const instancesBefore = MockWebSocket.instances.length;
      lastWs().simulateClose(4003, "duplicate");
      expect(MockWebSocket.instances.length).toBe(instancesBefore);
    });

    it("emits close event with code and reason", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("close", handler);
      client.connect();
      lastWs().simulateOpen();
      lastWs().simulateClose(4001, "auth timeout");
      expect(handler).toHaveBeenCalledWith({ code: 4001, reason: "auth timeout" });
    });
  });

  describe("disconnect", () => {
    it("closes socket and prevents reconnection", () => {
      const client = new IbexRealtimeClient(createConfig({ reconnect: true }));
      client.connect();
      lastWs().simulateOpen();
      expect(client.connected).toBe(true);

      client.disconnect();
      expect(client.connected).toBe(false);
      expect(client.authenticated).toBe(false);
    });
  });

  describe("event subscription and unsubscription", () => {
    it("on() returns unsubscribe function", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      const unsub = client.on("auth_success", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({ type: "auth_success", data: { safeAddress: "0x1" } });
      expect(handler).toHaveBeenCalledTimes(1);

      unsub();
      lastWs().simulateMessage({ type: "auth_success", data: { safeAddress: "0x2" } });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("emits raw for every message", () => {
      const client = new IbexRealtimeClient(createConfig());
      const rawHandler = vi.fn();
      client.on("raw", rawHandler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({ type: "auth_success", data: { safeAddress: "0x1" }, timestamp: "T" });
      lastWs().simulateMessage({ type: "balance_update", data: { address: "0x1", balance: "100", updated_at: "T" }, timestamp: "T" });

      expect(rawHandler).toHaveBeenCalledTimes(2);
      expect(rawHandler.mock.calls[0]![0].type).toBe("auth_success");
      expect(rawHandler.mock.calls[1]![0].type).toBe("balance_update");
    });
  });

  describe("normalized balance_data events", () => {
    it("normalizes initial balance_data into IbexNormalizedBalances", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("balance_data", handler);
      client.connect();
      lastWs().simulateOpen();
      lastWs().simulateMessage({ type: "auth_success", data: { safeAddress: "0xABC" } });

      lastWs().simulateMessage({
        type: "balance_data",
        data: {
          mode: "initial",
          safeAddress: "0xABC",
          balance: { tokens: [{ symbol: "EURe", balance: "100" }], pending: [] },
          blockchainId: "421614",
          identifier: "0xABC",
        },
        timestamp: "T",
      });

      expect(handler).toHaveBeenCalledTimes(1);
      const result = handler.mock.calls[0]![0];
      expect(result.wallets).toHaveLength(1);
      expect(result.wallets[0].tokens[0].symbol).toBe("EURe");
    });

    it("normalizes request balance_data with crypto/fiat", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("balance_data", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "balance_data",
        data: {
          mode: "request",
          safeAddress: "0xABC",
          requestId: "req-1",
          timestamp: "2026-05-16T14:00:00Z",
          crypto: { "421614": { "0xABC": { tokens: [{ symbol: "USD-IBEX" }], pending: [] } } },
          totals: { grand_total_value_eur: "500.00" },
        },
        timestamp: "T",
      });

      const result = handler.mock.calls[0]![0];
      expect(result.wallets).toHaveLength(1);
      expect(result.wallets[0].tokens[0].symbol).toBe("USD-IBEX");
      expect(result.totals.grand_total_value_eur).toBe("500.00");
    });
  });

  describe("normalized transaction_data events", () => {
    it("normalizes transaction_data into IbexNormalizedTransactions", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("transaction_data", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "transaction_data",
        data: {
          mode: "initial",
          safeAddress: "0xABC",
          type: "mixed",
          crypto: {
            blockchainId: "421614",
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
            data: [{ transactionHash: "0xaaa", direction: "IN" }],
          },
          fiat: {
            total: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
            data: [{ id: "f1", amount: "50" }],
          },
        },
      });

      const result = handler.mock.calls[0]![0];
      expect(result.type).toBe("mixed");
      expect(result.chains).toHaveLength(1);
      expect(result.chains[0].chainId).toBe("421614");
      expect(result.chains[0].transactions[0].transactionHash).toBe("0xaaa");
      expect(result.fiat.total).toBe(1);
    });
  });

  describe("normalized user_data events", () => {
    it("normalizes user_data with section envelopes into IbexNormalizedProfile", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("user_data", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "user_data",
        data: {
          addresses: { status: 200, data: { externalUserId: "u-1", wallets: [{ safeAddress: "0xABC", chainIds: [421614] }] } },
          signers: { status: 200, data: { signers: [{ id: "s1" }] } },
          ibans: { status: 200, data: { ibans: [{ iban: "FR76..." }] } },
          kycStatus: { status: 200, data: { verified: true } },
          addressbook: { status: 200, data: { data: [] } },
        },
      });

      const result = handler.mock.calls[0]![0];
      expect(result.externalUserId).toBe("u-1");
      expect(result.wallets).toHaveLength(1);
      expect(result.signers).toHaveLength(1);
      expect(result.ibans).toHaveLength(1);
      expect(result.kycStatus?.verified).toBe(true);
    });
  });

  describe("push events", () => {
    it("emits balance_update as-is", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("balance_update", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "balance_update",
        data: { address: "0xABC", balance: "1250000000000000000", updated_at: "T" },
      });

      expect(handler).toHaveBeenCalledWith({
        address: "0xABC",
        balance: "1250000000000000000",
        updated_at: "T",
      });
    });

    it("emits new_transaction as-is", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("new_transaction", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "new_transaction",
        data: {
          address: "0xABC",
          newTransaction: { hash: "0xdef", direction: "IN", value: "100" },
          transactionCount: 1,
          historyLimit: 5,
        },
      });

      expect(handler.mock.calls[0]![0].address).toBe("0xABC");
      expect(handler.mock.calls[0]![0].newTransaction.hash).toBe("0xdef");
    });

    it("emits fiat_balance_update", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("fiat_balance_update", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "fiat_balance_update",
        data: { iban: "FR76...", balance: "241.90", currency: "EUR", updated_at: "T" },
      });

      expect(handler).toHaveBeenCalledWith({ iban: "FR76...", balance: "241.90", currency: "EUR", updated_at: "T" });
    });

    it("emits fiat_transaction_update", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("fiat_transaction_update", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "fiat_transaction_update",
        data: {
          iban: "FR76...",
          transactionId: "tx-1",
          event: "payment.completed",
          status: "completed",
          previousStatus: null,
          amount: "1.00",
          currency: "EUR",
        },
      });

      expect(handler.mock.calls[0]![0].transactionId).toBe("tx-1");
      expect(handler.mock.calls[0]![0].status).toBe("completed");
    });

    it("emits chainid_data and recovery_data", () => {
      const client = new IbexRealtimeClient(createConfig());
      const chainHandler = vi.fn();
      const recoveryHandler = vi.fn();
      client.on("chainid_data", chainHandler);
      client.on("recovery_data", recoveryHandler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "chainid_data",
        data: { defaultChainId: 100, supportedChainIds: [100, 421614] },
      });
      lastWs().simulateMessage({
        type: "recovery_data",
        data: { safeAddress: "0x1", recoveryEnabled: false },
      });

      expect(chainHandler.mock.calls[0]![0]).toEqual({ defaultChainId: 100, supportedChainIds: [100, 421614] });
      expect(recoveryHandler.mock.calls[0]![0].recoveryEnabled).toBe(false);
    });

    it("emits signal events (user_iban_updated, user_ky_updated)", () => {
      const client = new IbexRealtimeClient(createConfig());
      const ibanHandler = vi.fn();
      const kyHandler = vi.fn();
      client.on("user_iban_updated", ibanHandler);
      client.on("user_ky_updated", kyHandler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({ type: "user_iban_updated", data: { iban: "changed" } });
      lastWs().simulateMessage({ type: "user_ky_updated", data: { ky: "changed" } });

      expect(ibanHandler).toHaveBeenCalledWith({ iban: "changed" });
      expect(kyHandler).toHaveBeenCalledWith({ ky: "changed" });
    });

    it("emits error events", () => {
      const client = new IbexRealtimeClient(createConfig());
      const handler = vi.fn();
      client.on("error", handler);
      client.connect();
      lastWs().simulateOpen();

      lastWs().simulateMessage({
        type: "error",
        data: { message: "Balance fetch failed", context: "balance", error_code: "BALANCE_FETCH_FAILED" },
      });

      expect(handler.mock.calls[0]![0].error_code).toBe("BALANCE_FETCH_FAILED");
    });
  });

  describe("on-demand requests", () => {
    it("sends get_balance message", () => {
      const client = new IbexRealtimeClient(createConfig());
      client.connect();
      lastWs().simulateOpen();

      client.requestBalances("req-bal-1");
      expect(lastWs().sent).toHaveLength(2); // auth + get_balance
      const msg = JSON.parse(lastWs().sent[1]!);
      expect(msg).toEqual({ type: "get_balance", requestId: "req-bal-1" });
    });

    it("sends get_balance without requestId", () => {
      const client = new IbexRealtimeClient(createConfig());
      client.connect();
      lastWs().simulateOpen();

      client.requestBalances();
      const msg = JSON.parse(lastWs().sent[1]!);
      expect(msg).toEqual({ type: "get_balance" });
    });

    it("sends get_transactions with params and requestId", () => {
      const client = new IbexRealtimeClient(createConfig());
      client.connect();
      lastWs().simulateOpen();

      client.requestTransactions({ page: 2, limit: 25, startDate: "2026-01-01" }, "req-tx-1");
      const msg = JSON.parse(lastWs().sent[1]!);
      expect(msg).toEqual({
        type: "get_transactions",
        requestId: "req-tx-1",
        params: { page: 2, limit: 25, startDate: "2026-01-01" },
      });
    });
  });

  describe("reconnection", () => {
    it("attempts reconnection on normal close when enabled", () => {
      vi.useFakeTimers();
      const client = new IbexRealtimeClient(createConfig({ reconnect: true }));
      client.connect();
      expect(MockWebSocket.instances).toHaveLength(1);

      lastWs().simulateOpen();
      lastWs().simulateClose(1006, "abnormal");
      expect(MockWebSocket.instances).toHaveLength(1);

      vi.advanceTimersByTime(2000);
      expect(MockWebSocket.instances).toHaveLength(2);
      vi.useRealTimers();
    });

    it("does not reconnect when disabled", () => {
      vi.useFakeTimers();
      const client = new IbexRealtimeClient(createConfig({ reconnect: false }));
      client.connect();
      lastWs().simulateOpen();
      lastWs().simulateClose(1006, "abnormal");

      vi.advanceTimersByTime(60000);
      expect(MockWebSocket.instances).toHaveLength(1);
      vi.useRealTimers();
    });

    it("does not reconnect after intentional disconnect", () => {
      vi.useFakeTimers();
      const client = new IbexRealtimeClient(createConfig({ reconnect: true }));
      client.connect();
      lastWs().simulateOpen();
      client.disconnect();

      vi.advanceTimersByTime(60000);
      expect(MockWebSocket.instances).toHaveLength(1);
      vi.useRealTimers();
    });
  });
});
