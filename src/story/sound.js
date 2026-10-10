// SOUND ON (W1): an opt-in score. While sound is on the page plays GOSPEL_OUT (the same public file the
// site's player streams), looping from past its intro; tracks change by crossfade if a section asks for
// another. The seam A/B ducks it. Volume runs through Web Audio gain because iOS ignores <audio>.volume.
import { audioSrc } from "../lib/audioSrc.js";

const FADE = 1.6, // s
  LEVEL = 0.5,
  START = 40; // s into each song: past the intros

export function score({ button, label, onChange }) {
  let ctx = null,
    master = null,
    on = false,
    want = "",
    ducked = false;
  const decks = new Map(); // track → { el, gain }

  function deck(track) {
    if (decks.has(track)) return decks.get(track);
    const el = new Audio(audioSrc(`/audio/${track}.mp3`));
    el.preload = "auto";
    el.loop = true;
    el.addEventListener("loadedmetadata", () => el.currentTime < 1 && (el.currentTime = START), {
      once: true,
    });
    const gain = ctx.createGain();
    gain.gain.value = 0;
    ctx.createMediaElementSource(el).connect(gain).connect(master);
    const d = { el, gain };
    decks.set(track, d);
    return d;
  }
  function ramp(g, v, secs = FADE) {
    const t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(v, t + secs);
  }
  function apply() {
    if (!ctx) return;
    for (const [track, d] of decks) {
      if (track === want && on) continue;
      ramp(d.gain.gain, 0);
      clearTimeout(d.stopT);
      d.stopT = setTimeout(() => d.gain.gain.value < 0.01 && d.el.pause(), FADE * 1000 + 100);
    }
    if (on && want) {
      const d = deck(want);
      clearTimeout(d.stopT);
      d.el.play().catch(() => {});
      ramp(d.gain.gain, LEVEL);
    }
    label.textContent = on && want ? want.toUpperCase() : "";
    onChange?.(on);
  }

  button.addEventListener("click", async () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    await ctx.resume();
    on = !on;
    button.setAttribute("aria-pressed", on);
    button.classList.toggle("on", on);
    button.querySelector(".snd-l").textContent = on ? "SOUND ON" : "SOUND OFF";
    apply();
  });

  return {
    track(t) {
      if (t === want) return;
      want = t;
      if (on) apply();
    },
    duck(v) {
      if (!ctx || v === ducked) return;
      ducked = v;
      ramp(master.gain, v ? 0 : 1, 0.3);
    },
  };
}
