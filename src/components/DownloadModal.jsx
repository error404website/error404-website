import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { ARCHIVE_URL } from "../config";

export function DownloadModal({ open, onClose }) {
  const panelRef = React.useRef(null);
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  React.useEffect(() => {
    const i = (s) => {
      if (s.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", i);
    return () => window.removeEventListener("keydown", i);
  }, [onClose]);
  React.useEffect(() => {
    if (!open) return;
    const i = panelRef.current;
    if (!i) return;
    const s = i.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
    const o = s[0];
    const a = s[s.length - 1];
    const l = (u) => {
      if (u.key === "Tab") {
        if (u.shiftKey) {
          if (document.activeElement === o) {
            u.preventDefault();
            a.focus();
          }
        } else {
          if (document.activeElement === a) {
            u.preventDefault();
            o.focus();
          }
        }
      }
    };
    window.addEventListener("keydown", l);
    return () => window.removeEventListener("keydown", l);
  }, [open]);
  const startDownload = () => {
    const link = document.createElement("a");
    link.href = ARCHIVE_URL;
    link.download = "ARCHIVE_404.zip";
    link.click();
    setTimeout(onClose, 600);
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          style={{
            background: "rgba(3,4,9,0.85)",
            backdropFilter: "blur(14px)",
          }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Download the archive"
          key="modal"
        >
          <motion.div
            initial={{
              scale: 0.95,
              y: 18,
              filter: "blur(5px)",
            }}
            animate={{
              scale: 1,
              y: 0,
              filter: "blur(0px)",
            }}
            exit={{
              scale: 0.96,
              y: 12,
              filter: "blur(3px)",
            }}
            transition={{
              duration: 0.42,
              ease: [0.16, 1, 0.3, 1],
            }}
            onClick={(i) => i.stopPropagation()}
            key="panel"
          >
            <div
              ref={panelRef}
              className="e5-frame relative w-full sm:max-w-[420px] overflow-hidden rounded-t-lg sm:rounded-none"
              style={{
                background: "rgba(3,4,9,0.94)",
                border: "1px solid rgba(244,244,248,0.14)",
                backdropFilter: "blur(32px)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.75)",
              }}
            >
              <button
                onClick={(i) => {
                  i.stopPropagation();
                  onClose();
                }}
                aria-label="Close modal"
                className="e-mx absolute top-4 right-4 z-10 flex items-center justify-center focus:outline-none focus-visible:ring-1 focus-visible:ring-magenta/50"
              >
                ✕
              </button>
              <div className="px-7 pt-8 pb-8 sm:px-8 sm:pt-9 sm:pb-9">
                <p className="e-mk">ARCHIVE_404 / DOWNLOAD</p>
                <h2 className="e-mh font-heading text-ghost">
                  {"DOWNLOAD THE "}
                  <span className="e-grad">ARCHIVE</span>
                </h2>
                <p className="font-body text-[0.82rem] text-ghost/38 leading-relaxed mb-8">
                  4 chapters. 20 recovered files. One transmission.
                </p>
                <div
                  className="flex items-center gap-4 px-4 py-3.5 mb-6"
                  style={{
                    background: "rgba(244,244,248,0.03)",
                    border: "1px solid rgba(244,244,248,0.07)",
                  }}
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0"
                    style={{
                      border: "1px solid rgba(255,0,229,0.3)",
                      background: "rgba(255,0,229,0.05)",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden={true}>
                      <path
                        d="M7 1v8M3 6l4 4 4-4M1 11h12"
                        stroke="#FF00E5"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-ghost/70 tracking-wider truncate">
                      ARCHIVE_404.zip
                    </p>
                    <p className="font-mono text-[8px] text-ghost/25 tracking-[0.2em] mt-0.5">
                      20 TRACKS · MP3 · 320 KBPS
                    </p>
                  </div>
                  <span className="e-fsz">223 MB</span>
                </div>
                <motion.button
                  onClick={startDownload}
                  whileTap={{
                    scale: 0.975,
                  }}
                  className="e-b1 w-full py-3.5 font-mono text-[10px] tracking-[0.28em] focus:outline-none focus-visible:ring-2 focus-visible:ring-magenta/60 min-h-[48px]"
                >
                  <span className="relative z-10">↓ DOWNLOAD ARCHIVE_404</span>
                </motion.button>
                <p className="e-fine">FREE · NO ACCOUNT · NO NOISE</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
