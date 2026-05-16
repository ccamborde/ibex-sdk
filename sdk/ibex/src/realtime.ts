import type {
  IbexNormalizedBalances,
  IbexNormalizedProfile,
  IbexNormalizedTransactions,
  IbexRecoveryStatusResponse,
  IbexWsAuthError,
  IbexWsAuthSuccess,
  IbexWsBalanceUpdate,
  IbexWsChainIdData,
  IbexWsCloseEvent,
  IbexWsConfig,
  IbexWsError,
  IbexWsEventMap,
  IbexWsFiatBalanceUpdate,
  IbexWsFiatTransactionUpdate,
  IbexWsNewTransaction,
  IbexWsRawMessage,
  IbexWsReconnectPolicy,
  IbexWsSignalEvent,
  JsonObject,
} from "./types";
import {
  normalizeWsBalanceData,
  normalizeWsTransactionData,
  normalizeWsUserData,
  parseWsMessage,
} from "./utils";

const DEFAULT_RECONNECT: Required<IbexWsReconnectPolicy> = {
  enabled: true,
  maxAttempts: 10,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
};

const WS_CLOSE_AUTH_TIMEOUT = 4001;
const WS_CLOSE_AUTH_FAILED = 4002;
const WS_CLOSE_DUPLICATE = 4003;

type Listener<T> = (data: T) => void;
type ListenerMap = { [K in keyof IbexWsEventMap]?: Set<Listener<IbexWsEventMap[K]>> };

