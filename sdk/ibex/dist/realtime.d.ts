import type { IbexWsConfig, IbexWsEventMap } from "./types";
type Listener<T> = (data: T) => void;
export declare class IbexRealtimeClient {
    private readonly config;
    private readonly reconnectPolicy;
    private readonly WsConstructor;
    private ws;
    private listeners;
    private _authenticated;
    private _intentionalClose;
    private reconnectAttempt;
    private reconnectTimer;
    constructor(config: IbexWsConfig);
    get connected(): boolean;
    get authenticated(): boolean;
    connect(): void;
    disconnect(): void;
    on<K extends keyof IbexWsEventMap>(event: K, handler: Listener<IbexWsEventMap[K]>): () => void;
    requestBalances(requestId?: string): void;
    requestTransactions(params?: {
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
    }, requestId?: string): void;
    private createSocket;
    private handleOpen;
    private handleMessage;
    private handleClose;
    private scheduleReconnect;
    private clearReconnectTimer;
    private send;
    private emit;
    private emitNormalized;
}
export declare function createRealtimeClient(config: IbexWsConfig): IbexRealtimeClient;
export {};
