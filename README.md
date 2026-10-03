# ERROR_404 — ARCHIVE_404

Website for **ARCHIVE_404**, the debut project from ERROR_404: 4 chapters, 20 recovered files.

Built with **Vite + React 18 + Framer Motion + Tailwind CSS 3**, and deployed on **Netlify**.

---

## Quick start

```bash
npm install
npm run dev       # local dev server at http://localhost:5173
npm run build     # production build into dist/
npm run preview   # serve the production build locally
```

Node 20 or newer is required.

---

## Before the first deploy

Open [`src/config.js`](src/config.js) and set:

| Setting | What it is |
|---|---|
| `GITHUB_OWNER` | GitHub username (`error404website`) |
| `GITHUB_REPO` | This repository's name (`error404-website`) |

These two values drive:
- **VIEW PROJECT** in the end credits and the GitHub mark in the footer.
- **The album download**: `ARCHIVE_404.zip` is served from this repo's latest GitHub Release (see below).

The share tags in `index.html` use relative image paths. When you know the live domain, replace `/assets/og-image-v2.png` with the full URL (e.g. `https://your-domain.com/assets/og-image-v2.png`). Facebook, X and LinkedIn need the absolute address to show the preview image.

---

## The album download (GitHub Release)

`ARCHIVE_404.zip` is about 160 MB, which is over GitHub's 100 MB file limit, so it is **not in the repo**. It is attached to a GitHub Release, and the site links to:

```
https://github.com/<GITHUB_OWNER>/<GITHUB_REPO>/releases/latest/download/ARCHIVE_404.zip
```

That URL always serves the newest release's file. To publish or update it:

```bash
gh release create v1.0.0 "/path/to/ARCHIVE_404.zip" --title "ARCHIVE_404" --notes "4 chapters. 20 recovered files."
```

To replace the zip later, create a new release (`v1.0.1`, …) with the new file. The site picks it up automatically.

The 20 individual tracks *are* in the repo (`public/audio/`, 7–10 MB each), because the on-page players stream them.

---

## Deploying on Netlify

1. Push this repo to GitHub.
2. In Netlify, go to **Add new site → Import an existing project → GitHub** and pick this repo.
3. Netlify reads [`netlify.toml`](netlify.toml): build command `npm run build`, publish directory `dist`, Node 20. Nothing else to configure.
4. **Forms:** the contact form is a Netlify Form (the hidden `<form name="contact" netlify>` in `index.html` lets Netlify detect it at deploy time). Submissions appear under **Site → Forms**. Turn on email notifications there.
5. **Domain:** add your domain under **Domain management**, then update the share-image URLs in `index.html` (see above).

Every push to `main` redeploys automatically.

---

## Project structure

```
index.html                 page shell: meta/share tags, favicons, fonts, start-up scripts, Netlify form stub
netlify.toml               build settings, caching and security headers
public/                    copied as-is to the site root
  404.html                 branded "file not found" page (Netlify serves it for missing paths)
  site.webmanifest         home-screen / Android app manifest
  assets/                  logo (SVG), hero art, brand kit, press images, share image, logo-fx.js
  audio/                   the 20 tracks (snake_case filenames, e.g. changed_the_lock.mp3)
  fonts/                   Bebas Neue (self-hosted)
  favicon*, apple-touch-icon, android-chrome-*, robots.txt
src/
  main.jsx                 mounts <App/>
  App.jsx                  page order + intro / download-box state
  config.js                GitHub owner/repo, download URL
  components/
    BootSequence.jsx       cold-open intro (skippable, once per visit)
    Nav.jsx                desktop nav + mobile glitch-slice menu
    Hero.jsx               hero artwork, parallax, particles
    Collective.jsx         about, members, brand kit (palette, type, press images)
    Name.jsx               gradient name styling (ERROR_404, NULLSAINT …)
    Catalogue.jsx          chapter cards, audio player, waveform
    Signal.jsx             booking / contact form
    DownloadModal.jsx      "download the archive" box
    Footer.jsx             end credits + bottom bar
    Gutters.jsx            wide-screen side telemetry (REC timecode, scroll position)
  data/
    chapters.js            chapters, tracklists, durations, card styles
    brand.js               brand-kit palette, type and press assets
  lib/                     shared easing curve, time formatting
  styles/
    index.css              Tailwind + the site's base, component and utility layers
    overrides.css          design-system pass (type scale, colours, components); loaded last so it wins
```

### Editing the tracklist

Everything lives in [`src/data/chapters.js`](src/data/chapters.js). Each chapter has five tracks:

```js
{ number: 17, title: "ENOUGH", audioPath: "/audio/enough.mp3", duration: "4:25" }
```

Drop the MP3 into `public/audio/` with the same name, then rebuild the zip and publish a new release if the download should match.

### Logo effects

`public/assets/logo-fx.js` is a small plain script that adds the spotlight reveal (hero and closing logos) and the draw-on nav logo once React has rendered. `index.html` hides the static logos until it attaches, so there's no flash of the old logo.

---

## Developer switches

These URL parameters exist for testing and are harmless in production:

| Parameter | Effect |
|---|---|
| `?intro` | Always play the intro (it normally plays once per visit) |
| `?nointro` | Skip the intro |
| `?zoom=0.9` | Override the fluid site scale (normally 100% up to 1280px wide, easing to 85% at 1920px+) |

---

## Notes

- **Fluid scale:** the whole site is scaled with CSS `zoom` on large screens. Browsers don't rescale `vw`/`vh` under zoom, so anything sized to the full window must divide by the scale: `calc(100vw / var(--ez, 1))`.
- **Search engines:** `robots.txt` and the `robots` meta tag currently block all crawlers, AI crawlers included. Remove them when you want the site indexed.
- **Safari toolbar colour:** Safari 26 colours its toolbar from the fixed nav's own background (`#000000`). It never tints in Private Browsing windows.
