/**
 * Software FIDO2 authenticator for Node.js testing.
 * Implements IbexWebAuthnProvider using Node.js crypto (EC P-256).
 * Credential store format is compatible with the Python harness (webauthn_credentials.json).
 */
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { IbexWebAuthnProvider } from "../types";

// P-256 curve order
const P256_ORDER = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");
const P256_HALF_ORDER = P256_ORDER / 2n;

/**
 * Normalize an ECDSA DER signature to enforce low-S (required by
 * Ethereum-style verification used in IBEX Safe).
 */
function normalizeLowS(derSig: Buffer): Buffer {
  let offset = 2;
  const rLen = derSig[offset + 1];
  const rBytes = derSig.subarray(offset + 2, offset + 2 + rLen);
  offset += 2 + rLen;
  const sLen = derSig[offset + 1];
  const sBytes = derSig.subarray(offset + 2, offset + 2 + sLen);

  let s = BigInt("0x" + Buffer.from(sBytes).toString("hex"));
  if (s > P256_HALF_ORDER) {
    s = P256_ORDER - s;
  }

  // Re-encode r and normalized s as DER
  const rEncoded = encodeIntegerDER(rBytes);
  const sHex = s.toString(16).padStart(64, "0");
  const sNorm = Buffer.from(sHex, "hex");
  const sEncoded = encodeIntegerDER(sNorm);

  const body = Buffer.concat([rEncoded, sEncoded]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}

function encodeIntegerDER(value: Buffer | Uint8Array): Buffer {
  let v = Buffer.from(value);
  // Strip leading zeros (except to keep positive)
  while (v.length > 1 && v[0] === 0x00 && (v[1] & 0x80) === 0) {
    v = v.subarray(1);
  }
  // Add leading zero if high bit set
  if (v[0] & 0x80) {
    v = Buffer.concat([Buffer.from([0x00]), v]);
  }
  return Buffer.concat([Buffer.from([0x02, v.length]), v]);
}

type StoredCredential = {
  private_key: string;
  public_key: string;
  rp_id: string;
  user_id: string;
  user_name: string;
  created_at: number;
  authenticator_data: string;
  prf_seed: string;
};

type CredentialStore = Record<string, StoredCredential | unknown>;

type PrfExtensionResult = {
  prf?: {
    results?: {
      first?: string;
    };
  };
};

function toBase64Url(buf: Buffer | Uint8Array): string {
  return Buffer.from(buf).toString("base64url");
}

function fromBase64Url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/**
 * Minimal CBOR encoder – covers only the subset needed for COSE keys
 * and attestation objects (maps, byte strings, integers, text strings).
 */
function cborEncodeMap(map: Map<number | string, unknown>): Buffer {
  const parts: Buffer[] = [];

  function encodeValue(v: unknown): Buffer {
    if (v instanceof Buffer || v instanceof Uint8Array) {
      const buf = Buffer.from(v);
      return Buffer.concat([cborEncodeHead(2, buf.length), buf]);
    }
    if (typeof v === "string") {
      const strBuf = Buffer.from(v, "utf-8");
      return Buffer.concat([cborEncodeHead(3, strBuf.length), strBuf]);
    }
    if (typeof v === "number" && Number.isInteger(v)) {
      if (v >= 0) return cborEncodeHead(0, v);
      return cborEncodeHead(1, -1 - v);
    }
    if (v instanceof Map) return cborEncodeMap(v);
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      const m = new Map<string, unknown>();
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        m.set(k2, v2);
      }
      return cborEncodeMap(m);
    }
    if (Array.isArray(v)) {
      const items = v.map(encodeValue);
      return Buffer.concat([cborEncodeHead(4, v.length), ...items]);
    }
    throw new Error(`cborEncodeMap: unsupported value type ${typeof v}`);
  }

  function cborEncodeHead(major: number, val: number): Buffer {
    const mt = major << 5;
    if (val < 24) return Buffer.from([mt | val]);
    if (val < 0x100) return Buffer.from([mt | 24, val]);
    if (val < 0x10000) {
      const b = Buffer.alloc(3);
      b[0] = mt | 25;
      b.writeUInt16BE(val, 1);
      return b;
    }
    const b = Buffer.alloc(5);
    b[0] = mt | 26;
    b.writeUInt32BE(val, 1);
    return b;
  }

  const head = cborEncodeHead(5, map.size);
  parts.push(head);
  for (const [key, val] of map) {
    parts.push(encodeValue(key));
    parts.push(encodeValue(val));
  }
  return Buffer.concat(parts);
}

export class SoftwareAuthenticator implements IbexWebAuthnProvider {
  private readonly credentialsPath: string;
  private credentials: CredentialStore;
  private signCounter = 0;

  constructor(credentialsPath?: string) {
    this.credentialsPath =
      credentialsPath ??
      path.resolve(process.cwd(), "tmp", "webauthn_credentials.json");
    this.credentials = this.loadStore();
  }

