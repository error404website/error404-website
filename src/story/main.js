// The Build (/story/): a scrolling storybook for engineers about how ARCHIVE_404 was made,
// credited to NULLSAINT × CACHEGHOST. Opens on a thermal camera view of the Mac mini overheating,
// then one pinned visual per chapter, the AI crew, and credits that roll while the machine cools.
import "./logo-fx.css";
import "./story.css";
import { rain, REDUCE } from "../lib/rain.js";
import { CHAPTERS } from "../data/chapters.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;
const TITLES = CHAPTERS.flatMap((c) => c.tracks.map((t) => t.title));

// progress (0..1) through a tall section whose sticky child fills the screen
const through = (el) => {
  const r = el.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
};

/* ================= top bar: chapter name + reading progress ================= */
const chapterEls = $$("[data-ch]");
function topBar() {
  const h = document.documentElement.scrollHeight - innerHeight;
  $("#topBar").style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
  let name = chapterEls[0].dataset.ch;
  for (const el of chapterEls) if (el.getBoundingClientRect().top < innerHeight * 0.5) name = el.dataset.ch;
  if ($("#topCh").textContent !== name) $("#topCh").textContent = name;
}

/* ================= 00 · the overload: thermal camera ================= */
const ov = (() => {
  const sec = $("#ov"),
    cv = $("#ovHeat"),
    ctx = cv.getContext("2d"),
    FW = 160,
    FH = 100;
  const off = document.createElement("canvas");
  off.width = FW;
  off.height = FH;
  const ox = off.getContext("2d"),
    img = ox.createImageData(FW, FH);
  // the camera's colour ramp, in brand colours: cold cyan → violet → magenta → white
  const STOPS = [
    [0, [3, 4, 9]],
    [0.18, [6, 42, 64]],
    [0.36, [59, 10, 110]],
    [0.52, [161, 0, 255]],
    [0.72, [255, 0, 229]],
    [0.88, [255, 196, 242]],
    [1, [255, 255, 255]],
  ];
  const LUT = Array.from({ length: 256 }, (_, i) => {
    const t = i / 255;
    let k = 0;
    while (t > STOPS[k + 1][0]) k++;
    const [a, ca] = STOPS[k],
      [b, cb] = STOPS[k + 1],
      u = (t - a) / (b - a);
    return ca.map((v, j) => Math.round(v + (cb[j] - v) * u));
  });
  // hotspots on the slab (field units, slab centred on 80,50); each one is a job this project ran
  const SPOTS = [
    {
      x: 80,
      y: 50,
      r: 13,
      at: 0.05,
      ox: 190,
      oy: -10,
      lab: "GPU · COMFYUI SDXL",
      sub: "~1,700 PANELS · 3 MIN EACH",
    },
    {
      x: 66,
      y: 44,
      r: 9,
      at: 0.18,
      ox: -200,
      oy: -90,
      lab: "UNIFIED MEMORY",
      sub: "DEMUCS · 20 MASTERS → STEMS",
    },
    {
      x: 95,
      y: 58,
      r: 8,
      at: 0.3,
      ox: 170,
      oy: 110,
      lab: "GPU · MPS",
      sub: "STABLE-TS + WAV2VEC2 · 8,711 WORDS",
    },
    { x: 92, y: 40, r: 7, at: 0.42, ox: 150, oy: -130, lab: "SSD", sub: "ABLETON LIVE 12 · 2.4 GB SET" },
    {
      x: 68,
      y: 60,
      r: 7,
      at: 0.54,
      ox: -190,
      oy: 100,
      lab: "CPU CORES",
      sub: "MADMOM + RUBBER BAND · PER BEAT",
    },
  ];
  $("#ovTags").innerHTML = SPOTS.map(
    (s) =>
      `<div class="ov-tag"><span class="box"></span><span class="tx">${s.lab}<em>${s.sub}</em></span></div>`,
  ).join("");
  const tags = $$(".ov-tag");
  let P = 0,
    raf = 0,
    rainFx = null,
    scale = 1;
  const size = () => {
    cv.width = cv.clientWidth;
    cv.height = cv.clientHeight;
    const W = cv.width,
      H = cv.height,
      s = Math.min(Math.max(W / FW, H / FH), W / 56),
      k = Math.min(1, W / 900),
      phone = W < 640;
    scale = s;
    SPOTS.forEach((sp, i) => {
      const t = tags[i];
      t.classList.toggle("list", phone);
      if (phone) {
        // phones: no room for callouts, so the newest job shows under the headline
        t.style.left = "24px";
        t.style.top = $(".ov-lead").getBoundingClientRect().bottom + 16 + "px";
        return;
      }
      const dx = sp.ox * k,
        dy = sp.oy * k;
      t.classList.toggle("lft", dx < 0);
      t.style.setProperty("--len", Math.hypot(dx, dy) + "px");
      t.style.setProperty("--ang", Math.atan2(dy, dx) + "rad");
      t.style.setProperty("--dx", dx + "px");
      t.style.setProperty("--dxr", -dx + "px");
      t.style.setProperty("--dy", dy - 14 + "px");
      t.style.left = W / 2 + (sp.x - 80) * s + "px";
      t.style.top = H / 2 + (sp.y - 50) * s + "px";
    });
  };
  function draw(now) {
    raf = 0;
    const t = now / 1000,
      load = seg(P, 0.04, 0.72),
      burn = seg(P, 0.66, 0.8),
      d = img.data;
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        // the slab: a rounded square, warmer than the desk
        const dx = Math.abs(x - 80),
          dy = Math.abs(y - 50),
          body = Math.max(0, 1 - Math.max(0, Math.hypot(Math.max(dx - 18, 0), Math.max(dy - 18, 0)) - 6) / 4);
        let v = 0.06 + body * (0.2 + load * 0.12) + Math.sin(x * 0.3 + t) * 0.004;
        for (const s of SPOTS) {
          const on = seg(load, s.at, s.at + 0.2);
          if (!on) continue;
          const k = Math.exp(-((x - s.x) ** 2 + (y - s.y) ** 2) / (2 * (s.r * (0.8 + load * 0.3)) ** 2));
          v += k * on * (0.26 + 0.05 * Math.sin(t * 3 + s.x));
        }
        // the plume rising off the back vent
        v +=
          load *
          0.25 *
          Math.exp(-((x - 80 - Math.sin(y * 0.2 + t * 2) * 4) ** 2) / 120) *
          Math.max(0, (30 - y) / 30);
        v = Math.min(1, v + burn * 1.2);
        const c = LUT[Math.round(v * 255)],
          o = (y * FW + x) * 4;
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
        d[o + 3] = 255;
      }
    ox.putImageData(img, 0, 0);
    const W = cv.width,
      H = cv.height;
    ctx.fillStyle = `rgb(${LUT[15].join(",")})`;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(off, (W - FW * scale) / 2, (H - FH * scale) / 2, FW * scale, FH * scale);
    // keep the camera "live" while it's on screen and before the burn-out
    if (P < 0.86 && sec.getBoundingClientRect().bottom > 0) raf = requestAnimationFrame(draw);
  }
  size();
  addEventListener("resize", size);
  const LEADS = [
    ["EVERY JOB LEAVES <span class='grad'>HEAT.</span>", "ONE MACHINE · TWENTY SONGS · FOUR BOOKS"],
    [
      "AI ISN'T FREE. <span class='grad'>IT'S HOT.</span>",
      "STEMS · LYRICS · BEATS · PANELS · ALL ON ONE MAC",
    ],
    ["CRITICAL.", "THERMAL LIMIT REACHED"],
  ];
  const WARM = 0.3195;
  return function update() {
    // the camera opens already warm (three jobs running, ~65°); scrolling heats it from there
    const raw = through(sec),
      p = WARM + raw * (1 - WARM);
    P = p;
    if (!raf && p < 0.86) raf = requestAnimationFrame(draw);
    const load = seg(p, 0.04, 0.72);
    $("#ovHint").style.opacity = raw < 0.03 ? 1 : 0;
    const phone = cv.width < 640,
      newest = SPOTS.reduce((n, s, i) => (load > s.at + 0.06 ? i : n), -1);
    SPOTS.forEach(
      (s, i) => (tags[i].style.opacity = p < 0.72 && (phone ? i === newest : load > s.at + 0.06) ? 1 : 0),
    );
    $("#ovMax").textContent = lerp(34.2, 108.4, load).toFixed(1) + "°";
    $(".ov-read").classList.toggle("hot", load > 0.85);
    const lead = LEADS[load < 0.4 ? 0 : load < 0.85 ? 1 : 2];
    if ($("#ovT").innerHTML !== lead[0]) {
      $("#ovT").innerHTML = lead[0];
      $("#ovL").textContent = lead[1];
      if (cv.width < 640) size(); // the job line sits under the headline
    }
    $("#ovFlash").style.opacity = REDUCE ? 0 : seg(p, 0.76, 0.8) - seg(p, 0.82, 0.88);
    const gone = p > 0.82 ? 0 : 1;
    for (const q of [".ov-heat", ".ov-scan", ".ov-cross", ".ov-read", ".ov-lead", ".ov-scale", ".ov-tags"])
      $(q).style.opacity = gone;
    const b = seg(p, 0.86, 0.96);
    $("#ovBoot").style.opacity = b;
    $("#ovBoot").style.transform = `scale(${lerp(1.06, 1, b)})`;
    const showRain = p > 0.82 && sec.getBoundingClientRect().bottom > 0 && !REDUCE;
    if (showRain && !rainFx) {
      rainFx = rain($("#ovRain"), TITLES);
      $("#ovRain").classList.add("on");
    } else if (!showRain && rainFx) {
      rainFx.stop();
      rainFx = null;
      $("#ovRain").classList.remove("on");
    }
  };
})();

