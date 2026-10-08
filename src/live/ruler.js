// R1 · set timecode under the nav: the vault's ruler for the whole show. A tick every 1.5 s (16 px),
// the time every minute, a magenta notch + number at each song's start, and a gradient playhead held
// a third of the way in while the set scrolls past.
const PPS = 160 / 15; // px per second: the vault ruler's 160 px per 15 s
const pad = (n) => String(n).padStart(2, "0");
const clock = (s) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;

export function makeRuler(canvas, songs) {
  const x = canvas.getContext("2d");
  let W = 0,
    H = 0,
    dpr = 0;
  function fit() {
    // measured on every draw: canvases in a background tab never get a resize
    const w = canvas.clientWidth,
      h = canvas.clientHeight,
      d = devicePixelRatio || 1;
    if (w === W && h === H && d === dpr) return;
    W = w;
    H = h;
    dpr = d;
    canvas.width = Math.round(w * d);
    canvas.height = Math.round(h * d);
    x.setTransform(d, 0, 0, d, 0, 0);
  }
  return function draw(t, k) {
    fit();
    if (!W) return;
    const px = Math.round(W / 3),
      t0 = t - px / PPS;
    x.clearRect(0, 0, W, H);
    x.fillStyle = "#030409";
    x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(244,244,248,.1)";
    x.fillRect(0, 0, W, 1);
    x.font = "8px 'Space Mono', monospace";
    // ticks every 1.5 s, a taller one + the time every minute
    for (let sec = Math.floor(t0 / 15) * 15; (sec - t0) * PPS < W; sec += 15) {
      const X = Math.round((sec - t0) * PPS) + 0.5;
      x.fillStyle = "rgba(244,244,248,.18)";
      for (let q = 0; q < 10; q++) x.fillRect(X + q * 16, 1, 1, 4);
      if (sec >= 0 && sec % 60 === 0) {
        x.fillStyle = "rgba(244,244,248,.4)";
        x.fillRect(X, 1, 1, 9);
        x.fillStyle = "rgba(244,244,248,.28)";
        x.fillText(clock(sec), X + 4, 19);
      }
    }
    // song starts
    songs.forEach((s, i) => {
      const X = Math.round((s.start - t0) * PPS);
      if (X < -200 || X > W) return;
      x.fillStyle = "#ff00e5";
      x.fillRect(X, 1, 1, 14);
      x.fillStyle = i === k ? "#f4f4f8" : "rgba(255,0,229,.75)";
      x.fillText(`${pad(i + 1)} ${s.title}`, X + 4, 12);
    });
    // played so far: a faint wash and the gradient underline, then the playhead
    x.fillStyle = "rgba(255,0,229,.06)";
    x.fillRect(0, 0, px, H);
    const g = x.createLinearGradient(0, 0, px, 0);
    g.addColorStop(0, "#ff00e5");
    g.addColorStop(1, "#00efff");
    x.fillStyle = g;
    x.fillRect(0, H - 2, px, 2);
    x.fillStyle = "#f4f4f8";
    x.shadowColor = "#ff00e5";
    x.shadowBlur = 8;
    x.fillRect(px - 1, 0, 2, H);
    x.shadowBlur = 0;
  };
}
