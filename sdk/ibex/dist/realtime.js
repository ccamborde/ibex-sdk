import { normalizeWsBalanceData, normalizeWsTransactionData, normalizeWsUserData, parseWsMessage, } from "./utils";
const DEFAULT_RECONNECT = {
    enabled: true,
    maxAttempts: 10,
    baseDelayMs: 1000,
    maxDelayMs: 30_000,
};
const WS_CLOSE_AUTH_TIMEOUT = 4001;
const WS_CLOSE_AUTH_FAILED = 4002;
const WS_CLOSE_DUPLICATE = 4003;
export class IbexRealtimeClient {
    config;
    reconnectPolicy;
    WsConstructor;
    ws = null;
    listeners = {};
    _authenticated = false;
    _intentionalClose = false;
    reconnectAttempt = 0;
    reconnectTimer = null;
    constructor(config) {
        this.config = config;
        this.WsConstructor = config.wsImpl ?? (typeof WebSocket !== "undefined" ? WebSocket : null);
        if (!this.WsConstructor) {
            throw new Error("WebSocket is not available. Provide wsImpl in IbexWsConfig.");
        }
        if (typeof config.reconnect === "boolean") {
            this.reconnectPolicy = { ...DEFAULT_RECONNECT, enabled: config.reconnect };
        }
        else if (config.reconnect && typeof config.reconnect === "object") {
            this.reconnectPolicy = { ...DEFAULT_RECONNECT, ...config.reconnect, enabled: true };
        }
        else {
            this.reconnectPolicy = { ...DEFAULT_RECONNECT };
        }
    }
    get connected() {
        return this.ws?.readyState === 1; /* WebSocket.OPEN */
    }
    get authenticated() {
        return this._authenticated;
    }
    connect() {
        if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
            return;
        }
        this._intentionalClose = false;
        this._authenticated = false;
        this.reconnectAttempt = 0;
        this.createSocket();
    }
    disconnect() {
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
    on(event, handler) {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }
        const set = this.listeners[event];
        set.add(handler);
        return () => { set.delete(handler); };
    }
    requestBalances(requestId) {
        this.send({ type: "get_balance", ...(requestId ? { requestId } : {}) });
    }
    requestTransactions(params, requestId) {
        const msg = { type: "get_transactions" };
        if (requestId)
            msg.requestId = requestId;
        if (params)
            msg.params = params;
        this.send(msg);
    }
    // --- private ---
    createSocket() {
        const base = this.config.apiBaseUrl.replace(/\/+$/, "").replace(/^http/, "ws");
        const url = this.config.blockchainId
            ? `${base}/ws?blockchainId=${encodeURIComponent(this.config.blockchainId)}`
            : `${base}/ws`;
        this.ws = new this.WsConstructor(url);
        this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
        this.ws.onclose = this.handleClose;
        this.ws.onerror = () => { };
    }
    handleOpen = () => {
        this.emit("open", undefined);
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
    handleMessage = (event) => {
        const msg = parseWsMessage(typeof event.data === "string" ? event.data : String(event.data));
        if (!msg)
            return;
        this.emit("raw", msg);
        switch (msg.type) {
            case "auth_success":
                this._authenticated = true;
                this.reconnectAttempt = 0;
                this.emit("auth_success", msg.data);
                break;
            case "connection_success":
                this.emit("connection_success", msg.data);
                break;
            case "auth_error":
                this._authenticated = false;
                this.emit("auth_error", msg.data);
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
                this.emit("balance_update", msg.data);
                break;
            case "new_transaction":
                this.emit("new_transaction", msg.data);
                break;
            case "fiat_balance_update":
                this.emit("fiat_balance_update", msg.data);
                break;
            case "fiat_transaction_update":
                this.emit("fiat_transaction_update", msg.data);
                break;
            case "chainid_data":
                this.emit("chainid_data", msg.data);
                break;
            case "recovery_data":
                this.emit("recovery_data", msg.data);
                break;
            case "user_iban_updated":
                this.emit("user_iban_updated", msg.data);
                break;
            case "user_ky_updated":
                this.emit("user_ky_updated", msg.data);
                break;
            case "error":
                this.emit("error", msg.data);
                break;
            default:
                break;
        }
    };
    handleClose = (event) => {
        this._authenticated = false;
        this.ws = null;
        const closeData = { code: event.code, reason: event.reason };
        this.emit("close", closeData);
        if (event.code === WS_CLOSE_AUTH_FAILED) {
            this.config.onTokenExpired?.();
        }
        if (this._intentionalClose)
            return;
        if (event.code === WS_CLOSE_DUPLICATE)
            return;
        this.scheduleReconnect();
    };
    scheduleReconnect() {
        if (!this.reconnectPolicy.enabled)
            return;
        if (this.reconnectAttempt >= this.reconnectPolicy.maxAttempts)
            return;
        const jitter = Math.random() * 0.3 + 0.85;
        const delay = Math.min(this.reconnectPolicy.baseDelayMs * Math.pow(2, this.reconnectAttempt) * jitter, this.reconnectPolicy.maxDelayMs);
        this.reconnectAttempt += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.createSocket();
        }, delay);
    }
    clearReconnectTimer() {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    send(data) {
        if (this.ws?.readyState === 1) {
            this.ws.send(JSON.stringify(data));
        }
    }
    emit(event, data) {
        const set = this.listeners[event];
        if (!set)
            return;
        for (const handler of set) {
            try {
                handler(data);
            }
            catch {
                /* listener errors must not break the event loop */
            }
        }
    }
    emitNormalized(event, normalize) {
        const set = this.listeners[event];
        if (!set || set.size === 0)
            return;
        try {
            const normalized = normalize();
            this.emit(event, normalized);
        }
        catch {
            this.emit("error", {
                message: `Failed to normalize ${event} payload`,
                context: event,
                error_code: "NORMALIZATION_ERROR",
            });
        }
    }
}
export function createRealtimeClient(config) {
    return new IbexRealtimeClient(config);
}
