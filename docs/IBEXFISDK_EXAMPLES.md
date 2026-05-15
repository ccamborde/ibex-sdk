# IBEx SDK Examples

This document contains practical end-to-end SDK usage examples.

## Unified Route Engine (Swap + Bridge)

```typescript
import { createIbexSdk } from "ibex-sdk";

const sdk = createIbexSdk({
  apiBaseUrl: "https://passkeys-testnet.ibex.fi",
});

await sdk.authenticateWithPasskey();

// 1) Discover route mode/providers for chain pair
const capabilities = await sdk.getRouteCapabilities({
  sourceChainId: 421614,
  destinationChainId: 100,
});

if (capabilities.mode === "UNSUPPORTED") {
  throw new Error("No supported route for this chain pair.");
}

// 2) Request a quote and get routeId
const quote = await sdk.getRouteQuote({
  sourceChainId: 421614,
  destinationChainId: 100,
  sellTokenAddress: "0x18e632ae0704ab92cf4f49472b583498ff5258cc",
  buyTokenAddress: "0x420ca0f9b9b604ce0fd9c18ef134c705e5fa3430",
  amount: "100",
  safeAddress: "0xYourSafeAddress",
});

if (!quote.routeId) {
  throw new Error("routeId missing from route quote response.");
}

// 3) Prepare ROUTE_FROM_QUOTE safe operation
const prepare = await sdk.routeFromQuote("0xYourSafeAddress", quote.routeId, {
  chainId: 421614,
});

// 4) Sign WebAuthn challenge in browser
const assertion = await navigator.credentials.get({
  publicKey: prepare.credentialRequestOptions!,
});

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function serializeCredential(credential: PublicKeyCredential) {
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

// 5) Execute prepared operation
await sdk.executeSafeOperations({
  credential: serializeCredential(assertion as PublicKeyCredential),
});

// 6) Poll route status to terminal state
const terminalStatuses = new Set(["DEST_COMPLETED", "FAILED"]);
let status = await sdk.getRouteStatus(quote.routeId);

while (!terminalStatuses.has(String(status.status))) {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  status = await sdk.getRouteStatus(quote.routeId);
}

if (status.status === "FAILED") {
  throw new Error("Route execution failed.");
}

console.log("Route completed:", status);
```