/* ================= lede stats (count up once on view) ================= */
const STATS = [
  ["20", "SONGS · 4 CHAPTERS"],
  ["72:04", "LIVE SET"],
  ["19", "ENGINEERED SEAMS"],
  ["8,711", "WORDS TIMED"],
  ["77", "PULL REQUESTS MERGED"],
  ["180", "COMMITS ON MAIN"],
  ["4 × 88", "COMIC PAGES SCRIPTED"],
  ["16 GB", "ONE MAC MINI"],
];
$("#stats").innerHTML = STATS.map(
  ([v, l], i) =>
    `<div class="stat"><b class="${i % 3 === 1 ? "grad" : ""}" data-v="${v}">${v}</b><span class="lab">${l}</span></div>`,
).join("");
new IntersectionObserver(
  (es, o) => {
    if (!es.some((e) => e.isIntersecting) || REDUCE) return;
    o.disconnect();
    for (const b of $$("#stats b")) {
      const v = b.dataset.v,
        m = /^[\d,]+$/.test(v) ? +v.replace(/,/g, "") : null;
      if (m == null) continue;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 1400),
          e = 1 - (1 - k) ** 3;
        b.textContent = Math.round(m * e).toLocaleString("en-GB");
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  },
  { threshold: 0.4 },
).observe($("#stats"));

