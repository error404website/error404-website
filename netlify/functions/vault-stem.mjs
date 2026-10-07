// GET /api/vault/stem?f=<asset name>  →  a short-lived signed download link for one stems zip.
// Only names listed in the vault data are allowed.
import { configured, json, signedIn, stemLink, vaultData } from "../vault-lib.mjs";

export default async (req) => {
  if (!configured()) return json({ error: "offline" }, 503);
  if (!signedIn(req)) return json({ error: "locked" }, 401);
  const name = new URL(req.url).searchParams.get("f") || "";
  const allowed = new Set(vaultData().assets || []);
  if (!allowed.has(name)) return json({ error: "unknown file" }, 404);
  const link = await stemLink(name).catch(() => null);
  if (!link) return json({ error: "not uploaded yet" }, 404);
  return json({ ...link, expiresIn: 300 });
};

export const config = { path: "/api/vault/stem" };
