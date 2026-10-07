// POST /api/vault/unlock  { key }  →  sets the signed session cookie when the key matches VAULT_KEY.
import { configured, json, keyMatches, sessionCookie } from "../vault-lib.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!configured()) return json({ error: "offline" }, 503);
  let key = "";
  try {
    key = (await req.json()).key;
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (!keyMatches(key)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return json({ error: "denied" }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie() });
};

export const config = { path: "/api/vault/unlock" };
