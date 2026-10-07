// Shared helpers for the Source Vault functions (netlify/functions/vault-*.mjs).
//
// The repo is public, so nothing private lives here in plain form:
//   VAULT_KEY        the access key visitors type (Netlify environment variable)
//   VAULT_SECRET     signs the session cookie
//   VAULT_DATA_KEY   decrypts netlify/vault-data.enc.json (prompts, lyrics, analysis)
//   VAULT_GH_TOKEN   read-only token for the private stems repo (VAULT_STEMS_REPO)
import { createDecipheriv, createHmac, timingSafeEqual } from "node:crypto";
import encrypted from "./vault-data.enc.json" with { type: "json" };

export const COOKIE = "e404_vault";
const SESSION_DAYS = 7;

const env = (name) => (typeof Netlify !== "undefined" ? Netlify.env.get(name) : process.env[name]) || "";

export const configured = () => Boolean(env("VAULT_KEY") && env("VAULT_SECRET") && env("VAULT_DATA_KEY"));

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });

const sign = (payload) => createHmac("sha256", env("VAULT_SECRET")).update(payload).digest("base64url");

export function keyMatches(given) {
  const a = Buffer.from(
    String(given || "")
      .trim()
      .toLowerCase(),
  );
  const b = Buffer.from(env("VAULT_KEY").trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sessionCookie() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_DAYS * 864e5 })).toString(
    "base64url",
  );
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function signedIn(req) {
  const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw || !configured()) return false;
  const [payload, mac] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !mac) return false;
  const want = Buffer.from(sign(payload)),
    got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return false;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now();
  } catch {
    return false;
  }
}

let cache = null;
export function vaultData() {
  if (cache) return cache;
  const d = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(env("VAULT_DATA_KEY"), "base64"),
    Buffer.from(encrypted.iv, "base64"),
  );
  d.setAuthTag(Buffer.from(encrypted.tag, "base64"));
  cache = JSON.parse(
    Buffer.concat([d.update(Buffer.from(encrypted.data, "base64")), d.final()]).toString("utf8"),
  );
  return cache;
}

// ---------- stems: assets on a release in the private repo ----------
let releaseCache = { at: 0, assets: null };
async function gh(path, init = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env("VAULT_GH_TOKEN")}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "error404-source-vault",
      ...(init.headers || {}),
    },
  });
}

export const stemsReady = () => Boolean(env("VAULT_GH_TOKEN") && env("VAULT_STEMS_REPO"));

// name → { id, size } for every asset on the stems release (cached for 5 minutes)
export async function stemAssets() {
  if (!stemsReady()) return {};
  if (releaseCache.assets && Date.now() - releaseCache.at < 300e3) return releaseCache.assets;
  const tag = env("VAULT_STEMS_TAG") || "stems";
  const res = await gh(`/repos/${env("VAULT_STEMS_REPO")}/releases/tags/${encodeURIComponent(tag)}`);
  if (!res.ok) return {};
  const rel = await res.json();
  releaseCache = {
    at: Date.now(),
    assets: Object.fromEntries(rel.assets.map((a) => [a.name, { id: a.id, size: a.size }])),
  };
  return releaseCache.assets;
}

// GitHub answers an asset download with a redirect to a short-lived signed URL; hand that URL out.
export async function stemLink(name) {
  const asset = (await stemAssets())[name];
  if (!asset) return null;
  const res = await gh(`/repos/${env("VAULT_STEMS_REPO")}/releases/assets/${asset.id}`, {
    headers: { accept: "application/octet-stream" },
    redirect: "manual",
  });
  const url = res.headers.get("location");
  return url ? { url, size: asset.size } : null;
}
