// 05 · Auto-duck the guide vocal · 06 · Mic through the page · 07 · In-ear mix + spoken cues.
//
// MIC  getUserMedia (no echo cancelling / noise suppression / auto gain: a vocal mic, not a call) →
//      trim → high-pass 90 Hz → 4 feedback notches (idle until needed) → gentle compressor → the voice
//      effects (plate, slap, doubler, telephone, megaphone) → MIC → PA (on: into the show's own
//      ECHO / REVERB / CRUSH and out to the PA; off: the page only listens).
// DUCK the mic's level against the room's (LEARN THE ROOM measures it with the music playing): while
//      you sing, the recorded vocal drops (12 dB by default) and comes back 0.4 s after you stop, so a
//      missed line is covered without touching anything.
// EARS a separate mix for your headphones / in-ears: click on the beat, spoken cues counting you into
//      every section and changeover, the guide vocal on its own, the music, and your mic. Out on
//      outputs 3–4 of a 4-output (aggregate) device, or a second output device (Chrome / Edge).
import VOICE from "./voice.json";
import * as store from "./store";

const dB = (x) => 20 * Math.log10(Math.max(1e-9, x));
const FX = ["PLATE", "SLAP", "DOUBLER", "TELEPHONE", "MEGAPHONE"];
const TONES = ["TELEPHONE", "MEGAPHONE"]; // these replace the dry voice; the others add to it

