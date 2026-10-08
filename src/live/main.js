// ERROR_404 · LIVE (/live/): the performance page.
//
// Gate: the Source Vault's access key. public/live/data.enc.json (the set timeline: songs, lyrics with
// word timings, stage cues, beats) and public/live/inst/*.bin (the instrumental versions) are AES-GCM,
// keyed by PBKDF2 of the access key, exactly like the vault's data. The masters are the site's own
// /audio files. PRELOAD stores everything in the browser's Cache Storage, so the show runs offline.
import "../styles/index.css";
import "../styles/overrides.css";
import "../vault/vault.css";
import "./live.css";
import { audioSrc } from "../lib/audioSrc";
import { keyField } from "../lib/keyField";
import { rain, REDUCE } from "../lib/rain";
import { Engine } from "./engine";
import { PAD_DEFS, synthKit, vocalChop } from "./pads";
import { makeWave, WAVE_H } from "./wave";

const $ = (s, el = document) => el.querySelector(s),
  $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const camColour = (c) => `hsl(${((parseInt(c) - 1) * 30 + 300) % 360} 100% ${c.endsWith("B") ? 70 : 60}%)`;
const STAGE = new URLSearchParams(location.search).has("stage");
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
  TL = null;
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
    TL = JSON.parse(new TextDecoder().decode(plain));
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
  if (ok)
    try {
      sessionStorage.setItem(SESSION, JSON.stringify({ k: b64.to(raw), salt: s.salt }));
    } catch {
      /* private browsing: asks again next time */
    }
  return ok;
}
async function resume() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION) || "null");
    if (saved && (await getSealed()).salt === saved.salt) return open(b64.from(saved.k));
  } catch {
    /* fall through to the gate */
  }
  return false;
}
async function decryptFile(buf, iv) {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.from(iv) }, KEY, buf);
}

/* ---------- files: masters (/audio) + instrumentals (/live/inst, encrypted) ---------- */
const urlFor = (song, kind) =>
  kind === "m" ? audioSrc(`/audio/${song.slug}.mp3`) : `/live/inst/${song.inst.file}`;
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
  const song = TL.songs.find((s) => s.n === n);
  let buf = await fetchCached(urlFor(song, kind));
  if (kind === "i") buf = await decryptFile(buf, song.inst.iv);
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
      STAGE ? startStage() : startPreload();
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
  const mb = TL.songs.reduce((n, s) => n + s.mBytes + s.inst.bytes, 0) / 1e6;
  $("#preSub").textContent =
    `${TL.songs.length} SONGS · ${fmt(TL.duration)} · VOCAL + INSTRUMENTAL · ${Math.round(mb)} MB`;
  $("#preBtn").onclick = preload;
  if ("serviceWorker" in navigator && import.meta.env.PROD)
    navigator.serviceWorker.register("/live/sw.js", { scope: "/live/" });
}
async function preload() {
  const btn = $("#preBtn");
  btn.disabled = true;
  btn.textContent = "PRELOADING…";
  engine = new Engine(TL, bytesFor);
  await engine.init(); // inside the click: lets the browser start audio
  const jobs = TL.songs.flatMap((s) => [
    [s, "m", s.mBytes],
    [s, "i", s.inst.bytes],
  ]);
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
  row(true, "SONGS + INSTRUMENTALS LOADED", `${TL.songs.length * 2} FILES`);
  const cached = "caches" in window ? (await (await caches.open(CACHE)).keys()).length : 0;
  row(
    cached >= TL.songs.length * 2,
    "OFFLINE COPY",
    cached ? `${cached} FILES IN THE BROWSER` : "NOT AVAILABLE HERE",
  );
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
    decodeOk ? "SONGS 01–02 READY · GAPLESS" : "THIS BROWSER COULD NOT DECODE THE FILES",
  );
  row(
    engine.ctx.state === "running",
    "AUDIO OUTPUT",
    `${engine.ctx.sampleRate} HZ · ${Math.round((engine.ctx.baseLatency || 0) * 1000)} MS`,
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
        engine.ctx.setSinkId(e.target.value).catch(() => toast("COULD NOT SWITCH OUTPUT"));
    }
  }
  $("#goBtn").hidden = false;
  $("#goBtn").onclick = startShow;
}

