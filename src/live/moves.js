// 09 · One-button moves, each landing on the next bar line:
//   BUILD-UP   8 bars: the high-pass rises the whole way; bar 7 rolls in 1/8s, bar 8 in 1/16s then
//              1/32s; then it DROPs by itself (press again to call it off)
//   DROP       on the 1: rolls let go (the song comes back exactly in time), the filter snaps open, a kick
//              and a sub boom hit
//   BREAKDOWN  (on / off) the bass cut, reverb on, and the vocal on its own (master minus instrumental)
//   ECHO OUT   the last bar thrown into the echo while the song fades, then the next song from its top
export const MOVES = ["BUILD-UP", "DROP", "BREAKDOWN", "ECHO OUT"];

// app: { engine(), tl(), S, kit(), toast, fxUI(name, on), knob(name, v), onChange(st) }
export function makeMoves(app) {
  const st = { build: null, breakdown: false, echoOut: false };
  const e = () => app.engine();
  const timers = new Set();
  const at = (ctxT, fn) => {
    const id = setTimeout(
      () => {
        timers.delete(id);
        fn();
      },
      Math.max(0, (ctxT - e().ctx.currentTime) * 1000 - 8),
    );
    timers.add(id);
    return id;
  };
  const nextBar = () => {
    const t = e().now(),
      nb = e().nextGrid(t + 0.03, "bar");
    return { at: e().ctxAt(nb > t ? nb : t), bar: e().barLen(t) / e().rate };
  };
  const changed = () => app.onChange?.(st);
  const hit = (name, when) => {
    const buf = app.kit()?.[name];
    if (!buf) return;
    const s = new AudioBufferSourceNode(e().ctx, { buffer: buf });
    s.connect(e().pads);
    s.start(Math.max(e().ctx.currentTime, when));
  };

  function buildUp() {
    if (!e().playing) return app.toast("PLAY FIRST");
    if (st.build) return cancelBuild();
    const { at: a, bar } = nextBar(),
      end = a + 8 * bar;
    e().sweepHP(2500, a, end - 0.03);
    const ids = [
      at(a + 6 * bar, () => e().rollOn(0.5)),
      at(a + 7 * bar, () => (e().rollOff(), e().rollOn(0.25))),
      at(a + 7.5 * bar, () => (e().rollOff(), e().rollOn(0.125))),
      at(end - 0.01, () => drop(end)),
    ];
    st.build = { ids, a, end };
    app.toast("BUILD-UP · 8 BARS · DROPS BY ITSELF (PRESS AGAIN TO CALL IT OFF)");
    changed();
  }
  function cancelBuild() {
    if (!st.build) return;
    st.build.ids.forEach((id) => (clearTimeout(id), timers.delete(id)));
    st.build = null;
    if (e().slip && !e().slip.tape) e().rollOff();
    e().snapFilter(e().ctx.currentTime);
    e().setFilter(app.S.filter);
    app.toast("BUILD-UP CALLED OFF");
    changed();
  }
  function drop(when) {
    if (!e().playing) return;
    if (st.build) st.build.ids.forEach((id) => (clearTimeout(id), timers.delete(id)));
    const a = when ?? nextBar().at;
    at(a, () => {
      if (e().slip && !e().slip.tape) e().rollOff();
      e().snapFilter(e().ctx.currentTime);
      e().setFilter(app.S.filter);
    });
    hit("KICK", a);
    hit("SUB BOOM", a);
    st.build = null;
    changed();
  }
  let before = null;
  function breakdown() {
    if (!e().playing) return app.toast("PLAY FIRST");
    const { at: a } = nextBar(),
      on = !st.breakdown;
    st.breakdown = on;
    changed();
    at(a, () => {
      if (on) {
        before = { reverb: app.fxOn("reverb") };
        e().setEq("low", 0.06);
        e().setReverb(true);
        app.fxUI("reverb", true);
        e().setVocalOnly(true);
      } else {
        e().setEq("low", app.S.eq.low);
        if (!before?.reverb) (e().setReverb(false), app.fxUI("reverb", false));
        e().setVocalOnly(false);
      }
    });
  }
  function echoOut() {
    if (!e().playing) return app.toast("PLAY FIRST");
    const tl = app.tl(),
      k = e().songAt(e().now()),
      next = tl.songs[k + 1];
    if (!next) return app.toast("THE LAST SONG · NOTHING TO ECHO INTO");
    const { at: a, bar } = nextBar();
    st.echoOut = true;
    changed();
    at(a, () => {
      e().setEcho(true);
      app.fxUI("echo", true);
      const g = e().song.gain,
        c = e().ctx.currentTime;
      g.cancelScheduledValues(c);
      g.setValueAtTime(1, c);
      g.linearRampToValueAtTime(0, c + bar);
    });
    at(a + bar, () => e().jump(next.start));
    at(a + 3 * bar, () => {
      e().setEcho(false);
      app.fxUI("echo", false);
      st.echoOut = false;
      changed();
    });
  }
  const run = { "BUILD-UP": buildUp, DROP: () => drop(), BREAKDOWN: breakdown, "ECHO OUT": echoOut };
  return {
    st,
    fire: (name) => run[name]?.(),
    // a stop / seek / panic calls everything off
    reset() {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      if (st.breakdown) e().setVocalOnly(false);
      st.build = null;
      st.breakdown = false;
      st.echoOut = false;
      changed();
    },
  };
}
