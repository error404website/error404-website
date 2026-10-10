// ERROR_404 · LIVE (/live/): the performance page.
//
// Gate: the Source Vault's access key. public/live/data.enc.json (the set timeline: songs, lyrics with
// word timings, stage cues, beats) and public/live/inst/*.bin (the instrumental versions) are AES-GCM,
// keyed by PBKDF2 of the access key, exactly like the vault's data. The masters are the site's own
// /audio files. PRELOAD stores everything in the browser's Cache Storage, so the show runs offline.
import "../styles/index.css";
import "../styles/overrides.css";
import "../styles/dock.css";
import "../vault/vault.css";
import "./live.css";
import { audioSrc } from "../lib/audioSrc";
import { keyField } from "../lib/keyField";
import { rain, REDUCE } from "../lib/rain";
import { download, makeCapture } from "./capture";
import { CUE_COLOURS, CUE_IDS, cuesFor, setCue as saveCue } from "./cues";
import { makeCtrlWizard } from "./ctrl";
import { Engine } from "./engine";
import { PAD_DEFS, synthKit, vocalChop } from "./pads";
import { MOVES, makeMoves } from "./moves";
import { makeNotesEditor, noteFor, reload as reloadNotes, tagLines } from "./notes";
import { makeRehearse } from "./rehearse";
import { makeStandby } from "./standby";
import { makeRemote } from "./remote";
import { makeRuler } from "./ruler";
import { startSafety, safetyRows } from "./safety";
import { ALBUM, deriveTimeline, isAlbum, skipSuggestion } from "./set";
import { makeSetBuilder } from "./setbuilder";
import * as store from "./store";
import { makeVoice } from "./voice";
import { makeVoiceUI } from "./voiceui";
import { makeWave, WAVE_H } from "./wave";

const $ = (s, el = document) => el.querySelector(s),
  $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const camColour = (c) => `hsl(${((parseInt(c) - 1) * 30 + 300) % 360} 100% ${c.endsWith("B") ? 70 : 60}%)`;
const STAGE = new URLSearchParams(location.search).has("stage");
const PROMPTER = new URLSearchParams(location.search).has("prompter"); // 08 · the performer's prompter window
const SESSION = "e404-live";
const CACHE = "e404-live-v1";
const bc = "BroadcastChannel" in window ? new BroadcastChannel("e404-live") : null;
const toast = (t) => {
  const el = $("#toast");
  if (!el) return;
  el.textContent = t;
  el.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("on"), 1800);
};

/* ---------- unlocking (the vault's scheme, the live page's own salt) ---------- */
const b64 = {
  to: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))),
  from: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
};
let sealed = null,
  KEY = null,
  PROOF = "", // the vault's proof of the key (11: only the unlocked show can pair a phone)
  BASE = null, // the decrypted timeline, album order
  TL = null; // the running order in use (set.js); the album unless a set was loaded
async function getSealed() {
  if (!sealed) sealed = await (await fetch("/live/data.enc.json", { cache: "no-cache" })).json();
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
async function open(raw) {
  const s = await getSealed();
  try {
    const k = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.from(s.iv) }, k, b64.from(s.data));
    BASE = JSON.parse(new TextDecoder().decode(plain));
    tagLines(BASE);
    TL = BASE;
    setOrder(store.get("order", ALBUM));
    KEY = k;
    return true;
  } catch {
    return false;
  }
}
async function unlockWith(key) {
  if (!key.trim()) return false;
  const s = await getSealed();
  const raw = await derive(key, s.salt, s.iterations);
  const ok = await open(raw);
  if (ok) {
    try {
      const v = await (await fetch("/vault/data.enc.json", { cache: "no-cache" })).json();
      PROOF = b64.to(await derive(key, v.proofSalt, v.iterations));
    } catch {
      PROOF = ""; // offline: the phone remote can pair once the page is reloaded online
    }
    try {
      sessionStorage.setItem(SESSION, JSON.stringify({ k: b64.to(raw), p: PROOF, salt: s.salt }));
    } catch {
      /* private browsing: asks again next time */
    }
  }
  return ok;
}
async function resume() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION) || "null");
    if (saved && (await getSealed()).salt === saved.salt) {
      PROOF = saved.p || "";
      return open(b64.from(saved.k));
    }
  } catch {
    /* fall through to the gate */
  }
  return false;
}
async function decryptFile(buf, iv) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.from(iv) }, KEY, buf);
}

/* ---------- the running order ---------- */
let ORDER = ALBUM;
function setOrder(order) {
  const ok = Array.isArray(order) && order.length && order.every((n) => BASE.songs.some((s) => s.n === n));
  ORDER = ok ? [...new Set(order)] : ALBUM;
  TL = isAlbum(ORDER) ? BASE : deriveTimeline(BASE, ORDER);
}

/* ---------- files: masters (/audio) + instrumentals (/live/inst) + set patches (/live/patch) ---------- */
const PATCH = { hm: ["head", "m"], hi: ["head", "i"], tm: ["tail", "m"], ti: ["tail", "i"] };
const urlFor = (song, kind) =>
  kind === "m"
    ? audioSrc(`/audio/${song.slug}.mp3`)
    : kind === "i"
      ? `/live/inst/${song.inst.file}`
      : `/live/patch/${song.patch[PATCH[kind][0]][PATCH[kind][1]].file}`;
const BYTES = new Map(); // "n:kind" -> ArrayBuffer (decrypted, ready to decode)
async function fetchCached(url) {
  if ("caches" in window) {
    const c = await caches.open(CACHE);
    const hit = await c.match(url);
    if (hit) return hit.arrayBuffer();
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    await c.put(url, r.clone());
    return r.arrayBuffer();
  }
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.arrayBuffer();
}
async function bytesFor(n, kind) {
  const key = `${n}:${kind}`;
  if (BYTES.has(key)) return BYTES.get(key);
  const song = BASE.songs.find((s) => s.n === n);
  let buf = await fetchCached(urlFor(song, kind));
  if (kind === "i") buf = await decryptFile(buf, song.inst.iv);
  else if (PATCH[kind]) buf = await decryptFile(buf, song.patch[PATCH[kind][0]][PATCH[kind][1]].iv);
  BYTES.set(key, buf);
  return buf;
}

/* ---------- gate ---------- */
let gateRain = null;
function startGate() {
  $("#gate").hidden = false;
  if (!REDUCE) gateRain = rain($("#gateRain"), TITLE_WORDS);
  $("#pw").focus();
}
const TITLE_WORDS = [
  "ORIGIN",
  "LEFT_BEHIND",
  "GRAFT",
  "IMPACTED",
  "EMPTY_CITY",
  "THE_FEED",
  "GOSPEL_OUT",
  "ENDLESS_GLOW",
  "AWAKE",
  "RECLAIMED",
  "THE_WRECKAGE",
  "READ",
  "COME_HOME",
  "CHANGED_THE_LOCK",
  "DOWN_THE_FRONT",
  "WHOLE",
  "ENOUGH",
  "OPEN_SKY",
  "ALL_OF_ME",
  "BETTER_DAYS",
  "VOCALS",
  "DRUMS",
  "BASS",
  "SYNTH",
  "LIVE",
];
keyField($("#pw"), $("#pwShow"));
$("#gateForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#msg");
  msg.className = "msg";
  msg.textContent = "> VERIFYING KEY…";
  try {
    if (await unlockWith($("#pw").value)) {
      msg.textContent = "";
      $("#gate").classList.add("out");
      gateRain?.stop();
      setTimeout(() => ($("#gate").hidden = true), 450);
      STAGE || PROMPTER ? startStage() : startPreload();
      return;
    }
    const box = $(".gate-box");
    box.classList.remove("shake");
    void box.offsetWidth;
    box.classList.add("shake");
    msg.className = "msg bad";
    msg.textContent = "> ACCESS DENIED · KEY NOT RECOGNISED";
    $("#pw").select();
  } catch {
    msg.className = "msg bad";
    msg.textContent = "> NO SIGNAL · CHECK YOUR CONNECTION";
  }
});

/* ---------- preload + pre-show check ---------- */
let engine = null,
  kit = null;
function startPreload() {
  document.body.classList.remove("locked");
  $("#pre").hidden = false;
  if (!REDUCE) rain($("#preRain"), TITLE_WORDS);
  const mb = preloadJobs().reduce((n, j) => n + j[2], 0) / 1e6;
  $("#preSub").textContent =
    `${TL.songs.length} SONGS · ${fmt(TL.duration)} · VOCAL + INSTRUMENTAL · ${Math.round(mb)} MB`;
  $("#preBtn").onclick = preload;
  if ("serviceWorker" in navigator && import.meta.env.PROD)
    navigator.serviceWorker.register("/live/sw.js", { scope: "/live/" });
}
// every file the show can need: both versions of each song, and its clean set patches
const preloadJobs = () =>
  BASE.songs.flatMap((s) => [
    [s, "m", s.mBytes],
    [s, "i", s.inst.bytes],
    ...(s.patch?.head?.m?.file
      ? Object.keys(PATCH).map((k) => [s, k, s.patch[PATCH[k][0]][PATCH[k][1]].bytes])
      : []),
  ]);
