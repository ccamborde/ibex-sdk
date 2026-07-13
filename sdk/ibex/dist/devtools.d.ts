import type { IbexDevToolsCompanyCheckInput, IbexDevToolsCompanyCheckPeppolResponse, IbexDevToolsCompanyCheckResponse, IbexDevToolsConfig, IbexDevToolsCryptoTopupInput, IbexDevToolsCryptoTopupResponse, IbexDevToolsDomainUserDetailResponse, IbexDevToolsDomainUsersQuery, IbexDevToolsDomainUsersResponse, IbexDevToolsKybEnrollInput, IbexDevToolsKybEnrollResponse, IbexDevToolsKyEnrollInput, IbexDevToolsKyEnrollResponse, IbexDevToolsKyListQuery, IbexDevToolsKyListResponse, IbexDevToolsKySetStateInput, IbexDevToolsKySetStateResponse, IbexDevToolsKySmsVerifiedInput, IbexDevToolsKySmsVerifiedResponse, IbexDevToolsKyStateResponse, IbexDevToolsSepaTopupInput, IbexDevToolsSepaTopupResponse } from "./types";
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
    companyCheckPeppol(input: IbexDevToolsCompanyCheckInput): Promise<IbexDevToolsCompanyCheckPeppolResponse>;
    domainUsers(query?: IbexDevToolsDomainUsersQuery): Promise<IbexDevToolsDomainUsersResponse>;
    domainUserById(externalUserId: string): Promise<IbexDevToolsDomainUserDetailResponse>;
    sepaTopup(input: IbexDevToolsSepaTopupInput): Promise<IbexDevToolsSepaTopupResponse>;
    cryptoTopup(input: IbexDevToolsCryptoTopupInput): Promise<IbexDevToolsCryptoTopupResponse>;
    private jsonFetch;
    private buildUrl;
    private buildPathWithQuery;
}
export declare function createIbexDevToolsClient(config: IbexDevToolsConfig): IbexDevToolsClient;
