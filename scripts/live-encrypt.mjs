// Locks the live show's private files with the Source Vault's access key.
//
//   npm run live:encrypt
//
// Reads (git-ignored):
//   .env.vault                          VAULT_KEY = the access key (the same one as the vault)
//   vault-private/live/timeline.json    songs (+ byte sizes, MP3 padding), lyrics with word timings, cues, beats
//   vault-private/live/inst/NN.mp3      the instrumental of each song (live-set version, 320 kbps)
// Writes (committed, unreadable without the key):
//   public/live/data.enc.json           AES-256-GCM of the timeline, key = PBKDF2-SHA256(access key)
//   public/live/inst/NN-<hash>.bin      each instrumental, AES-256-GCM with its own IV (listed in the timeline)
import { createCipheriv, createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const ITERATIONS = 300000;
const env = Object.fromEntries(
  readFileSync(process.env.LIVE_ENV_FILE || ".env.vault", "utf8") // LIVE_ENV_FILE: a throwaway key for local tests
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const key = (env.VAULT_KEY || "").trim().toLowerCase();
if (!key) throw new Error("VAULT_KEY missing from .env.vault");

const tl = JSON.parse(readFileSync("vault-private/live/timeline.json", "utf8"));
const salt = randomBytes(16);
const aes = pbkdf2Sync(key, salt, ITERATIONS, 32, "sha256");
const seal = (buf) => {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", aes, iv);
  return { iv: iv.toString("base64"), data: Buffer.concat([c.update(buf), c.final(), c.getAuthTag()]) };
};

rmSync("public/live/inst", { recursive: true, force: true });
mkdirSync("public/live/inst", { recursive: true });
for (const s of tl.songs) {
  const mp3 = readFileSync(`vault-private/live/inst/${String(s.n).padStart(2, "0")}.mp3`);
  const { iv, data } = seal(mp3);
  const file = `${String(s.n).padStart(2, "0")}-${createHash("sha256").update(data).digest("hex").slice(0, 10)}.bin`;
  writeFileSync(`public/live/inst/${file}`, data);
  s.inst = { file, iv, bytes: data.length };
}
const { iv, data } = seal(Buffer.from(JSON.stringify(tl), "utf8"));
writeFileSync(
  "public/live/data.enc.json",
  JSON.stringify({
    v: 1,
    iterations: ITERATIONS,
    salt: salt.toString("base64"),
    iv,
    data: data.toString("base64"),
  }) + "\n",
);
const total = readdirSync("public/live/inst").reduce(
  (n, f) => n + readFileSync(`public/live/inst/${f}`).length,
  0,
);
console.log(
  `Locked the live timeline (${tl.lines.length} lines) and ${tl.songs.length} instrumentals (${Math.round(total / 1e6)} MB).`,
);