async function preload() {
  const btn = $("#preBtn");
  btn.disabled = true;
  btn.textContent = "PRELOADING…";
  engine = new Engine(TL, bytesFor);
  await engine.init(); // inside the click: lets the browser start audio
  const jobs = preloadJobs();
  const total = jobs.reduce((n, j) => n + j[2], 0);
  let done = 0,
    files = 0;
  const bar = $("#preBar"),
    stat = $("#preStat");
  const step = () => {
    bar.style.width = (done / total) * 100 + "%";
    stat.textContent = `${files}/${jobs.length} FILES · ${Math.round(done / 1e6)} / ${Math.round(total / 1e6)} MB`;
  };
  step();
  // four at a time
  const queue = jobs.slice();
  const worker = async () => {
    while (queue.length) {
      const [s, kind, size] = queue.shift();
      await bytesFor(s.n, kind);
      done += size;
      files++;
      step();
    }
  };
  try {
    await Promise.all([worker(), worker(), worker(), worker()]);
  } catch (err) {
    stat.textContent = "DOWNLOAD FAILED · CHECK THE CONNECTION AND TRY AGAIN";
    btn.disabled = false;
    btn.textContent = "↻ RETRY PRELOAD";
    console.error(err);
    return;
  }
  await fetchCached("/live/voice.mp3").catch(() => null); // the in-ears' spoken cues
  btn.hidden = true;
  stat.textContent = `ALL ${jobs.length} FILES LOADED · STORED FOR OFFLINE`;
  await preflight();
}
async function preflight() {
  const ul = $("#check");
  ul.hidden = false;
  const row = (ok, label, note = "") => {
    ul.insertAdjacentHTML(
      "beforeend",
      `<li class="${ok ? "ok" : "warn"}"><i></i>${label}<em>${note}</em></li>`,
    );
  };
  const files = preloadJobs().length;
  row(true, "SONGS, INSTRUMENTALS + SET PATCHES LOADED", `${files} FILES`);
  const cached = "caches" in window ? (await (await caches.open(CACHE)).keys()).length : 0;
  row(cached >= files, "OFFLINE COPY", cached ? `${cached} FILES IN THE BROWSER` : "NOT AVAILABLE HERE");
  let decodeOk = true;
  try {
    await engine.ready(0);
    await engine.ready(1);
  } catch {
    decodeOk = false;
  }
  row(
    decodeOk,
    "AUDIO DECODES",
    decodeOk
      ? `${TL.songs[0].title} + ${TL.songs[1]?.title || "—"} READY · GAPLESS`
      : "THIS BROWSER COULD NOT DECODE THE FILES",
  );
  row(
    true,
    "SET",
    isAlbum(ORDER)
      ? `ALBUM · 20 SONGS · ${fmt(TL.duration)}`
      : `${store.get("setName", "CUSTOM")} · ${ORDER.length} SONGS · ${fmt(TL.duration)}`,
  );
  if (
    /iP(hone|od|ad)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
    row(false, "IPHONE / IPAD", "FLIP THE SILENT SWITCH OFF · PLUG IN · KEEP THIS PAGE IN FRONT");
  row(
    "wakeLock" in navigator,
    "SCREEN STAYS AWAKE",
    "wakeLock" in navigator ? "ON DURING THE SHOW" : "NOT IN THIS BROWSER · TURN OFF SLEEP IN SETTINGS",
  );
  row(
    engine.ctx.state === "running",
    "AUDIO OUTPUT",
    `${engine.ctx.sampleRate} HZ · ${Math.round(outLag() * 1000)} MS DELAY · LYRICS FOLLOW IT`,
  );
  kit = await synthKit();
  row(true, "PADS", "16 READY (12 SYNTH · 4 VOCAL CHOPS PER SONG)");
  const mem = performance.memory ? Math.round(performance.memory.jsHeapSizeLimit / 1e6) : null;
  row(!mem || mem > 1500, "MEMORY", mem ? `${mem} MB AVAILABLE TO THIS TAB` : "OK");
  row(
    true,
    "MIDI",
    "midi" in navigator || navigator.requestMIDIAccess
      ? "AVAILABLE · CONNECT FROM THE SHOW"
      : "NOT IN THIS BROWSER (CHROME / EDGE HAVE IT)",
  );
  if (engine.ctx.setSinkId && navigator.mediaDevices?.enumerateDevices) {
    const outs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audiooutput");
    if (outs.length > 1) {
      $("#devRow").hidden = false;
      $("#outSel").innerHTML = outs
        .map((d) => `<option value="${d.deviceId}">${esc(d.label || "Output")}</option>`)
        .join("");
      $("#outSel").onchange = (e) =>
        engine.ctx
          .setSinkId(e.target.value)
          .then(() => (outputId = e.target.value))
          .catch(() => toast("COULD NOT SWITCH OUTPUT"));
    }
  }
  $("#goBtn").hidden = false;
  $("#goBtn").onclick = startShow;
}

let outputId = "";

/* ---------- the show ---------- */
const S = {
  autoPrompt: store.get("autoPrompt", true),
  crowd: false,
  panic: false,
  locked: false,
  vox: 1,
  master: 1,
  eq: { low: 1, mid: 1, high: 1 },
  filter: 0,
};
function startShow() {
  if (startShow.done) return; // a double-click on START must not wire everything twice
  startShow.done = true;
  $("#pre").hidden = true;
  $("#show").hidden = false;
  document.body.classList.add("showing");
  if (!window.__efx) {
    const fx = document.createElement("script");
    fx.src = $("#fx-src").content.firstElementChild.getAttribute("src");
    document.body.appendChild(fx);
  } // the site's logo behaviours: the nav logo draws itself on, and again on hover
  buildStrip();
  buildPads();
  setBuilder = makeSetBuilder($("#drawer"), {
    base: () => BASE,
    applied: () => ORDER,
    playingIndex: () => (engine.playing || heard() > 0 ? engine.songAt(heard()) : -1),
    isPlaying: () => engine.playing,
    apply: applyOrder,
    jumpTo: (n) => {
      const k = TL.songs.findIndex((s) => s.n === n);
      if (k < 0) return;
      engine.seek(TL.songs[k].start);
      engine.ready(k).then(() => !engine.playing && engine.onstate());
    },
    fmt,
    esc,
    toast,
    locked: () => S.locked,
    onCurfew: () => (clock.k = null),
  });
  startCues();
  startLayout();
  startSafety({
    engine: () => engine,
    toast,
    outputId: () => outputId,
    onChange: paintSafety,
  });
  voice = makeVoice({
    engine: () => engine,
    tl: () => TL,
    toast,
    fetchBytes: fetchCached,
    onChange: (st) => {
      voiceUI?.paint();
      paintMic(st);
    },
  });
  voiceUI = makeVoiceUI($("#voiceDrawer"), voice, { esc, toast });
  moves = makeMoves({
    engine: () => engine,
    tl: () => TL,
    S,
    kit: () => kit,
    toast,
    fxUI,
    fxOn: (n) => !!FXON[n],
    onChange: (st) => {
      $$("[data-move-btn]").forEach((b) => {
        const m = b.dataset.moveBtn;
        b.classList.toggle(
          "on",
          (m === "BUILD-UP" && !!st.build) ||
            (m === "BREAKDOWN" && st.breakdown) ||
            (m === "ECHO OUT" && st.echoOut),
        );
      });
    },
  });
  for (const m of MOVES) CTL[m] = { press: (d) => d !== false && fireMove(m) };
  $("#padsPanel").addEventListener("pointerdown", (e) => {
    const b = e.target.closest("[data-move-btn]");
    if (b && !S.locked) fireMove(b.dataset.moveBtn);
  });
  remote = makeRemote({
    proof: () => PROOF,
    control,
    state: remoteState,
    toast,
    onChange: paintRemote,
  });
  ctrlWiz = makeCtrlWizard($("#ctrlDrawer"), {
    map: midiMap,
    saveMap: () => {
      try {
        localStorage.setItem(MAPKEY, JSON.stringify(midiMap));
      } catch {
        /* not saved */
      }
    },
    connect: async () => {
      if (!midi.access) await midi();
      return !!midi.access;
    },
    toast,
    esc,
    lights: (on) => {
      lights.on = on;
      store.set("padLights", on);
      lights.sent.clear();
    },
    lightsOn: () => lights.on,
  });
  setInterval(syncLights, 250);
  standby = makeStandby({
    engine: () => engine,
    tl: () => TL,
    toast,
    midi: midiConnect,
    hhmmss: (t) => `${Math.floor(t / 3600)}:${fmt(t % 3600).padStart(5, "0")}`,
  });
  $("#standbyBtn").onclick = () => {
    if (S.locked) return;
    setMenu(false);
    standby.toggle();
  };
  rehearse = makeRehearse($("#rehearseDrawer"), {
    engine: () => engine,
    tl: () => TL,
    voice,
    toast,
    esc,
    fmt,
  });
  capture = makeCapture({
    engine: () => engine,
    micNode: () => voice?.micNode(),
    tl: () => TL,
    toast,
    fmt,
    curfew: () => store.get("curfew", ""),
  });
  $("#capList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-cap]");
    if (b) download(capture.st.files[+b.dataset.cap]);
  });
  $("#capAll").onclick = () => capture.st.files.forEach((f, i) => setTimeout(() => download(f), i * 600));
  // 13 · crowd prompts
  $("#padsPanel").addEventListener("pointerdown", (e) => {
    const b = e.target.closest("[data-prompt]");
    if (!b || S.locked) return;
    if (b.dataset.prompt === "AUTO") return setAutoPrompt(!S.autoPrompt);
    firePrompt(b.dataset.prompt);
  });
  for (const p of PROMPTS) CTL[`PROMPT ${p}`] = { press: (d) => d !== false && firePrompt(p) };
  paintPrompts();
  notesEd = makeNotesEditor($("#notesDrawer"), {
    tl: () => TL,
    songIndex: () => engine.songAt(heard()),
    esc,
    onChange: () => (notesVer++, broadcast()),
  });
  engine.onstate = () => {
    $("#playBtn").innerHTML = engine.playing ? '<span class="e-pp"></span>' : '<span class="e-pi"></span>';
    $("#playBtn").setAttribute("aria-label", engine.playing ? "Pause" : "Play");
    $$("[data-loop]").forEach((b) =>
      b.classList.toggle("on", !!engine.loop && engine.loop.bars === +b.dataset.loop),
    );
    if (lyrRain) engine.playing ? lyrRain.resume() : lyrRain.pause();
    broadcast();
  };
  wireControls();
  startMenu();
  startLyricRain();
  startWave();
  drawRuler = makeRuler($("#ruler"), TL.songs);
  setInterval(clock, 250);
  requestAnimationFrame(frame);
  // the keyboard hint only where there's a keyboard (the phone sheet has its own buttons)
  if (!document.body.classList.contains("phone")) toast("SPACE = PLAY / PAUSE · PADS ON 1–4 Q–R A–F Z–V");
}

/* ---------- S1 · what you hear vs what you see ----------
   The engine's clock is when audio leaves the browser; it reaches the speakers outputLatency (+ the
   browser's own baseLatency) later: ~10–40 ms on built-in or wired outputs, 150–300 ms over Bluetooth.
   Everything drawn (lyrics, cues, counters, waveform, ruler, the stage screen) follows that delay, plus a
   per-device nudge for rigs that report it wrong (menu: SYNC − / +, kept in this browser). */
const SYNCKEY = "e404-live-sync";
let nudge = 0;
try {
  nudge = Math.max(-500, Math.min(500, +localStorage.getItem(SYNCKEY) || 0));
} catch {
  /* storage blocked: no saved nudge */
}
const outLag = () => {
  const c = engine?.ctx;
  return c ? (c.outputLatency || 0) + (c.baseLatency || 0) : 0;
};
// set time as heard: while playing, the engine's time minus the output delay and the nudge
const heard = () => (engine.playing ? Math.max(0, engine.now() - outLag() - nudge / 1000) : engine.now());
function showSync() {
  const ms = Math.round(outLag() * 1000);
  $("#syncTxt").textContent = `SYNC ${nudge >= 0 ? "+" : "−"}${Math.abs(nudge)} MS`;
  $("#syncBk").title = `Output delay ${ms} ms (reported by the browser), plus your nudge`;
}
function setNudge(d) {
  nudge = d === 0 ? 0 : Math.max(-500, Math.min(500, nudge + d));
  try {
    localStorage.setItem(SYNCKEY, String(nudge));
  } catch {
    /* storage blocked: the nudge lasts for this visit */
  }
  showSync();
  toast(
    `LYRICS ${nudge === 0 ? "ON THE REPORTED DELAY" : `${Math.abs(nudge)} MS ${nudge > 0 ? "LATER" : "EARLIER"}`}`,
  );
}