/* ================= the book: steps switch the pinned visual ================= */
const steps = $$(".step"),
  visEls = $$(".vis");
let current = "";
const onVis = {};
function setVis(name) {
  if (name === current) return;
  const prev = current;
  current = name;
  visEls.forEach((v) => v.classList.toggle("on", v.dataset.vis === name));
  steps.forEach((s) => s.classList.toggle("on", s.dataset.vis === name));
  onVis[prev]?.(false);
  onVis[name]?.(true);
}
function pickStep() {
  let best = null,
    bd = Infinity;
  for (const s of steps) {
    const r = s.getBoundingClientRect(),
      d = Math.abs(r.top + Math.min(r.height, innerHeight) / 2 - innerHeight * 0.5);
    if (r.bottom > 0 && r.top < innerHeight && d < bd) {
      bd = d;
      best = s;
    }
  }
  const book = $("#book").getBoundingClientRect();
  if (book.bottom < 0 || book.top > innerHeight) return;
  if (best) setVis(best.dataset.vis);
}

/* ---- SITE: the PR film strip (real merged PRs) ---- */
const PRS = [
  [87, "Live show: Ableton standby and take-over"],
  [83, "Live show tools 4/4 · the room: crowd prompts, stage visuals, show capture"],
  [82, "Live show tools 3/4 · playing it: moves, KeyLab setup, phone remote"],
  [81, "Live show tools 2/4 · your voice: auto-duck, mic FX, in-ear mix"],
  [80, "Live show tools 1/4 · the show: sets, show clock, hot cues, safety"],
  [78, "Live show: tighter lyrics sync"],
  [69, "Live show: waveform with sections, page name, favicon, share image"],
  [67, "Live show: gated /live/ performance page"],
  [64, "Audio: clean MP3 tags (no Suno links / C2PA)"],
  [57, "Source Vault: real stems (one WAV + MIDI zip per track)"],
  [51, "Source Vault: password-only (one Netlify setting for stems)"],
  [50, "Source Vault: password-gated stems, prompts, lyrics and analysis"],
  [47, "Keep the site out of search engines, AI and archives"],
  [42, "v1.2.0: final remastered audio"],
  [40, "Production readiness: page weight, fonts, images, accessibility"],
  [35, "Intro: matrix rain of the tracklist"],
  [23, "Intro + hero: Signal Overload"],
  [18, "Fix: holo foil button leaking across the page in Safari"],
  [17, "Button: holo foil BOOKING · DOWNLOAD"],
  [11, "Security: upgrade Vite (fixes 4 Dependabot alerts)"],
];
const prRow = ([n, t]) =>
  `<div class="pr"><span class="no">#${n}</span><span>${t}</span><span class="st">MERGED</span></div>`;