  private loadStore(): CredentialStore {
    try {
      if (fs.existsSync(this.credentialsPath)) {
        return JSON.parse(fs.readFileSync(this.credentialsPath, "utf-8"));
      }
    } catch {
      /* start fresh */
    }
    return {};
  }

  private saveStore(): void {
    const dir = path.dirname(this.credentialsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.credentialsPath, JSON.stringify(this.credentials, null, 2));
  }

  // ── IbexWebAuthnProvider.create (registration / sign-up) ────────────

  async create(options: PublicKeyCredentialCreationOptions): Promise<PublicKeyCredential> {
    const rpId = options.rp.id ?? "localhost";
    const { privateKey, publicKeyUncompressed, publicKeyDer } = generateP256KeyPair();

    const credentialIdBytes = crypto.randomBytes(32);
    const credentialIdB64 = toBase64Url(credentialIdBytes);

    const challenge = Buffer.from(options.challenge as ArrayBuffer);

    const clientData = {
      type: "webauthn.create",
      challenge: toBase64Url(challenge),
      origin: `https://${rpId}`,
      crossOrigin: false,
    };
    const clientDataJSON = Buffer.from(JSON.stringify(clientData));

    const rpIdHash = crypto.createHash("sha256").update(rpId).digest();
    const flags = Buffer.from([0x45]); // UP + UV + AT
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(1);
    const aaguid = Buffer.alloc(16);
    const credIdLen = Buffer.alloc(2);
    credIdLen.writeUInt16BE(credentialIdBytes.length);

    const x = publicKeyUncompressed.subarray(1, 33);
    const y = publicKeyUncompressed.subarray(33, 65);
    const coseKey = new Map<number, unknown>();
    coseKey.set(1, 2);    // kty: EC2
    coseKey.set(3, -7);   // alg: ES256
    coseKey.set(-1, 1);   // crv: P-256
    coseKey.set(-2, Buffer.from(x));
    coseKey.set(-3, Buffer.from(y));
    const coseKeyBytes = cborEncodeMap(coseKey);

    const authData = Buffer.concat([
      rpIdHash, flags, counter, aaguid, credIdLen, credentialIdBytes, coseKeyBytes,
    ]);

    const attObj = new Map<string, unknown>();
    attObj.set("fmt", "none");
    attObj.set("attStmt", new Map());
    attObj.set("authData", Buffer.from(authData));
    const attestationObject = cborEncodeMap(attObj);

    const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
    const publicKeyB64 = Buffer.from(publicKeyDer).toString("base64");
    const prfSeed = crypto.randomBytes(32);

    const userId = options.user?.id
      ? toBase64Url(Buffer.from(options.user.id as ArrayBuffer))
      : "";
    const userName = options.user?.name ?? "ibex-user";

    this.credentials[credentialIdB64] = {
      private_key: privatePem,
      public_key: publicKeyB64,
      rp_id: rpId,
      user_id: userId,
      user_name: userName,
      created_at: Date.now() / 1000,
      authenticator_data: toBase64Url(authData),
      prf_seed: prfSeed.toString("base64"),
    };
    this.saveStore();

    // Match legacy Python harness behavior:
    // if PRF extension is requested at registration, advertise it and
    // evaluate `prf.results.first` using HMAC-SHA256(prf_seed, salt).
    const extResults: AuthenticationExtensionsClientOutputs = {};
    const ext = options.extensions as { prf?: { eval?: { first?: ArrayBuffer } } } | undefined;
    if (ext?.prf) {
      (extResults as PrfExtensionResult).prf = { results: {} };
      const first = ext.prf.eval?.first;
      if (first) {
        const salt = Buffer.from(first);
        const out = crypto.createHmac("sha256", prfSeed).update(salt).digest();
        (extResults as PrfExtensionResult).prf = {
          results: { first: toBase64Url(out) },
        };
      }
    }

    return buildPublicKeyCredential({
      id: credentialIdB64,
      rawId: credentialIdBytes,
      type: "public-key",
      clientExtensionResults: extResults,
      response: {
        kind: "attestation",
        clientDataJSON,
        attestationObject,
      },
    });
  }

  // ── IbexWebAuthnProvider.get (assertion / sign-in) ──────────────────

