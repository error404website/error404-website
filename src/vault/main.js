// Source Vault (/vault/). The page is public; the prompts, lyrics and analysis are locked with the
// access key (public/vault/data.enc.json) and opened in the browser, and stem links come from
// netlify/functions/vault-stems.mjs for visitors who prove they know the key.
import "../styles/index.css";
import "../styles/overrides.css";
import "./vault.css";
import { audioSrc } from "../lib/audioSrc";
import { CHAPTERS as SITE_CHAPTERS } from "../data/chapters";

const $ = (s, el = document) => el.querySelector(s),
  $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (s) =>
  isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : "0:00";
const mb = (b) => (b >= 1e9 ? (b / 1e9).toFixed(2) + " GB" : Math.round(b / 1e6) + " MB");
const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const toast = (t) => {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("on"), 1800);
};
const copy = (text, label) => {
  (navigator.clipboard?.writeText(text) || Promise.reject()).then(
    () => toast(label + " COPIED"),
    () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        toast(label + " COPIED");
      } catch {
        /* clipboard unavailable */
      }
      ta.remove();
    },
  );
};
const camColour = (c) => {
  const n = parseInt(c);
  return `hsl(${((n - 1) * 30 + 300) % 360} 100% ${c.endsWith("B") ? 70 : 60}%)`;
};
const camCompat = (a, b) => {
  const na = parseInt(a),
    nb = parseInt(b);
  if (a === b || na === nb) return true;
  return a.slice(-1) === b.slice(-1) && (Math.abs(na - nb) === 1 || Math.abs(na - nb) === 11);
};
const splitTitle = (t) => {
  const i = t.lastIndexOf("_");
  return i > 0 ? `${t.slice(0, i + 1)}<span class="grad">${t.slice(i + 1)}</span>` : t;
};
const SUNO_STYLE = 1000,
  SUNO_SWEET = 3000,
  SUNO_LYRICS = 5000;

