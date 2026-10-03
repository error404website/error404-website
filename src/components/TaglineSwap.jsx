import React from "react";

const LINES = ["SOMETHING SURVIVED THE CRASH", "HYPERPOP MAXIMALISM"];
const GLYPHS = "!<>-_\\/[]{}=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// The hero tagline: every few seconds it scrambles into "HYPERPOP MAXIMALISM"
// and back, in the same type and colour. Screen readers get both lines once;
// with Reduce Motion it stays on the original line.
export function TaglineSwap() {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let line = 0;
    let step;
    const scramble = (to) => {
      const el = ref.current;
      if (!el) return;
      const n = Math.max(el.textContent.length, to.length);
      let frame = 0;
      el.classList.add("e-swap-glitch");
      const tick = () => {
        frame++;
        let s = "";
        for (let i = 0; i < n; i++)
          s += i < frame * 1.6 ? to[i] || "" : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        el.textContent = s;
        if (frame * 1.6 >= n) {
          el.textContent = to;
          el.classList.remove("e-swap-glitch");
        } else {
          step = setTimeout(tick, 34);
        }
      };
      tick();
    };
    const timer = setInterval(() => {
      if (document.hidden || window.__e404MenuOpen) return;
      line = 1 - line;
      scramble(LINES[line]);
    }, 3800);
    return () => {
      clearInterval(timer);
      clearTimeout(step);
    };
  }, []);
  return (
    <>
      <span className="sr-only">Something survived the crash. Hyperpop maximalism.</span>
      <span ref={ref} aria-hidden="true">
        {LINES[0]}
      </span>
    </>
  );
}