export class IbexRealtimeClient {
  private readonly config: IbexWsConfig;
  private readonly reconnectPolicy: Required<IbexWsReconnectPolicy>;
  private readonly WsConstructor: { new (url: string | URL, protocols?: string | string[]): WebSocket };
  private ws: WebSocket | null = null;
  private listeners: ListenerMap = {};
  private _authenticated = false;
  private _intentionalClose = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: IbexWsConfig) {
    this.config = config;
    this.WsConstructor = config.wsImpl ?? (typeof WebSocket !== "undefined" ? WebSocket : (null as never));
    if (!this.WsConstructor) {
      throw new Error("WebSocket is not available. Provide wsImpl in IbexWsConfig.");
    }

    if (typeof config.reconnect === "boolean") {
      this.reconnectPolicy = { ...DEFAULT_RECONNECT, enabled: config.reconnect };
    } else if (config.reconnect && typeof config.reconnect === "object") {
      this.reconnectPolicy = { ...DEFAULT_RECONNECT, ...config.reconnect, enabled: true };
    } else {
      this.reconnectPolicy = { ...DEFAULT_RECONNECT };
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === 1; /* WebSocket.OPEN */
  }

  get authenticated(): boolean {
    return this._authenticated;
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
      return;
    }

    this._intentionalClose = false;
    this._authenticated = false;
    this.reconnectAttempt = 0;

    this.createSocket();
  }

  disconnect(): void {
    this._intentionalClose = true;
    this._authenticated = false;
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === 0 || this.ws.readyState === 1) {
        this.ws.close(1000, "client disconnect");
      }
      this.ws = null;
    }
  }

  on<K extends keyof IbexWsEventMap>(event: K, handler: Listener<IbexWsEventMap[K]>): () => void {
    if (!this.listeners[event]) {
      (this.listeners as Record<string, Set<Listener<unknown>>>)[event] = new Set();
    }
    const set = this.listeners[event] as Set<Listener<IbexWsEventMap[K]>>;
    set.add(handler);
    return () => { set.delete(handler); };
  }

  requestBalances(requestId?: string): void {
    this.send({ type: "get_balance", ...(requestId ? { requestId } : {}) });
  }

  requestTransactions(
    params?: { page?: number; limit?: number; startDate?: string; endDate?: string },
    requestId?: string,
  ): void {
    const msg: JsonObject = { type: "get_transactions" };
    if (requestId) msg.requestId = requestId;
    if (params) msg.params = params as unknown as JsonObject;
    this.send(msg);
  }

  // --- private ---

  private createSocket(): void {
    const base = this.config.apiBaseUrl.replace(/\/+$/, "").replace(/^http/, "ws");
    const url = this.config.blockchainId
      ? `${base}/ws?blockchainId=${encodeURIComponent(this.config.blockchainId)}`
      : `${base}/ws`;

    this.ws = new this.WsConstructor(url);
    this.ws.onopen = this.handleOpen;
    this.ws.onmessage = this.handleMessage;
    this.ws.onclose = this.handleClose;
    this.ws.onerror = () => { /* handled by onclose */ };
  }

  private handleOpen = (): void => {
    this.emit("open", undefined as never);
    const token = this.config.getToken();
    if (!token) {
      this.ws?.close(WS_CLOSE_AUTH_FAILED, "no token");
      return;
    }
    this.send({
      type: "auth",
      token,
      clientName: this.config.clientName ?? "ibex-sdk",
    });
  };

  private handleMessage = (event: MessageEvent): void => {
    const msg = parseWsMessage(typeof event.data === "string" ? event.data : String(event.data));
    if (!msg) return;

    this.emit("raw", msg);

    switch (msg.type) {
      case "auth_success":
        this._authenticated = true;
        this.reconnectAttempt = 0;
        this.emit("auth_success", msg.data as unknown as IbexWsAuthSuccess);
        break;

      case "connection_success":
        this.emit("connection_success", msg.data as unknown as IbexWsAuthSuccess);
        break;

      case "auth_error":
        this._authenticated = false;
        this.emit("auth_error", msg.data as unknown as IbexWsAuthError);
        break;

      case "balance_data":
        this.emitNormalized("balance_data", () => normalizeWsBalanceData(msg.data));
        break;

      case "transaction_data":
        this.emitNormalized("transaction_data", () => normalizeWsTransactionData(msg.data));
        break;

      case "user_data":
        this.emitNormalized("user_data", () => normalizeWsUserData(msg.data));
        break;

      case "balance_update":
        this.emit("balance_update", msg.data as unknown as IbexWsBalanceUpdate);
        break;

      case "new_transaction":
        this.emit("new_transaction", msg.data as unknown as IbexWsNewTransaction);
        break;

      case "fiat_balance_update":
        this.emit("fiat_balance_update", msg.data as unknown as IbexWsFiatBalanceUpdate);
        break;

      case "fiat_transaction_update":
        this.emit("fiat_transaction_update", msg.data as unknown as IbexWsFiatTransactionUpdate);
        break;

      case "chainid_data":
        this.emit("chainid_data", msg.data as unknown as IbexWsChainIdData);
        break;

      case "recovery_data":
        this.emit("recovery_data", msg.data as unknown as IbexRecoveryStatusResponse);
        break;

      case "user_iban_updated":
        this.emit("user_iban_updated", msg.data as unknown as IbexWsSignalEvent);
        break;

      case "user_ky_updated":
        this.emit("user_ky_updated", msg.data as unknown as IbexWsSignalEvent);
        break;

      case "error":
        this.emit("error", msg.data as unknown as IbexWsError);
        break;

      default:
        break;
    }
  };

  private handleClose = (event: CloseEvent): void => {
    this._authenticated = false;
    this.ws = null;

    const closeData: IbexWsCloseEvent = { code: event.code, reason: event.reason };
    this.emit("close", closeData);

    if (event.code === WS_CLOSE_AUTH_FAILED) {
      this.config.onTokenExpired?.();
    }

    if (this._intentionalClose) return;
    if (event.code === WS_CLOSE_DUPLICATE) return;

    this.scheduleReconnect();
  };

  private scheduleReconnect(): void {
    if (!this.reconnectPolicy.enabled) return;
    if (this.reconnectAttempt >= this.reconnectPolicy.maxAttempts) return;

    const jitter = Math.random() * 0.3 + 0.85;
    const delay = Math.min(
      this.reconnectPolicy.baseDelayMs * Math.pow(2, this.reconnectAttempt) * jitter,
      this.reconnectPolicy.maxDelayMs,
    );

    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.createSocket();
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private send(data: JsonObject): void {
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private emit<K extends keyof IbexWsEventMap>(event: K, data: IbexWsEventMap[K]): void {
    const set = this.listeners[event] as Set<Listener<IbexWsEventMap[K]>> | undefined;
    if (!set) return;
    for (const handler of set) {
      try {
        handler(data);
      } catch {
        /* listener errors must not break the event loop */
      }
    }
  }

  private emitNormalized<K extends keyof IbexWsEventMap>(event: K, normalize: () => IbexWsEventMap[K]): void {
    const set = this.listeners[event];
    if (!set || set.size === 0) return;
    try {
      const normalized = normalize();
      this.emit(event, normalized);
    } catch {
      this.emit("error", {
        message: `Failed to normalize ${event} payload`,
        context: event,
        error_code: "NORMALIZATION_ERROR",
      } as unknown as IbexWsEventMap[K] & IbexWsError);
    }
  }
}

export function createRealtimeClient(config: IbexWsConfig): IbexRealtimeClient {
  return new IbexRealtimeClient(config);
}