/* lyrics, cues, counters: every frame */
let drawRuler = null;
function frame() {
  const t = heard();
  const k = engine.songAt(t);
  const song = TL.songs[k];
  // bar.beat from the analysed beats
  const B = TL.beats;
  let bi = -1;
  for (let i = 0; i < B.length; i++) {
    if (B[i][0] > t) break;
    bi = i;
  }
  let barN = 0,
    beatN = 0;
  if (bi >= 0) {
    beatN = B[bi][1];
    let bars = 0;
    for (let i = bi; i >= 0 && B[i][0] >= song.start - 0.05; i--) if (B[i][1] === 1) bars++;
    barN = bars;
  }
  $("#barNum").textContent = `${barN}.${beatN || 0}`;
  $$("#beats i").forEach((e, i) => e.classList.toggle("on", engine.playing && i === beatN - 1));
  $("#bpm").textContent = song.bpm;
  const cam = $("#cam");
  if (cam.dataset.c !== song.cam) {
    cam.dataset.c = song.cam;
    cam.textContent = song.cam;
    cam.style.background = camColour(song.cam);
  }
  $("#setClock").textContent = `${fmt(t)} / ${fmt(TL.duration)}`;
  renderLyrics(t, {
    sec: $("#lySec"),
    prev: $("#lyPrev"),
    cur: $("#lyCur"),
    note: $("#lyNote"),
    nxt: $("#lyNxt"),
  });
  renderCue(t, k);
  renderNext(t, k);
  drawWave(t, k);
  drawRuler?.(t, k);
  if (k !== frame.k) {
    if (frame.k !== undefined) logEv(`SONG ${songTag(k)}`, "song");
    frame.k = k;
    setBuilder?.render();
    paintCues(k);
    refreshVoxPads(k);
    lyrRain?.words(songWords(song));
  }
  requestAnimationFrame(frame);
}
function lineIndex(t) {
  const L = TL.lines;
  let lo = 0,
    hi = L.length - 1,
    ans = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (L[m].t <= t) {
      ans = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return ans; // last line that has started
}
function renderLyrics(t, el, notes = true) {
  const L = TL.lines;
  const i = lineIndex(t);
  const cur = i >= 0 && t < L[i].e + 0.6 && (!L[i + 1] || t < L[i + 1].t) ? L[i] : null;
  const nx = L[cur ? i + 1 : i + 1] || null;
  const beat = 60 / engine.bpmAt(t);
  const prev = cur ? L[i - 1] : L[i];
  const key =
    (cur
      ? `${i}:${cur.w.filter((w) => w.t <= t).length}`
      : nx
        ? `c${Math.ceil((nx.t - t) / beat)}:${i}`
        : "end") + `:${notesVer}`;
  if (key === el.key) return;
  el.key = key;
  el.sec.textContent = sectionName(cur || nx, t);
  el.prev.textContent = prev && (!cur || prev !== cur) ? prev.text : "";
  if (cur) {
    const nb = notes ? noteFor(cur.id)?.b || [] : [];
    el.cur.innerHTML = cur.w.length
      ? cur.w
          .map((w, j) => {
            const sung = w.t <= t,
              now = sung && (!cur.w[j + 1] || cur.w[j + 1].t > t);
            return `<span class="lv-w${now ? " lv-now" : sung ? " lv-sung" : ""}">${esc(w.w)}</span>${nb.includes(j) ? '<i class="lv-br">⌄</i>' : ""}`;
          })
          .join(" ")
      : `<span class="lv-w lv-now">${esc(cur.text)}</span>`;
  } else if (nx && nx.t - t <= 4 * beat && nx.n === TL.songs[engine.songAt(t)].n) {
    el.cur.innerHTML = `<span class="lv-count">${Math.max(1, Math.ceil((nx.t - t) / beat))}…</span>`;
  } else el.cur.innerHTML = `<span class="lv-rest">♪</span>`;
  // long lines (the narration) shrink so the sung line never runs past two lines
  el.cur.style.setProperty("--fit", cur ? Math.min(1, 46 / Math.max(46, cur.text.length)).toFixed(3) : 1);
  const n1 = cur ? L[i + 1] : nx,
    n2 = cur ? L[i + 2] : L[i + 2];
  el.nxt.textContent = n1 ? n1.text : "";
  // 08 · the performer's note for this line (or, in a count-in, for the line that's coming)
  if (el.note) el.note.textContent = notes ? noteFor((cur || nx)?.id)?.note || "" : "";
  if (el.nxt2) el.nxt2.textContent = n2 ? n2.text : "";
}
function sectionName(line, t) {
  if (!line) return "";
  const s = [...TL.secs].reverse().find((x) => x.n === line.n && x.t <= Math.max(t, line.t) + 0.01);
  return s ? s.name.toUpperCase() : "";
}
function renderCue(t, k) {
  const song = TL.songs[k];
  const next = TL.secs.find((s) => s.t > t + 0.05);
  const cue = $("#cue");
  if (!next || next.n !== song.n) {
    // the changeover is the next thing
    const nx = TL.songs[k + 1];
    if (!nx) return (cue.style.visibility = "hidden");
    cue.style.visibility = "visible";
    const bars = Math.ceil((nx.start - t) / engine.barLen(t));
    setCue(cue, nx.title, nx.into || "CHANGEOVER", bars);
    return;
  }
  cue.style.visibility = "visible";
  setCue(cue, next.name.toUpperCase(), next.cue.split(",")[0], Math.ceil((next.t - t) / engine.barLen(t)));
}
function setCue(cue, name, note, bars) {
  const k = `${name}|${note}|${bars}`;
  if (cue.dataset.k === k) return;
  cue.dataset.k = k;
  $("#cueName").textContent = name;
  $("#cueNote").textContent = note;
  $("#cueBars").textContent = `${bars} BAR${bars === 1 ? "" : "S"}`;
  cue.classList.toggle("hot", bars <= 1);
}
function renderNext(t, k) {
  const nx = TL.songs[k + 1];
  if (!nx) {
    $("#nxTitle").textContent = "END OF SET";
    $("#nxInto").textContent = "";
    $("#nxMeta").textContent = "";
    $("#nxIn").textContent = fmt(TL.duration - t);
    return;
  }
  $("#nxTitle").textContent = nx.title;
  $("#nxInto").textContent = nx.into;
  $("#nxMeta").innerHTML =
    `≈${nx.bpm} BPM · ${esc(nx.key.toUpperCase())} <span class="lv-cam" style="background:${camColour(nx.cam)}">${nx.cam}</span>`;
  $("#nxIn").textContent = `${fmt(nx.start - t)} · ${Math.ceil((nx.start - t) / engine.barLen(t))} BARS`;
}
/* ---------- 01 · sets: applying a running order ---------- */
let setBuilder = null,
  voice = null,
  voiceUI = null,
  notesEd = null,
  notesVer = 0,
  moves = null,
  ctrlWiz = null,
  remote = null,
  rehearse = null,
  standby = null,
  capture = null;
function paintMic(st) {
  const chip = $("#micChip");
  if (!chip) return;
  chip.classList.toggle("on", st.mic);
  chip.classList.toggle("sing", st.mic && st.singing);
  chip.querySelector("span").textContent = !st.mic
    ? "MIC OFF"
    : st.singing
      ? st.duckOn
        ? "SINGING · GUIDE DUCKED"
        : "SINGING"
      : st.toPA
        ? "MIC → PA"
        : "MIC LISTENING";
}
// Stopped: the whole set loads and the playhead goes to its start. Playing: the songs up to the one
// that's on stay as they are, the rest follow the new order, and the music carries on (a 6 ms duck
// where the plan switches over).
function applyOrder(draft) {
  const playing = engine.playing,
    t = engine.now(),
    k = playing ? engine.songAt(t) : -1;
  let order = [...draft];
  if (k >= 0) {
    const played = ORDER.slice(0, k + 1);
    order = played.concat(draft.filter((n) => !played.includes(n)));
  }
  if (order.length === ORDER.length && order.every((n, i) => n === ORDER[i])) return ORDER;
  setOrder(order);
  store.set("order", ORDER);
  engine.setTimeline(TL, k);
  if (k >= 0) engine.ready(k).then(() => engine.playing && engine.jump(engine.now()));
  else engine.seek(0);
  rebuildViews();
  logEv(`SET · ${ORDER.length} SONGS`);
  toast(
    k >= 0
      ? `SET UPDATED · ${ORDER.length} SONGS · FROM THE NEXT SONG`
      : `SET LOADED · ${ORDER.length} SONGS · ${fmt(TL.duration)}`,
  );
  return ORDER;
}
// everything drawn from the timeline is rebuilt for the new order
function rebuildViews() {
  wave = makeWave($("#waveCv"), TL);
  drawRuler = makeRuler($("#ruler"), TL.songs);
  chopCache.clear();
  frame.k = undefined;
  drawWave.read = null;
  setBuilder?.render();
  broadcast();
}

/* ---------- 03 · hot cues ---------- */
let cueList = [];
function paintCues(k) {
  cueList = cuesFor(TL, k);
  $("#cues").innerHTML =
    `<span class="lv-lbl">CUES</span>` +
    cueList
      .map(
        (c) =>
          `<button class="lv-btn lv-cue-b${c.t == null ? " empty" : ""}" type="button" data-cue="${c.id}" data-ctl="CUE ${c.id}" style="--c:${CUE_COLOURS[c.id]}" title="Tap: jump on the next bar · hold: set to this bar · key ${5 + CUE_IDS.indexOf(c.id)} (shift = set)"><span><b>${c.id}</b> ${esc(c.label)}</span></button>`,
      )
      .join("");
}
function fireCue(id) {
  if (S.locked) return;
  const c = cueList.find((x) => x.id === id);
  if (!c || c.t == null) return toast(`CUE ${id} IS EMPTY · HOLD IT TO SET IT TO THIS BAR`);
  logEv(`CUE ${id} · ${c.label}`, "cues");
  if (!engine.playing) return engine.seek(c.t);
  // land on the next bar line so the repeat (or the skip) stays in time
  const t = engine.now(),
    nb = engine.nextGrid(t + 0.03, "bar");
  engine.jump(c.t, 0, nb > t && nb - t < 4 ? engine.ctxAt(nb) : null);
  toast(`CUE ${id} · ${c.label}`);
}
function storeCue(id) {
  if (S.locked) return;
  const t = heard(),
    k = engine.songAt(t);
  saveCue(TL, k, id, engine.barStart(t));
  paintCues(k);
  toast(`CUE ${id} SET TO THIS BAR · ${TL.songs[k].title}`);
}
function startCues() {
  const host = $("#cues");
  let hold = 0,
    held = false;
  host.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("[data-cue]");
    if (!b || S.locked) return;
    try {
      b.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
    held = false;
    hold = setTimeout(() => {
      held = true;
      storeCue(b.dataset.cue);
    }, 600);
  });
  host.addEventListener("pointerup", (e) => {
    clearTimeout(hold);
    const b = e.target.closest("[data-cue]");
    if (b && !held) fireCue(b.dataset.cue);
  });
  host.addEventListener("pointercancel", () => clearTimeout(hold));
  for (const id of CUE_IDS) CTL[`CUE ${id}`] = { press: (down) => down !== false && fireCue(id) };
  paintCues(0);
}

