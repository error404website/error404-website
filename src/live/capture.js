// 16 · Show capture. REC records the show mix (exactly what the PA gets) and, if the mic is on, your
// mic on its own, as 16-bit WAVs at the page's sample rate, so they can be mixed later. An AudioWorklet
// hands over the samples and they're written to the browser's private file storage as the show goes
// (a 70-minute show never sits in memory); where that storage isn't available they're kept in memory.
// Alongside: a cue sheet of every song, effect, cue and move with its time, and a short show report.
// STOP opens AFTER THE SHOW with the files to download.

const WORKLET = `
class Tap extends AudioWorkletProcessor {
  constructor() { super(); this.ch = []; this.n = 0; }
  process(inputs) {
    const inp = inputs[0];
    if (inp && inp.length) {
      if (!this.ch.length) this.ch = inp.map(() => new Float32Array(16384));
      for (let c = 0; c < this.ch.length; c++) this.ch[c].set(inp[c] || inp[0], this.n);
      this.n += inp[0].length;
      if (this.n >= 16384 - 128) {
        this.port.postMessage(this.ch.map((a) => a.slice(0, this.n)));
        this.n = 0;
      }
    }
    return true;
  }
}
registerProcessor("e404-tap", Tap);`;

const wavHeader = (frames, ch, sr) => {
  const b = new DataView(new ArrayBuffer(44)),
    w = (o, s) => [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  const bytes = frames * ch * 2;
  w(0, "RIFF");
  b.setUint32(4, 36 + bytes, true);
  w(8, "WAVE");
  w(12, "fmt ");
  b.setUint32(16, 16, true);
  b.setUint16(20, 1, true);
  b.setUint16(22, ch, true);
  b.setUint32(24, sr, true);
  b.setUint32(28, sr * ch * 2, true);
  b.setUint16(32, ch * 2, true);
  b.setUint16(34, 16, true);
  w(36, "data");
  b.setUint32(40, bytes, true);
  return b.buffer;
};
const toPCM = (chs) => {
  const n = chs[0].length,
    C = chs.length,
    out = new Int16Array(n * C);
  for (let i = 0; i < n; i++)
    for (let c = 0; c < C; c++) {
      const x = Math.max(-1, Math.min(1, chs[c][i]));
      out[i * C + c] = x < 0 ? x * 0x8000 : x * 0x7fff;
    }
  return out.buffer;
};

// one recorded track: a worklet tap on `node`, written to OPFS (or memory)
async function track(ctx, node, name, channels) {
  const tap = new AudioWorkletNode(ctx, "e404-tap", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: channels,
    channelCountMode: "explicit",
  });
  node.connect(tap);
  // a silent path to the output keeps the tap running in every browser
  const mute = new GainNode(ctx, { gain: 0 });
  tap.connect(mute).connect(ctx.destination);
  const t = { name, channels, frames: 0, parts: null, writer: null, handle: null, queue: Promise.resolve() };
  try {
    const dir = await navigator.storage.getDirectory();
    t.handle = await dir.getFileHandle(name, { create: true });
    t.writer = await t.handle.createWritable();
    await t.writer.write(wavHeader(0, channels, ctx.sampleRate)); // the real sizes go in at the end
  } catch {
    t.writer = null;
    t.parts = [wavHeader(0, channels, ctx.sampleRate)];
  }
  tap.port.onmessage = (e) => {
    const pcm = toPCM(e.data);
    t.frames += e.data[0].length;
    if (t.writer) t.queue = t.queue.then(() => t.writer.write(pcm));
    else t.parts.push(pcm);
  };
  t.stop = async () => {
    tap.port.onmessage = null;
    try {
      node.disconnect(tap);
      mute.disconnect();
    } catch {
      /* */
    }
    const head = wavHeader(t.frames, channels, ctx.sampleRate);
    if (t.writer) {
      await t.queue;
      await t.writer.write({ type: "write", position: 0, data: head });
      await t.writer.close();
      return t.handle.getFile();
    }
    t.parts[0] = head;
    return new Blob(t.parts, { type: "audio/wav" });
  };
  return t;
}

