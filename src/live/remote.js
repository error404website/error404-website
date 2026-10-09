// 11 · Phone remote, the laptop's side. PAIR makes a WebRTC offer, hands it to /api/live/pair (which
// only the unlocked show can do: it proves the access key) and shows a QR code + 6-letter code. The
// phone opens /live/remote/, answers, and from then on the two talk over a direct data channel:
// the phone sends presses ({ c: "ECHO", d: true }) and fader moves ({ c: "VOX", v: 0.8 }); the laptop
// sends back what's on (song, next, playing, which effects are lit) twice a second.
// The show never depends on the phone: if it drops, nothing stops.
import qrcode from "qrcode-generator";

const ICE = [{ urls: "stun:stun.l.google.com:19302" }]; // finds a path when phone and laptop are on different networks

// app: { proof(), control(name, down | value), state(), toast, onChange(st) }
export function makeRemote(app) {
  const st = { status: "off", code: "", url: "", peer: "" }; // off | pairing | waiting | connected | failed
  let pc = null,
    dc = null,
    poll = 0,
    tick = 0;
  const changed = () => app.onChange?.(st);
  const api = async (body) => {
    const r = await fetch("/api/live/pair", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
    return r.json();
  };
  const gathered = (p) =>
    new Promise((ok) => {
      if (p.iceGatheringState === "complete") return ok();
      const done = () => p.iceGatheringState === "complete" && ok();
      p.addEventListener("icegatheringstatechange", done);
      setTimeout(ok, 3000); // enough candidates by then
    });

  function close(quiet) {
    clearInterval(poll);
    clearInterval(tick);
    dc?.close();
    pc?.close();
    pc = dc = null;
    st.status = "off";
    st.code = "";
    if (!quiet) changed();
  }

  async function pair() {
    close(true);
    if (!app.proof()) {
      st.status = "failed";
      app.toast("UNLOCK WITH THE KEY AGAIN TO PAIR A PHONE");
      return changed();
    }
    st.status = "pairing";
    changed();
    try {
      pc = new RTCPeerConnection({ iceServers: ICE });
      dc = pc.createDataChannel("e404", { ordered: true });
      wire();
      await pc.setLocalDescription(await pc.createOffer());
      await gathered(pc);
      const { code } = await api({ op: "open", proof: app.proof(), offer: pc.localDescription });
      st.code = code;
      st.url = `${location.origin}/live/remote/#${code}`;
      st.status = "waiting";
      changed();
      const until = Date.now() + 10 * 60e3;
      poll = setInterval(async () => {
        if (Date.now() > until) {
          close();
          return app.toast("PAIRING CODE EXPIRED · MAKE A NEW ONE");
        }
        try {
          const { answer } = await api({ op: "poll", proof: app.proof(), code });
          if (answer) {
            clearInterval(poll);
            await pc.setRemoteDescription(answer);
          }
        } catch {
          /* keep trying until it expires */
        }
      }, 1000);
    } catch {
      st.status = "failed";
      app.toast("COULDN'T START PAIRING · THE PHONE REMOTE NEEDS THE INTERNET TO PAIR");
      changed();
    }
  }
  function wire() {
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        if (st.status === "connected") app.toast("PHONE REMOTE DISCONNECTED · THE SHOW CARRIES ON");
        close();
      }
    };
    dc.onopen = () => {
      st.status = "connected";
      app.toast("PHONE REMOTE CONNECTED");
      changed();
      send();
      tick = setInterval(send, 500);
    };
    dc.onclose = () => st.status === "connected" && close();
    dc.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (typeof m.c !== "string" || m.c.length > 24) return;
      if (typeof m.v === "number") app.control(m.c, Math.max(0, Math.min(1, m.v)));
      else app.control(m.c, !!m.d);
    };
  }
  function send() {
    if (dc?.readyState === "open") dc.send(JSON.stringify(app.state()));
  }

  // the QR code as an SVG string
  function qr(text) {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }
  return { st, pair, close: () => close(), qr, send };
}
