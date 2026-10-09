// 04 · Show safety: keeps the screen awake, watches the audio output, the battery and the network, and
// if the browser stops the audio mid-song (an interface unplugged, the system taking the sound device,
// a sleeping tab) it picks it back up and carries on from the start of the same bar.
//
// app: { engine(), toast(t), outputId(), onChange() }
export function startSafety(app) {
  const st = {
    awake: null, // true / false / null (not supported)
    audio: true,
    output: true,
    battery: null, // { level, charging } or null (not reported by this browser)
    online: navigator.onLine,
    resumed: 0,
  };
  const changed = () => app.onChange?.(st);

  // screen wake lock (Chrome, Edge, Safari 16.4+): re-taken whenever the page comes back to the front
  let lock = null;
  const wake = async () => {
    if (!("wakeLock" in navigator)) return ((st.awake = null), changed());
    try {
      lock = await navigator.wakeLock.request("screen");
      st.awake = true;
      lock.addEventListener("release", () => {
        st.awake = false;
        changed();
      });
    } catch {
      st.awake = false;
    }
    changed();
  };
  wake();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (!lock || lock.released) wake();
      recover("THE PAGE WAS IN THE BACKGROUND");
    }
  });

  // the audio: if the browser suspends or interrupts it while the show is playing, resume and carry on
  // from the start of the bar it stopped in
  const ctx = app.engine().ctx;
  async function recover(why) {
    const e = app.engine();
    if (!e?.playing || e.ctx.state === "running") return;
    try {
      await e.ctx.resume();
    } catch {
      st.audio = false;
      changed();
      return;
    }
    e.jump(e.barStart(e.now()));
    st.resumed++;
    st.audio = true;
    app.toast(`${why} · CARRIED ON FROM THE SAME BAR`);
    changed();
  }
  ctx.addEventListener("statechange", () => {
    st.audio = ctx.state === "running" || !app.engine().playing;
    changed();
    if (ctx.state !== "running") setTimeout(() => recover("AUDIO WAS INTERRUPTED"), 150);
  });

  // the output device: if the chosen one disappears, fall back to the system default
  navigator.mediaDevices?.addEventListener?.("devicechange", async () => {
    const id = app.outputId();
    if (!id || !ctx.setSinkId) return;
    const outs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audiooutput");
    if (!outs.some((d) => d.deviceId === id)) {
      st.output = false;
      try {
        await ctx.setSinkId("");
        app.toast("AUDIO OUTPUT UNPLUGGED · SWITCHED TO THE DEFAULT OUTPUT");
      } catch {
        app.toast("AUDIO OUTPUT UNPLUGGED");
      }
      setTimeout(() => recover("OUTPUT CHANGED"), 300);
    } else st.output = true;
    changed();
  });

  // battery (Chrome / Edge report it; Safari doesn't)
  navigator.getBattery?.().then((b) => {
    let warned = false;
    const read = () => {
      st.battery = { level: b.level, charging: b.charging };
      if (!b.charging && b.level < 0.2 && !warned) {
        warned = true;
        app.toast(`BATTERY ${Math.round(b.level * 100)}% · PLUG THE LAPTOP IN`);
      }
      if (b.charging) warned = false;
      changed();
    };
    read();
    b.addEventListener("levelchange", read);
    b.addEventListener("chargingchange", read);
  });

  addEventListener("online", () => ((st.online = true), changed()));
  addEventListener("offline", () => ((st.online = false), changed()));
  changed();
  return st;
}

// the rows the safety panel shows: [ok (true / false / null = n/a), label, note]
export function safetyRows(st, extra = []) {
  const b = st.battery;
  return [
    [
      st.awake,
      "SCREEN STAYS AWAKE",
      st.awake == null ? "NOT IN THIS BROWSER · TURN OFF SLEEP" : st.awake ? "ON" : "RE-TAKING…",
    ],
    [st.audio, "AUDIO RUNNING", st.resumed ? `RESUMED ${st.resumed}×` : "AUTO-RESUME ARMED"],
    [st.output, "AUDIO OUTPUT", st.output ? "CONNECTED" : "LOST · ON THE DEFAULT"],
    [
      b ? b.charging || b.level >= 0.2 : null,
      "BATTERY",
      b ? `${Math.round(b.level * 100)}%${b.charging ? " · CHARGING" : ""}` : "NOT REPORTED",
    ],
    [true, "NETWORK", st.online ? "ONLINE (NOT NEEDED)" : "OFFLINE · FINE, ALL FILES ARE LOCAL"],
    ...extra,
  ];
}
