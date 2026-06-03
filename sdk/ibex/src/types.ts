export type JsonObject = Record<string, unknown>;

export type IbexTokens = {
  accessToken: string;
  refreshToken: string | null;
};

export type IbexSession = IbexTokens & {
  externalUserId: string | null;
};

export type IbexSdkStorage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
};

export type IbexSdkConfig = {
  apiBaseUrl: string;
  blockchainId?: string;
  storagePrefix?: string;
  defaultHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
  storage?: IbexSdkStorage;
  resolveRpId?: (hostname?: string) => string;
};

export type IbexUserProfile = {
  externalUserId?: string;
  subject?: string;
  sub?: string;
  id?: string;
  data?: JsonObject;
  userdata?: JsonObject;
} & JsonObject;

// --- Normalized Profile (SDK output for GET /users/me) ---

export type IbexEoaAddress = {
  type: string;
  address: string;
};

export type IbexWalletInfo = {
  safeAddress: string;
  chainIds: number[];
  threshold?: number;
  primary?: boolean;
  createdAt?: string;
  updatedAt?: string;
  eoaAddresses: IbexEoaAddress[];
} & JsonObject;

export type IbexSigner = {
  id?: string;
  type?: string;
  typeDescription?: string;
  walletMode?: string;
  keyName?: string;
  keyDisplayName?: string;
  createdAt?: string;
  safesCount?: number;
} & JsonObject;

export type IbexKycStatus = {
  externalUserId?: string;
  kycLevel?: string;
  status?: string;
  verified?: boolean;
} & JsonObject;

export type IbexNormalizedProfile = {
  externalUserId?: string;
  rpId?: string;
  signerId?: string;
  wallets: IbexWalletInfo[];
  signers: IbexSigner[];
  ibans: JsonObject[];
  balances?: IbexNormalizedBalances;
  transactions?: IbexNormalizedTransactions;
  kycStatus?: IbexKycStatus;
  addressbook: JsonObject[];
  data?: JsonObject;
  errors?: Record<string, JsonObject>;
};

export type IbexHttpMeta = {
  payload: JsonObject;
  status: number;
  requestId: string | null;
  url: string;
};

export type IbexRefreshDetails = {
  tokens: IbexTokens;
  request: {
    url: string;
    path: string;
    body: JsonObject;
  };
  response: {
    status: number;
    requestId: string | null;
    payload: JsonObject;
  };
};

export type IbexHttpError = Error & {
  status?: number;
  requestId?: string | null;
  payload?: JsonObject;
  url?: string;
  requestBody?: JsonObject;
  path?: string;
};

export type IbexBalancesQuery = {
  walletAddress?: string;
  iban?: string;
  blockchainId?: string | number;
  includeZero?: boolean;
  includePrices?: boolean;
  page?: number;
  limit?: number;
};

export type IbexTransactionsQuery = {
  walletAddress?: string;
  iban?: string;
  scope?: "mixed" | "crypto" | "fiat";
  blockchainId?: string | number;
  startDate?: string;
  endDate?: string;
  direction?: string;
  tokenType?: string;
  tokenAddress?: string;
  hash?: string;
  page?: number;
  limit?: number;
  includePrices?: boolean;
};

export type IbexTokensQuery = {
  blockchainId?: string | number;
};

export type IbexLendingQuery = {
  userScoped?: boolean;
  blockchainId?: string | number;
};

export type IbexVaultsQuery = {
  provider?: "AAVE" | "MORPHO" | "HYPERLIQUID";
  blockchainId?: string | number;
};

export type IbexAddressBookCryptoRow = {
  chainId: string | number;
  address: string;
} & JsonObject;

export type IbexAddressBookIbanRow = {
  iban: string;
  vop?: string;
  vopResult?: string;
  matchedName?: string;
  respondingPspBic?: string;
  label?: string;
  verifiedAt?: string;
} & JsonObject;

export type IbexAddressBookEntry = {
  id: string;
  name: string;
  label?: string;
  userValidated?: boolean;
  createdAt?: string;
  updatedAt?: string;
  crypto?: IbexAddressBookCryptoRow[];
  ibans?: IbexAddressBookIbanRow[];
} & JsonObject;

export type IbexAddressBookListResponse = {
  success?: boolean;
  data?: IbexAddressBookEntry[];
} & JsonObject;

export type IbexAddressBookEntryResponse = {
  success?: boolean;
  data?: IbexAddressBookEntry;
} & JsonObject;

