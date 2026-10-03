import { motion, useInView } from "framer-motion";
import React from "react";
import { CARD_STYLES, CHAPTERS, CHAPTER_ACCENTS } from "../data/chapters";
import { formatTime } from "../lib/formatTime";

function Waveform({ accent, accentB, active, index }) {
  const bars = [
    30, 55, 80, 45, 90, 60, 75, 40, 95, 50, 70, 35, 85, 55, 65, 42, 78, 58, 88, 48, 68, 38, 92, 52, 72, 32,
    82, 62, 45, 76, 36, 86, 56, 66, 44, 96, 54, 74, 34, 84, 64, 41, 77, 57, 87, 47, 67, 37, 91, 51,
  ];
  return (
    <div className="relative h-14 flex items-end gap-[2px] overflow-hidden">
      {bars.map((s, o) => (
        <motion.div
          className="flex-1 min-w-[2px] rounded-full origin-bottom"
          style={{
            height: `${s}%`,
            background: o % 3 === 0 ? `${accent}` : o % 3 === 1 ? `${accentB}` : `${accent}`,
          }}
          initial={{
            scaleY: 0,
            opacity: 0,
          }}
          animate={
            active
              ? {
                  scaleY: 1,
                  opacity: s > 60 ? 0.65 : 0.22,
                }
              : {
                  scaleY: 1,
                  opacity: s > 60 ? 0.18 : 0.07,
                }
          }
          transition={{
            duration: 0.6,
            delay: active ? o * 0.008 : o * 0.004,
            ease: [0.16, 1, 0.3, 1],
          }}
          key={o}
        />
      ))}
      <div
        className="absolute inset-y-0 left-0 w-8 pointer-events-none"
        style={{
          background: `linear-gradient(90deg, ${CARD_STYLES[index].bg}, transparent)`,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-8 pointer-events-none"
        style={{
          background: `linear-gradient(270deg, ${CARD_STYLES[index].bg}, transparent)`,
        }}
      />
    </div>
  );
}

function ChapterPlayer({ chapter, accent, accentB, cardIndex }) {
  const audioRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [trackIndex, setTrackIndex] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const track = chapter.tracks[trackIndex];
  const cardStyle = CARD_STYLES[cardIndex];
  React.useEffect(() => {
    const E = audioRef.current;
    if (E) {
      E.src = track.audioPath;
      E.load();
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      if (isPlaying) {
        E.play().catch(() => {});
      }
    }
  }, [trackIndex]);
  React.useEffect(() => {
    const E = audioRef.current;
    if (E) {
      if (isPlaying) {
        E.play().catch(() => setIsPlaying(false));
      } else {
        E.pause();
      }
    }
  }, [isPlaying]);
  React.useEffect(() => {
    const E = (N) => {
      if (N.detail !== audioRef.current) {
        setIsPlaying(false);
      }
    };
    window.addEventListener("e404-audio-play", E);
    return () => window.removeEventListener("e404-audio-play", E);
  }, []);
  const togglePlay = () => setIsPlaying((E) => !E);
  const handleTimeUpdate = () => {
    const E = audioRef.current;
    if (!(!E || !E.duration)) {
      setCurrentTime(E.currentTime);
      setProgress(E.currentTime / E.duration);
    }
  };
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };
  const handleEnded = () => {
    const E = trackIndex + 1;
    if (E < chapter.tracks.length) {
      setTrackIndex(E);
    } else {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    }
  };
  const handleSeek = (E) => {
    const N = audioRef.current;
    if (!N || !N.duration) return;
    const I = E.currentTarget.getBoundingClientRect();
    const A = Math.max(0, Math.min(1, (E.clientX - I.left) / I.width));
    N.currentTime = A * N.duration;
    setProgress(A);
  };
  const durationLabel = duration > 0 ? formatTime(duration) : (track.duration ?? "--:--");
  return (
    <div className="e-deck overflow-hidden">
      <audio
        ref={audioRef}
        src={track.audioPath}
        onPlay={() =>
          window.dispatchEvent(
            new CustomEvent("e404-audio-play", {
              detail: audioRef.current,
            }),
          )
        }
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="none"
      />
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 sm:pb-3 flex items-center gap-3">
        <motion.button
          onClick={togglePlay}
          whileHover={{
            scale: 1.08,
          }}
          whileTap={{
            scale: 0.92,
          }}
          transition={{
            duration: 0.2,
            ease: [0.16, 1, 0.3, 1],
          }}
          aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
          className={
            "e-playbtn" +
            (isPlaying ? " on" : "") +
            " flex items-center justify-center shrink-0 focus:outline-none"
          }
        >
          {isPlaying ? (
            <span className="flex gap-[3px]" aria-hidden="true">
              <span className="w-[3px] h-3 bg-void rounded-full" />
              <span className="w-[3px] h-3 bg-void rounded-full" />
            </span>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
              <path d="M1 1l8 5-8 5V1z" fill="#F4F4F8" />
            </svg>
          )}
        </motion.button>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] text-ghost/80 tracking-wider truncate">
            {String(track.number).padStart(2, "0")}
            {" — "}
            {track.title}
          </p>
          <p className="font-mono text-[9px] text-ghost/25 tracking-widest mt-0.5">{chapter.title}</p>
        </div>
        <span className="font-mono text-[10px] text-ghost/25 shrink-0 tabular-nums">{durationLabel}</span>
      </div>
      <div className="px-4 pb-3">
        <div
          className="py-3 -my-1 cursor-pointer"
          onClick={handleSeek}
          role="slider"
          aria-label={`Seek ${track.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="e-seek relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-none"
              style={{
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, ${accent}, ${accentB})`,
              }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="font-mono text-[9px] text-ghost/20 tabular-nums">{formatTime(currentTime)}</span>
          <span className="font-mono text-[9px] text-ghost/20 tabular-nums">{durationLabel}</span>
        </div>
      </div>
      <div className="px-4 pb-4">
        <Waveform accent={accent} accentB={accentB} active={isPlaying} index={cardIndex} />
      </div>
      <div
        className="border-t px-3 sm:px-4 py-2 sm:py-3"
        style={{
          borderColor: "rgba(244,244,248,0.05)",
        }}
      >
        {chapter.tracks.map((E, N) => (
          <button
            onClick={() => {
              setTrackIndex(N);
              setIsPlaying(true);
            }}
            aria-label={`Play track ${E.number}: ${E.title}${E.duration ? `, ${E.duration}` : ""}`}
            aria-pressed={trackIndex === N && isPlaying}
            className={
              "e-trk" +
              (trackIndex === N ? " cur" : "") +
              " w-full flex items-center gap-3 py-3 sm:py-2 text-left group/row min-h-[44px] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset"
            }
            style={{
              "--tw-ring-color": `${accent}60`,
            }}
            key={E.number}
          >
            <span
              className="font-mono text-[10px] tabular-nums w-5 shrink-0 transition-colors duration-200"
              style={{
                color: trackIndex === N ? accent : "rgba(244,244,248,0.2)",
              }}
            >
              {trackIndex === N && isPlaying ? (
                <motion.span
                  animate={{
                    opacity: [1, 0.3, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: 1 / 0,
                  }}
                >
                  ▶
                </motion.span>
              ) : (
                String(E.number).padStart(2, "0")
              )}
            </span>
            <span className={"e-trk-t flex-1 truncate" + (trackIndex === N ? " cur" : "")}>{E.title}</span>
            {E.duration && (
              <span className="font-mono text-[9px] text-ghost/15 group-hover/row:text-ghost/30 transition-colors shrink-0 tabular-nums">
                {E.duration}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChapterCard({ chapter, index, onDownload }) {
  const cardRef = React.useRef(null);
  const [notesOpen, setNotesOpen] = React.useState(false);
  const inView = useInView(cardRef, {
    once: true,
    margin: "0px",
  });
  const [hovered, setHovered] = React.useState(false);
  const [accentA, accentB] = CHAPTER_ACCENTS[index % CHAPTER_ACCENTS.length];
  const cardStyle = CARD_STYLES[index % CARD_STYLES.length];
  const isWreckage = index === 2;
  const isWhole = index === 3;
  return (
    <motion.div
      ref={cardRef}
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
        duration: 0.6,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative group"
    >
      <motion.div
        className="absolute -inset-[1px] pointer-events-none"
        animate={{
          opacity: hovered ? 1 : 0,
        }}
        transition={{
          duration: 0.6,
          ease: [0.4, 0, 0.2, 1],
        }}
        style={{
          boxShadow: cardStyle.glowHover,
        }}
        aria-hidden="true"
      />
      <motion.div
        className="e5-frame relative overflow-hidden"
        animate={{
          y: hovered ? -4 : 0,
          boxShadow: hovered
            ? `${cardStyle.insetGlow}, 0 32px 80px rgba(0,0,0,0.45)`
            : "inset 0 1px 0 rgba(244,244,248,0.04), 0 8px 32px rgba(0,0,0,0.25)",
        }}
        transition={{
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          background: cardStyle.bg,
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: `1px solid ${hovered ? cardStyle.borderHover : cardStyle.borderIdle}`,
          transition: "border-color 0.5s ease",
        }}
      >
        <motion.div
          className="absolute top-0 left-0 right-0 h-px origin-left"
          style={{
            background: `linear-gradient(90deg, ${accentA}, ${accentB}80)`,
          }}
          animate={{
            scaleX: hovered ? 1 : 0,
            opacity: hovered ? 1 : 0,
          }}
          transition={{
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          aria-hidden="true"
        />
        <div className="px-6 sm:px-8 pt-7 sm:pt-9 pb-6 sm:pb-7">
          <motion.div
            className="flex items-center justify-between mb-7"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={
              inView
                ? {
                    opacity: 1,
                    y: 0,
                  }
                : {}
            }
            transition={{
              duration: 0.45,
              delay: index * 0.05 + 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <span className="e-ch-l">
              ARCHIVE_{chapter.index}
              <em className="hidden sm:inline">{" / FILE RECOVERED"}</em>
            </span>
            <span className="e-ch-files">
              {chapter.tracks.length}
              {" FILES · MP3"}
            </span>
          </motion.div>
          <motion.h3
            className="e-ch-title font-heading mb-5"
            style={{
              fontSize: "clamp(2.75rem, 6vw, 4rem)",
            }}
            initial={{
              opacity: 0,
              y: 10,
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
              duration: 0.5,
              delay: index * 0.05 + 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {chapter.title.includes(" ") ? chapter.title.slice(0, chapter.title.lastIndexOf(" ") + 1) : ""}
            <span className="e-grad">{chapter.title.slice(chapter.title.lastIndexOf(" ") + 1)}</span>
            <sup className="e-ch-sup">{chapter.index}</sup>
          </motion.h3>
          <motion.p
            className={"e-ch-desc font-body" + (notesOpen ? "" : " e-clamp")}
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={
              inView
                ? {
                    opacity: 1,
                    y: 0,
                  }
                : {}
            }
            transition={{
              duration: 0.5,
              delay: index * 0.05 + 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {chapter.description}
          </motion.p>
          <button
            type="button"
            className="e-more"
            onClick={() => setNotesOpen((x) => !x)}
            aria-expanded={notesOpen}
          >
            {notesOpen ? "CLOSE FILE NOTES −" : "READ FILE NOTES +"}
          </button>
          <motion.div
            className="flex flex-wrap gap-2"
            initial={{
              opacity: 0,
            }}
            animate={
              inView
                ? {
                    opacity: 1,
                  }
                : {}
            }
            transition={{
              duration: 0.45,
              delay: index * 0.05 + 0.25,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {chapter.tags.map((p) => (
              <span className="e-tag" key={p}>
                {p}
              </span>
            ))}
          </motion.div>
        </div>
        <div className="px-6 sm:px-8 pb-8 sm:pb-10">
          <ChapterPlayer chapter={chapter} accent={accentA} accentB={accentB} cardIndex={index} />
        </div>
        <div
          className="px-6 sm:px-8 py-5 flex items-center justify-between border-t"
          style={{
            borderColor: isWreckage ? "rgba(244,244,248,0.03)" : "rgba(244,244,248,0.05)",
          }}
        >
          <div className="flex items-center gap-6">
            <div>
              <p className="font-mono text-[7px] text-ghost/15 tracking-[0.3em] mb-1.5 uppercase">Chapter</p>
              <p className="font-mono text-[11px] text-ghost/40 tracking-wide">
                {chapter.index}
                {" / 04"}
              </p>
            </div>
            <div className="w-px h-6 bg-ghost/6" aria-hidden="true" />
            <div>
              <p className="font-mono text-[7px] text-ghost/15 tracking-[0.3em] mb-1.5 uppercase">Status</p>
              <span
                className="e8c"
                style={{
                  "--c": "#00EFFF",
                }}
              >
                <i />
                <span>RECOVERED</span>
              </span>
            </div>
          </div>
          <motion.button
            onClick={onDownload}
            whileTap={{
              scale: 0.95,
            }}
            aria-label="Download the archive"
            className="e-b1 flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] px-4 py-3 sm:py-2 min-h-[44px] focus:outline-none focus-visible:ring-1 focus-visible:ring-magenta/50"
          >
            <span className="relative z-10">DOWNLOAD</span>
            <motion.span
              animate={{
                x: hovered ? 3 : 0,
              }}
              transition={{
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative z-10"
              style={{
                color: accentA,
              }}
              aria-hidden="true"
            >
              ▸
            </motion.span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Catalogue({ onDownload }) {
  const headerRef = React.useRef(null);
  const headerInView = useInView(headerRef, {
    once: true,
    margin: "-80px",
  });
  const trackCount = CHAPTERS.reduce((i, s) => i + s.tracks.length, 0);
  return (
    <section
      id="catalogue"
      aria-label="Catalogue — chapter archive"
      className="relative pt-24 sm:pt-36 lg:pt-48 pb-4 sm:pb-8 lg:pb-16 px-4 sm:px-6 overflow-hidden"
      style={{
        isolation: "isolate",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-void via-[#07080F] to-void pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 15% 40%, rgba(161,0,255,0.055) 0%, transparent 65%), radial-gradient(ellipse 60% 50% at 85% 60%, rgba(255,0,229,0.045) 0%, transparent 65%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-1/3 h-px pointer-events-none"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(161,0,255,0.06), transparent)",
        }}
        aria-hidden="true"
      />
      <div className="max-w-7xl mx-auto relative">
        <div ref={headerRef} className="mb-16 sm:mb-24 lg:mb-32">
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
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex items-center gap-4 mb-10 sm:mb-12"
          >
            <div className="w-8 h-px e-sline" />
            <span className="font-mono text-[9px] text-magenta/45 tracking-[0.45em] uppercase">
              Section_03 / Catalogue
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-magenta/10 to-transparent max-w-[120px]" />
          </motion.div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 lg:gap-16">
            <div className="flex-1">
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
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="font-heading font-extrabold leading-[0.9] tracking-tight"
                style={{
                  fontSize: "clamp(2.5rem, 5.5vw, 4rem)",
                }}
              >
                <span className="e-grad block">ARCHIVE_404</span>
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
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-7 font-body text-ghost/35 leading-[1.8] text-[0.92rem]"
              >
                {"Four chapters. "}
                {trackCount}
                {
                  " recovered files. A machine attempting to reconstruct something it was never equipped to hold."
                }
              </motion.p>
            </div>
            <div className="flex items-end gap-6 sm:gap-12 pb-2 shrink-0">
              {[
                {
                  label: "CHAPTERS",
                  value: `0${CHAPTERS.length}`,
                },
                {
                  label: "TOTAL FILES",
                  value: String(trackCount).padStart(2, "0"),
                },
                {
                  label: "STATUS",
                  value: "RECOVERED",
                },
              ].map(({ label, value }, o) => (
                <motion.div
                  initial={{
                    opacity: 0,
                    y: 16,
                  }}
                  animate={
                    headerInView
                      ? {
                          opacity: 1,
                          y: 0,
                        }
                      : {}
                  }
                  transition={{
                    duration: 0.7,
                    delay: 0.3 + o * 0.09,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  key={label}
                >
                  <p className="font-mono text-[8px] text-ghost/18 tracking-[0.35em] mb-2.5 uppercase">
                    {label}
                  </p>
                  <p
                    className="font-heading font-extrabold text-lg tracking-tight leading-none"
                    style={{
                      color: o === 2 ? "rgba(255,0,229,0.5)" : "rgba(244,244,248,0.45)",
                    }}
                  >
                    {value}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
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
              ease: [0.16, 1, 0.3, 1],
            }}
            className="mt-14 sm:mt-16 h-px origin-left"
            style={{
              background: "linear-gradient(90deg, rgba(255,0,229,0.4), rgba(0,239,255,0.25), transparent)",
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-6 sm:gap-8">
          {CHAPTERS.map((i, s) => (
            <ChapterCard chapter={i} index={s} onDownload={onDownload} key={i.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
