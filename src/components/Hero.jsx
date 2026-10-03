import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import React from "react";

function ParticleField() {
  const canvasRef = React.useRef(null);
  React.useEffect(() => {
    const t = canvasRef.current;
    if (!t) return;
    const n = t.getContext("2d");
    if (!n) return;
    let r = -1;
    const i = () => {
      if (window.innerWidth !== r) {
        r = window.innerWidth;
        t.width = window.innerWidth;
        t.height = window.innerHeight;
      }
    };
    i();
    window.addEventListener("resize", i);
    const s = (u, d) => ({
      x: Math.random() * u,
      y: Math.random() * d,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -0.1 - Math.random() * 0.18,
      r: 0.6 + Math.random() * 1.2,
      life: Math.random() * 200,
      max: 160 + Math.random() * 180,
      hue: Math.random() < 0.5 ? 300 : Math.random() < 0.5 ? 272 : 186,
    });
    const o = Array.from(
      {
        length: 55,
      },
      () => s(t.width, t.height),
    );
    let a;
    const l = () => {
      a = requestAnimationFrame(l);
      // hidden under the open mobile menu: skip drawing
      if (window.__e404MenuOpen) return;
      n.clearRect(0, 0, t.width, t.height);
      for (const u of o) {
        u.x += u.vx;
        u.y += u.vy;
        u.life++;
        if (u.life > u.max) {
          Object.assign(u, s(t.width, t.height), {
            life: 0,
          });
        }
        const d = Math.sin((u.life / u.max) * Math.PI) * 0.45;
        n.beginPath();
        n.arc(u.x, u.y, u.r, 0, Math.PI * 2);
        n.fillStyle = `hsla(${u.hue}, 100%, 70%, ${d})`;
        n.fill();
      }
    };
    l();
    return () => {
      cancelAnimationFrame(a);
      window.removeEventListener("resize", i);
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

export function Hero() {
  const sectionRef = React.useRef(null);
  const { scrollYProgress: scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 22,
    mass: 1,
  });
  const imageY = useTransform(smoothProgress, [0, 1], ["0%", "22%"]);
  const contentScale = useTransform(smoothProgress, [0, 0.65], [1, 0.78]);
  const contentOpacity = useTransform(smoothProgress, [0, 0.5], [1, 0]);
  const contentY = useTransform(smoothProgress, [0, 0.6], ["0%", "-10%"]);
  const cueOpacity = useTransform(smoothProgress, [0, 0.28], [1, 0]);
  return (
    <section
      ref={sectionRef}
      id="archive"
      aria-label="Archive 404 — hero"
      className="hero-vh relative w-full overflow-hidden flex flex-col items-center justify-center"
    >
      <motion.div
        className="absolute inset-0 w-full h-[118%] -top-[9%]"
        style={{
          y: imageY,
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <img
          src="/assets/ARCHIVE_404_HERO3.webp"
          alt=""
          role="presentation"
          decoding="async"
          fetchPriority="high"
          className="w-full h-full object-cover object-center"
          draggable={false}
        />
      </motion.div>
      <div className="absolute inset-0 bg-void/25" />
      <div className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-void via-void/55 to-transparent" />
      <div className="e-hero-top absolute inset-x-0 top-0 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 65% 75% at 50% 44%, transparent 25%, rgba(3,4,9,0.55) 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 60%, rgba(161,0,255,0.06) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
      <ParticleField />
      <div
        className="absolute left-1/2 bottom-[12vh] -translate-x-1/2 w-[90vw] sm:w-[60vw] h-[40vh] max-w-4xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center bottom, rgba(161,0,255,0.10) 0%, rgba(255,0,229,0.05) 40%, transparent 70%)",
          filter: "blur(50px)",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 top-1/2 top-[50dvh] -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-[7vh] flex justify-center px-4 sm:px-6">
        <motion.div
          className="flex flex-col items-center gap-0 w-full"
          style={{
            scale: contentScale,
            opacity: contentOpacity,
            y: contentY,
          }}
        >
          <motion.div
            role="img"
            aria-label="ERROR404"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
            }}
            className="e-logo e-logo-full e-logo-slam w-[min(92vw,820px)] sm:w-[min(88vw,820px)] select-none"
            style={{
              filter:
                "drop-shadow(0 0 2px rgba(255,0,229,0.7)) drop-shadow(0 0 12px rgba(161,0,255,0.28)) drop-shadow(0 0 80px rgba(255,0,229,0.14)) drop-shadow(0 0 160px rgba(161,0,255,0.10))",
            }}
          >
            <div className="e-gh m" aria-hidden={true} />
            <div className="e-gh c" aria-hidden={true} />
            <img src="/assets/error404logo.svg" alt="" draggable={false} decoding="async" />
          </motion.div>
          <div className="flex flex-col items-center gap-4 mt-1">
            <motion.p
              initial={{
                opacity: 0,
                letterSpacing: "0.65em",
                filter: "blur(6px)",
              }}
              animate={{
                opacity: 1,
                letterSpacing: "0.48em",
                filter: "blur(0px)",
              }}
              transition={{
                duration: 1.4,
                delay: 1.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="font-mono text-[9px] text-ghost/30 uppercase tracking-[0.48em]"
            >
              <span className="e-grad">ARCHIVE_404</span>
            </motion.p>
            <motion.div
              initial={{
                scaleX: 0,
                opacity: 0,
              }}
              animate={{
                scaleX: 1,
                opacity: 1,
              }}
              transition={{
                duration: 1.2,
                delay: 1.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-20 h-px origin-center"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(244,244,248,0.18), transparent)",
              }}
            />
            <motion.p
              initial={{
                opacity: 0,
                y: 10,
                filter: "blur(5px)",
              }}
              animate={{
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
              }}
              transition={{
                duration: 1.4,
                delay: 1.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="font-body font-light text-ghost/40 text-[clamp(0.78rem,2vw,1rem)] tracking-[0.1em] text-center"
            >
              SOMETHING SURVIVED THE CRASH
            </motion.p>
          </div>
        </motion.div>
      </div>
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          delay: 2.8,
          duration: 1.4,
        }}
        style={{
          opacity: cueOpacity,
        }}
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        aria-hidden="true"
      >
        <motion.div
          animate={{
            scaleY: [1, 0.35, 1],
            opacity: [0.25, 0.65, 0.25],
          }}
          transition={{
            duration: 2.6,
            repeat: 1 / 0,
            ease: "easeInOut",
          }}
          className="w-px h-10 origin-top"
          style={{
            background: "linear-gradient(to bottom, rgba(244,244,248,0.25), transparent)",
          }}
        />
      </motion.div>
    </section>
  );
}