$("#prs").innerHTML = PRS.map(prRow).join("") + PRS.map(prRow).join("");

/* ---- SEAMS: twin waveforms, one AudioContext, A/B keeps its place ---- */
const seam = (() => {
  const S = { ctx: null, an: null, buf: {}, mode: "eng", src: null, t0: 0, off: 0, playing: false, DUR: 24 };
  const FILES = { raw: "/story/raw_05-06.m4a", eng: "/story/seam_05-06.mp3" };
  let loading = null;
  const load = () =>
    (loading ||= (async () => {
      const AC = window.AudioContext || window.webkitAudioContext;
      S.ctx = new AC();
      await Promise.all(
        Object.entries(FILES).map(async ([k, u]) => {
          const b = await (await fetch(u)).arrayBuffer();
          S.buf[k] = await new Promise((res, rej) => S.ctx.decodeAudioData(b, res, rej));
        }),
      );
      drawWaves();
    })());
  const pos = () => (S.playing ? Math.min(S.DUR, S.ctx.currentTime - S.t0 + S.off) : S.off);
  function start(at) {
    halt();
    S.off = Math.max(0, Math.min(S.DUR - 0.05, at));
    const s = S.ctx.createBufferSource();
    s.buffer = S.buf[S.mode];
    s.connect(S.ctx.destination);
    s.start(0, S.off);
    S.src = s;
    S.t0 = S.ctx.currentTime;
    S.playing = true;
    s.onended = () => {
      if (S.src !== s) return;
      S.src = null;
      S.playing = false;
      S.off = 0;
      ui();
    };
    loop();
  }
  function halt() {
    if (!S.src) return;
    const s = S.src;
    S.src = null;
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  }
  function pause() {
    if (!S.playing) return;
    S.off = pos();
    halt();
    S.playing = false;
    ui();
  }
  function ui() {
    $("#seamPlay").textContent = S.playing ? "❚❚ PAUSE" : "▶ PLAY";
    $$("#seam .ab").forEach((b) => b.classList.toggle("on", b.dataset.k === S.mode));
    $$("#seam .wv").forEach((w) => w.classList.toggle("dim", w.dataset.k !== S.mode));
    paint();
  }
  function paint() {
    const p = S.ctx ? pos() : 0;
    $("#seamT").textContent = `0:${String(Math.floor(p)).padStart(2, "0")} / 0:24`;
    $$("#seam .ph").forEach((ph) => (ph.style.left = (p / S.DUR) * 100 + "%"));
  }
  function loop() {
    paint();
    if (S.playing) requestAnimationFrame(loop);
  }
  function drawWaves() {
    for (const w of $$("#seam .wv")) {
      const cv = $("canvas", w),
        b = S.buf[w.dataset.k];
      if (!b || !cv.clientWidth) continue;
      const W = (cv.width = cv.clientWidth * 2),
        H = (cv.height = cv.clientHeight * 2),
        x = cv.getContext("2d"),
        d = b.getChannelData(0),
        n = Math.floor(W / 3),
        step = Math.floor(d.length / n);
      const g = x.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, "#ff00e5");
      g.addColorStop(1, "#00efff");
      x.fillStyle = g;
      for (let i = 0; i < n; i++) {
        let pk = 0;
        for (let j = i * step; j < (i + 1) * step; j += 16) pk = Math.max(pk, Math.abs(d[j]));
        const h = Math.max(2, pk * H * 0.9);
        x.fillRect(i * 3, (H - h) / 2, 2, h);
      }
    }
  }
  $("#seamPlay").onclick = async () => {
    await load();
    await S.ctx.resume();
    if (S.playing) pause();
    else start(S.off >= S.DUR - 0.1 ? 0 : S.off);
    ui();
  };
  $$("#seam .ab").forEach(
    (b) =>
      (b.onclick = async () => {
        await load();
        S.mode = b.dataset.k;
        if (S.playing) start(pos());
        ui();
      }),
  );
  $$("#seam .wv").forEach(
    (w) =>
      (w.onclick = async (e) => {
        await load();
        await S.ctx.resume();
        const r = w.getBoundingClientRect();
        S.mode = w.dataset.k;
        start(((e.clientX - r.left) / r.width) * S.DUR);
        ui();
      }),
  );
  addEventListener("resize", () => S.buf.raw && drawWaves());
  return {
    show(on) {
      if (on) load().then(drawWaves);
      else pause();
    },
  };
})();
onVis.seam = seam.show;

