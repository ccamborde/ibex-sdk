import type {
  IbexBalancesBucket,
  IbexBalancesTotals,
  IbexBalanceToken,
  IbexChainTransactions,
  IbexEoaAddress,
  IbexKycStatus,
  IbexNormalizedBalances,
  IbexNormalizedProfile,
  IbexNormalizedTransactions,
  IbexSigner,
  IbexTokens,
  IbexTransaction,
  IbexTransactionPage,
  IbexUserBalancesResponse,
  IbexUserProfile,
  IbexUserTransactionsResponse,
  IbexWalletBalance,
  IbexWalletInfo,
  IbexWsRawMessage,
  JsonObject,
} from "./types";

export function defaultResolveRpId(
  hostname: string = typeof window !== "undefined" ? window.location.hostname : "localhost",
): string {
  const host = hostname.toLowerCase().trim();
  if (!host) return "localhost";
  if (host.endsWith(".ibex.fi") || host === "ibex.fi") return "ibex.fi";
  // Keep exact host for custom integration domains (e.g. widget-light.local).
  return host;
}

export function isAuthStatusError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const msg = raw.toLowerCase();
  return msg.includes(" 401") || msg.includes(" 403") || msg.includes("unauthorized") || msg.includes("forbidden");
}

export function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function fromBase64Url(input: string): ArrayBuffer {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function toBufferSource(value: unknown): ArrayBuffer | ArrayBufferView | undefined {
  if (typeof value === "string") {
    return fromBase64Url(value);
  }
  if (value instanceof ArrayBuffer) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    return value;
  }
  return undefined;
}

function decodePrfValues(values: JsonObject): JsonObject {
  return {
    ...values,
    first: toBufferSource(values.first),
    second: toBufferSource(values.second),
  };
}

function decodeExtensions(extensions: unknown): AuthenticationExtensionsClientInputs | undefined {
  if (!extensions || typeof extensions !== "object") {
    return undefined;
  }
  const ext = extensions as JsonObject;
  const out: JsonObject = { ...ext };
  const prf = out.prf;
  if (!prf || typeof prf !== "object") {
    return out as unknown as AuthenticationExtensionsClientInputs;
  }

  const prfObj = { ...(prf as JsonObject) };
  if (prfObj.eval && typeof prfObj.eval === "object") {
    prfObj.eval = decodePrfValues(prfObj.eval as JsonObject);
  }
  if (prfObj.evalByCredential && typeof prfObj.evalByCredential === "object") {
    const evalByCredential = prfObj.evalByCredential as JsonObject;
    prfObj.evalByCredential = Object.fromEntries(
      Object.entries(evalByCredential).map(([key, value]) => {
        if (value && typeof value === "object") {
          return [key, decodePrfValues(value as JsonObject)];
        }
        return [key, value];
      }),
    );
  }
  out.prf = prfObj;
  return out as unknown as AuthenticationExtensionsClientInputs;
}

export function normalizeSignInOptions(payload: JsonObject): PublicKeyCredentialRequestOptions {
  const options = (payload.credentialRequestOptions || payload.publicKey || payload) as JsonObject;
  const challenge = String(options.challenge || "");
  const allowCredentialsRaw = Array.isArray(options.allowCredentials) ? options.allowCredentials : [];
  const allowCredentials = allowCredentialsRaw
    .filter((c): c is JsonObject => Boolean(c) && typeof c === "object")
    .map((c) => ({
      id: fromBase64Url(String(c.id || "")),
      type: String(c.type || "public-key") as PublicKeyCredentialType,
      transports: Array.isArray(c.transports) ? (c.transports as AuthenticatorTransport[]) : undefined,
    }));

  let extensions: AuthenticationExtensionsClientInputs | undefined;
  const ext = options.extensions as JsonObject | undefined;
  if (ext && typeof ext === "object") {
    const prf = ext.prf as JsonObject | undefined;
    const evalObj = prf?.eval as JsonObject | undefined;
    const first = typeof evalObj?.first === "string" ? fromBase64Url(evalObj.first) : undefined;
    if (first) {
      extensions = {
        prf: {
          eval: {
            first,
          },
        },
      } as AuthenticationExtensionsClientInputs;
    }
  }

  return {
    challenge: fromBase64Url(challenge),
    rpId: typeof options.rpId === "string" ? options.rpId : undefined,
    timeout: typeof options.timeout === "number" ? options.timeout : undefined,
    userVerification:
      typeof options.userVerification === "string"
        ? (options.userVerification as UserVerificationRequirement)
        : undefined,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    extensions,
  };
}

