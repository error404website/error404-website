// 03 · Hot cues: four jump points per song, A–D. Pre-filled from the song's sections (A the first
// hook, B the breakdown / bridge, C the final hook, D empty) and re-settable by holding a cue button
// (it takes the bar you're in). Saved per song number, relative to the song, so they follow the song
// into any running order. A cue lands on the next bar line, so a repeat or a skip stays in time.
import * as store from "./store";

export const CUE_IDS = ["A", "B", "C", "D"];
export const CUE_COLOURS = { A: "#ff00e5", B: "#00efff", C: "#ffb84d", D: "#4ade80" };

const short = (n) =>
  n
    .replace(/^Final Hook/i, "FINAL")
    .replace(/^Breakdown/i, "BREAK")
    .replace(/^Verse /i, "V")
    .toUpperCase()
    .slice(0, 6);

// the song's cues in set time: [{ id, t, label, set }] (t null = empty)
export function cuesFor(tl, k) {
  const s = tl.songs[k];
  if (!s) return [];
  const secs = tl.secs.filter((q) => q.n === s.n);
  const hooks = secs.filter((q) => /hook|chorus/i.test(q.name));
  const def = {
    A: hooks[0],
    B: secs.find((q) => /breakdown|bridge/i.test(q.name)),
    C: secs.find((q) => /final/i.test(q.name)) || (hooks.length > 1 ? hooks[hooks.length - 1] : null),
    D: null,
  };
  const mine = store.get("cues", {})[s.n] || {};
  return CUE_IDS.map((id) => {
    if (mine[id] != null)
      return { id, t: s.start + mine[id], label: `BAR ${barNo(tl, s, s.start + mine[id])}`, set: true };
    const q = def[id];
    return q
      ? { id, t: barAt(tl, q.t), label: short(q.name), set: false }
      : { id, t: null, label: "HOLD = SET", set: false };
  });
}

// the bar line nearest t (cues land on a downbeat)
export function barAt(tl, t) {
  let best = t,
    d = Infinity;
  for (const [bt, pos] of tl.beats) {
    if (pos !== 1) continue;
    const e = Math.abs(bt - t);
    if (e < d) {
      d = e;
      best = bt;
    }
    if (bt > t + 4) break;
  }
  return best;
}
function barNo(tl, s, t) {
  let n = 0;
  for (const [bt, pos] of tl.beats) {
    if (bt < s.start - 0.05) continue;
    if (bt > t + 0.01) break;
    if (pos === 1) n++;
  }
  return n;
}

export function setCue(tl, k, id, t) {
  const s = tl.songs[k],
    all = store.get("cues", {});
  all[s.n] = { ...(all[s.n] || {}), [id]: +(t - s.start).toFixed(4) };
  store.set("cues", all);
}
export function clearCue(tl, k, id) {
  const s = tl.songs[k],
    all = store.get("cues", {});
  if (all[s.n]) delete all[s.n][id];
  store.set("cues", all);
}
