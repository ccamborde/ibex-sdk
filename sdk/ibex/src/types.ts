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

export type IbexUserResourceQuery = {
  walletAddress?: string;
  page?: number;
  limit?: number;
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
} & JsonObject;

export type IbexBalancesBucket = {
  tokens?: IbexBalanceToken[];
  pending?: JsonObject[];
  summary?: JsonObject;
} & JsonObject;

export type IbexUserBalancesResponse = {
  type?: string;
  identifier?: string;
  timestamp?: string;
  blockchainId?: string | number;
  prices_available?: boolean;
  balance?: IbexBalancesBucket;
  crypto?: JsonObject;
  fiat?: JsonObject;
  totals?: JsonObject;
} & JsonObject;

export type IbexTransaction = {
  transactionHash?: string;
  hash?: string;
  valueFormatted?: string;
  timestamp?: string | number;
} & JsonObject;

export type IbexUserTransactionsResponse = {
  type?: string;
  identifier?: string;
  blockchainId?: string | number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  data?: IbexTransaction[];
} & JsonObject;

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

export type IbexUserPoolsResponse = {
  type?: string;
  identifier?: string;
  blockchainId?: string | number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  data?: JsonObject[];
} & JsonObject;

export type IbexUserLendingResponse = {
  type?: string;
  identifier?: string;
  blockchainId?: string | number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  data?: JsonObject[];
} & JsonObject;

export type IbexSepaIban = {
  id?: string | number;
  iban?: string;
  formatted?: string;
  bic?: string;
  holderName?: string;
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
};

export type IbexSepaAddIbanResponse = {
  success?: boolean;
  data?: IbexSepaIban;
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

// --- Safe Operations ---

export type IbexSafeOperationType =
  | "SIGN_MESSAGE"
  | "ENABLE_RECOVERY"
  | "CANCEL_RECOVERY"
  | "TRANSFER_TOKEN"
  | "TRANSFER_EURe"
  | "SWAP_FROM_QUOTE"
  | "AAVE_SUPPLY"
  | "AAVE_WITHDRAW"
  | "ADD_OWNER"
  | "REMOVE_OWNER"
  | "CHANGE_THRESHOLD";

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

export type IbexSafeOperation =
  | IbexSafeSignMessageOperation
  | IbexSafeEnableRecoveryOperation
  | IbexSafeCancelRecoveryOperation
  | IbexSwapFromQuoteOperation
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
