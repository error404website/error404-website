// POST /api/ableton/download  { proof, f? }
//   no f  →  { ready, sizes }       sizes of the files on the private release
//   f     →  { url, size }          GitHub's short-lived signed link for one file
//
// The Ableton set (zip + PDFs) lives on release "ableton" of the private repo error404website/error404-vault,
// read with the vault's VAULT_GH_TOKEN. Visitors prove they know the access key exactly as for the vault's
// stems: `proof` is checked against netlify/vault-proof.json. Only the files in netlify/ableton-assets.json
// are handed out.
import { createHash, timingSafeEqual } from "node:crypto";
import vault from "../vault-proof.json" with { type: "json" };
import release from "../ableton-assets.json" with { type: "json" };

const REPO = "error404website/error404-vault";
const token = () =>
  (typeof Netlify !== "undefined" ? Netlify.env.get("VAULT_GH_TOKEN") : process.env.VAULT_GH_TOKEN) || "";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

function proofOk(proof) {
  const want = Buffer.from(vault.proof, "hex");
  const got = createHash("sha256")
    .update(String(proof || ""))
    .digest();
  return want.length === got.length && timingSafeEqual(want, got);
}

const gh = (path, init = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token()}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "error404-ableton",
      ...(init.headers || {}),
    },
  });

let cache = { at: 0, assets: null };
async function assets() {
  if (cache.assets && Date.now() - cache.at < 300e3) return cache.assets;
  const res = await gh(`/repos/${REPO}/releases/tags/${release.tag}`);
  if (!res.ok) return {};
  const rel = await res.json();
  cache = {
    at: Date.now(),
    assets: Object.fromEntries(rel.assets.map((a) => [a.name, { id: a.id, size: a.size }])),
  };
  return cache.assets;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (!proofOk(body.proof)) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "locked" }, 401);
  }
  if (!token()) return body.f ? json({ error: "not uploaded yet" }, 404) : json({ ready: false, sizes: {} });
  const all = await assets().catch(() => ({}));
  if (!body.f) {
    const sizes = Object.fromEntries(
      Object.entries(all)
        .filter(([name]) => release.assets.includes(name))
        .map(([name, a]) => [name, a.size]),
    );
    return json({ ready: Object.keys(sizes).length > 0, sizes });
  }
  if (!release.assets.includes(body.f)) return json({ error: "unknown file" }, 404);
  const asset = all[body.f];
  if (!asset) return json({ error: "not uploaded yet" }, 404);
  const res = await gh(`/repos/${REPO}/releases/assets/${asset.id}`, {
    headers: { accept: "application/octet-stream" },
    redirect: "manual",
  });
  const url = res.headers.get("location");
  return url ? json({ url, size: asset.size }) : json({ error: "unavailable" }, 502);
};

export const config = { path: "/api/ableton/download" };
