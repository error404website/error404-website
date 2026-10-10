// /ableton/ · the ARCHIVE_404 Ableton set: download + setup walkthrough, on the Source Vault's build.
// Locked like /vault and /live: the songs (with their pad chops) and the release details are in
// public/ableton/data.enc.json, sealed with the access key (npm run ableton:encrypt). The download proves the
// key with the vault's own proof and gets a short-lived signed link (netlify/functions/ableton-download.mjs).
// The walkthrough text is src/ableton/content.json, which the setup-guide PDF is rendered from too.
// The vault's look and motion (gate rain, intro, nav + menu, gutter rain, ruler, cinematic footer, file
// transfer) follow src/vault/main.js.
import "../styles/index.css";
import "../styles/overrides.css";
import "../vault/vault.css";
import "./ableton.css";
import { keyField } from "../lib/keyField";
import { CHAPTERS as SITE_CHAPTERS } from "../data/chapters";
import C from "./content.json";

const $ = (s, el = document) => el.querySelector(s),
  $$ = (s, el = document) => [...el.querySelectorAll(s)];
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const toTop = () => scrollTo({ top: 0, left: 0, behavior: "instant" });
const gb = (b) => (b / 1e9).toFixed(2) + " GB";
const toast = (t) => {
  const el = $("#toast");
  el.textContent = t;
  el.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("on"), 1800);
};
const CAM = { 1: "#ff00e5", 2: "#00efff", 3: "#ffb84d", 4: "#4ade80" };
let DATA = null,
  SONGS = [],
  TITLES = [],
  PROOF = "";

/* ---------- the vault's three-layer rain (7 / 10 / 14 px) ---------- */
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
const GATE_WORDS = [
  ...SITE_CHAPTERS.flatMap((c) => c.tracks.map((t) => t.title)),
  ...[
    "ARRANGEMENT",
    "LOCATORS",
    "TEMPO_MAP",
    "E404_FX",
    "KEYLAB",
    "PADS",
    "SAMPLER",
    "CUE_OUT",
    "IAC_BUS",
    "PROMPTER",
  ],
];
let gateRain = null;
const startGateRain = () => {
  if (REDUCE) return;
  gateRain?.stop();
  gateRain = vaultRain($("#gateRain"), GATE_WORDS);
};
startGateRain();

/* ---------- the vault's intro, reworded for the set ---------- */
function unlockSequence() {
  if (REDUCE) return reveal();
  const pad = (n) => String(n).padStart(2, "0");
  const ov = $("#vintro"),
    term = $("#viTerm");
  ov.hidden = false;
  toTop();
  $("#gate").classList.add("out");
  const g = gateRain;
  gateRain = null;
  setTimeout(() => g?.stop(), 400);
  const rain = vaultRain($("canvas", ov), GATE_WORDS.slice(-10).concat(TITLES));
  const T = [],
    at = (ms, f) => T.push(setTimeout(f, ms));
  const line = (i, extra = "") => {
    $("#viBar").style.width = (i / 20) * 100 + "%";
    $("#viCount").textContent = `${pad(i)}/20`;
    return `<div><b>&gt;</b> KEY ACCEPTED · <span class="ok">ACCESS Nº404</span></div><div><b>&gt;</b> LOADING <i>${pad(i)}/20</i>${i ? `<span class="e-icard-t">${TITLES[i - 1]} · ${SONGS[i - 1].bpm} BPM</span>` : ""}</div>${extra}`;
  };
  const lines = $("#viLines");
  lines.innerHTML = line(0);
  for (let i = 1; i <= 20; i++) at(250 + (i - 1) * 140, () => (lines.innerHTML = line(i)));
  at(
    250 + 20 * 140,
    () =>
      (lines.innerHTML = line(
        20,
        '<div><b>&gt;</b> <span class="ok">SET READY</span> · 10,327 BEATS · 188 LOCATORS</div>',
      )),
  );
  let done = null;
  done = () => {
    T.forEach(clearTimeout);
    done = null;
    reveal();
    ov.classList.add("out");
    setTimeout(() => {
      rain.stop();
      ov.hidden = true;
    }, 380);
  };
  at(3200, () => {
    rain.drain();
    term.classList.add("out");
  });
  at(3650, () => done && done());
  setTimeout(() => {
    const skip = () => done && done();
    addEventListener("keydown", skip, { once: true });
    ov.addEventListener("pointerdown", skip, { once: true });
  }, 250);
}
/* ---------- reveal: nav, ruler, gutters, the site's logo fx, footer credits ---------- */
let revealed = false;
function reveal() {
  if (revealed) return;
  revealed = true;
  toTop();
  $("#gate").classList.add("out");
  document.body.classList.remove("locked");
  $("#vault").hidden = false;
  $("#snav").hidden = false;
  $("#ruler").hidden = false;
  requestAnimationFrame(drawRuler);
  $("#vfoot").hidden = false; // before the nav starts: its scroll-spy measures the footer
  startNav();
  startGutters();
  if (!window.__efx) {
    const fx = document.createElement("script");
    fx.src = $("#fx-src").content.firstElementChild.getAttribute("src");
    document.body.appendChild(fx);
  }
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
  $$(".hero .reveal").forEach((el, i) => setTimeout(() => el.classList.add("in"), REDUCE ? 0 : i * 70));
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -12% 0px" },
  );
  $$(".abl-chap.reveal").forEach((el) => io.observe(el));
}

