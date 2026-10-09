// POST /api/live/pair: pairs a phone remote with the show laptop (11), then gets out of the way.
//
//   { op: "open", proof, offer }    → { code }          the laptop (it proves it knows the access key,
//                                                        exactly like the vault's stems function)
//   { op: "offer", code }           → { offer }         the phone reads the laptop's WebRTC offer
//   { op: "answer", code, answer }  → { ok: true }      the phone leaves its answer
//   { op: "poll", proof, code }     → { answer | null } the laptop picks it up; the pairing is deleted
//
// A pairing is a one-time 6-character code that lives 10 minutes in Netlify Blobs. Once the two have
// swapped offer and answer they talk to each other directly (a WebRTC data channel); nothing about the
// show goes through the site.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";
import vault from "../vault-proof.json" with { type: "json" };

const TTL = 10 * 60e3;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
const MAX_SDP = 24000;

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
const validCode = (c) => typeof c === "string" && c.length === 6 && [...c].every((x) => ALPHABET.includes(x));
const validSdp = (d) =>
  d &&
  typeof d === "object" &&
  typeof d.sdp === "string" &&
  d.sdp.length < MAX_SDP &&
  ["offer", "answer"].includes(d.type);

// the store (tests swap in a Map through globalThis.__livePairStore)
const store = () => globalThis.__livePairStore || getStore({ name: "live-pair", consistency: "strong" });
async function read(code) {
  const raw = await store().get(code);
  if (!raw) return null;
  const rec = JSON.parse(raw);
  if (Date.now() - rec.at > TTL) {
    await store().delete(code);
    return null;
  }
  return rec;
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b = {};
  try {
    b = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (b.op === "open" || b.op === "poll") {
    if (!proofOk(b.proof)) {
      await new Promise((r) => setTimeout(r, 600));
      return json({ error: "locked" }, 401);
    }
  }
  if (b.op === "open") {
    if (!validSdp(b.offer) || b.offer.type !== "offer") return json({ error: "bad offer" }, 400);
    const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    await store().set(code, JSON.stringify({ at: Date.now(), offer: b.offer, answer: null }));
    return json({ code });
  }
  if (!validCode(b.code)) return json({ error: "bad code" }, 400);
  const rec = await read(b.code);
  if (!rec) return json({ error: "expired" }, 404);
  if (b.op === "offer") return json({ offer: rec.offer });
  if (b.op === "answer") {
    if (!validSdp(b.answer) || b.answer.type !== "answer" || rec.answer)
      return json({ error: "bad answer" }, 400);
    await store().set(b.code, JSON.stringify({ ...rec, answer: b.answer }));
    return json({ ok: true });
  }
  if (b.op === "poll") {
    if (!rec.answer) return json({ answer: null });
    await store().delete(b.code); // one-time
    return json({ answer: rec.answer });
  }
  return json({ error: "op" }, 400);
};

export const config = { path: "/api/live/pair" };
