import { IbexRealtimeClient } from "./realtime";
import { IbexDevToolsClient } from "./devtools";
import type { IbexDevToolsConfig, IbexAddAddressBookCryptoInput, IbexAddressBookEntryResponse, IbexAddressBookListResponse, IbexBalancesQuery, IbexCreateAddressBookEntryInput, IbexRefreshDetails, IbexRouteCapabilitiesQuery, IbexRouteCapabilitiesResponse, IbexRouteQuoteRequest, IbexRouteQuoteResponse, IbexRouteStatusResponse, IbexSafeEnableRecoveryOperation, IbexSafeExecuteRequest, IbexSafeExecuteResponse, IbexSafeOperationsRequest, IbexSafePrepareResponse, IbexSepaAddIbanRequest, IbexSepaAddIbanResponse, IbexSepaConfirmIbanAddRequest, IbexSepaConfirmIbanAddResponse, IbexSepaModifyIbanLabelRequest, IbexSepaModifyIbanLabelResponse, IbexSepaCancelMandateResponse, IbexSepaConfirmPaymentRequest, IbexSepaConfirmPaymentResponse, IbexSepaCreateMandateRequest, IbexSepaCreateMandateResponse, IbexSepaCreatePaymentIntentRequest, IbexSepaCreatePaymentIntentResponse, IbexSepaIbansResponse, IbexSepaMandateDetailResponse, IbexSepaMandatesResponse, IbexSepaTransactionDetailResponse, IbexSepaTransactionsQuery, IbexSepaTransactionsResponse, IbexSepaUpdateMandateStatusRequest, IbexSepaUpdateMandateStatusResponse, IbexChainsResponse, IbexConfirmEmailRequest, IbexConfirmEmailResponse, IbexConfirmSmsRequest, IbexConfirmSmsResponse, IbexSmsSignUpRequest, IbexSmsSignUpResponse, IbexSmsSignInStep1Request, IbexSmsSignInStep1Response, IbexSmsSignInConfirmRequest, IbexEmailRecoverRequest, IbexEmailRecoverResponse, IbexKycIframeRequest, IbexKycIframeResponse, IbexNormalizedBalances, IbexNormalizedProfile, IbexNormalizedTransactions, IbexRecoveryStatusResponse, IbexSdkConfig, IbexSwapQuoteQuery, IbexSwapQuoteResponse, IbexTokens, IbexTransactionsQuery, IbexUserAddressResponse, IbexUserBalancesResponse, IbexLendingQuery, IbexTokensQuery, IbexUserLendingResponse, IbexUserOperationsQuery, IbexUserOperationsResponse, IbexUserProfile, IbexUserSignersResponse, IbexUserTokensResponse, IbexVaultsQuery, IbexVaultsResponse, IbexUserTransactionsResponse, IbexUpdateAddressBookEntryInput, IbexValidateEmailRequest, IbexValidateEmailResponse, IbexValidateSmsRequest, IbexValidateSmsResponse, IbexWsConfig, IbexWsReconnectPolicy, JsonObject } from "./types";
export declare const IBEX_TOKEN_KEY = "ibex_jwt";
export declare const IBEX_REFRESH_TOKEN_KEY = "ibex_refresh_token";
export declare const IBEX_EXTERNAL_USER_ID_KEY = "ibex_external_user_id";
export declare const IBEX_SESSION_CHANGED_EVENT = "ibex_session_changed";
export declare class IbexSdk {
    private readonly apiBaseUrl;
    private readonly storage;
    private readonly fetchImpl;
    private readonly blockchainId;
    private readonly defaultHeaders;
    private readonly resolveRpIdFn;
    private readonly keyToken;
    private readonly keyRefreshToken;
    private readonly keyExternalUserId;
    constructor(config: IbexSdkConfig);
    resolveRpId(hostname?: string): string;
    getStoredToken(): string | null;
    getStoredRefreshToken(): string | null;
    getStoredExternalUserId(): string | null;
    setSession(tokens: IbexTokens, externalUserId?: string | null): void;
    clearSessionAndScopedStorage(): void;
    authenticateWithPasskey(): Promise<IbexTokens>;
    signUpWithSms(request: IbexSmsSignUpRequest): Promise<IbexSmsSignUpResponse>;
    signInWithSms(request: IbexSmsSignInStep1Request): Promise<IbexSmsSignInStep1Response>;
    confirmSmsSignIn(request: IbexSmsSignInConfirmRequest): Promise<IbexTokens>;
    refreshSession(): Promise<string>;
    refreshSessionDetailed(): Promise<IbexRefreshDetails>;
    withRefreshOnUnauthorized<T>(operation: (accessToken: string) => Promise<T>): Promise<T>;
    getMe(): Promise<IbexNormalizedProfile>;
    getMeRaw(): Promise<IbexUserProfile>;
    updateMeData(data: JsonObject): Promise<IbexUserProfile>;
    setAlertFlag(alertKey: string, enabled: boolean): Promise<IbexUserProfile>;
    removeAlertFlag(alertKey: string): Promise<IbexUserProfile>;
    getMeBalances(query?: IbexBalancesQuery): Promise<IbexNormalizedBalances>;
    getMeBalancesRaw(query?: IbexBalancesQuery): Promise<IbexUserBalancesResponse>;
    getMeTransactions(query?: IbexTransactionsQuery): Promise<IbexNormalizedTransactions>;
    getMeTransactionsRaw(query?: IbexTransactionsQuery): Promise<IbexUserTransactionsResponse>;
    getMeAddress(): Promise<IbexUserAddressResponse>;
    getMeSigners(): Promise<IbexUserSignersResponse>;
    getMeTokens(query?: IbexTokensQuery): Promise<IbexUserTokensResponse>;
    getMeLending(query?: IbexLendingQuery): Promise<IbexUserLendingResponse>;
    getChainTokens(query?: IbexTokensQuery): Promise<IbexUserTokensResponse>;
    getVaults(query?: IbexVaultsQuery): Promise<IbexVaultsResponse>;
    getChains(): Promise<IbexChainsResponse>;
    getRecoveryStatus(safeAddress: string): Promise<IbexRecoveryStatusResponse>;
    getMeOperations(query?: IbexUserOperationsQuery): Promise<IbexUserOperationsResponse>;
    validateEmail(request: IbexValidateEmailRequest): Promise<IbexValidateEmailResponse>;
    confirmEmail(request: IbexConfirmEmailRequest): Promise<IbexConfirmEmailResponse>;
    validateSms(request: IbexValidateSmsRequest): Promise<IbexValidateSmsResponse>;
    confirmSms(request: IbexConfirmSmsRequest): Promise<IbexConfirmSmsResponse>;
    getKycIframeUrl(request?: IbexKycIframeRequest): Promise<IbexKycIframeResponse>;
    recoverWithEmail(request: IbexEmailRecoverRequest): Promise<IbexEmailRecoverResponse>;
    getMeAddressBook(): Promise<IbexAddressBookListResponse>;
    createMeAddressBookEntry(input: IbexCreateAddressBookEntryInput): Promise<IbexAddressBookEntryResponse>;
    updateMeAddressBookEntry(id: string, input: IbexUpdateAddressBookEntryInput): Promise<IbexAddressBookEntryResponse>;
    deleteMeAddressBookEntry(id: string): Promise<IbexAddressBookEntryResponse>;
    addMeAddressBookCrypto(id: string, input: IbexAddAddressBookCryptoInput): Promise<IbexAddressBookEntryResponse>;
    deleteMeAddressBookCrypto(id: string, chainId: string | number, address: string): Promise<IbexAddressBookEntryResponse>;
    deleteMeAddressBookIban(id: string, iban: string): Promise<IbexAddressBookEntryResponse>;
    addSepaIban(payload: IbexSepaAddIbanRequest): Promise<IbexSepaAddIbanResponse>;
    confirmSepaIbanAdd(request: IbexSepaConfirmIbanAddRequest): Promise<IbexSepaConfirmIbanAddResponse>;
    modifySepaIbanLabel(request: IbexSepaModifyIbanLabelRequest): Promise<IbexSepaModifyIbanLabelResponse>;
    getSepaIbans(): Promise<IbexSepaIbansResponse>;
    createSepaPaymentIntent(payload: IbexSepaCreatePaymentIntentRequest): Promise<IbexSepaCreatePaymentIntentResponse>;
    confirmSepaPayment(payload: IbexSepaConfirmPaymentRequest): Promise<IbexSepaConfirmPaymentResponse>;
    getSepaTransactions(query?: IbexSepaTransactionsQuery): Promise<IbexSepaTransactionsResponse>;
    getSepaTransactionById(id: string): Promise<IbexSepaTransactionDetailResponse>;
    createSepaMandate(payload: IbexSepaCreateMandateRequest): Promise<IbexSepaCreateMandateResponse>;
    getSepaMandates(): Promise<IbexSepaMandatesResponse>;
    getSepaMandateById(id: string): Promise<IbexSepaMandateDetailResponse>;
    updateSepaMandateStatus(id: string, payload: IbexSepaUpdateMandateStatusRequest): Promise<IbexSepaUpdateMandateStatusResponse>;
    cancelSepaMandate(id: string): Promise<IbexSepaCancelMandateResponse>;
    prepareSafeOperations(request: IbexSafeOperationsRequest): Promise<IbexSafePrepareResponse>;
    executeSafeOperations(request: IbexSafeExecuteRequest): Promise<IbexSafeExecuteResponse>;
    signMessage(safeAddress: string, message: string, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    enableRecovery(safeAddress: string, identity: Omit<IbexSafeEnableRecoveryOperation, "type">, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    cancelRecovery(safeAddress: string, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    getSwapQuote(query: IbexSwapQuoteQuery): Promise<IbexSwapQuoteResponse>;
    getRouteCapabilities(query: IbexRouteCapabilitiesQuery): Promise<IbexRouteCapabilitiesResponse>;
    getRouteQuote(payload: IbexRouteQuoteRequest): Promise<IbexRouteQuoteResponse>;
    getRouteStatus(routeId: string): Promise<IbexRouteStatusResponse>;
    routeFromQuote(safeAddress: string, routeId: string, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    swapFromQuote(safeAddress: string, quoteId: string, options?: {
        orderUid?: string;
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    hyperliquidDeposit(safeAddress: string, amount: number, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    hyperliquidEnterVault(safeAddress: string, amount: number, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    hyperliquidWithdrawVault(safeAddress: string, amount: number, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    hyperliquidWithdraw(safeAddress: string, to: string, amount: number, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    morphoSupply(safeAddress: string, params: {
        amount: string;
        assetTicker: string;
        tokenAddress: string;
        decimals: number;
        vaultAddress: string;
    }, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    morphoWithdraw(safeAddress: string, params: {
        assetTicker: string;
        tokenAddress: string;
        decimals: number;
        vaultAddress: string;
        shares?: string;
        amount?: string;
    }, options?: {
        chainId?: number;
        walletMode?: IbexSafeOperationsRequest["walletMode"];
        eoaKeySelection?: IbexSafeOperationsRequest["eoaKeySelection"];
    }): Promise<IbexSafePrepareResponse>;
    createDevToolsClient(config: Omit<IbexDevToolsConfig, "apiBaseUrl" | "fetchImpl"> & {
        apiBaseUrl?: string;
    }): IbexDevToolsClient;
    createRealtimeClient(options?: {
        blockchainId?: string;
        clientName?: string;
        reconnect?: boolean | IbexWsReconnectPolicy;
        wsImpl?: IbexWsConfig["wsImpl"];
    }): IbexRealtimeClient;
    private jsonFetch;
    private jsonFetchWithMeta;
    private authenticatedJsonFetch;
    private withBlockchainHeader;
    private buildUrl;
    private buildPathWithQuery;
    private dispatchSessionChanged;
}
export declare function createIbexSdk(config: IbexSdkConfig): IbexSdk;