const SECTIONS = ["setup", "keylab", "flow", "setlist", "test", "help", "night", "offline", "built"];
function startNav() {
  const burger = $("#burger"),
    menu = $("#vmenu");
  const setMenu = (o) => {
    menu.classList.toggle("is-open", o);
    menu.setAttribute("aria-hidden", !o);
    menu.inert = !o;
    burger.setAttribute("aria-expanded", o);
    burger.classList.toggle("is-open", o);
    document.body.classList.toggle("menu-open", o);
  };
  burger.onclick = () => setMenu(!menu.classList.contains("is-open"));
  addEventListener("keydown", (e) => e.key === "Escape" && setMenu(false));
  $$("[data-nav], [data-rail]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      setMenu(false);
      const t = document.getElementById(a.dataset.nav || a.dataset.rail);
      if (!t) return;
      const y =
        t.getBoundingClientRect().top +
        scrollY -
        parseInt(getComputedStyle(document.documentElement).getPropertyValue("--navh")) -
        8;
      scrollTo({ top: y, behavior: REDUCE ? "auto" : "smooth" });
    }),
  );
  $("#lockBtn").onclick = lock;
  $$("[data-lock]").forEach((b) => (b.onclick = lock));
  const navOf = {
    setup: "setup",
    keylab: "keylab",
    flow: "flow",
    setlist: "setlist",
    test: "test",
    help: "help",
    night: "help",
    offline: "help",
    built: "help",
  };
  const spy = () => {
    const line = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--navh")) + 140;
    let cur = null;
    SECTIONS.forEach((id) => {
      if (document.getElementById(id).getBoundingClientRect().top < line) cur = id;
    });
    // a hidden footer measures as 0 × 0 at the top of the screen: it only counts once it's really there
    const fr = $("#vfoot").getBoundingClientRect(),
      foot = fr.height > 0 && fr.top < innerHeight * 0.5;
    $$("[data-rail]").forEach((a) => a.classList.toggle("on", !foot && a.dataset.rail === cur));
    const n = foot ? "vfoot" : cur && navOf[cur];
    $$("[data-nav]").forEach((a) => {
      const desk = a.classList.contains("e8-link"),
        on = a.dataset.nav === (desk ? n : n || "setup");
      a.classList.toggle("active", on && desk);
      a.classList.toggle("on", on && !desk);
    });
  };
  addEventListener("scroll", spy, { passive: true });
  spy();
}
$("#backTop").onclick = $("#toTop").onclick = (e) => {
  e.preventDefault();
  scrollTo({ top: 0, behavior: "smooth" });
};

