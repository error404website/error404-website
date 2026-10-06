import { motion, useInView } from "framer-motion";
import React from "react";
import { GITHUB_URL } from "../config";
import { EASE } from "../lib/motion";

export function Footer() {
  const footerRef = React.useRef(null);
  const inView = useInView(footerRef, {
    once: true,
    margin: "-10%",
  });
  const credit = (i, ch) => (
    <motion.div
      className="e-cr"
      initial={{
        opacity: 0,
        y: 14,
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
        duration: 0.8,
        delay: 0.2 + i * 0.35,
        ease: EASE,
      }}
      key={i}
    >
      {ch}
    </motion.div>
  );
  return (
    <footer
      ref={footerRef}
      aria-label="Site footer"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-24 pb-28"
    >
      <div
        className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-void to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-[#030409] via-[#030409]/80 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative z-10 flex flex-col items-center text-center w-full e-credits">
        {credit(0, [
          <span key="label" className="e-cr-r">
            An
          </span>,
          <span key="value" className="e-cr-v font-heading">
            <span className="e-grad">ERROR_404</span>
            {" PROJECT"}
          </span>,
        ])}
        {credit(1, [
          <span key="label" className="e-cr-r">
            Written & performed by
          </span>,
          <span key="value" className="e-cr-v font-heading">
            <span className="e-grad">NULLSAINT</span>
            {" · "}
            <span className="e-grad">CACHEGHOST</span>
          </span>,
        ])}
        {credit(2, [
          <span key="label" className="e-cr-r">
            In four chapters
          </span>,
          <span key="value" className="e-cr-s">
            ORIGIN · THE FEED · THE WRECKAGE · WHOLE
          </span>,
        ])}
        {credit(3, [
          <span key="label" className="e-cr-r">
            View project
          </span>,
          <a key="value" href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="e-cr-link">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden={true}>
              <defs>
                <linearGradient id="e-crg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#FF00E5" />
                  <stop offset="1" stopColor="#00EFFF" />
                </linearGradient>
              </defs>
              <path
                fill="url(#e-crg)"
                d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"
              />
            </svg>
            GITHUB ↗
          </a>,
        ])}
        <motion.div
          className="e-cr w-full flex justify-center"
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
            duration: 1.2,
            delay: 1.6,
            ease: EASE,
          }}
        >
          <span
            role="img"
            aria-label="ERROR404"
            className="e-logo e-logo-full w-[min(88vw,640px)] sm:w-[min(78vw,600px)] select-none"
            style={{
              opacity: 0.75,
              filter:
                "drop-shadow(0 0 2px rgba(255,0,229,0.7)) drop-shadow(0 0 12px rgba(161,0,255,0.28)) drop-shadow(0 0 80px rgba(255,0,229,0.14)) drop-shadow(0 0 160px rgba(161,0,255,0.10))",
            }}
          >
            <img src="/assets/error404logo.svg" alt="" draggable={false} />
          </span>
        </motion.div>
        {credit(
          5,
          <span
            className="e8c"
            style={{
              "--c": "#4ade80",
            }}
          >
            <i />
            <span>TRANSMISSION COMPLETE</span>
          </span>,
        )}
      </div>
      <div className="e-fbar">
        <div className="e-fbar-in">
          <span className="e-fbar-c">
            © 2026 ERROR_404<span className="e-fbar-x">{" · PRODUCED IN THE UK"}</span>
          </span>
          <button
            type="button"
            className="e-fbar-top"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            ↑ BACK TO TOP
          </button>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ERROR_404 on GitHub"
            className="e-fbar-gh"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden={true}>
              <defs>
                <linearGradient id="e-ghg" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#FF00E5" />
                  <stop offset="1" stopColor="#00EFFF" />
                </linearGradient>
              </defs>
              <path
                d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"
                fill="url(#e-ghg)"
              />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
