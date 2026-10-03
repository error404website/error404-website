import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// public/assets/logo-fx.js isn't processed by Vite, so it gets no hashed filename,
// and Netlify lets browsers cache /assets/* for a week. Tag its <script> with a hash
// of the file so browsers fetch a new copy exactly when the file changes.
function versionLogoFx() {
  return {
    name: "version-logo-fx",
    transformIndexHtml(html) {
      const v = createHash("sha256")
        .update(readFileSync("public/assets/logo-fx.js"))
        .digest("hex")
        .slice(0, 10);
      return html.replace('src="/assets/logo-fx.js"', `src="/assets/logo-fx.js?v=${v}"`);
    },
  };
}

// The same for the tracks in public/audio (cached for 30 days): a short content hash
// per file, which the players append as ?v=… (src/lib/audioSrc.js). Replacing an MP3
// changes its hash, so listeners get the new mix on their next visit.
function audioVersions() {
  const map = {};
  for (const f of readdirSync("public/audio")) {
    if (!f.endsWith(".mp3") || f.startsWith("._")) continue;
    map[f] = createHash("sha256")
      .update(readFileSync(`public/audio/${f}`))
      .digest("hex")
      .slice(0, 8);
  }
  return map;
}

export default defineConfig({
  plugins: [react(), versionLogoFx()],
  define: {
    __AUDIO_VERSIONS__: JSON.stringify(audioVersions()),
  },
  build: {
    // Hashed JS/CSS go to /_app so they can be cached forever without
    // colliding with the un-hashed files in public/assets.
    assetsDir: "_app",
  },
});
