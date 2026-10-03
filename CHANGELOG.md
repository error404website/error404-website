# Changelog

All notable changes to the ERROR_404 website are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow the album releases.

## [Unreleased]

### Added

- Site player dock: a player fixed to the bottom of every page (desktop and mobile) that plays the whole archive in order, 01 → 20 and round again, styled like the chapter players (holo ▶ key, "01 — ORIGIN" + chapter, gradient seek and times, waveform). Its queue lists all 20 tracks by chapter: a popover on desktop, a bottom sheet on phones. It hands over to and from the chapter players, remembers the track and position between visits, and shows lock-screen / headphone controls. The hero now ends where the dock begins, and the wide-screen gutters stop above it.
- Hero tagline: every few seconds "SOMETHING SURVIVED THE CRASH" scrambles into "HYPERPOP MAXIMALISM" and back, in the same type and colour, with an RGB flicker while it changes (ARCHIVE_404 above it keeps its gradient). Screen readers get both lines; Reduce Motion keeps the original line.
- Safari pinned-tab icon (`safari-pinned-tab.svg`, tinted magenta).
- Android maskable icon, with the 4 inside the safe zone so launchers don't crop it.
- `apple-touch-icon-precomposed.png` for older iOS and other apps that request it.
- The 404 page now carries the full icon set.

### Changed

- New intro, "the tracklist falls": matrix code rain whose columns stream the album's 20 track names in the magenta → cyan palette with white-hot heads, while a terminal readout counts "> RECOVERING ARCHIVE_404 · FILE 07/20 GOSPEL_OUT … 20/20 FILES INTACT". The streams then drain and the intro fades into the hero. It lasts about 4 s, is skippable (tap, key or SKIP), plays once per visit, and Reduce Motion skips it. It replaces the THE FUTURE FAILED / THE ARCHIVE REMEMBERED cold open.
- Play buttons (dock and all four chapter players) lose their holo-foil box: the ▶ and ❚❚ are now the icon alone in the magenta → cyan gradient, with a soft gradient glow on hover and while playing, still in a 44 px tap target. The dock's QUEUE button and phone queue icon lose their bordered box too.
- GOSPEL_OUT: new mix from the v6 masters (now 3:43, was 3:45). The other 19 tracks have identical audio; their only change is a new genre tag, so they stay as they are on the site.
- Audio cache-busting: every track URL now carries a hash of its file (`?v=…`), stamped at build time, so a replaced mix reaches returning listeners immediately instead of after the 30-day browser cache expires.
- Genres updated across the site to hyperpop first, then metalcore and 2-step: the chapter-card tags (were UK Grime · Future Garage · Hyperpop Metal), the Collective "SOUND" line and About paragraph, the page keywords and the README.
- Player dock now uses the nav's exact black (#000) with no top line (it was #07080F with a grey hairline), so the page is framed by two identical bars. The play key's inside, the queue pop-up and the phone sheet match. Its dim text is nudged up to stay as readable on the darker black: chapter line 25 → 38 %, times 20 → 32 %, skip icons 45 → 55 %, plus a slightly brighter seek track, waveform, queue border and queue numbers/durations.
- Mobile menu icon is now properly distressed. The torn-prompt texture was too light to see at 22 px, so the `>_` and ✕ now have a bolder stroke (3, up from 2.6), stronger torn edges (displacement 1.9, up from 0.9, with finer grain) and small chipped-ink marks.
- Logo flashlight (hero and closing) now moves on its own: it drifts across the letters in a smooth loop and no longer follows the mouse or touch.
- Intro and hero: "Signal Overload". The hero logo is now a plain outline cut-out over the artwork (the flashlight reveal is gone). Every 4–6 s it corrupts for half a second: magenta/cyan outline copies jump off-register, two slices shear sideways, and the artwork splits into colour channels. Scanlines and a slow VHS tracking band sit over the hero. The intro keeps its two lines and timing, but each line now arrives RGB-split and jittering over heavier static, with scanlines and a tracking roll. The closing logo keeps its flashlight. Reduce Motion turns all of it off, and nothing flashes the screen.
- Mobile menu icon is now the "torn prompt": the same `>_` and ✕, with a heavier stroke and ink-bled, hand-cut edges (a light SVG displacement filter) to match the logo. The gradient cursor still blinks, and the tap target is still 44 px.
- BOOKING · ↓ DOWNLOAD button is slimmer so it sits in proportion with the nav: 44 → 34 px in the nav (centred in the 80 px bar) and 54 → 46 px in the mobile menu (still above the 44 px tap minimum).
- BOOKING · ↓ DOWNLOAD button (nav and mobile menu) restyled as "holo foil": an iridescent magenta/violet/cyan/silver edge that slowly rotates, a soft glow, and a holographic sheen across each half on hover. It is the same size as before, the rotation runs on the GPU, and it respects Reduce Motion.
- Holo foil on every primary button, matching the nav: chapter DOWNLOAD ▸ (now 34 px on desktop and tablet, 44 px on phones), TRANSMIT once the form is valid, the download pop-up button, the 404 page's RETURN TO THE ARCHIVE, and the chapter players' ▶ buttons (foil edge when paused, a full rotating foil fill while a track plays). Their hover sheen now sweeps by background position rather than transform, so Safari can't paint it outside the button.
- Chapter descriptions (and the expanded file notes) now run the full width of the card instead of stopping at 640 px.
- Favicon is now the gradient "4" on a transparent background, so Safari no longer shows a white rim around a dark tile. The small sizes are slightly bolder so the 4 stays legible at 16 px.
- Tab icons no longer list the black-tile 192/512 PNGs, which Chrome could pick over the transparent icon. Those now live only in the manifest.
- BOOKING text is now 11 px, the same as DOWNLOAD and the nav links (it was 10 px).