export type IbexCreateAddressBookEntryInput = {
  name: string;
  label?: string;
  userValidated?: boolean;
  crypto?: IbexAddressBookCryptoRow[];
  iban?: string;
  respondingPspBic?: string;
  remittanceInfo?: string;
};

export type IbexUpdateAddressBookEntryInput = {
  name?: string;
  label?: string;
  userValidated?: boolean;
};

export type IbexAddAddressBookCryptoInput = {
  chainId: string | number;
  address: string;
};

export type IbexBalanceToken = {
  tokenAddress?: string;
  primaryAddress?: string;
  secondaryAddress?: string | null;
  active?: boolean;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance?: string;
  tokenType?: string;
  status?: string;
  source?: string;
  price?: number;
  value?: number;
  price_usd?: number;
  price_eur?: number;
  value_usd?: string;
  value_eur?: string;
  price_updated_at?: string;
  price_source?: string;
} & JsonObject;

export type IbexBalancesBucket = {
  tokens?: IbexBalanceToken[];
  pending?: JsonObject[];
  summary?: JsonObject;
} & JsonObject;

/**
 * Aggregated mode: `crypto` is keyed by chainId, then by walletAddress.
 * Example: `crypto["421614"]["0xABC..."].tokens[]`
 */
export type IbexBalancesAggregatedCrypto = Record<string, Record<string, IbexBalancesBucket>>;

export type IbexBalancesAggregatedFiat = Record<string, Record<string, IbexBalancesBucket>>;

export type IbexBalancesTotals = {
  crypto_total_value_eur?: string;
  fiat_total_value_eur?: string;
  grand_total_value_eur?: string;
  crypto_total_value_usd?: string;
  fiat_total_value_usd?: string;
  grand_total_value_usd?: string;
  conversion_rate_eur_usd?: number;
} & JsonObject;

export type IbexUserBalancesResponse = {
  timestamp?: string;
  prices_available?: boolean;

  /** Scoped mode (single chain / single wallet / single IBAN) */
  type?: string;
  identifier?: string;
  blockchainId?: string | number;
  balance?: IbexBalancesBucket;

  /** Aggregated mode (all chains, no blockchainId filter) */
  crypto?: IbexBalancesAggregatedCrypto;
  fiat?: IbexBalancesAggregatedFiat;
  totals?: IbexBalancesTotals;
} & JsonObject;

// --- Normalized Balances (SDK output) ---

export type IbexWalletBalance = {
  chainId: string;
  walletAddress: string;
  tokens: IbexBalanceToken[];
  pending: JsonObject[];
};

export type IbexNormalizedBalances = {
  timestamp?: string;
  prices_available?: boolean;
  wallets: IbexWalletBalance[];
  totals?: IbexBalancesTotals;
};

export type IbexTransaction = {
  id?: number;
  blockNumber?: number;
  transactionHash?: string;
  hash?: string;
  timestamp?: string | number;
  from?: string;
  to?: string;
  tokenAddress?: string;
  primaryAddress?: string;
  secondaryAddress?: string | null;
  tokenType?: string;
  tokenId?: string | null;
  tokenSymbol?: string;
  value?: string;
  valueFormatted?: number | string;
  direction?: string;
  watchedAddress?: string;
  blockchainId?: string | number;
  active?: boolean;
  balance?: number | string;
  price_usd?: number;
  price_eur?: number;
  value_usd?: string;
  value_eur?: string;
  price_updated_at?: string;
  price_source?: string;
  createdAt?: string;
  updatedAt?: string;
} & JsonObject;

export type IbexTransactionPage = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: IbexTransaction[];
};

export type IbexUserTransactionsResponse = {
  type?: string;
  timestamp?: string;
  identifier?: string;
  blockchainId?: string | number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  data?: IbexTransaction[];
  crypto?: {
    timestamp?: string;
    transactions?: Record<string, IbexTransactionPage>;
    prices_available?: boolean;
  } & JsonObject;
  fiat?: JsonObject;
} & JsonObject;

// --- Normalized Transactions (SDK output) ---

export type IbexChainTransactions = {
  chainId: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  transactions: IbexTransaction[];
};

export type IbexFiatTransactions = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  transactions: JsonObject[];
};

export type IbexNormalizedTransactions = {
  type?: string;
  timestamp?: string;
  prices_available?: boolean;
  chains: IbexChainTransactions[];
  fiat?: IbexFiatTransactions;
};

