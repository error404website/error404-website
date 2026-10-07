// GET /api/vault/data  →  prompts, lyrics and analysis for a signed-in visitor, plus the
// live sizes of whatever stem zips are on the private release.
import { configured, json, signedIn, stemAssets, stemsReady, vaultData } from "../vault-lib.mjs";

export default async (req) => {
  if (!configured()) return json({ error: "offline" }, 503);
  if (!signedIn(req)) return json({ error: "locked" }, 401);
  const data = vaultData();
  const assets = await stemAssets().catch(() => ({}));
  const sizes = Object.fromEntries(Object.entries(assets).map(([name, a]) => [name, a.size]));
  return json({ ...data, stems: { ready: stemsReady() && Object.keys(sizes).length > 0, sizes } });
};

export const config = { path: "/api/vault/data" };
