// The 16 pads. Drums and FX are synthesised once (OfflineAudioContext); the four VOX pads are cut on
// the fly from the playing song: master minus instrumental is exactly the vocal, so each VOX pad is
// the opening word of one of the song's hook / chorus lines, vocal only.

export const PAD_DEFS = [
  { key: "1", name: "KICK", q: 0.25 },
  { key: "2", name: "SNARE", q: 0.25 },
  { key: "3", name: "CLAP", q: 0.25 },
  { key: "4", name: "HAT", q: 0.25 },
  { key: "Q", name: "808 DROP", q: 1 },
  { key: "W", name: "SUB BOOM", q: 1 },
  { key: "E", name: "RISER", q: "bar" },
  { key: "R", name: "SIREN", q: 1 },
  { key: "A", name: "GLITCH", q: 0.25 },
  { key: "S", name: "STUTTER", q: 1, fx: "stutter" },
  { key: "D", name: "TAPE STOP", q: 1, fx: "tapestop" },
  { key: "F", name: "REWIND", q: 1 },
  { key: "Z", name: "VOX 1", q: 1, vox: 0 },
  { key: "X", name: "VOX 2", q: 1, vox: 1 },
  { key: "C", name: "VOX 3", q: 1, vox: 2 },
  { key: "V", name: "VOX 4", q: 1, vox: 3 },
];

const render = async (sec, fn, sr = 48000) => {
  const ctx = new OfflineAudioContext(2, Math.ceil(sec * sr), sr);
  fn(ctx);
  return ctx.startRendering();
};
const noise = (ctx, sec) => {
  const b = ctx.createBuffer(1, Math.ceil(sec * ctx.sampleRate), ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = new AudioBufferSourceNode(ctx, { buffer: b });
  return s;
};
const env = (ctx, a, d, peak = 1, t = 0) => {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
};

export async function synthKit() {
  const kit = {};
  kit.KICK = await render(0.6, (c) => {
    const o = new OscillatorNode(c, { frequency: 150 });
    o.frequency.exponentialRampToValueAtTime(42, 0.12);
    o.connect(env(c, 0.002, 0.45, 1)).connect(c.destination);
    o.start();
  });
  kit.SNARE = await render(0.4, (c) => {
    const n = noise(c, 0.4);
    n.connect(new BiquadFilterNode(c, { type: "highpass", frequency: 1200 }))
      .connect(env(c, 0.001, 0.22, 0.8))
      .connect(c.destination);
    const o = new OscillatorNode(c, { type: "triangle", frequency: 190 });
    o.connect(env(c, 0.001, 0.12, 0.6)).connect(c.destination);
    n.start();
    o.start();
  });
  kit.CLAP = await render(0.5, (c) => {
    for (const t of [0, 0.012, 0.024, 0.04]) {
      const n = noise(c, 0.3);
      n.connect(new BiquadFilterNode(c, { type: "bandpass", frequency: 1600, Q: 1.2 }))
        .connect(env(c, 0.001, t === 0.04 ? 0.25 : 0.03, 0.9, t))
        .connect(c.destination);
      n.start(t);
    }
  });
  kit.HAT = await render(0.15, (c) => {
    const n = noise(c, 0.15);
    n.connect(new BiquadFilterNode(c, { type: "highpass", frequency: 7000 }))
      .connect(env(c, 0.001, 0.06, 0.5))
      .connect(c.destination);
    n.start();
  });
  kit["808 DROP"] = await render(2.2, (c) => {
    const o = new OscillatorNode(c, { frequency: 110 });
    o.frequency.exponentialRampToValueAtTime(32, 1.8);
    const s = new WaveShaperNode(c, { curve: soft(2.5) });
    o.connect(s)
      .connect(env(c, 0.003, 2, 0.9))
      .connect(c.destination);
    o.start();
  });
  kit["SUB BOOM"] = await render(2.5, (c) => {
    const o = new OscillatorNode(c, { frequency: 55 });
    o.frequency.exponentialRampToValueAtTime(30, 2.2);
    o.connect(env(c, 0.01, 2.3, 1)).connect(c.destination);
    const n = noise(c, 0.3);
    n.connect(new BiquadFilterNode(c, { type: "lowpass", frequency: 300 }))
      .connect(env(c, 0.001, 0.25, 0.6))
      .connect(c.destination);
    o.start();
    n.start();
  });
  kit.RISER = await render(6.5, (c) => {
    const n = noise(c, 6.5);
    const f = new BiquadFilterNode(c, { type: "bandpass", frequency: 300, Q: 4 });
    f.frequency.exponentialRampToValueAtTime(9000, 6.3);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, 0);
    g.gain.exponentialRampToValueAtTime(0.7, 6.3);
    g.gain.linearRampToValueAtTime(0, 6.5);
    n.connect(f).connect(g).connect(c.destination);
    n.start();
  });
  kit.SIREN = await render(3, (c) => {
    const o = new OscillatorNode(c, { type: "sawtooth", frequency: 600 });
    const lfo = new OscillatorNode(c, { frequency: 2.2 });
    const depth = new GainNode(c, { gain: 380 });
    lfo.connect(depth).connect(o.frequency);
    o.connect(new BiquadFilterNode(c, { type: "lowpass", frequency: 3200 }))
      .connect(env(c, 0.05, 2.8, 0.35))
      .connect(c.destination);
    o.start();
    lfo.start();
  });
  kit.GLITCH = await render(0.5, (c) => {
    for (let k = 0; k < 9; k++) {
      const t = k * 0.045;
      const o = new OscillatorNode(c, { type: "square", frequency: 200 + Math.random() * 3000 });
      o.connect(env(c, 0.001, 0.02, 0.35, t)).connect(c.destination);
      o.start(t);
      o.stop(t + 0.04);
    }
  });
  kit.REWIND = await render(1.4, (c) => {
    const n = noise(c, 1.4);
    const f = new BiquadFilterNode(c, { type: "bandpass", frequency: 6000, Q: 2 });
    f.frequency.exponentialRampToValueAtTime(200, 1.3);
    const o = new OscillatorNode(c, { type: "sawtooth", frequency: 900 });
    o.frequency.exponentialRampToValueAtTime(60, 1.3);
    const g = env(c, 0.02, 1.35, 0.5);
    n.connect(f).connect(g).connect(c.destination);
    o.connect(new GainNode(c, { gain: 0.15 })).connect(g);
    n.start();
    o.start();
  });
  return kit;
}

function soft(k) {
  const n = 1024,
    c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

// vocal chop: (master - instrumental) over [t0, t0+len] of a song's buffers, with short fades
export function vocalChop(ctx, mBuf, iBuf, t0, len = 0.7) {
  const sr = mBuf.sampleRate;
  const a = Math.max(0, Math.floor(t0 * sr)),
    n = Math.min(Math.floor(len * sr), mBuf.length - a);
  if (n <= 0) return null;
  const out = ctx.createBuffer(mBuf.numberOfChannels, n, sr);
  const f = Math.min(480, n >> 2);
  for (let c = 0; c < mBuf.numberOfChannels; c++) {
    const m = mBuf.getChannelData(c).subarray(a, a + n),
      i = iBuf.getChannelData(c).subarray(a, a + n),
      d = out.getChannelData(c);
    for (let k = 0; k < n; k++) {
      const g = k < f ? k / f : k > n - f ? (n - k) / f : 1;
      d[k] = (m[k] - i[k]) * g * 1.4;
    }
  }
  return out;
}