export function normalizeSignUpOptions(payload: JsonObject): PublicKeyCredentialCreationOptions {
  const options = (payload.credentialRequestOptions || payload.publicKey || payload) as JsonObject;
  const rpRaw = options.rp && typeof options.rp === "object" ? (options.rp as JsonObject) : {};
  const userRaw = options.user && typeof options.user === "object" ? (options.user as JsonObject) : {};
  const paramsRaw = Array.isArray(options.pubKeyCredParams) ? options.pubKeyCredParams : [];
  const excludeRaw = Array.isArray(options.excludeCredentials) ? options.excludeCredentials : [];

  const pubKeyCredParams = paramsRaw
    .filter((p): p is JsonObject => Boolean(p) && typeof p === "object")
    .map((p) => ({
      type: String(p.type || "public-key") as PublicKeyCredentialType,
      alg: Number(p.alg || -7),
    }));

  const excludeCredentials = excludeRaw
    .filter((c): c is JsonObject => Boolean(c) && typeof c === "object")
    .map((c) => ({
      id: fromBase64Url(String(c.id || "")),
      type: String(c.type || "public-key") as PublicKeyCredentialType,
      transports: Array.isArray(c.transports) ? (c.transports as AuthenticatorTransport[]) : undefined,
    }));

  return {
    challenge: fromBase64Url(String(options.challenge || "")),
    rp: {
      id: typeof rpRaw.id === "string" ? rpRaw.id : undefined,
      name: String(rpRaw.name || (typeof window !== "undefined" ? window.location.hostname : "ibex-sdk")),
    },
    user: {
      id: fromBase64Url(String(userRaw.id || "")),
      name: String(userRaw.name || "ibex-user"),
      displayName: String(userRaw.displayName || userRaw.name || "IBEx user"),
    },
    pubKeyCredParams,
    timeout: typeof options.timeout === "number" ? options.timeout : undefined,
    attestation:
      typeof options.attestation === "string" ? (options.attestation as AttestationConveyancePreference) : undefined,
    authenticatorSelection:
      options.authenticatorSelection && typeof options.authenticatorSelection === "object"
        ? (options.authenticatorSelection as AuthenticatorSelectionCriteria)
        : undefined,
    excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
    extensions: decodeExtensions(options.extensions),
  };
}

