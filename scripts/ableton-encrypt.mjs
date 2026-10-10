// Locks the /ableton/ page's private data with the Source Vault's access key.
//
//   npm run ableton:encrypt
//
// Reads (git-ignored):
//   .env.vault                       VAULT_KEY = the access key (the same one as the vault and the live show)
//   vault-private/ableton/set.json   the songs with their pad chops, and the release (zip name, size, SHA-256)
// Writes (committed):
//   public/ableton/data.enc.json     AES-256-GCM, key = PBKDF2-SHA256(access key); the browser decrypts it
//   netlify/ableton-assets.json      the release files the download function may hand out (names only)
// The download proves the key with the vault's own proof (netlify/vault-proof.json), so there's one key.
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const ITERATIONS = 300000;
const env = Object.fromEntries(
  readFileSync(process.env.ABLETON_ENV_FILE || ".env.vault", "utf8") // ABLETON_ENV_FILE: a throwaway key for local tests
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const key = (env.VAULT_KEY || "").trim().toLowerCase();
if (!key) throw new Error("VAULT_KEY missing from .env.vault");

const data = JSON.parse(readFileSync("vault-private/ableton/set.json", "utf8"));
const salt = randomBytes(16);
const iv = randomBytes(12);
const c = createCipheriv("aes-256-gcm", pbkdf2Sync(key, salt, ITERATIONS, 32, "sha256"), iv);
const sealed = Buffer.concat([c.update(JSON.stringify(data), "utf8"), c.final(), c.getAuthTag()]);

mkdirSync("public/ableton", { recursive: true });
writeFileSync(
  "public/ableton/data.enc.json",
  JSON.stringify({
    v: 1,
    iterations: ITERATIONS,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    data: sealed.toString("base64"),
  }) + "\n",
);
const assets = Object.values(data.files);
writeFileSync("netlify/ableton-assets.json", JSON.stringify({ tag: "ableton", assets }) + "\n");
console.log(`Locked ${data.songs.length} songs + release ${data.release.version} with the access key.`);
console.log("Release files the download function may serve:\n  " + assets.join("\n  "));
