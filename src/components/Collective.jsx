import { motion, useInView } from "framer-motion";
import React from "react";
import { BRAND_ASSETS, BRAND_PALETTE, BRAND_TYPE } from "../data/brand";
import { EASE } from "../lib/motion";
import { Name } from "./Name";

function PaletteSwatch({ name, hex }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    var o;
    if (!((o = navigator.clipboard) == null)) {
      o.writeText(hex)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        })
        .catch(() => {});
    }
  };
  const isLight = hex === "#F4F4F8";
  return (
    <button
      onClick={copy}
      className="group/sw text-left border border-ghost/8 overflow-hidden focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan/50"
    >
      <div
        className="h-16 sm:h-20 w-full relative"
        style={{
          background: hex,
          border: isLight ? "1px solid rgba(244,244,248,0.08)" : "none",
        }}
      >
        <span
          className={`absolute inset-0 flex items-center justify-center font-mono text-[8px] tracking-[0.3em] transition-opacity duration-200 ${copied ? "opacity-100" : "opacity-0 group-hover/sw:opacity-100"}`}
          style={{
            color: isLight ? "#030409" : "rgba(244,244,248,0.7)",
          }}
        >
          {copied ? "COPIED ✓" : "TAP TO COPY"}
        </span>
      </div>
      <div className="px-2.5 py-2 bg-void/40">
        <p className="font-mono text-[9px] text-ghost/55 tracking-[0.2em]">
          {name}
          <span className="sr-only"> </span>
        </p>
        <p className="font-mono text-[9px] text-ghost/30 tracking-[0.1em] mt-0.5">{hex}</p>
      </div>
    </button>
  );
}

