import { motion } from "framer-motion";
import React from "react";
import { CHAPTERS } from "../data/chapters";

// Intro "M3 · the tracklist falls": fine, three-layer code rain whose columns stream the
// album's own track names, while a terminal readout counts the recovery to 20/20 FILES INTACT.
// Then the streams drain and the intro fades into the hero.
const TITLES = CHAPTERS.flatMap((c) => c.tracks.map((t) => t.title));
const TOTAL_MS = 3900; // intro length
const COUNT_START = 250; // first file recovered
const COUNT_STEP = 150; // ms per file
const DRAIN_AT = 3450; // streams stop spawning and fade out

// magenta → violet → cyan across the screen
function columnColour(t) {
  const a = [255, 0, 229];
  const m = [161, 0, 255];
  const c = [0, 239, 255];
  const [p, q, u] = t < 0.5 ? [a, m, t * 2] : [m, c, (t - 0.5) * 2];
  return p.map((v, i) => Math.round(v + (q[i] - v) * u)).join(",");
}

// Three layers at different sizes give the rain depth: a dim, slow far layer, a mid layer,
// and a few bright, fast near streams. Sizes are fixed in px (fs, then phone size).
const LAYERS = [
  { fs: 7, pfs: 6, speed: [170, 320], alpha: 0.45, glow: 0.6, head: 0.55, every: 1 },
  { fs: 10, pfs: 9, speed: [320, 600], alpha: 0.8, glow: 0.9, head: 0.9, every: 2 },
  { fs: 14, pfs: 12, speed: [620, 980], alpha: 1, glow: 1, head: 1, every: 7 },
];

function TracklistRain({ drainRef }) {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv && cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = window.innerWidth;
    const H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.textBaseline = "top";
    const phone = W < 768;
    // each column streams one track name, top to bottom, with a gap before it repeats
    const streams = [];
    LAYERS.forEach((L, li) => {
      const fs = phone ? L.pfs : L.fs;
      const n = Math.ceil(W / fs);
      for (let c = 0; c < n; c++) {
        if ((c + li) % L.every) continue;
        streams.push({
          L,
          fs,
          x: c * fs,
          word: TITLES[(c * 7 + li * 3) % TITLES.length] + "   ",
          row: (-Math.random() * H * 0.6) / fs,
          rows: Math.ceil(H / fs),
          speed: (L.speed[0] + Math.random() * (L.speed[1] - L.speed[0])) / fs, // rows per second
          colour: columnColour(c / n),
        });
      }
    });
    const charAt = (s, r) => s.word[((r % s.word.length) + s.word.length) % s.word.length];
    let raf;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const draining = drainRef.current;
      ctx.fillStyle = `rgba(3,4,9,${draining ? 0.2 : 0.075})`;
      ctx.fillRect(0, 0, W, H);
      for (const s of streams) {
        if (s.row < -9000) continue;
        s.row += s.speed * dt;
        const r = Math.floor(s.row);
        if (r < 0) continue;
        const { fs, L } = s;
        const y = r * fs;
        ctx.font = `${fs}px 'Space Mono', monospace`;
        ctx.globalAlpha = L.alpha;
        ctx.fillStyle = `rgb(${s.colour})`;
        ctx.fillText(charAt(s, r - 1), s.x, y - fs);
        ctx.globalAlpha = L.head;
        ctx.fillStyle = "#F4F4F8";
        ctx.shadowColor = `rgb(${s.colour})`;
        ctx.shadowBlur = fs * L.glow;
        ctx.fillText(charAt(s, r), s.x, y);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        if (r > s.rows + 2) s.row = draining ? -9999 : (-Math.random() * 240) / fs;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [drainRef]);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

export function BootSequence({ onComplete }) {
  const [count, setCount] = React.useState(0);
  const [draining, setDraining] = React.useState(false);
  const drainRef = React.useRef(false);
  const finishedRef = React.useRef(false);
  const finish = React.useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    try {
      sessionStorage.setItem("e404-intro", "1");
    } catch {
      // Storage can be blocked (e.g. Safari Private Browsing); the intro simply plays again next visit.
    }
    onComplete();
  }, [onComplete]);
  React.useEffect(() => {
    const reduce = typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    if (reduce) {
      at(300, finish);
    } else {
      for (let i = 1; i <= TITLES.length; i++) at(COUNT_START + (i - 1) * COUNT_STEP, () => setCount(i));
      at(DRAIN_AT, () => {
        drainRef.current = true;
        setDraining(true);
      });
      at(TOTAL_MS, finish);
    }
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [finish]);
  const pad = (n) => String(n).padStart(2, "0");
  const done = count === TITLES.length;
  return (
    <motion.div
      className="e-boot run fixed inset-0 z-[9000] select-none"
      style={{
        background: "#030409",
      }}
      initial={{
        opacity: 1,
      }}
      exit={{
        opacity: 0,
      }}
      transition={{
        duration: 0.35,
        ease: "easeOut",
      }}
      role="dialog"
      aria-label="ERROR_404 intro"
      key="boot"
    >
      <TracklistRain drainRef={drainRef} />
      <div className="e-glow" aria-hidden="true" />
      <span className="e-bscan" aria-hidden={true} />
      <div className={"e-icard" + (draining ? " out" : "")} aria-hidden="true">
        <span className="e-icard-vf" />
        <div className="e-icard-tg">
          <i />
          RECOVERY · ARCHIVE_404
        </div>
        <div className="e-icard-h">
          RECOVERING <span className="e-grad">FILES.</span>
        </div>
        <div className="e-icard-l">
          <div>
            <b>&gt;</b> RECOVERING ARCHIVE_404
          </div>
          <div>
            <b>&gt;</b> FILE <i>{pad(count)}/20</i>
            {count > 0 && <span className="e-icard-t">{TITLES[count - 1]}</span>}
          </div>
          {done && (
            <div>
              <b>&gt;</b> <i>20/20 FILES INTACT</i>
            </div>
          )}
        </div>
        <div className="e-icard-bar">
          <b style={{ width: `${(count / TITLES.length) * 100}%` }} />
        </div>
        <div className="e-icard-tk">
          <span>20 FILES</span>
          <span>{pad(count)}/20</span>
        </div>
      </div>
      <p className="sr-only">Recovering ARCHIVE_404: 20 of 20 files intact.</p>
      {/* visually hidden; appears only when focused, e.g. by a screen reader (tap / any key also skips) */}
      <button type="button" className="e-bskip e-bskip-hidden" onClick={finish}>
        SKIP
      </button>
    </motion.div>
  );
}
