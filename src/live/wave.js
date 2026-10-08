// W4 · the waveform strip: a scrolling deck (≈16 bars around the playhead, coloured by frequency:
// bass violet, mids magenta, highs cyan) with section flags and bar ticks, a lane of the lines to sing
// (white = singing now, cyan = coming up), and the whole song's map with its sections underneath.
// Data: song.wv (base64 uint8 [peak, low, mid, high] per bin) at song.wr bins/s, from live_wave.py.

const C = {
  hook: [255, 0, 229],
  verse: [0, 239, 255],
  bridge: [255, 184, 77],
  intro: [161, 0, 255],
  other: [244, 244, 248],
};
const LOW = C.intro,
  MID = C.hook,
  HIGH = C.verse;
export function kind(name) {
  const n = name.toLowerCase();
  if (n.includes("hook") || n.includes("chorus")) return "hook";
  if (n.includes("verse") || n.includes("rap")) return "verse";
  if (n.includes("bridge") || n.includes("breakdown") || n.includes("drop")) return "bridge";
  if (n.includes("intro") || n.includes("outro") || n.includes("narration")) return "intro";
  return "other";
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const short = (n) =>
  n
    .replace(/^Verse /i, "V")
    .replace(/^Final Hook/i, "HOOK ×")
    .replace(/^Breakdown/i, "BRKDN")
    .toUpperCase();

const DECK = 74, // px
  LANE = 14,
  MAPW = 20,
  ROW = 14,
  GAP = 4,
  SPAN = 32; // seconds visible in the deck
export const WAVE_H = DECK + GAP + LANE + GAP + MAPW + 2 + ROW + 6;

export function makeWave(cv, TL) {
  const cache = new Map();
  const song = (k) => {
    if (cache.has(k)) return cache.get(k);
    const s = TL.songs[k];
    const raw = s.wv ? Uint8Array.from(atob(s.wv), (c) => c.charCodeAt(0)) : new Uint8Array(4);
    const d = {
      s,
      raw,
      n: raw.length / 4,
      rate: s.wr || 25,
      dur: s.frames / TL.sr,
      secs: TL.secs.filter((q) => q.n === s.n).map((q) => ({ name: q.name, t: q.t - s.start })),
      lines: TL.lines.filter((l) => l.n === s.n).map((l) => ({ t: l.t - s.start, e: l.e - s.start })),
      bars: TL.beats
        .filter((b) => b[1] === 1 && b[0] >= s.start && b[0] < s.start + s.frames / TL.sr)
        .map((b) => b[0] - s.start),
    };
    if (!d.secs.length || d.secs[0].t > 0.5) d.secs.unshift({ name: "Intro", t: 0 });
    cache.set(k, d);
    if (cache.size > 3) cache.delete(cache.keys().next().value);
    return d;
  };
  let W = 0,
    dpr = 1,
    ctx = null;
  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth;
    cv.width = W * dpr;
    cv.height = WAVE_H * dpr;
    ctx = cv.getContext("2d");
  };
  addEventListener("resize", size);

  const bin = (d, t) => Math.max(0, Math.min(d.n - 1, Math.floor(t * d.rate)));
  const secAt = (d, t) => {
    let i = 0;
    d.secs.forEach((q, j) => q.t <= t && (i = j));
    return i;
  };
  const secEnd = (d, i) => (d.secs[i + 1] ? d.secs[i + 1].t : d.dur);
  const mapX0 = 14;

  function draw(T, k) {
    if (!W || cv.clientWidth !== W) size();
    if (!W) return;
    const d = song(k);
    const c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, WAVE_H);
    c.font = "9px 'Space Mono', monospace";
    // ---- deck
    const t0 = T - SPAN / 2,
      px = SPAN / W,
      mid = DECK / 2;
    for (let i = 0; i < d.secs.length; i++) {
      const a = (d.secs[i].t - t0) / px,
        b = (secEnd(d, i) - t0) / px;
      if (b < 0 || a > W) continue;
      const col = C[kind(d.secs[i].name)];
      c.fillStyle = rgba(col, 0.07);
      c.fillRect(a, 0, b - a, DECK);
      c.fillStyle = rgba(col, 0.9);
      c.fillRect(a, 0, 2, DECK);
      c.fillText(short(d.secs[i].name), a + 6, 12);
    }
    c.fillStyle = "rgba(244,244,248,.14)";
    for (const b of d.bars) {
      const x = (b - t0) / px;
      if (x >= 0 && x <= W) c.fillRect(x, DECK - 5, 1, 5);
    }
    for (let x = 0; x < W; x += 2) {
      const t = t0 + x * px;
      if (t < 0 || t > d.dur) continue;
      const j = bin(d, t) * 4,
        r = d.raw;
      const a = (r[j] / 255) * (mid - 6);
      const l = r[j + 1],
        m = r[j + 2],
        h = r[j + 3],
        sum = l + m + h + 1;
      const col = [0, 1, 2].map((q) => Math.round((LOW[q] * l + MID[q] * m + HIGH[q] * h) / sum));
      c.fillStyle = rgba(col, t < T ? 0.45 : 1);
      c.fillRect(x, mid - a, 1.6, Math.max(1, a * 2));
    }
    // ---- vocal lane
    const ly = DECK + GAP;
    c.fillStyle = "rgba(244,244,248,.04)";
    c.fillRect(0, ly, W, LANE);
    for (const L of d.lines) {
      const a = (L.t - t0) / px,
        b = (L.e - t0) / px;
      if (b < 0 || a > W) continue;
      const now = L.t <= T && T <= L.e;
      c.fillStyle = now ? "#f4f4f8" : L.t > T ? "rgba(0,239,255,.55)" : "rgba(244,244,248,.18)";
      c.fillRect(a, ly + 2, Math.max(3, b - a - 2), LANE - 4);
    }
    c.fillStyle = "rgba(244,244,248,.45)";
    c.font = "8px 'Space Mono', monospace";
    c.fillText("VOX", 6, ly + 10);
    // playhead through deck + lane
    c.fillStyle = "#f4f4f8";
    c.shadowColor = "#ff00e5";
    c.shadowBlur = 10;
    c.fillRect(W / 2 - 1, 0, 2, ly + LANE);
    c.shadowBlur = 0;
    // ---- song map + sections
    const my = ly + LANE + GAP,
      mw = W - mapX0 * 2,
      mpx = d.dur / mw,
      cur = secAt(d, T);
    for (let x = 0; x < mw; x += 2) {
      const t = x * mpx,
        a = (d.raw[bin(d, t) * 4] / 255) * (MAPW / 2 - 1);
      c.fillStyle = rgba(C[kind(d.secs[secAt(d, t)].name)], t <= T ? 0.95 : 0.3);
      c.fillRect(mapX0 + x, my + MAPW / 2 - a, 1.4, Math.max(1, a * 2));
    }
    const ry = my + MAPW + 2;
    d.secs.forEach((q, i) => {
      const a = mapX0 + q.t / mpx,
        b = mapX0 + secEnd(d, i) / mpx,
        col = C[kind(q.name)];
      c.fillStyle = rgba(col, i === cur ? 0.95 : i < cur ? 0.18 : 0.32);
      c.fillRect(a + 1, ry, Math.max(1, b - a - 2), ROW);
      if (i === cur) {
        const f = (T - q.t) / (secEnd(d, i) - q.t);
        c.fillStyle = "rgba(0,0,0,.35)";
        c.fillRect(a + 1 + f * (b - a - 2), ry, (1 - f) * (b - a - 2), ROW);
      }
      if (b - a > 28) {
        c.fillStyle = i === cur ? "#000" : rgba(col, 1);
        c.fillText(short(q.name), a + 5, ry + 10);
      }
    });
    c.fillStyle = "#f4f4f8";
    c.shadowColor = "#ff00e5";
    c.shadowBlur = 8;
    c.fillRect(mapX0 + T / mpx - 1, my - 2, 2, MAPW + ROW + 6);
    c.shadowBlur = 0;
    // readout: this section → next section in N bars
    const s = d.secs[cur],
      nx = d.secs[cur + 1],
      barLen = 240 / (d.s.bpm || 140),
      bars = Math.max(0, Math.ceil((secEnd(d, cur) - T) / barLen));
    return {
      title: d.s.title,
      read: `${s.name.toUpperCase()} · ${nx ? `→ ${nx.name.toUpperCase()} IN` : "END IN"}`,
      bars,
    };
  }

  // the map area (y below the lane) → time in the song, snapped to the nearest bar; else null
  function hit(x, y, k) {
    const d = song(k);
    if (y < DECK + GAP + LANE + GAP - 2) return null;
    const t = Math.max(0, Math.min(d.dur - 0.5, ((x - mapX0) / (W - mapX0 * 2)) * d.dur));
    return d.bars.reduce((p, q) => (Math.abs(q - t) < Math.abs(p - t) ? q : p), 0);
  }
  return { draw, hit };
}