/* production styles: colour + icon (H) */
const SW = {
  None: ["#8a8a99", '<circle cx="12" cy="12" r="8"/><path d="M6 18L18 6"/>'],
  "Arena polish": [
    "#FF00E5",
    '<path d="M3 20h18M5 20l3-9M19 20l-3-9M8 11l4-7 4 7"/><path d="M12 4V2M7 6L5 4M17 6l2-2"/>',
  ],
  "Raw and live": [
    "#ff8a3d",
    '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0012 0M12 17v4M8 21h8"/>',
  ],
  "Glitch-heavy": ["#00EFFF", '<path d="M4 5h9M4 9h14M8 13h12M4 17h7M14 17h6M6 21h10"/>'],
  Cinematic: [
    "#A100FF",
    '<rect x="3" y="6" width="18" height="12"/><path d="M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3M10 9.5l4 2.5-4 2.5z"/>',
  ],
  "Lo-fi underground": [
    "#4ade80",
    '<rect x="3" y="6" width="18" height="12" rx="1.5"/><circle cx="8.5" cy="12" r="2"/><circle cx="15.5" cy="12" r="2"/><path d="M8.5 14h7"/>',
  ],
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${SW[n][1]}</svg>`;

/* ---------- data ---------- */
let TRACKS = [],
  PROMPTS = {},
  MASTER = "",
  PSTYLES = [],
  ALLSTYLES = [];
const state = {}; // per track: { ps, lyr }
function parsePrompts(md) {
  MASTER = (md.split("## Master style")[1] || "").split("##")[0].trim();
  const prod = (md.split("## Production style")[1] || "").split(/^## \d/m)[0];
  PSTYLES = [...prod.matchAll(/- \*\*(.+?):\*\* (.+)/g)].map((m) => ({ name: m[1], text: m[2].trim() }));
  ALLSTYLES = [{ name: "None", text: "" }, ...PSTYLES];
  for (const sec of md.split(/^## \d+\. /m).slice(1)) {
    const slug = sec.split("\n")[0].trim();
    PROMPTS[slug] = {
      style: (sec.split("### Style")[1] || "").split("### Lyrics")[0].trim(),
      lyrics: (sec.split("### Lyrics")[1] || "").trim(),
    };
  }
}
const buildStyle = (slug, ps) => {
  const b = PROMPTS[slug]?.style || "";
  return ps
    ? b.replace("[PRODUCTION STYLE]", ps)
    : b.replace("; [PRODUCTION STYLE]", "").replace("[PRODUCTION STYLE]", "");
};

/* optimised lyrics: same words, Suno-friendly formatting */
function optimise(lyrics) {
  if (!/^\[/m.test(lyrics)) {
    const lines = (lyrics.replace(/\s+/g, " ").match(/[^.!?:]+[.!?:]+["”]?/g) || [lyrics]).map((s) =>
        s.trim(),
      ),
      out = [{ tag: "[Intro - spoken word]", lines: lines.slice(0, 2) }];
    const mid = lines.slice(2, -2);
    for (let i = 0; i < mid.length; i += 4) out.push({ tag: "[Spoken Word]", lines: mid.slice(i, i + 4) });
    out.push({ tag: "[Outro]", lines: lines.slice(-2) });
    return out;
  }
  const out = [];
  let cur = null;
  for (const raw of lyrics.split("\n")) {
    const line = raw.trimEnd(),
      m = line.match(/^\[([^\]]+)\]$/);
    if (m) {
      const [name, rest] = m[1].split(/\s+-\s+/),
        cues = (rest || "").split(/,\s*/).filter(Boolean);
      const keep = [];
      for (const c of cues) {
        if ((name + " - " + [...keep, c].join(", ")).length <= 40 && keep.length < 2) keep.push(c);
        else break;
      }
      cur = {
        tag: `[${name}${keep.length ? " - " + keep.join(", ") : ""}]`,
        note: cues.slice(keep.length).join(" · "),
        lines: [],
      };
      out.push(cur);
    } else if (line.trim()) {
      if (!cur) {
        cur = { tag: "", lines: [] };
        out.push(cur);
      }
      cur.lines.push(line.trim());
    }
  }
  return out;
}
const optText = (secs) => secs.map((s) => [s.tag, ...s.lines].filter(Boolean).join("\n")).join("\n\n");
const lyricsFor = (slug, which) =>
  which === "opt" ? optText(optimise(PROMPTS[slug]?.lyrics || "")) : PROMPTS[slug]?.lyrics || "";

/* E: estimated section timeline from the lyric structure */
function sections(slug, dur) {
  const lyr = PROMPTS[slug]?.lyrics || "";
  let parts = [];
  if (/^\[/m.test(lyr)) {
    let cur = null;
    for (const line of lyr.split("\n")) {
      const m = line.match(/^\[([^\]-]+?)(?:\s*-\s*[^\]]*)?\]$/);
      if (m) {
        cur = { name: m[1].trim().toUpperCase(), lines: [] };
        parts.push(cur);
      } else if (line.trim() && cur) cur.lines.push(line.trim());
    }
  } else
    parts = optimise(lyr).map((s) => ({
      name: s.tag.replace(/[[\]]/g, "").split(" - ")[0].toUpperCase(),
      lines: s.lines,
    }));
  const w = parts.map((p) => Math.max(p.lines.length, /SWITCH|BREAK|DROP/.test(p.name) ? 1.5 : 2.2)),
    tot = w.reduce((a, b) => a + b, 0) || 1;
  let t = 0;
  return parts.map((p, i) => {
    const s = { ...p, start: t, end: t + (dur * w[i]) / tot };
    t = s.end;
    return s;
  });
}

/* ---------- gate · A unlock sequence ---------- */
let revealed = false;
function reveal() {
  if (revealed) return;
  revealed = true;
  $("#gate").classList.add("out");
  stopGateRain();
  document.body.classList.remove("locked");
  $("#vault").hidden = false;
  $("#snav").hidden = false;
  $("#ruler").hidden = false;
  requestAnimationFrame(drawRuler);
  startNav();
  $("#vfoot").hidden = false;
  $("#dock").hidden = false;
  startGutters();
  if (!window.__efx) {
    const fx = document.createElement("script");
    fx.src = $("#fx-src").content.firstElementChild.getAttribute("src");
    document.body.appendChild(fx);
  } // the site's logo behaviours: nav draw-on + closing spotlight
  new IntersectionObserver(
    (es, o) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          $$(".vf-credits .e-cr").forEach(
            (c, i) => (c.style.transitionDelay = (REDUCE ? 0 : 0.2 + i * 0.35) + "s"),
          );
          $(".vf-credits").classList.add("in");
          o.disconnect();
        }
      }),
    { rootMargin: "-10%" },
  ).observe($("#vfoot"));
  const els = $$(".reveal, .row");
  els.forEach((el, i) => setTimeout(() => el.classList.add("in"), REDUCE ? 0 : Math.min(i, 22) * 55));
}
/* V1 · the site's three-layer rain (7 / 10 / 14 px), streaming stem names and track titles */
function vaultRain(cv, words) {
  const ctx = cv.getContext("2d"),
    dpr = Math.min(2, devicePixelRatio || 1),
    W = innerWidth,
    H = innerHeight,
    phone = W < 768;
  cv.width = W * dpr;
  cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = "top";
  const LAYERS = [
    { fs: 7, pfs: 6, sp: [170, 320], a: 0.45, glow: 0.6, head: 0.55, every: 1 },
    { fs: 10, pfs: 9, sp: [320, 600], a: 0.8, glow: 0.9, head: 0.9, every: 2 },
    { fs: 14, pfs: 12, sp: [620, 980], a: 1, glow: 1, head: 1, every: 7 },
  ];
  const colour = (t) => {
    const a = [255, 0, 229],
      m = [161, 0, 255],
      c = [0, 239, 255];
    const [p, q, u] = t < 0.5 ? [a, m, t * 2] : [m, c, (t - 0.5) * 2];
    return p.map((v, i) => Math.round(v + (q[i] - v) * u)).join(",");
  };
  const streams = [];
  let drain = false,
    raf = 0,
    last = performance.now();
  LAYERS.forEach((L, li) => {
    const fs = phone ? L.pfs : L.fs,
      n = Math.ceil(W / fs);
    for (let c = 0; c < n; c++) {
      if ((c + li) % L.every) continue;
      streams.push({
        L,
        fs,
        x: c * fs,
        w: words[(c * 7 + li * 3) % words.length] + "   ",
        row: (-Math.random() * H * 0.6) / fs,
        rows: Math.ceil(H / fs),
        sp: (L.sp[0] + Math.random() * (L.sp[1] - L.sp[0])) / fs,
        col: colour(c / n),
      });
    }
  });
  ctx.fillStyle = "#030409";
  ctx.fillRect(0, 0, W, H);
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.fillStyle = `rgba(3,4,9,${drain ? 0.2 : 0.075})`;
    ctx.fillRect(0, 0, W, H);
    for (const s of streams) {
      if (s.row < -9000) continue;
      s.row += s.sp * dt;
      const r = Math.floor(s.row);
      if (r < 0) continue;
      const y = r * s.fs,
        L = s.w.length;
      ctx.font = `${s.fs}px 'Space Mono', monospace`;
      ctx.globalAlpha = s.L.a;
      ctx.fillStyle = `rgb(${s.col})`;
      ctx.fillText(s.w[(r - 1 + L * 99) % L], s.x, y - s.fs);
      ctx.globalAlpha = s.L.head;
      ctx.fillStyle = "#F4F4F8";
      ctx.shadowColor = `rgb(${s.col})`;
      ctx.shadowBlur = s.fs * s.L.glow;
      ctx.fillText(s.w[r % L], s.x, y);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      if (r > s.rows + 2) s.row = drain ? -9999 : (-Math.random() * 240) / s.fs;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return {
    drain() {
      drain = true;
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}
// The gate's rain: only public words before the key is in (the site's track titles and the stem types).
const GATE_WORDS = [
  ...SITE_CHAPTERS.flatMap((c) => c.tracks.map((t) => t.title)),
  ...["VOCALS", "BACKING_VOCALS", "DRUMS", "BASS", "SYNTH", "GUITAR", "KEYBOARD", "STRINGS", "BRASS", "FX"],
];
let gateRain = null;
function startGateRain() {
  if (REDUCE) return;
  gateRain?.stop();
  gateRain = vaultRain($("#gateRain"), GATE_WORDS);
}
function stopGateRain() {
  const r = gateRain;
  gateRain = null;
  if (r) setTimeout(() => r.stop(), 400); // after the gate's fade
}
startGateRain();
let resizeT = 0;
addEventListener("resize", () => {
  if (!gateRain) return;
  clearTimeout(resizeT);
  resizeT = setTimeout(() => gateRain && startGateRain(), 200);
});
let introDone = null;
function unlockSequence() {
  $("#viStatus").textContent = "Access granted. Opening the vault.";
  if (REDUCE) return reveal();
  const pad = (n) => String(n).padStart(2, "0"),
    titles = TRACKS.map((t) => t.title);
  const stems = [
    ...new Set(TRACKS.flatMap((t) => t.stems.map((x) => x.name.toUpperCase().replace(/ /g, "_")))),
  ];
  const ov = $("#vintro"),
    term = $("#viTerm");
  ov.hidden = false;
  ov.classList.remove("out");
  $("#gate").classList.add("out");
  stopGateRain();
  const rain = vaultRain($("canvas", ov), stems.concat(titles));
  const T = [];
  const at = (ms, f) => T.push(setTimeout(f, ms));
  const line = (i, extra = "") =>
    `<div><b>&gt;</b> KEY ACCEPTED · <span class="ok">ACCESS Nº004</span></div><div><b>&gt;</b> DECRYPTING <i>${pad(i)}/20</i>${i ? `<span class="t">${titles[i - 1]}_STEMS.ZIP</span>` : ""}</div>${extra}<span class="cur"></span>`;
  term.classList.remove("out");
  term.innerHTML = line(0);
  for (let i = 1; i <= 20; i++) at(250 + (i - 1) * 150, () => (term.innerHTML = line(i)));
  at(
    250 + 20 * 150,
    () =>
      (term.innerHTML = line(
        20,
        '<div><b>&gt;</b> <span class="ok">VAULT OPEN</span> · 20 FILES · WAV + MIDI</div>',
      )),
  );
  at(3450, () => {
    rain.drain();
    term.classList.add("out");
  });
  at(3900, () => introDone());
  introDone = () => {
    T.forEach(clearTimeout);
    introDone = null;
    removeEventListener("keydown", skip);
    ov.removeEventListener("pointerdown", skip);
    reveal();
    ov.classList.add("out");
    setTimeout(() => {
      rain.stop();
      ov.hidden = true;
    }, 380);
  };
  const skip = () => introDone && introDone(); // a tap or any key skips, like the site intro
  setTimeout(() => {
    addEventListener("keydown", skip);
    ov.addEventListener("pointerdown", skip);
  }, 250); // after the Enter that submitted the key
}
$("#gateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#gateForm button");
  if (btn.disabled) return;
  const say = (t, bad) => {
    $("#msg").className = bad ? "msg bad" : "msg";
    $("#msg").textContent = t;
  };
  btn.disabled = true;
  say("> VERIFYING KEY…");
  try {
    if (await unlockWith($("#pw").value)) {
      say("");
      $("#pw").blur();
      unlockSequence();
      return;
    }
    const box = $(".gate-box");
    box.classList.remove("shake");
    void box.offsetWidth;
    box.classList.add("shake");
    say("> ACCESS DENIED · KEY NOT RECOGNISED", true);
    $("#pw").select();
  } catch {
    say("> NO SIGNAL · CHECK YOUR CONNECTION", true);
  } finally {
    btn.disabled = false;
  }
});
$("#backTop").onclick = $("#toTop").onclick = (e) => {
  e.preventDefault();
  scrollTo({ top: 0, behavior: "smooth" });
};
function startNav() {
  if (startNav.done) return;
  startNav.done = true;
  const burger = $("#burger"),
    menu = $("#vmenu");
  const setMenu = (o) => {
    menu.hidden = !o;
    burger.setAttribute("aria-expanded", o);
    burger.classList.toggle("is-open", o);
    burger.setAttribute("aria-label", o ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", o);
  };
  burger.onclick = () => setMenu(menu.hidden);
  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !menu.hidden) setMenu(false);
  });
  addEventListener("resize", () => {
    if (innerWidth >= 1024 && !menu.hidden) setMenu(false);
  });
  $$("[data-nav]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      setMenu(false);
      const t = document.getElementById(a.dataset.nav);
      if (!t) return;
      if (t.tagName === "DETAILS") t.open = true;
      const y =
        t.getBoundingClientRect().top +
        scrollY -
        parseInt(getComputedStyle(document.documentElement).getPropertyValue("--navh")) -
        8;
      scrollTo({ top: y, behavior: REDUCE ? "auto" : "smooth" });
    }),
  );
  $$("[data-lock]").forEach((b) => (b.onclick = () => $("#lockBtn").click()));
  // scroll spy: the active link is the last section whose top has passed under the menu (none while the header is in view)
  const spy = () => {
    const line = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--navh")) + 120;
    let cur = null;
    ["prompts", "hmap", "tracks"]
      .map((id) => document.getElementById(id))
      .sort((x, y) => x.getBoundingClientRect().top - y.getBoundingClientRect().top)
      .forEach((el) => {
        if (el.getBoundingClientRect().top < line) cur = el.id;
      });
    if (document.getElementById("vfoot").getBoundingClientRect().top < innerHeight * 0.5) cur = "vfoot";
    $$("[data-nav]").forEach((a) => {
      const on = a.dataset.nav === cur,
        desk = a.classList.contains("e8-link");
      a.classList.toggle("active", on && desk);
      a.classList.toggle("on", on && !desk);
      on && desk ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current");
    });
  };
  addEventListener("scroll", spy, { passive: true });
  spy();
}
$("#lockBtn").onclick = () => {
  au.pause();
  try {
    sessionStorage.removeItem(SESSION);
  } catch {
    /* nothing stored */
  }
  location.reload();
};

/* ---------- render rows (K booklet) ---------- */
const au = $("#au");
let cur = null;
function rowHTML(t) {
  const conf =
    t.keyAgree === 3
      ? ["var(--led)", "3/3 MODELS AGREE"]
      : t.relAgree >= 2
        ? ["var(--amber)", `${t.keyAgree}/3 · RELATIVE ${t.relative}`]
        : ["var(--red)", "LOW CONFIDENCE"];
  const target = t.targetBpm.length ? t.targetBpm.join(" → ") : "—",
    close = t.targetBpm.length && Math.abs(t.bpm - t.targetBpm[t.targetBpm.length - 1]) <= 4;
  const bars = innerWidth < 600 ? 60 : 120,
    pk = (i) => t.peaks[Math.floor((i / bars) * t.peaks.length)],
    bigBars = Math.round(bars * 1.2);
  return `<article class="row" data-slug="${t.slug}">
    <span class="bignum" aria-hidden="true">${t.n}</span>
    <div class="row-main">
      <button class="pk" data-play aria-label="Play ${t.title}"><span class="tri"></span></button>
      <div class="ttl"><div class="eyb">CHAPTER 0${t.ch} · ${t.chapter}</div><h3>${splitTitle(t.title)}</h3>
        <div class="lbls"><span>LENGTH<b>${t.durationText}</b></span><span>TEMPO<b>≈${t.bpm}</b></span><span>KEY<b>${t.key}</b> <span class="cam" style="background:${camColour(t.camelot)}">${t.camelot}</span></span><span>STEMS<b>${t.stems.length}</b></span></div></div>
      <div class="acts">
        <button class="gbtn" data-kit title="Title, style and lyrics, ready for Suno">⧉ KIT</button>
        <button class="gbtn" data-dl="${t.slug}">↓ STEMS${SIZES[t.asset] ? " · " + mb(SIZES[t.asset]) : ""}</button>
        <button class="more" data-more aria-expanded="false" aria-label="Open ${t.title} files">+</button>
      </div>
    </div>
    <div class="mini" data-seek aria-hidden="true">${Array.from({ length: bars }, (_, i) => `<i style="height:${Math.max(8, pk(i) * 100)}%"></i>`).join("")}</div>
    <div class="big">
      <div class="big-top"><div class="now"><i></i>NOW: <b data-now>—</b></div><div class="times"><span data-cur>0:00</span> / ${t.durationText}</div></div>
      <div class="big-wave" data-seek>${Array.from({ length: bigBars }, (_, i) => `<i style="height:${Math.max(6, t.peaks[Math.floor((i / bigBars) * t.peaks.length)] * 100)}%"></i>`).join("")}<span class="ph"></span></div>
      <div class="secs" data-secs></div>
      <div class="lyric-now" data-lnow><span class="h">LYRICS</span></div>
      <div class="est">SECTION TIMES ARE ESTIMATED FROM THE LYRICS</div>
    </div>
    <div class="panel">
      <div class="tabs" role="tablist"><button class="on" data-tab="prompt">PROMPT</button><button data-tab="lyrics">LYRICS</button><button data-tab="stems">STEMS · ${t.stems.length}</button><button data-tab="analysis">ANALYSIS</button></div>
      <div class="tab on" data-pane="prompt">
        <div class="sws">${ALLSTYLES.map((p, i) => `<button class="sw${i === 0 ? " on" : ""}" style="--c:${SW[p.name][0]}" data-ps="${i}"><span class="dot"></span>${icon(p.name)}<b>${p.name.toUpperCase()}</b></button>`).join("")}</div>
        <div class="codebox" data-style></div>
        <div class="boxbar"><span class="count" data-count></span><span class="kitbar"><button class="gbtn" data-copy-style>COPY STYLE</button><button class="holo" data-kit>⧉ COPY REMIX KIT</button></span></div>
      </div>
      <div class="tab" data-pane="lyrics">
        <div class="seg2" role="group" aria-label="Lyric version"><button class="on" data-lyr="opt">OPTIMISED FOR SUNO</button><button data-lyr="orig">ORIGINAL</button></div>
        <div class="codebox" data-lyrics></div>
        <div class="boxbar"><span class="count" data-lcount></span><span class="kitbar"><button class="gbtn" data-copy-lyrics>COPY LYRICS</button><button class="holo" data-kit>⧉ COPY REMIX KIT</button></span></div>
      </div>
      <div class="tab" data-pane="stems">
        <div class="stems">${t.stems.map((s) => `<div class="stem"><span>${s.name.toUpperCase()}</span><span class="fmt">${s.wav ? `<button data-toast="${s.name} WAV (MOCKUP)">WAV</button>` : ""}${s.mid ? `<button data-toast="${s.name} MIDI (MOCKUP)">MIDI</button>` : ""}</span></div>`).join("")}</div>
        <div class="boxbar"><span class="count">${esc(t.asset.toUpperCase())} · WAV + MIDI${STEMS_READY ? "" : " · UPLOADING SOON"}</span><button class="holo" data-dl="${t.slug}">↓ DOWNLOAD STEMS${SIZES[t.asset] ? " · " + mb(SIZES[t.asset]) : ""}</button></div>
      </div>
      <div class="tab" data-pane="analysis"><div class="an">
        <div class="card"><div class="k">LENGTH</div><div class="v">${t.durationText}</div><div class="s">${t.duration.toFixed(1)} s, read from the remastered file.</div></div>
        <div class="card"><div class="k">TEMPO</div><div class="v">≈${t.bpm}<span style="font-family:var(--mono);font-size:14px">BPM</span></div><div class="s">Measured ${t.bpmRaw} BPM over the middle of the track. Prompt target: <b>${target}</b>${t.targetBpm.length ? (close ? " (matches)." : ". <b>Differs:</b> the track may sit half- or double-time, or change tempo.") : "."}</div></div>
        <div class="card"><div class="k">KEY</div><div class="v">${t.key}<span class="cam" style="background:${camColour(t.camelot)};font-size:13px;padding:3px 7px">${t.camelot}</span></div><div class="s"><span class="conf" style="--c:${conf[0]}">${conf[1]}</span><br />EDMA ${t.keyVotes.edma} · BGATE ${t.keyVotes.bgate} · TEMPERLEY ${t.keyVotes.temperley}</div></div>
        <div class="card"><div class="k">MIXES WELL WITH</div><div class="tl" style="margin-top:10px">${TRACKS.filter(
          (o) => o.slug !== t.slug && camCompat(t.camelot, o.camelot),
        )
          .map((o) => `<button data-jump="${o.slug}">${o.n} ${o.title} <em>${o.camelot}</em></button>`)
          .join("")}</div></div>
      </div></div>
    </div>
  </article>`;
}
function render() {
  const ch = +($(".chips-scroll .on")?.dataset.ch || 0),
    q = $("#q").value.trim().toLowerCase(),
    sort = $("#sortBtn").dataset.sort;
  let list = TRACKS.filter(
    (t) =>
      (!ch || t.ch === ch) &&
      (!q ||
        `${t.title} ${t.key} ${t.camelot} ${t.chapter} ${PROMPTS[t.slug]?.lyrics || ""}`
          .toLowerCase()
          .includes(q)),
  );
  if (sort === "bpm") list = [...list].sort((a, b) => a.bpmRaw - b.bpmRaw);
  if (sort === "key")
    list = [...list].sort(
      (a, b) => parseInt(a.camelot) - parseInt(b.camelot) || a.camelot.localeCompare(b.camelot),
    );
  let html = "",
    last = null;
  for (const t of list) {
    if (sort === "n" && t.ch !== last) {
      html += `<div class="chap">0${t.ch} · ${t.chapter}</div>`;
      last = t.ch;
    }
    html += rowHTML(t);
  }
  $("#list").innerHTML = html || `<div class="empty">&gt; NO FILES MATCH</div>`;
  $$(".row").forEach((row) => {
    const s = (state[row.dataset.slug] ||= { ps: 0, lyr: "opt" });
    fillPrompt(row, s.ps);
    fillLyrics(row, s.lyr);
  });
  syncPlaying();
}
function fillPrompt(row, i) {
  const slug = row.dataset.slug,
    p = ALLSTYLES[i],
    text = buildStyle(slug, p.text),
    box = $("[data-style]", row),
    c = SW[p.name][0];
  state[slug].ps = i;
  row.style.setProperty("--c", c);
  row.classList.toggle("tint", i > 0);
  box.style.setProperty("--c", c);
  box.innerHTML = p.text ? esc(text).replace(esc(p.text), `<mark>${esc(p.text)}</mark>`) : esc(text);
  box.dataset.text = text;
  $("[data-count]", row).innerHTML =
    `${text.length} / ${SUNO_STYLE} CHARACTERS${text.length > SUNO_STYLE ? ' · <span class="warn">OVER SUNO\'S STYLE LIMIT</span>' : ""}`;
  $$("[data-ps]", row).forEach((b) => b.classList.toggle("on", +b.dataset.ps === i));
}
function fillLyrics(row, which) {
  const slug = row.dataset.slug,
    orig = PROMPTS[slug]?.lyrics || "";
  state[slug].lyr = which;
  $$("[data-lyr]", row).forEach((b) => b.classList.toggle("on", b.dataset.lyr === which));
  let html, len;
  if (which === "opt") {
    const secs = optimise(orig);
    html = secs
      .map(
        (s) =>
          `${s.tag ? `<span class="sec">${esc(s.tag)}</span>` : ""}${s.note ? `<span class="note">↳ ${esc(s.note)}</span>` : "\n"}${esc(s.lines.join("\n"))}`,
      )
      .join("\n\n");
    len = optText(secs).length;
  } else {
    html = esc(orig).replace(/^(\[.*?\])$/gm, '<span class="sec">$1</span>');
    len = orig.length;
  }
  $("[data-lyrics]", row).innerHTML = html;
  $("[data-lcount]", row).innerHTML =
    `${len.toLocaleString()} CHARACTERS · ${len > SUNO_LYRICS ? '<span class="warn">OVER 5,000 LIMIT</span>' : len > SUNO_SWEET ? '<span class="warn">OVER 3,000 · SUNO MAY RUSH</span>' : '<span class="ok">WITHIN 3,000 SWEET SPOT</span>'}${which === "opt" ? " · GREY NOTES AREN'T COPIED" : ""}`;
}
function remixKit(row) {
  const t = TRACKS.find((x) => x.slug === row.dataset.slug),
    s = state[t.slug],
    p = ALLSTYLES[s.ps],
    style = buildStyle(t.slug, p.text),
    ly = lyricsFor(t.slug, s.lyr);
  return `TITLE\n${t.title}${s.ps ? ` (${p.name} remix)` : " (remix)"}\n\nSTYLE (${style.length} chars)\n${style}\n\nLYRICS (${s.lyr === "opt" ? "optimised" : "original"}, ${ly.length} chars)\n${ly}\n\n— ref: ${t.durationText} · ≈${t.bpm} BPM · ${t.key} (${t.camelot})`;
}

/* ---------- E · player ---------- */
const secCache = {};
function play(slug, at) {
  const t = TRACKS.find((x) => x.slug === slug);
  if (!t) return;
  if (cur !== slug) {
    cur = slug;
    au.src = audioSrc(`/audio/${slug}.mp3`);
  }
  if (at != null) {
    const go = () => {
      au.currentTime = at * (au.duration || t.duration);
    };
    au.readyState >= 1 ? go() : au.addEventListener("loadedmetadata", go, { once: true });
  }
  au.play().catch(() => {});
  $("#dockT").textContent = `${t.n} — ${t.title}`;
  $("#dockS").textContent = `CHAPTER 0${t.ch} · ${t.chapter}`;
  $("#dockChips").innerHTML =
    `≈${t.bpm} BPM · ${t.key} <span class="cam" style="background:${camColour(t.camelot)}">${t.camelot}</span>`;
  const row = $(`.row[data-slug="${slug}"]`);
  if (row) buildSecs(row, t);
}
function buildSecs(row, t) {
  const secs = (secCache[t.slug] ||= sections(t.slug, t.duration));
  $("[data-secs]", row).innerHTML = secs
    .map(
      (s, i) =>
        `<button data-sec="${i}" style="left:${(s.start / t.duration) * 100}%;width:${((s.end - s.start) / t.duration) * 100}%" title="${esc(s.name)} · ≈${fmt(s.start)}">${esc(s.name)}</button>`,
    )
    .join("");
}
function syncPlaying() {
  const on = !au.paused;
  $$(".row").forEach((r) => {
    const me = r.dataset.slug === cur;
    r.classList.toggle("playing", me && (on || au.currentTime > 0));
    $("[data-play]", r).innerHTML = me && on ? '<span class="bars"></span>' : '<span class="tri"></span>';
  });
  $("#dockPlay").innerHTML = on ? '<span class="bars"></span>' : '<span class="tri"></span>';
}
au.addEventListener("play", syncPlaying);
au.addEventListener("pause", syncPlaying);
au.addEventListener("ended", () => {
  const i = TRACKS.findIndex((t) => t.slug === cur);
  play(TRACKS[(i + 1) % TRACKS.length].slug, 0);
});
au.addEventListener("timeupdate", () => {
  const t = TRACKS.find((x) => x.slug === cur);
  if (!t) return;
  const d = au.duration || t.duration,
    p = au.currentTime / d;
  $("#dockProg").style.width = p * 100 + "%";
  $("#dockTm").textContent = `${fmt(au.currentTime)} / ${fmt(d)}`;
  const row = $(`.row[data-slug="${cur}"]`);
  if (!row) return;
  if (!$("[data-secs] button", row)) buildSecs(row, t);
  $$(".big-wave i", row).forEach((b, i, a) => b.classList.toggle("on", i / a.length < p));
  $(".big-wave .ph", row).style.left = p * 100 + "%";
  $("[data-cur]", row).textContent = fmt(au.currentTime);
  const secs = secCache[cur],
    si = secs.findIndex((s) => au.currentTime >= s.start && au.currentTime < s.end);
  $$("[data-secs] button", row).forEach((b, j) => b.classList.toggle("cur", j === si));
  const nowEl = $("[data-now]", row);
  if (si >= 0 && nowEl.dataset.i != si) {
    nowEl.dataset.i = si;
    nowEl.textContent = secs[si].name;
    $("[data-lnow]", row).innerHTML =
      `<span class="h">${esc(secs[si].name)} · FROM ≈${fmt(secs[si].start)}</span>${secs[si].lines.length ? secs[si].lines.slice(0, 4).map(esc).join("<br />") : "<span style='color:var(--t4)'>(instrumental)</span>"}`;
  }
});
$("#dockPlay").onclick = () => {
  if (!cur) return play("gospel_out");
  au.paused ? au.play() : au.pause();
};

/* ---------- I · download moment ---------- */
// The vault asks the server for a short-lived signed link to the zip on the private release,
// then hands it to the browser's own downloader (which shows the real progress).
let xHide = 0;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
function startDownload(url) {
  const f = document.createElement("iframe");
  f.hidden = true;
  f.src = url;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 120000);
}
async function download(slug) {
  const t = slug === "all" ? null : TRACKS.find((x) => x.slug === slug);
  const files = t
    ? [{ asset: t.asset, label: `${t.n}_${t.title}_STEMS.ZIP` }]
    : CHAPTERS.map((c) => ({ asset: c.asset, label: c.asset.toUpperCase() }));
  clearTimeout(xHide);
  const X = $("#xfer"),
    log = $("#xLog");
  X.classList.add("on");
  $("#xStamp").classList.remove("in");
  const st = (s, c) => {
    $("#xState").textContent = s;
    $("#xState").style.color = c;
  };
  const total = files.reduce((n, f) => n + (SIZES[f.asset] || 0), 0);
  $("#xName").textContent = t ? files[0].label : `ARCHIVE_404 · ALL STEMS · ${files.length} CHAPTER ZIPS`;
  $("#xBar").style.width = "0";
  $("#xSize").textContent = total ? mb(total) : "—";
  $("#xSpeed").textContent = "—";
  $("#xLeft").textContent = `${files.length} FILE${files.length > 1 ? "S" : ""}`;
  st("CONNECTING", "var(--amber)");
  log.innerHTML = "&gt; HANDSHAKE · ACCESS KEY VERIFIED";
  let done = 0;
  for (const f of files) {
    let r;
    try {
      r = await stemsApi({ f: f.asset });
    } catch {
      r = null;
    }
    if (!r || !r.ok) {
      const why = r && r.status === 401 ? "KEY NOT ACCEPTED · LOCK AND UNLOCK AGAIN" : "NOT UPLOADED YET";
      st(r && r.status === 401 ? "LOCKED" : "PENDING", "var(--amber)");
      log.innerHTML += `<br />&gt; ${esc(f.label)} · <em>${why}</em>`;
      continue;
    }
    const link = await r.json();
    if (!done) {
      st("TRANSFERRING", "var(--cyan)");
      log.innerHTML += "<br />&gt; SIGNED LINK ISSUED · EXPIRES IN <em>05:00</em>";
    }
    startDownload(link.url);
    done++;
    log.innerHTML += `<br />&gt; ${esc(f.label)} · <em>${mb(link.size)}</em> → YOUR DOWNLOADS`;
    $("#xBar").style.width = (done / files.length) * 100 + "%";
    if (done < files.length) await pause(1500); // browsers allow one download at a time from a page
  }
  if (done) {
    st("COMPLETE", "var(--led)");
    log.innerHTML += `<br />&gt; HANDED TO YOUR BROWSER${t ? ` · ${t.stems.length} STEMS · WAV + MIDI` : ""}`;
    $("#xStamp").classList.add("in");
    xHide = setTimeout(() => X.classList.remove("on"), 5200);
  }
}
$("#xClose").onclick = () => $("#xfer").classList.remove("on");

/* ---------- harmonic map ---------- */
const MAJ = ["B", "F♯", "D♭", "A♭", "E♭", "B♭", "F", "C", "G", "D", "A", "E"],
  MIN = ["G♯m", "E♭m", "B♭m", "Fm", "Cm", "Gm", "Dm", "Am", "Em", "Bm", "F♯m", "C♯m"];
let selSeg = null;
const keyName = (c) =>
  c.endsWith("B") ? MAJ[parseInt(c) - 1] + " major" : MIN[parseInt(c) - 1].replace("m", "") + " minor";
function arc(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0),
    [x1, y1] = p(r1, a1),
    [x2, y2] = p(r0, a1),
    [x3, y3] = p(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`;
}
function drawWheel() {
  const cx = 220,
    cy = 220,
    by = {};
  TRACKS.forEach((t) => (by[t.camelot] ||= []).push(t));
  let svg = "";
  for (let i = 0; i < 12; i++) {
    const a0 = ((i - 0.5) / 12) * 2 * Math.PI - Math.PI / 2,
      a1 = ((i + 0.5) / 12) * 2 * Math.PI - Math.PI / 2,
      mid = (a0 + a1) / 2;
    for (const [ring, r0, r1] of [
      ["B", 150, 210],
      ["A", 88, 148],
    ]) {
      const code = i + 1 + ring,
        has = by[code]?.length || 0,
        dim = selSeg ? !(code === selSeg || camCompat(selSeg, code)) : !has;
      svg += `<path class="seg${dim ? " dim" : ""}${code === selSeg ? " sel" : ""}" d="${arc(cx, cy, r0, r1, a0 + 0.012, a1 - 0.012)}" fill="${camColour(code)}" data-seg="${code}"><title>${code} · ${keyName(code)}${has ? ` · ${has} tracks` : ""}</title></path>`;
      const rm = (r0 + r1) / 2,
        x = cx + rm * Math.cos(mid),
        y = cy + rm * Math.sin(mid);
      svg += `<text class="lbl${dim ? " dim" : ""}" x="${x}" y="${y - (has ? 3 : -4)}" text-anchor="middle">${code}</text>${has ? `<text class="cnt" x="${x}" y="${y + 10}" text-anchor="middle">${has}×</text>` : ""}`;
    }
  }
  svg += `<circle cx="${cx}" cy="${cy}" r="84" fill="#05060b" stroke="rgba(244,244,248,.1)"/><text x="${cx}" y="${cy - 6}" text-anchor="middle" style="font-family:var(--head);font-size:30px;fill:#F4F4F8">${selSeg || "KEYS"}</text><text x="${cx}" y="${cy + 16}" text-anchor="middle" style="font-size:9px;letter-spacing:.2em;fill:rgba(244,244,248,.45)">${selSeg ? keyName(selSeg).toUpperCase() : "TAP A SEGMENT"}</text>`;
  $("#wheel").innerHTML = svg;
}
function side() {
  const item = (t) =>
    `<button data-jump="${t.slug}">${t.n} ${t.title} <em>${t.camelot} · ≈${t.bpm}</em></button>`;
  if (!selSeg) {
    const by = {};
    TRACKS.forEach((t) => (by[t.camelot] ||= []).push(t));
    $("#hmSide").innerHTML =
      `<h4>THE ARCHIVE IN <span class="grad">3 KEYS.</span></h4><p>Every track sits in <b>5B, 6A or 6B</b>: neighbours on the wheel, so almost any two tracks can be mixed or mashed up in key. Tap a segment to see what blends.</p>${Object.entries(
        by,
      )
        .sort()
        .map(
          ([c, ts]) =>
            `<div class="grp">${c} · ${keyName(c).toUpperCase()} · ${ts.length}</div><div class="tl">${ts.map(item).join("")}</div>`,
        )
        .join("")}`;
    return;
  }
  const same = TRACKS.filter((t) => t.camelot === selSeg),
    near = TRACKS.filter((t) => t.camelot !== selSeg && camCompat(selSeg, t.camelot));
  $("#hmSide").innerHTML =
    `<h4>${selSeg} <span class="grad">${keyName(selSeg)}</span></h4><p>Compatible keys are one step round the wheel, or the same number in the other ring.</p><div class="grp">IN ${selSeg} · ${same.length}</div><div class="tl">${same.map(item).join("") || '<span class="count">NONE</span>'}</div><div class="grp">COMPATIBLE · ${near.length}</div><div class="tl">${near.map(item).join("") || '<span class="count">NONE</span>'}</div>`;
}

