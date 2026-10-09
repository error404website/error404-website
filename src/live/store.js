// Everything the performer saves (sets, hot cues, curfew, notes, MIDI map, sync nudge) lives in this
// browser's localStorage, private to the show laptop and offline. EXPORT writes it all to one JSON
// file; IMPORT reads such a file back (to move to another laptop, or as a backup).
const NS = "e404-live:";
const LEGACY = ["e404-live-midi", "e404-live-sync"]; // keys saved before this module existed

export function get(key, fallback) {
  try {
    const v = localStorage.getItem(NS + key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}
export function set(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    return false; // storage blocked or full: it lasts for this visit only
  }
}

export function exportAll() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(NS) || LEGACY.includes(k)) data[k] = localStorage.getItem(k);
    }
  } catch {
    /* nothing readable */
  }
  const blob = new Blob(
    [JSON.stringify({ app: "error404-live", v: 1, saved: new Date().toISOString(), data }, null, 1)],
    { type: "application/json" },
  );
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `error_404_live_settings_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return Object.keys(data).length;
}

// returns how many settings were restored, or throws if the file isn't one of ours
export async function importFile(file) {
  const obj = JSON.parse(await file.text());
  if (!obj || obj.app !== "error404-live" || typeof obj.data !== "object")
    throw new Error("not a live settings file");
  let n = 0;
  for (const [k, v] of Object.entries(obj.data)) {
    if (!(k.startsWith(NS) || LEGACY.includes(k)) || typeof v !== "string") continue;
    try {
      localStorage.setItem(k, v);
      n++;
    } catch {
      /* full */
    }
  }
  return n;
}
