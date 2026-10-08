// P2 · the song as one slim waveform: the played part in the frequency colours (bass violet, mids
// magenta, highs cyan), the rest faint, a tick and a label at every section, a glowing dot for the
// playhead. A song with a single section (ORIGIN's narration) is marked every 8 bars instead.
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
function kind(name) {
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

const LINE = 46, // px: the waveform band
  LABELS = 14; // under it
export const WAVE_H = LINE + LABELS;

export function makeWave(cv, TL) {
  const cache = new Map();
  const song = (k) => {
    if (cache.has(k)) return cache.get(k);
    const s = TL.songs[k];
    const raw = s.wv ? Uint8Array.from(atob(s.wv), (c) => c.charCodeAt(0)) : new Uint8Array(4);
    const dur = s.frames / TL.sr;
    const bars = TL.beats
      .filter((b) => b[1] === 1 && b[0] >= s.start && b[0] < s.start + dur)
      .map((b) => b[0] - s.start);
    let secs = TL.secs.filter((q) => q.n === s.n).map((q) => ({ name: q.name, t: q.t - s.start }));
    if (secs.length < 2)
      secs = bars
        .filter((_, i) => i % 8 === 0)
        .map((t, i) => ({ name: i ? `BAR ${i * 8 + 1}` : secs[0]?.name || "Intro", t, tick: 1 }));
    else if (secs[0].t > 0.5) secs.unshift({ name: "Intro", t: 0 });
    const d = { s, raw, n: raw.length / 4, rate: s.wr || 25, dur, secs, bars };
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

  function draw(T, k) {
    if (!W || cv.clientWidth !== W) size();
    if (!W) return;
    const d = song(k),
      c = ctx,
      px = d.dur / W,
      mid = LINE / 2;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, WAVE_H);
    for (let x = 0; x < W; x += 2) {
      const t = x * px,
        j = bin(d, t) * 4,
        r = d.raw,
        a = Math.max(0.5, (r[j] / 255) * (mid - 4));
      if (t <= T) {
        const l = r[j + 1],
          m = r[j + 2],
          h = r[j + 3],
          sum = l + m + h + 1;
        c.fillStyle = rgba(
          [0, 1, 2].map((q) => Math.round((LOW[q] * l + MID[q] * m + HIGH[q] * h) / sum)),
          0.9,
        );
      } else c.fillStyle = "rgba(244,244,248,.16)";
      c.fillRect(x, mid - a, 1.2, a * 2);
    }
    c.font = "8px 'Space Mono', monospace";
    const cur = secAt(d, T);
    d.secs.forEach((q, i) => {
      const x = q.t / px,
        next = d.secs[i + 1] ? d.secs[i + 1].t / px : W;
      c.fillStyle = rgba(C[q.tick ? "other" : kind(q.name)], q.tick ? 0.35 : 0.9);
      c.fillRect(x, LINE - 4, 1, 4);
      if (next - x > 30) {
        c.fillStyle = i === cur ? "rgba(244,244,248,.9)" : "rgba(244,244,248,.4)";
        c.fillText(short(q.name), x + 3, LINE + 9);
      }
    });
    c.fillStyle = "#f4f4f8";
    c.shadowColor = "#ff00e5";
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(Math.max(4, Math.min(W - 4, T / px)), mid, 4, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    const s = d.secs[cur],
      nx = d.secs[cur + 1],
      bars = Math.max(0, Math.ceil((secEnd(d, cur) - T) / (240 / (d.s.bpm || 140))));
    return {
      title: d.s.title,
      read: s.tick
        ? `${d.secs[0].name.toUpperCase()} · END IN`
        : `${s.name.toUpperCase()} · ${nx ? `→ ${nx.name.toUpperCase()} IN` : "END IN"}`,
      bars: s.tick ? Math.max(0, Math.ceil((d.dur - T) / (240 / (d.s.bpm || 140)))) : bars,
    };
  }

  // anywhere on the waveform → that point of the song, snapped to the nearest bar
  function hit(x, y, k) {
    const d = song(k),
      w = cv.clientWidth || W; // measured now: the canvas may not have drawn yet
    if (!w) return null;
    const t = Math.max(0, Math.min(d.dur - 0.5, (x / w) * d.dur));
    return d.bars.reduce((p, q) => (Math.abs(q - t) < Math.abs(p - t) ? q : p), 0);
  }
  return { draw, hit };
}
