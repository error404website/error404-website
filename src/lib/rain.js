// The site's three-layer digital rain (7 / 10 / 14 px columns streaming words, magenta → violet →
// cyan across the screen), as used by the Source Vault's gate and unlock intro. Shared by /live/.
// Fills the canvas's own box (the whole window for the gates, the lyrics panel for the show).
export const REDUCE =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function rain(cv, words) {
  const ctx = cv.getContext("2d"),
    dpr = Math.min(2, devicePixelRatio || 1),
    W = cv.clientWidth || innerWidth,
    H = cv.clientHeight || innerHeight,
    phone = W < 768;
  cv.width = W * dpr;
  cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = "top";
  const LAYERS = [
    { fs: 7, pfs: 6, sp: [170, 320], a: 0.45, glow: 0.6, head: 0.55, every: 1 },
    { fs: 10, pfs: 9, sp: [320, 600], a: 0.8, glow: 0.9, head: 0.9, every: 2 },
    { fs: 14, pfs: 12, sp: [620, 980], a: 1, glow: 1, head: 1, every: 7 },
  ];
  const colour = (t) => {
    const a = [255, 0, 229],
      m = [161, 0, 255],
      c = [0, 239, 255];
    const [p, q, u] = t < 0.5 ? [a, m, t * 2] : [m, c, (t - 0.5) * 2];
    return p.map((v, i) => Math.round(v + (q[i] - v) * u)).join(",");
  };
  const streams = [];
  let pool = words,
    drain = false,
    raf = 0,
    last = performance.now();
  LAYERS.forEach((L, li) => {
    const fs = phone ? L.pfs : L.fs,
      n = Math.ceil(W / fs);
    for (let c = 0; c < n; c++) {
      if ((c + li) % L.every) continue;
      streams.push({
        L,
        fs,
        x: c * fs,
        w: words[(c * 7 + li * 3) % words.length] + "   ",
        row: (-Math.random() * H * 0.6) / fs,
        rows: Math.ceil(H / fs),
        sp: (L.sp[0] + Math.random() * (L.sp[1] - L.sp[0])) / fs,
        col: colour(c / n),
      });
    }
  });
  ctx.fillStyle = "#030409";
  ctx.fillRect(0, 0, W, H);
  let speed = 1; // the live stage screen drives it with the music (14)
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000) * speed;
    last = now;
    ctx.fillStyle = `rgba(3,4,9,${drain ? 0.2 : 0.075})`;
    ctx.fillRect(0, 0, W, H);
    for (const s of streams) {
      if (s.row < -9000) continue;
      s.row += s.sp * dt;
      const r = Math.floor(s.row);
      if (r < 0) continue;
      const y = r * s.fs,
        L = s.w.length;
      ctx.font = `${s.fs}px 'Space Mono', monospace`;
      ctx.globalAlpha = s.L.a;
      ctx.fillStyle = `rgb(${s.col})`;
      ctx.fillText(s.w[(r - 1 + L * 99) % L], s.x, y - s.fs);
      ctx.globalAlpha = s.L.head;
      ctx.fillStyle = "#F4F4F8";
      ctx.shadowColor = `rgb(${s.col})`;
      ctx.shadowBlur = s.fs * s.L.glow;
      ctx.fillText(s.w[r % L], s.x, y);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      if (r > s.rows + 2) {
        s.row = drain ? -9999 : (-Math.random() * 240) / s.fs;
        s.w = pool[Math.floor(Math.random() * pool.length)] + "   "; // a recycled column picks up the current words
      }
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    drain() {
      drain = true;
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
    pause() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
    resume() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    words(w) {
      if (w && w.length) pool = w;
    },
    speed(m) {
      speed = Math.max(0.2, Math.min(3, m));
    },
  };
}
