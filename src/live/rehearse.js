// 12 · Rehearsal studio (menu → REHEARSE): loop any section of the song at 70 / 85 / 100 %, with a click
// if you want one, record your mic over every pass (TAKES, kept in this browser), play a take back
// against the track, and a practice log ("THIS WEEK: HOOK ×14 · VERSE 2 ×6 · 1 H 12 M").
import * as store from "./store";

// IndexedDB for takes (audio is too big for localStorage)
const db = () =>
  new Promise((ok, no) => {
    const r = indexedDB.open("e404-live", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("takes", { keyPath: "id", autoIncrement: true });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((ok, no) => {
    const t = d.transaction("takes", mode),
      res = fn(t.objectStore("takes"));
    t.oncomplete = () => ok(res?.result);
    t.onerror = () => no(t.error);
  });
};
const takesAll = () => tx("readonly", (s) => s.getAll());
const takeAdd = (take) => tx("readwrite", (s) => s.add(take));
const takeDel = (id) => tx("readwrite", (s) => s.delete(id));

// app: { engine(), tl(), voice, toast, esc, fmt, kick() }
export function makeRehearse(root, app) {
  const st = { sec: null, speed: store.get("rhSpeed", 0.85), click: false, takes: false, rec: null, k: null };
  const e = () => app.engine();
  root.innerHTML = `
    <div class="lv-drawer-hd">
      <span class="lv-lbl" id="rhSong">REHEARSE</span
      ><button class="lv-btn" id="rhX" type="button" aria-label="Close"><span>✕</span></button>
    </div>
    <div class="lv-vo">
      <section>
        <div class="lv-vo-row lv-vo-seg" id="rhSpeed">
          <span class="lv-lbl">SPEED</span>
          <button class="lv-btn" type="button" data-sp="0.7"><span>70%</span></button>
          <button class="lv-btn" type="button" data-sp="0.85"><span>85%</span></button>
          <button class="lv-btn" type="button" data-sp="1"><span>100%</span></button>
        </div>
        <div class="lv-vo-row">
          <button class="lv-btn" id="rhClick" type="button"><span>CLICK</span></button>
          <button class="lv-btn" id="rhTakes" type="button"><span>● RECORD TAKES</span></button>
          <button class="lv-btn" id="rhStop" type="button"><span>STOP LOOP</span></button>
        </div>
        <ol class="lv-setl lv-rh-secs" id="rhSecs"></ol>
      </section>
      <section>
        <h4>TAKES</h4>
        <ol class="lv-setl lv-rh-takes" id="rhList"></ol>
      </section>
      <section>
        <h4>PRACTICE</h4>
        <p class="lv-lbl" id="rhLog"></p>
      </section>
    </div>`;
  const $ = (s) => root.querySelector(s);

  function sections() {
    const tl = app.tl(),
      k = e().songAt(e().now()),
      s = tl.songs[k];
    const secs = tl.secs.filter((q) => q.n === s.n);
    const end = s.start + s.frames / tl.sr;
    return { k, s, secs: secs.map((q, i) => ({ ...q, end: secs[i + 1] ? secs[i + 1].t : end })) };
  }
  function render() {
    const { k, s, secs } = sections();
    st.k = k;
    $("#rhSong").textContent = `REHEARSE · ${String(s.n).padStart(2, "0")} ${s.title}`;
    $("#rhSecs").innerHTML = secs
      .map(
        (q, i) =>
          `<li data-i="${i}" class="${st.sec && Math.abs(st.sec.t - q.t) < 0.01 && e().loop ? "now" : ""}"><em>${String(i + 1).padStart(2, "0")}</em><span>${app.esc(q.name.toUpperCase())}</span><em>${app.fmt(q.end - q.t)} · LOOP</em></li>`,
      )
      .join("");
    $$("[data-sp]").forEach((b) => b.classList.toggle("on", +b.dataset.sp === st.speed));
    $("#rhClick").classList.toggle("on", st.click);
    $("#rhTakes").classList.toggle("on", st.takes);
    renderTakes();
    renderLog();
  }
  const $$ = (s) => [...root.querySelectorAll(s)];

  async function loop(sec) {
    if (!e().playing) await e().play(sec.t);
    e().setRate(st.speed);
    // setRate restarts the voices; the loop goes on once they're running again
    for (let i = 0; i < 40 && !e().voices.length; i++) await new Promise((r) => setTimeout(r, 25));
    await new Promise((r) => setTimeout(r, 120));
    // start at the section (not wherever the song happens to be)
    const now = e().now();
    if (now < sec.t - 0.1 || now >= sec.end) {
      e().jump(sec.t);
      await new Promise((r) => setTimeout(r, 80));
    }
    e().setLoop(Math.max(sec.t - 0.05, app.tl().songs[e().songAt(sec.t)].start), sec.end);
    st.sec = sec;
    lastT = e().now();
    render();
    app.toast(`LOOPING ${sec.name.toUpperCase()} · ${Math.round(st.speed * 100)}%`);
  }
  function stop() {
    if (e().loop) e().clearLoop();
    if (e().rate !== 1) e().setRate(1);
    endRec(false);
    st.sec = null;
    render();
  }

  // passes: the loop wrapping round = one more go at that section (logged)
  let lastT = 0,
    passStart = performance.now();
  setInterval(() => {
    if (!e().loop || !st.sec) return;
    const t = e().now();
    if (t < lastT - 0.5) {
      logPass(st.sec, (performance.now() - passStart) / 1000);
      passStart = performance.now();
    }
    lastT = t;
    // takes: start recording a moment before the next pass begins
    if (st.takes && !st.rec?.armedFor) {
      const left = (e().loop.end - t) / e().rate;
      if (left < 0.4 && left > 0.05) armRec(left);
    }
  }, 50);
  function logPass(sec, secs) {
    const day = new Date().toISOString().slice(0, 10),
      log = store.get("practice", {}),
      key = `${app.tl().songs[e().songAt(sec.t)].title}|${sec.name}`;
    log[day] = log[day] || {};
    const r = (log[day][key] = log[day][key] || { n: 0, s: 0 });
    r.n++;
    r.s += secs;
    // keep 8 weeks
    for (const d of Object.keys(log)) if (Date.now() - new Date(d).getTime() > 56 * 864e5) delete log[d];
    store.set("practice", log);
    renderLog();
  }
  function renderLog() {
    const log = store.get("practice", {}),
      week = Date.now() - 7 * 864e5,
      sum = {};
    let total = 0;
    for (const [d, v] of Object.entries(log))
      if (new Date(d).getTime() >= week)
        for (const [k, r] of Object.entries(v)) {
          sum[k] = (sum[k] || 0) + r.n;
          total += r.s;
        }
    const top = Object.entries(sum)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k, n]) => `${k.split("|")[1].toUpperCase()} ×${n}`);
    const h = Math.floor(total / 3600),
      m = Math.round((total % 3600) / 60);
    $("#rhLog").textContent = top.length
      ? `THIS WEEK: ${top.join(" · ")} · ${h ? `${h} H ` : ""}${m} M`
      : "NOTHING YET THIS WEEK";
  }

  // takes: the raw mic, one per pass, starting on the pass
  function armRec(inSec) {
    const stream = app.voice?.stream();
    if (!stream) {
      st.takes = false;
      render();
      return app.toast("TURN THE MIC ON (VOICE) TO RECORD TAKES");
    }
    st.rec = { armedFor: performance.now() + inSec * 1000 };
    setTimeout(() => {
      endRec(true);
      const type =
        ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) =>
          MediaRecorder.isTypeSupported?.(t),
        ) || "";
      const r = new MediaRecorder(stream, type ? { mimeType: type } : {}),
        chunks = [];
      r.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);
      const sec = st.sec,
        song = app.tl().songs[e().songAt(sec.t)],
        speed = st.speed,
        startedLate = performance.now() - st.rec.armedFor;
      r.onstop = async () => {
        if (!r.keep) return;
        await takeAdd({
          at: Date.now(),
          song: song.title,
          // song-relative, so a take still lines up after the set is re-ordered
          sec: { name: sec.name, rel: sec.t - song.start, len: sec.end - sec.t },
          speed,
          late: Math.max(0, startedLate) / 1000,
          type: r.mimeType,
          blob: new Blob(chunks, { type: r.mimeType }),
        });
        renderTakes();
      };
      r.start();
      st.rec = { r, armedFor: 0 };
    }, inSec * 1000);
  }
  function endRec(keep) {
    const r = st.rec?.r;
    if (r && r.state !== "inactive") {
      r.keep = keep;
      r.stop();
    }
    if (!keep) st.rec = null;
  }
  async function renderTakes() {
    let takes = [];
    try {
      takes = await takesAll();
    } catch {
      /* no IndexedDB here */
    }
    takes.sort((a, b) => b.at - a.at);
    $("#rhList").innerHTML = takes.length
      ? takes
          .slice(0, 30)
          .map(
            (t, i) =>
              `<li data-id="${t.id}"><em>${takes.length - i}</em><span>${app.esc(t.song)} · ${app.esc(t.sec.name.toUpperCase())} · ${Math.round(t.speed * 100)}%</span><em><button class="lv-sb-x" type="button" data-play="${t.id}" aria-label="Play with the track">▶</button><button class="lv-sb-x" type="button" data-dl="${t.id}" aria-label="Download">↓</button><button class="lv-sb-x" type="button" data-del="${t.id}" aria-label="Delete">✕</button></em></li>`,
          )
          .join("")
      : `<li><span class="lv-lbl">NO TAKES YET · TURN THE MIC ON, LOOP A SECTION, PRESS ● RECORD TAKES</span></li>`;
  }
  async function playTake(id) {
    const t = (await takesAll()).find((x) => x.id === id);
    if (!t) return;
    const buf = await e().ctx.decodeAudioData(await t.blob.arrayBuffer());
    st.speed = t.speed;
    st.takes = false;
    const song = app.tl().songs.find((s) => s.title === t.song);
    if (!song) return app.toast("THAT SONG ISN'T IN THIS SET");
    const at0 = song.start + t.sec.rel;
    await loop({ name: t.sec.name, t: at0, end: at0 + t.sec.len });
    // the take starts with the next pass
    const left = (e().loop.end - e().now()) / e().rate;
    const s = new AudioBufferSourceNode(e().ctx, { buffer: buf });
    s.connect(e().master);
    s.start(e().ctx.currentTime + left, t.late);
    app.toast("TAKE PLAYS FROM THE NEXT PASS");
  }

  root.addEventListener("click", async (ev) => {
    const li = ev.target.closest("#rhSecs li");
    if (li) return loop(sections().secs[+li.dataset.i]);
    const b = ev.target.closest("button");
    if (!b) return;
    if (b.dataset.sp) {
      st.speed = +b.dataset.sp;
      store.set("rhSpeed", st.speed);
      if (st.sec) loop(st.sec);
      return render();
    }
    if (b.dataset.play) return playTake(+b.dataset.play);
    if (b.dataset.dl) {
      const t = (await takesAll()).find((x) => x.id === +b.dataset.dl);
      if (!t) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(t.blob);
      a.download =
        `error_404_take_${t.song}_${t.sec.name}_${new Date(t.at).toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${t.type.includes("mp4") ? "m4a" : "webm"}`.replace(
          /\s+/g,
          "_",
        );
      a.click();
      return;
    }
    if (b.dataset.del) {
      await takeDel(+b.dataset.del);
      return renderTakes();
    }
  });
  $("#rhClick").onclick = () => {
    st.click = !st.click;
    app.voice?.clickToMain(st.click);
    render();
  };
  $("#rhTakes").onclick = () => {
    st.takes = !st.takes;
    if (!st.takes) endRec(true);
    else if (!app.voice?.stream()) {
      st.takes = false;
      app.toast("TURN THE MIC ON (VOICE) TO RECORD TAKES");
    }
    render();
  };
  $("#rhStop").onclick = stop;
  return { render, stop };
}