function fireMove(name) {
  if (!moves || S.locked) return;
  logEv(name, "moves");
  moves.fire(name);
}

/* ---------- 13 · crowd prompts (the stage screen) ---------- */
const PROMPTS = ["SING IT!", "HANDS UP", "JUMP", "ARCHIVE_404"];
let prompt = null; // { text, wall }
function firePrompt(text) {
  prompt = prompt?.text === text ? null : { text, wall: Date.now() }; // a second press clears it
  logEv(`PROMPT ${text}`);
  paintPrompts();
  broadcast();
}
function setAutoPrompt(on) {
  S.autoPrompt = on;
  store.set("autoPrompt", on);
  paintPrompts();
  broadcast();
}
function paintPrompts() {
  $$("[data-prompt]").forEach((b) =>
    b.classList.toggle("on", b.dataset.prompt === "AUTO" ? S.autoPrompt : prompt?.text === b.dataset.prompt),
  );
}

/* ---------- 11 · phone remote ---------- */
function remoteState() {
  const t = heard(),
    k = engine.songAt(t),
    nx = TL.songs[k + 1];
  return {
    song: TL.songs[k]?.title,
    next: nx?.title || "",
    nextIn: nx ? fmt(nx.start - t) : "",
    playing: engine.playing,
    vox: S.vox,
    cues: cueList.map((c) => c.label),
    on: {
      ECHO: !!FXON.echo,
      REVERB: !!FXON.reverb,
      CRUSH: !!FXON.crush,
      CROWD: S.crowd,
      PANIC: S.panic,
      "LOOP 4": engine.loop?.bars === 4,
      "BUILD-UP": !!moves?.st.build,
      BREAKDOWN: !!moves?.st.breakdown,
    },
  };
}
function paintRemote(st) {
  const box = $("#rmBox");
  if (!box) return;
  const words = {
    off: "NOT PAIRED",
    pairing: "MAKING A CODE…",
    waiting: "SCAN WITH THE PHONE · WAITING",
    connected: "● PHONE CONNECTED",
    failed: "COULDN'T PAIR · NEEDS THE INTERNET (TO PAIR ONLY)",
  };
  $("#rmStatus").textContent = words[st.status] || st.status;
  $("#rmStatus").classList.toggle("ok", st.status === "connected");
  box.innerHTML =
    st.status === "waiting"
      ? `${remote.qr(st.url)}<b class="lv-rm-code">${st.code}</b><span class="lv-lbl">OR OPEN ${esc(location.host)}/live/remote/ AND TYPE THE CODE · 10 MIN</span>`
      : st.status === "connected"
        ? `<span class="lv-lbl">THE PHONE CONTROLS THE SHOW · IF IT DROPS, NOTHING STOPS</span>`
        : "";
}

/* ---------- 10 · pad lights (KeyLab and others that light a pad on note-on) ---------- */
const lights = { on: store.get("padLights", false), sent: new Map() };
function lightOn(name) {
  if (/^(ECHO|REVERB|CRUSH)$/.test(name)) return !!FXON[name.toLowerCase()];
  if (name === "CROWD") return S.crowd;
  if (name === "PANIC") return S.panic;
  if (name.startsWith("LOOP ")) return engine.loop?.bars === +name.slice(5);
  if (name.startsWith("CUE ")) return cueList.some((c) => c.id === name.slice(4) && c.t != null);
  if (name.startsWith("PAD ")) return /^PAD [ZXCV]$/.test(name) && !!voxChops["ZXCV".indexOf(name[4])];
  if (name === "BUILD-UP") return !!moves?.st.build;
  if (name === "BREAKDOWN") return !!moves?.st.breakdown;
  if (name === "PLAY") return engine.playing;
  return false;
}
function syncLights() {
  if (!lights.on || !midi.access) return;
  const outs = [...midi.access.outputs.values()];
  if (!outs.length) return;
  for (const [id, name] of Object.entries(midiMap)) {
    if (!id.startsWith("note:")) continue;
    const on = lightOn(name);
    if (lights.sent.get(id) === on) continue;
    lights.sent.set(id, on);
    const [, ch, note] = id.split(":").map(Number);
    for (const o of outs)
      try {
        o.send([0x90 | ch, note, on ? 127 : 0]);
      } catch {
        /* */
      }
  }
}

/* ---------- the phone layout (PH1): the same parts, the console as a sheet ---------- */
// AUTO switches by screen width (phones and portrait tablets, up to 900 px); PHONE / DESKTOP force it (menu → LAYOUT, saved in this browser).
// On a phone the pads panel moves into the sheet and PANIC joins play / prev / next, so it's
// always one tap away; everything goes back where it was on a wider screen.
const PHONE_MQ = matchMedia("(max-width: 900px)");
let phoneHome = null; // where the moved pieces live on the desktop
function layout() {
  const mode = store.get("layout", "auto"),
    phone = mode === "phone" || (mode === "auto" && PHONE_MQ.matches);
  $$("[data-layout]").forEach((b) => b.classList.toggle("on", b.dataset.layout === mode));
  if (phone === document.body.classList.contains("phone")) return;
  document.body.classList.toggle("phone", phone);
  const strip = $("#strip"),
    pads = $("#padsPanel"),
    panic = $("#panicBtn");
  if (phone) {
    phoneHome = { padsNext: pads.nextElementSibling, panicNext: panic.nextElementSibling };
    strip.appendChild(pads);
    $(".lv-transport").appendChild(panic);
    setTab(store.get("sheetTab", "fx"), false);
  } else if (phoneHome) {
    phoneHome.padsNext.before(pads);
    phoneHome.panicNext.before(panic);
    strip.classList.remove("open");
    pads.hidden = true;
    $("#padsBtn").classList.remove("on");
  }
  drawWave.read = null;
}
// a tab opens the sheet on it; the open tab again (or the handle) closes it
function setTab(tab, open = true) {
  const strip = $("#strip");
  const same = strip.dataset.tab === tab && strip.classList.contains("open");
  strip.dataset.tab = tab;
  strip.classList.toggle("open", open && !same);
  store.set("sheetTab", tab);
  $$("#sheetTabs [data-tab]").forEach((b) =>
    b.classList.toggle("on", b.dataset.tab === tab && strip.classList.contains("open")),
  );
  $("#padsPanel").hidden = !(tab === "pads" && strip.classList.contains("open"));
}
function startLayout() {
  layout();
  PHONE_MQ.addEventListener?.("change", layout);
  $$("[data-layout]").forEach(
    (b) =>
      (b.onclick = () => {
        store.set("layout", b.dataset.layout);
        layout();
      }),
  );
  $("#sheetTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) setTab(b.dataset.tab);
  });
  $("#sheetGrab").onclick = () =>
    setTab($("#strip").dataset.tab || "fx", !$("#strip").classList.contains("open"));
  // a downward swipe on the sheet closes it, an upward one opens it
  let y0 = null;
  $("#strip").addEventListener("touchstart", (e) => (y0 = e.touches[0].clientY), { passive: true });
  $("#strip").addEventListener(
    "touchend",
    (e) => {
      if (y0 == null || !document.body.classList.contains("phone")) return;
      const dy = e.changedTouches[0].clientY - y0;
      y0 = null;
      if (Math.abs(dy) < 40) return;
      const open = $("#strip").classList.contains("open");
      if (dy > 0 && open) setTab($("#strip").dataset.tab, false);
      if (dy < 0 && !open) setTab($("#strip").dataset.tab || "fx");
    },
    { passive: true },
  );
}

/* ---------- 02 · show clock + curfew ---------- */
const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
function clock() {
  if (!engine) return;
  const t = heard(),
    left = Math.max(0, TL.duration - t) / (engine.rate || 1),
    cf = store.get("curfew", ""),
    now = new Date();
  let html = `<span>SET LEFT <b>${fmt(left)}</b></span>`,
    over = 0,
    skip = null,
    ends = engine.playing ? `ENDS ${hhmm(new Date(now.getTime() + left * 1000))}` : "";
  if (cf) {
    const [h, m] = cf.split(":").map(Number),
      c = new Date(now);
    c.setHours(h, m, 0, 0);
    if (c - now < -6 * 3600e3) c.setDate(c.getDate() + 1); // a curfew after midnight
    const toCurfew = (c - now) / 1000;
    over = left - Math.max(0, toCurfew);
    html += `<span>CURFEW <b>${toCurfew > 0 ? fmt(toCurfew) : "PASSED"}</b></span>`;
    ends = `ENDS ${hhmm(new Date(now.getTime() + left * 1000))} · CURFEW ${cf}${over > 0 ? ` · ${fmt(over)} OVER` : ""}`;
    if (over > 5) {
      skip = skipSuggestion(TL, engine.songAt(t), over);
      html += `<span class="lv-over">▲ ${fmt(over)} OVER</span>`;
      if (skip)
        html += `<button class="lv-btn lv-skip" type="button" data-skip="${skip.n}"><span>SKIP ${esc(skip.title)} (${fmt(skip.frames / TL.sr)})?</span></button>`;
    }
  }
  setBuilder?.ends(ends);
  if (clock.k === html) return;
  clock.k = html;
  $("#clockChip").innerHTML = html;
  $("#clockChip").classList.toggle("over", over > 5);
}
function skipSong(n) {
  if (S.locked) return;
  const s = TL.songs.find((x) => x.n === n);
  applyOrder(ORDER.filter((x) => x !== n));
  setBuilder?.sync();
  clock.k = null;
  toast(`SKIPPING ${s?.title || n} · SET NOW ${fmt(TL.duration)}`);
}