### Fixed

- Tablet nav: between 768 and 1023 px the full row of links didn't fit, and the DOWNLOAD button ran off the right edge (by 116 px at 768). Tablets in portrait now get the phone-style nav (logo, ↓ DOWNLOAD and the >_ menu), and the links row starts at 1024 px.
- Player dock icons render the same on every device. The ⏮ ⏭ ☰ ✕ characters, which iPhones and iPads turned into coloured emoji, are now drawn SVGs: thin square-capped « » chevrons, queue lines and close cross, matching the >_ menu icon. The ▶ playing-track marker in the dock queue and the chapter tracklists is forced to text style for the same reason.
- Logo effects update straight away for returning visitors. `logo-fx.js` is served from `/assets/` (cached for a week, no hashed name), so browsers could keep running an old copy after a deploy. Its `<script>` tag is now stamped with a hash of the file at build time (`?v=…`), which changes only when the file does.
- Logo flashlight (closing logo, and now back on the hero alongside the Signal Overload glitch): its purple glow no longer spills onto the background. It is now masked to the letter shapes, so the light only shows inside the cut-out (slightly brighter there to compensate), and it follows the cursor by moving the gradient, not a layer, so nothing can escape in Safari.
- Holo-foil button: in Safari its rotating foil layer escaped the button and painted a large gradient across the nav and hero. The foil now animates inside the button's own 1 px border (an animated `@property` angle), and the hover sheen is clipped with `clip-path`, so nothing can draw outside the button.
- Mobile menu opens about twice as fast: the links are readable after ~0.15 s (was ~0.5 s) and the slat wipe ends at 0.34 s (was 0.63 s). The page-wide "pause what's behind" step, which froze phones for a moment at the end of opening and the start of closing, is gone; only the hero particles and spotlight now skip drawing, through a flag that costs nothing. The menu is drawn at page load, so the first tap is as quick as the rest.
- Mobile menu opens smoothly. It's now built once and kept ready instead of on every tap, and the six-slat wipe runs as GPU CSS transitions instead of frame-by-frame JavaScript. The page behind can't scroll while it's open (which on iPhone also moved the toolbar mid-wipe). Once the wipe finishes, the hidden hero particles, spotlight logo and looping animations pause. Escape closes it, and it respects Reduce Motion. The look is unchanged.
- SIGNAL form: the event-date field now matches the other fields on every browser and screen size. Empty, it shows a grey DD / MM / YYYY placeholder in the visitor's own date order; Safari used to show today's date in purple and white, and iPhones showed nothing. A chosen date is white like the other answers, the field is the same height as its neighbours, and the calendar icon and selected segment use the site's colours.
- Placeholder grey is now set explicitly; the old class never compiled, so it fell back to Tailwind's default.

## [1.0.0] — 2026-10-04

The first release of the ARCHIVE_404 site from source.

### Added

- **ARCHIVE_404**: 4 chapters, 20 tracks, streamable on the page, with the full album downloadable as `ARCHIVE_404.zip` from the GitHub Release.
- Cold-open intro (THE FUTURE **FAILED.** / THE ARCHIVE **REMEMBERED.**), skippable and shown once per visit.
- Spotlight-reveal logo on the hero and closing screen, and a draw-on logo in the nav.
- Chapter cards with a built-in player, waveform and expandable file notes.
- Collective section with the brand kit (palette, typography, press images, logo downloads).
- SIGNAL booking form (Netlify Forms).
- End-credits footer, a wide-screen telemetry gutter and a branded 404 page.
- Gradient "4" favicon set, web app manifest and a black-editorial share image.

### Tracklist

| Chapter         | Tracks                                                              |
| --------------- | ------------------------------------------------------------------- |
| 01 ORIGIN       | ORIGIN · LEFT_BEHIND · GRAFT · IMPACTED · EMPTY_CITY                |
| 02 THE FEED     | THE_FEED · GOSPEL_OUT · ENDLESS_GLOW · AWAKE · RECLAIMED            |
| 03 THE WRECKAGE | THE_WRECKAGE · READ · COME_HOME · CHANGED_THE_LOCK · DOWN_THE_FRONT |
| 04 WHOLE        | WHOLE · ENOUGH · OPEN_SKY · ALL_OF_ME · BETTER_DAYS                 |

[1.0.0]: https://github.com/error404website/error404-website/releases/tag/v1.0.0