/* ---------- gutter rain (≥1440 px): the set's song titles ---------- */
function startGutters() {
  if (REDUCE) return;
  const titles = TITLES.map((t) => t + "   ");
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
    running = false,
    raf = 0;
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
    raf = requestAnimationFrame(frame);
  };
  const go = () => {
    const want = innerWidth >= 1440 && !document.hidden;
    if (want && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    if (!want && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
  addEventListener("resize", () => {
    G = setup();
    go();
  });
  document.addEventListener("visibilitychange", go);
  go();
}
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
/* ---------- unlocking: the data is sealed with the access key itself (as /vault and /live) ---------- */
const SESSION = "e404-ableton";
const b64 = {
  to: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))),
  from: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
};
let sealed = null;
const getSealed = async () =>
  (sealed ||= await (await fetch("/ableton/data.enc.json", { cache: "no-cache" })).json());
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
async function open(raw) {
  const s = await getSealed();
  try {
    const k = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.from(s.iv) }, k, b64.from(s.data));
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null; // a wrong key fails the authenticated decryption
  }
}
async function unlockWith(key) {
  if (!key.trim()) return false;
  const s = await getSealed();
  const data = await open(await derive(key, s.salt, s.iterations));
  if (!data) return false;
  // the download proves the key the vault's way: a second derivation with the vault's proof salt
  const v = await (await fetch("/vault/data.enc.json", { cache: "no-cache" })).json();
  PROOF = b64.to(await derive(key, v.proofSalt, v.iterations));
  try {
    const raw = await derive(key, s.salt, s.iterations);
    sessionStorage.setItem(SESSION, JSON.stringify({ k: b64.to(raw), p: PROOF, salt: s.salt }));
  } catch {
    /* private browsing: it asks again next time */
  }
  apply(data);
  return true;
}
function lock() {
  try {
    sessionStorage.removeItem(SESSION);
  } catch {
    /* nothing stored */
  }
  location.reload();
}
keyField($("#pw"), $("#pwShow"));
$("#gateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("#gateForm .go");
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
// back in the same tab: open straight away, no intro
(async () => {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(SESSION) || "null");
  } catch {
    saved = null;
  }
  if (!saved) return;
  const s = await getSealed();
  if (saved.salt !== s.salt) return;
  const data = await open(b64.from(saved.k));
  if (!data) return;
  PROOF = saved.p;
  apply(data);
  reveal();
})();

/* ---------- downloads: a signed link from the private release, shown in the vault's file transfer ---------- */
let xHide = 0;
const api = (body) =>
  fetch("/api/ableton/download", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ proof: PROOF, ...body }),
  });
function startDownload(url) {
  const f = document.createElement("iframe");
  f.hidden = true;
  f.src = url;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 120000);
}
async function download(kind) {
  const name = DATA.files[kind],
    big = kind === "project";
  clearTimeout(xHide);
  const X = $("#xfer"),
    log = $("#xLog");
  X.classList.add("on");
  $("#xStamp").classList.remove("in");
  const st = (s, c) => {
    $("#xState").textContent = s;
    $("#xState").style.color = c;
  };
  $("#xName").textContent = name;
  $("#xBar").style.width = "0";
  $("#xSize").textContent = big ? gb(DATA.release.size) : "PDF";
  $("#xSpeed").textContent = "—";
  $("#xLeft").textContent = "1 FILE";
  st("CONNECTING", "var(--amber)");
  log.innerHTML = "&gt; HANDSHAKE · ACCESS KEY VERIFIED";
  let r = null;
  try {
    r = await api({ f: name });
  } catch {
    r = null;
  }
  if (!r || !r.ok) {
    const locked = r && r.status === 401;
    st(locked ? "LOCKED" : "NO SIGNAL", "var(--amber)");
    log.innerHTML += `<br />&gt; ${esc(name)} · <em>${locked ? "KEY NOT ACCEPTED · LOCK AND UNLOCK AGAIN" : "UNAVAILABLE · TRY AGAIN"}</em>`;
    return;
  }
  const link = await r.json();
  st("TRANSFERRING", "var(--cyan)");
  log.innerHTML += "<br />&gt; SIGNED LINK ISSUED · EXPIRES IN <em>05:00</em>";
  startDownload(link.url);
  $("#xBar").style.width = "100%";
  log.innerHTML += `<br />&gt; ${esc(name)} · <em>${big ? gb(link.size) : Math.round(link.size / 1e3) + " KB"}</em> → YOUR DOWNLOADS`;
  if (big) log.innerHTML += `<br />&gt; SHA-256 ${DATA.release.sha256.slice(0, 12)}… · UNZIP, THEN STEP 03`;
  st("COMPLETE", "var(--led)");
  $("#xStamp").textContent = "DELIVERED";
  $("#xStamp").classList.add("in");
  xHide = setTimeout(() => X.classList.remove("on"), 6200);
}
$("#xClose").onclick = () => $("#xfer").classList.remove("on");

/* ================= the walkthrough ================= */
const SK = "e404-ableton-steps";
let done = new Set();
try {
  done = new Set(JSON.parse(localStorage.getItem(SK) || "[]"));
} catch {
  /* fresh */
}
const KL = {};