export type IbexUserAddressResponse = {
  type?: string;
  identifier?: string;
  blockchainId?: string | number;
  wallets?: JsonObject[];
  chains?: JsonObject[];
} & JsonObject;

export type IbexUserSignersResponse = {
  signers?: JsonObject[];
} & JsonObject;

export type IbexUserTokensResponse = {
  type?: string;
  identifier?: string;
  blockchainId?: string | number;
  data?: JsonObject[];
  tokens?: JsonObject[];
} & JsonObject;

export type IbexLendingEntry = {
  id: number;
  blockchainId: string;
  provider: "AAVE" | "MORPHO" | "HYPERLIQUID";
  address: string;
  name: string | null;
  assetTicker: string | null;
  assetAddress: string | null;
  assetDecimals: number | null;
  apy: number | null;
  tvl: number | null;
  isDefault: boolean;
  acceptedTokenAddresses?: string[] | null;
  leader?: string | null;
  leaderCommission?: number | null;
} & JsonObject;

export type IbexUserLendingResponse = IbexLendingEntry[];

export type IbexVaultEntry = {
  id: number;
  blockchainId: string;
  provider: "AAVE" | "MORPHO" | "HYPERLIQUID";
  poolAddress: string;
  name: string;
  assetTicker: string;
  assetAddress: string;
  assetDecimals: number;
  apy: number | null;
  tvl: number | null;
  isDefault: boolean;
  metadata?: JsonObject;
  supplyToken?: { address: string; symbol: string; name: string; decimals: number };
} & JsonObject;

export type IbexVaultsResponse = IbexVaultEntry[];

export type IbexSepaIban = {
  id?: string | number;
  iban?: string;
  formatted?: string;
  bic?: string;
  holderName?: string;
  label?: string;
  externStack?: string;
  accountNumber?: string;
  bankCode?: string;
  branchCode?: string;
  dateUsed?: string;
  status?: string;
  safeAddress?: string;
  blockchainId?: string | number;
} & JsonObject;

export type IbexSepaAddIbanRequest = {
  holderName: string;
  safeAddress?: string;
  blockchainId?: number;
  label?: string;
};

export type IbexSepaAddIbanApproval = {
  approvalId?: string;
  approvalHash?: string;
  expiresAt?: string;
  credentialRequestOptions?: IbexSepaCredentialRequestOptions;
} & JsonObject;

export type IbexSepaAddIbanResponse = {
  success?: boolean;
  data?: IbexSepaIban | IbexSepaAddIbanApproval;
} & JsonObject;

export type IbexSepaConfirmIbanAddRequest = {
  approvalId: string;
  credential: JsonObject;
};

export type IbexSepaConfirmIbanAddResponse = {
  success?: boolean;
  data?: {
    approvalId?: string;
    approvalHash?: string;
    iban?: IbexSepaIban;
  } & JsonObject;
} & JsonObject;

export type IbexSepaModifyIbanLabelRequest = {
  iban: string;
  label: string;
};

export type IbexSepaModifyIbanLabelResponse = {
  success?: boolean;
  data?: {
    iban?: string;
    label?: string;
  } & JsonObject;
} & JsonObject;

export type IbexSepaIbansResponse = {
  success?: boolean;
  data?: IbexSepaIban[];
} & JsonObject;

export type IbexSepaPaymentChannel = "SEPA" | "SEPAINSTANT";

export type IbexSepaPaymentParty = {
  name: string;
  iban: string;
} & JsonObject;

export type IbexSepaCreatePaymentIntentRequest = {
  reference: string;
  channel: IbexSepaPaymentChannel;
  amount: string;
  currency: string;
  remittanceInfo?: string;
  debtor: IbexSepaPaymentParty;
  creditor: IbexSepaPaymentParty;
};

export type IbexSepaCredentialRequestOptions = {
  challenge?: string;
  timeout?: number;
  rpId?: string;
  userVerification?: string;
  allowCredentials?: JsonObject[];
} & JsonObject;

export type IbexSepaPaymentIntent = {
  approvalId?: string;
  approvalHash?: string;
  expiresAt?: string;
  credentialRequestOptions?: IbexSepaCredentialRequestOptions;
} & JsonObject;

export type IbexSepaCreatePaymentIntentResponse = {
  success?: boolean;
  data?: IbexSepaPaymentIntent;
} & JsonObject;

