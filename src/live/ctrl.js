// 10 · Controller preset: Arturia KeyLab mk3. Its MIDI messages depend on the mode it's in, so instead of
// hard-coding numbers the page walks you through it: "MOVE FADER 1", "HIT PAD 5" … each control is
// learned from the KeyLab itself (any step can be skipped) and saved to the MIDI map like MIDI LEARN.
// PAD LIGHTS (try it): the page sends each mapped pad a note-on when its control is on (echo lit, the
// loop you're in, set cues), which lights the pads on controllers that accept it.

export const KEYLAB_MK3 = [
  ["FADER 1", "VOX"],
  ["FADER 2", "LOW"],
  ["FADER 3", "MID"],
  ["FADER 4", "HIGH"],
  ["FADER 5", "MASTER"],
  ["FADER 6", "FILTER"],
  ["PAD 1", "PAD Z"],
  ["PAD 2", "PAD X"],
  ["PAD 3", "PAD C"],
  ["PAD 4", "PAD V"],
  ["PAD 5", "CUE A"],
  ["PAD 6", "CUE B"],
  ["PAD 7", "CUE C"],
  ["PAD 8", "CUE D"],
  ["PAD 9", "ECHO"],
  ["PAD 10", "REVERB"],
  ["PAD 11", "CRUSH"],
  ["PAD 12", "ROLL"],
  ["PLAY", "PLAY"],
  ["REWIND ◀◀", "PREV"],
  ["FAST-FORWARD ▶▶", "NEXT"],
  ["LOOP", "LOOP 4"],
  ["STOP", "PANIC"],
  ["RECORD", "CROWD"],
  ["ENCODER 1 (TURN) OR PAD BANK B 1", "BUILD-UP"],
  ["ENCODER 2 OR PAD BANK B 2", "DROP"],
  ["ENCODER 3 OR PAD BANK B 3", "BREAKDOWN"],
  ["ENCODER 4 OR PAD BANK B 4", "ECHO OUT"],
];

// the wizard's drawer. app: { map (the MIDI map object), saveMap(), connect() -> Promise<bool>, toast,
// esc, lights(on), lightsOn() }
export function makeCtrlWizard(root, app) {
  let step = -1,
    taken = new Map(); // control -> midi id learned in this run
  root.innerHTML = `
    <div class="lv-drawer-hd">
      <span class="lv-lbl">CONTROLLER · ARTURIA KEYLAB MK3</span
      ><button class="lv-btn" id="ctrlX" type="button" aria-label="Close"><span>✕</span></button>
    </div>
    <div class="lv-ct">
      <p class="lv-vo-help">Plug the KeyLab in, then START: the page asks for each control in turn and learns it from the KeyLab (skip anything you don't want). It keeps working in any KeyLab mode. Chrome or Edge (Safari has no MIDI).</p>
      <div class="lv-ct-now" id="ctNow"><span class="lv-lbl">READY</span><b>PRESS START</b></div>
      <div class="lv-vo-row">
        <button class="lv-btn" id="ctStart" type="button"><span>START</span></button>
        <button class="lv-btn" id="ctBack" type="button"><span>BACK</span></button>
        <button class="lv-btn" id="ctSkip" type="button"><span>SKIP</span></button>
        <button class="lv-btn" id="ctLights" type="button"><span>PAD LIGHTS (TRY)</span></button>
      </div>
      <ol class="lv-ct-list" id="ctList"></ol>
    </div>`;
  const $ = (s) => root.querySelector(s);
  function render() {
    $("#ctList").innerHTML = KEYLAB_MK3.map(([label, ctl], i) => {
      const id = taken.get(ctl) || Object.keys(app.map).find((k) => app.map[k] === ctl);
      return `<li class="${i === step ? "now" : id ? "ok" : ""}"><span>${label}</span><em>${ctl}</em><i>${id ? app.esc(id.toUpperCase()) : "—"}</i></li>`;
    }).join("");
    const cur = KEYLAB_MK3[step];
    $("#ctNow").innerHTML = cur
      ? `<span class="lv-lbl">STEP ${step + 1} / ${KEYLAB_MK3.length} · ${cur[1]}</span><b>${/FADER|ENCODER/.test(cur[0]) ? "MOVE" : "PRESS"} ${cur[0]}</b>`
      : step >= KEYLAB_MK3.length
        ? `<span class="lv-lbl">DONE</span><b>KEYLAB MAPPED · ${taken.size} CONTROLS</b>`
        : `<span class="lv-lbl">READY</span><b>PRESS START</b>`;
    $("#ctLights").classList.toggle("on", app.lightsOn());
    root.querySelector("#ctList li.now")?.scrollIntoView({ block: "nearest" });
  }
  function go(i) {
    step = Math.max(0, Math.min(KEYLAB_MK3.length, i));
    if (step >= KEYLAB_MK3.length) {
      app.saveMap();
      app.toast(`KEYLAB SAVED · ${taken.size} CONTROLS`);
    }
    render();
  }
  $("#ctStart").onclick = async () => {
    if (!(await app.connect())) return;
    taken = new Map();
    go(0);
  };
  $("#ctBack").onclick = () => step > 0 && go(step - 1);
  $("#ctSkip").onclick = () => step >= 0 && step < KEYLAB_MK3.length && go(step + 1);
  $("#ctLights").onclick = () => (app.lights(!app.lightsOn()), render());
  render();
  return {
    render,
    // MIDI messages while the wizard is waiting: learn the first one that isn't already taken
    learn(id) {
      if (step < 0 || step >= KEYLAB_MK3.length) return false;
      if ([...taken.values()].includes(id)) return true; // a fader still moving from the last step
      const ctl = KEYLAB_MK3[step][1];
      for (const k of Object.keys(app.map)) if (app.map[k] === ctl) delete app.map[k];
      app.map[id] = ctl;
      taken.set(ctl, id);
      go(step + 1);
      return true;
    },
    active: () => step >= 0 && step < KEYLAB_MK3.length,
  };
}