// app: { engine(), micNode(), tl(), toast, fmt, curfew() }
export function makeCapture(app) {
  const st = { on: false, t0: 0, files: [], log: [], stats: null };
  let tracks = [],
    loaded = false;
  const clock = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  async function start() {
    const e = app.engine(),
      ctx = e.ctx;
    if (!window.AudioWorkletNode) return app.toast("RECORDING NEEDS A NEWER BROWSER");
    if (!loaded) {
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
      await ctx.audioWorklet.addModule(url);
      loaded = true;
    }
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    // a full show is ~800 MB: keep the two most recent shows in the browser's storage, drop older ones
    try {
      const dir = await navigator.storage.getDirectory(),
        names = [];
      for await (const [n] of dir.entries()) if (n.startsWith("error_404_live_")) names.push(n);
      const shows = [...new Set(names.map((n) => n.slice(15, 31)))].sort().reverse();
      for (const n of names) if (!shows.slice(0, 2).includes(n.slice(15, 31))) await dir.removeEntry(n);
    } catch {
      /* no private storage here */
    }
    st.files = [];
    st.log = [];
    st.stats = { songs: [], cues: 0, moves: 0, panics: 0, loops: 0, fx: 0 };
    tracks = [await track(ctx, e.out, `error_404_live_${stamp}_show_mix.wav`, 2)];
    const mic = app.micNode();
    if (mic) tracks.push(await track(ctx, mic, `error_404_live_${stamp}_your_mic.wav`, 1));
    st.on = true;
    st.t0 = Date.now();
    st.stamp = stamp;
    log("REC START");
  }
  function log(text, kind) {
    if (!st.on) return;
    st.log.push([Date.now() - st.t0, text]);
    const s = st.stats;
    if (kind === "song") s.songs.push(text);
    else if (kind) s[kind] = (s[kind] || 0) + 1;
  }
  async function stop() {
    if (!st.on) return [];
    log("REC STOP");
    st.on = false;
    const blobs = await Promise.all(tracks.map((t) => t.stop()));
    tracks.forEach((t, i) => st.files.push({ name: t.name, blob: blobs[i] }));
    const dur = Date.now() - st.t0,
      s = st.stats,
      cf = app.curfew();
    const cue = [`ERROR_404 · ARCHIVE_404 LIVE · ${new Date(st.t0).toString().slice(0, 21)}`, ""]
      .concat(st.log.map(([ms, t]) => `${clock(ms)}  ${t}`))
      .join("\n");
    const report = [
      `ERROR_404 · ARCHIVE_404 LIVE · SHOW REPORT`,
      `${new Date(st.t0).toString().slice(0, 21)}`,
      ``,
      `LENGTH        ${clock(dur)}`,
      `SONGS         ${s.songs.length}${s.songs.length ? ` · ${s.songs.join(", ")}` : ""}`,
      `CURFEW        ${cf ? `${cf} · ${new Date(st.t0 + dur).toTimeString().slice(0, 5) <= cf ? "ON TIME" : "OVER"}` : "NONE SET"}`,
      `HOT CUES      ${s.cues}`,
      `MOVES         ${s.moves}`,
      `EFFECTS       ${s.fx}`,
      `LOOPS         ${s.loops}`,
      `PANICS        ${s.panics}`,
      ``,
      `FILES         ${st.files.map((f) => f.name).join(" · ")}`,
    ].join("\n");
    st.files.push({
      name: `error_404_live_${st.stamp}_cue_sheet.txt`,
      blob: new Blob([cue], { type: "text/plain" }),
    });
    st.files.push({
      name: `error_404_live_${st.stamp}_show_report.txt`,
      blob: new Blob([report], { type: "text/plain" }),
    });
    st.report = report;
    return st.files;
  }
  return { st, start, stop, log };
}

export function download(file) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file.blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