export type IbexSepaConfirmPaymentRequest = {
  approvalId: string;
  credential: JsonObject;
};

export type IbexSepaPaymentExecution = {
  success?: boolean;
  message?: string;
  data?: JsonObject;
} & JsonObject;

export type IbexSepaConfirmPaymentData = {
  approvalId?: string;
  approvalHash?: string;
  payment?: IbexSepaPaymentExecution;
} & JsonObject;

export type IbexSepaConfirmPaymentResponse = {
  success?: boolean;
  data?: IbexSepaConfirmPaymentData;
} & JsonObject;

export type IbexSepaTransactionType = "SEPA_IN" | "SEPA_OUT";

export type IbexSepaTransactionsQuery = {
  iban?: string;
  type?: IbexSepaTransactionType;
  status?: string;
  statusCode?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type IbexSepaTransaction = {
  id?: string;
  iban?: string;
  type?: string;
  status?: string;
  statusCode?: string;
  amount?: string;
  currency?: string;
  senderIban?: string;
  beneficiaryIban?: string;
  reference?: string;
  createdAt?: string;
} & JsonObject;

export type IbexSepaTransactionsPagination = {
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
} & JsonObject;

export type IbexSepaTransactionsResponse = {
  success?: boolean;
  data?: IbexSepaTransaction[];
  pagination?: IbexSepaTransactionsPagination;
} & JsonObject;

export type IbexSepaTransactionDetailResponse = {
  success?: boolean;
  data?: JsonObject;
} & JsonObject;

export type IbexSepaMandateStatus = "validated" | "suspended" | "cancelled";

export type IbexSepaMandateWhitelistRule = {
  kind?: string;
  operator?: string;
  values?: string[];
  minAmount?: string;
  maxAmount?: string;
  currency?: string;
} & JsonObject;

export type IbexSepaMandateTrigger = {
  mode?: "all" | "whitelist";
  whitelistRules?: IbexSepaMandateWhitelistRule[];
} & JsonObject;

export type IbexSepaMandateRouting = {
  sourceIban?: string;
  sourceName?: string;
  sourceBic?: string;
  destinationIban?: string;
  destinationName?: string;
  destinationBic?: string;
} & JsonObject;

export type IbexSepaMandateAllocation = {
  percent?: number;
} & JsonObject;

export type IbexSepaMandateSignature = {
  message?: string;
  signature?: string;
  messageHash?: string;
  signatureHash?: string;
  safeOperationUserOpHash?: string;
  signatureCapturedAt?: string;
} & JsonObject;

export type IbexSepaMandate = {
  id?: string;
  status?: IbexSepaMandateStatus;
  position?: number;
  routing?: IbexSepaMandateRouting;
  allocation?: IbexSepaMandateAllocation;
  trigger?: IbexSepaMandateTrigger;
  signature?: IbexSepaMandateSignature;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
} & JsonObject;

export type IbexSepaCreateMandateSignatureInput = {
  message: string;
  signature: string;
  safeOperationUserOpHash?: string;
};

export type IbexSepaCreateMandateRequest = {
  sourceIban: string;
  destinationIban: string;
  destinationName?: string;
  destinationBic?: string;
  percent: number;
  trigger?: IbexSepaMandateTrigger;
  signature: IbexSepaCreateMandateSignatureInput;
};

export type IbexSepaCreateMandateResponse = {
  success?: boolean;
  data?: IbexSepaMandate;
  sepaSync?: JsonObject;
} & JsonObject;

export type IbexSepaMandatesResponse = {
  success?: boolean;
  data?: IbexSepaMandate[];
} & JsonObject;

export type IbexSepaMandateDetailResponse = {
  success?: boolean;
  data?: IbexSepaMandate;
} & JsonObject;

export type IbexSepaUpdateMandateStatusRequest = {
  status: IbexSepaMandateStatus;
};

export type IbexSepaUpdateMandateStatusResponse = {
  success?: boolean;
  data?: IbexSepaMandate;
  sepaSync?: JsonObject;
} & JsonObject;

export type IbexSepaCancelMandateResponse = {
  success?: boolean;
  data?: IbexSepaMandate;
  sepaSync?: JsonObject;
} & JsonObject;

// --- Recovery Status ---

export type IbexRecoveryOperation = {
  userOpHash?: string;
  transactionHash?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
} & JsonObject;

export type IbexRecoveryStatusResponse = {
  safeAddress?: string;
  recoveryEnabled?: boolean;
  recoveryAddress?: string | null;
  delay?: number | null;
  pendingRecovery?: boolean;
  canExecute?: boolean;
  executeAfter?: string | null;
  dataRecovery?: boolean;
  pending?: IbexRecoveryOperation[];
  executed?: IbexRecoveryOperation[];
  userOpHash?: string | null;
  transactionHash?: string | null;
} & JsonObject;

// --- User Operations ---

export type IbexUserOperationSignature = {
  createdAt?: string;
  data?: JsonObject;
  signerId?: string;
} & JsonObject;

export type IbexSafeOperationDetail = {
  userOpHash?: string;
  createdAt?: string;
  updatedAt?: string;
  paymaster?: string;
  status?: "CREATED" | "SIGNED" | "EXECUTED" | "CONFIRMED" | "FAILED";
  error?: string | null;
  safeAddress?: string;
  transactionHash?: string | null;
  signatures?: IbexUserOperationSignature[];
} & JsonObject;

export type IbexUserOperation = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  index?: number;
  type?: string;
  data?: JsonObject;
  safeOperation?: IbexSafeOperationDetail;
} & JsonObject;

