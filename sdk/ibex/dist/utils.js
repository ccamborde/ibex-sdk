export function defaultResolveRpId(hostname = window.location.hostname) {
    const host = hostname.toLowerCase().trim();
    if (!host)
        return "localhost";
    if (host.endsWith(".ibex.fi") || host === "ibex.fi")
        return "ibex.fi";
    // Keep exact host for custom integration domains (e.g. widget-light.local).
    return host;
}
export function isAuthStatusError(error) {
    const raw = error instanceof Error ? error.message : String(error ?? "");
    const msg = raw.toLowerCase();
    return msg.includes(" 401") || msg.includes(" 403") || msg.includes("unauthorized") || msg.includes("forbidden");
}
export function toBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
export function fromBase64Url(input) {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
    const binary = atob(base64 + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}
function toBufferSource(value) {
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
function decodePrfValues(values) {
    return {
        ...values,
        first: toBufferSource(values.first),
        second: toBufferSource(values.second),
    };
}
function decodeExtensions(extensions) {
    if (!extensions || typeof extensions !== "object") {
        return undefined;
    }
    const ext = extensions;
    const out = { ...ext };
    const prf = out.prf;
    if (!prf || typeof prf !== "object") {
        return out;
    }
    const prfObj = { ...prf };
    if (prfObj.eval && typeof prfObj.eval === "object") {
        prfObj.eval = decodePrfValues(prfObj.eval);
    }
    if (prfObj.evalByCredential && typeof prfObj.evalByCredential === "object") {
        const evalByCredential = prfObj.evalByCredential;
        prfObj.evalByCredential = Object.fromEntries(Object.entries(evalByCredential).map(([key, value]) => {
            if (value && typeof value === "object") {
                return [key, decodePrfValues(value)];
            }
            return [key, value];
        }));
    }
    out.prf = prfObj;
    return out;
}
export function normalizeSignInOptions(payload) {
    const options = (payload.credentialRequestOptions || payload.publicKey || payload);
    const challenge = String(options.challenge || "");
    const allowCredentialsRaw = Array.isArray(options.allowCredentials) ? options.allowCredentials : [];
    const allowCredentials = allowCredentialsRaw
        .filter((c) => Boolean(c) && typeof c === "object")
        .map((c) => ({
        id: fromBase64Url(String(c.id || "")),
        type: String(c.type || "public-key"),
        transports: Array.isArray(c.transports) ? c.transports : undefined,
    }));
    return {
        challenge: fromBase64Url(challenge),
        rpId: typeof options.rpId === "string" ? options.rpId : undefined,
        timeout: typeof options.timeout === "number" ? options.timeout : undefined,
        userVerification: typeof options.userVerification === "string"
            ? options.userVerification
            : undefined,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    };
}
export function normalizeSignUpOptions(payload) {
    const options = (payload.credentialRequestOptions || payload.publicKey || payload);
    const rpRaw = options.rp && typeof options.rp === "object" ? options.rp : {};
    const userRaw = options.user && typeof options.user === "object" ? options.user : {};
    const paramsRaw = Array.isArray(options.pubKeyCredParams) ? options.pubKeyCredParams : [];
    const excludeRaw = Array.isArray(options.excludeCredentials) ? options.excludeCredentials : [];
    const pubKeyCredParams = paramsRaw
        .filter((p) => Boolean(p) && typeof p === "object")
        .map((p) => ({
        type: String(p.type || "public-key"),
        alg: Number(p.alg || -7),
    }));
    const excludeCredentials = excludeRaw
        .filter((c) => Boolean(c) && typeof c === "object")
        .map((c) => ({
        id: fromBase64Url(String(c.id || "")),
        type: String(c.type || "public-key"),
        transports: Array.isArray(c.transports) ? c.transports : undefined,
    }));
    return {
        challenge: fromBase64Url(String(options.challenge || "")),
        rp: {
            id: typeof rpRaw.id === "string" ? rpRaw.id : undefined,
            name: String(rpRaw.name || window.location.hostname),
        },
        user: {
            id: fromBase64Url(String(userRaw.id || "")),
            name: String(userRaw.name || "ibex-user"),
            displayName: String(userRaw.displayName || userRaw.name || "IBEx user"),
        },
        pubKeyCredParams,
        timeout: typeof options.timeout === "number" ? options.timeout : undefined,
        attestation: typeof options.attestation === "string" ? options.attestation : undefined,
        authenticatorSelection: options.authenticatorSelection && typeof options.authenticatorSelection === "object"
            ? options.authenticatorSelection
            : undefined,
        excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
        extensions: decodeExtensions(options.extensions),
    };
}
export function serializeAssertion(credential) {
    const response = credential.response;
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
export function serializeAttestation(credential) {
    const response = credential.response;
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
export function extractAuthTokens(payload) {
    if (!payload || typeof payload !== "object")
        return null;
    const obj = payload;
    const accessToken = typeof obj.access_token === "string" && obj.access_token.length > 0
        ? obj.access_token
        : typeof obj.token === "string" && obj.token.length > 0
            ? obj.token
            : "";
    if (!accessToken)
        return null;
    const refreshToken = typeof obj.refresh_token === "string" && obj.refresh_token.length > 0 ? obj.refresh_token : null;
    return { accessToken, refreshToken };
}
export function normalizeUsersMePayload(payload) {
    if (!payload || typeof payload !== "object")
        return { data: {} };
    const obj = payload;
    const data = obj.data;
    if (data && typeof data === "object")
        return { ...obj, data: data };
    const userdata = obj.userdata;
    if (userdata && typeof userdata === "object")
        return { ...obj, data: userdata };
    return { ...obj, data: obj };
}
export function extractExternalUserId(profile) {
    const candidate = profile.externalUserId || profile.subject || profile.sub || profile.id;
    return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}
function extractBucketTokens(bucket) {
    if (!bucket || typeof bucket !== "object")
        return [];
    const b = bucket;
    return Array.isArray(b.tokens) ? b.tokens : [];
}
function extractBucketPending(bucket) {
    if (!bucket || typeof bucket !== "object")
        return [];
    const b = bucket;
    return Array.isArray(b.pending) ? b.pending : [];
}
function flattenNestedBuckets(nested) {
    if (!nested || typeof nested !== "object")
        return [];
    const wallets = [];
    for (const [chainId, walletsMap] of Object.entries(nested)) {
        if (!walletsMap || typeof walletsMap !== "object")
            continue;
        for (const [walletAddress, bucket] of Object.entries(walletsMap)) {
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
export function normalizeBalancesResponse(raw) {
    const result = {
        timestamp: raw.timestamp,
        prices_available: raw.prices_available,
        wallets: [],
        totals: raw.totals,
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
export function normalizeTransactionsResponse(raw) {
    const result = {
        type: raw.type,
        timestamp: raw.timestamp,
        chains: [],
    };
    if (raw.crypto && typeof raw.crypto === "object") {
        result.prices_available = raw.crypto.prices_available;
        const txMap = raw.crypto.transactions;
        const chainsArr = raw.crypto.chains;
        if (txMap && typeof txMap === "object") {
            // Standalone /users/me/transactions format: crypto.transactions[chainId].data[]
            for (const [chainId, page] of Object.entries(txMap)) {
                if (!page || typeof page !== "object")
                    continue;
                const p = page;
                result.chains.push({
                    chainId,
                    total: p.total ?? 0,
                    page: p.page ?? 1,
                    limit: p.limit ?? 50,
                    totalPages: p.totalPages ?? 0,
                    transactions: Array.isArray(p.data) ? p.data : [],
                });
            }
        }
        else if (Array.isArray(chainsArr)) {
            // Aggregator /users/me format: crypto.chains[].wallets[].data[]
            for (const chainEntry of chainsArr) {
                if (!chainEntry || typeof chainEntry !== "object")
                    continue;
                const ce = chainEntry;
                const chainId = String(ce.blockchainId ?? "");
                const wallets = Array.isArray(ce.wallets) ? ce.wallets : [];
                const allTx = [];
                for (const w of wallets) {
                    if (w && typeof w === "object" && Array.isArray(w.data)) {
                        allTx.push(...w.data);
                    }
                }
                result.chains.push({
                    chainId,
                    total: ce.total ?? allTx.length,
                    page: 1,
                    limit: 50,
                    totalPages: 1,
                    transactions: allTx,
                });
            }
        }
        else if (Array.isArray(raw.crypto.data)) {
            // Aggregator flat crypto: crypto.blockchainId + crypto.data[]
            const c = raw.crypto;
            result.chains.push({
                chainId: String(c.blockchainId ?? ""),
                total: c.total ?? 0,
                page: c.page ?? 1,
                limit: c.limit ?? 50,
                totalPages: c.totalPages ?? 1,
                transactions: c.data ?? [],
            });
        }
    }
    if (raw.fiat && typeof raw.fiat === "object") {
        const f = raw.fiat;
        result.fiat = {
            total: f.total ?? 0,
            page: f.page ?? 1,
            limit: f.limit ?? 50,
            totalPages: f.totalPages ?? 0,
            transactions: Array.isArray(f.data) ? f.data : [],
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
function extractWallets(addresses) {
    if (!addresses || typeof addresses !== "object")
        return [];
    const a = addresses;
    const raw = Array.isArray(a.wallets) ? a.wallets : [];
    return raw.map((w) => {
        if (!w || typeof w !== "object")
            return { safeAddress: "", chainIds: [], eoaAddresses: [] };
        const wallet = w;
        const eoaAddresses = [];
        const derived = wallet.derived;
        if (derived?.global && typeof derived.global === "object") {
            const g = derived.global;
            if (Array.isArray(g.eoaAddresses)) {
                for (const eoa of g.eoaAddresses) {
                    if (eoa && typeof eoa === "object") {
                        const e = eoa;
                        eoaAddresses.push({ type: String(e.type ?? ""), address: String(e.address ?? "") });
                    }
                }
            }
        }
        return {
            ...w,
            safeAddress: String(wallet.safeAddress ?? ""),
            chainIds: Array.isArray(wallet.chainIds) ? wallet.chainIds : [],
            threshold: wallet.threshold,
            primary: wallet.primary,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
            eoaAddresses,
        };
    });
}
function extractSigners(signers) {
    if (!signers || typeof signers !== "object")
        return [];
    const s = signers;
    const arr = Array.isArray(s.signers) ? s.signers : [];
    return arr.filter((x) => !!x && typeof x === "object");
}
export function normalizeUserProfileResponse(payload) {
    const addresses = payload.addresses;
    const result = {
        externalUserId: (addresses?.externalUserId ?? payload.externalUserId),
        rpId: addresses?.rpId,
        signerId: addresses?.signerId,
        wallets: extractWallets(addresses),
        signers: extractSigners(payload.signers),
        ibans: [],
        balances: undefined,
        transactions: undefined,
        kycStatus: (payload.kycStatus ?? undefined),
        addressbook: [],
        data: (payload.data ?? payload.userdata),
        errors: payload.errors,
    };
    if (payload.ibans && typeof payload.ibans === "object") {
        const ib = payload.ibans;
        result.ibans = Array.isArray(ib.ibans) ? ib.ibans : [];
    }
    if (payload.balances && typeof payload.balances === "object") {
        result.balances = normalizeBalancesResponse(payload.balances);
    }
    if (payload.transactions && typeof payload.transactions === "object") {
        result.transactions = normalizeTransactionsResponse(payload.transactions);
    }
    if (payload.addressbook && typeof payload.addressbook === "object") {
        const ab = payload.addressbook;
        result.addressbook = Array.isArray(ab.data) ? ab.data
            : Array.isArray(ab.entries) ? ab.entries : [];
    }
    return result;
}