  async get(options: PublicKeyCredentialRequestOptions): Promise<PublicKeyCredential> {
    const rpId = options.rpId ?? "localhost";

    const cred = this.findCredential(rpId, options.allowCredentials);
    if (!cred) {
      throw new Error(
        `SoftwareAuthenticator: aucune credential trouvée pour rpId=${rpId}`,
      );
    }

    const [credentialIdB64, stored] = cred;
    const credentialIdBytes = fromBase64Url(credentialIdB64);
    const privateKey = crypto.createPrivateKey(stored.private_key);

    const challenge = Buffer.from(options.challenge as ArrayBuffer);

    const clientData = {
      type: "webauthn.get",
      challenge: toBase64Url(challenge),
      origin: `https://${rpId}`,
      crossOrigin: false,
    };
    const clientDataJSON = Buffer.from(JSON.stringify(clientData));

    const rpIdHash = crypto.createHash("sha256").update(rpId).digest();
    const flags = Buffer.from([0x05]); // UP + UV
    // Keep signCount at zero to mirror the reference Python signer used by
    // the legacy non-SDK scripts and avoid verifier mismatch in IBEX Safe.
    const counter = Buffer.alloc(4);
    counter.writeUInt32BE(0);
    const authenticatorData = Buffer.concat([rpIdHash, flags, counter]);

    const clientDataHash = crypto.createHash("sha256").update(clientDataJSON).digest();
    const toSign = Buffer.concat([authenticatorData, clientDataHash]);

    const rawSignature = crypto.sign("sha256", toSign, {
      key: privateKey,
      dsaEncoding: "der",
    });
    const signature = normalizeLowS(rawSignature);

    // Keep compatibility with the legacy Python signer:
    // userHandle is base64url(utf8(user_id_string)), not raw decoded bytes.
    const userHandle = stored.user_id
      ? Buffer.from(stored.user_id, "utf-8")
      : null;

    const extensionResults = this.computePrfExtensionResults(options, stored);

    return buildPublicKeyCredential({
      id: credentialIdB64,
      rawId: credentialIdBytes,
      type: "public-key",
      clientExtensionResults: extensionResults,
      response: {
        kind: "assertion",
        clientDataJSON,
        authenticatorData,
        signature,
        userHandle,
      },
    });
  }

  private findCredential(
    rpId: string,
    allowCredentials?: PublicKeyCredentialDescriptor[],
  ): [string, StoredCredential] | null {
    const allowed = allowCredentials?.map((c) =>
      toBase64Url(Buffer.from(c.id as ArrayBuffer)),
    );

    const candidates: [string, StoredCredential][] = [];
    for (const [id, val] of Object.entries(this.credentials)) {
      if (!val || typeof val !== "object" || !("private_key" in (val as Record<string, unknown>))) continue;
      const s = val as StoredCredential;
      if (s.rp_id !== rpId) continue;
      if (allowed && !allowed.includes(id)) continue;
      candidates.push([id, s]);
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (b[1].created_at ?? 0) - (a[1].created_at ?? 0));
    return candidates[0];
  }

  private computePrfExtensionResults(
    options: PublicKeyCredentialRequestOptions,
    stored: StoredCredential,
  ): AuthenticationExtensionsClientOutputs {
    const ext = options.extensions as { prf?: { eval?: { first?: ArrayBuffer } } } | undefined;
    const first = ext?.prf?.eval?.first;
    if (!first || !stored.prf_seed) return {};
    try {
      const seed = Buffer.from(stored.prf_seed, "base64");
      const salt = Buffer.from(first);
      const out = crypto.createHmac("sha256", seed).update(salt).digest();
      return {
        prf: {
          results: {
            first: toBase64Url(out),
          },
        },
      } as AuthenticationExtensionsClientOutputs;
    } catch {
      return {};
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function generateP256KeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  // Uncompressed point: 0x04 || x(32) || y(32) — last 65 bytes of SubjectPublicKeyInfo DER
  const uncompressedOffset = publicKeyDer.length - 65;
  const publicKeyUncompressed = Buffer.from(publicKeyDer.subarray(uncompressedOffset));

  return { privateKey, publicKeyUncompressed, publicKeyDer };
}

type CredentialBuildInput = {
  id: string;
  rawId: Buffer;
  type: string;
  clientExtensionResults?: AuthenticationExtensionsClientOutputs;
  response:
    | {
        kind: "attestation";
        clientDataJSON: Buffer;
        attestationObject: Buffer;
      }
    | {
        kind: "assertion";
        clientDataJSON: Buffer;
        authenticatorData: Buffer;
        signature: Buffer;
        userHandle: Buffer | null;
      };
};

/**
 * Build a duck-typed PublicKeyCredential that satisfies the SDK's
 * serializeAttestation / serializeAssertion helpers.
 */
function buildPublicKeyCredential(input: CredentialBuildInput): PublicKeyCredential {
  const rawId = input.rawId.buffer.slice(
    input.rawId.byteOffset,
    input.rawId.byteOffset + input.rawId.byteLength,
  );

  let response: AuthenticatorResponse;
  if (input.response.kind === "attestation") {
    const r = input.response;
    response = {
      clientDataJSON: bufToAB(r.clientDataJSON),
      attestationObject: bufToAB(r.attestationObject),
    } as AuthenticatorAttestationResponse;
  } else {
    const r = input.response;
    response = {
      clientDataJSON: bufToAB(r.clientDataJSON),
      authenticatorData: bufToAB(r.authenticatorData),
      signature: bufToAB(r.signature),
      userHandle: r.userHandle ? bufToAB(r.userHandle) : null,
    } as AuthenticatorAssertionResponse;
  }

  return {
    id: input.id,
    rawId,
    type: input.type,
    response,
    authenticatorAttachment: "platform",
    getClientExtensionResults: () => (input.clientExtensionResults ?? {}),
  } as unknown as PublicKeyCredential;
}

function bufToAB(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