export type IbexUserOperationsQuery = {
  status?: string;
  limit?: number;
  offset?: number;
};

export type IbexUserOperationsResponse = {
  data?: Record<string, IbexUserOperation[]>;
} & JsonObject;

// --- Email Validation ---

export type IbexValidateEmailRequest = {
  email: string;
  externalUserId: string;
};

export type IbexValidateEmailResponse = JsonObject;

export type IbexConfirmEmailRequest = {
  email: string;
  code: string;
  externalUserId: string;
};

export type IbexConfirmEmailResponse = JsonObject;

// --- SMS Verification ---

export type IbexValidateSmsRequest = {
  telephone: string;
  externalUserId: string;
  phonePolicy?: "frMobile" | "any";
};

export type IbexValidateSmsResponse = JsonObject;

export type IbexConfirmSmsRequest = {
  telephone: string;
  code: string;
  externalUserId: string;
  phonePolicy?: "frMobile" | "any";
  persistTelephoneToKyb?: boolean;
};

export type IbexConfirmSmsResponse = {
  smsVerified?: boolean;
  telephone?: string;
} & JsonObject;

// --- SMS Authentication (wallet=sms) ---

export type IbexSmsSignUpRequest = {
  telephone: string;
  phonePolicy?: "frMobile" | "any";
  smsDryRun?: boolean;
  email?: string;
  companyRegistrationNumber?: string;
};

export type IbexSmsSignUpResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  authMethod: "SMS";
  hasPasskey: boolean;
  wallet: "sms";
  externalUserId: string;
  sessionId?: string;
  chatbotFullURL?: string;
  code?: string;
} & JsonObject;

export type IbexSmsSignInStep1Request = {
  telephone: string;
  phonePolicy?: "frMobile" | "any";
  smsDryRun?: boolean;
};

export type IbexSmsSignInStep1Response = {
  wallet: "sms";
  code?: string;
} & JsonObject;

export type IbexSmsSignInConfirmRequest = {
  telephone: string;
  code: string;
  phonePolicy?: "frMobile" | "any";
};

// --- KYC Iframe ---

export type IbexKycIframeRequest = {
  language?: string;
  requireSmsVerification?: boolean;
};

export type IbexKycIframeResponse = {
  chatbotURL?: string;
  sessionId?: string;
  chatbotFullURL?: string;
  alreadySent?: boolean;
} & JsonObject;

// --- Email Recovery (Public) ---

export type IbexEmailRecoverRequest = {
  email: string;
  emailOtp?: string;
  code?: string;
  externalUserId?: string;
} & JsonObject;

export type IbexEmailRecoverResponse = JsonObject;

// --- Safe Operations ---

export type IbexSafeOperationType =
  | "SIGN_MESSAGE"
  | "ENABLE_RECOVERY"
  | "CANCEL_RECOVERY"
  | "TRANSFER_TOKEN"
  | "TRANSFER_EURe"
  | "SWAP_FROM_QUOTE"
  | "ROUTE_FROM_QUOTE"
  | "AAVE_SUPPLY"
  | "AAVE_WITHDRAW"
  | "MORPHO_SUPPLY"
  | "MORPHO_WITHDRAW"
  | "ADD_OWNER"
  | "REMOVE_OWNER"
  | "CHANGE_THRESHOLD"
  | "HYPERLIQUID_DEPOSIT"
  | "HYPERLIQUID_ENTER_VAULT"
  | "HYPERLIQUID_WITHDRAW_VAULT"
  | "HYPERLIQUID_WITHDRAW";

