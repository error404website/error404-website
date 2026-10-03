import React from "react";

function Gutter({ side }) {
  const isLeft = side === "left";
  const timecodeRef = React.useRef(null);
  const positionRef = React.useRef(null);
  const sectionLabelRef = React.useRef(null);
  React.useEffect(() => {
    const t0 = performance.now();
    const p = (v) => String(v).padStart(2, "0");
    let r;
    const tick = () => {
      if (timecodeRef.current) {
        const ms = performance.now() - t0;
        const s = Math.floor(ms / 1e3);
        timecodeRef.current.textContent = `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(Math.floor(ms / 40) % 25)}`;
      }
      r = requestAnimationFrame(tick);
    };
    tick();
    const N = [
      ["archive", "ARCHIVE_404"],
      ["collective", "COLLECTIVE"],
      ["catalogue", "CATALOGUE"],
      ["signal", "SIGNAL"],
    ];
    const sc = () => {
      const d = document.documentElement;
      const m = d.scrollHeight - innerHeight;
      const q = m > 0 ? scrollY / m : 0;
      if (positionRef.current) positionRef.current.textContent = String(Math.round(q * 999)).padStart(3, "0");
      if (sectionLabelRef.current) {
        let cur = N[0][1];
        N.forEach(([id, nm]) => {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top < innerHeight * 0.5) {
            cur = nm;
          }
        });
        if (q > 0.985) {
          cur = "END_OF_ARCHIVE";
        }
        if (sectionLabelRef.current.textContent !== cur) {
          sectionLabelRef.current.textContent = cur;
        }
      }
    };
    sc();
    addEventListener("scroll", sc, {
      passive: true,
    });
    addEventListener("resize", sc);
    return () => {
      cancelAnimationFrame(r);
      removeEventListener("scroll", sc);
      removeEventListener("resize", sc);
    };
  }, []);
  return (
    <div className={"e-gut " + (isLeft ? "l" : "r")} aria-hidden="true">
      <div className="e-gut-line" />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <div
          className="e-gut-tick"
          style={{
            top: `calc(24px + (100% - 48px) * ${n / 10})`,
          }}
          key={n}
        />
      ))}
      {isLeft ? (
        <div className="e-gut-stack">
          <span
            className="e8c"
            style={{
              "--c": "#ff3b3b",
            }}
          >
            <i />
            <span>REC</span>
          </span>
          <span className="e-gut-tc">
            <b>TC</b>
            <span ref={timecodeRef}>00:00:00:00</span>
          </span>
        </div>
      ) : (
        <div className="e-gut-stack">
          <span className="e-gut-tc">
            <b>POS</b>
            <span ref={positionRef}>000</span>
          </span>
        </div>
      )}
      <span className="e-gut-vert">
        {isLeft ? "ARCHIVE_404 · RECONSTRUCTION ACTIVE" : "4 CHAPTERS · 20 FILES · UK"}
      </span>
    </div>
  );
}

export function Gutters() {
  return (
    <>
      <Gutter side="left" />
      <Gutter side="right" />
    </>
  );
}
