// The live page's audio engine (Web Audio).
//
// The set is 20 song files that butt end to end. Each song plays two sample-locked versions (the
// master and the instrumental, which is the master minus its vocal), so the VOX fader is a true
// vocal level: mix = (1 - x) * master + x * instrumental = master - x * vocal.
// MP3s carry encoder priming at the start and padding at the end; we know each file's exact length,
// so every decoded buffer is trimmed to its real samples and songs are scheduled back to back on the
// AudioContext clock: gapless. Only the current and next songs are kept decoded (a full decode of
// both versions of the set would be ~3 GB of RAM).

const SR_FALLBACK = 48000;

export class Engine {
  constructor(timeline, getBytes) {
    this.tl = timeline; // { songs: [{n, start, frames, ...}], duration, beats, ... }
    this.getBytes = getBytes; // (n, kind) -> Promise<ArrayBuffer>  kind: "m" | "i"
    this.ctx = null;
    this.bufs = new Map(); // "n:m" -> AudioBuffer (trimmed)
    this.decoding = new Map();
    this.voices = []; // scheduled songs: {n, m, i, when}
    this.playing = false;
    this.rate = 1;
    this.anchorCtx = 0; // ctx time at anchorSet
    this.anchorSet = 0; // set time (s)
    this.loop = null; // {start, end} in set time
    this.vox = 1; // 1 = full vocal
    this.onstate = () => {};
  }

