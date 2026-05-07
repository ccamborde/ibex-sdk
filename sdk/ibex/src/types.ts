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
  includeZero?: boolean;
  includePrices?: boolean;
  page?: number;
  limit?: number;
};

export type IbexTransactionsQuery = {
  walletAddress?: string;
  page?: number;
  limit?: number;
};

export type IbexUserResourceQuery = {
  walletAddress?: string;
  page?: number;
  limit?: number;
};

export type IbexBalanceToken = {
  tokenAddress?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance?: string;
  tokenType?: string;
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
