import { AnimatePresence } from "framer-motion";
import React from "react";
import { BootSequence } from "./components/BootSequence";
import { Catalogue } from "./components/Catalogue";
import { Collective } from "./components/Collective";
import { DownloadModal } from "./components/DownloadModal";
import { Footer } from "./components/Footer";
import { Gutters } from "./components/Gutters";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { PlayerDock } from "./components/PlayerDock";
import { Signal } from "./components/Signal";

export default function App() {
  const [introDone, setIntroDone] = React.useState(() => {
    try {
      const q = new URLSearchParams(location.search);
      return q.has("nointro") ? true : q.has("intro") ? false : sessionStorage.getItem("e404-intro") === "1";
    } catch {
      return false;
    }
  });
  const [downloadOpen, setDownloadOpen] = React.useState(false);
  const finishIntro = React.useCallback(() => setIntroDone(true), []);
  const openDownload = React.useCallback(() => setDownloadOpen(true), []);
  const closeDownload = React.useCallback(() => setDownloadOpen(false), []);
  return (
    <div className="noise scanline min-h-screen bg-void">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-void focus:text-ghost focus:font-mono focus:text-xs focus:tracking-widest focus:border focus:border-magenta/50 focus:outline-none"
      >
        SKIP TO CONTENT
      </a>
      <AnimatePresence>{!introDone && <BootSequence onComplete={finishIntro} />}</AnimatePresence>
      {introDone && (
        <>
          <div
            aria-hidden="true"
            className="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
            style={{
              height: "env(safe-area-inset-top)",
              background: "#030409",
            }}
          />
          <Nav onDownloadOpen={openDownload} />
          <main id="main-content">
            <Hero />
            <Collective />
            <Catalogue onDownload={openDownload} />
            <Signal />
          </main>
          <Footer />
          <PlayerDock />
          <DownloadModal open={downloadOpen} onClose={closeDownload} />
          <Gutters />
        </>
      )}
    </div>
  );
}