  // ---------- graph ----------
  async init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
    this.ctx = ctx;
    this.sr = ctx.sampleRate || SR_FALLBACK;
    // per-version buses -> song bus
    this.gM = ctx.createGain();
    this.gI = ctx.createGain();
    this.song = ctx.createGain();
    this.gM.connect(this.song);
    this.gI.connect(this.song);
    // 3-band EQ (the LOW / MID / HIGH faders) and a bipolar filter
    this.lo = new BiquadFilterNode(ctx, { type: "lowshelf", frequency: 220 });
    this.mid = new BiquadFilterNode(ctx, { type: "peaking", frequency: 1100, Q: 0.7 });
    this.hi = new BiquadFilterNode(ctx, { type: "highshelf", frequency: 4200 });
    this.lp = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 22000, Q: 0.9 });
    this.hp = new BiquadFilterNode(ctx, { type: "highpass", frequency: 10, Q: 0.9 });
    // crush bites in the mids: high-passed, driven into 5 bits, a lift at 1.8 kHz
    this.crush = new WaveShaperNode(ctx, { curve: crushCurve(5, 1.8), oversample: "2x" });
    this.crushWet = ctx.createGain();
    this.crushWet.gain.value = 0;
    this.dry = ctx.createGain();
    this.song.connect(this.lo).connect(this.mid).connect(this.hi).connect(this.lp).connect(this.hp);
    this.hp.connect(this.dry);
    this.hp
      .connect(new BiquadFilterNode(ctx, { type: "highpass", frequency: 220 }))
      .connect(this.crush)
      .connect(new BiquadFilterNode(ctx, { type: "peaking", frequency: 1800, Q: 0.8, gain: 4 }))
      .connect(this.crushWet);
    // sends: a tempo-synced ping-pong echo (left -> right, darker each repeat) and a reverb
    this.post = ctx.createGain();
    this.dry.connect(this.post);
    this.crushWet.connect(this.post);
    this.echoSend = ctx.createGain();
    this.echoSend.gain.value = 0;
    this.delayL = new DelayNode(ctx, { maxDelayTime: 4, delayTime: 0.3 });
    this.delayR = new DelayNode(ctx, { maxDelayTime: 4, delayTime: 0.3 });
    const fb = new GainNode(ctx, { gain: 0.5 }),
      dark = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 3200 }),
      pan = new ChannelMergerNode(ctx, { numberOfInputs: 2 });
    this.post
      .connect(this.echoSend)
      .connect(new BiquadFilterNode(ctx, { type: "highpass", frequency: 350 }))
      .connect(new GainNode(ctx, { gain: 0.8 }))
      .connect(this.delayL);
    this.delayL.connect(dark).connect(this.delayR).connect(fb).connect(this.delayL);
    this.delayL.connect(pan, 0, 0);
    this.delayR.connect(pan, 0, 1);
    pan.connect(this.post);
    // reverb: a short pre-delay, nothing below 450 Hz, a tail that darkens as it decays
    this.revSend = ctx.createGain();
    this.revSend.gain.value = 0;
    this.verb = new ConvolverNode(ctx, { buffer: reverbIR(ctx, 2.2) });
    this.post
      .connect(this.revSend)
      .connect(new BiquadFilterNode(ctx, { type: "highpass", frequency: 450 }))
      .connect(this.verb)
      .connect(this.post);
    // pads join after the effects, before the master
    this.pads = ctx.createGain();
    this.pads.gain.value = 0.9;
    this.master = ctx.createGain();
    this.master.gain.value = 1;
    this.post.connect(this.master);
    this.pads.connect(this.master);
    this.safety = new DynamicsCompressorNode(ctx, {
      threshold: -1,
      knee: 0,
      ratio: 20,
      attack: 0.002,
      release: 0.1,
    });
    this.master.connect(this.safety).connect(ctx.destination);
    this.recDest = ctx.createMediaStreamDestination();
    this.safety.connect(this.recDest);
    this.analyser = new AnalyserNode(ctx, { fftSize: 1024 });
    this.safety.connect(this.analyser);
    this.setVox(this.vox);
  }

  // ---------- clock ----------
  now() {
    if (!this.ctx || !this.playing) return this.anchorSet;
    const t = this.anchorSet + (this.ctx.currentTime - this.anchorCtx) * this.rate;
    if (this.loop && t >= this.loop.end) {
      const L = this.loop.end - this.loop.start;
      return this.loop.start + ((t - this.loop.start) % L);
    }
    return Math.min(t, this.tl.duration);
  }
  songAt(t) {
    const S = this.tl.songs;
    for (let k = S.length - 1; k >= 0; k--) if (t >= S[k].start - 1e-6) return k;
    return 0;
  }

  // ---------- decoding ----------
  async buffer(k, kind) {
    const key = `${k}:${kind}`;
    if (this.bufs.has(key)) return this.bufs.get(key);
    if (this.decoding.has(key)) return this.decoding.get(key);
    const p = (async () => {
      const bytes = await this.getBytes(this.tl.songs[k].n, kind);
      const raw = await this.ctx.decodeAudioData(bytes.slice(0));
      const song = this.tl.songs[k];
      const buf = trim(
        this.ctx,
        raw,
        song.frames,
        song[kind === "m" ? "pad" : "ipad"],
        song[kind === "m" ? "fp" : "ifp"],
      );
      this.bufs.set(key, buf);
      this.decoding.delete(key);
      return buf;
    })();
    this.decoding.set(key, p);
    return p;
  }
  async ready(k) {
    await Promise.all([this.buffer(k, "m"), this.buffer(k, "i")]);
  }
  forget(keep) {
    for (const key of [...this.bufs.keys()]) if (!keep.has(+key.split(":")[0])) this.bufs.delete(key);
  }

  // ---------- transport ----------
  async play(from = this.anchorSet) {
    await this.init();
    if (this.ctx.state !== "running") await this.ctx.resume();
    this.stopVoices();
    this.slip = null;
    const k = this.songAt(from);
    await this.ready(k);
    this.anchorCtx = this.ctx.currentTime + 0.06;
    this.anchorSet = from;
    this.playing = true;
    this.startSong(k, from);
    this.tick();
    this.onstate();
  }
  pause() {
    if (!this.playing) return;
    this.anchorSet = this.slip ? this.slipTime() : this.now();
    this.slip = null;
    this.playing = false;
    this.loop = null;
    this.stopVoices();
    this.onstate();
  }
  seek(t) {
    t = Math.max(0, Math.min(t, this.tl.duration - 0.05));
    this.loop = null;
    if (this.playing) this.play(t);
    else {
      this.anchorSet = t;
      this.onstate();
    }
  }
  stopVoices() {
    for (const v of this.voices) {
      try {
        v.m.stop();
        v.i.stop();
      } catch {
        /* already stopped */
      }
    }
    this.voices = [];
  }
  // start song k so that set time `from` (inside it) plays at the anchor
  startSong(k, from) {
    const s = this.tl.songs[k];
    const into = Math.max(0, from - s.start);
    const when = this.anchorCtx + (s.start + into - this.anchorSet) / this.rate;
    const m = this.bufs.get(`${k}:m`);
    const i = this.bufs.get(`${k}:i`);
    const v = { k, when, m: this.src(m, this.gM), i: this.src(i, this.gI) };
    v.m.start(Math.max(when, this.ctx.currentTime), into);
    v.i.start(Math.max(when, this.ctx.currentTime), into);
    this.voices.push(v);
    return v;
  }
  src(buf, out) {
    const s = new AudioBufferSourceNode(this.ctx, { buffer: buf, playbackRate: this.rate });
    s.connect(out);
    return s;
  }
  // keeps the next song decoded and scheduled; drops songs that are done
  tick() {
    clearTimeout(this._tick);
    if (!this.playing) return;
    const t = this.now();
    const k = this.songAt(t);
    this.voices = this.voices.filter((v) => v.k >= k);
    const next = k + 1;
    if (next < this.tl.songs.length && !this.loop) {
      const s = this.tl.songs[next];
      const scheduled = this.voices.some((v) => v.k === next);
      if (!scheduled && s.start - t < 20) {
        this.ready(next).then(() => {
          if (this.playing && !this.loop && !this.voices.some((v) => v.k === next))
            this.startSong(next, s.start);
        });
      }
    }
    this.forget(new Set([k, next]));
    if (t >= this.tl.duration - 0.02) {
      this.pause();
      this.anchorSet = 0;
    }
    this._tick = setTimeout(() => this.tick(), 120);
  }

  // ---------- loops (beat loop, roll, rehearsal) ----------
  setLoop(start, end) {
    if (!this.playing) return;
    const v = this.voices.find((x) => x.k === this.songAt(start));
    if (!v) return;
    const s = this.tl.songs[v.k];
    // drop anything scheduled after this song while looping
    this.voices
      .filter((x) => x !== v)
      .forEach((x) => {
        try {
          x.m.stop();
          x.i.stop();
        } catch {
          /* */
        }
      });
    this.voices = [v];
    for (const n of [v.m, v.i]) {
      n.loopStart = start - s.start;
      n.loopEnd = end - s.start;
      n.loop = true;
    }
    this.loop = { start, end };
    this.onstate();
  }
  clearLoop() {
    if (!this.loop) return;
    const t = this.now();
    for (const v of this.voices) {
      v.m.loop = false;
      v.i.loop = false;
    }
    // the sources carry on from where the loop is now: re-anchor the clock there
    this.anchorCtx = this.ctx.currentTime;
    this.anchorSet = t;
    this.loop = null;
    this.tick();
    this.onstate();
  }

  setRate(r) {
    if (!this.ctx) {
      this.rate = r;
      return;
    }
    const t = this.now();
    this.anchorCtx = this.ctx.currentTime;
    this.anchorSet = t;
    this.rate = r;
    for (const v of this.voices) {
      v.m.playbackRate.setValueAtTime(r, this.ctx.currentTime);
      v.i.playbackRate.setValueAtTime(r, this.ctx.currentTime);
    }
    this.stopVoices();
    if (this.playing) this.play(t);
  }

  // restart the set at time t right now (no 60 ms run-up), ducking the song bus over the cut so it
  // doesn't click; spinFrom < 1 starts the new voices slow and spins them up to speed
  jump(t, spinFrom = 0) {
    const k = this.songAt(t);
    if (!this.bufs.has(`${k}:m`) || !this.bufs.has(`${k}:i`)) return this.play(t);
    const c = this.ctx.currentTime,
      at = c + 0.006,
      g = this.song.gain;
    g.cancelScheduledValues(c);
    g.setValueAtTime(g.value, c);
    g.linearRampToValueAtTime(0, at);
    g.linearRampToValueAtTime(1, at + 0.008);
    for (const v of this.voices) {
      try {
        v.m.stop(at);
        v.i.stop(at);
      } catch {
        /* already stopped */
      }
    }
    this.voices = [];
    this.loop = null;
    this.anchorCtx = at;
    this.anchorSet = t;
    this.playing = true;
    const v = this.startSong(k, t);
    if (spinFrom)
      for (const n of [v.m, v.i]) {
        n.playbackRate.setValueAtTime(spinFrom * this.rate, at);
        n.playbackRate.exponentialRampToValueAtTime(this.rate, at + 0.14);
      }
    this.tick();
    this.onstate();
  }
  // where the set would be now if nothing had held it (for slip)
  slipTime() {
    return this.slip ? this.slip.t + (this.ctx.currentTime - this.slip.c) * this.rate : this.now();
  }
  // roll (slip): loop the 1/16 (or `div` of a beat) we're on right now; on release the set carries on
  // exactly where it would have been, still in time
  rollOn(div = 0.25) {
    if (!this.playing || this.slip) return;
    const t = this.now(),
      L = (60 / this.bpmAt(t)) * div,
      a = Math.max(this.tl.songs[this.songAt(t)].start, this.prevGrid(t, div));
    this.slip = { t, c: this.ctx.currentTime };
    this.setLoop(a, a + L);
  }
  rollOff() {
    if (!this.slip || this.slip.tape) return;
    const t = this.slipTime();
    this.slip = null;
    this.jump(t);
  }
  // tape stop (hold): the record brakes to a crawl while held; on release it spins back up and carries
  // on where it would have been
  tapeOn(sec = 0.9) {
    if (!this.playing || this.slip) return;
    const c = this.ctx.currentTime;
    this.slip = { t: this.now(), c, tape: true };
    for (const v of this.voices)
      for (const n of [v.m, v.i]) {
        n.playbackRate.cancelScheduledValues(c);
        n.playbackRate.setValueAtTime(this.rate, c);
        n.playbackRate.exponentialRampToValueAtTime(0.02, c + sec);
      }
  }
  tapeOff() {
    if (!this.slip?.tape) return;
    const t = this.slipTime();
    this.slip = null;
    this.jump(t, 0.4);
  }

  // ---------- mixer ----------
  setVox(x) {
    // x = 1 full vocal; 0 = instrumental (CROWD)
    this.vox = x;
    if (!this.ctx) return;
    const c = this.ctx.currentTime;
    this.gM.gain.setTargetAtTime(x, c, 0.015);
    this.gI.gain.setTargetAtTime(1 - x, c, 0.015);
  }
  setEq(band, v) {
    // v in 0..1, cut-only like a DJ mixer: 1 = flat (the song as mastered), turning down cuts the band
    // (half way = -6 dB) to a kill (-40 dB) at the bottom; never a boost
    const db = v >= 0.995 ? 0 : v <= 0.01 ? -40 : Math.max(-40, 20 * Math.log10(v));
    const node = { low: this.lo, mid: this.mid, high: this.hi }[band];
    if (node) node.gain.setTargetAtTime(db, this.ctx.currentTime, 0.02);
  }
  setFilter(v) {
    // -1 .. 0 .. 1 : low-pass sweep left, high-pass sweep right
    const c = this.ctx.currentTime;
    const lp = v < 0 ? 22000 * Math.pow(150 / 22000, -v) : 22000;
    const hp = v > 0 ? 10 * Math.pow(4000 / 10, v) : 10;
    this.lp.frequency.setTargetAtTime(lp, c, 0.03);
    this.hp.frequency.setTargetAtTime(hp, c, 0.03);
  }
  setMaster(v) {
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }
  setEcho(on, beats = 0.75) {
    const beat = 60 / this.bpmAt(this.now());
    const c = this.ctx.currentTime;
    for (const d of [this.delayL, this.delayR])
      d.delayTime.setTargetAtTime(Math.min(3.9, beat * beats), c, 0.01);
    this.echoSend.gain.setTargetAtTime(on ? 0.6 : 0, c, 0.008);
  }
  setReverb(on) {
    this.revSend.gain.setTargetAtTime(on ? 0.45 : 0, this.ctx.currentTime, 0.01);
  }
  setCrush(on) {
    const c = this.ctx.currentTime;
    this.crushWet.gain.setTargetAtTime(on ? 0.8 : 0, c, 0.008);
    this.dry.gain.setTargetAtTime(on ? 0.35 : 1, c, 0.008);
  }
  panic(on, sec = 1.6) {
    const c = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(c);
    this.master.gain.setValueAtTime(this.master.gain.value, c);
    this.master.gain.linearRampToValueAtTime(on ? 0 : (this.masterLevel ?? 1), c + (on ? sec : 0.3));
  }

  // ---------- beat grid ----------
  bpmAt(t) {
    const s = this.tl.songs[this.songAt(t)];
    return s ? s.bpm : 140;
  }
  // next beat (or 1/16, bar) time at or after t, from the analysed beats
  nextGrid(t, div = 1) {
    const B = this.tl.beats;
    let lo = 0,
      hi = B.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (B[mid][0] < t) lo = mid + 1;
      else hi = mid;
    }
    if (div === "bar") {
      for (let k = lo; k < B.length; k++) if (B[k][1] === 1) return B[k][0];
      return t;
    }
    const b1 = B[lo] ? B[lo][0] : t;
    const b0 = B[lo - 1] ? B[lo - 1][0] : b1 - 0.4;
    if (div >= 1) return b1;
    const step = (b1 - b0) * div;
    const k = Math.ceil((t - b0) / step - 1e-6);
    return b0 + k * step;
  }
  // the grid line (1/16, beat …) at or before t
  prevGrid(t, div = 1) {
    const B = this.tl.beats;
    let k = 0;
    while (k + 1 < B.length && B[k + 1][0] <= t + 1e-6) k++;
    const b0 = B[k] ? B[k][0] : t,
      b1 = B[k + 1] ? B[k + 1][0] : b0 + 60 / this.bpmAt(t);
    if (div >= 1) return b0;
    const step = (b1 - b0) * div;
    return b0 + Math.floor((t - b0) / step + 1e-6) * step;
  }
  // set time -> ctx time (for scheduling pads on the grid)
  ctxAt(setT) {
    return this.anchorCtx + (setT - this.anchorSet) / this.rate;
  }
  barStart(t) {
    const B = this.tl.beats;
    let best = null;
    for (const b of B) {
      if (b[0] > t + 1e-3) break;
      if (b[1] === 1) best = b[0];
    }
    return best ?? t;
  }
  barLen(t) {
    return (4 * 60) / this.bpmAt(t);
  }
}

