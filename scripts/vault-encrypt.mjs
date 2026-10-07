// Encrypts the Source Vault's private data into netlify/vault-data.enc.json (the only form committed).
//
//   npm run vault:encrypt
//
// Reads (both git-ignored):
//   vault-private/vault-data.json                         analysis: lengths, BPM, keys, waveform peaks, stem lists
//   vault-private/error_404_Archive_404_remix_prompts.md  master style, production styles, per-track style + lyrics
//   .env.vault                                            VAULT_DATA_KEY (the same value as on Netlify)
import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.vault", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
if (!env.VAULT_DATA_KEY) throw new Error("VAULT_DATA_KEY missing from .env.vault");

const analysis = JSON.parse(readFileSync("vault-private/vault-data.json", "utf8"));
const prompts = readFileSync("vault-private/error_404_Archive_404_remix_prompts.md", "utf8");

// Stem zips on the private release: one per track, and one per chapter for "all stems"
// (a single 2.4 GB zip is over GitHub's 2 GB limit per release file).
const CHAPTERS = ["ORIGIN", "THE FEED", "THE WRECKAGE", "WHOLE"];
// (the June zip names/sizes in the analysis file are dropped: live sizes come from the release)
const tracks = analysis.tracks.map((t) => {
  const out = { ...t, asset: `${t.n}_${t.slug}_stems.zip` };
  delete out.zip;
  return out;
});
const chapters = CHAPTERS.map((name, i) => ({
  ch: i + 1,
  name,
  asset: `ARCHIVE_404_stems_0${i + 1}_${name.toLowerCase().replace(/ /g, "_")}.zip`,
}));
const payload = {
  tracks,
  chapters,
  assets: [...tracks.map((t) => t.asset), ...chapters.map((c) => c.asset)],
  prompts,
};

const iv = randomBytes(12);
const c = createCipheriv("aes-256-gcm", Buffer.from(env.VAULT_DATA_KEY, "base64"), iv);
const data = Buffer.concat([c.update(JSON.stringify(payload), "utf8"), c.final()]);
writeFileSync(
  "netlify/vault-data.enc.json",
  JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: c.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  }) + "\n",
);
console.log(
  `Encrypted ${tracks.length} tracks, ${chapters.length} chapter zips, ${prompts.length} characters of prompts.`,
);
console.log("Stem zip names to upload to the private release:\n  " + payload.assets.join("\n  "));
