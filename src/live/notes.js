// 08 · Performer notes: breath marks (⌄ after a word), ad-libs and reminders ("(HEY!) ON BEAT 3",
// "BACKING SINGS THIS", "POINT AT THE CROWD") on any line. Saved in this browser per line id
// ("song:line-in-song"), so they follow the song into any running order. Shown under the sung line on the
// show screen and in the PROMPTER window; never on the audience's stage screen.
import * as store from "./store";

let cache = null;
const all = () => (cache = cache || store.get("notes", {}));
const save = () => store.set("notes", all());

// give every line a stable id: song number + its place in the song
export function tagLines(base) {
  const seen = {};
  for (const l of base.lines) {
    seen[l.n] = (seen[l.n] ?? -1) + 1;
    l.id = `${l.n}:${seen[l.n]}`;
  }
}
export const noteFor = (id) => all()[id] || null;
export function toggleBreath(id, wi) {
  const n = all()[id] || { b: [], note: "" };
  n.b = n.b.includes(wi) ? n.b.filter((x) => x !== wi) : [...n.b, wi].sort((a, b) => a - b);
  all()[id] = n;
  tidy(id);
  save();
}
export function setNote(id, text) {
  const n = all()[id] || { b: [], note: "" };
  n.note = text.slice(0, 80);
  all()[id] = n;
  tidy(id);
  save();
}
function tidy(id) {
  const n = all()[id];
  if (n && !n.b.length && !n.note) delete all()[id];
}
export function reload() {
  cache = null;
}

// the NOTES drawer: every line of one song; click a word to put a breath mark after it, type a note
export function makeNotesEditor(root, app) {
  // app: { tl(), songIndex(), esc, onChange() }
  let k = null;
  root.innerHTML = `
    <div class="lv-drawer-hd">
      <button class="lv-btn" id="ntPrev" type="button" aria-label="Previous song"><span>‹</span></button>
      <span class="lv-lbl" id="ntSong">NOTES</span>
      <button class="lv-btn" id="ntNext" type="button" aria-label="Next song"><span>›</span></button>
      <button class="lv-btn" id="notesX" type="button" aria-label="Close the notes"><span>✕</span></button>
    </div>
    <p class="lv-nt-help lv-lbl">CLICK A WORD = A BREATH AFTER IT (⌄) · TYPE A NOTE FOR THE LINE · SAVED ON THIS LAPTOP</p>
    <ol class="lv-nt" id="ntList"></ol>`;
  const $ = (s) => root.querySelector(s);
  function render(keep) {
    const tl = app.tl();
    if (k == null || k >= tl.songs.length) k = app.songIndex();
    const s = tl.songs[k];
    $("#ntSong").textContent = `NOTES · ${String(s.n).padStart(2, "0")} ${s.title}`;
    const lines = tl.lines.filter((l) => l.n === s.n);
    $("#ntList").innerHTML = lines
      .map((l) => {
        const n = noteFor(l.id) || { b: [], note: "" };
        const words = (l.w.length ? l.w.map((w) => w.w) : l.text.split(" "))
          .map(
            (w, i) =>
              `<button type="button" class="lv-nt-w${n.b.includes(i) ? " br" : ""}" data-id="${l.id}" data-wi="${i}">${app.esc(w)}</button>`,
          )
          .join("");
        return `<li><div class="lv-nt-line">${words}</div><input class="lv-nt-in" data-id="${l.id}" maxlength="80" placeholder="note · ad-lib · backing" value="${app.esc(n.note || "")}" /></li>`;
      })
      .join("");
    if (keep) root.querySelector(`[data-id="${keep.id}"][data-wi="${keep.wi}"]`)?.focus();
  }
  root.addEventListener("click", (e) => {
    const w = e.target.closest(".lv-nt-w");
    if (w) {
      toggleBreath(w.dataset.id, +w.dataset.wi);
      render({ id: w.dataset.id, wi: w.dataset.wi });
      app.onChange();
    }
  });
  root.addEventListener("input", (e) => {
    const i = e.target.closest(".lv-nt-in");
    if (i) {
      setNote(i.dataset.id, i.value);
      app.onChange();
    }
  });
  // typing a note must not fire pads / cues
  root.addEventListener("keydown", (e) => e.stopPropagation());
  $("#ntPrev").onclick = () => {
    k = Math.max(0, (k ?? 0) - 1);
    render();
  };
  $("#ntNext").onclick = () => {
    k = Math.min(app.tl().songs.length - 1, (k ?? 0) + 1);
    render();
  };
  return {
    open() {
      k = app.songIndex();
      render();
    },
    render,
  };
}
