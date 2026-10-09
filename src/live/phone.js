// 11 · The phone remote (/live/remote/#CODE): answers the show laptop's pairing offer, then sends button
// presses and the VOX fader over a direct WebRTC data channel, and shows what the laptop reports.
import "./phone.css";

const $ = (s) => document.querySelector(s);
const ICE = [{ urls: "stun:stun.l.google.com:19302" }];
let dc = null;
const status = (txt, cls = "") => {
  $("#stTxt").textContent = txt;
  $("#st").className = `rm-st ${cls}`;
};
const api = async (body) => {
  const r = await fetch("/api/live/pair", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
  return r.json();
};
async function pair(code) {
  status("PAIRING…");
  try {
    const { offer } = await api({ op: "offer", code });
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pc.ondatachannel = (e) => {
      dc = e.channel;
      dc.onopen = () => status("CONNECTED", "ok");
      dc.onclose = () => status("DISCONNECTED · SCAN A NEW CODE", "bad");
      dc.onmessage = (m) => show(JSON.parse(m.data));
    };
    pc.onconnectionstatechange = () =>
      pc.connectionState === "failed" && status("COULDN'T REACH THE LAPTOP · TRY THE SAME WI-FI", "bad");
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    await new Promise((ok) => {
      if (pc.iceGatheringState === "complete") return ok();
      pc.addEventListener("icegatheringstatechange", () => pc.iceGatheringState === "complete" && ok());
      setTimeout(ok, 3000);
    });
    await api({ op: "answer", code, answer: pc.localDescription });
    status("CONNECTING…");
    history.replaceState(null, "", location.pathname); // the code is used up
  } catch {
    status("THAT CODE HAS EXPIRED · MAKE A NEW ONE ON THE LAPTOP", "bad");
    $("#codeForm").hidden = false;
  }
}
function show(s) {
  $("#song").textContent = s.song || "—";
  $("#next").textContent = s.next ? `NEXT · ${s.next} · IN ${s.nextIn}` : "LAST SONG";
  $("#play").textContent = s.playing ? "❚❚" : "▶";
  document.querySelectorAll("[data-c]").forEach((b) => b.classList.toggle("on", !!s.on?.[b.dataset.c]));
  for (const [i, l] of (s.cues || []).entries()) {
    const b = document.querySelector(`[data-c="CUE ${"ABCD"[i]}"]`);
    if (b) b.textContent = `${"ABCD"[i]} · ${l}`;
  }
  if (document.activeElement !== $("#vox")) $("#vox").value = s.vox ?? 1;
}
const send = (m) => dc?.readyState === "open" && dc.send(JSON.stringify(m));
document.querySelectorAll("[data-c]").forEach((b) => {
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try {
      b.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
    b.classList.add("down");
    navigator.vibrate?.(8);
    send({ c: b.dataset.c, d: true });
  });
  const up = () => {
    if (!b.classList.contains("down")) return;
    b.classList.remove("down");
    send({ c: b.dataset.c, d: false });
  };
  b.addEventListener("pointerup", up);
  b.addEventListener("pointercancel", up);
});
$("#vox").addEventListener("input", (e) => send({ c: "VOX", v: +e.target.value }));
$("#codeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const c = $("#code").value.trim().toUpperCase();
  if (c.length === 6) pair(c);
});
const fromHash = location.hash.slice(1).toUpperCase();
if (fromHash.length === 6) pair(fromHash);
else {
  status("ENTER THE CODE");
  $("#codeForm").hidden = false;
}
