import { motion } from "framer-motion";
import React from "react";
import { CHAPTERS } from "../data/chapters";

// Intro "M3 · the tracklist falls": code rain whose columns stream the album's own
// track names, while a terminal readout counts the recovery to 20/20 FILES INTACT.
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
    const fs = Math.max(13, Math.round(W / 62));
    const cols = Math.ceil(W / fs);
    const rows = Math.ceil(H / fs);
    // each column streams one track name, top to bottom, with a gap before it repeats
    const words = Array.from({ length: cols }, (_, i) => TITLES[(i * 7) % TITLES.length] + "   ");
    const drops = Array.from({ length: cols }, () => -Math.random() * rows);
    const speed = Array.from({ length: cols }, () => 0.35 + Math.random() * 0.55);
    const colour = Array.from({ length: cols }, (_, c) => columnColour(c / cols));
    const charAt = (c, r) => words[c][((r % words[c].length) + words[c].length) % words[c].length];
    ctx.font = `${fs}px 'Space Mono', monospace`;
    ctx.textBaseline = "top";
    let raf;
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const draining = drainRef.current;
      ctx.fillStyle = `rgba(3,4,9,${draining ? 0.2 : 0.07})`;
      ctx.fillRect(0, 0, W, H);
      for (let c = 0; c < cols; c++) {
        if (drops[c] < -9000) continue;
        drops[c] += speed[c] * dt * 54;
        const r = Math.floor(drops[c]);
        if (r < 0) continue;
        const x = c * fs;
        const y = r * fs;
        ctx.fillStyle = `rgb(${colour[c]})`;
        ctx.fillText(charAt(c, r - 1), x, y - fs);
        ctx.fillStyle = "#F4F4F8";
        ctx.shadowColor = `rgb(${colour[c]})`;
        ctx.shadowBlur = fs * 0.8;
        ctx.fillText(charAt(c, r), x, y);
        ctx.shadowBlur = 0;
        if (r > rows + 2) drops[c] = draining ? -9999 : -Math.random() * 20;
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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(3,4,9,0.85) 100%)",
        }}
        aria-hidden="true"
      />
      <span className="e-bscan" aria-hidden={true} />
      <div className={"e-bterm" + (draining ? " out" : "")} aria-hidden="true">
        <div>
          <b>&gt;</b> RECOVERING ARCHIVE_404
        </div>
        <div>
          <b>&gt;</b> FILE <i>{pad(count)}/20</i>
          {count > 0 && <span className="e-bterm-t">{TITLES[count - 1]}</span>}
        </div>
        {done && (
          <div>
            <b>&gt;</b> <i>20/20 FILES INTACT</i>
          </div>
        )}
        <span className="e-bterm-cur" />
      </div>
      <p className="sr-only">Recovering ARCHIVE_404: 20 of 20 files intact.</p>
      {/* visually hidden; appears only when focused, e.g. by a screen reader (tap / any key also skips) */}
      <button type="button" className="e-bskip e-bskip-hidden" onClick={finish}>
        SKIP
      </button>
    </motion.div>
  );
}
