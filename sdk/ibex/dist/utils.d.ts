import type { IbexNormalizedBalances, IbexNormalizedProfile, IbexNormalizedTransactions, IbexTokens, IbexUserBalancesResponse, IbexUserProfile, IbexUserTransactionsResponse, IbexWsRawMessage, JsonObject } from "./types";
export declare function defaultResolveRpId(hostname?: string): string;
export declare function isAuthStatusError(error: unknown): boolean;
export declare function toBase64Url(buffer: ArrayBuffer): string;
export declare function fromBase64Url(input: string): ArrayBuffer;
export declare function normalizeSignInOptions(payload: JsonObject): PublicKeyCredentialRequestOptions;
export declare function normalizeSignUpOptions(payload: JsonObject): PublicKeyCredentialCreationOptions;
export declare function serializeAssertion(credential: PublicKeyCredential): JsonObject;
export declare function serializeAttestation(credential: PublicKeyCredential): JsonObject;
export declare function extractAuthTokens(payload: unknown): IbexTokens | null;
export declare function normalizeUsersMePayload(payload: unknown): IbexUserProfile;
export declare function extractExternalUserId(profile: IbexUserProfile): string | null;
export declare function normalizeBalancesResponse(raw: IbexUserBalancesResponse): IbexNormalizedBalances;
export declare function normalizeTransactionsResponse(raw: IbexUserTransactionsResponse): IbexNormalizedTransactions;
export declare function unwrapSection(section: unknown): unknown;
export declare function normalizeUserProfileResponse(payload: JsonObject): IbexNormalizedProfile;
/**
 * Normalize a WS `balance_data` event payload (`msg.data`) into the same
 * `IbexNormalizedBalances` produced by `getMeBalances()`.
 */
export declare function normalizeWsBalanceData(wsData: JsonObject): IbexNormalizedBalances;
/**
 * Normalize a WS `transaction_data` event payload (`msg.data`) into the same
 * `IbexNormalizedTransactions` produced by `getMeTransactions()`.
 */
export declare function normalizeWsTransactionData(wsData: JsonObject): IbexNormalizedTransactions;
/**
 * Normalize a WS `user_data` event payload (`msg.data`) into the same
 * `IbexNormalizedProfile` produced by `getMe()`.
 * Handles both direct payloads and section-enveloped `{ status, data }` payloads.
 */
export declare function normalizeWsUserData(wsData: JsonObject): IbexNormalizedProfile;
/**
 * Parse a raw WS text frame into the standard `{ type, data, timestamp }` envelope.
 * Returns `null` if parsing fails.
 */
export declare function parseWsMessage(raw: string): IbexWsRawMessage | null;