/* ---------- 04 · show safety ---------- */
function paintSafety(st) {
  const rows = safetyRows(st),
    bad = rows.filter((r) => r[0] === false).length,
    chip = $("#safeChip");
  if (!chip) return;
  chip.classList.toggle("bad", bad > 0);
  chip.querySelector("span").textContent = bad ? `! ${bad} TO CHECK` : "ALL GOOD";
  $("#safePanel").innerHTML = rows
    .map(
      ([ok, label, note]) =>
        `<li class="${ok === false ? "warn" : ok ? "ok" : "na"}"><i></i>${label}<em>${esc(note)}</em></li>`,
    )
    .join("");
}

/* ---------- console ---------- */
const FADERS = [
  ["VOX", () => S.vox, (v) => setVox(v)],
  ["LOW", () => S.eq.low, (v) => ((S.eq.low = v), engine.setEq("low", v))],
  ["MID", () => S.eq.mid, (v) => ((S.eq.mid = v), engine.setEq("mid", v))],
  ["HIGH", () => S.eq.high, (v) => ((S.eq.high = v), engine.setEq("high", v))],
  [
    "MASTER",
    () => S.master,
    (v) => ((S.master = v), (engine.masterLevel = v), !S.panic && engine.setMaster(v)),
  ],
];
const CTL = {}; // name -> {set(v 0..1), press(on)}
const FXON = {}; // echo / reverb / crush on?
// the moves (09) switch effects too: keep the buttons and the state in step
function fxUI(fx, on) {
  FXON[fx] = on;
  $(`[data-fx="${fx}"]`)?.classList.toggle("on", on);
}
// one way in for the phone remote (11) and anything else: a press (down / up) or a level (0..1)
function control(name, v) {
  const ctl = CTL[name];
  if (!ctl) return;
  if (typeof v === "number") return ctl.set?.(v);
  if (!ctl.press || (v === false && !ctl.hold)) return;
  ctl.press(v);
}
function setVox(v) {
  S.vox = v;
  engine.setVox(v);
  S.crowd = v < 0.05;
  $("#crowdBtn").classList.toggle("on", S.crowd);
  $("#lyr").classList.toggle("crowd", S.crowd);
  broadcast();
}
// P2 · ring knobs: drag up / down (or a MIDI CC) to turn, double-click to reset. FILTER is bipolar.
const R = 21,
  K0 = 135; // the ring runs 270° from bottom-left (135°) clockwise
const polar = (deg) => [26 + R * Math.cos((deg * Math.PI) / 180), 26 + R * Math.sin((deg * Math.PI) / 180)];
const arc = (d0, d1) => {
  if (Math.abs(d1 - d0) < 0.5) return "";
  const [a, b] = [Math.min(d0, d1), Math.max(d0, d1)],
    [x0, y0] = polar(a),
    [x1, y1] = polar(b);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
function knobHTML(n) {
  return `<div class="lv-kn" data-knob="${n}" data-ctl="${n}"><svg viewBox="0 0 52 52" aria-hidden="true"><circle class="trk" cx="26" cy="26" r="${R}"/><path class="val" d=""/><line class="ptr" x1="26" y1="26" x2="26" y2="8"/></svg><span class="lv-lbl">${n}</span></div>`;
}
function buildStrip() {
  const knobs = [...FADERS, ["FILTER", () => (S.filter + 1) / 2, (v) => setFilter(v * 2 - 1), true]];
  $("#faders").innerHTML = knobs.map(([n]) => knobHTML(n)).join("");
  for (const [n, get, set, bi] of knobs) {
    const k = $(`[data-knob="${n}"]`),
      val = $(".val", k),
      ptr = $(".ptr", k);
    const paint = (v) => {
      const deg = K0 + v * 270;
      val.setAttribute("d", bi ? arc(270, deg) : arc(K0, deg));
      const [x, y] = polar(deg);
      ptr.setAttribute("x2", 26 + (x - 26) * 0.66);
      ptr.setAttribute("y2", 26 + (y - 26) * 0.66);
      k.setAttribute("aria-valuenow", Math.round(v * 100));
    };
    const apply = (v) => {
      v = Math.max(0, Math.min(1, v));
      if (bi && Math.abs(v - 0.5) < 0.02) v = 0.5;
      set(v);
      paint(v);
    };
    CTL[n] = { set: apply };
    k.setAttribute("role", "slider");
    k.setAttribute("aria-label", n);
    paint(get());
    k.addEventListener("pointerdown", (e) => {
      if (S.locked) return;
      e.preventDefault();
      const y0 = e.clientY,
        v0 = get();
      const mv = (ev) => apply(v0 + (y0 - ev.clientY) / 160);
      const up = () => {
        removeEventListener("pointermove", mv);
        removeEventListener("pointerup", up);
      };
      addEventListener("pointermove", mv);
      addEventListener("pointerup", up);
    });
    k.addEventListener("dblclick", () => !S.locked && apply(bi ? 0.5 : 1));
  }
}
function setFilter(v) {
  S.filter = Math.max(-1, Math.min(1, v));
  engine.setFilter(Math.abs(S.filter) < 0.04 ? 0 : S.filter);
}
function wireControls() {
  $("#playBtn").onclick = () =>
    !S.locked && (engine.playing ? (engine.pause(), moves?.reset()) : engine.play());
  CTL.PLAY = { press: (d) => d !== false && $("#playBtn").click() };
  CTL.PREV = { press: (d) => d !== false && $("#prevBtn").click() };
  CTL.NEXT = { press: (d) => d !== false && $("#nextBtn").click() };
  $("#prevBtn").onclick = () => {
    if (S.locked) return;
    const t = engine.now(),
      k = engine.songAt(t);
    engine.seek(t - TL.songs[k].start > 3 || k === 0 ? TL.songs[k].start : TL.songs[k - 1].start);
  };
  $("#nextBtn").onclick = () => {
    if (S.locked) return;
    const k = engine.songAt(engine.now());
    if (TL.songs[k + 1]) engine.seek(TL.songs[k + 1].start);
  };
  // FX: they fire the moment the button goes down (not on release). ECHO / REVERB / CRUSH: a tap turns
  // them on or off; holding more than 1/4 s from off is a throw (on only while held). ROLL and TAPE STOP
  // are held, and slip: on release the set carries on where it would have been, in time.
  const fxOn = FXON;
  const HOLD_MS = 250;
  $$("[data-fx]").forEach((b) => {
    const fx = b.dataset.fx;
    let downAt = 0,
      fromOff = false;
    const set = (on) => {
      if (!!fxOn[fx] !== on) logEv(`${fx.toUpperCase()} ${on ? "ON" : "OFF"}`, "fx");
      fxOn[fx] = on;
      b.classList.toggle("on", on);
      if (fx === "echo") engine.setEcho(on);
      if (fx === "reverb") engine.setReverb(on);
      if (fx === "crush") engine.setCrush(on);
    };
    const press = (down) => {
      if (S.locked) return;
      if (fx === "roll") {
        if (down) engine.rollOn(0.25);
        else engine.rollOff();
        return b.classList.toggle("on", down && !!engine.slip);
      }
      if (fx === "tapestop") {
        if (down) engine.tapeOn();
        else engine.tapeOff();
        return b.classList.toggle("on", down && !!engine.slip);
      }
      if (down) {
        downAt = performance.now();
        fromOff = !fxOn[fx];
        set(!fxOn[fx]);
      } else if (fromOff && fxOn[fx] && performance.now() - downAt > HOLD_MS) set(false);
    };
    CTL[b.dataset.ctl] = { press, hold: true };
    b.addEventListener("pointerdown", (e) => {
      try {
        b.setPointerCapture(e.pointerId); // the release lands here even if the finger slides off
      } catch {
        /* */
      }
      press(true);
    });
    b.addEventListener("pointerup", () => press(false));
    b.addEventListener("pointercancel", () => press(false));
  });
  // beat loops (bars, from the current bar's downbeat)
  $$("[data-loop]").forEach((b) => {
    const press = () => {
      if (S.locked || !engine.playing) return;
      const n = +b.dataset.loop;
      if (engine.loop && engine.loop.bars === n) return engine.clearLoop();
      const t = engine.now(),
        st = engine.barStart(t),
        song = TL.songs[engine.songAt(t)];
      const end = Math.min(st + n * engine.barLen(t), song.start + song.frames / TL.sr);
      engine.setLoop(st, end);
      if (engine.loop) engine.loop.bars = n;
      logEv(`LOOP ${n}`, "loops");
      engine.onstate();
    };
    CTL[b.dataset.ctl] = { press };
    b.addEventListener("pointerdown", press);
  });
  // rehearse: loop the current section at 85 %
  $("#rehBtn").onclick = () => {
    if (S.locked) return;
    const b = $("#rehBtn");
    if (b.classList.contains("on")) {
      b.classList.remove("on");
      engine.clearLoop();
      engine.setRate(1);
      return;
    }
    const t = engine.now(),
      k = engine.songAt(t),
      song = TL.songs[k];
    const secs = TL.secs.filter((s) => s.n === song.n);
    const cur = [...secs].reverse().find((s) => s.t <= t) || secs[0];
    const nxt = secs[secs.indexOf(cur) + 1];
    const end = nxt ? nxt.t : song.start + song.frames / TL.sr;
    b.classList.add("on");
    engine.setRate(0.85);
    setTimeout(() => engine.setLoop(Math.max(song.start, cur.t - 0.2), end), 200);
    toast(`REHEARSING ${cur.name.toUpperCase()} · 85% · TAP AGAIN TO STOP`);
  };
  $("#padsBtn").onclick = () => {
    if (document.body.classList.contains("phone")) return setTab("pads");
    const p = $("#padsPanel");
    p.hidden = !p.hidden;
    $("#padsBtn").classList.toggle("on", !p.hidden);
    $('[data-view="pads"]').classList.toggle("on", !p.hidden);
  };
  CTL.PADS = { press: () => $("#padsBtn").click() };
  // safety
  $("#panicBtn").onclick = () => {
    S.panic = !S.panic;
    engine.panic(S.panic);
    if (S.panic) moves?.reset();
    logEv(S.panic ? "PANIC · FADE" : "PANIC · RESTORE", S.panic ? "panics" : undefined);
    $("#panicBtn").classList.toggle("on", S.panic);
    $("#panicBtn span").textContent = S.panic ? "FADED · TAP TO RESTORE" : "PANIC · FADE";
  };
  CTL.PANIC = { press: () => $("#panicBtn").click() };
  // LOCK (strip, nav, menu): one tap locks the console, hold 1 s to unlock
  let hold = 0;
  $$("[data-lock]").forEach((b) => {
    b.addEventListener("pointerdown", () => {
      if (!S.locked) return setLock(true);
      hold = setTimeout(() => setLock(false), 1000);
    });
    b.addEventListener("pointerup", () => clearTimeout(hold));
    b.addEventListener("pointerleave", () => clearTimeout(hold));
  });
  $("#crowdBtn").onclick = () => {
    if (S.locked) return;
    CTL.VOX.set(S.crowd ? (S.voxBefore ?? 1) : ((S.voxBefore = S.vox), 0));
  };
  CTL.CROWD = { press: () => $("#crowdBtn").click() };
  $("#stageBtn").onclick = openStage;
  $("#recBtn").onclick = toggleRec;
  $("#midiBtn").onclick = midi;
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input,select,textarea") || e.metaKey || e.ctrlKey) return;
    if (e.code === "Space") {
      e.preventDefault();
      $("#playBtn").click();
      return;
    }
    if (e.shiftKey && /^Digit[1-4]$/.test(e.code) && !e.repeat) return fireMove(MOVES[+e.code.slice(5) - 1]);
    const cue = /^Digit[5-8]$/.test(e.code) ? CUE_IDS[+e.code.slice(5) - 5] : null;
    if (cue && !e.repeat) return e.shiftKey ? storeCue(cue) : fireCue(cue);
    const pad = PAD_DEFS.find((p) => p.key === e.key.toUpperCase());
    if (pad && !e.repeat) padDown(pad);
  });
  addEventListener("keyup", (e) => {
    const pad = PAD_DEFS.find((p) => p.key === e.key.toUpperCase());
    if (pad) padUp(pad);
  });
  setInterval(broadcast, 500);
  $("#clockChip").addEventListener("click", (e) => {
    const b = e.target.closest("[data-skip]");
    if (b) skipSong(+b.dataset.skip);
  });
  $("#safeChip").onclick = () => ($("#safePanel").hidden = !$("#safePanel").hidden);
}
function openPrompter() {
  window.open("/live/?prompter", "e404-prompter", "popup,width=1280,height=720");
  setTimeout(broadcast, 800);
}
function openStage() {
  window.open("/live/?stage", "e404-stage", "popup,width=1280,height=720");
  setTimeout(broadcast, 800);
}
function setLock(on) {
  S.locked = on;
  document.body.classList.toggle("lv-locked", on);
  $("#lockBtn").classList.toggle("on", on);
  $("#lockBtn span").textContent = on ? "LOCKED · HOLD" : "LOCK";
  $$(".e-split-dl[data-lock]").forEach((b) => (b.textContent = on ? "LOCKED · HOLD" : "LOCK ↺"));
}

