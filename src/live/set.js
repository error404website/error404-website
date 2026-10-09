// 01 · Sets: any running order of the 20 songs, built from the approved live set.
//
// Every song keeps its exact length. Where a song's neighbours are the ones it had in the approved set,
// its join is the approved one, untouched. Where they changed, the engine swaps the file's ends for the
// song's clean patches (engine.js): `head` when the song opens after a different song (or opens the
// set without being song 1), `tail` when a different song follows it (or it closes the set without
// being song 20). The incoming song's lead-in then plays over the outgoing song's own ring-out, like
// the set's ring-over changeovers.
//
// Lyrics, sections, beats and the stage cues move with their song; section line indices are remapped.
export const ALBUM = Array.from({ length: 20 }, (_, i) => i + 1);

export function deriveTimeline(base, order) {
  const sr = base.sr;
  const byN = new Map(base.songs.map((s) => [s.n, s]));
  order = order.filter((n) => byN.has(n));
  const songs = [];
  const delta = new Map(); // song n -> new start - album start
  let t = 0;
  order.forEach((n, j) => {
    const s = byN.get(n),
      prev = order[j - 1],
      next = order[j + 1];
    const head = !!s.patch && (j === 0 ? n !== 1 : prev !== n - 1);
    const tail = !!s.patch && (j === order.length - 1 ? n !== 20 : next !== n + 1);
    songs.push({ ...s, start: t, head, tail, into: j === 0 ? "" : head ? "RING-OVER" : s.into });
    delta.set(n, t - s.start);
    t += s.frames / sr;
  });
  const last = songs[songs.length - 1];
  const duration = t + (last?.tail ? last.patch.ring : 0);
  // album-order song of a set time (for beats, which carry no song number)
  const albumSongAt = (x) => {
    for (let k = base.songs.length - 1; k >= 0; k--)
      if (x >= base.songs[k].start - 1e-6) return base.songs[k];
    return base.songs[0];
  };
  const oldToNew = new Map();
  const lines = base.lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => delta.has(l.n))
    .map(({ l, i }) => {
      const d = delta.get(l.n);
      return {
        i,
        l: {
          ...l,
          t: l.t + d,
          e: l.e + d,
          w: l.w.map((w) => ({ ...w, t: w.t + d, ...(w.e != null ? { e: w.e + d } : {}) })),
        },
      };
    })
    .filter(({ l }) => l.t >= 0)
    .sort((a, b) => a.l.t - b.l.t);
  lines.forEach(({ i }, j) => oldToNew.set(i, j));
  const secs = base.secs
    .filter((q) => delta.has(q.n))
    .map((q) => ({
      ...q,
      t: q.t + delta.get(q.n),
      lines: (q.lines || []).map((i) => oldToNew.get(i)).filter((i) => i !== undefined),
    }))
    .sort((a, b) => a.t - b.t);
  const beats = base.beats
    .map(([bt, pos]) => {
      const s = albumSongAt(bt);
      if (!delta.has(s.n) || bt < s.start - 1e-6) return null;
      return [bt + delta.get(s.n), pos];
    })
    .filter((b) => b && b[0] >= 0 && b[0] < duration)
    .sort((a, b) => a[0] - b[0]);
  return { ...base, songs, lines: lines.map((x) => x.l), secs, beats, duration, order };
}

// is this order the album, untouched? (then the derived timeline equals the decrypted one)
export const isAlbum = (order) => order.length === 20 && order.every((n, i) => n === i + 1);

// "SKIP READ to land on time": the upcoming song whose length best covers an overrun
export function skipSuggestion(tl, k, over) {
  const cands = tl.songs.map((s, i) => ({ s, i, len: s.frames / tl.sr })).filter((c) => c.i > k + 1); // never the song on now or the one already lined up
  if (!cands.length) return null;
  const fits = cands.filter((c) => c.len >= over).sort((a, b) => a.len - b.len);
  return (fits[0] || cands.sort((a, b) => b.len - a.len)[0]).s;
}