/* ---- LIVE: one line of LEFT_BEHIND with its real refined word timings ---- */
(() => {
  const LINE = { s: 2.33, e: 6.717 };
  const WORDS = [
    ["Class", 2.33, 2.721],
    ["of", 2.721, 2.8],
    ["08...", 3.951, 4.566],
    ["they", 4.566, 4.68],
    ["said", 4.731, 4.911],
    ["the", 4.956, 5.032],
    ["world", 5.186, 5.62],
    ["was", 5.62, 6.1],
    ["ours", 6.241, 6.717],
  ];
  const span = LINE.e - LINE.s + 1.2;
  const line = $("#syncLine"),
    lane = $("#syncLane"),
    ph = $("#syncPh");
  line.innerHTML = WORDS.map(([w]) => `<span>${w}</span>`).join(" ");
  const pct = (t) => ((t - LINE.s + 0.3) / span) * 100;
  lane.insertAdjacentHTML(
    "afterbegin",
    WORDS.map(([, s, e]) => `<i style="left:${pct(s)}%;width:${pct(e) - pct(s)}%"></i>`).join(""),
  );
  const ws = $$("span", line),
    bars = $$("i", lane);
  let on = false,
    t0 = 0;
  const tick = (now) => {
    if (!on) return;
    const t = LINE.s - 0.3 + (((now - t0) / 1000) % (span + 0.6));
    ph.style.left = Math.min(100, pct(t)) + "%";
    WORDS.forEach(([, s], i) => {
      ws[i].classList.toggle("on", t >= s);
      bars[i].classList.toggle("on", t >= s);
    });
    requestAnimationFrame(tick);
  };
  onVis.live = (v) => {
    on = v && !REDUCE;
    if (REDUCE && v) ws.forEach((w) => w.classList.add("on"));
    if (on) {
      t0 = performance.now();
      requestAnimationFrame(tick);
    }
  };
})();

/* ---- ABLETON: position feed packets, and the browser taking over ---- */
(() => {
  const feed = $("#feed"),
    b = $("#feedB"),
    st = $("#feedS"),
    kill = $("#feedKill");
  let timer = 0,
    i = 0,
    dead = false;
  const send = () => {
    const k = document.createElement("span");
    k.className = "pk";
    k.textContent = "CC" + (110 + (i++ % 6));
    feed.appendChild(k);
    const a = k.animate(
      [
        { left: "132px", opacity: 0 },
        { opacity: 1, offset: 0.1 },
        { left: "calc(100% - 180px)", opacity: 1, offset: 0.9 },
        { left: "calc(100% - 170px)", opacity: 0 },
      ],
      { duration: 1400, easing: "linear" },
    );
    a.onfinish = () => k.remove();
  };
  const run = (v) => {
    clearInterval(timer);
    timer = 0;
    if (v && !dead && !REDUCE) timer = setInterval(send, 150); // ≈ one CC per 25 ms tick, slowed down to be seen
  };
  kill.onclick = () => {
    dead = !dead;
    run(current === "feed");
    b.classList.remove("dead", "live");
    if (dead) {
      kill.textContent = "RESTART ABLETON";
      b.classList.add("dead");
      st.textContent = "FEED LOST";
      setTimeout(() => {
        if (!dead) return;
        b.classList.remove("dead");
        b.classList.add("live");
        st.textContent = "TAKEN OVER · SAME BAR";
      }, 1100);
    } else {
      kill.textContent = "KILL ABLETON";
      st.textContent = "STANDBY";
    }
  };
  onVis.feed = run;
})();

