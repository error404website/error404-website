// Ableton backup · STANDBY (menu → CONTROL → ABLETON STANDBY, Chrome / Edge): when the show runs from the
// Ableton set, its E404 SHOW device sends the set position over the Mac's IAC bus as CCs on MIDI channel 16
// (CC 110-114 = the position in ms, 7 bits each, most significant first; CC 115 = playing). In standby the
// page stays silent, follows that position (lyrics, song loaded and the next one ready), and TAKE OVER
// starts its own playback from the same spot: the backup if Ableton or the laptop's audio falls over.

const CH16_CC = 0xbf,
  FIRST = 110,
  PLAYING = 115,
  LOST_MS = 600; // no feed for this long while Ableton said it was playing = it has stopped / crashed

// app: { engine(), tl(), toast(t), midi() -> Promise<boolean> (connects MIDI), hhmmss(t) }
export function makeStandby(app) {
  const st = {
    on: false,
    pos: 0,
    playing: false,
    at: 0,
    seen: false,
    parts: [0, 0, 0, 0, 0],
    k: -1,
    lost: false,
  };
  const el = document.createElement("div");
  el.className = "lv-standby";
  el.hidden = true;
  el.innerHTML = `<span class="lv-lbl">ABLETON</span><b id="sbPos">--:--</b><em id="sbState">WAITING FOR THE FEED</em
    ><button class="lv-btn lv-sb-take" id="sbTake" type="button"><span>TAKE OVER</span></button
    ><button class="lv-btn" id="sbOff" type="button" aria-label="Leave standby"><span>✕</span></button>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);

  // where Ableton is now: the last position, carried on if it was playing
  const now = () => st.pos + (st.playing ? (performance.now() - st.at) / 1000 : 0);

  function render() {
    if (!st.on) return;
    const lost = st.seen && st.playing && performance.now() - st.at > LOST_MS;
    if (lost !== st.lost) {
      st.lost = lost;
      if (lost) app.toast("ABLETON HAS STOPPED SENDING · TAKE OVER?");
    }
    el.classList.toggle("lost", lost);
    $("#sbPos").textContent = st.seen ? app.hhmmss(now()) : "--:--";
    $("#sbState").textContent = !st.seen
      ? "WAITING FOR THE FEED"
      : lost
        ? "FEED LOST · TAKE OVER"
        : st.playing
          ? "PLAYING · PAGE ON STANDBY"
          : "STOPPED";
  }

  // keep the page on Ableton's spot (silently) and its song + the next one decoded
  let follow = 0;
  function tick() {
    if (!st.on) return;
    const e = app.engine();
    if (st.seen && !e.playing) {
      const t = now();
      if (Math.abs(e.now() - t) > 0.05) e.seek(t);
      const k = e.songAt(t);
      if (k !== st.k) {
        st.k = k;
        e.ready(k).catch(() => {});
        if (app.tl().songs[k + 1]) e.ready(k + 1).catch(() => {});
      }
    }
    render();
    follow = setTimeout(tick, 250);
  }

  // every MIDI message comes here first; true = it was the feed (so learn / mappings never see it)
  function feed(data) {
    const [s, cc, v] = data;
    if (s !== CH16_CC || cc < FIRST || cc > PLAYING) return false;
    if (cc < PLAYING) {
      st.parts[cc - FIRST] = v;
      return true;
    }
    const ms = st.parts.reduce((a, p) => a * 128 + p, 0);
    st.pos = ms / 1000;
    st.playing = v > 0;
    st.at = performance.now();
    st.seen = true;
    return true;
  }

  async function take() {
    const e = app.engine(),
      t = now();
    stop();
    await e.ready(e.songAt(t)).catch(() => {});
    e.playing ? e.jump(t) : e.play(t);
    app.toast("THE PAGE HAS TAKEN OVER");
  }

  async function start() {
    if (!(await app.midi())) return;
    st.on = true;
    st.seen = false;
    st.lost = false;
    el.hidden = false;
    app.toast("ABLETON STANDBY · THE PAGE FOLLOWS ABLETON, SILENT, UNTIL YOU TAKE OVER");
    clearTimeout(follow);
    tick();
  }
  function stop() {
    st.on = false;
    el.hidden = true;
    clearTimeout(follow);
  }
  $("#sbTake").onclick = take;
  $("#sbOff").onclick = stop;

  return { feed, take, toggle: () => (st.on ? stop() : start()), st };
}
