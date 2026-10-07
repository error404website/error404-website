// Locks the Source Vault's private data with the access key itself.
//
//   npm run vault:encrypt
//
// Reads (all git-ignored):
//   .env.vault                                            VAULT_KEY = the access key visitors type
//   vault-private/vault-data.json                         analysis: lengths, BPM, keys, waveform peaks, stem lists
//   vault-private/error_404_Archive_404_remix_prompts.md  master style, production styles, per-track style + lyrics
// Writes (committed, unreadable without the key):
//   public/vault/data.enc.json   AES-256-GCM, key = PBKDF2-SHA256(access key); the browser decrypts it
//   netlify/vault-proof.json     SHA-256 of a second PBKDF2 of the key, so the stems function can check
//                                a visitor knows the key without the key being stored anywhere
import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ITERATIONS = 300000;
const env = Object.fromEntries(
  readFileSync(".env.vault", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const key = (env.VAULT_KEY || "").trim().toLowerCase(); // the key is not case-sensitive
if (!key) throw new Error("VAULT_KEY missing from .env.vault");

const analysis = JSON.parse(readFileSync("vault-private/vault-data.json", "utf8"));
const prompts = readFileSync("vault-private/error_404_Archive_404_remix_prompts.md", "utf8");

// Stem zips on the private release: one per track, and one per chapter for "all stems"
// (a single 2.4 GB zip is over GitHub's 2 GB limit per release file).
// (the June zip names/sizes in the analysis file are dropped: live sizes come from the release)
const CHAPTERS = ["ORIGIN", "THE FEED", "THE WRECKAGE", "WHOLE"];
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
const payload = { tracks, chapters, prompts };

// data: the browser derives the same key from what the visitor types (WebCrypto PBKDF2) and decrypts
const salt = randomBytes(16);
const iv = randomBytes(12);
const c = createCipheriv("aes-256-gcm", pbkdf2Sync(key, salt, ITERATIONS, 32, "sha256"), iv);
const sealed = Buffer.concat([c.update(JSON.stringify(payload), "utf8"), c.final(), c.getAuthTag()]);

// proof: a separate derivation (different salt) the browser sends to the stems function
const proofSalt = randomBytes(16);
const proof = pbkdf2Sync(key, proofSalt, ITERATIONS, 32, "sha256").toString("base64");

mkdirSync("public/vault", { recursive: true });
writeFileSync(
  "public/vault/data.enc.json",
  JSON.stringify({
    v: 2,
    iterations: ITERATIONS,
    salt: salt.toString("base64"),
    proofSalt: proofSalt.toString("base64"),
    iv: iv.toString("base64"),
    data: sealed.toString("base64"),
  }) + "\n",
);
writeFileSync(
  "netlify/vault-proof.json",
  JSON.stringify({
    proof: createHash("sha256").update(proof).digest("hex"),
    assets: [...tracks.map((t) => t.asset), ...chapters.map((ch) => ch.asset)],
  }) + "\n",
);
console.log(
  `Locked ${tracks.length} tracks and ${prompts.length} characters of prompts with the access key.`,
);
console.log(
  "Stem zip names for the private release:\n  " + [...tracks, ...chapters].map((x) => x.asset).join("\n  "),
);