/* ---------- the vault's menu: burger → slat wipe ---------- */
function setMenu(o) {
  const menu = $("#lvMenu"),
    burger = $("#burger");
  menu.classList.toggle("is-open", o);
  menu.setAttribute("aria-hidden", !o);
  menu.inert = !o;
  burger.setAttribute("aria-expanded", o);
  burger.classList.toggle("is-open", o);
  burger.setAttribute("aria-label", o ? "Close menu" : "Open menu");
}
const DRAWERS = {
  setlist: "#drawer",
  voice: "#voiceDrawer",
  notes: "#notesDrawer",
  rehearse: "#rehearseDrawer",
  remote: "#remoteDrawer",
  ctrl: "#ctrlDrawer",
  capture: "#captureDrawer",
};
function openDrawer(name) {
  for (const [v, sel] of Object.entries(DRAWERS)) {
    $(sel).hidden = v !== name;
    $(`[data-view="${v}"]`)?.classList.toggle("on", v === name);
  }
  if (name === "setlist") ($("#setl li.now") || $("#setl li"))?.scrollIntoView({ block: "center" });
  if (name === "notes") notesEd?.open();
  if (name === "voice") voiceUI?.fillDevices();
  if (name === "rehearse") rehearse?.render();
  if (name === "remote" && remote && remote.st.status !== "connected" && remote.st.status !== "waiting")
    remote.pair();
  if (name === "ctrl") ctrlWiz?.render();
  if (name === "capture") paintCapture();
}
const drawerOpen = () => Object.keys(DRAWERS).find((v) => !$(DRAWERS[v]).hidden) || null;
function startMenu() {
  $$("[data-sync]").forEach((b) => (b.onclick = () => setNudge(+b.dataset.sync)));
  showSync();
  $("#drawerX").onclick = () => openDrawer(null);
  $("#voiceX").onclick = () => openDrawer(null);
  $("#notesX").onclick = () => openDrawer(null);
  $("#rhX").onclick = () => openDrawer(null);
  $("#ctrlX").onclick = () => openDrawer(null);
  $("#remoteX").onclick = () => openDrawer(null);
  $("#captureX").onclick = () => openDrawer(null);
  $("#rmNew").onclick = () => remote.pair();
  $("#rmOff").onclick = () => remote.close();
  $$("[data-open]").forEach(
    (b) =>
      (b.onclick = () => {
        setMenu(false);
        openDrawer(b.dataset.open);
      }),
  );
  $("#micChip").onclick = () => openDrawer(drawerOpen() === "voice" ? null : "voice");
  $("#burger").onclick = () => setMenu(!$("#lvMenu").classList.contains("is-open"));
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#lvMenu").classList.contains("is-open")) setMenu(false);
    else if (drawerOpen()) openDrawer(null);
    else if (!$("#padsPanel").hidden) $("#padsBtn").click();
  });
  $$("[data-view]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      setMenu(false);
      const v = a.dataset.view,
        pads = $("#padsPanel");
      if (v === "stage") return openStage();
      if (v === "prompter") return openPrompter();
      // PADS and SETLIST toggle: a second click closes what the first one opened
      if (v === "pads") return $("#padsBtn").click();
      if (!pads.hidden) $("#padsBtn").click();
      openDrawer(DRAWERS[v] && drawerOpen() !== v ? v : null);
    }),
  );
  // the REC readout in the nav: Nº404 when idle, the recording's running time when recording
  setInterval(() => {
    const bk = $("#recBk");
    bk.classList.toggle("lv-rec-on", !!rec);
    bk.textContent = rec ? `REC ${fmt((Date.now() - rec.t0) / 1000)}` : "Nº404";
    $("#recMenuBk").classList.toggle("lv-rec-on", !!rec);
  }, 250);
}

/* ---------- W4 waveform strip: deck, vocal lane, section map (click the map to jump) ---------- */
let wave = null;
function startWave() {
  const cv = $("#waveCv");
  cv.style.height = WAVE_H + "px";
  wave = makeWave(cv, TL);
  cv.addEventListener("click", (e) => {
    if (S.locked) return;
    const r = cv.getBoundingClientRect(),
      k = engine.songAt(engine.now());
    const t = wave.hit(e.clientX - r.left, e.clientY - r.top, k);
    if (t != null) engine.seek(TL.songs[k].start + t);
  });
}
function drawWave(t, k) {
  if (!wave) return;
  const s0 = TL.songs[k].start,
    marks = cueList.filter((c) => c.t != null).map((c) => ({ t: c.t - s0, id: c.id, c: CUE_COLOURS[c.id] }));
  const o = wave.draw(t - s0, k, marks);
  if (!o) return;
  const read = `${esc(o.title)} · ${esc(o.read)}<b>${o.bars} BAR${o.bars === 1 ? "" : "S"}</b>`;
  if (drawWave.read !== read) $("#waveRead").innerHTML = drawWave.read = read;
}

