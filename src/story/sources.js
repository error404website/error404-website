// VIEW SOURCE (W5): the real code behind each chapter's visual, copied from the project's files
// (trimmed with "…" where lines were left out). Rendered with a tiny highlighter, no library.

export const SOURCES = {
  sound: {
    file: "error_404_Archive_404_remix_prompts.md",
    lang: "text",
    code: `## Master style

glitchcore hyperpop metalcore, electronic post-hardcore, UK grime flow,
drop-tuned chug riffs, glitched stutter edits, bitcrushed synth leads,
trap hi-hats and 808s, skippy 2-step drums, cinematic choir and string
pads, heavily processed autotune cleans, raw screamed vocals, gang shouts,
huge widescreen modern rock mix

## Production style (optional, add to every track)

- **Arena polish:** arena-scale polished production, glossy loud master…
- **Glitch-heavy:** glitch-saturated production, constant chopped edits…

## 2. left_behind

### Style

…huge widescreen modern rock mix; [PRODUCTION STYLE]; 80 BPM ambient piano intro flips
to 144 BPM; rapid UK rap verses over skittering 2-step and trap hats,
screamed gang-vocal hooks, drop-tuned chug breakdown with glitch
stutters, autotuned emo cleans in a half-time bridge, solo piano outro;
male vocals, bitter and defiant`,
  },
  seam: {
    file: "e404-mix-work/live.py",
    lang: "py",
    code: `def seam_index(t, last_vocal):
    """Bar line after the last strong bar AND after the last sung word
    (never cuts a song's ending)."""
    e = seam_out(t)
    b = t["beats"]
    …
    v = int(np.searchsorted(b, last_vocal + 0.05))
    ph = ph_end if v >= len(t["dact"]) - 4 else local_phase(t, v - 80, v + 1)
    v += (ph - v) % 4
    return int(min(max(e, v), len(b) - 1))

…
e = seam_index(A, voc[str(A["n"])]["last"])
# never let the next song's first word start before this one's last word
# ends: if its lead-in sings that early, the seam moves on by whole bars
tB1_est = B["beats"][seam_in(B)]
while voc[str(B["n"])]["first"] - tB1_est < voc[str(A["n"])]["last"] - A["beats"][e] + 0.15:
    …
    e += 4`,
  },
  site: {
    file: "vite.config.js",
    lang: "js",
    code: `// The same for the tracks in public/audio (cached for 30 days): a short content hash
// per file, which the players append as ?v=… (src/lib/audioSrc.js). Replacing an MP3
// changes its hash, so listeners get the new mix on their next visit.
function audioVersions() {
  const map = {};
  for (const f of readdirSync("public/audio")) {
    if (!f.endsWith(".mp3") || f.startsWith("._")) continue;
    map[f] = createHash("sha256")
      .update(readFileSync(\`public/audio/\${f}\`))
      .digest("hex")
      .slice(0, 8);
  }
  return map;
}`,
  },
  vault: {
    file: "src/vault/main.js",
    lang: "js",
    code: `async function derive(key, salt, iterations) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.trim().toLowerCase()),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64.from(salt), iterations },
    base,
    256,
  );
}
async function openVault(rawKey, proof) {
  const s = await getSealed();
  try {
    const k = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.from(s.iv) }, k, b64.from(s.data));
    …
  } catch {
    return false; // wrong key: the authenticated decryption fails
  }
}`,
  },
  live: {
    file: "src/live/engine.js",
    lang: "js",
    code: `// keep the real samples. Browsers differ in how much of the MP3's encoder priming and decoder delay
// they leave at the front (Chrome: 576 + 529 samples; Safari honours the gapless tag), so find the
// file's fingerprint (64 true samples at a known spot) in the decode and cut exactly there.
function trim(ctx, raw, frames, pad, fp) {
  let start = -1;
  if (fp && fp.v && fp.v.length) {
    const d = raw.getChannelData(0),
      v = fp.v,
      n = v.length;
    let best = Infinity;
    for (let off = 0; off <= 3000; off++) {
      let e = 0;
      for (let j = 0; j < n && e < best; j++) {
        const x = d[fp.at + off + j] - v[j];
        e += x * x;
      }
      if (e < best) {
        best = e;
        start = off;
      }
    }
  }
  …
}`,
  },
  feed: {
    file: "m4l/e404show.js · Max for Live",
    lang: "js",
    code: `// the set position in ms as five 7-bit CCs (110-114, most significant first) then CC 115 = playing, on MIDI
// channel 16 (plain CCs: the browser needs no sysex permission). Live lets one CC per tick out of a device,
// so a frame goes out over six ticks: it's a snapshot of where the set will be when CC 115 (the commit) leaves.
var frame = null, slot = 0, TICK_MS = 25;
function feed(t, playing) {
	if (slot === 0) {
		var ms = Math.max(0, Math.round(beatToSec(t) * 1000 + (playing ? 5 * TICK_MS : 0)));
		frame = [];
		for (var i = 0; i < 5; i++) frame.push((ms >> (7 * (4 - i))) & 0x7F);
		frame.push(playing ? 1 : 0);
	}
	outlet(1, [0xBF, 110 + slot, frame[slot]]);
	slot = (slot + 1) % 6;
}`,
  },
  crew: {
    file: "e404-mix-work/refine.py",
    lang: "py",
    code: `# wav2vec2 is a vote, not a replacement: in a dense mix it lets a line's first word grab the
# breath / ad-lib before the entry. Per word, take its timing only when the two agree within
# AGREE; otherwise stable-ts stands. Squashed stable-ts words always take wav2vec2's spread.
AGREE = 0.15    # S3: wav2vec2 moves a word only when within this of stable-ts
…
pick, used = [], 0
for k2, a in enumerate(A):
    b = B[k2] if B else None
    short = a["e"] - a["s"] < SQUASH
    if b and (abs(b["s"] - a["s"]) <= AGREE or (short and abs(b["s"] - a["s"]) <= 2 * AGREE)):
        pick.append({"w": a["w"], "s": b["s"], "e": b["e"]})
        used += 1
    else:
        pick.append(dict(a))`,
  },
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const KW =
  /\b(const|let|var|function|return|async|await|if|for|while|def|import|from|new|try|catch|else|continue|in|not|and|or|None|true|false|null)\b/;
// one pass: comments, strings, keywords, numbers; everything else is escaped as-is
export function highlight(code, lang) {
  if (lang === "text") return esc(code).replace(/^(##.*)$/gm, '<i class="k">$1</i>');
  const re = new RegExp(
    String.raw`(\/\/.*|#.*|"""[\s\S]*?"""|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\x60(?:[^\x60\\]|\\.)*\x60)|` +
      KW.source +
      String.raw`|(\b0x[0-9A-Fa-f]+\b|\b\d+(?:\.\d+)?\b)`,
    "g",
  );
  let out = "",
    last = 0;
  code.replace(re, (m, str, kw, num, i) => {
    out += esc(code.slice(last, i));
    const cls = str
      ? /^(\/\/|#)/.test(str) && !(lang === "js" && str[0] === "#")
        ? "c"
        : "s"
      : kw
        ? "k"
        : "n";
    out += `<i class="${cls}">${esc(m)}</i>`;
    last = i + m.length;
    return m;
  });
  return out + esc(code.slice(last));
}