/* ================= the crew (A4) ================= */
const CREW = [
  [
    "SUNO",
    "TAKES",
    "Rendered every take from the three-layer style spec.",
    "Drifts in tempo, and its stems are a different render from the masters (±1.5 s), so they're never used for timing.",
    "20 SONGS",
  ],
  [
    "DEMUCS",
    "STEMS",
    "Separated the vocal from every master; the instrumental is master minus vocal.",
    "",
    "40 FILES",
  ],
  [
    "STABLE-TS",
    "LYRIC TIMING",
    "First pass of word timings on the separated vocals, on the Mac's GPU.",
    "",
    "899 LINES",
  ],
  [
    "WAV2VEC2",
    "SECOND OPINION",
    "Votes on each word within 150 ms of stable-ts.",
    "On its own it pulled lines 200–800 ms early onto breaths and ad-libs.",
    "8,711 WORDS",
  ],
  ["MADMOM", "BEATS", "Beat and downbeat tracking, so every seam lands on a bar.", "", "19 SEAMS"],
  [
    "RUBBER BAND",
    "TIME",
    "Stretched the DJ mix between beat pins as Suno drifted.",
    "Its keyframe map can't be passed from Python, so it ran in real-time mode with a ratio per beat.",
    "PER BEAT",
  ],
  [
    "ESSENTIA.JS",
    "ANALYSIS",
    "Measured BPM and key in the browser with three key profiles.",
    "",
    "20 TRACKS",
  ],
  [
    "SDXL",
    "PANELS",
    "Ink-noir comic panels, text-free, on a 16 GB Mac.",
    "Artist names in the style prompt came out as text on posters.",
    "3 MIN / PANEL",
  ],
  [
    "IP-ADAPTER",
    "FACE LOCK",
    "Keeps the Subject's face the same across a book.",
    "At full strength from step 0 it turned every scene into a close-up.",
    "0.7 FROM 20%",
  ],
  [
    "CONTROLNET",
    "COMPOSITION",
    "Traces each storyboard's framing into a guide for the render.",
    "",
    "GUIDE 0.6",
  ],
  [
    "CLAUDE CODE",
    "ENGINEERING",
    "Wrote, tested and opened the pull requests; every merge was reviewed.",
    "Shipped a holo button that leaked across the page in Safari (#17); root-caused and fixed in #18.",
    "77 MERGED",
  ],
];
$("#crewTrack").innerHTML = CREW.map(
  ([n, r, p, f, s]) =>
    `<article class="cc"><span class="role">${r}</span><b>${n}</b><p>${p}</p>${f ? `<p class="fail">${f}</p>` : ""}<span class="st grad">${s}</span></article>`,
).join("");

/* ================= closing: credits roll while the machine cools ================= */
const end = (() => {
  const sec = $("#end"),
    cr = $("#credits"),
    fin = $("#endFinal");
  let fx = null;
  return function update() {
    const r = sec.getBoundingClientRect(),
      inView = r.top < innerHeight && r.bottom > 0;
    if (inView && !fx && !REDUCE) fx = rain($("#endRain"), TITLES);
    if (!inView && fx) {
      fx.stop();
      fx = null;
    }
    const p = through(sec),
      roll = seg(p, 0.02, 0.74),
      cool = seg(p, 0, 0.8);
    cr.style.transform = `translateY(${-roll * (cr.offsetHeight + innerHeight)}px)`;
    $("#endTemp").textContent = Math.round(lerp(108, 41, 1 - (1 - cool) ** 2)) + "°";
    $("#endJobs").textContent = cool < 1 ? "ALL JOBS COMPLETE · FANS SPINNING DOWN" : "IDLE · 41°C";
    fx?.speed(lerp(1, 0.25, cool));
    $("#endRain").style.opacity = lerp(1, 0.35, cool);
    const f = seg(p, 0.78, 0.9);
    fin.style.opacity = f;
    fin.classList.toggle("on", f > 0.5);
    $(".end-temp").style.opacity = 1 - f;
  };
})();

/* ================= scroll loop ================= */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    topBar();
    ov();
    pickStep();
    end();
  });
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
onScroll();