/* ---------- digital rain behind the lyrics (R2), streaming the words of the song that's on ---------- */
let lyrRain = null;
function songWords(song) {
  const w = [
    ...new Set(
      TL.lines
        .filter((l) => l.n === song.n)
        .flatMap((l) => l.text.toUpperCase().split(/\s+/))
        .map((x) => x.replace(/[^A-Z0-9_']/g, ""))
        .filter((x) => x.length > 2),
    ),
  ];
  return w.length ? [song.title, ...w] : TITLE_WORDS;
}
function startLyricRain() {
  if (REDUCE) return;
  const cv = $("#lyrRain"),
    song = () => TL.songs[engine.songAt(engine.now())];
  const start = () => {
    lyrRain?.stop();
    lyrRain = rain(cv, songWords(song()));
    if (!engine.playing) lyrRain.pause();
  };
  start();
  let rt = 0;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(start, 250);
  });
}

/* ---------- pads ---------- */
// Vocal pads (Z X C V): four chops of the playing song's hook, cut from its own vocal (master minus
// instrumental) on the word timings: 1 the opening phrase · 2 the punchiest word · 3 the last word ·
// 4 the longest held word. They fire the instant they're hit, go through the effects like the song, a new
// hit chokes the one still ringing, and holding one repeats it every 1/8. The next song's chops are cut
// while the current one plays, so they're ready at the changeover.
let voxChops = [],
  lastVox = null;
const chopCache = new Map(); // song index -> chops
const held = new Map(); // pad key -> repeat timer
const padLabel = (p) =>
  p.fx ? "HOLD" : p.q === 0 ? "NOW" : p.q === "bar" ? "BAR" : p.q === 1 ? "BEAT" : "1/16";
function buildPads() {
  $("#padsPanel").innerHTML = `<div class="lv-moves">${MOVES.map(
    (m, i) =>
      `<button class="lv-move" type="button" data-move-btn="${m}" data-ctl="${m}"><b>${m}</b><small>SHIFT ${i + 1} · ${["8 BARS · DROPS ITSELF", "ON THE 1", "ON / OFF", "INTO THE NEXT SONG"][i]}</small></button>`,
  ).join("")}</div><div class="lv-prompts"><span class="lv-lbl">STAGE</span>${PROMPTS.map(
    (p) =>
      `<button class="lv-btn" type="button" data-prompt="${p}" data-ctl="PROMPT ${p}"><span>${p}</span></button>`,
  ).join(
    "",
  )}<button class="lv-btn" type="button" data-prompt="AUTO"><span>AUTO SING IT! AT HOOKS</span></button></div><div class="lv-padgrid">${PAD_DEFS.map(
    (p) =>
      `<button class="lv-pad${p.vox !== undefined ? " vox" : ""}" data-pad="${p.key}" data-ctl="PAD ${p.key}"><span>${p.name}</span><small>${p.key} · ${padLabel(p)}</small></button>`,
  ).join("")}</div>`;
  $$(".lv-pad").forEach((b) => {
    const pad = PAD_DEFS.find((p) => p.key === b.dataset.pad);
    CTL[b.dataset.ctl] = { press: (down) => (down ? padDown(pad) : padUp(pad)), hold: true };
    b.addEventListener("pointerdown", (e) => {
      try {
        b.setPointerCapture(e.pointerId);
      } catch {
        /* */
      }
      padDown(pad);
    });
    b.addEventListener("pointerup", () => padUp(pad));
    b.addEventListener("pointercancel", () => padUp(pad));
  });
}
function chopPicks(song) {
  const lines = TL.lines.filter((l) => l.n === song.n && l.w.length);
  const hooks = TL.secs.filter((s) => s.n === song.n && /hook|chorus/i.test(s.name));
  const first = hooks[0];
  const H = first ? first.lines.map((i) => TL.lines[i]).filter((l) => l && l.w.length) : [];
  const src = H.length ? H : lines;
  if (!src.length) return [];
  const wEnd = (l, j) => l.w[j].e ?? l.w[j + 1]?.t ?? l.w[j].t + 0.35;
  const words = src.flatMap((l) => l.w.map((w, j) => ({ w: w.w, t: w.t, e: wEnd(l, j) })));
  const open = src[0],
    j3 = Math.min(2, open.w.length - 1);
  const lastL = src[src.length - 1],
    lastJ = lastL.w.length - 1;
  // each pad is a different moment: later picks skip words an earlier pad already uses
  return [
    {
      w: open.w
        .slice(0, j3 + 1)
        .map((w) => w.w)
        .join(" "),
      t: open.w[0].t,
      e: wEnd(open, j3),
    },
    { from: words.filter((w) => w.e - w.t > 0.12 && w.e - w.t < 0.45), by: "energy" }, // punchy
    { w: lastL.w[lastJ].w, t: lastL.w[lastJ].t, e: wEnd(lastL, lastJ) },
    { from: words, by: "length" }, // the longest held word
  ];
}
async function cutChops(k) {
  if (chopCache.has(k)) return chopCache.get(k);
  const song = TL.songs[k];
  if (!song) return [];
  try {
    await engine.ready(k);
  } catch {
    return [];
  }
  const m = engine.bufs.get(`${k}:m`),
    i = engine.bufs.get(`${k}:i`);
  if (!m || !i) return [];
  const at = (t) => t - song.start;
  const energy = (w) => {
    const sr = m.sampleRate,
      a = Math.floor(at(w.t) * sr),
      b = Math.floor(at(w.e) * sr),
      M = m.getChannelData(0),
      I = i.getChannelData(0);
    let s = 0;
    for (let x = a; x < b; x++) s += (M[x] - I[x]) ** 2;
    return s / Math.max(1, b - a);
  };
  const used = [];
  const free = (w) => !used.some((u) => w.t < u.e - 0.02 && w.e > u.t + 0.02);
  const chops = chopPicks(song).map((p) => {
    if (p.from) {
      const score = p.by === "energy" ? energy : (w) => w.e - w.t;
      p = p.from.filter(free).sort((x, y) => score(y) - score(x))[0];
      if (!p) return null;
      p = { ...p, e: Math.min(p.e, p.t + 1.2) };
    } else if (!free(p) && used.length) return null;
    used.push(p);
    const buf = vocalChop(engine.ctx, m, i, at(p.t) - 0.015, at(p.e) + 0.02);
    return buf ? { buf, word: p.w } : null;
  });
  chopCache.set(k, chops);
  for (const key of [...chopCache.keys()]) if (key !== k && key !== k + 1) chopCache.delete(key);
  return chops;
}
async function refreshVoxPads(k) {
  const chops = await cutChops(k);
  if (frame.k !== undefined && frame.k !== k) return; // moved on while cutting: a later call owns the pads
  voxChops = chops;
  $$(".lv-pad.vox").forEach((b, j) => {
    const c = voxChops[j];
    $("span", b).textContent = c ? `“${c.word.replace(/[^\w' ]/g, "").toUpperCase()}”` : `VOX ${j + 1}`;
  });
  if (TL.songs[k + 1]) cutChops(k + 1); // ready before the changeover
}
function flash(pad, when = engine.ctx.currentTime) {
  const b = $(`.lv-pad[data-pad="${pad.key}"]`);
  if (!b) return;
  setTimeout(
    () => {
      b.classList.remove("hit");
      void b.offsetWidth;
      b.classList.add("hit");
      setTimeout(() => b.classList.remove("hit"), 120);
    },
    Math.max(0, (when - engine.ctx.currentTime) * 1000),
  );
}
function fireVox(pad, when) {
  const c = voxChops[pad.vox];
  if (!c) return;
  if (lastVox) {
    // choke: one vocal voice at a time
    const g = lastVox.g.gain;
    g.cancelScheduledValues(when);
    g.setValueAtTime(g.value, when);
    g.linearRampToValueAtTime(0, when + 0.005);
    try {
      lastVox.s.stop(when + 0.01);
    } catch {
      /* */
    }
  }
  const s = new AudioBufferSourceNode(engine.ctx, { buffer: c.buf }),
    g = new GainNode(engine.ctx);
  s.connect(g).connect(engine.song); // through the EQ, filter and effects, like the song
  s.start(when);
  lastVox = { s, g };
  flash(pad, when);
}
function padDown(pad) {
  if (S.locked || !engine?.ctx) return;
  const ctx = engine.ctx;
  if (pad.fx === "tapestop") return (flash(pad), engine.tapeOn());
  if (pad.fx === "stutter") return (flash(pad), engine.rollOn(0.125));
  if (pad.vox !== undefined) {
    const now = ctx.currentTime;
    fireVox(pad, now);
    // hold to repeat every 1/8 on the song's grid
    if (engine.playing) {
      const step = 30 / engine.bpmAt(engine.now());
      let next = engine.ctxAt(engine.nextGrid(engine.now() + step * 0.5, 0.5));
      clearInterval(held.get(pad.key));
      held.set(
        pad.key,
        setInterval(() => {
          while (next < ctx.currentTime + 0.1) {
            if (next > now + step * 0.5) fireVox(pad, next);
            next += step / engine.rate;
          }
        }, 25),
      );
    }
    return;
  }
  const buf = kit?.[pad.name];
  if (!buf) return;
  // drums quantised to the song's own grid while playing
  let when = ctx.currentTime;
  if (engine.playing && pad.q) {
    const w = engine.ctxAt(engine.nextGrid(engine.now(), pad.q));
    if (w - ctx.currentTime < (pad.q === "bar" ? 8 : 1.2)) when = Math.max(ctx.currentTime, w);
  }
  const s = new AudioBufferSourceNode(ctx, { buffer: buf });
  s.connect(engine.pads);
  s.start(when);
  flash(pad, when);
}
function padUp(pad) {
  if (pad.fx === "tapestop") return engine.tapeOff();
  if (pad.fx === "stutter") return engine.rollOff();
  clearInterval(held.get(pad.key));
  held.delete(pad.key);
}

/* ---------- record ---------- */
let rec = null;
// 16 · REC: the show mix + the mic as WAVs, a cue sheet and a show report (capture.js)
async function toggleRec() {
  if (!engine || !capture) return;
  if (capture.st.on) {
    $("#recTxt").textContent = "SAVING…";
    await capture.stop();
    rec = null;
    $("#recBtn").classList.remove("on");
    $("#recTxt").textContent = "● RECORD THE SHOW";
    paintCapture();
    setMenu(false);
    openDrawer("capture");
    return toast("SHOW SAVED · DOWNLOAD THE FILES");
  }
  try {
    await capture.start();
  } catch {
    return toast("COULDN'T START RECORDING IN THIS BROWSER");
  }
  rec = { t0: capture.st.t0 };
  $("#recBtn").classList.add("on");
  $("#recTxt").textContent = "■ STOP RECORDING";
  logEv(`SONG ${songTag(engine.songAt(heard()))}`, "song");
  setMenu(false);
  toast(
    voice?.st.mic
      ? "RECORDING · SHOW MIX + YOUR MIC"
      : "RECORDING · SHOW MIX (TURN THE MIC ON TO RECORD IT TOO)",
  );
}
const songTag = (k) => `${String(TL.songs[k]?.n).padStart(2, "0")} ${TL.songs[k]?.title}`;
function logEv(text, kind) {
  capture?.log(text, kind);
}
function paintCapture() {
  const f = capture.st.files;
  $("#capList").innerHTML = f.length
    ? f
        .map(
          (x, i) =>
            `<li><span>${esc(x.name)}</span><em>${(x.blob.size / 1e6).toFixed(x.blob.size > 1e6 ? 0 : 2)} MB</em><button class="lv-sb-x" type="button" data-cap="${i}" aria-label="Download ${esc(x.name)}">↓</button></li>`,
        )
        .join("")
    : `<li><span class="lv-lbl">NOTHING RECORDED YET · MENU → ● RECORD THE SHOW</span></li>`;
  $("#capReport").textContent = capture.st.report || "";
}

/* ---------- MIDI: connect, then learn (click a control, move a knob / hit a pad) ---------- */
const MAPKEY = "e404-live-midi";
let midiMap = {};
try {
  midiMap = JSON.parse(localStorage.getItem(MAPKEY) || "{}");
} catch {
  midiMap = {};
}
let learnFor = null;
// connect (once): true when MIDI is on
async function midiConnect() {
  if (midi.access) return true;
  if (!navigator.requestMIDIAccess) {
    toast("MIDI ISN'T AVAILABLE IN THIS BROWSER (USE CHROME OR EDGE)");
    return false;
  }
  try {
    midi.access = await navigator.requestMIDIAccess();
  } catch {
    toast("MIDI ACCESS WAS DECLINED");
    return false;
  }
  const hook = () => midi.access.inputs.forEach((inp) => (inp.onmidimessage = onMidi));
  hook();
  midi.access.onstatechange = hook;
  $("#midiBtn").classList.add("on");
  $("#midiTxt").textContent = `MIDI · ${midi.access.inputs.size} IN`;
  return true;
}
async function midi() {
  if (!midi.access) {
    if (await midiConnect()) toast("MIDI CONNECTED · TAP MIDI AGAIN TO LEARN");
    return;
  }
  learnFor = learnFor ? null : "pick";
  document.body.classList.toggle("lv-learn", !!learnFor);
  if (learnFor) {
    setMenu(false); // the controls to learn are under the menu
    toast("MIDI LEARN · CLICK A CONTROL, THEN MOVE A KNOB OR HIT A PAD");
  }
  $("#midiTxt").textContent = learnFor ? "LEARN · CLICK A CONTROL" : `MIDI · ${midi.access.inputs.size} IN`;
}
document.addEventListener(
  "click",
  (e) => {
    if (learnFor !== "pick") return;
    const el = e.target.closest("[data-ctl]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    learnFor = el.dataset.ctl;
    $("#midiTxt").textContent = `LEARN · MOVE A CONTROL FOR ${learnFor}`;
    toast(`NOW MOVE A CONTROL FOR ${learnFor}`);
  },
  true,
);
function onMidi(e) {
  if (standby?.feed(e.data)) return; // Ableton's position feed (channel 16 CC 110-115), never learnable
  const [st, d1, d2] = e.data;
  const type = st & 0xf0;
  const id = `${type === 0xb0 ? "cc" : "note"}:${st & 0x0f}:${d1}`;
  if (ctrlWiz?.active() && (type === 0xb0 || (type === 0x90 && d2 > 0)) && ctrlWiz.learn(id)) return;
  if (learnFor && learnFor !== "pick" && (type === 0xb0 || (type === 0x90 && d2 > 0))) {
    midiMap[id] = learnFor;
    try {
      localStorage.setItem(MAPKEY, JSON.stringify(midiMap));
    } catch {
      /* not saved */
    }
    toast(`${learnFor} ← ${id.toUpperCase()}`);
    learnFor = null;
    document.body.classList.remove("lv-learn");
    $("#midiTxt").textContent = `MIDI · ${midi.access.inputs.size} IN`;
    return;
  }
  const ctl = CTL[midiMap[id]];
  if (!ctl) return;
  if (type === 0xb0 && ctl.set) ctl.set(d2 / 127);
  else if (type === 0xb0 && ctl.press) {
    // an encoder or a CC button on a press control: up past half = press, back = release
    const now = performance.now();
    if (d2 >= 64 && !(ctl.ccAt && now - ctl.ccAt < 300)) {
      ctl.ccAt = now;
      ctl.press(true);
    } else if (d2 < 64 && ctl.hold) ctl.press(false);
  } else if (type === 0x90 && d2 > 0 && ctl.press) ctl.press(true);
  else if ((type === 0x80 || (type === 0x90 && d2 === 0)) && ctl.press && ctl.hold) ctl.press(false);
}

/* ---------- stage screen (a second window for a projector) ---------- */
// stamped with the wall clock: each window's performance.now() starts from its own zero
function broadcast() {
  if (!bc || !engine) return;
  bc.postMessage({
    t: heard(),
    wall: Date.now(),
    playing: engine.playing && !engine.loop,
    rate: engine.rate,
    crowd: S.crowd,
    order: ORDER,
    notes: notesVer,
    prompt,
    autoPrompt: S.autoPrompt,
  });
}
// the stage screen (audience) and, with ?prompter, the performer's prompter: the same synced lyrics,
// plus breath marks, notes and the next cue, huge, with a mirror for teleprompter glass (M) and the
// size on + / −
function startStage() {
  document.body.classList.remove("locked");
  document.body.classList.add("stage-mode");
  document.body.classList.toggle("prompter", PROMPTER);
  document.title = PROMPTER ? "Prompter · ARCHIVE_404 Live" : "Stage Screen · ARCHIVE_404 Live";
  $("#stage").hidden = false;
  const sky = REDUCE || PROMPTER ? null : rain($("#stageRain"), TITLE_WORDS);
  let st = { t: 0, wall: Date.now(), playing: false, rate: 1 };
  if (PROMPTER) {
    const ps = store.get("prompter", { mirror: false, size: 1 });
    const apply = () => {
      document.body.classList.toggle("mirror", ps.mirror);
      document.body.style.setProperty("--ps", ps.size);
      store.set("prompter", ps);
    };
    apply();
    $("#stHelp").hidden = false;
    addEventListener("keydown", (e) => {
      if (e.key === "m" || e.key === "M") ps.mirror = !ps.mirror;
      else if (e.key === "+" || e.key === "=") ps.size = Math.min(1.6, +(ps.size + 0.1).toFixed(1));
      else if (e.key === "-") ps.size = Math.max(0.6, +(ps.size - 0.1).toFixed(1));
      else return;
      apply();
    });
  }
  if (bc)
    bc.onmessage = (e) => {
      if (PROMPTER && e.data.notes !== st.notes) reloadNotes(); // edited in the show window
      st = e.data;
      // the show changed its running order: follow it
      if (Array.isArray(st.order) && st.order.join() !== ORDER.join()) {
        setOrder(st.order);
        loop.k = undefined;
      }
    };
  const els = {
    sec: { textContent: "" },
    prev: $("#stPrev"),
    cur: $("#stCur"),
    nxt: $("#stNxt"),
    note: PROMPTER ? $("#stNote") : null,
  };
  const fakeEngine = { bpmAt: (t) => (TL.songs[songAtT(t)] || {}).bpm || 140, songAt: (t) => songAtT(t) };
  const loop = () => {
    const t = st.playing ? st.t + ((Date.now() - st.wall) / 1000) * st.rate : st.t;
    const k = songAtT(t);
    if (k !== loop.k) {
      loop.k = k;
      $("#stSong").textContent = `${String(TL.songs[k].n).padStart(2, "0")} · ${TL.songs[k].title}`;
      sky?.words(songWords(TL.songs[k])); // the rain streams the words of the song that's on, like the show
    }
    if (sky) st.playing ? sky.resume() : sky.pause();
    if (!PROMPTER) roomFrame(t, k, st, sky);
    document.body.classList.toggle("crowd", !!st.crowd);
    if (PROMPTER) {
      // the next section, counted in bars (the show's cue, for the performer)
      const q = TL.secs.find((x) => x.t > t + 0.05 && x.n === TL.songs[k].n);
      const bar = (4 * 60) / ((TL.songs[k] || {}).bpm || 140);
      const txt = q
        ? `${q.name.toUpperCase()} IN ${Math.max(1, Math.ceil((q.t - t) / bar))}`
        : TL.songs[k + 1]
          ? `${TL.songs[k + 1].title} IN ${Math.max(1, Math.ceil((TL.songs[k + 1].start - t) / bar))}`
          : "";
      if ($("#stCue").textContent !== txt) $("#stCue").textContent = txt;
    }
    const save = engine;
    engine = fakeEngine;
    renderLyrics(t, els, PROMPTER);
    engine = save;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener("dblclick", () => document.documentElement.requestFullscreen?.());
}
// 13–15 · the audience's stage screen: crowd prompts, title cards between songs, and visuals that move
// with the music (the rain and a glow follow the bass from the song's waveform data, a soft pulse on
// every downbeat, a tint per chapter). Pulses only: no strobe, never more than 3 flashes a second.
const CHAPTER_HUE = { ORIGIN: 0, "THE FEED": 35, "THE WRECKAGE": -35, WHOLE: 150 };
const roman = (n) => ["", "I", "II", "III", "IV", "V", "VI"][n] || String(n);
const waves = new Map();
function roomFrame(t, k, st, sky) {
  const s = TL.songs[k];
  if (!s) return;
  const stage = $("#stage"),
    rel = t - s.start,
    bar = 240 / (s.bpm || 140);
  if (!REDUCE) {
    let raw = waves.get(s.n);
    if (!raw && s.wv) {
      raw = Uint8Array.from(atob(s.wv), (c) => c.charCodeAt(0));
      waves.set(s.n, raw);
      if (waves.size > 3) waves.delete(waves.keys().next().value);
    }
    const bin = raw ? Math.max(0, Math.min(raw.length / 4 - 1, Math.floor(rel * (s.wr || 25)))) : 0;
    const lo = st.playing && raw ? raw[bin * 4 + 1] / 255 : 0.15;
    roomFrame.lo = (roomFrame.lo ?? lo) * 0.85 + lo * 0.15;
    stage.style.setProperty("--bass", roomFrame.lo.toFixed(3));
    sky?.speed(0.7 + 1.4 * roomFrame.lo);
    stage.style.setProperty("--hue", `${CHAPTER_HUE[s.chapter] ?? 0}deg`);
    // the downbeat just passed
    const B = TL.beats;
    let lo2 = 0,
      hi = B.length - 1;
    while (lo2 < hi) {
      const m = (lo2 + hi + 1) >> 1;
      if (B[m][0] <= t) lo2 = m;
      else hi = m - 1;
    }
    let d = lo2;
    while (d > 0 && B[d][1] !== 1) d--;
    if (st.playing && B[d] && B[d][0] !== roomFrame.down && t - B[d][0] < 0.1) {
      roomFrame.down = B[d][0];
      stage.classList.add("pulse");
      setTimeout(() => stage.classList.remove("pulse"), 160);
    }
  }
  // 13 · a prompt: pressed (4 bars), or SING IT! on the first 2 bars of every hook
  let text = null;
  if (st.prompt && Date.now() - st.prompt.wall < 4 * bar * 1000) text = st.prompt.text;
  else if (
    st.autoPrompt &&
    st.playing &&
    TL.secs.some((q) => q.n === s.n && /hook|chorus/i.test(q.name) && t >= q.t && t < q.t + 2 * bar)
  )
    text = "SING IT!";
  const pr = $("#stPrompt");
  if (pr.textContent !== (text || "")) pr.textContent = text || "";
  pr.classList.toggle("on", !!text);
  stage.style.setProperty("--beat", `${(bar / 4).toFixed(3)}s`);
  // 15 · the title card, in the gap before the song's first line
  const first = TL.lines.find((l) => l.n === s.n),
    gap = first ? first.t - s.start : 4 * bar,
    card = rel >= -0.05 && rel < Math.min(gap - 0.4, 4 * bar) && gap > 1.5 * bar;
  if (card && roomFrame.card !== k) {
    roomFrame.card = k;
    const newChapter = k === 0 || TL.songs[k - 1]?.chapter !== s.chapter;
    $("#stCard").innerHTML =
      `${newChapter ? `<span class="lv-card-ch">CHAPTER ${roman(s.ch)} · ${esc(s.chapter)}</span>` : ""}<b>${esc(s.title)}</b><span class="lv-card-meta">${String(s.n).padStart(2, "0")} · ${fmt(s.frames / TL.sr)}</span>`;
  }
  stage.classList.toggle("carded", card);
}
function songAtT(t) {
  for (let k = TL.songs.length - 1; k >= 0; k--) if (t >= TL.songs[k].start - 1e-6) return k;
  return 0;
}

/* ---------- boot ---------- */
(async () => {
  if (await resume()) {
    $("#gate").hidden = true;
    STAGE || PROMPTER ? startStage() : startPreload();
  } else startGate();
})().catch(() => startGate());

// dev only: lets the local tests reach the engine and timeline (stripped from production builds)
if (import.meta.env.DEV)
  window.__live = () => ({
    engine,
    TL,
    refreshVoxPads,
    chops: () => voxChops,
    moves,
    remote,
    ctrlWiz,
    rehearse,
    FXON,
    control,
    midiMap,
  });
