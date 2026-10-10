// The Build (/story/): a scrolling storybook for engineers about how ARCHIVE_404 was made,
// credited to NULLSAINT × CACHEGHOST. Opens on a thermal camera view of the Mac mini overheating,
// then a title card + full-bleed body per chapter (each visual flips to its real source code), the AI crew,
// and credits that roll while the machine cools. Optional score (SOUND ON), a vitals HUD carried over from
// the opening, and a 60-second case file that prints as a one-page PDF.
import "./site-chrome.css";
import "./logo-fx.css";
import "./story.css";
import { rain, REDUCE } from "../lib/rain.js";
import { CHAPTERS } from "../data/chapters.js";
import { SOURCES, highlight } from "./sources.js";
import { mountDock } from "./dock.jsx";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const seg = (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TITLES = CHAPTERS.flatMap((c) => c.tracks.map((t) => t.title));

// progress (0..1) through a tall section whose sticky child fills the screen
const through = (el) => {
  const r = el.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
};

/* ================= the site's menu bar + slat menu (the vault's behaviour) + L1 chapter ruler ================= */
const navH = () => parseInt(getComputedStyle(document.documentElement).getPropertyValue("--navh")) || 80;
const menu = (() => {
  const burger = $("#burger"),
    m = $("#vmenu");
  const set = (o) => {
    m.classList.toggle("is-open", o);
    m.setAttribute("aria-hidden", !o);
    m.inert = !o;
    burger.setAttribute("aria-expanded", o);
    burger.classList.toggle("is-open", o);
    burger.setAttribute("aria-label", o ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", o);
  };
  burger.onclick = () => set(!m.classList.contains("is-open"));
  addEventListener("keydown", (e) => e.key === "Escape" && m.classList.contains("is-open") && set(false));
  return { set };
})();
// every chapter link lands its section just under the bar + ruler
for (const a of $$("[data-nav]"))
  a.addEventListener("click", (e) => {
    e.preventDefault();
    menu.set(false);
    const t = document.getElementById(a.dataset.nav);
    if (!t) return;
    const y = t.id === "ov" ? 0 : t.getBoundingClientRect().top + scrollY - navH() - 22;
    scrollTo({ top: y, behavior: REDUCE ? "auto" : "smooth" });
  });
// the ruler's marks sit where each chapter really starts on the page
const marks = $$("#ruler .mk"),
  spyIds = marks.map((m) => m.dataset.for);
function placeMarks() {
  const H = document.documentElement.scrollHeight - innerHeight;
  for (const m of marks) {
    const t = document.getElementById(m.dataset.for),
      y = t.id === "ov" ? 0 : t.getBoundingClientRect().top + scrollY - navH() - 22;
    m.style.left = Math.min(0.985, Math.max(0, y / H)) * 100 + "%";
  }
}
addEventListener("resize", placeMarks);
addEventListener("load", placeMarks);
let spied = "";
function topBar() {
  const H = document.documentElement.scrollHeight - innerHeight;
  $("#ruler").style.setProperty("--p", H > 0 ? Math.min(1, scrollY / H) : 0);
  // scroll spy: the last chapter whose top has passed under the bar
  let cur = "ov";
  for (const id of spyIds)
    if (document.getElementById(id).getBoundingClientRect().top < navH() + 120) cur = id;
  if (cur === spied) return;
  spied = cur;
  for (const a of $$("[data-nav]")) {
    const on = a.dataset.nav === cur,
      desk = a.classList.contains("e8-link");
    a.classList.toggle("active", on && desk);
    a.classList.toggle("on", on && !desk);
    on && desk ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current");
  }
  marks.forEach((m) => m.classList.toggle("on", m.dataset.for === cur));
}

/* ================= 00 · the overload: thermal camera ================= */
const ov = (() => {
  const sec = $("#ov"),
    stage = $(".ov-stage", sec),
    // phones, and short screens (landscape phones) where the dock leaves too little height for callouts
    compact = () => cv.width < 640 || cv.height < 420,
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
  $("#ovTags").innerHTML =
    SPOTS.map(
      (s) =>
        `<div class="ov-tag"><span class="box"></span><span class="tx">${s.lab}<em>${s.sub}</em></span></div>`,
    ).join("") +
    `<div class="ov-tag etch"><span class="box"></span><span class="tx">ETCH · BARE ALUMINIUM<em id="ovEtch"></em></span></div>`;
  const tags = $$(".ov-tag"),
    etchTag = tags[SPOTS.length];
  // the field as a continuous function, so the etch patch can sample it finer than the 160×100 grid
  const heat = (x, y, t, load) => {
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
    return (
      v +
      load *
        0.25 *
        Math.exp(-((x - 80 - Math.sin(y * 0.2 + t * 2) * 4) ** 2) / 120) *
        Math.max(0, (30 - y) / 30)
    );
  };
  // the skull etched into the lid, where the Apple logo sits on a real one. Bare polished aluminium gives off
  // less heat than the anodised lid, so the camera reads the etch cooler, and more so the hotter the lid gets.
  const ES = 30, // etch size in field units
    EN = 300, // etch patch resolution
    EMASK = new Float32Array(EN * EN),
    epatch = document.createElement("canvas");
  epatch.width = epatch.height = EN;
  const ex = epatch.getContext("2d"),
    eimg = ex.createImageData(EN, EN);
  let etchReady = false;
  const skull = new Image();
  skull.onload = () => {
    const c = document.createElement("canvas");
    c.width = c.height = EN;
    const x = c.getContext("2d");
    x.drawImage(skull, 0, 0, EN, EN);
    const d = x.getImageData(0, 0, EN, EN).data,
      a = x.createImageData(EN, EN);
    for (let i = 0; i < EN * EN; i++) {
      const u = clamp((Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) / 255 - 0.16) / 0.34, 0, 1);
      EMASK[i] = u * u * (3 - 2 * u);
      a.data[i * 4 + 3] = Math.round(EMASK[i] * 255);
    }
    // an alpha copy for the afterimage on the flash (Safari's luminance masks aren't reliable)
    x.putImageData(a, 0, 0);
    $("#ovGhost").style.setProperty("--sk", `url(${c.toDataURL()})`);
    etchReady = true;
    if (!raf && P < 0.86) raf = requestAnimationFrame(draw);
  };
  skull.src = "/story/skull-etch.jpg";
  const etchCool = (v) => -0.46 * Math.max(0, v - 0.06);
  let P = 0,
    raf = 0,
    rainFx = null,
    scale = 1;
  const size = () => {
    // phone toolbars sliding in and out fire resize; resetting the canvas would blank it, so only do it
    // when its box really changed (the stage is 100lvh, so that's rotation or a desktop resize)
    if (cv.width !== cv.clientWidth || cv.height !== cv.clientHeight) {
      cv.width = cv.clientWidth;
      cv.height = cv.clientHeight;
    }
    const W = cv.width,
      H = cv.height,
      s = Math.min(Math.max(W / FW, H / FH), W / 56),
      k = Math.min(1, W / 900),
      phone = compact();
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
    // the etch callout: a dashed box round the skull, its label straight down under the lid
    const dx = -60 * k,
      dy = (ES / 2 + 4) * s + 40 * k + 24;
    etchTag.classList.add("lft");
    etchTag.style.setProperty("--bw", ES * s + 8 + "px");
    etchTag.style.setProperty("--len", Math.hypot(dx, dy) + "px");
    etchTag.style.setProperty("--ang", Math.atan2(dy, dx) + "rad");
    etchTag.style.setProperty("--dxr", -dx + "px");
    etchTag.style.setProperty("--dy", dy - 14 + "px");
    etchTag.style.left = W / 2 + "px";
    etchTag.style.top = H / 2 + "px";
    $("#ovGhost").style.width = $("#ovGhost").style.height = ES * s * 1.04 + "px";
  };
  function draw(now) {
    raf = 0;
    const t = now / 1000,
      load = seg(P, 0.04, 0.72),
      burn = seg(P, 0.66, 0.8),
      d = img.data;
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        const v = Math.min(1, heat(x, y, t, load) + burn * 1.2),
          c = LUT[Math.round(v * 255)],
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
    if (etchReady) {
      // sample the lid at patch resolution (the grid draws field pixel i centred on i + 0.5), then cool the
      // etch; through the burn-out it stays dark, so it's still there when the flash hits
      const e = eimg.data;
      for (let j = 0; j < EN; j++)
        for (let i = 0; i < EN; i++) {
          const n = j * EN + i,
            m = EMASK[n],
            o = n * 4;
          if (m < 0.004) {
            e[o + 3] = 0;
            continue;
          }
          const v = heat(
              80 - ES / 2 + ((i + 0.5) / EN) * ES - 0.5,
              50 - ES / 2 + ((j + 0.5) / EN) * ES - 0.5,
              t,
              load,
            ),
            dv = m * etchCool(v),
            w = clamp(Math.min(1, v + dv + burn * 1.2) - m * burn * 0.7, 0, 1),
            c = LUT[Math.round(w * 255)];
          e[o] = c[0];
          e[o + 1] = c[1];
          e[o + 2] = c[2];
          e[o + 3] = Math.round(255 * Math.min(1, Math.abs(dv) * 60 + m * burn * 3));
        }
      ex.putImageData(eimg, 0, 0);
      ctx.drawImage(
        epatch,
        (W - ES * scale) / 2 + 0.5 * scale,
        (H - ES * scale) / 2 + 0.5 * scale,
        ES * scale,
        ES * scale,
      );
    }
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
    // measured against the stage, not innerHeight, which changes as phone toolbars come and go
    const r = sec.getBoundingClientRect(),
      raw = Math.min(1, Math.max(0, -r.top / (r.height - stage.offsetHeight))),
      p = WARM + raw * (1 - WARM);
    P = p;
    if (!raf && p < 0.86) raf = requestAnimationFrame(draw);
    const load = seg(p, 0.04, 0.72);
    $("#ovHint").style.opacity = raw < 0.03 ? 1 : 0;
    const phone = compact(),
      newest = SPOTS.reduce((n, s, i) => (load > s.at + 0.06 ? i : n), -1);
    SPOTS.forEach(
      (s, i) => (tags[i].style.opacity = p < 0.72 && (phone ? i === newest : load > s.at + 0.06) ? 1 : 0),
    );
    const dl = etchCool(heat(80, 50, 0, load)) * 80; // the camera's scale spans 80°
    etchTag.style.opacity = p < 0.72 && !phone ? 1 : 0;
    $("#ovEtch").textContent = `SKULL · Δ −${Math.abs(dl).toFixed(1)}° VS LID`;
    $("#ovMax").textContent = lerp(34.2, 108.4, load).toFixed(1) + "°";
    $(".ov-read").classList.toggle("hot", load > 0.85);
    const lead = LEADS[load < 0.4 ? 0 : load < 0.85 ? 1 : 2];
    if ($("#ovT").innerHTML !== lead[0]) {
      $("#ovT").innerHTML = lead[0];
      $("#ovL").textContent = lead[1];
      if (compact()) size(); // the job line sits under the headline
    }
    $("#ovFlash").style.opacity = REDUCE ? 0 : seg(p, 0.76, 0.8) - seg(p, 0.82, 0.88);
    // the skull stays burnt into the white for a beat, like sensor burn-in
    $("#ovGhost").style.opacity = REDUCE ? 0 : seg(p, 0.77, 0.8) * (1 - seg(p, 0.84, 0.93)) * 0.85;
    const gone = p > 0.82 ? 0 : 1;
    for (const q of [".ov-heat", ".ov-scan", ".ov-read", ".ov-lead", ".ov-scale", ".ov-tags"])
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

/* ================= the site's player dock ================= */
mountDock($("#dock"));
// the menu bar's and the menu's SOUND buttons play and pause the dock, and say whether it's playing
for (const b of $$("[data-snd]")) b.addEventListener("click", () => $(".e-dock .e-playbtn")?.click());
let dockOn = null;
new MutationObserver(() => {
  const on = !!$(".e-dock")?.classList.contains("playing");
  if (on === dockOn) return;
  dockOn = on;
  $$("[data-snd]").forEach((b) => (b.textContent = on ? "♪ SOUND: ON" : "♪ SOUND"));
}).observe($("#dock"), { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });

/* ================= the book: one section per chapter ================= */
const chaps = $$(".chap");
const onVis = {}; // per-chapter visual hooks: called with true when its body scrolls in, false when it leaves
const live = new Set();
let bookRain = null;
// each chapter's runway is one stretch of scroll per line of dialogue; dots show where you are
for (const c of chaps) {
  const lines = $$(".talk p", c);
  $(".chap-body", c).style.setProperty("--lines", lines.length);
  $(".talk", c).insertAdjacentHTML(
    "afterend",
    `<div class="talk-dots" aria-hidden="true">${lines.map(() => "<i></i>").join("")}</div>`,
  );
}
// subtitles show one line at a time in a box that fits it; the step keeps room for the tallest line
// (above the chapter label) so the visual above doesn't resize from line to line
const SUBS = matchMedia("(max-width: 900px) and (orientation: portrait), (max-height: 760px)");
function fitTalk(c) {
  const step = $(".step", c),
    talk = $(".talk", c);
  step.style.minHeight = "";
  if (!SUBS.matches) return;
  const tallest = Math.max(...$$(".talk p", c).map((p) => p.offsetHeight)),
    slide = step.parentElement,
    cs = getComputedStyle(slide),
    room = slide.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  // never more than the slide has (landscape phones, where the dock takes a big share of the height)
  step.style.minHeight = Math.min(room, step.offsetHeight - talk.offsetHeight + tallest) + "px";
}
// every visual is scaled to fit the room its slide gives it, on any screen
function fitVisuals(c) {
  fitTalk(c);
  for (const face of $$(".face.front", c)) {
    const el = face.firstElementChild;
    if (!el) continue;
    el.style.transform = "";
    const k = Math.min(1, face.clientWidth / el.offsetWidth, face.clientHeight / el.offsetHeight);
    el.style.transform = k < 0.999 ? `scale(${k.toFixed(3)})` : "";
  }
}
addEventListener("resize", () => chaps.forEach(fitVisuals));
document.fonts?.ready.then(() => chaps.forEach(fitVisuals));
const topH = () => navH() + 22;
function book() {
  const H = innerHeight;
  for (const c of chaps) {
    const body = $(".chap-body", c),
      r = body.getBoundingClientRect(),
      inView = r.top < H * 0.75 && r.bottom > H * 0.25,
      name = c.dataset.chap;
    if (inView !== live.has(name)) {
      if (inView) live.add(name);
      else live.delete(name);
      c.classList.toggle("on", inView);
      if (inView) fitVisuals(c);
      onVis[name]?.(inView);
    }
    if (r.top < H && r.bottom > 0) {
      // progress through the pinned slide: 0 when it locks under the bar, 1 when it lets go (measured
      // against the slide, which ends above the dock and doesn't change as phone toolbars come and go)
      const run = r.height - $(".slide", c).offsetHeight,
        p = Math.min(1, Math.max(0, (topH() - r.top) / run));
      c.style.setProperty("--fill", (p * 100).toFixed(1) + "%");
      c.style.setProperty("--ry", lerp(-16, -3, p).toFixed(2) + "deg");
      c.style.setProperty("--rx", lerp(7, 2, p).toFixed(2) + "deg");
      // the dialogue plays in place: one line per stretch, the first one there as soon as the slide locks
      const lines = $$(".talk p", c),
        k = Math.min(lines.length - 1, Math.floor(p * lines.length * 1.08));
      lines.forEach((l, i) => {
        l.classList.toggle("past", i < k);
        l.classList.toggle("now", i === k);
      });
      $$(".talk-dots i", c).forEach((d, i) => d.classList.toggle("on", i <= k));
    }
  }
  // the rain behind the chapters runs only while the book is on screen
  const b = $("#book").getBoundingClientRect(),
    show = b.top < H && b.bottom > 0 && !REDUCE;
  if (show && !bookRain) {
    bookRain = rain($("#bookRain"), TITLES);
    $("#book").classList.add("raining");
  } else if (!show && bookRain) {
    bookRain.stop();
    bookRain = null;
    $("#book").classList.remove("raining");
  }
}
addEventListener("resize", () => {
  if (!bookRain) return;
  bookRain.stop();
  bookRain = rain($("#bookRain"), TITLES);
});

/* ---- W5 VIEW SOURCE: every visual flips to the code behind it ---- */
for (const back of $$(".face.back")) {
  const src = SOURCES[back.dataset.src];
  back.innerHTML = `<div class="src"><div class="src-hd"><span class="lab">SOURCE</span><span class="src-f">${src.file}</span></div><pre><code>${highlight(src.code, src.lang)}</code></pre></div>`;
}
for (const btn of $$(".srcbtn")) {
  const flip = $(".flip", btn.closest(".stage-in"));
  btn.addEventListener("click", () => {
    const on = !flip.classList.contains("src");
    flip.classList.toggle("src", on);
    btn.setAttribute("aria-pressed", on);
    btn.textContent = on ? "← BACK TO VISUAL" : "VIEW SOURCE ⟲";
  });
}

/* ================= sections: vitals (W2), chapter name ================= */
const zones = $$("[data-track]");
const vit = { t: 104, f: 4170, j: 9, show: false };
let vitTarget = { t: 104, j: 9 },
  vitRaf = 0;
function zonesTick() {
  let z = zones[0];
  for (const el of zones) if (el.getBoundingClientRect().top < innerHeight * 0.5) z = el;
  const show = z.dataset.temp != null && !$("#tldr").classList.contains("open");
  $("#vitals").classList.toggle("on", show);
  if (z.dataset.temp != null) vitTarget = { t: +z.dataset.temp, j: +z.dataset.jobs };
  if (!vitRaf) vitRaf = requestAnimationFrame(vitStep);
}
function vitStep() {
  vitRaf = 0;
  vit.t += (vitTarget.t - vit.t) * 0.08;
  // fan speed follows the temperature between the idle 41° and the 108° peak
  const f = Math.max(0, ((vit.t - 41) / (108 - 41)) * 4900);
  $("#vT").textContent = vit.t.toFixed(1) + "°";
  $("#vF").textContent = Math.round(f).toLocaleString("en-GB");
  $("#vJ").textContent = vitTarget.j;
  if (Math.abs(vitTarget.t - vit.t) > 0.05) vitRaf = requestAnimationFrame(vitStep);
}

/* ================= W6 60-second read + W9 case file ================= */
(() => {
  const sheet = $("#tldr"),
    opener = $("#open60");
  const open = () => {
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add("open"));
    document.body.classList.add("sheet-open");
    $("#close60").focus();
    zonesTick();
  };
  const close = (to) => {
    sheet.classList.remove("open");
    document.body.classList.remove("sheet-open");
    setTimeout(() => (sheet.hidden = true), 300);
    if (to) to.scrollIntoView({ behavior: REDUCE ? "auto" : "smooth" });
    else opener.focus();
    zonesTick();
  };
  opener.addEventListener("click", open);
  $("#close60").addEventListener("click", () => close());
  addEventListener("keydown", (e) => e.key === "Escape" && !sheet.hidden && close());
  for (const a of $$(".tc-card", sheet))
    a.addEventListener("click", (e) => {
      e.preventDefault();
      close($(a.getAttribute("href")));
    });
  $("#print60").addEventListener("click", () => window.print());
  for (const b of $$("[data-open60]"))
    b.addEventListener("click", () => {
      menu.set(false);
      open();
    });
  for (const b of $$("[data-print]")) b.addEventListener("click", () => window.print());
})();

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
    // the site's players step aside for each other: the dock pauses while the A/B plays
    if (S.playing) dispatchEvent(new CustomEvent("e404-audio-play", { detail: S }));
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
  // and the A/B stops when the dock starts
  addEventListener("e404-audio-play", (e) => e.detail !== S && pause());
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
    run(live.has("feed"));
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

/* ================= 08 · the crew (C3): who checks whom ================= */
// name, role, job, failure on record (real), what checks it, stat
const CREW = [
  [
    "SUNO",
    "TAKES",
    "Rendered every take from the three-layer style spec.",
    "Drifts in tempo, and its stems are a different render from the masters (±1.5 s), so they're never used for timing.",
    "essentia.js measures every master: BPM, key, and how many models agree.",
    "20 SONGS",
  ],
  [
    "DEMUCS",
    "STEMS",
    "Separated the vocal from every master; the instrumental is master minus vocal.",
    "",
    "stable-ts and wav2vec2 run on its vocal; a sync report flags any line that looks wrong.",
    "40 FILES",
  ],
  [
    "STABLE-TS",
    "LYRIC TIMING",
    "First pass of word timings on the separated vocals, on the Mac's GPU.",
    "",
    "wav2vec2 votes on every word.",
    "899 LINES",
  ],
  [
    "WAV2VEC2",
    "SECOND OPINION",
    "Votes on each word within 150 ms of stable-ts.",
    "On its own it pulled lines 200–800 ms early onto breaths and ad-libs.",
    "Only counts when it agrees with stable-ts within 150 ms.",
    "8,711 WORDS",
  ],
  [
    "MADMOM",
    "BEATS",
    "Beat and downbeat tracking, so every seam lands on a bar.",
    "",
    "The vocal stem: a seam moves on by whole bars if two voices would touch.",
    "19 SEAMS",
  ],
  [
    "RUBBER BAND",
    "TIME",
    "Stretched the DJ mix between beat pins as Suno drifted.",
    "Its keyframe map can't be passed from Python, so it ran in real-time mode with a ratio per beat.",
    "madmom's beat pins.",
    "PER BEAT",
  ],
  [
    "ESSENTIA.JS",
    "ANALYSIS",
    "Measured BPM and key in the browser with three key profiles.",
    "",
    "Three key profiles; the vault shows how many agree.",
    "20 TRACKS",
  ],
  [
    "SDXL",
    "PANELS",
    "Ink-noir comic panels, text-free, on a 16 GB Mac.",
    "Artist names in the style prompt came out as text on posters.",
    "A ControlNet guide from the storyboard, and a contact sheet per page.",
    "3 MIN / PANEL",
  ],
  [
    "IP-ADAPTER",
    "FACE LOCK",
    "Keeps the Subject's face the same across a book.",
    "At full strength from step 0 it turned every scene into a close-up.",
    "An explicit shot size in every prompt; it starts at 20% of the steps.",
    "0.7 FROM 20%",
  ],
  [
    "CONTROLNET",
    "COMPOSITION",
    "Traces each storyboard's framing into a guide for the render.",
    "",
    "The storyboard itself.",
    "GUIDE 0.6",
  ],
  [
    "CLAUDE CODE",
    "ENGINEERING",
    "Wrote, tested and opened the pull requests.",
    "Shipped a holo button that leaked across the page in Safari (#17); root-caused and fixed in #18.",
    "CI on every PR, and NULLSAINT × CACHEGHOST review every merge.",
    "77 MERGED",
  ],
];
(() => {
  const W = 660,
    H = 470,
    cx = W / 2,
    cy = H / 2;
  const pos = CREW.map((_, k) => {
    const a = (k / CREW.length) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * 250, cy + Math.sin(a) * 180];
  });
  // the real cross-checks: stable-ts ↔ wav2vec2, madmom ↔ Demucs' vocal, Rubber Band ↔ madmom,
  // Suno ↔ essentia.js, SDXL ↔ ControlNet, IP-Adapter ↔ SDXL, Demucs → stable-ts
  const CHECK = [
    [2, 3],
    [4, 1],
    [5, 4],
    [0, 6],
    [7, 9],
    [8, 7],
    [1, 2],
  ];
  const node = (c, k) =>
    `<g class="node${c[3] ? " x" : ""}" data-k="${k}" tabindex="0" role="button" aria-label="${c[0]}" transform="translate(${(pos[k][0] - 64).toFixed(1)},${(pos[k][1] - 16).toFixed(1)})"><rect width="128" height="32"/>${c[3] ? '<rect class="fx" x="-4" y="-4" width="136" height="40"/>' : ""}<text x="64" y="20" text-anchor="middle">${c[0]}</text></g>`;
  $("#crewMap").innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="The AI crew and what checks each one"><defs><linearGradient id="cmg" x1="0" x2="1"><stop offset="0" stop-color="#ff00e5"/><stop offset="1" stop-color="#00efff"/></linearGradient></defs>
    ${CREW.map((_, k) => `<path class="edge" d="M${cx},${cy} L${pos[k][0].toFixed(1)},${pos[k][1].toFixed(1)}"/>`).join("")}
    ${CHECK.map(([a, b]) => `<path class="edge check" d="M${pos[a][0].toFixed(1)},${pos[a][1].toFixed(1)} Q${cx},${cy} ${pos[b][0].toFixed(1)},${pos[b][1].toFixed(1)}"/>`).join("")}
    ${CREW.map(node).join("")}<g class="hub" transform="translate(${cx - 122},${cy - 21})"><rect width="244" height="42"/><text x="122" y="26" text-anchor="middle">NULLSAINT × CACHEGHOST</text></g></svg>
    <div class="map-info" id="crewInfo" aria-live="polite"></div>`;
  let i = 3,
    timer = 0;
  const show = (k) => {
    i = k;
    const c = CREW[k];
    $$("#crewMap .node").forEach((n) => n.classList.toggle("on", +n.dataset.k === k));
    $("#crewInfo").innerHTML =
      `<b>${c[0]} <em>${c[1]}</em><span class="st">${c[5]}</span></b><p class="job">${c[2]}</p><div><span>CHECKED BY</span>${c[4]}</div><div><span class="${c[3] ? "bad" : "ok"}">${c[3] ? "FAILED" : "FAILURES"}</span>${c[3] || "None on record."}</div>`;
  };
  const cycle = (on) => {
    clearInterval(timer);
    if (on && !REDUCE) timer = setInterval(() => show((i + 1) % CREW.length), 4000);
  };
  for (const n of $$("#crewMap .node")) {
    const pick = () => {
      show(+n.dataset.k);
      cycle(false); // a reader's pick stays put
    };
    n.addEventListener("click", pick);
    n.addEventListener(
      "keydown",
      (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick()),
    );
  }
  show(i);
  onVis.crew = cycle;
})();

/* ================= closing (F2): the machine cools, then the site's cinematic credits ================= */
const end = (() => {
  const sec = $("#end");
  let fx = null;
  return function update() {
    const r = sec.getBoundingClientRect(),
      inView = r.top < innerHeight && r.bottom > 0;
    if (inView && !fx && !REDUCE) fx = rain($("#endRain"), TITLES);
    if (!inView && fx) {
      fx.stop();
      fx = null;
    }
    const cool = 1 - (1 - seg(through(sec), 0, 0.85)) ** 2,
      t = lerp(75, 41, cool);
    $("#endTemp").textContent = Math.round(t) + "°";
    $("#endFan").textContent = Math.round(((t - 41) / (108 - 41)) * 4900).toLocaleString("en-GB");
    $("#endJ").textContent = Math.round(2 * (1 - cool));
    $("#endJobs").textContent = cool < 1 ? "ALL JOBS COMPLETE · FANS SPINNING DOWN" : "IDLE · 41°C · 0 JOBS";
    fx?.speed(lerp(1, 0.25, cool));
    $("#endRain").style.opacity = lerp(1, 0.35, cool);
  };
})();
// the credits rise line by line, as on the vault
new IntersectionObserver(
  (es, o) =>
    es.forEach((e) => {
      if (!e.isIntersecting) return;
      $$(".vf-credits .e-cr").forEach(
        (c, k) => (c.style.transitionDelay = (REDUCE ? 0 : 0.2 + k * 0.35) + "s"),
      );
      $(".vf-credits").classList.add("in");
      o.disconnect();
    }),
  { rootMargin: "-10%" },
).observe($("#vfoot"));
$("#backTop").addEventListener("click", () => scrollTo({ top: 0, behavior: REDUCE ? "auto" : "smooth" }));

/* ================= scroll loop ================= */
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    topBar();
    ov();
    book();
    zonesTick();
    end();
  });
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
onScroll();
