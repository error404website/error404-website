// The VOICE drawer (menu → VOICE): mic, auto-duck and the in-ear mix (voice.js).
// app: { esc, toast }
export function makeVoiceUI(root, voice, app) {
  const st = voice.st;
  const range = (id, min, max, step, val, label) =>
    `<label class="lv-vo-r"><span class="lv-lbl">${label}</span><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}" /><em id="${id}V"></em></label>`;
  root.innerHTML = `
    <div class="lv-drawer-hd">
      <span class="lv-lbl">VOICE · MIC · IN-EARS</span
      ><button class="lv-btn" id="voiceX" type="button" aria-label="Close"><span>✕</span></button>
    </div>
    <div class="lv-vo">
      <section>
        <h4>MIC</h4>
        <div class="lv-vo-row">
          <button class="lv-btn" id="voMic" type="button"><span>MIC ON</span></button>
          <select id="voIn" aria-label="Mic input"></select>
        </div>
        <div class="lv-vo-meter" aria-hidden="true"><i id="voLvl"></i><b id="voFloor"></b><span id="voSing">● SINGING</span></div>
        ${range("voTrim", -12, 12, 1, st.trim, "TRIM")}
        <div class="lv-vo-row">
          <button class="lv-btn" id="voPA" type="button"><span>MIC → PA</span></button>
          <span class="lv-lbl" id="voPAtxt"></span>
        </div>
        <div class="lv-vo-row lv-vo-chips" id="voFx">${voice.FX.map((f) => `<button class="lv-btn" type="button" data-fx="${f}"><span>${f}</span></button>`).join("")}</div>
        <div class="lv-vo-row"><span class="lv-lbl" id="voGuard"></span><button class="lv-btn" id="voGuardX" type="button"><span>RESET</span></button></div>
      </section>
      <section>
        <h4>AUTO-DUCK THE GUIDE VOCAL</h4>
        <div class="lv-vo-row">
          <button class="lv-btn" id="voDuck" type="button"><span>AUTO-DUCK</span></button>
          <button class="lv-btn" id="voLearn" type="button"><span>LEARN THE ROOM · 3 S</span></button>
        </div>
        ${range("voDepth", 3, 30, 1, st.depth, "DUCK BY")}
        ${range("voSens", 3, 24, 1, st.sens, "SING ABOVE ROOM BY")}
        <p class="lv-vo-help">Learn the room with the music playing and the mic in place (don't sing). Then the recorded vocal drops while you sing and comes back 0.4 s after you stop.</p>
      </section>
      <section>
        <h4>IN-EARS</h4>
        <div class="lv-vo-row lv-vo-seg" id="voEars">
          <button class="lv-btn" type="button" data-ears="off"><span>OFF</span></button>
          <button class="lv-btn" type="button" data-ears="agg"><span>OUTPUTS 3–4</span></button>
          <button class="lv-btn" type="button" data-ears="dev"><span>SECOND OUTPUT</span></button>
        </div>
        <div class="lv-vo-row" id="voDevRow" hidden><select id="voDev" aria-label="In-ear output"></select></div>
        ${range("voClick", 0, 1, 0.01, st.levels.click, "CLICK")}
        ${range("voCues", 0, 1, 0.01, st.levels.cues, "SPOKEN CUES")}
        ${range("voGuide", 0, 1, 0.01, st.levels.guide, "GUIDE VOCAL")}
        ${range("voMusic", 0, 1, 0.01, st.levels.music, "MUSIC")}
        ${range("voMicLvl", 0, 1, 0.01, st.levels.mic, "YOUR MIC")}
        <div class="lv-vo-row">
          <button class="lv-btn" id="voClickOn" type="button"><span>CLICK</span></button>
          <button class="lv-btn" id="voCuesOn" type="button"><span>SPOKEN CUES</span></button>
          <button class="lv-btn" id="voTest" type="button"><span>TEST · "HOOK"</span></button>
        </div>
        <p class="lv-vo-help"><b>OUTPUTS 3–4</b> (rock solid): in macOS Audio MIDI Setup, + → Create Aggregate Device, tick your interface first, then the Mac's headphones, and tick Drift Correction on the headphones. Choose that device as the output in the pre-show check: the PA gets outputs 1–2, your in-ears 3–4. <b>SECOND OUTPUT</b> (no setup, Chrome / Edge): the in-ears play on another device, e.g. the headphone jack, a few ms behind the PA.</p>
      </section>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const devices = async (kind) => {
    try {
      return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === kind);
    } catch {
      return [];
    }
  };
  async function fillDevices() {
    const ins = await devices("audioinput"),
      outs = await devices("audiooutput");
    $("#voIn").innerHTML = ins.length
      ? ins.map((d) => `<option value="${d.deviceId}">${app.esc(d.label || "Input")}</option>`).join("")
      : `<option value="">ALLOW THE MIC TO LIST INPUTS</option>`;
    if (st.deviceId) $("#voIn").value = st.deviceId;
    $("#voDev").innerHTML = outs
      .map((d) => `<option value="${d.deviceId}">${app.esc(d.label || "Output")}</option>`)
      .join("");
    if (st.iemDevice) $("#voDev").value = st.iemDevice;
  }
  function paint() {
    $("#voMic").classList.toggle("on", st.mic);
    $("#voMic span").textContent = st.mic ? "MIC ON" : "TURN MIC ON";
    $("#voPA").classList.toggle("on", st.toPA);
    $("#voPAtxt").textContent = st.toPA
      ? "THROUGH THE PAGE · FX + FEEDBACK GUARD"
      : "LISTEN ONLY (FOR THE DUCK)";
    $$("[data-fx]").forEach((b) => b.classList.toggle("on", st.fx.has(b.dataset.fx)));
    $("#voGuard").textContent = st.toPA
      ? `FEEDBACK GUARD · ${st.notches.length ? `NOTCHED ${st.notches.map((f) => (f / 1000).toFixed(1) + "K").join(" · ")}` : "WATCHING"}`
      : "FEEDBACK GUARD · OFF (MIC NOT TO PA)";
    $("#voDuck").classList.toggle("on", st.duckOn);
    $$("[data-ears]").forEach((b) => b.classList.toggle("on", b.dataset.ears === st.iemMode));
    $("#voDevRow").hidden = st.iemMode !== "dev" && !$("#voDevRow").dataset.show;
    $("#voClickOn").classList.toggle("on", st.click);
    $("#voCuesOn").classList.toggle("on", st.cues);
    for (const [id, v, unit] of [
      ["voTrim", st.trim, " DB"],
      ["voDepth", st.depth, " DB"],
      ["voSens", st.sens, " DB"],
    ])
      $(`#${id}V`).textContent = `${v > 0 && id === "voTrim" ? "+" : ""}${v}${unit}`;
    for (const [id, k] of [
      ["voClick", "click"],
      ["voCues", "cues"],
      ["voGuide", "guide"],
      ["voMusic", "music"],
      ["voMicLvl", "mic"],
    ])
      $(`#${id}V`).textContent = `${Math.round(st.levels[k] * 100)}%`;
  }
  const $$ = (s) => [...root.querySelectorAll(s)];
  // meter while the drawer is open
  setInterval(() => {
    if (root.hidden) return;
    const pct = (db) => Math.max(0, Math.min(100, ((db + 70) / 70) * 100));
    $("#voLvl").style.width = st.mic ? pct(st.level) + "%" : "0%";
    $("#voFloor").style.left = pct(st.floor + st.sens) + "%";
    $("#voSing").classList.toggle("on", st.singing);
  }, 50);

  $("#voMic").onclick = async () => {
    if (st.mic) voice.disableMic();
    else await voice.enableMic($("#voIn").value);
    await fillDevices();
    paint();
  };
  $("#voIn").onchange = (e) => st.mic && voice.enableMic(e.target.value);
  $("#voTrim").oninput = (e) => (voice.setTrim(+e.target.value), paint());
  $("#voPA").onclick = () => voice.setToPA(!st.toPA);
  $("#voFx").onclick = (e) => {
    const b = e.target.closest("[data-fx]");
    if (b) voice.toggleFx(b.dataset.fx);
  };
  $("#voGuardX").onclick = () => voice.resetGuard();
  $("#voDuck").onclick = () => voice.set("duckOn", !st.duckOn);
  $("#voLearn").onclick = () => voice.learnRoom();
  $("#voDepth").oninput = (e) => voice.set("depth", +e.target.value);
  $("#voSens").oninput = (e) => voice.set("sens", +e.target.value);
  $("#voEars").onclick = async (e) => {
    const b = e.target.closest("[data-ears]");
    if (!b) return;
    if (b.dataset.ears === "dev") {
      $("#voDevRow").dataset.show = "1";
      $("#voDevRow").hidden = false;
      await fillDevices();
      return voice.setEars("dev", $("#voDev").value);
    }
    delete $("#voDevRow").dataset.show;
    voice.setEars(b.dataset.ears);
  };
  $("#voDev").onchange = (e) => voice.setEars("dev", e.target.value);
  for (const [id, k] of [
    ["voClick", "click"],
    ["voCues", "cues"],
    ["voGuide", "guide"],
    ["voMusic", "music"],
    ["voMicLvl", "mic"],
  ])
    $(`#${id}`).oninput = (e) => (voice.setLevel(k, +e.target.value), paint());
  $("#voClickOn").onclick = () => voice.set("click", !st.click);
  $("#voCuesOn").onclick = () => voice.set("cues", !st.cues);
  $("#voTest").onclick = () => {
    if (st.iemMode === "off") app.toast("TURN THE IN-EARS ON FIRST (OUTPUTS 3–4 OR SECOND OUTPUT)");
    voice.say("hook");
  };
  root.addEventListener("keydown", (e) => e.stopPropagation());
  fillDevices();
  paint();
  return { paint, fillDevices };
}
