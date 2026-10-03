import React from "react";
import { CHAPTERS } from "../data/chapters";
import { formatTime } from "../lib/formatTime";

// Every track in album order, with its chapter.
const TRACKS = CHAPTERS.flatMap((chapter) => chapter.tracks.map((track) => ({ ...track, chapter })));
const BARS = [
  30, 55, 80, 45, 90, 60, 75, 40, 95, 50, 70, 35, 85, 55, 65, 42, 78, 58, 88, 48, 68, 38, 92, 52, 72, 32, 82,
  62, 45, 76, 36, 86, 56, 66, 44, 96, 54, 74, 34, 84,
];
const STORE = "e404-dock";
const pad = (n) => String(n).padStart(2, "0");

function readSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || "null");
    if (s && Number.isInteger(s.i) && s.i >= 0 && s.i < TRACKS.length) return s;
  } catch {
    // Storage can be blocked (e.g. Safari Private Browsing); start from track 01.
  }
  return { i: 0, t: 0 };
}

function save(i, t) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ i, t: Math.floor(t) }));
  } catch {
    // ignore: see readSaved()
  }
}

// Drawn icons (option S2, "terminal chevrons": square-capped strokes like the >_ menu icon).
// SVGs rather than the ⏮ ⏭ ☰ ✕ characters, which iOS swaps for coloured emoji.
const Icon = ({ d }) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="square"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);
const PREV = "M8 3.5L3.5 8 8 12.5M13 3.5L8.5 8 13 12.5";
const NEXT = "M3 3.5L7.5 8 3 12.5M8 3.5L12.5 8 8 12.5";
const QUEUE = "M2.5 4h11M2.5 8h11M2.5 12h7";
const CLOSE = "M4 4l8 8M12 4l-8 8";

function PlayKey({ playing, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={
        "e-playbtn" + (playing ? " on" : "") + " flex items-center justify-center shrink-0 focus:outline-none"
      }
    >
      {playing ? (
        <span className="flex gap-[3px]" aria-hidden="true">
          <span className="w-[3px] h-3 bg-void rounded-full" />
          <span className="w-[3px] h-3 bg-void rounded-full" />
        </span>
      ) : (
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
          <path d="M1 1l8 5-8 5V1z" fill="#F4F4F8" />
        </svg>
      )}
    </button>
  );
}