function apply(data) {
  if (DATA) return;
  DATA = data;
  SONGS = data.songs;
  TITLES = SONGS.map((s) => s.t);
  const r = data.release;
  $("#dlSize").textContent = gb(r.size);
  $("#absum").textContent =
    `${r.version} · FLAC STEMS · E404 SHOW + TAPE STOP DEVICES · 120 CHOPS · 46 SPOKEN CUES · SHA-256 ${r.sha256.slice(0, 12)}…`;

  /* 01 · steps */
  $("#steps").innerHTML = `<div class="abl-steps">${C.steps
    .map(
      (
        [t, items, when],
        i,
      ) => `<div class="abl-step${i === 0 ? " open" : ""}" data-step="${i}"><button type="button" aria-expanded="${i === 0}"><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="t">${t}</span><span class="st">TO DO</span></button>
  <div class="b"><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><div class="when">DONE WHEN ${esc(when.toUpperCase())}</div><button class="gbtn" type="button" data-done="${i}">✓ MARK DONE</button></div></div>`,
    )
    .join("")}</div>`;
  paintSteps();

  /* 02 · the KeyLab */
  const ex = SONGS[1]; // LEFT_BEHIND, the example song
  C.pads.forEach((n, i) => {
    KL[`p${i + 1}`] =
      i < 6
        ? [
            `PAD ${i + 1} · VOCAL CHOP`,
            `Chop ${i + 1} of whatever song is playing: in ${ex.t} it says “${ex.chops[i]}”. It switches by itself at every song. Note ${n} · channel 10.`,
            `VOX ${i + 1}\n${ex.t}\n“${ex.chops[i]}”`,
          ]
        : [
            `PAD ${i + 1} · ${C.kit[i - 6]}`,
            `A one-shot, played into the SONG group so the FX rack catches it too. Note ${n} · channel 10.`,
            `KIT\n${C.kit[i - 6]}`,
          ];
  });
  C.encoders.forEach(
    (c, i) =>
      (KL[`e${i + 1}`] =
        i < 8
          ? [
              `ENCODER ${i + 1} · ${C.macros[i]}`,
              `Macro ${i + 1} of the E404 FX rack on the SONG group. At zero it's out of the way; turn up to bring it in. CC ${c}.`,
              `E404 FX\n${C.macros[i]}`,
            ]
          : [
              "ENCODER 9 · MIC ECHO",
              `How much of your voice goes into the ECHO THROW return. CC ${c}.`,
              "MIC\nECHO SEND",
            ]),
  );
  C.faders.forEach(
    (c, i) =>
      (KL[`f${i + 1}`] = [
        `FADER ${i + 1} · ${C.faderNames[i]}`,
        `Volume of ${C.faderNames[i]}${i === 8 ? ", the whole PA mix" : ""}. Fader top is 0 dB, so nothing clips by accident. CC ${c}.`,
        `${C.faderNames[i]}\n0.0 dB`,
      ]),
  );
  C.moves.forEach(
    ([k, name, what, note], i) =>
      (KL[`k${i + 1}`] = [`KEY ${k} · ${name}`, `${what} Note ${note}.`, `MOVE\n${name}`]),
  );
  const whites = 29,
    blackAt = [0, 1, 3, 4, 5];
  $("#kl").innerHTML = `<div class="kl-dev"><div class="kl-top">
  <div><div class="kl-brand">KEYLAB 49 MK3</div><div class="kl-screen" id="klScreen">ARCHIVE_404\nE404 SHOW · READY</div></div>
  <div><div class="kl-lab" style="margin-bottom:8px">PADS · CH 10</div><div class="kl-grid">${C.pads.map((n, i) => `<button class="kl-pad ${i < 6 ? "v" : "k"}" data-k="p${i + 1}" aria-label="Pad ${i + 1}">${i + 1}</button>`).join("")}</div></div>
  <div class="kl-sect"><div class="kl-lab">ENCODERS</div><div class="kl-encs">${C.encoders.map((c, i) => `<button class="kl-enc${i < 8 ? " m" : ""}" data-k="e${i + 1}" style="--r:${-130 + i * 30}deg" aria-label="Encoder ${i + 1}"></button>`).join("")}</div>
  <div class="kl-lab">FADERS</div><div class="kl-fads">${C.faders.map((c, i) => `<button class="kl-fad" data-k="f${i + 1}" style="--y:${[20, 30, 15, 45, 50, 60, 55, 35, 10][i]}%" aria-label="Fader ${i + 1}"><i></i></button>`).join("")}</div></div></div>
  <div class="kl-keys">${Array.from({ length: whites }, (_, i) => `<span class="kl-w${i < 2 ? " mv" : ""}"${i < 2 ? ` data-k="k${i === 0 ? 1 : 3}"` : ""}></span>`).join("")}
  ${Array.from({ length: whites - 1 }, (_, i) => (blackAt.includes(i % 7) ? `<span class="kl-b${i === 0 ? " mv" : ""}"${i === 0 ? ' data-k="k2"' : ""} style="left:calc(18px + ${((i + 1) / whites) * 100}% - ${((i + 1) / whites) * 36}px - 1.1%)"></span>` : "")).join("")}</div></div>
  <div class="kl-info" id="klInfo"><b>TAP ANY CONTROL</b><p>Magenta pads play the song's vocal chops, cyan pads the one-shots, the amber keys move through the set.</p></div>
  <div class="kl-legend"><span><i style="background:var(--mag)"></i>VOCAL CHOPS</span><span><i style="background:var(--cyan)"></i>ONE-SHOTS</span><span><i style="background:var(--amber)"></i>MOVES</span><span><i style="background:var(--t3)"></i>FX + MIX</span></div>`;
  $("#klScreen").style.whiteSpace = "pre-line";

  /* 03 · signal flow */
  $("#fl").innerHTML =
    `<div class="abl-flow"><svg viewBox="0 0 900 340" role="img" aria-label="Signal flow of the set">
  <defs><linearGradient id="ablFg"><stop offset="0" stop-color="#ff00e5"/><stop offset="1" stop-color="#00efff"/></linearGradient></defs>
  ${[
    ["mic", "M190 62 L300 62"],
    ["mic", "M480 62 L640 62"],
    ["duck", "M95 84 L95 166 L300 166"],
    ["mic", "M560 84 L560 166 L480 166"],
    ["duck", "M480 166 L560 166"],
    ["pads", "M190 256 L250 256 L250 188 L300 188"],
    ["ears", "M480 180 L540 180 L540 256 L640 256"],
    ["feed", "M480 296 L640 296"],
  ]
    .map(([p, d]) => `<g data-p="${p}"><path d="${d}"/></g>`)
    .join("")}
  ${[
    ["mic", 20, 40, 170, "MIC", "INPUT 1"],
    ["mic", 300, 40, 180, "TUNE · GRIT · DOUBLER", "AUTO SHIFT · HARD TUNE"],
    ["mic", 640, 40, 220, "PA · OUTPUTS 1/2", "MAIN"],
    ["duck", 300, 144, 180, "SONG · E404 FX", "INST + GUIDE VOX"],
    ["pads", 20, 234, 170, "KEYLAB PADS", "CH 10 · 72–83"],
    ["ears", 640, 234, 220, "EARS · OUTPUTS 3/4", "CLICK · CUES · GUIDE"],
    ["feed", 300, 274, 180, "E404 SHOW", "PROMPTER · MOVES"],
    ["feed", 640, 274, 220, "IAC → /LIVE/", "STANDBY · TAKE OVER"],
  ]
    .map(
      ([p, x, y, w, a, b]) =>
        `<g class="node" data-p="${p}"><rect x="${x}" y="${y}" width="${w}" height="44"/><text x="${x + 12}" y="${y + 19}">${a}</text><text class="s" x="${x + 12}" y="${y + 34}">${b}</text></g>`,
    )
    .join("")}
  <text x="104" y="128" font-family="Space Mono" font-size="8.5" letter-spacing="1.6" fill="rgba(244,244,248,.45)">KEYS THE DUCK · −12 DB</text></svg>
  <div class="abl-flow-keys">${[
    ["mic", "YOUR VOICE"],
    ["duck", "THE DUCK"],
    ["pads", "PADS"],
    ["ears", "IN-EARS"],
    ["feed", "BACKUP"],
  ]
    .map(([p, t]) => `<button class="gbtn" data-flow="${p}">${t}</button>`)
    .join("")}</div>
  <p class="abl-flow-say" id="flSay">Tap a path, or the buttons, to follow it.</p></div>`;

  /* 04 · the set */
  let lastCh = 0;
  $("#sl").innerHTML = `<div class="abl-set">${SONGS.map((s) => {
    const head =
      s.ch !== lastCh
        ? `<div class="chh" style="color:${CAM[s.ch]}">CHAPTER ${["", "I · ORIGIN", "II · THE FEED", "III · THE WRECKAGE", "IV · WHOLE"][s.ch]}</div>`
        : "";
    lastCh = s.ch;
    return `${head}<div class="r"><span><span class="cam" style="background:${CAM[s.ch]}">${String(s.n).padStart(2, "0")}</span></span><span class="tt">${s.t}</span><span>${s.bpm}</span><span class="k">${s.key.toUpperCase()}</span><span class="cp">${s.chops.map((c, i) => `<span class="pc"><b>${i + 1}</b>${esc(c)}</span>`).join("")}</span></div>`;
  }).join("")}</div>`;

  /* 05 · rig tester */
  const TROWS = ["KEYLAB PADS · CH 10", "ENCODERS", "FADERS", "MOVE KEYS · C C♯ D", "ABLETON FEED · IAC"];
  $("#ts").innerHTML =
    `<div class="abl-test"><div class="hd"><span class="abl-chap-e" style="margin:0">LISTENING FOR YOUR RIG</span><button class="holo" id="tGo">CONNECT MIDI</button></div>
  ${TROWS.map((t) => `<div class="tr" data-t="${t}"><span>○</span><span>${t}</span><span class="v">—</span></div>`).join("")}<div class="lg" id="tLog">Press CONNECT (Chrome or Edge), allow MIDI, then hit a pad, turn an encoder, move a fader and play Ableton.</div></div>`;
  $("#tGo").onclick = async () => {
    const log = $("#tLog");
    if (!navigator.requestMIDIAccess)
      return (log.textContent = "This browser has no Web MIDI: use Chrome or Edge.");
    let a;
    try {
      a = await navigator.requestMIDIAccess();
    } catch {
      return (log.textContent = "MIDI access was declined.");
    }
    $("#tGo").textContent = "● LISTENING";
    const row = (t, v) => {
      const el = $(`[data-t="${t}"]`);
      el.classList.add("ok");
      el.firstElementChild.textContent = "✓";
      $(".v", el).textContent = v;
    };
    const parts = [0, 0, 0, 0, 0];
    const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const on = (e) => {
      const [s, d1, d2] = e.data,
        ty = s & 0xf0,
        ch = (s & 15) + 1;
      if (ty === 0x90 && d2 && ch === 10 && C.pads.includes(d1))
        row(TROWS[0], `PAD ${C.pads.indexOf(d1) + 1}`);
      if (ty === 0x90 && d2 && ch === 1 && d1 >= 36 && d1 <= 38) row(TROWS[3], C.moves[d1 - 36][1]);
      if (ty === 0xb0 && ch === 1 && C.encoders.includes(d1))
        row(TROWS[1], `ENC ${C.encoders.indexOf(d1) + 1} · ${d2}`);
      if (ty === 0xb0 && ch === 1 && C.faders.includes(d1))
        row(TROWS[2], `FADER ${C.faders.indexOf(d1) + 1} · ${d2}`);
      if (s === 0xbf && d1 >= 110 && d1 <= 115) {
        if (d1 < 115) parts[d1 - 110] = d2;
        else
          row(
            TROWS[4],
            `${mmss(parts.reduce((x, p) => x * 128 + p, 0) / 1000)} · ${d2 ? "PLAYING" : "STOPPED"}`,
          );
      }
    };
    const hook = () => a.inputs.forEach((i) => (i.onmidimessage = on));
    hook();
    a.onstatechange = hook;
    log.textContent = `INPUTS · ${[...a.inputs.values()].map((i) => i.name.toUpperCase()).join(" · ") || "NONE"}`;
  };

  /* 06 · troubleshooting · 07 · the night · 08 · offline · 09 · built */
  $("#tr").innerHTML =
    `<div class="abl-ts">${C.trouble.map(([q, a]) => `<details><summary>${q}</summary><p>${esc(a)}</p></details>`).join("")}</div>`;
  $("#ps").innerHTML =
    `<div class="abl-pre"><div class="hd"><span>TONIGHT · ${C.pre.length} CHECKS</span><button type="button" id="preReset" style="font:inherit;letter-spacing:inherit;color:var(--t3)">RESET</button></div>${C.pre.map((t, i) => `<label><input type="checkbox" data-pre="${i}"><span>${t}</span></label>`).join("")}</div>`;
  $("#preReset").onclick = () => $$("[data-pre]").forEach((c) => (c.checked = false));
  $("#dc").innerHTML =
    `<div class="abl-docs"><div class="abl-doc cover"><span class="dl">ARCHIVE_404 · Nº404</span><span class="dt grad">ABLETON SET<br>SETUP GUIDE</span><span class="dl" style="margin-top:auto">${r.version}</span></div>
  <div class="abl-doc page"><span class="dl">01 · WHAT YOU NEED</span><span class="acc"></span><span class="ln"></span><span class="ln" style="width:72%"></span><span class="ln" style="width:86%"></span><span class="dl" style="margin-top:8px">02 · DOWNLOAD</span><span class="ln"></span><span class="ln" style="width:58%"></span></div>
  <div class="abl-doc card"><span class="dl">STAGE CARD · KEYLAB + PRE-SHOW</span><span class="acc"></span><span class="ln"></span><span class="ln" style="width:80%"></span><span class="ln" style="width:64%"></span><span class="ln" style="width:76%"></span></div></div>
  <div class="abl-dl-row"><button class="holo" data-dl="guide">↓ SETUP GUIDE · PDF</button><button class="gbtn" data-dl="card">↓ STAGE CARD · 1 PAGE</button></div>`;
  $("#bt").innerHTML =
    `<div class="abl-pipe"><div class="pb"><b>live_timeline.json</b>THE SAME DATA /LIVE/ PLAYS</div><span class="ar">→</span><div class="pb"><b>live_als_assets.py</b>STEMS · CHOPS · CUES · KIT</div><span class="ar">→</span><div class="pb"><b>live_als.py</b>FROM ABLETON'S OWN PRESETS</div><span class="ar">→</span><div class="pb"><b>live_package.py</b>FLAC · ZIP · CHECKSUMS · TEST-LOAD</div></div>
  <div class="abl-facts">${C.facts.map(([n, t]) => `<div><b>${n}</b>${esc(t)}</div>`).join("")}</div>`;
}
function paintSteps() {
  $$("[data-step]").forEach((s) => {
    const d = done.has(+s.dataset.step);
    s.classList.toggle("done", d);
    $(".st", s).textContent = d ? "✓ DONE" : "TO DO";
  });
  $("#ringT").textContent = `${done.size}/${C.steps.length}`;
  $("#ringP").style.strokeDashoffset = 119.4 * (1 - done.size / C.steps.length);
}

