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
