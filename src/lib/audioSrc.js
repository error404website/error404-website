/* global __AUDIO_VERSIONS__ */
// "/audio/origin.mp3" → "/audio/origin.mp3?v=1a2b3c4d": the content hash from the build
// (vite.config.js) so a replaced track isn't served from a browser's 30-day cache.
const VERSIONS = typeof __AUDIO_VERSIONS__ === "object" ? __AUDIO_VERSIONS__ : {};

export function audioSrc(path) {
  const v = VERSIONS[path.split("/").pop()];
  return v ? `${path}?v=${v}` : path;
}