/* one click handler for the page */
document.addEventListener("click", (e) => {
  if (e.target.closest("#gate")) return;
  const dl = e.target.closest("[data-dl]");
  if (dl && DATA) return download(dl.dataset.dl);
  const head = e.target.closest(".abl-step > button");
  if (head) {
    const s = head.parentElement;
    s.classList.toggle("open");
    head.setAttribute("aria-expanded", s.classList.contains("open"));
  }
  const m = e.target.closest("[data-done]");
  if (m) {
    const i = +m.dataset.done;
    done.has(i) ? done.delete(i) : done.add(i);
    try {
      localStorage.setItem(SK, JSON.stringify([...done]));
    } catch {
      /* not saved */
    }
    m.closest(".abl-step").classList.remove("open");
    const next = $(`[data-step="${i + 1}"]`);
    if (next && !done.has(i + 1)) next.classList.add("open");
    paintSteps();
    if (done.size === C.steps.length) toast("ALL STEPS DONE · READY FOR THE NIGHT");
  }
  const k = e.target.closest("[data-k]");
  if (k && KL[k.dataset.k]) {
    $$("[data-k].sel").forEach((x) => x.classList.remove("sel"));
    k.classList.add("sel");
    const [t, d, scr] = KL[k.dataset.k];
    $("#klInfo").innerHTML = `<b>${t}</b><p>${esc(d)}</p>`;
    $("#klScreen").textContent = scr;
  }
  const f = e.target.closest("[data-flow]") || e.target.closest(".abl-flow g[data-p]");
  if (f) {
    const p = f.dataset.flow || f.dataset.p;
    $$(".abl-flow g[data-p]").forEach((g) => g.classList.toggle("lit", g.dataset.p === p));
    $$("[data-flow]").forEach((b) => b.classList.toggle("on", b.dataset.flow === p));
    $("#flSay").textContent = C.flow[p];
  }
});
