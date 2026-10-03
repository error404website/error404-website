<div align="center">

<img src="docs/banner.png" alt="ERROR_404 — Something survived the crash. 4 chapters · 20 files · free" width="100%" />

<br />

**ARCHIVE_404** — the debut project from **ERROR_404**.<br />
Four chapters. Twenty recovered files. One transmission.

<br />

[![Live](https://img.shields.io/website?url=https%3A%2F%2Ferror404.run&style=flat-square&label=error404.run&up_message=live&up_color=4ade80&down_color=FF00E5&labelColor=030409)](https://error404.run)
[![CI](https://github.com/error404website/error404-website/actions/workflows/ci.yml/badge.svg)](https://github.com/error404website/error404-website/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/error404website/error404-website?style=flat-square&label=ARCHIVE_404&color=FF00E5&labelColor=030409)](https://github.com/error404website/error404-website/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/error404website/error404-website/total?style=flat-square&label=downloads&color=00EFFF&labelColor=030409)](https://github.com/error404website/error404-website/releases/latest)
[![Licence](https://img.shields.io/badge/licence-all%20rights%20reserved-A100FF?style=flat-square&labelColor=030409)](LICENSE)
[![Sound](https://img.shields.io/badge/sound-hyperpop%20·%20metalcore%20·%202--step-FF00E5?style=flat-square&labelColor=030409)](#the-archive)

[![React](https://img.shields.io/badge/React-18-030409?style=flat-square&logo=react&logoColor=00EFFF)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-030409?style=flat-square&logo=vite&logoColor=FF00E5)](https://vitejs.dev)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-11-030409?style=flat-square&logo=framer&logoColor=F4F4F8)](https://motion.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-030409?style=flat-square&logo=tailwindcss&logoColor=00EFFF)](https://tailwindcss.com)
[![Netlify](https://img.shields.io/badge/hosted%20on-Netlify-030409?style=flat-square&logo=netlify&logoColor=00EFFF)](https://www.netlify.com)

**[▶ error404.run](https://error404.run)** · **[↓ Download the album](https://github.com/error404website/error404-website/releases/latest/download/ARCHIVE_404.zip)** · **[Releases](https://github.com/error404website/error404-website/releases)** · **[Changelog](CHANGELOG.md)**

</div>

---

## Screens

<p align="center">
  <img src="docs/screenshot-hero.png" alt="Hero: the outline ERROR_404 logo lit from inside by the flashlight over the skyline artwork, the REC timecode gutter, and the player dock playing 08 ENDLESS_GLOW" width="100%" />
</p>

<table>
  <tr>
    <td width="72%"><img src="docs/screenshot-catalogue.png" alt="Catalogue: THE FEED chapter card with hyperpop · metalcore · 2-step tags, the gradient play key, waveform and tracklist, with the dock below" /></td>
    <td width="28%"><img src="docs/screenshot-mobile.png" alt="Phone: hero with the HYPERPOP MAXIMALISM tagline, the distressed menu icon and the dock playing 07 GOSPEL_OUT" /></td>
  </tr>
  <tr>
    <td align="center"><sub>Catalogue: chapter cards with built-in players, and the dock on every page</sub></td>
    <td align="center"><sub>Phone: the hyperpop tagline and the dock</sub></td>
  </tr>
</table>

---

## The archive

| Chapter             | Tracks                                                              |
| ------------------- | ------------------------------------------------------------------- |
| **01 ORIGIN**       | ORIGIN · LEFT_BEHIND · GRAFT · IMPACTED · EMPTY_CITY                |
| **02 THE FEED**     | THE_FEED · GOSPEL_OUT · ENDLESS_GLOW · AWAKE · RECLAIMED            |
| **03 THE WRECKAGE** | THE_WRECKAGE · READ · COME_HOME · CHANGED_THE_LOCK · DOWN_THE_FRONT |
| **04 WHOLE**        | WHOLE · ENOUGH · OPEN_SKY · ALL_OF_ME · BETTER_DAYS                 |

Written and performed by **NULLSAINT** and **CACHEGHOST**. Hyperpop at its core, with metalcore and 2-step, presented as a recovered transmission.

## What's inside the site

- **Intro, "the tracklist falls"**: matrix code rain whose columns stream the album's own 20 track names, while a terminal readout counts `RECOVERING ARCHIVE_404 · FILE 07/20 GOSPEL_OUT … 20/20 FILES INTACT`, then drains into the hero. About 4 s, once per visit, and a tap or any key skips it.
- **Signal Overload hero**: the logo as an outline cut-out, a self-moving flashlight whose light stays inside the letters, glitch bursts every 4–6 s (magenta/cyan tear, sheared slices, colour-split artwork), scanlines and a VHS tracking band. The tagline scrambles between SOMETHING SURVIVED THE CRASH and **HYPERPOP MAXIMALISM**.
- **Player dock**: one player on every page that plays all 20 tracks in album order, with a queue grouped by chapter, lock-screen and headphone controls, and resume-where-you-left-off. New visitors start on **07 GOSPEL_OUT**.
- **Chapter players**: every chapter streams in the page, with waveform, seek and per-track durations, handing over to and from the dock.
- **Brand kit**: palette (click to copy), typography and press images with downloads.
- **SIGNAL**: a booking form backed by Netlify Forms.
- **End credits** footer, a wide-screen **telemetry gutter** (REC timecode and scroll position) and a branded **404**.
- **One design system**: void black, a strict magenta → cyan duo, Bebas Neue / Space Mono / Inter, holo-foil buttons, gradient play keys, a distressed `>_` menu icon, viewfinder ticks and LED status chips. Everything animates on the GPU, respects Reduce Motion, and scales fluidly on large screens.

---

## Development

```bash
npm install
npm run dev            # http://localhost:5173
npm run check          # lint + formatting + production build (what CI runs)
npm run build          # production build into dist/
npm run preview        # serve the build locally
npm run format         # auto-format everything with Prettier
```

Requires Node 22 LTS (see `.nvmrc`).

### Project structure

```
index.html                 page shell: meta/share tags, favicons, fonts, start-up scripts, Netlify form stub
vite.config.js             build config, plus content-hash stamping for logo-fx.js and every track
netlify.toml               build settings, caching and security headers
public/                    copied as-is to the site root
  404.html                 branded "file not found" page
  site.webmanifest         home-screen / Android manifest
  assets/                  logo (SVG), hero art, brand kit, press images, share image,
                           logo-fx.js (hero/closing flashlight, glitch bursts, nav draw-on)
  audio/                   the 20 tracks (snake_case filenames, e.g. changed_the_lock.mp3)
  fonts/                   Bebas Neue (self-hosted)
src/
  main.jsx · App.jsx       entry point and page order
  config.js                GitHub owner/repo and the album download URL
  components/              BootSequence (intro), Nav, Hero, TaglineSwap, Collective,
                           Catalogue (chapter players), PlayerDock, Signal,
                           DownloadModal, Footer, Gutters, Name
  data/                    chapters.js (tracklist, durations), brand.js (brand kit)
  lib/                     shared easing, time formatting, audioSrc (cache-busted track URLs)
  styles/
    index.css              Tailwind plus the site's base, component and utility layers
    overrides.css          design-system pass (type scale, colours, components); loaded last
.github/                   CI workflow, Dependabot, issue and PR templates
docs/                      README images
```

### Editing the tracklist

Everything lives in [`src/data/chapters.js`](src/data/chapters.js):

```js
{ number: 17, title: "ENOUGH", audioPath: "/audio/enough.mp3", duration: "4:25" }
```

Put the MP3 in `public/audio/` under the same name. CI fails the build if a listed track file is missing.

### Updating the audio

1. Replace the file in `public/audio/`, keeping its snake_case name (e.g. `07 gospel_out.mp3` → `gospel_out.mp3`).
2. Update that track's `duration` in `src/data/chapters.js` if the length changed.
3. Nothing else: each build stamps every track with a hash of its contents (`?v=…`, see `vite.config.js` and `src/lib/audioSrc.js`), so listeners get the new file straight away instead of a copy from their 30-day browser cache.
4. For a new album download, publish a new GitHub Release with the zip (see Deployment). The download button always points at the latest release.

### Developer switches

| Parameter   | Effect                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| `?intro`    | Always play the intro (normally once per visit)                             |
| `?nointro`  | Skip the intro                                                              |
| `?zoom=0.9` | Override the fluid scale (100% up to 1280px wide, easing to 85% at 1920px+) |

---

## Deployment

The site deploys automatically on **Netlify** from the `main` branch. `netlify.toml` sets the build (`npm run build` → `dist`, Node 22), long-term caching for hashed bundles, fonts and audio, and security headers.

**The album download** (`ARCHIVE_404.zip`, about 153 MB) is too large for git, so it's attached to the [latest GitHub Release](https://github.com/error404website/error404-website/releases/latest). The site links to `/releases/latest/download/ARCHIVE_404.zip`, so publishing a new release with a new zip updates the download automatically:

```bash
gh release create v1.2.0 ARCHIVE_404.zip --title "ARCHIVE_404 · v1.2.0" --notes-file release-notes.md --latest
```

**Contact form:** submissions arrive under **Netlify → Site → Forms**.

### Notes

- **Fluid scale:** the site is scaled with CSS `zoom` on large screens, and browsers don't rescale `vw`/`vh` under zoom. Size anything full-window as `calc(100vw / var(--ez, 1))`.
- **Search engines:** `robots.txt` and the `robots` meta tag currently block all crawlers, AI crawlers included. Remove them when the site should be indexed.
- **Safari toolbar:** Safari 26 tints its toolbars from the fixed nav and the player dock, both `#000000`. It never tints in Private Browsing.
- **Safari clipping:** Safari doesn't clip transformed (GPU-composited) children to `overflow: hidden`. Keep effects inside their box: animate a registered `@property`, a background position or a gradient centre rather than moving an oversized layer, and add `clip-path: inset(0)` when a child must move inside a clip.
- **Icons:** draw UI icons as SVG or CSS shapes. iOS swaps characters like ⏮ ⏭ ☰ ▶ for coloured emoji (▶ is pinned to text with `U+FE0E`).

---

<div align="center">

**© 2026 ERROR_404 — all rights reserved.** Public for transparency, not for reuse. See [LICENSE](LICENSE) and [SECURITY.md](SECURITY.md).

</div>