export type IbexSafeSignMessageOperation = {
  type: "SIGN_MESSAGE";
  message: string;
};

export type IbexSafeEnableRecoveryOperation = {
  type: "ENABLE_RECOVERY";
  firstName: string;
  lastName: string;
  birthDate: string;
  birthCity: string;
  birthCountry: string;
};

export type IbexSafeCancelRecoveryOperation = {
  type: "CANCEL_RECOVERY";
};

export type IbexSwapFromQuoteOperation = {
  type: "SWAP_FROM_QUOTE";
  quoteId: string;
  orderUid?: string;
};

export type IbexRouteFromQuoteOperation = {
  type: "ROUTE_FROM_QUOTE";
  quoteId: string;
};

export type IbexHyperliquidDepositOperation = {
  type: "HYPERLIQUID_DEPOSIT";
  hyperliquidData: { action: "DEPOSIT"; amount: number };
};

export type IbexHyperliquidEnterVaultOperation = {
  type: "HYPERLIQUID_ENTER_VAULT";
  hyperliquidData: { action: "ENTER_VAULT"; amount: number };
};

export type IbexHyperliquidWithdrawVaultOperation = {
  type: "HYPERLIQUID_WITHDRAW_VAULT";
  hyperliquidData: { action: "WITHDRAW"; amount: number };
};

export type IbexHyperliquidWithdrawOperation = {
  type: "HYPERLIQUID_WITHDRAW";
  hyperliquidData: { action: "WITHDRAW_WALLET"; to: string; amount: number };
};

export type IbexMorphoSupplyOperation = {
  type: "MORPHO_SUPPLY";
  amount: string;
  assetTicker: string;
  tokenAddress: string;
  decimals: number;
  vaultAddress: string;
};

export type IbexMorphoWithdrawOperation = {
  type: "MORPHO_WITHDRAW";
  shares?: string;
  amount?: string;
  assetTicker: string;
  tokenAddress: string;
  decimals: number;
  vaultAddress: string;
};

export type IbexSafeOperation =
  | IbexSafeSignMessageOperation
  | IbexSafeEnableRecoveryOperation
  | IbexSafeCancelRecoveryOperation
  | IbexSwapFromQuoteOperation
  | IbexRouteFromQuoteOperation
  | IbexHyperliquidDepositOperation
  | IbexHyperliquidEnterVaultOperation
  | IbexHyperliquidWithdrawVaultOperation
  | IbexHyperliquidWithdrawOperation
  | IbexMorphoSupplyOperation
  | IbexMorphoWithdrawOperation
  | (JsonObject & { type: string });

export type IbexSafeWalletMode = "SAFE_4337" | "EOA_7702";

export type IbexSafeEoaKeySelection = {
  family: string;
  index: number;
  safeAddress?: string;
};

export type IbexSafeOperationsRequest = {
  safeAddress: string;
  operations: IbexSafeOperation[];
  chainId?: number;
  signerId?: string;
  walletMode?: IbexSafeWalletMode;
  eoaKeySelection?: IbexSafeEoaKeySelection;
};

export type IbexSafeCredentialRequestOptions = {
  challenge?: string;
  rpId?: string;
  timeout?: number;
  allowCredentials?: JsonObject[];
  userVerification?: string;
  extensions?: JsonObject;
  data?: JsonObject;
} & JsonObject;

export type IbexSafePrepareResponse = {
  credentialRequestOptions?: IbexSafeCredentialRequestOptions;
} & JsonObject;

export type IbexSafeExecuteRequest = {
  credential: JsonObject;
  chainId?: number;
};

export type IbexSafeExecuteResponse = {
  userOpHash?: string;
  txHash?: string;
  walletMode?: string;
  success?: boolean;
} & JsonObject;

// --- Chains ---

export type IbexChainModules = {
  billing?: boolean;
  cowswap?: boolean;
  recovery?: boolean;
  automation?: boolean;
  bridge?: boolean;
  routeEngine?: boolean;
} & JsonObject;