function MediaCard({
  preview,
  previewSize,
  label,
  hint,
  onLight,
  cover,
  downloads,
  aspect = "aspect-[4/3]",
  index,
  inView,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 24,
        clipPath: "inset(0% 0% 100% 0%)",
      }}
      animate={
        inView
          ? {
              opacity: 1,
              y: 0,
              clipPath: "inset(0% 0% 0% 0%)",
              transitionEnd: {
                clipPath: "none",
              },
            }
          : {}
      }
      transition={{
        duration: 0.8,
        delay: 0.1 + index * 0.08,
        ease: EASE,
      }}
      className="e5-frame group relative border border-ghost/8 overflow-hidden"
    >
      <div
        className={`relative ${aspect} flex items-center justify-center ${cover ? "" : "p-6"}`}
        style={{
          background: onLight ? "#F4F4F8" : "rgba(3,4,9,0.6)",
        }}
      >
        <img
          src={preview}
          width={previewSize ? previewSize[0] : undefined}
          height={previewSize ? previewSize[1] : undefined}
          alt={label}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={
            cover
              ? "absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              : "max-w-full max-h-full object-contain"
          }
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-3.5 py-3 bg-void/50 border-t border-ghost/8">
        <div className="min-w-0">
          <p className="font-mono text-[9px] text-ghost/55 tracking-[0.22em] truncate">{label}</p>
          {hint && <p className="font-mono text-[8px] text-ghost/25 tracking-[0.18em] mt-0.5">{hint}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {downloads.map(({ href, tag }) => (
            <a
              href={href}
              download={true}
              className="e-b2 font-mono text-[8px] tracking-[0.28em] px-3 py-2.5 min-h-[40px] flex items-center"
              key={tag}
            >
              {"↓ "}
              {tag}
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function Collective() {
  const headerRef = React.useRef(null);
  const aboutRef = React.useRef(null);
  const kitRef = React.useRef(null);
  const headerInView = useInView(headerRef, {
    once: true,
    margin: "-80px",
  });
  const aboutInView = useInView(aboutRef, {
    once: true,
    margin: "-80px",
  });
  const kitInView = useInView(kitRef, {
    once: true,
    margin: "-60px",
  });
  return (
    <section
      id="collective"
      aria-label="The Collective — about & media"
      className="relative pt-24 sm:pt-36 lg:pt-48 px-4 sm:px-6 overflow-hidden"
      style={{
        isolation: "isolate",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-void via-[#07080F] to-void pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 80% 20%, rgba(161,0,255,0.06) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 10% 80%, rgba(0,239,255,0.04) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
      <div className="max-w-7xl mx-auto relative">
        <div ref={headerRef} className="mb-16 sm:mb-24">
          <motion.div
            initial={{
              opacity: 0,
              x: -16,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              headerInView
                ? {
                    opacity: 1,
                    x: 0,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 0.9,
              ease: EASE,
            }}
            className="flex items-center gap-4 mb-10 sm:mb-12"
          >
            <div className="w-8 h-px e-sline" />
            <span className="font-mono text-[9px] text-violet/55 tracking-[0.45em] uppercase">
              Section_02 / The Collective
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-violet/10 to-transparent max-w-[120px]" />
          </motion.div>
          <motion.h2
            initial={{
              opacity: 0,
              y: 28,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              headerInView
                ? {
                    opacity: 1,
                    y: 0,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 1.1,
              delay: 0.08,
              ease: EASE,
            }}
            className="font-heading font-extrabold leading-[0.9] tracking-tight text-ghost"
            style={{
              fontSize: "clamp(2.5rem, 5.5vw, 4rem)",
            }}
          >
            {"THE "}
            <span className="e-grad">COLLECTIVE</span>
          </motion.h2>
          <motion.p
            initial={{
              opacity: 0,
              y: 14,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              headerInView
                ? {
                    opacity: 1,
                    y: 0,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 0.9,
              delay: 0.22,
              ease: EASE,
            }}
            className="mt-7 font-body text-ghost/35 leading-[1.8] text-[0.92rem] max-w-2xl lg:max-w-none lg:whitespace-nowrap"
          >
            The people behind the signal. Background, intent, and the press materials promoters need to book
            the show.
          </motion.p>
          <motion.div
            initial={{
              scaleX: 0,
              opacity: 0,
            }}
            animate={
              headerInView
                ? {
                    scaleX: 1,
                    opacity: 1,
                  }
                : {}
            }
            transition={{
              duration: 1.4,
              delay: 0.42,
              ease: EASE,
            }}
            className="mt-14 sm:mt-16 h-px origin-left"
            style={{
              background: "linear-gradient(90deg, rgba(161,0,255,0.4), rgba(0,239,255,0.25), transparent)",
            }}
          />
        </div>
        <div
          ref={aboutRef}
          className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-16 items-start mb-24 sm:mb-32"
        >
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.97,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              aboutInView
                ? {
                    opacity: 1,
                    scale: 1,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 1,
              ease: EASE,
            }}
            className="relative aspect-[4/5] w-full max-w-md mx-auto lg:mx-0 overflow-hidden border border-ghost/10"
          >
            <img
              src="/assets/collective/portrait.webp"
              srcSet="/assets/collective/portrait-800.webp 800w, /assets/collective/portrait.webp 1254w"
              sizes="(max-width: 1023px) 90vw, 560px"
              alt="ERROR_404 Collective"
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
            <span className="absolute top-0 left-0 w-4 h-px bg-violet/60" aria-hidden={true} />
            <span className="absolute top-0 left-0 w-px h-4 bg-violet/60" aria-hidden={true} />
            <span className="absolute bottom-0 right-0 w-4 h-px bg-cyan/50" aria-hidden={true} />
            <span className="absolute bottom-0 right-0 w-px h-4 bg-cyan/50" aria-hidden={true} />
          </motion.div>
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
              clipPath: "inset(0% 0% 100% 0%)",
            }}
            animate={
              aboutInView
                ? {
                    opacity: 1,
                    y: 0,
                    clipPath: "inset(0% 0% 0% 0%)",
                    transitionEnd: {
                      clipPath: "none",
                    },
                  }
                : {}
            }
            transition={{
              duration: 1,
              delay: 0.15,
              ease: EASE,
            }}
          >
            <p className="font-mono text-[9px] text-cyan/45 tracking-[0.4em] uppercase mb-6">About</p>
            <h3
              className="font-heading font-extrabold text-ghost leading-[0.95] tracking-tight mb-6"
              style={{
                fontSize: "clamp(1.6rem, 3vw, 2.25rem)",
              }}
            >
              {"WHO IS BEHIND "}
              <span className="e-grad">ERROR_404</span>
            </h3>
            <div className="space-y-4 font-body text-ghost/45 leading-[1.85] text-[0.95rem] max-w-xl">
              <p>
                <Name>ERROR_404</Name>
                {
                  " Collective is a multimedia music project exploring the collapse of promised futures and the memories left behind. Built on hyperpop, cut with metalcore and 2-step, and told through immersive visual storytelling, the collective creates powerful audiovisual experiences that document life in an era defined by economic instability, technological disruption and social fragmentation."
                }
              </p>
              <p>
                At the heart of the collective are <Name>NULLSAINT</Name>
                {" and "}
                <Name>CACHEGHOST</Name>
                {", two recurring entities operating within the world of "}
                <Name>ARCHIVE_404</Name>
                {". "}
                <Name>NULLSAINT</Name>{" "}
                {
                  "serves as the voice of the survivors, delivering urgent narratives drawn from the realities of modern life, while "
                }
                <Name>CACHEGHOST</Name>
                {
                  " acts as the keeper of forgotten timelines, transforming lost memories into overwhelming walls of sound and light. Together they guide audiences through a living archive of abandoned promises, collective resilience and futures that never arrived."
                }
              </p>
              <p>
                The collective&apos;s work combines crushing sub-bass, distorted guitars, glitch-driven
                electronics, live instrumentation and cinematic visuals to create performances that feel
                equally at home in a club, festival field, concert hall or underground warehouse. Every
                release is presented as a recovered transmission. Every performance is an act of memory
                restoration.
              </p>
              <p>
                <Name>ERROR_404</Name>
                {
                  " Collective exists at the intersection of music, technology and social commentary, preserving the stories that systems would rather forget."
                }
              </p>
            </div>
            <div className="mt-8 flex flex-col gap-1">
              <span
                className="font-heading font-extrabold tracking-tight leading-[1.05] text-ghost"
                style={{
                  fontSize: "clamp(1.25rem, 2.4vw, 1.75rem)",
                }}
              >
                THE FUTURE FAILED.
              </span>
              <span
                className="font-heading font-extrabold tracking-tight leading-[1.05] text-transparent bg-clip-text"
                style={{
                  fontSize: "clamp(1.25rem, 2.4vw, 1.75rem)",
                  backgroundImage: "linear-gradient(90deg, #FF00E5, #00EFFF)",
                }}
              >
                THE ARCHIVE REMEMBERED.
              </span>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-5 mt-9">
              {[
                {
                  k: "BASED",
                  v: "UK",
                },
                {
                  k: "SOUND",
                  v: "HYPERPOP · METALCORE · 2-STEP",
                },
                {
                  k: "FORMAT",
                  v: "LIVE AUDIOVISUAL",
                },
              ].map(({ k, v }) => (
                <div key={k}>
                  <p className="font-mono text-[8px] text-ghost/20 tracking-[0.35em] mb-1.5 uppercase">{k}</p>
                  <p className="font-heading font-extrabold text-base tracking-tight text-ghost/70">{v}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <div ref={kitRef}>
          <motion.div
            initial={{
              opacity: 0,
              x: -16,
            }}
            animate={
              kitInView
                ? {
                    opacity: 1,
                    x: 0,
                  }
                : {}
            }
            transition={{
              duration: 0.8,
              ease: EASE,
            }}
            className="flex items-center gap-4 mb-8 sm:mb-10"
          >
            <p className="font-mono text-[9px] text-cyan/45 tracking-[0.4em] uppercase">Brand Kit</p>
            <div className="flex-1 h-px bg-gradient-to-r from-cyan/12 to-transparent max-w-[160px]" />
            <span className="font-mono text-[8px] text-ghost/20 tracking-[0.3em]">FOR PRESS & PROMOTERS</span>
          </motion.div>
          <p className="font-mono text-[8px] text-ghost/30 tracking-[0.35em] uppercase mb-4">Logo</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mb-12">
            <MediaCard
              index={0}
              inView={kitInView}
              preview="/assets/brand/error404-logo-white-preview.webp"
              previewSize={[900, 623]}
              label="LOGO — LIGHT"
              hint="for dark backgrounds"
              downloads={[
                {
                  href: "/assets/brand/error404-logo-white.png",
                  tag: "PNG",
                },
                {
                  href: "/assets/brand/error404-logo-white.webp",
                  tag: "WEBP",
                },
              ]}
            />
            <MediaCard
              index={1}
              inView={kitInView}
              onLight={true}
              preview="/assets/brand/error404-logo-black-preview.webp"
              previewSize={[900, 623]}
              label="LOGO — DARK"
              hint="for light backgrounds"
              downloads={[
                {
                  href: "/assets/brand/error404-logo-black.png",
                  tag: "PNG",
                },
                {
                  href: "/assets/brand/error404-logo-black.webp",
                  tag: "WEBP",
                },
              ]}
            />
          </div>
          <p className="font-mono text-[8px] text-ghost/30 tracking-[0.35em] uppercase mb-4">
            Palette — click to copy
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-12">
            {BRAND_PALETTE.map((o) => (
              <PaletteSwatch name={o.name} hex={o.hex} key={o.name} />
            ))}
          </div>
          <p className="font-mono text-[8px] text-ghost/30 tracking-[0.35em] uppercase mb-4">Typography</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-12">
            {BRAND_TYPE.map((o) => (
              <div className="border border-ghost/8 bg-void/40 p-5" key={o.name}>
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <p className="font-mono text-[9px] text-cyan/45 tracking-[0.2em] shrink-0">{o.name}</p>
                  <p className="font-mono text-[8px] text-ghost/25 tracking-[0.15em] text-right">{o.role}</p>
                </div>
                <p className={`${o.cls} text-ghost/80 text-xl sm:text-2xl leading-tight break-words`}>
                  {o.sample}
                </p>
                <p className="font-mono text-[8px] text-ghost/20 tracking-[0.2em] mt-4">
                  Aa Bb Cc · 0 1 2 3 4 5 6 7 8 9
                </p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[8px] text-ghost/30 tracking-[0.35em] uppercase mb-4">Press Imagery</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {BRAND_ASSETS.map((o, a) => (
              <MediaCard
                index={a}
                inView={kitInView}
                cover={true}
                preview={o.src}
                label={o.label}
                hint="JPG-grade WEBP"
                downloads={[
                  {
                    href: o.src,
                    tag: "WEBP",
                  },
                ]}
                key={o.label}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
