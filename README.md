<div align="center">

<img src="docs/banner.png" alt="ERROR_404 — Something survived the crash. 4 chapters · 20 files · free" width="100%" />

<br />

**ARCHIVE_404** — the debut project from **ERROR_404**.<br />
Four chapters. Twenty recovered files. One transmission.

<br />

[![CI](https://github.com/error404website/error404-website/actions/workflows/ci.yml/badge.svg)](https://github.com/error404website/error404-website/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/error404website/error404-website?style=flat-square&label=ARCHIVE_404&color=FF00E5&labelColor=030409)](https://github.com/error404website/error404-website/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/error404website/error404-website/total?style=flat-square&label=downloads&color=00EFFF&labelColor=030409)](https://github.com/error404website/error404-website/releases/latest)
[![Licence](https://img.shields.io/badge/licence-all%20rights%20reserved-A100FF?style=flat-square&labelColor=030409)](LICENSE)

[![React](https://img.shields.io/badge/React-18-030409?style=flat-square&logo=react&logoColor=00EFFF)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-030409?style=flat-square&logo=vite&logoColor=FF00E5)](https://vitejs.dev)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-11-030409?style=flat-square&logo=framer&logoColor=F4F4F8)](https://motion.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-030409?style=flat-square&logo=tailwindcss&logoColor=00EFFF)](https://tailwindcss.com)
[![Netlify](https://img.shields.io/badge/hosted%20on-Netlify-030409?style=flat-square&logo=netlify&logoColor=00EFFF)](https://www.netlify.com)

**[↓ Download the album](https://github.com/error404website/error404-website/releases/latest/download/ARCHIVE_404.zip)** · **[Releases](https://github.com/error404website/error404-website/releases)** · **[Changelog](CHANGELOG.md)**

</div>

---

## The archive

| Chapter             | Tracks                                                              |
| ------------------- | ------------------------------------------------------------------- |
| **01 ORIGIN**       | ORIGIN · LEFT_BEHIND · GRAFT · IMPACTED · EMPTY_CITY                |
| **02 THE FEED**     | THE_FEED · GOSPEL_OUT · ENDLESS_GLOW · AWAKE · RECLAIMED            |
| **03 THE WRECKAGE** | THE_WRECKAGE · READ · COME_HOME · CHANGED_THE_LOCK · DOWN_THE_FRONT |
| **04 WHOLE**        | WHOLE · ENOUGH · OPEN_SKY · ALL_OF_ME · BETTER_DAYS                 |

Written and performed by **NULLSAINT** and **CACHEGHOST**. UK grime, future garage, hyperpop and metal, presented as a recovered transmission.

## What's inside the site

- **Cold-open intro**: THE FUTURE **FAILED.** / THE ARCHIVE **REMEMBERED.** Skippable, and plays once per visit.
- **Spotlight logo**: the hero and closing logos are revealed by a cursor torch. The nav logo draws itself in.
- **Chapter players**: every chapter streams in the page, with waveform, seek and per-track durations.
- **Brand kit**: palette (click to copy), typography and press images with downloads.
- **SIGNAL**: a booking form backed by Netlify Forms.
- **End credits** footer, a wide-screen **telemetry gutter** (REC timecode and scroll position) and a branded **404**.
- **One design system**: strict magenta/cyan duo, Bebas Neue / Space Mono / Inter, gradient last words, viewfinder ticks and LED status chips. The site also scales fluidly on large screens.

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

Requires Node 20 (see `.nvmrc`).

### Project structure

```
index.html                 page shell: meta/share tags, favicons, fonts, start-up scripts, Netlify form stub
netlify.toml               build settings, caching and security headers
public/                    copied as-is to the site root
  404.html                 branded "file not found" page
  site.webmanifest         home-screen / Android manifest
  assets/                  logo (SVG), hero art, brand kit, press images, share image, logo-fx.js
  audio/                   the 20 tracks (snake_case filenames, e.g. changed_the_lock.mp3)
  fonts/                   Bebas Neue (self-hosted)
src/
  main.jsx · App.jsx       entry point and page order
  config.js                GitHub owner/repo and the album download URL
  components/              BootSequence, Nav, Hero, Collective, Catalogue, Signal,
                           DownloadModal, Footer, Gutters, Name
  data/                    chapters.js (tracklist, durations), brand.js (brand kit)
  lib/                     shared easing and time formatting
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

### Developer switches

| Parameter   | Effect                                                                      |
| ----------- | --------------------------------------------------------------------------- |
| `?intro`    | Always play the intro (normally once per visit)                             |
| `?nointro`  | Skip the intro                                                              |
| `?zoom=0.9` | Override the fluid scale (100% up to 1280px wide, easing to 85% at 1920px+) |

---

## Deployment

The site deploys automatically on **Netlify** from the `main` branch. `netlify.toml` sets the build (`npm run build` → `dist`, Node 20), long-term caching for hashed bundles, fonts and audio, and security headers.

**The album download** (`ARCHIVE_404.zip`, about 160 MB) is too large for git, so it's attached to the [latest GitHub Release](https://github.com/error404website/error404-website/releases/latest). The site links to `/releases/latest/download/ARCHIVE_404.zip`, so publishing a new release with a new zip updates the download automatically:

```bash
gh release create v1.1.0 ARCHIVE_404.zip --title "ARCHIVE_404" --notes-file release-notes.md
```

**Contact form:** submissions arrive under **Netlify → Site → Forms**.

### Notes

- **Fluid scale:** the site is scaled with CSS `zoom` on large screens, and browsers don't rescale `vw`/`vh` under zoom. Size anything full-window as `calc(100vw / var(--ez, 1))`.
- **Search engines:** `robots.txt` and the `robots` meta tag currently block all crawlers, AI crawlers included. Remove them when the site should be indexed.
- **Safari toolbar:** Safari 26 tints its toolbar from the fixed nav's own background (`#000000`). It never tints in Private Browsing.

---

<div align="center">

**© 2026 ERROR_404 — all rights reserved.** Public for transparency, not for reuse. See [LICENSE](LICENSE) and [SECURITY.md](SECURITY.md).

</div>
