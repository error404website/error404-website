import { AnimatePresence, motion } from "framer-motion";
import React from "react";

const NAV_LINKS = [
  {
    label: "ARCHIVE_404",
    href: "#archive",
  },
  {
    label: "COLLECTIVE",
    href: "#collective",
  },
  {
    label: "CATALOGUE",
    href: "#catalogue",
  },
  {
    label: "SIGNAL",
    href: "#signal",
  },
];

export function Nav({ onDownloadOpen }) {
  const [activeHref, setActiveHref] = React.useState(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const linksRef = React.useRef(null);
  const linkRefs = React.useRef({});
  React.useEffect(() => {
    const u = ["archive", "collective", "catalogue", "signal"];
    const d = [];
    u.forEach((f) => {
      const p = document.getElementById(f);
      if (!p) return;
      const y = new IntersectionObserver(
        ([v]) => {
          if (v.isIntersecting) {
            setActiveHref(`#${f}`);
          }
        },
        {
          rootMargin: "-40% 0px -50% 0px",
        },
      );
      y.observe(p);
      d.push(y);
    });
    return () => d.forEach((f) => f.disconnect());
  }, []);
  React.useEffect(() => {
    const u = () => {
      if (window.innerWidth >= 768) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);
  const scrollToSection = (u, d) => {
    u.preventDefault();
    const f = document.getElementById(d.replace("#", ""));
    if (f) {
      f.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
    setMenuOpen(false);
  };
  return (
    <>
      <nav className="site-nav fixed top-0 left-0 right-0 z-50" aria-label="Main navigation">
        <div className="nav-glass absolute inset-0" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-4 md:gap-8">
          <a
            href="#"
            onClick={(u) => {
              u.preventDefault();
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
            className="shrink-0 group"
            aria-label="ERROR404 — back to top"
          >
            <span className="e4-lock">
              <img
                src="/assets/error404logo.svg"
                alt="ERROR404"
                width={1414}
                height={348}
                draggable={false}
                className="e4-lock-logo w-auto select-none"
                style={{
                  height: "clamp(26px, 3vw, 32px)",
                  filter:
                    "drop-shadow(0 0 1.5px rgba(255,0,229,0.7)) drop-shadow(0 0 10px rgba(161,0,255,0.3))",
                }}
              />
              <span aria-hidden={true} className="e4-lock-div" />
              <span aria-hidden={true} className="e4-lock-tag">
                ARCHIVE
                <br />
                _404
              </span>
            </span>
          </a>
          <div ref={linksRef} className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => {
              const f = activeHref === href;
              return (
                <a
                  href={href}
                  ref={(p) => {
                    linkRefs.current[href] = p;
                  }}
                  onClick={(p) => scrollToSection(p, href)}
                  aria-current={f ? "location" : undefined}
                  className={"e8-link" + (f ? " active" : "")}
                  key={href}
                >
                  <span className="e8-txt">{label}</span>
                </a>
              );
            })}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="e-split e-split-nav">
              <a
                href="#signal"
                onClick={(u) => scrollToSection(u, "#signal")}
                className="e-split-bk"
                aria-label="Booking open — get in touch"
              >
                BOOKING
              </a>
              <motion.button
                onClick={onDownloadOpen}
                whileTap={{
                  scale: 0.97,
                }}
                aria-label="Download ERROR_404 archive"
                className="e-split-dl"
              >
                ↓ DOWNLOAD
              </motion.button>
            </span>
            <button
              onClick={() => setMenuOpen((u) => !u)}
              className={
                "e4-burger md:hidden w-11 h-11 flex items-center justify-center -mr-2 focus:outline-none" +
                (menuOpen ? " is-open" : "")
              }
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className="e4-ic" aria-hidden={true}>
                <svg className="e4-p" viewBox="0 0 22 22" fill="none">
                  <path d="M3 6l6 5-6 5" stroke="#F4F4F8" strokeWidth="1.8" strokeLinecap="square" />
                  <defs>
                    <linearGradient
                      id="e4-cur-grad"
                      gradientUnits="userSpaceOnUse"
                      x1="11"
                      y1="0"
                      x2="19"
                      y2="0"
                    >
                      <stop offset="0" stopColor="#FF00E5" />
                      <stop offset="1" stopColor="#00EFFF" />
                    </linearGradient>
                  </defs>
                  <rect className="e4-cur" x="11" y="15" width="8" height="2" fill="url(#e4-cur-grad)" />
                </svg>
                <svg className="e4-x" viewBox="0 0 22 22" fill="none">
                  <path d="M5 5l12 12M17 5L5 17" stroke="#F4F4F8" strokeWidth="1.8" strokeLinecap="square" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </nav>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="e4-menu fixed inset-0 z-40 md:hidden overflow-hidden"
            initial="closed"
            animate="open"
            exit="closed"
            key="mobile-overlay"
          >
            {[0, 1, 2, 3, 4, 5].map((u) => (
              <motion.div
                className="e4-sl"
                style={{
                  top: `${(u * 100) / 6}%`,
                }}
                variants={{
                  closed: {
                    x: u % 2 ? "101%" : "-101%",
                  },
                  open: {
                    x: "0%",
                  },
                }}
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                  delay: u * 0.035,
                }}
                key={u}
              />
            ))}
            <motion.div
              className="e4-inner"
              variants={{
                closed: {
                  opacity: 0,
                  transition: {
                    duration: 0.15,
                  },
                },
                open: {
                  opacity: 1,
                  transition: {
                    duration: 0.2,
                    delay: 0.3,
                  },
                },
              }}
            >
              <div className="e4-sys">
                <span
                  className="e8c"
                  style={{
                    "--c": "#FF00E5",
                  }}
                >
                  <i />
                  <span>SYS::OPEN</span>
                </span>
              </div>
              <nav className="e4-nav" aria-label="Mobile navigation links">
                {NAV_LINKS.map(({ label, href }, f) => (
                  <a
                    href={href}
                    onClick={(p) => scrollToSection(p, href)}
                    className={"e4c-link" + (activeHref === href ? " active" : "")}
                    aria-current={activeHref === href ? "location" : undefined}
                    key={href}
                  >
                    <span className="e4c-l font-heading">{label}</span>
                    <span className="e4c-s">
                      <b>{String(f + 1).padStart(2, "0")}</b>
                      {["THE ALBUM", "WHO WE ARE", "20 RECOVERED FILES", "BOOK THE SHOW"][f]}
                    </span>
                  </a>
                ))}
              </nav>
              <span className="e-split e-split-menu">
                <a href="#signal" onClick={(u) => scrollToSection(u, "#signal")} className="e-split-bk">
                  BOOKING
                </a>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDownloadOpen();
                  }}
                  className="e-split-dl"
                >
                  ↓ DOWNLOAD
                </button>
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