// keep the real samples. Browsers differ in how much of the MP3's encoder priming and decoder delay
// they leave at the front (Chrome: 576 + 529 samples; Safari honours the gapless tag), so find the
// file's fingerprint (64 true samples at a known spot) in the decode and cut exactly there.
function trim(ctx, raw, frames, pad, fp) {
  let start = -1;
  if (fp && fp.v && fp.v.length) {
    const d = raw.getChannelData(0),
      v = fp.v,
      n = v.length;
    let best = Infinity;
    for (let off = 0; off <= 3000; off++) {
      let e = 0;
      for (let j = 0; j < n && e < best; j++) {
        const x = d[fp.at + off + j] - v[j];
        e += x * x;
      }
      if (e < best) {
        best = e;
        start = off;
      }
    }
  }
  if (start < 0) {
    const extra = raw.length - frames;
    start = extra <= 0 ? 0 : Math.max(0, extra - (pad || 0));
  }
  const n = Math.min(frames, raw.length - start);
  const out = ctx.createBuffer(raw.numberOfChannels, frames, raw.sampleRate);
  for (let c = 0; c < raw.numberOfChannels; c++)
    out.copyToChannel(raw.getChannelData(c).subarray(start, start + n), c);
  return out;
}

function crushCurve(bits, drive = 1) {
  const n = 4096,
    steps = Math.pow(2, bits),
    c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = Math.tanh(((i / (n - 1)) * 2 - 1) * drive) / Math.tanh(drive);
    c[i] = Math.round(x * steps) / steps;
  }
  return c;
}

// noise tail with a 30 ms pre-delay, low-passed harder as it decays (a darker, cleaner plate)
function reverbIR(ctx, sec, pre = 0.03) {
  const n = Math.floor(ctx.sampleRate * sec),
    pd = Math.floor(ctx.sampleRate * pre),
    b = ctx.createBuffer(2, n + pd, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      lp += ((Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4) - lp) * (0.35 - 0.25 * (i / n));
      d[i + pd] = lp;
    }
  }
  return b;
}
