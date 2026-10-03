import { motion } from "framer-motion";
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
      if (window.innerWidth >= 1024) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", u);
    return () => window.removeEventListener("resize", u);
  }, []);
  // While the menu is open: stop the page behind it from scrolling (a stray swipe
  // on iOS moves the toolbar and resizes the overlay mid-wipe), close on Escape,
  // and tell the hero's canvas/spotlight loops to skip drawing. That's a plain JS
  // flag rather than a class, so opening never triggers a page-wide style recalc.
  const menuRef = React.useRef(null);
  React.useEffect(() => {
    if (!menuOpen) return;
    const menu = menuRef.current;
    const block = (e) => e.preventDefault();
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    menu?.addEventListener("touchmove", block, { passive: false });
    menu?.addEventListener("wheel", block, { passive: false });
    window.addEventListener("keydown", onKey);
    const settle = setTimeout(() => (window.__e404MenuOpen = true), 300);
    return () => {
      clearTimeout(settle);
      window.__e404MenuOpen = false;
      menu?.removeEventListener("touchmove", block);
      menu?.removeEventListener("wheel", block);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  const scrollToSection = (u, d) => {
    u.preventDefault();
    const f = document.getElementById(d.replace("#", ""));
    setMenuOpen(false);
    if (f) {
      requestAnimationFrame(() =>
        f.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    }
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
              <span className="e4-lock-tag">
                ARCHIVE
                <br />
                _404
              </span>
              <span className="sr-only"> — back to top</span>
            </span>
          </a>
          <div ref={linksRef} className="hidden lg:flex items-center gap-1">
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
                "e4-burger lg:hidden w-11 h-11 flex items-center justify-center -mr-2 focus:outline-none" +
                (menuOpen ? " is-open" : "")
              }
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <span className="e4-ic" aria-hidden={true}>
                {/* distressed "torn prompt": the >_ with torn, ink-bled edges (displacement filter) and chipped ink */}
                <svg className="e4-p" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient
                      id="e4-cur-grad"
                      gradientUnits="userSpaceOnUse"
                      x1="12"
                      y1="0"
                      x2="21.5"
                      y2="0"
                    >
                      <stop offset="0" stopColor="#FF00E5" />
                      <stop offset="1" stopColor="#00EFFF" />
                    </linearGradient>
                    <filter id="e4-torn-p" x="-25%" y="-25%" width="150%" height="150%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="3" seed="4" />
                      <feDisplacementMap
                        in="SourceGraphic"
                        scale="1.9"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                  </defs>
                  <g filter="url(#e4-torn-p)">
                    <path d="M3 5.5l7.2 6.5L3 18.5" stroke="#F4F4F8" strokeWidth="3" strokeLinecap="square" />
                    <rect
                      className="e4-cur"
                      x="12"
                      y="15.9"
                      width="9.5"
                      height="3"
                      fill="url(#e4-cur-grad)"
                    />
                    {/* ink chips */}
                    <path
                      d="M5.1 7.6l1.2-.4M8.6 10.9l.9.9M5.4 16.2l1.3.2M15.2 17.6v-.9M18.8 17.7v-.8"
                      stroke="#000"
                      strokeWidth=".8"
                    />
                  </g>
                </svg>
                <svg className="e4-x" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <filter id="e4-torn-x" x="-25%" y="-25%" width="150%" height="150%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="3" seed="5" />
                      <feDisplacementMap
                        in="SourceGraphic"
                        scale="1.9"
                        xChannelSelector="R"
                        yChannelSelector="G"
                      />
                    </filter>
                  </defs>
                  <g filter="url(#e4-torn-x)">
                    <path
                      d="M4.5 4.5l15 15M19.5 4.5l-15 15"
                      stroke="#F4F4F8"
                      strokeWidth="3"
                      strokeLinecap="square"
                    />
                    <path
                      d="M7.4 6.6l.9.9M15.6 8.4l.8-.8M8.3 16.2l.8-.8M16.5 16.6l-.8-.8"
                      stroke="#000"
                      strokeWidth=".8"
                    />
                  </g>
                </svg>
              </span>
            </button>
          </div>
        </div>
      </nav>
      {/* Always mounted, so opening never waits on React building it. The slat wipe
          and fade are CSS transitions (GPU), toggled by .is-open. */}
      <div
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        aria-hidden={!menuOpen}
        inert={menuOpen ? undefined : ""}
        className={"e4-menu fixed inset-0 z-40 lg:hidden overflow-hidden" + (menuOpen ? " is-open" : "")}
      >
        {[0, 1, 2, 3, 4, 5].map((u) => (
          <div className="e4-sl" style={{ "--i": u }} key={u} />
        ))}
        <div className="e4-inner">
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
        </div>
      </div>
    </>
  );
}