// The site-wide player: a dock fixed to the bottom of every page that plays the
// whole archive in order (01 → 20, then round again), styled like the chapter
// players. It shares the "e404-audio-play" handshake with them, so starting
// one pauses the other, and it remembers the track and position between visits.
export function PlayerDock() {
  const audioRef = React.useRef(null);
  const [initial] = React.useState(readSaved);
  // where to resume the restored track once its metadata loads (cleared after use or on a track change)
  const resumeAt = React.useRef(0);
  const [index, setIndex] = React.useState(initial.i);
  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(initial.t || 0);
  React.useEffect(() => {
    resumeAt.current = initial.t || 0;
  }, [initial]);
  const [duration, setDuration] = React.useState(0);
  const [queueOpen, setQueueOpen] = React.useState(false);
  const track = TRACKS[index];
  const progress = duration ? Math.min(time / duration, 1) : 0;

  // play / pause follows state
  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [playing, index]);

  // a chapter player started: step aside
  React.useEffect(() => {
    const onOther = (e) => e.detail !== audioRef.current && setPlaying(false);
    window.addEventListener("e404-audio-play", onOther);
    return () => window.removeEventListener("e404-audio-play", onOther);
  }, []);

  // remember where we are: every 5 s of playback, on pause, and when the page is closed
  React.useEffect(() => {
    save(index, time);
  }, [index, Math.floor(time / 5)]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    const onHide = () => audioRef.current && save(index, audioRef.current.currentTime);
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [index]);

  const go = React.useCallback((i) => {
    setIndex((i + TRACKS.length) % TRACKS.length);
    setTime(0);
    setDuration(0);
    resumeAt.current = 0;
    setPlaying(true);
  }, []);
  const next = React.useCallback(() => go(index + 1), [go, index]);
  const prev = React.useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) a.currentTime = 0;
    else go(index - 1);
  }, [go, index]);

  // lock-screen / headphone controls
  React.useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.title,
        artist: "ERROR_404",
        album: `ARCHIVE_404 · ${track.chapter.title}`,
        artwork: [{ src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }],
      });
      navigator.mediaSession.setActionHandler("play", () => setPlaying(true));
      navigator.mediaSession.setActionHandler("pause", () => setPlaying(false));
      navigator.mediaSession.setActionHandler("nexttrack", next);
      navigator.mediaSession.setActionHandler("previoustrack", prev);
    } catch {
      // older browsers: no lock-screen controls
    }
  }, [track, next, prev]);

  // Escape closes the queue; opening it scrolls the playing track into view
  const listRef = React.useRef(null);
  React.useEffect(() => {
    if (!queueOpen) return;
    const list = listRef.current;
    const cur = list && list.querySelector(".e-trk.cur");
    if (cur) list.scrollTop = cur.offsetTop - list.clientHeight / 2 + cur.clientHeight / 2;
    const onKey = (e) => e.key === "Escape" && setQueueOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queueOpen]);

  const seekTo = (fraction) => {
    const a = audioRef.current;
    if (!a) return;
    const apply = () => a.duration && (a.currentTime = Math.max(0, Math.min(1, fraction)) * a.duration);
    if (a.readyState > 0) apply();
    else {
      a.addEventListener("loadedmetadata", apply, { once: true });
      a.load();
    }
  };
  const onSeekClick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - r.left) / r.width);
  };
  const onSeekKey = (e) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    if (e.key === "ArrowRight") a.currentTime = Math.min(a.duration, a.currentTime + 5);
    if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5);
  };

  const title = `${pad(track.number)} — ${track.title}`;
  const chapterLine = `CHAPTER ${track.chapter.index} · ${track.chapter.title}`;
  const durationLabel = duration ? formatTime(duration) : track.duration;

  return (
    <>
      <audio
        ref={audioRef}
        src={track.audioPath}
        preload="none"
        onPlay={() => {
          setPlaying(true);
          window.dispatchEvent(new CustomEvent("e404-audio-play", { detail: audioRef.current }));
        }}
        onPause={(e) => {
          setPlaying(false);
          save(index, e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (resumeAt.current) {
            e.currentTarget.currentTime = resumeAt.current;
            resumeAt.current = 0;
          }
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onEnded={next}
      />
      <div className="e-dock-spacer" aria-hidden="true" />
      <section
        className={"e-dock" + (playing ? " playing" : "") + (queueOpen ? " q-open" : "")}
        aria-label="ARCHIVE_404 player"
      >
        <div
          id="e-dock-queue"
          className="e-dock-q"
          role="dialog"
          aria-label="Queue: all 20 files"
          aria-hidden={!queueOpen}
          inert={queueOpen ? undefined : ""}
        >
          <div className="e-dock-qh">
            <span>QUEUE · 20 FILES</span>
            <span className="e-dock-qpos">{pad(index + 1)} / 20</span>
            <button
              type="button"
              className="e-dock-qx"
              onClick={() => setQueueOpen(false)}
              aria-label="Close queue"
            >
              <Icon d={CLOSE} />
            </button>
          </div>
          <div className="e-dock-ql" ref={listRef}>
            {CHAPTERS.map((chapter) => (
              <div key={chapter.id}>
                <div className="e-dock-ch">
                  <span>
                    <b>{chapter.index}</b> {chapter.title}
                  </span>
                  <span>{chapter.tracks.length} FILES</span>
                </div>
                {chapter.tracks.map((t) => {
                  const i = TRACKS.findIndex((x) => x.number === t.number);
                  const cur = i === index;
                  return (
                    <button
                      type="button"
                      key={t.number}
                      onClick={() => (cur ? setPlaying((p) => !p) : go(i))}
                      aria-label={`Play track ${t.number}: ${t.title}, ${t.duration}`}
                      aria-pressed={cur && playing}
                      className={
                        "e-trk" +
                        (cur ? " cur" : "") +
                        " w-full flex items-center gap-3 text-left focus:outline-none"
                      }
                    >
                      <span className="e-dock-n">{cur && playing ? "\u25B6\uFE0E" : pad(t.number)}</span>
                      <span className={"e-trk-t flex-1 truncate" + (cur ? " cur" : "")}>{t.title}</span>
                      <span className="e-dock-d">{t.duration}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="e-dock-bar">
          <span className="e-dock-line" aria-hidden="true">
            <b style={{ width: `${progress * 100}%` }} />
          </span>
          <div className="e-dock-row">
            <PlayKey
              playing={playing}
              onClick={() => setPlaying((p) => !p)}
              label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
            />
            <button
              type="button"
              className="e-dock-sk e-dock-prev"
              onClick={prev}
              aria-label="Previous track"
            >
              <Icon d={PREV} />
            </button>
            <button type="button" className="e-dock-sk e-dock-next" onClick={next} aria-label="Next track">
              <Icon d={NEXT} />
            </button>
            <div className="e-dock-who">
              <p className="e-dock-tt">{title}</p>
              <p className="e-dock-tc">{chapterLine}</p>
            </div>
            <div className="e-dock-mid">
              <div
                className="e-dock-seek"
                role="slider"
                tabIndex={0}
                aria-label={`Seek ${track.title}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-valuetext={`${formatTime(time)} of ${durationLabel}`}
                onClick={onSeekClick}
                onKeyDown={onSeekKey}
              >
                <b style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="e-dock-times">
                <span>{formatTime(time)}</span>
                <span>{durationLabel}</span>
              </div>
            </div>
            <div className="e-dock-wave" aria-hidden="true">
              {BARS.map((h, i) => (
                <i
                  key={i}
                  className={playing && i / BARS.length < Math.max(progress, 0.02) ? "p" : ""}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <button
              type="button"
              className="e-dock-qbtn"
              onClick={() => setQueueOpen((o) => !o)}
              aria-expanded={queueOpen}
              aria-controls="e-dock-queue"
              aria-label="Queue"
            >
              <span className="e-dock-led" aria-hidden="true" />
              <span className="e-dock-qlbl">QUEUE {pad(index + 1)} / 20</span>
              <span className="e-dock-qico" aria-hidden="true">
                <Icon d={QUEUE} />
              </span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