/* ---------- G3 · gutter rain (≥1440 px only) ---------- */
let gRaf = 0,
  gStarted = false;
function startGutters() {
  if (REDUCE || gStarted) return;
  gStarted = true;
  const titles = TRACKS.map((t) => t.title + "   ");
  const blend = (u) => {
    const a = [255, 0, 229],
      m = [161, 0, 255],
      c = [0, 239, 255];
    const [p, q, k] = u < 0.5 ? [a, m, u * 2] : [m, c, (u - 0.5) * 2];
    return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * k)).join(",")})`;
  };
  const setup = () => {
    const gw = Math.max(0, Math.floor((innerWidth - 1180) / 2)),
      h = innerHeight;
    return [$("#gutL"), $("#gutR")].map((cv, side) => {
      cv.style.width = gw + "px";
      cv.width = gw;
      cv.height = h;
      const x = cv.getContext("2d");
      x.fillStyle = "#030409";
      x.fillRect(0, 0, gw, h);
      const layers = [
          { fs: 7, sp: [110, 210], a: 0.3 },
          { fs: 10, sp: [200, 380], a: 0.5 },
          { fs: 14, sp: [420, 640], a: 0.75, every: 7 },
        ],
        streams = [];
      layers.forEach((L, li) => {
        const n = Math.ceil(gw / L.fs);
        for (let c = 0; c < n; c++) {
          if (L.every && c % L.every) continue;
          streams.push({
            L,
            x: c * L.fs,
            row: (-Math.random() * h) / L.fs,
            sp: (L.sp[0] + Math.random() * (L.sp[1] - L.sp[0])) / L.fs,
            w: titles[(c * 7 + li * 3 + side * 5) % titles.length],
            col: blend(side ? 0.5 + c / n / 2 : c / n / 2),
          });
        }
      });
      return { x, gw, h, streams };
    });
  };
  let G = setup(),
    last = performance.now(),
    running = false;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    for (const g of G) {
      const { x, gw, h } = g;
      if (!gw) continue;
      x.fillStyle = "rgba(3,4,9,.1)";
      x.fillRect(0, 0, gw, h);
      x.textBaseline = "top";
      for (const s of g.streams) {
        s.row += s.sp * dt;
        const r = Math.floor(s.row);
        if (r < 0) continue;
        const y = r * s.L.fs,
          L = s.w.length;
        x.font = `${s.L.fs}px 'Space Mono', monospace`;
        x.globalAlpha = s.L.a * 0.8;
        x.fillStyle = s.col;
        x.fillText(s.w[(r - 1 + L * 50) % L], s.x, y - s.L.fs);
        x.globalAlpha = s.L.a;
        x.fillStyle = "#F4F4F8";
        x.fillText(s.w[r % L], s.x, y);
        if (y > h + 20) s.row = (-Math.random() * 240) / s.L.fs;
      }
      x.globalAlpha = 1;
    }
    gRaf = requestAnimationFrame(frame);
  };
  const go = () => {
    const want = innerWidth >= 1440 && !document.hidden;
    if (want && !running) {
      running = true;
      last = performance.now();
      gRaf = requestAnimationFrame(frame);
    }
    if (!want && running) {
      running = false;
      cancelAnimationFrame(gRaf);
    }
  };
  addEventListener("resize", () => {
    G = setup();
    go();
  });
  document.addEventListener("visibilitychange", go);
  go();
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("button, a, [data-seek], [data-seg]");
  if (!el || el.closest("#gate")) return;
  const row = el.closest(".row");
  if (el.dataset.toast) {
    e.preventDefault();
    toast(el.dataset.toast);
    return;
  }
  if (el.dataset.dl) {
    download(el.dataset.dl);
    return;
  }
  if (el.hasAttribute("data-play")) {
    const s = row.dataset.slug;
    if (cur === s && !au.paused) au.pause();
    else play(s);
    return;
  }
  if (el.hasAttribute("data-seek")) {
    const r = el.getBoundingClientRect();
    play(row.dataset.slug, (e.clientX - r.left) / r.width);
    return;
  }
  if (el.dataset.sec != null) {
    const s = secCache[cur][+el.dataset.sec];
    au.currentTime = s.start + 0.05;
    au.play();
    return;
  }
  if (el.hasAttribute("data-more")) {
    const o = row.classList.toggle("open");
    el.setAttribute("aria-expanded", o);
    el.textContent = o ? "×" : "+";
    return;
  }
  if (el.dataset.tab) {
    $$(".tabs button", row).forEach((b) => b.classList.toggle("on", b === el));
    $$(".tab", row).forEach((p) => p.classList.toggle("on", p.dataset.pane === el.dataset.tab));
    return;
  }
  if (el.dataset.ps != null) {
    fillPrompt(row, +el.dataset.ps);
    return;
  }
  if (el.dataset.lyr) {
    fillLyrics(row, el.dataset.lyr);
    return;
  }
  if (el.hasAttribute("data-kit")) {
    copy(remixKit(row), "REMIX KIT");
    return;
  }
  if (el.hasAttribute("data-copy-style")) {
    copy($("[data-style]", row).dataset.text, "STYLE PROMPT");
    return;
  }
  if (el.hasAttribute("data-copy-lyrics")) {
    copy(lyricsFor(row.dataset.slug, state[row.dataset.slug].lyr), "LYRICS");
    return;
  }
  if (el.dataset.seg) {
    selSeg = selSeg === el.dataset.seg ? null : el.dataset.seg;
    drawWheel();
    side();
    return;
  }
  if (el.dataset.jump) {
    const r = $(`.row[data-slug="${el.dataset.jump}"]`);
    if (r) {
      r.classList.add("open");
      const m = $("[data-more]", r);
      m.textContent = "×";
      m.setAttribute("aria-expanded", true);
      r.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return;
  }
  if (el.dataset.ch != null) {
    $$(".chips-scroll .gbtn").forEach((b) => b.classList.toggle("on", b === el));
    render();
    return;
  }
});
$("#q").addEventListener("input", render);
$("#sortBtn").onclick = () => {
  const b = $("#sortBtn"),
    o = ["n", "bpm", "key"],
    L = { n: "ALBUM", bpm: "BPM", key: "KEY" };
  b.dataset.sort = o[(o.indexOf(b.dataset.sort) + 1) % 3];
  b.textContent = "SORT: " + L[b.dataset.sort];
  render();
};
$("#copyMaster").onclick = () => copy(MASTER, "MASTER STYLE");
$("#exportCsv").onclick = () => {
  const rows = [
    ["#", "Title", "Chapter", "Length", "BPM (analysed)", "BPM (prompt)", "Key", "Camelot", "Key confidence"],
    ...TRACKS.map((t) => [
      t.n,
      t.title,
      t.chapter,
      t.durationText,
      t.bpmRaw,
      t.targetBpm.join("/"),
      t.key,
      t.camelot,
      `${t.keyAgree}/3`,
    ]),
  ];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }));
  a.download = "ARCHIVE_404_bpm_key.csv";
  a.click();
  toast("CSV EXPORTED");
};

function drawRuler() {
  const r = $("#ruler");
  if (!r) return;
  const n = Math.ceil(r.clientWidth / 160) + 1;
  r.innerHTML = Array.from({ length: n }, (_, i) => {
    const t = i * 15;
    return `<span style="left:${i * 160 + 4}px">${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}</span>`;
  }).join("");
}
addEventListener("resize", drawRuler);

/* ---------- unlocking: the data is locked with the access key itself ----------
   public/vault/data.enc.json is AES-256-GCM with a key derived from the access key (PBKDF2-SHA256), so the
   browser can only open it with the right key. A second derivation ("proof") lets the stems function check
   the visitor knows the key. Both are kept for this tab only (sessionStorage), and LOCK forgets them. */
const SESSION = "e404-vault";
let SIZES = {},
  STEMS_READY = false,
  CHAPTERS = [],
  PROOF = "",
  loaded = false,
  sealed = null;
const b64 = {
  to: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))),
  from: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
};
async function getSealed() {
  if (!sealed) sealed = await (await fetch("/vault/data.enc.json", { cache: "no-cache" })).json();
  return sealed;
}
async function derive(key, salt, iterations) {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key.trim().toLowerCase()),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64.from(salt), iterations },
    base,
    256,
  );
}
async function openVault(rawKey, proof) {
  const s = await getSealed();
  try {
    const k = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.from(s.iv) }, k, b64.from(s.data));
    applyData(JSON.parse(new TextDecoder().decode(plain)));
    PROOF = proof;
    return true;
  } catch {
    return false; // wrong key: the authenticated decryption fails
  }
}
async function unlockWith(key) {
  if (!key.trim()) return false;
  const s = await getSealed();
  const [raw, proof] = await Promise.all([
    derive(key, s.salt, s.iterations),
    derive(key, s.proofSalt, s.iterations),
  ]);
  const ok = await openVault(raw, b64.to(proof));
  if (ok)
    try {
      sessionStorage.setItem(SESSION, JSON.stringify({ k: b64.to(raw), p: b64.to(proof), salt: s.salt }));
    } catch {
      /* private browsing: the vault still works, it just asks again next time */
    }
  return ok;
}
async function stemsApi(body) {
  return fetch("/api/vault/stems", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ proof: PROOF, ...body }),
  });
}
async function loadSizes() {
  try {
    const r = await stemsApi({});
    if (!r.ok) return;
    const d = await r.json();
    SIZES = d.sizes || {};
    STEMS_READY = d.ready;
  } catch {
    /* offline: sizes just stay hidden */
  }
  const total = TRACKS.reduce((n, t) => n + (SIZES[t.asset] || 0), 0);
  $("#stemTotal").textContent = STEMS_READY && total ? mb(total) : "SOON";
  $("#allSize").textContent = STEMS_READY && total ? mb(total) : "SOON";
  if (STEMS_READY) render();
}
function applyData(d) {
  if (loaded) return;
  loaded = true;
  TRACKS = d.tracks;
  CHAPTERS = d.chapters;
  parsePrompts(d.prompts);
  $("#stemTotal").textContent = "SOON";
  $("#allSize").textContent = "SOON";
  $("#masterBox").textContent = MASTER;
  $("#palette").innerHTML = PSTYLES.map(
    (p) =>
      `<div class="pal" style="--c:${SW[p.name][0]}">${icon(p.name)}<b>${p.name.toUpperCase()}</b><span>${esc(p.text)}</span></div>`,
  ).join("");
  render();
  drawWheel();
  side();
  loadSizes();
}
// Unlocked earlier in this tab → straight into the vault; otherwise the gate.
(async () => {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(SESSION) || "null");
  } catch {
    saved = null;
  }
  if (saved && (await getSealed()).salt === saved.salt && (await openVault(b64.from(saved.k), saved.p)))
    reveal();
  else $("#pw").focus();
})().catch(() => $("#pw").focus());
