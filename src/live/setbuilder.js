// 01 + 02 · The SETS drawer (menu → SETLIST): build a running order (drag the ⋮⋮ handle, or focus it
// and use ↑ ↓; ✕ drops a song, ↺ brings it back), save it under a name, load saved sets, set a curfew,
// and export / import everything this laptop has saved. Clicking a song's title jumps to it.
// While the show is playing, APPLY changes the songs after the one that's on; played songs stay put.
import { ALBUM, isAlbum } from "./set";
import * as store from "./store";

// app: { base(), applied(), playingIndex(), apply(order), jumpTo(n), fmt, esc, toast, locked(), onCurfew() }
export function makeSetBuilder(root, app) {
  let sets = store.get("sets", {}); // name -> [song numbers]
  let name = store.get("setName", "ALBUM");
  let draft = [...app.applied()];
  const song = (n) => app.base().songs.find((s) => s.n === n);
  const len = (order) => order.reduce((t, n) => t + song(n).frames / app.base().sr, 0);
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  root.innerHTML = `
    <div class="lv-drawer-hd">
      <span class="lv-lbl">SETS</span
      ><button class="lv-btn" id="drawerX" type="button" aria-label="Close the sets"><span>✕</span></button>
    </div>
    <div class="lv-sb-row">
      <select id="sbSel" aria-label="Saved sets"></select>
      <button class="lv-btn" id="sbSave" type="button"><span>SAVE AS</span></button>
      <button class="lv-btn" id="sbDel" type="button"><span>DELETE</span></button>
    </div>
    <div class="lv-sb-row">
      <label class="lv-lbl" for="sbCurfew">CURFEW</label>
      <input id="sbCurfew" type="time" />
      <button class="lv-btn" id="sbCurfewX" type="button" aria-label="No curfew"><span>✕</span></button>
    </div>
    <div class="lv-lbl lv-sb-ends" id="sbEnds"></div>
    <ol class="lv-setl lv-sb" id="setl"></ol>
    <div class="lv-sb-out" id="sbOutHd" hidden><span class="lv-lbl">NOT IN THIS SET</span></div>
    <ol class="lv-setl lv-sb lv-sb-off" id="sbOff"></ol>
    <div class="lv-sb-foot">
      <span class="lv-lbl">TOTAL <b id="sbTotal"></b></span>
      <button class="lv-btn" id="sbReset" type="button"><span>ALBUM ORDER</span></button>
      <button class="lv-btn lv-sb-apply" id="sbApply" type="button"><span>APPLY</span></button>
    </div>
    <div class="lv-sb-foot lv-sb-io">
      <button class="lv-btn" id="sbExport" type="button"><span>↓ EXPORT SETTINGS</span></button>
      <button class="lv-btn" id="sbImport" type="button"><span>↑ IMPORT</span></button>
      <input id="sbFile" type="file" accept="application/json,.json" hidden />
    </div>`;
  const $ = (s) => root.querySelector(s);

  function render(focusN) {
    const applied = app.applied(),
      k = app.playingIndex(),
      playedN = new Set(k >= 0 ? applied.slice(0, k) : []),
      nowN = k >= 0 ? applied[k] : null,
      inDraft = new Set(draft);
    $("#sbSel").innerHTML = [`<option value="ALBUM">ALBUM · 20 SONGS · ${app.fmt(len(ALBUM))}</option>`]
      .concat(
        Object.entries(sets).map(
          ([nm, o]) =>
            `<option value="${app.esc(nm)}">${app.esc(nm)} · ${o.length} · ${app.fmt(len(o))}</option>`,
        ),
      )
      .join("");
    $("#sbSel").value = sets[name] || name === "ALBUM" ? name : "ALBUM";
    $("#sbDel").disabled = name === "ALBUM";
    $("#setl").innerHTML = draft
      .map((n, i) => {
        const s = song(n);
        return `<li data-n="${n}" class="${n === nowN ? "now" : playedN.has(n) ? "done" : ""}"><button class="lv-sb-h" type="button" aria-label="Move ${app.esc(s.title)} (arrow keys)" data-move="${n}">⋮⋮</button><em>${String(i + 1).padStart(2, "0")}</em><span class="lv-sb-t">${app.esc(s.title)}</span><em>${app.fmt(s.frames / app.base().sr)}</em><button class="lv-sb-x" type="button" aria-label="Drop ${app.esc(s.title)}" data-drop="${n}">✕</button></li>`;
      })
      .join("");
    const off = ALBUM.filter((n) => !inDraft.has(n));
    $("#sbOutHd").hidden = !off.length;
    $("#sbOff").innerHTML = off
      .map((n) => {
        const s = song(n);
        return `<li data-n="${n}"><span></span><em>${String(n).padStart(2, "0")}</em><span class="lv-sb-t">${app.esc(s.title)}</span><em>${app.fmt(s.frames / app.base().sr)}</em><button class="lv-sb-x" type="button" aria-label="Add ${app.esc(s.title)} back" data-add="${n}">↺</button></li>`;
      })
      .join("");
    $("#sbTotal").textContent = app.fmt(len(draft));
    const dirty = !same(draft, applied);
    const apply = $("#sbApply");
    apply.disabled = !dirty || !draft.length;
    apply.classList.toggle("on", dirty);
    apply.querySelector("span").textContent = !dirty
      ? "APPLIED"
      : app.playingIndex() >= 0 && app.isPlaying()
        ? "APPLY · FROM THE NEXT SONG"
        : "LOAD THIS SET";
    $("#sbCurfew").value = store.get("curfew", "") || "";
    if (focusN != null) root.querySelector(`[data-move="${focusN}"]`)?.focus();
  }

  function move(n, to) {
    const from = draft.indexOf(n);
    if (from < 0) return;
    to = Math.max(0, Math.min(draft.length - 1, to));
    draft.splice(from, 1);
    draft.splice(to, 0, n);
    render(n);
  }

  // clicks: drop / add / jump
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button, .lv-sb-t");
    if (!b || app.locked()) return;
    if (b.dataset.drop) {
      draft = draft.filter((n) => n !== +b.dataset.drop);
      return render();
    }
    if (b.dataset.add) {
      draft.push(+b.dataset.add);
      return render();
    }
    if (b.classList.contains("lv-sb-t")) {
      const n = +b.closest("li").dataset.n;
      if (app.applied().includes(n)) app.jumpTo(n);
      else app.toast("NOT IN THE SET THAT'S PLAYING · APPLY FIRST");
    }
  });
  // keyboard moves on a focused handle
  root.addEventListener("keydown", (e) => {
    const h = e.target.closest("[data-move]");
    if (!h || !/^Arrow(Up|Down)$/.test(e.key)) return;
    e.preventDefault();
    const n = +h.dataset.move;
    move(n, draft.indexOf(n) + (e.key === "ArrowUp" ? -1 : 1));
  });
  // drag by the handle: a line shows where it will land; the move happens on release
  root.addEventListener("pointerdown", (e) => {
    const h = e.target.closest("[data-move]");
    if (!h || app.locked()) return;
    e.preventDefault();
    const n = +h.dataset.move,
      list = $("#setl");
    let to = draft.indexOf(n);
    try {
      h.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
    h.closest("li").classList.add("drag");
    const over = (ev) => {
      const rows = [...list.children];
      to = rows.length;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (ev.clientY < r.top + r.height / 2) {
          to = i;
          break;
        }
      }
      rows.forEach((r, i) => r.classList.toggle("drop", i === to));
      list.classList.toggle("drop-end", to === rows.length);
    };
    const up = () => {
      h.removeEventListener("pointermove", over);
      h.removeEventListener("pointerup", up);
      h.removeEventListener("pointercancel", up);
      list.classList.remove("drop-end");
      const from = draft.indexOf(n);
      move(n, to > from ? to - 1 : to);
    };
    h.addEventListener("pointermove", over);
    h.addEventListener("pointerup", up);
    h.addEventListener("pointercancel", up);
  });

  $("#sbSel").onchange = (e) => {
    name = e.target.value;
    draft = name === "ALBUM" ? [...ALBUM] : [...sets[name]];
    render();
  };
  $("#sbSave").onclick = () => {
    const nm = (prompt("Name this set", name === "ALBUM" ? "" : name) || "")
      .trim()
      .toUpperCase()
      .slice(0, 32);
    if (!nm || nm === "ALBUM") return;
    sets[nm] = [...draft];
    name = nm;
    store.set("sets", sets);
    store.set("setName", nm);
    app.toast(`SAVED · ${nm}`);
    render();
  };
  $("#sbDel").onclick = () => {
    if (name === "ALBUM" || !confirm(`Delete the set "${name}"?`)) return;
    delete sets[name];
    store.set("sets", sets);
    name = "ALBUM";
    store.set("setName", name);
    render();
  };
  $("#sbReset").onclick = () => {
    draft = [...ALBUM];
    render();
  };
  $("#sbApply").onclick = () => {
    if (app.locked() || !draft.length) return;
    draft = [...app.apply(draft)];
    store.set("setName", isAlbum(draft) ? "ALBUM" : name);
    render();
  };
  const curfew = (v) => {
    store.set("curfew", v || "");
    app.onCurfew();
    render();
  };
  $("#sbCurfew").onchange = (e) => curfew(e.target.value);
  $("#sbCurfewX").onclick = () => curfew("");
  $("#sbExport").onclick = () => app.toast(`EXPORTED ${store.exportAll()} SETTINGS`);
  $("#sbImport").onclick = () => $("#sbFile").click();
  $("#sbFile").onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const n = await store.importFile(f);
      sets = store.get("sets", {});
      app.toast(`IMPORTED ${n} SETTINGS · RELOAD TO USE THE MIDI MAP AND SYNC`);
      app.onCurfew();
      render();
    } catch {
      app.toast("THAT FILE ISN'T AN ERROR_404 LIVE SETTINGS FILE");
    }
  };
  render();
  return {
    render,
    // the curfew line in the drawer: when this set would end
    ends(text) {
      $("#sbEnds").textContent = text;
    },
    // a skip from the show clock: drop n from the draft too
    sync() {
      draft = [...app.applied()];
      render();
    },
  };
}