// app: { engine(), tl(), toast(t), fetchBytes(url) -> ArrayBuffer, onChange() }
export function makeVoice(app) {
  const eng = () => app.engine();
  const ctx = eng().ctx;
  const st = {
    mic: false,
    deviceId: store.get("micDevice", ""),
    toPA: store.get("micToPA", false),
    fx: new Set(store.get("micFx", [])),
    trim: store.get("micTrim", 0),
    duckOn: store.get("duckOn", true),
    depth: store.get("duckDepth", 12), // dB
    sens: store.get("duckSens", 10), // dB above the room
    floor: store.get("duckFloor", -50), // the room, dBFS
    level: -90,
    singing: false,
    notches: [],
    iemMode: "off", // off | agg | dev (not restored: the device has to be there first)
    iemDevice: store.get("iemDevice", ""),
    levels: store.get("iemLevels", { click: 0.55, cues: 0.8, guide: 0.45, music: 0.7, mic: 0.6 }),
    click: store.get("iemClick", true),
    cues: store.get("iemCues", true),
    iemOk: false,
  };
  const save = () => {
    store.set("micDevice", st.deviceId);
    store.set("micToPA", st.toPA);
    store.set("micFx", [...st.fx]);
    store.set("micTrim", st.trim);
    store.set("duckOn", st.duckOn);
    store.set("duckDepth", st.depth);
    store.set("duckSens", st.sens);
    store.set("duckFloor", st.floor);
    store.set("iemDevice", st.iemDevice);
    store.set("iemLevels", st.levels);
    store.set("iemClick", st.click);
    store.set("iemCues", st.cues);
  };
  const changed = () => app.onChange?.(st);

  /* ---------- the mic chain ---------- */
  const N = {};
  function buildChain() {
    const g = (v = 1) => new GainNode(ctx, { gain: v });
    N.trim = g(Math.pow(10, st.trim / 20));
    N.hp = new BiquadFilterNode(ctx, { type: "highpass", frequency: 90, Q: 0.7 });
    N.notch = [0, 1, 2, 3].map(
      () => new BiquadFilterNode(ctx, { type: "peaking", frequency: 1000, Q: 14, gain: 0 }),
    );
    N.comp = new DynamicsCompressorNode(ctx, {
      threshold: -18,
      knee: 8,
      ratio: 3,
      attack: 0.004,
      release: 0.12,
    });
    N.vad = new AnalyserNode(ctx, { fftSize: 1024 });
    N.sum = g();
    N.dry = g();
    N.trim.connect(N.hp);
    N.hp.connect(N.vad);
    let x = N.hp;
    for (const n of N.notch) x = x.connect(n);
    x.connect(N.comp);
    N.comp.connect(N.dry).connect(N.sum);
    // plate: a short bright plate
    N.plate = g(0);
    N.comp
      .connect(new ConvolverNode(ctx, { buffer: plateIR(ctx, 1.2) }))
      .connect(N.plate)
      .connect(N.sum);
    // slap: one 110 ms repeat with a little feedback, darkened
    N.slap = g(0);
    const sd = new DelayNode(ctx, { delayTime: 0.11 }),
      sfb = g(0.12),
      slp = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 5000 });
    N.comp.connect(sd).connect(slp).connect(N.slap).connect(N.sum);
    slp.connect(sfb).connect(sd);
    // doubler: two slowly wandering short delays, left and right
    N.doubler = g(0);
    for (const [t, rate, pan] of [
      [0.018, 0.31, -0.7],
      [0.026, 0.47, 0.7],
    ]) {
      const d = new DelayNode(ctx, { delayTime: t, maxDelayTime: 0.05 }),
        lfo = new OscillatorNode(ctx, { frequency: rate }),
        depth = g(0.002);
      lfo.connect(depth).connect(d.delayTime);
      lfo.start();
      N.comp.connect(d).connect(new StereoPannerNode(ctx, { pan })).connect(N.doubler);
    }
    N.doubler.connect(N.sum);
    // telephone / megaphone: band-limited and driven, instead of the dry voice
    const tone = (lo, hi, drive, lift) => {
      const out = g(0);
      N.comp
        .connect(new BiquadFilterNode(ctx, { type: "highpass", frequency: lo }))
        .connect(new BiquadFilterNode(ctx, { type: "lowpass", frequency: hi }))
        .connect(new WaveShaperNode(ctx, { curve: driveCurve(drive), oversample: "2x" }))
        .connect(new BiquadFilterNode(ctx, { type: "peaking", frequency: 1500, Q: 1, gain: lift }))
        .connect(out)
        .connect(N.sum);
      return out;
    };
    N.TELEPHONE = tone(400, 3400, 3, 3);
    N.MEGAPHONE = tone(600, 2500, 9, 6);
    // to the PA (into the show's effects) and to the ears
    N.toPA = g(st.toPA ? 1 : 0);
    N.sum.connect(N.toPA).connect(eng().fxIn);
    N.guard = new AnalyserNode(ctx, { fftSize: 4096, smoothingTimeConstant: 0.5 });
    N.sum.connect(N.guard);
    applyFx();
  }
  function applyFx() {
    if (!N.sum) return;
    const c = ctx.currentTime,
      on = (n) => st.fx.has(n);
    const tone = TONES.find(on);
    N.dry.gain.setTargetAtTime(tone ? 0 : 1, c, 0.02);
    for (const t of TONES) N[t].gain.setTargetAtTime(tone === t ? 1 : 0, c, 0.02);
    N.plate.gain.setTargetAtTime(on("PLATE") ? 0.28 : 0, c, 0.02);
    N.slap.gain.setTargetAtTime(on("SLAP") ? 0.3 : 0, c, 0.02);
    N.doubler.gain.setTargetAtTime(on("DOUBLER") ? 0.45 : 0, c, 0.02);
  }

  async function enableMic(deviceId = st.deviceId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0,
        },
      });
      N.stream?.getTracks().forEach((t) => t.stop());
      N.src?.disconnect();
      if (!N.sum) buildChain();
      N.stream = stream;
      N.src = ctx.createMediaStreamSource(stream);
      N.src.connect(N.trim);
      earsMic();
      st.mic = true;
      st.deviceId = stream.getAudioTracks()[0]?.getSettings().deviceId || deviceId;
      save();
      app.toast("MIC ON · THE PAGE IS LISTENING (NOTHING IS SENT ANYWHERE)");
    } catch {
      st.mic = false;
      app.toast("NO MIC · ALLOW THE MICROPHONE FOR THIS PAGE, OR PICK ANOTHER INPUT");
    }
    changed();
  }
  function disableMic() {
    N.stream?.getTracks().forEach((t) => t.stop());
    N.src?.disconnect();
    N.stream = N.src = null;
    st.mic = false;
    st.singing = false;
    eng().setDuck(1);
    changed();
  }

  /* ---------- 05 · singing detection + duck ---------- */
  const td = new Float32Array(1024);
  let lastLoud = 0,
    learning = null;
  setInterval(() => {
    if (!st.mic || !N.vad) return;
    N.vad.getFloatTimeDomainData(td);
    let s = 0;
    for (const v of td) s += v * v;
    st.level = dB(Math.sqrt(s / td.length));
    const now = performance.now();
    if (learning) {
      learning.sum += st.level;
      learning.n++;
      if (now > learning.until) {
        st.floor = Math.round(learning.sum / learning.n + 3);
        learning = null;
        save();
        app.toast(`ROOM LEARNED · ${st.floor} DB · SING ABOVE IT TO DUCK THE GUIDE`);
      }
    }
    if (st.level > st.floor + st.sens && st.level > -60) lastLoud = now;
    const singing = now - lastLoud < 400;
    if (singing !== st.singing) {
      st.singing = singing;
      changed();
    }
    eng().setDuck(st.duckOn && singing ? Math.pow(10, -st.depth / 20) : 1);
  }, 20);
  function learnRoom() {
    if (!st.mic) return app.toast("TURN THE MIC ON FIRST");
    learning = { sum: 0, n: 0, until: performance.now() + 3000 };
    app.toast("LEARNING THE ROOM · 3 S · DON'T SING (MUSIC PLAYING IS FINE)");
  }

  /* ---------- 06 · feedback guard (only while the mic goes to the PA) ---------- */
  const fd = new Float32Array(2048);
  let cand = null;
  setInterval(() => {
    if (!st.mic || !st.toPA || !N.guard) return;
    N.guard.getFloatFrequencyData(fd);
    const hz = ctx.sampleRate / N.guard.fftSize,
      lo = Math.floor(150 / hz),
      hi = Math.floor(8000 / hz);
    let pk = lo;
    for (let i = lo; i < hi; i++) if (fd[i] > fd[pk]) pk = i;
    const band = Array.from(fd.subarray(lo, hi)).sort((a, b) => a - b),
      med = band[band.length >> 1];
    if (fd[pk] > -35 && fd[pk] - med > 30) {
      if (cand && Math.abs(cand.bin - pk) <= 2) cand.n++;
      else cand = { bin: pk, n: 1 };
      if (cand.n >= 3) {
        const f = Math.round(pk * hz),
          free = N.notch.find((n) => n.gain.value > -1);
        if (free) {
          free.frequency.value = f;
          free.gain.setTargetAtTime(-18, ctx.currentTime, 0.01);
          st.notches.push(f);
          app.toast(`FEEDBACK AT ${(f / 1000).toFixed(1)} KHZ · NOTCHED`);
        } else {
          N.trim.gain.setTargetAtTime(N.trim.gain.value * 0.7, ctx.currentTime, 0.02);
          app.toast("FEEDBACK AGAIN · MIC TURNED DOWN 3 DB");
        }
        cand = null;
        changed();
      }
    } else cand = null;
  }, 100);
  function resetGuard() {
    for (const n of N.notch || []) n.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    st.notches = [];
    N.trim?.gain.setTargetAtTime(Math.pow(10, st.trim / 20), ctx.currentTime, 0.05);
    changed();
  }

  /* ---------- 07 · the in-ear mix ---------- */
  const E = {};
  E.out = new GainNode(ctx);
  for (const k of ["click", "cues", "guide", "music", "mic"]) {
    E[k] = new GainNode(ctx, { gain: st.levels[k] });
    E[k].connect(E.out);
  }
  eng().guide.connect(E.guide);
  eng().hp.connect(E.music); // the song after its EQ / filter, before the effects and the mic
  let micToEars = false,
    devEl = null,
    devDest = null;
  function earsMic() {
    if (N.sum && !micToEars) {
      N.sum.connect(E.mic);
      micToEars = true;
    }
  }
  async function setEars(mode, deviceId = st.iemDevice) {
    // undo the current routing
    eng().routeOutputs(null);
    devEl?.pause();
    if (devEl) devEl.srcObject = null;
    try {
      E.out.disconnect();
    } catch {
      /* */
    }
    st.iemMode = "off";
    st.iemOk = false;
    if (mode === "agg") {
      if (!eng().routeOutputs(E.out)) {
        app.toast("THIS OUTPUT HAS 2 CHANNELS · CHOOSE THE AGGREGATE DEVICE AS THE OUTPUT FIRST");
        eng().routeOutputs(null);
      } else ((st.iemMode = "agg"), (st.iemOk = true));
    } else if (mode === "dev") {
      if (!("setSinkId" in HTMLMediaElement.prototype)) {
        app.toast("A SECOND OUTPUT NEEDS CHROME OR EDGE");
      } else {
        try {
          devDest = devDest || ctx.createMediaStreamDestination();
          E.out.connect(devDest);
          devEl = devEl || new Audio();
          devEl.srcObject = devDest.stream;
          await devEl.setSinkId(deviceId || "");
          await devEl.play();
          st.iemMode = "dev";
          st.iemDevice = deviceId;
          st.iemOk = true;
        } catch {
          app.toast("COULDN'T OPEN THAT OUTPUT FOR THE IN-EARS");
        }
      }
    }
    earsMic();
    save();
    changed();
  }
  function setLevel(k, v) {
    st.levels[k] = v;
    E[k].gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    save();
  }

  /* click + spoken cues, scheduled a little ahead on the set's own beats */
  let sprite = null;
  (async () => {
    try {
      sprite = await ctx.decodeAudioData(await app.fetchBytes("/live/voice.mp3"));
    } catch {
      sprite = null;
    }
  })();
  const clickBuf = (() => {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++)
      d[i] = Math.sin((2 * Math.PI * 1600 * i) / ctx.sampleRate) * Math.exp(-i / (ctx.sampleRate * 0.006));
    return b;
  })();
  let sched = { tl: null, events: [], next: 0, beat: -1, word: null };
  function eventsFor(tl) {
    // section starts: its name two bars before, then "four three two one" on the last bar's beats;
    // changeovers: "next song" four bars before, the title two bars before, the same count-down
    const down = tl.beats.filter((b) => b[1] === 1).map((b) => b[0]);
    const before = (t, bars) => {
      let j = down.findIndex((d) => d > t - 0.08);
      if (j < 0) j = down.length;
      return down[j - bars];
    };
    const ev = [];
    const countIn = (t) => {
      const b0 = before(t, 1);
      if (b0 == null) return;
      const beat = (t - b0) / 4;
      ["four", "three", "two", "one"].forEach((w, i) => ev.push({ t: b0 + i * beat, key: w }));
    };
    for (const q of tl.secs) {
      const s = tl.songs.find((x) => x.n === q.n);
      if (!s || q.t - s.start < 1) continue; // a song's own first section: the changeover cue covers it
      const name = q.name
        .toLowerCase()
        .replace(/\s*\d+$/, "")
        .replace("guitars kick in", "guitars");
      const t2 = before(q.t, 2);
      if (t2 != null && VOICE.words[name]) ev.push({ t: t2, key: name });
      countIn(q.t);
    }
    tl.songs.forEach((s, k) => {
      if (!k) return;
      const t4 = before(s.start, 4),
        t2 = before(s.start, 2);
      if (t4 != null) ev.push({ t: t4, key: "next song" });
      if (t2 != null && VOICE.words[`song:${s.title}`]) ev.push({ t: t2, key: `song:${s.title}` });
      countIn(s.start);
    });
    return ev.sort((a, b) => a.t - b.t);
  }
  function say(key, when) {
    if (!sprite || !VOICE.words[key]) return;
    const [off, dur] = VOICE.words[key];
    const s = new AudioBufferSourceNode(ctx, { buffer: sprite });
    s.connect(E.cues);
    if (sched.word)
      try {
        sched.word.stop(when);
      } catch {
        /* */
      }
    s.start(when, off, dur);
    sched.word = s;
  }
  // set time -> ctx time for the next stretch of playback, loops included
  const ctxOf = (e, t, bt) => {
    if (e.loop && bt < t) return e.ctx.currentTime + (e.loop.end - t + (bt - e.loop.start)) / e.rate;
    return e.ctx.currentTime + (bt - t) / e.rate;
  };
  let clickedTo = 0; // ctx time up to which clicks are scheduled
  setInterval(() => {
    const e = eng(),
      tl = app.tl();
    if (!e.playing) return;
    // the click (in-ears, or the main output while rehearsing), loops included
    if ((st.iemMode !== "off" && st.click) || st.clickMain) {
      const t = e.now(),
        span = 0.15 * e.rate,
        c = e.ctx.currentTime;
      const ranges = [[t, t + span]];
      if (e.loop && t + span > e.loop.end)
        ranges.push([e.loop.start, e.loop.start + (t + span - e.loop.end)]);
      for (const [a, b] of ranges)
        for (const [bt, pos] of tl.beats) {
          if (bt < a) continue;
          if (bt >= b) break;
          const when = ctxOf(e, t, bt);
          if (when <= clickedTo + 0.01 || when < c) continue;
          const s = new AudioBufferSourceNode(ctx, { buffer: clickBuf, playbackRate: pos === 1 ? 1 : 0.75 });
          const g = new GainNode(ctx, { gain: pos === 1 ? 1 : 0.6 });
          s.connect(g).connect(E.click);
          s.start(when);
          clickedTo = when;
        }
    }
    if (e.loop || st.iemMode === "off") return;
    if (sched.tl !== tl) sched = { ...sched, tl, events: eventsFor(tl), next: 0 };
    const t = e.now(),
      ahead = t + 0.15 * e.rate;
    // after a jump backwards (or a big skip forwards), find our place again
    if (sched.events[sched.next - 1]?.t > t + 0.5 || sched.events[sched.next]?.t < t - 2) sched.next = 0;
    while (sched.events[sched.next] && sched.events[sched.next].t < t) sched.next++;
    while (sched.events[sched.next] && sched.events[sched.next].t < ahead) {
      const ev = sched.events[sched.next++];
      if (st.cues) say(ev.key, Math.max(ctx.currentTime, e.ctxAt(ev.t)));
    }
  }, 25);

  let clickMainOn = false;
  return {
    st,
    FX,
    stream: () => N.stream || null,
    micNode: () => (st.mic ? N.hp : null), // 16 · the mic, dry (high-passed only), for the show capture
    // 12 · rehearsal: the click on the main output too
    clickToMain(on) {
      st.clickMain = on;
      if (on && !clickMainOn) E.click.connect(eng().master);
      if (!on && clickMainOn)
        try {
          E.click.disconnect(eng().master);
        } catch {
          /* */
        }
      clickMainOn = on;
    },
    enableMic,
    disableMic,
    learnRoom,
    resetGuard,
    setEars,
    setLevel,
    say: (key) => say(key, ctx.currentTime + 0.02),
    setToPA(on) {
      st.toPA = on;
      N.toPA?.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.02);
      if (!on) resetGuard();
      save();
      changed();
    },
    toggleFx(name) {
      if (st.fx.has(name)) st.fx.delete(name);
      else {
        if (TONES.includes(name)) TONES.forEach((t) => st.fx.delete(t));
        st.fx.add(name);
      }
      applyFx();
      save();
      changed();
    },
    setTrim(db) {
      st.trim = db;
      N.trim?.gain.setTargetAtTime(Math.pow(10, db / 20), ctx.currentTime, 0.02);
      save();
    },
    set(key, v) {
      st[key] = v;
      save();
      changed();
    },
  };
}

function plateIR(ctx, sec) {
  const n = Math.floor(ctx.sampleRate * sec),
    b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 4);
  }
  return b;
}
function driveCurve(k) {
  const n = 2048,
    c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}
