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