export type IbexChain = {
  id: number;
  name?: string;
  modules?: IbexChainModules;
} & JsonObject;

export type IbexChainsResponse = IbexChain[];

// --- Swap Quote ---

export type IbexSwapQuoteProvider = "COWSWAP" | "1INCH" | "BOTH";

export type IbexSwapQuoteQuery = {
  sellTokenAddress: string;
  buyTokenAddress: string;
  amount: string;
  chainId?: number;
  safeAddress?: string;
  provider?: IbexSwapQuoteProvider;
};

export type IbexSwapQuoteResponse = {
  quoteId?: string;
  orderUid?: string;
  buyAmount?: string;
  sellAmount?: string;
  fee?: string;
  validUntil?: string;
  provider?: string;
} & JsonObject;

// --- Unified Route Engine ---

export type IbexRouteMode = "SAME_CHAIN_SWAP" | "CROSS_CHAIN_BRIDGE" | "UNSUPPORTED";

export type IbexRouteStatus =
  | "CREATED"
  | "SOURCE_PREPARED"
  | "SOURCE_SUBMITTED"
  | "SOURCE_CONFIRMED"
  | "DEST_PENDING"
  | "DEST_COMPLETED"
  | "FAILED"
  | string;

export type IbexRouteProvider = "COWSWAP" | "1INCH" | "BRIDGE" | string;

export type IbexRouteCapabilitiesQuery = {
  sourceChainId: number;
  destinationChainId: number;
};

export type IbexRouteCapabilitiesResponse = {
  mode?: IbexRouteMode;
  providers?: IbexRouteProvider[];
} & JsonObject;

export type IbexRouteQuoteRequest = {
  sourceChainId: number;
  destinationChainId: number;
  sellTokenAddress: string;
  buyTokenAddress: string;
  amount: string;
  safeAddress?: string;
  provider?: IbexRouteProvider;
} & JsonObject;

export type IbexRouteQuoteResponse = {
  routeId?: string;
  mode?: IbexRouteMode;
  provider?: IbexRouteProvider;
  buyAmount?: string;
  sellAmount?: string;
  candidates?: JsonObject[];
} & JsonObject;

export type IbexRouteStatusResponse = {
  routeId?: string;
  status?: IbexRouteStatus;
  mode?: IbexRouteMode;
  sourceUserOpHash?: string | null;
  transactionHash?: string | null;
} & JsonObject;

// --- WebSocket / Realtime ---