export function serializeAssertion(credential: PublicKeyCredential): JsonObject {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      authenticatorData: toBase64Url(response.authenticatorData),
      clientDataJSON: toBase64Url(response.clientDataJSON),
      signature: toBase64Url(response.signature),
      userHandle: response.userHandle ? toBase64Url(response.userHandle) : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

export function serializeAttestation(credential: PublicKeyCredential): JsonObject {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    response: {
      attestationObject: toBase64Url(response.attestationObject),
      clientDataJSON: toBase64Url(response.clientDataJSON),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

export function extractAuthTokens(payload: unknown): IbexTokens | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as JsonObject;
  const accessToken =
    typeof obj.access_token === "string" && obj.access_token.length > 0
      ? obj.access_token
      : typeof obj.token === "string" && obj.token.length > 0
        ? obj.token
        : "";
  if (!accessToken) return null;
  const refreshToken =
    typeof obj.refresh_token === "string" && obj.refresh_token.length > 0 ? obj.refresh_token : null;
  return { accessToken, refreshToken };
}

export function normalizeUsersMePayload(payload: unknown): IbexUserProfile {
  if (!payload || typeof payload !== "object") return { data: {} };
  const obj = payload as JsonObject;
  const data = obj.data;
  if (data && typeof data === "object") return { ...(obj as IbexUserProfile), data: data as JsonObject };
  const userdata = obj.userdata;
  if (userdata && typeof userdata === "object") return { ...(obj as IbexUserProfile), data: userdata as JsonObject };
  return { ...(obj as IbexUserProfile), data: obj };
}

export function extractExternalUserId(profile: IbexUserProfile): string | null {
  const candidate = profile.externalUserId || profile.subject || profile.sub || profile.id;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function extractBucketTokens(bucket: unknown): IbexBalanceToken[] {
  if (!bucket || typeof bucket !== "object") return [];
  const b = bucket as IbexBalancesBucket;
  return Array.isArray(b.tokens) ? b.tokens : [];
}

function extractBucketPending(bucket: unknown): JsonObject[] {
  if (!bucket || typeof bucket !== "object") return [];
  const b = bucket as IbexBalancesBucket;
  return Array.isArray(b.pending) ? b.pending : [];
}

function flattenNestedBuckets(nested: unknown): IbexWalletBalance[] {
  if (!nested || typeof nested !== "object") return [];
  const wallets: IbexWalletBalance[] = [];
  for (const [chainId, walletsMap] of Object.entries(nested as Record<string, unknown>)) {
    if (!walletsMap || typeof walletsMap !== "object") continue;
    for (const [walletAddress, bucket] of Object.entries(walletsMap as Record<string, unknown>)) {
      wallets.push({
        chainId,
        walletAddress,
        tokens: extractBucketTokens(bucket),
        pending: extractBucketPending(bucket),
      });
    }
  }
  return wallets;
}

export function normalizeBalancesResponse(raw: IbexUserBalancesResponse): IbexNormalizedBalances {
  const result: IbexNormalizedBalances = {
    timestamp: raw.timestamp,
    prices_available: raw.prices_available,
    wallets: [],
    totals: raw.totals as IbexBalancesTotals | undefined,
  };

  if (raw.crypto) {
    result.wallets.push(...flattenNestedBuckets(raw.crypto));
  }

  if (raw.fiat) {
    result.wallets.push(...flattenNestedBuckets(raw.fiat));
  }

  if (raw.balance) {
    result.wallets.push({
      chainId: String(raw.blockchainId ?? ""),
      walletAddress: raw.identifier ?? "",
      tokens: extractBucketTokens(raw.balance),
      pending: extractBucketPending(raw.balance),
    });
  }

  return result;
}

export function normalizeTransactionsResponse(raw: IbexUserTransactionsResponse): IbexNormalizedTransactions {
  const result: IbexNormalizedTransactions = {
    type: raw.type,
    timestamp: raw.timestamp,
    chains: [],
  };

  if (raw.crypto && typeof raw.crypto === "object") {
    result.prices_available = raw.crypto.prices_available;

    const txMap = raw.crypto.transactions;
    const chainsArr = (raw.crypto as JsonObject).chains;

    if (txMap && typeof txMap === "object") {
      // Standalone /users/me/transactions format: crypto.transactions[chainId].data[]
      for (const [chainId, page] of Object.entries(txMap as Record<string, unknown>)) {
        if (!page || typeof page !== "object") continue;
        const p = page as IbexTransactionPage;
        result.chains.push({
          chainId,
          total: p.total ?? 0,
          page: p.page ?? 1,
          limit: p.limit ?? 50,
          totalPages: p.totalPages ?? 0,
          transactions: Array.isArray(p.data) ? (p.data as IbexTransaction[]) : [],
        });
      }
    } else if (Array.isArray(chainsArr)) {
      // Aggregator /users/me format: crypto.chains[].wallets[].data[]
      for (const chainEntry of chainsArr) {
        if (!chainEntry || typeof chainEntry !== "object") continue;
        const ce = chainEntry as Record<string, unknown>;
        const chainId = String(ce.blockchainId ?? "");
        const wallets = Array.isArray(ce.wallets) ? ce.wallets : [];
        const allTx: IbexTransaction[] = [];
        for (const w of wallets) {
          if (w && typeof w === "object" && Array.isArray((w as Record<string, unknown>).data)) {
            allTx.push(...((w as Record<string, unknown>).data as IbexTransaction[]));
          }
        }
        result.chains.push({
          chainId,
          total: (ce.total as number) ?? allTx.length,
          page: 1,
          limit: 50,
          totalPages: 1,
          transactions: allTx,
        });
      }
    } else if (Array.isArray((raw.crypto as JsonObject).data)) {
      // Aggregator flat crypto: crypto.blockchainId + crypto.data[]
      const c = raw.crypto as Record<string, unknown>;
      result.chains.push({
        chainId: String(c.blockchainId ?? ""),
        total: (c.total as number) ?? 0,
        page: (c.page as number) ?? 1,
        limit: (c.limit as number) ?? 50,
        totalPages: (c.totalPages as number) ?? 1,
        transactions: (c.data as IbexTransaction[]) ?? [],
      });
    }
  }

  if (raw.fiat && typeof raw.fiat === "object") {
    const f = raw.fiat as Record<string, unknown>;
    result.fiat = {
      total: (f.total as number) ?? 0,
      page: (f.page as number) ?? 1,
      limit: (f.limit as number) ?? 50,
      totalPages: (f.totalPages as number) ?? 0,
      transactions: Array.isArray(f.data) ? (f.data as JsonObject[]) : [],
    };
  }

  if (!raw.crypto && !raw.fiat && Array.isArray(raw.data)) {
    result.chains.push({
      chainId: String(raw.blockchainId ?? ""),
      total: raw.total ?? raw.data.length,
      page: raw.page ?? 1,
      limit: raw.limit ?? 50,
      totalPages: raw.totalPages ?? 1,
      transactions: raw.data,
    });
  }

  return result;
}

export function unwrapSection(section: unknown): unknown {
  if (!section || typeof section !== "object") return section;
  const s = section as Record<string, unknown>;
  if (typeof s.status === "number" && "data" in s) {
    return s.data;
  }
  return section;
}

function extractWallets(addresses: unknown): IbexWalletInfo[] {
  if (!addresses || typeof addresses !== "object") return [];
  const a = addresses as Record<string, unknown>;
  const raw = Array.isArray(a.wallets) ? a.wallets : [];
  return raw.map((w: unknown) => {
    if (!w || typeof w !== "object") return { safeAddress: "", chainIds: [], eoaAddresses: [] } as IbexWalletInfo;
    const wallet = w as Record<string, unknown>;
    const eoaAddresses: IbexEoaAddress[] = [];
    const derived = wallet.derived as Record<string, unknown> | undefined;
    if (derived?.global && typeof derived.global === "object") {
      const g = derived.global as Record<string, unknown>;
      if (Array.isArray(g.eoaAddresses)) {
        for (const eoa of g.eoaAddresses) {
          if (eoa && typeof eoa === "object") {
            const e = eoa as Record<string, unknown>;
            eoaAddresses.push({ type: String(e.type ?? ""), address: String(e.address ?? "") });
          }
        }
      }
    }
    return {
      ...(w as JsonObject),
      safeAddress: String(wallet.safeAddress ?? ""),
      chainIds: Array.isArray(wallet.chainIds) ? (wallet.chainIds as number[]) : [],
      threshold: wallet.threshold as number | undefined,
      primary: wallet.primary as boolean | undefined,
      createdAt: wallet.createdAt as string | undefined,
      updatedAt: wallet.updatedAt as string | undefined,
      eoaAddresses,
    } as IbexWalletInfo;
  });
}

function extractSigners(signers: unknown): IbexSigner[] {
  if (!signers || typeof signers !== "object") return [];
  const s = signers as Record<string, unknown>;
  const arr = Array.isArray(s.signers) ? s.signers : [];
  return arr.filter((x): x is IbexSigner => !!x && typeof x === "object");
}

export function normalizeUserProfileResponse(payload: JsonObject): IbexNormalizedProfile {
  const addresses = unwrapSection(payload.addresses) as Record<string, unknown> | undefined;
  const signersSection = unwrapSection(payload.signers);
  const ibansSection = unwrapSection(payload.ibans);
  const balancesSection = unwrapSection(payload.balances);
  const transactionsSection = unwrapSection(payload.transactions);
  const kycSection = unwrapSection(payload.kycStatus);
  const addressbookSection = unwrapSection(payload.addressbook);

  const result: IbexNormalizedProfile = {
    externalUserId: (addresses?.externalUserId ?? payload.externalUserId) as string | undefined,
    rpId: addresses?.rpId as string | undefined,
    signerId: addresses?.signerId as string | undefined,
    wallets: extractWallets(addresses),
    signers: extractSigners(signersSection),
    ibans: [],
    balances: undefined,
    transactions: undefined,
    kycStatus: (kycSection ?? undefined) as IbexKycStatus | undefined,
    addressbook: [],
    data: (payload.data ?? payload.userdata) as JsonObject | undefined,
    errors: payload.errors as Record<string, JsonObject> | undefined,
  };

  if (ibansSection && typeof ibansSection === "object") {
    const ib = ibansSection as Record<string, unknown>;
    result.ibans = Array.isArray(ib.ibans) ? (ib.ibans as JsonObject[])
      : Array.isArray(ib) ? (ib as unknown as JsonObject[]) : [];
  }

  if (balancesSection && typeof balancesSection === "object") {
    result.balances = normalizeBalancesResponse(balancesSection as IbexUserBalancesResponse);
  }

  if (transactionsSection && typeof transactionsSection === "object") {
    result.transactions = normalizeTransactionsResponse(transactionsSection as IbexUserTransactionsResponse);
  }

  if (addressbookSection && typeof addressbookSection === "object") {
    const ab = addressbookSection as Record<string, unknown>;
    result.addressbook = Array.isArray(ab.data) ? (ab.data as JsonObject[])
      : Array.isArray(ab.entries) ? (ab.entries as JsonObject[])
      : Array.isArray(ab) ? (ab as unknown as JsonObject[]) : [];
  }

  return result;
}

// --- WebSocket payload normalizers ---

/**
 * Normalize a WS `balance_data` event payload (`msg.data`) into the same
 * `IbexNormalizedBalances` produced by `getMeBalances()`.
 */
export function normalizeWsBalanceData(wsData: JsonObject): IbexNormalizedBalances {
  const { mode: _, safeAddress: _sa, requestId: _rid, ...rest } = wsData as Record<string, unknown>;
  return normalizeBalancesResponse(rest as IbexUserBalancesResponse);
}

/**
 * Normalize a WS `transaction_data` event payload (`msg.data`) into the same
 * `IbexNormalizedTransactions` produced by `getMeTransactions()`.
 */
export function normalizeWsTransactionData(wsData: JsonObject): IbexNormalizedTransactions {
  const { mode: _, safeAddress: _sa, requestId: _rid, ...rest } = wsData as Record<string, unknown>;
  return normalizeTransactionsResponse(rest as IbexUserTransactionsResponse);
}

/**
 * Normalize a WS `user_data` event payload (`msg.data`) into the same
 * `IbexNormalizedProfile` produced by `getMe()`.
 * Handles both direct payloads and section-enveloped `{ status, data }` payloads.
 */
export function normalizeWsUserData(wsData: JsonObject): IbexNormalizedProfile {
  return normalizeUserProfileResponse(wsData);
}

/**
 * Parse a raw WS text frame into the standard `{ type, data, timestamp }` envelope.
 * Returns `null` if parsing fails.
 */
export function parseWsMessage(raw: string): IbexWsRawMessage | null {
  try {
    const msg = JSON.parse(raw);
    if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return null;
    return {
      type: msg.type,
      data: (msg.data && typeof msg.data === "object" ? msg.data : {}) as JsonObject,
      timestamp: typeof msg.timestamp === "string" ? msg.timestamp : undefined,
    };
  } catch {
    return null;
  }
}
