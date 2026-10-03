import { motion } from "framer-motion";
import React from "react";

function NoiseCanvas() {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const t = canvasRef.current;
    if (!t) return;
    const n = t.getContext("2d");
    if (!n) return;
    let r;
    let i = -1;
    const s = () => {
      if (window.innerWidth !== i) {
        i = window.innerWidth;
        t.width = window.innerWidth;
        t.height = window.innerHeight;
      }
    };
    s();
    window.addEventListener("resize", s);
    const o = () => {
      const { width: a, height: l } = t;
      const u = n.createImageData(a, l);
      const d = u.data;
      for (let f = 0; f < d.length; f += 4) {
        const p = Math.random() * 255;
        d[f] = d[f + 1] = d[f + 2] = p;
        d[f + 3] = Math.random() * 24;
      }
      n.putImageData(u, 0, 0);
      r = requestAnimationFrame(o);
    };
    o();
    return () => {
      cancelAnimationFrame(r);
      window.removeEventListener("resize", s);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        mixBlendMode: "screen",
      }}
      aria-hidden="true"
    />
  );
}

export function BootSequence({ onComplete }) {
  const [step, setStep] = React.useState(0);
  const [flashKey, setFlashKey] = React.useState(0);
  const finishedRef = React.useRef(false);
  const finish = React.useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setFlashKey((x) => x + 1);
    try {
      sessionStorage.setItem("e404-intro", "1");
    } catch {
      // Storage can be blocked (e.g. Safari Private Browsing); the intro simply plays again next visit.
    }
    onComplete();
  }, [onComplete]);
  React.useEffect(() => {
    const r = typeof matchMedia == "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = [];
    const a = (m, g) => s.push(setTimeout(g, m));
    if (r) {
      a(300, finish);
    } else {
      a(100, () => setStep(1));
      a(750, () => setStep(1.5));
      a(850, () => setStep(2));
      a(1700, () => setStep(3));
      a(1950, () => setStep(4));
      a(2950, finish);
    }
    const i = () => finish();
    window.addEventListener("keydown", i);
    window.addEventListener("pointerdown", i);
    return () => {
      s.forEach(clearTimeout);
      window.removeEventListener("keydown", i);
      window.removeEventListener("pointerdown", i);
    };
  }, [finish]);
  return (
    <motion.div
      className={"e-boot fixed inset-0 z-[9000] select-none" + (step > 0 ? " run" : "")}
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
        duration: 0.25,
        ease: "easeOut",
      }}
      role="dialog"
      aria-label="ERROR_404 intro"
      key="boot"
    >
      <NoiseCanvas />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 35%, rgba(3,4,9,0.92) 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(161,0,255,0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <span className="e-bscan" aria-hidden={true} />
      <span className="e-btrack" aria-hidden={true} />
      <span className="e-bc tl" aria-hidden={true} />
      <span className="e-bc br" aria-hidden={true} />
      <span
        className={"e8c e-bchip" + (step >= 1 && step < 1.5 ? " on" : "")}
        style={{
          "--c": "#FF00E5",
        }}
      >
        <i />
        <span>TRANSMISSION INCOMING</span>
      </span>
      <div className={"e-bl font-heading" + (step >= 3 ? " out" : step >= 2 ? " in" : "")}>
        <span data-t="THE FUTURE FAILED.">
          {"THE FUTURE "}
          <span className="e-grad">FAILED.</span>
        </span>
      </div>
      <div className={"e-bl font-heading" + (step >= 5 ? " out" : step >= 4 ? " in" : "")}>
        <span data-t="THE ARCHIVE REMEMBERED.">
          {"THE ARCHIVE "}
          <span className="e-grad">REMEMBERED.</span>
        </span>
      </div>
      {flashKey > 0 && <div className="e-bflash" aria-hidden={true} key={flashKey} />}
      <span className="e-bbar" aria-hidden={true} />
      <button type="button" className="e-bskip" onClick={finish}>
        SKIP
      </button>
    </motion.div>
  );
}