/* ---------- the show ---------- */
const S = {
  crowd: false,
  panic: false,
  locked: false,
  vox: 1,
  master: 0.9,
  eq: { low: 0.8, mid: 0.8, high: 0.8 },
  filter: 0,
};
function startShow() {
  if (startShow.done) return; // a double-click on START must not wire everything twice
  startShow.done = true;
  $("#pre").hidden = true;
  $("#show").hidden = false;
  document.body.classList.add("showing");
  buildStrip();
  buildPads();
  buildSetlist();
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
  requestAnimationFrame(frame);
  toast("SPACE = PLAY / PAUSE · PADS ON 1–4 Q–R A–F Z–V");
}

/* lyrics, cues, counters: every frame */
function frame() {
  const t = engine.now();
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
    nxt: $("#lyNxt"),
  });
  renderCue(t, k);
  renderNext(t, k);
  drawWave(t, k);
  $$("#setl li").forEach((li, i) => {
    li.classList.toggle("now", i === k);
    li.classList.toggle("done", i < k);
  });
  if (k !== frame.k) {
    frame.k = k;
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
function renderLyrics(t, el) {
  const L = TL.lines;
  const i = lineIndex(t);
  const cur = i >= 0 && t < L[i].e + 0.6 && (!L[i + 1] || t < L[i + 1].t) ? L[i] : null;
  const nx = L[cur ? i + 1 : i + 1] || null;
  const beat = 60 / engine.bpmAt(t);
  const prev = cur ? L[i - 1] : L[i];
  const key = cur
    ? `${i}:${cur.w.filter((w) => w.t <= t).length}`
    : nx
      ? `c${Math.ceil((nx.t - t) / beat)}:${i}`
      : "end";
  if (key === el.key) return;
  el.key = key;
  el.sec.textContent = sectionName(cur || nx, t);
  el.prev.textContent = prev && (!cur || prev !== cur) ? prev.text : "";
  if (cur) {
    el.cur.innerHTML = cur.w.length
      ? cur.w
          .map((w, j) => {
            const sung = w.t <= t,
              now = sung && (!cur.w[j + 1] || cur.w[j + 1].t > t);
            return `<span class="lv-w${now ? " lv-now" : sung ? " lv-sung" : ""}">${esc(w.w)}</span>`;
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
function buildSetlist() {
  $("#setl").innerHTML = TL.songs
    .map(
      (s, i) =>
        `<li data-k="${i}"><em>${String(s.n).padStart(2, "0")}</em><span>${esc(s.title)}</span><em>${fmt(s.frames / TL.sr)}</em></li>`,
    )
    .join("");
  $("#setl").onclick = (e) => {
    const li = e.target.closest("li");
    if (!li || S.locked) return;
    engine.seek(TL.songs[+li.dataset.k].start);
    engine.ready(+li.dataset.k).then(() => !engine.playing && engine.onstate());
  };
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
    k.addEventListener(
      "dblclick",
      () => !S.locked && apply(n === "VOX" ? 1 : n === "MASTER" ? 0.9 : bi ? 0.5 : 0.8),
    );
  }
}
function setFilter(v) {
  S.filter = Math.max(-1, Math.min(1, v));
  engine.setFilter(Math.abs(S.filter) < 0.04 ? 0 : S.filter);
}
function wireControls() {
  $("#playBtn").onclick = () => !S.locked && (engine.playing ? engine.pause() : engine.play());
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
  // FX
  const fxOn = {};
  $$("[data-fx]").forEach((b) => {
    const fx = b.dataset.fx;
    const press = (on) => {
      if (S.locked) return;
      if (fx === "roll") {
        if (on) {
          const t = engine.now(),
            s = engine.nextGrid(t, 0.25),
            beat = 60 / engine.bpmAt(t);
          engine.setLoop(Math.max(TL.songs[engine.songAt(t)].start, s - beat / 4), s);
          b.classList.add("on");
        } else {
          engine.clearLoop();
          b.classList.remove("on");
        }
        return;
      }
      if (fx === "tapestop") {
        if (on) engine.tapeStop();
        return;
      }
      fxOn[fx] = !fxOn[fx];
      b.classList.toggle("on", fxOn[fx]);
      if (fx === "echo") engine.setEcho(fxOn[fx]);
      if (fx === "reverb") engine.setReverb(fxOn[fx]);
      if (fx === "crush") engine.setCrush(fxOn[fx]);
    };
    CTL[b.dataset.ctl] = { press };
    if (fx === "roll") {
      b.addEventListener("pointerdown", () => press(true));
      b.addEventListener("pointerup", () => press(false));
      b.addEventListener("pointerleave", () => b.classList.contains("on") && press(false));
    } else b.addEventListener("click", () => press(true));
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
      engine.onstate();
    };
    CTL[b.dataset.ctl] = { press };
    b.addEventListener("click", press);
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
    const pad = PAD_DEFS.find((p) => p.key === e.key.toUpperCase());
    if (pad && !e.repeat) hitPad(pad);
  });
  setInterval(broadcast, 500);
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
function setDrawer(o) {
  $("#drawer").hidden = !o;
  $('[data-view="setlist"]').classList.toggle("on", o);
  if (o) ($("#setl li.now") || $("#setl li"))?.scrollIntoView({ block: "center" });
}
function startMenu() {
  $("#drawerX").onclick = () => setDrawer(false);
  $("#burger").onclick = () => setMenu(!$("#lvMenu").classList.contains("is-open"));
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#lvMenu").classList.contains("is-open")) setMenu(false);
    else if (!$("#drawer").hidden) setDrawer(false);
  });
  $$("[data-view]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      setMenu(false);
      const v = a.dataset.view,
        pads = $("#padsPanel");
      if (v === "stage") return openStage();
      if (v === "pads") return pads.hidden && $("#padsBtn").click();
      if (!pads.hidden) $("#padsBtn").click();
      setDrawer(v === "setlist");
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
  const o = wave.draw(t - TL.songs[k].start, k);
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
let voxChops = [];
function buildPads() {
  $("#padsPanel").innerHTML = `<div class="lv-padgrid">${PAD_DEFS.map(
    (p) =>
      `<button class="lv-pad${p.vox !== undefined ? " vox" : ""}" data-pad="${p.key}" data-ctl="PAD ${p.key}"><span>${p.name}</span><small>${p.key} · ${p.q === "bar" ? "BAR" : p.q === 1 ? "BEAT" : "1/16"}</small></button>`,
  ).join("")}</div>`;
  $$(".lv-pad").forEach((b) => {
    const pad = PAD_DEFS.find((p) => p.key === b.dataset.pad);
    CTL[b.dataset.ctl] = { press: () => hitPad(pad) };
    b.addEventListener("pointerdown", () => hitPad(pad));
  });
}
async function refreshVoxPads(k) {
  // the opening words of this song's hook / chorus lines, vocal only
  voxChops = [];
  const song = TL.songs[k];
  const hooks = TL.secs.filter((s) => s.n === song.n && /hook|chorus/i.test(s.name));
  const starts = [];
  for (const s of hooks) for (const li of s.lines) if (TL.lines[li]) starts.push(TL.lines[li]);
  const picks = (starts.length ? starts : TL.lines.filter((l) => l.n === song.n))
    .filter((l, i, a) => a.findIndex((x) => x.text === l.text) === i)
    .slice(0, 4);
  try {
    await engine.ready(k);
  } catch {
    return;
  }
  const m = engine.bufs.get(`${k}:m`),
    i = engine.bufs.get(`${k}:i`);
  voxChops = picks.map((l) => ({
    buf: vocalChop(engine.ctx, m, i, l.t - song.start, Math.min(0.9, (l.w[1]?.t ?? l.t + 0.6) - l.t + 0.15)),
    word: l.w[0]?.w || l.text.split(" ")[0],
  }));
  $$(".lv-pad.vox").forEach((b, j) => {
    const c = voxChops[j];
    $("span", b).textContent = c ? `“${c.word.replace(/[^\w']/g, "").toUpperCase()}”` : `VOX ${j + 1}`;
  });
}
function hitPad(pad) {
  if (S.locked || !engine?.ctx) return;
  const ctx = engine.ctx;
  const b = $(`.lv-pad[data-pad="${pad.key}"]`);
  if (b) {
    b.classList.remove("hit");
    void b.offsetWidth;
    b.classList.add("hit");
    setTimeout(() => b.classList.remove("hit"), 140);
  }
  if (pad.fx === "tapestop") return engine.tapeStop();
  if (pad.fx === "stutter") {
    const t = engine.now(),
      beat = 60 / engine.bpmAt(t),
      s = engine.nextGrid(t, 0.25);
    engine.setLoop(Math.max(TL.songs[engine.songAt(t)].start, s - beat / 8), s);
    setTimeout(() => engine.clearLoop(), beat * 1000);
    return;
  }
  const buf = pad.vox !== undefined ? voxChops[pad.vox]?.buf : kit?.[pad.name];
  if (!buf) return;
  // quantised to the song's own beat grid while playing
  let when = ctx.currentTime;
  if (engine.playing) {
    const t = engine.now();
    const g = engine.nextGrid(t, pad.q);
    const w = engine.ctxAt(g);
    if (w - ctx.currentTime < (pad.q === "bar" ? 8 : 1.2)) when = Math.max(ctx.currentTime, w);
  }
  const s = new AudioBufferSourceNode(ctx, { buffer: buf });
  s.connect(engine.pads);
  s.start(when);
}

/* ---------- record ---------- */
let rec = null;
function toggleRec() {
  if (!engine?.recDest) return;
  if (rec) {
    rec.stop();
    return;
  }
  const type =
    ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported?.(t)) ||
    "";
  const chunks = [];
  rec = new MediaRecorder(engine.recDest.stream, type ? { mimeType: type, audioBitsPerSecond: 320000 } : {});
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: rec.mimeType });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    a.download = `error_404_live_${stamp}.${rec.mimeType.includes("mp4") ? "m4a" : "webm"}`;
    a.click();
    rec = null;
    $("#recBtn").classList.remove("on");
    $("#recTxt").textContent = "● RECORD THE SHOW";
    toast("RECORDING SAVED TO YOUR DOWNLOADS");
  };
  rec.start(1000);
  rec.t0 = Date.now();
  $("#recBtn").classList.add("on");
  $("#recTxt").textContent = "■ STOP RECORDING";
  setMenu(false);
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
async function midi() {
  if (!navigator.requestMIDIAccess) return toast("MIDI ISN'T AVAILABLE IN THIS BROWSER (USE CHROME OR EDGE)");
  if (!midi.access) {
    try {
      midi.access = await navigator.requestMIDIAccess();
    } catch {
      return toast("MIDI ACCESS WAS DECLINED");
    }
    const hook = () => midi.access.inputs.forEach((inp) => (inp.onmidimessage = onMidi));
    hook();
    midi.access.onstatechange = hook;
    $("#midiBtn").classList.add("on");
    $("#midiTxt").textContent = `MIDI · ${midi.access.inputs.size} IN`;
    return toast("MIDI CONNECTED · TAP MIDI AGAIN TO LEARN");
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
  const [st, d1, d2] = e.data;
  const type = st & 0xf0;
  const id = `${type === 0xb0 ? "cc" : "note"}:${st & 0x0f}:${d1}`;
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
  else if (type === 0x90 && d2 > 0 && ctl.press) ctl.press(true);
  else if ((type === 0x80 || (type === 0x90 && d2 === 0)) && ctl.press && midiMap[id] === "ROLL")
    ctl.press(false);
}

/* ---------- stage screen (a second window for a projector) ---------- */
// stamped with the wall clock: each window's performance.now() starts from its own zero
function broadcast() {
  if (!bc || !engine) return;
  bc.postMessage({
    t: engine.now(),
    wall: Date.now(),
    playing: engine.playing && !engine.loop,
    rate: engine.rate,
    crowd: S.crowd,
  });
}
function startStage() {
  document.body.classList.remove("locked");
  document.body.classList.add("stage-mode");
  document.title = "Stage Screen · ARCHIVE_404 Live";
  $("#stage").hidden = false;
  if (!REDUCE) rain($("#stageRain"), TITLE_WORDS);
  let st = { t: 0, wall: Date.now(), playing: false, rate: 1 };
  if (bc) bc.onmessage = (e) => (st = e.data);
  const els = { sec: { textContent: "" }, prev: $("#stPrev"), cur: $("#stCur"), nxt: $("#stNxt") };
  const fakeEngine = { bpmAt: (t) => (TL.songs[songAtT(t)] || {}).bpm || 140, songAt: (t) => songAtT(t) };
  const loop = () => {
    const t = st.playing ? st.t + ((Date.now() - st.wall) / 1000) * st.rate : st.t;
    const k = songAtT(t);
    $("#stSong").textContent = `${String(TL.songs[k].n).padStart(2, "0")} · ${TL.songs[k].title}`;
    document.body.classList.toggle("crowd", !!st.crowd);
    const save = engine;
    engine = fakeEngine;
    renderLyrics(t, els);
    engine = save;
    requestAnimationFrame(loop);
  };
  loop();
  document.addEventListener("dblclick", () => document.documentElement.requestFullscreen?.());
}
function songAtT(t) {
  for (let k = TL.songs.length - 1; k >= 0; k--) if (t >= TL.songs[k].start - 1e-6) return k;
  return 0;
}

/* ---------- boot ---------- */
(async () => {
  if (await resume()) {
    $("#gate").hidden = true;
    STAGE ? startStage() : startPreload();
  } else startGate();
})().catch(() => startGate());

// dev only: lets the local tests reach the engine and timeline (stripped from production builds)
if (import.meta.env.DEV) window.__live = () => ({ engine, TL });
