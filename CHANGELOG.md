# Changelog

All notable changes to the ERROR_404 website are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow the album releases.

## [Unreleased]

### Added

- Safari pinned-tab icon (`safari-pinned-tab.svg`, tinted magenta).
- Android maskable icon, with the 4 inside the safe zone so launchers don't crop it.
- `apple-touch-icon-precomposed.png` for older iOS and other apps that request it.
- The 404 page now carries the full icon set.

### Changed

- Chapter descriptions (and the expanded file notes) now run the full width of the card instead of stopping at 640 px.
- Favicon is now the gradient "4" on a transparent background, so Safari no longer shows a white rim around a dark tile. The small sizes are slightly bolder so the 4 stays legible at 16 px.
- Tab icons no longer list the black-tile 192/512 PNGs, which Chrome could pick over the transparent icon. Those now live only in the manifest.

### Fixed

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
