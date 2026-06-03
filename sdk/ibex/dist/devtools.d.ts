import type { IbexDevToolsCompanyCheckInput, IbexDevToolsCompanyCheckResponse, IbexDevToolsConfig, IbexDevToolsCryptoTopupInput, IbexDevToolsCryptoTopupResponse, IbexDevToolsKybEnrollInput, IbexDevToolsKybEnrollResponse, IbexDevToolsKyEnrollInput, IbexDevToolsKyEnrollResponse, IbexDevToolsKyListQuery, IbexDevToolsKyListResponse, IbexDevToolsKySetStateInput, IbexDevToolsKySetStateResponse, IbexDevToolsKySmsVerifiedInput, IbexDevToolsKySmsVerifiedResponse, IbexDevToolsKyStateResponse, IbexDevToolsSepaTopupInput, IbexDevToolsSepaTopupResponse } from "./types";
export declare class IbexDevToolsClient {
    private readonly apiBaseUrl;
    private readonly fetchImpl;
    private readonly authHeaders;
    private readonly defaultHeaders;
    constructor(config: IbexDevToolsConfig);
    kyList(query?: IbexDevToolsKyListQuery): Promise<IbexDevToolsKyListResponse>;
    kyGetState(externalUserId: string): Promise<IbexDevToolsKyStateResponse>;
    kySetState(input: IbexDevToolsKySetStateInput): Promise<IbexDevToolsKySetStateResponse>;
    kyEnroll(input: IbexDevToolsKyEnrollInput): Promise<IbexDevToolsKyEnrollResponse>;
    kybEnroll(input: IbexDevToolsKybEnrollInput): Promise<IbexDevToolsKybEnrollResponse>;
    kySmsVerified(input: IbexDevToolsKySmsVerifiedInput): Promise<IbexDevToolsKySmsVerifiedResponse>;
    companyCheck(input: IbexDevToolsCompanyCheckInput): Promise<IbexDevToolsCompanyCheckResponse>;
    sepaTopup(input: IbexDevToolsSepaTopupInput): Promise<IbexDevToolsSepaTopupResponse>;
    cryptoTopup(input: IbexDevToolsCryptoTopupInput): Promise<IbexDevToolsCryptoTopupResponse>;
    private jsonFetch;
    private buildUrl;
    private buildPathWithQuery;
}
export declare function createIbexDevToolsClient(config: IbexDevToolsConfig): IbexDevToolsClient;