export type IbexWsReconnectPolicy = {
  enabled?: boolean;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export type IbexWsConfig = {
  apiBaseUrl: string;
  blockchainId?: string;
  clientName?: string;
  getToken: () => string | null;
  onTokenExpired?: () => void;
  reconnect?: boolean | IbexWsReconnectPolicy;
  wsImpl?: { new (url: string | URL, protocols?: string | string[]): WebSocket };
};

export type IbexWsAuthSuccess = {
  safeAddress: string;
  message?: string;
};

export type IbexWsAuthError = {
  message: string;
  error_code?: string;
  existingConnectionId?: string;
  context?: string;
};

export type IbexWsBalanceUpdate = {
  address: string;
  balance: string;
  updated_at: string;
};

export type IbexWsNewTransaction = {
  address: string;
  newTransaction: {
    hash: string;
    blockNumber?: number;
    timestamp?: string;
    from?: string;
    to?: string;
    tokenAddress?: string;
    tokenType?: string;
    tokenSymbol?: string;
    value?: string;
    direction?: string;
  } & JsonObject;
  recentTransactions?: JsonObject[];
  transactionCount?: number;
  historyLimit?: number;
};

export type IbexWsFiatBalanceUpdate = {
  iban: string;
  balance: string;
  currency: string;
  updated_at: string;
  externalUserId?: string;
};

export type IbexWsFiatTransactionUpdate = {
  iban: string;
  transactionId: string;
  event: string;
  status: string;
  previousStatus?: string | null;
  amount: string;
  currency: string;
  externalUserId?: string;
};

export type IbexWsChainIdData = {
  defaultChainId: number;
  supportedChainIds: number[];
};

export type IbexWsSignalEvent = {
  [key: string]: string;
};

export type IbexWsError = {
  message: string;
  context?: string;
  error_code?: string;
  error?: string;
};

export type IbexWsCloseEvent = {
  code: number;
  reason: string;
};

export type IbexWsRawMessage = {
  type: string;
  data: JsonObject;
  timestamp?: string;
};

export type IbexWsEventMap = {
  open: undefined;
  close: IbexWsCloseEvent;
  auth_success: IbexWsAuthSuccess;
  auth_error: IbexWsAuthError;
  connection_success: IbexWsAuthSuccess;
  balance_data: IbexNormalizedBalances;
  transaction_data: IbexNormalizedTransactions;
  user_data: IbexNormalizedProfile;
  balance_update: IbexWsBalanceUpdate;
  new_transaction: IbexWsNewTransaction;
  fiat_balance_update: IbexWsFiatBalanceUpdate;
  fiat_transaction_update: IbexWsFiatTransactionUpdate;
  chainid_data: IbexWsChainIdData;
  recovery_data: IbexRecoveryStatusResponse;
  user_iban_updated: IbexWsSignalEvent;
  user_ky_updated: IbexWsSignalEvent;
  error: IbexWsError;
  raw: IbexWsRawMessage;
};

// --- DevTools (Admin / Development tooling) ---

export type IbexDevToolsBasicAuth = {
  username: string;
  password: string;
};

export type IbexDevToolsConfig = {
  apiBaseUrl: string;
  apiKey?: string;
  basicAuth?: IbexDevToolsBasicAuth;
  rpId?: string;
  defaultHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
};

export type IbexDevToolsKyListQuery = {
  page?: number;
  limit?: number;
};

export type IbexDevToolsKyListItem = {
  user_id?: string;
  entity_type?: string;
  ky_state_id?: number;
  ky_state_code?: string;
} & JsonObject;

export type IbexDevToolsKyListResponse = {
  items: IbexDevToolsKyListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} & JsonObject;

export type IbexDevToolsKyStateResponse = {
  state?: string;
  kyStateCode?: string;
  allowedStates?: number[];
} & JsonObject;

export type IbexDevToolsKySetStateInput = {
  externalUserId: string;
  newStateId: 2 | 3 | 4 | 5 | 22 | 23 | 55;
  entityType?: "individual" | "company";
  firstName?: string;
  lastName?: string;
  companyName?: string;
};

export type IbexDevToolsKySetStateResponse = {
  success?: boolean;
  fromStateId?: number;
  toStateId?: number;
} & JsonObject;

export type IbexDevToolsKyEnrollInput = {
  externalUserId: string;
  language?: string;
  email?: string;
  trustedEmail?: boolean;
  rpId?: string;
  data?: JsonObject;
};

export type IbexDevToolsKyEnrollResponse = {
  sessionId?: string;
  chatbotURL?: string;
  chatbotFullURL?: string;
} & JsonObject;

export type IbexDevToolsKybEnrollInput = {
  externalUserId: string;
  email: string;
  companyRegistrationNumber: string;
  submit?: boolean;
  idDocumentPage1?: string;
  idDocumentPage2?: string;
  rpId?: string;
  returnUrl?: string;
};

export type IbexDevToolsKybEnrollResponse = {
  sessionId?: string;
  chatbotFullURL?: string;
} & JsonObject;

export type IbexDevToolsKySmsVerifiedInput = {
  externalUserId: string;
  smsVerifiedTelephone?: string;
  smsVerifiedAt?: string;
};

export type IbexDevToolsKySmsVerifiedResponse = {
  success: boolean;
  kyCustomerId: number;
  smsVerifiedTelephone: string;
  smsVerifiedAt: string;
};

export type IbexDevToolsCompanyCheckInput = {
  siren: string;
};

export type IbexDevToolsCompanyCheckResponse = {
  success: boolean;
  data: { result: "OK" | "KO" } & JsonObject;
};

export type IbexDevToolsSepaTopupInput = {
  targetIban: string;
  targetName?: string;
  amount?: string;
  amountEur?: number;
  channel?: "SEPA" | "SEPAINSTANT";
  remittanceInfo?: string;
};

export type IbexDevToolsSepaTopupResponse = {
  success: boolean;
  data: {
    source?: JsonObject;
    identity?: JsonObject;
    payment?: JsonObject;
  } & JsonObject;
};

export type IbexDevToolsCryptoTopupInput = {
  externalUserId: string;
  wallet?: string;
};

export type IbexDevToolsCryptoTopupResponse = {
  success?: boolean;
  wallet?: string;
  token?: string;
  amount?: string;
  txHash?: string;
} & JsonObject;
