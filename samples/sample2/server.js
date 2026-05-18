import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoEnvPath = path.resolve(__dirname, "../../env/.env.local");
const localEnvPath = path.resolve(__dirname, ".env.local");

dotenv.config({ path: repoEnvPath });
dotenv.config({ path: localEnvPath, override: true });

const app = express();
const preferredPort = Number(process.env.PORT || 3001);
const ibexBase = (process.env.IBEX_API_URL || "").replace(/\/+$/, "");

if (!ibexBase) {
  throw new Error("IBEX_API_URL is required in env/.env.local");
}

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

function pickForwardHeaders(req) {
  const out = {};
  const contentType = req.headers["content-type"];
  const xRpId = req.headers["x-rp-id"];
  const xRpIdAlt = req.headers["x-rpid"];
  const xIbexAuth = req.headers["x-ibex-auth"];
  const authorization = req.headers.authorization;

  if (contentType) out["content-type"] = String(contentType);
  if (xRpId) out["x-rp-id"] = String(xRpId);
  if (xRpIdAlt) out["x-rpid"] = String(xRpIdAlt);

  // Map X-IBEx-Auth from browser to Authorization upstream, while keeping both.
  if (xIbexAuth) {
    out.authorization = String(xIbexAuth);
    out["x-ibex-auth"] = String(xIbexAuth);
  } else if (authorization) {
    out.authorization = String(authorization);
    out["x-ibex-auth"] = String(authorization);
  }

  return out;
}

function sanitizeResponseHeaders(headers) {
  const out = {};
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "content-encoding" || lower === "content-length" || lower === "transfer-encoding") {
      return;
    }
    out[key] = value;
  });
  return out;
}

async function proxyIbex(req, res, upstreamPath) {
  const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
  const url = `${ibexBase}${upstreamPath}${query}`;
  const init = {
    method: req.method,
    headers: pickForwardHeaders(req)
  };

  if (req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0) {
    init.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(url, init);
    const raw = await response.text();
    const headers = sanitizeResponseHeaders(response.headers);
    res.status(response.status).set(headers).send(raw);
  } catch (error) {
    res.status(502).json({
      error: "Proxy IBEx indisponible",
      detail: error instanceof Error ? error.message : String(error)
    });
  }
}

app.get("/api/ibex/auth/sign-in/options", (req, res) => proxyIbex(req, res, "/v1.2/auth/sign-in"));
app.post("/api/ibex/auth/sign-in/complete", (req, res) => proxyIbex(req, res, "/v1.2/auth/sign-in"));
app.get("/api/ibex/auth/sign-up/options", (req, res) => proxyIbex(req, res, "/v1.2/auth/sign-up"));
app.post("/api/ibex/auth/sign-up/complete", (req, res) => proxyIbex(req, res, "/v1.2/auth/sign-up"));
app.post("/api/ibex/auth/refresh", (req, res) => proxyIbex(req, res, "/v1.2/auth/refresh"));
app.get("/api/ibex/users/me", (req, res) => proxyIbex(req, res, "/v1.2/users/me"));
app.post("/api/ibex/users/me", (req, res) => proxyIbex(req, res, "/v1.2/users/me"));
app.get("/api/ibex/chains", (req, res) => proxyIbex(req, res, "/v1.2/chains/"));
app.get("/api/ibex/users/me/balances", (req, res) => proxyIbex(req, res, "/v1.2/users/me/balances"));
app.get("/api/ibex/users/me/transactions", (req, res) => proxyIbex(req, res, "/v1.2/users/me/transactions"));
app.get("/api/ibex/users/me/address", (req, res) => proxyIbex(req, res, "/v1.2/users/me/address"));
app.get("/api/ibex/users/me/signers", (req, res) => proxyIbex(req, res, "/v1.2/users/me/signers"));
app.get("/api/ibex/users/me/tokens", (req, res) => proxyIbex(req, res, "/v1.2/users/me/tokens"));
app.get("/api/ibex/users/me/lending", (req, res) => proxyIbex(req, res, "/v1.2/users/me/lending"));
app.get("/api/ibex/users/me/addressbook", (req, res) => proxyIbex(req, res, "/v1.2/users/me/addressbook"));
app.post("/api/ibex/users/me/addressbook", (req, res) => proxyIbex(req, res, "/v1.2/users/me/addressbook"));
app.put("/api/ibex/users/me/addressbook/:id", (req, res) =>
  proxyIbex(req, res, `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}`)
);
app.delete("/api/ibex/users/me/addressbook/:id", (req, res) =>
  proxyIbex(req, res, `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}`)
);
app.post("/api/ibex/users/me/addressbook/:id/crypto", (req, res) =>
  proxyIbex(req, res, `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}/crypto`)
);
app.delete("/api/ibex/users/me/addressbook/:id/crypto/:chainId/:address", (req, res) =>
  proxyIbex(
    req,
    res,
    `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}/crypto/${encodeURIComponent(req.params.chainId)}/${encodeURIComponent(req.params.address)}`
  )
);
app.delete("/api/ibex/users/me/addressbook/:id/ibans/:iban", (req, res) =>
  proxyIbex(req, res, `/v1.2/users/me/addressbook/${encodeURIComponent(req.params.id)}/ibans/${encodeURIComponent(req.params.iban)}`)
);
app.post("/api/ibex/sepa/iban/add", (req, res) => proxyIbex(req, res, "/v1.2/sepa/iban/add"));
app.get("/api/ibex/sepa/iban", (req, res) => proxyIbex(req, res, "/v1.2/sepa/iban"));
app.post("/api/ibex/sepa/payments", (req, res) => proxyIbex(req, res, "/v1.2/sepa/payments"));
app.put("/api/ibex/sepa/payments", (req, res) => proxyIbex(req, res, "/v1.2/sepa/payments"));
app.get("/api/ibex/sepa/transactions", (req, res) => proxyIbex(req, res, "/v1.2/sepa/transactions"));
app.get("/api/ibex/sepa/transactions/:id", (req, res) =>
  proxyIbex(req, res, `/v1.2/sepa/transactions/${encodeURIComponent(req.params.id)}`)
);

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`IBEx widget disponible sur http://localhost:${port}`);
  });

  server.on("error", (error) => {
    if (error && typeof error === "object" && "code" in error && error.code === "EADDRINUSE") {
      const fallbackPort = port + 1;
      console.warn(`Port ${port} occupé, tentative sur ${fallbackPort}`);
      startServer(fallbackPort);
      return;
    }
    throw error;
  });
}

startServer(preferredPort);
