# Changelog

All notable changes to the ERROR_404 website are recorded here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow the album releases.

## [Unreleased]

### Changed

- **The Build · phones:** the chapter slides lose the empty band at the bottom. The progress dots sit right under the dialogue line, HOW IT WORKS follows straight after, and the button now shares the bottom row with the sound button instead of sitting above a strip kept clear for it, so the visual gets that room back.
- **The Build · skull etch:** the Mac mini in the thermal opening now carries the ERROR_404 skull etched into its lid, where the Apple logo sits on a real one. Like bare metal under a real IR camera it reads cooler than the lid (E1), so it sharpens into a dark skull framed by the GPU glow as the machine heats, with a dashed ETCH · BARE ALUMINIUM callout giving its live temperature against the lid. At the burn-out the skull stays burnt into the white flash for a beat before the boot screen (E4 afterimage). The centre crosshair is gone.
- **The Build · pinned chapters:** each chapter body is now one locked screen: the text and the visual stay put under the menu bar and ruler while the scroll plays the chapter in place (the dialogue appears line by line, the number fills, the visual turns), so nothing on the left scrolls or slips under the bar. On phones, portrait tablets and short screens the dialogue runs as subtitles (one line at a time, with progress dots) under the visual; every visual scales to the room it has; HOW IT WORKS opens as a panel over the slide; landscape phones get the compact 64 px bar. SOUND ON now plays GOSPEL_OUT throughout, and the title cards read TRACK instead of SCORED BY.
- **The Build · menu, crew and credits:** the story now uses the site's own menu bar at the same height as the other pages (80 px, 64 px on phones): the draw-on wordmark, chapter links with scroll-spy, a 60 SEC · ♪ SOUND split button, and the burger on every width opening the slat menu with all ten chapters as poster links (M1). Under it, the vault's ruler becomes a chapter ruler (L1): every chapter marked where it starts, with a gradient fill and a playhead. THE BOOKS chapter is gone; THE CREW is now chapter 08 in the full chapter treatment (C3): a map of NULLSAINT × CACHEGHOST and the eleven tools, cyan links for the real cross-checks, red rings for failures, details per tool, and VIEW SOURCE on the wav2vec2 vote. The ending (F2) cools the machine from 75° to 41°, then rolls into the site's cinematic credits with the spotlit wordmark and the footer bar.
- **Ableton set:** the setup guide and stage card are redesigned and all-dark like the site: a digital-rain cover with the Nº404 seal, the KeyLab drawn with every control labelled, a signal-flow diagram, a setlist page with each song's six vocal chops, and a back cover like the site footer (10 pages). The download (v1.2, same project) now carries the new PDFs, and the previews on the page match them.

### Fixed

- **Ableton set and Source Vault:** on opening, the menu no longer lights CREDITS (the scroll-spy measured the footer while it was still hidden); nothing is lit while the header is in view.
- **Ableton set:** the big chapter numbers (01–09) are no longer clipped at the top and bottom; the PDF buttons sit side by side.

### Added

- **The Build · chapters (S1 + S2):** every chapter from THE SOUND on now opens on a full-screen title card in the wordmark's own treatment (outline, torch moving inside the letters, glitch bursts, with chapter, scoring track and key), then a full-bleed body: the vault's rain behind, a giant outlined chapter number that fills as you read, and the visual floating in 3D instead of sitting in a box. Chapter 08 uses the press shots for now. **VIEW SOURCE** (W5) flips each visual to the real code behind it (prompt spec, seam placement, cache-busting, vault decrypt, MP3 priming trim, the Max for Live MIDI feed, the ComfyUI face lock). **SOUND ON** (W1, opt-in) scores the page with the album, crossfading tracks per chapter and ducking under the seam A/B. A vitals HUD (W2) carries the opening's SoC / fan / jobs readout down the page, cooling chapter by chapter. **60 SEC** (W6) opens the whole story as eight cards, and **SAVE CASE FILE** prints it as a one-page PDF (W9), plus a share image for /story/ link previews.
- **Ableton set** at `/ableton/` (same access key as the Source Vault): the live show as an Ableton Live 12 Suite project. One download (0.9 GB, lossless FLAC stems, stock devices only, works from any folder) from a key-checked signed link (`netlify/functions/ableton-download.mjs`, the vault's token and proof), a nine-step setup checklist that remembers your progress, an interactive KeyLab 49 mk3 map, the signal flow, the setlist with each song's pad chops, a Web MIDI rig tester (KeyLab + Ableton's position feed), troubleshooting, a pre-show checklist, the setup guide and a one-page stage card as PDFs, and how the set is built. In the vault's look: gate rain, intro, gutter rain, ruler, seal and cinematic footer.
- **The Build** at `/story/`: a scrolling storybook for engineers about how ARCHIVE_404 was made, credited to NULLSAINT × CACHEGHOST. It opens on a thermal-camera view of the Mac mini overheating as each real job spins up, then reboots into the wordmark over the rain. Each chapter (sound, seams, site, vault, live show, Ableton, comics + anime) is a NULLSAINT / CACHEGHOST dialogue with a HOW IT WORKS drawer beside one pinned visual: an A/B of the raw album cut against the engineered live-set seam into THE FEED (real audio), the PR film strip, the vault's key path, LEFT_BEHIND's first line filling on its real word timings, the Ableton position feed with KILL ABLETON → take-over, and a comic panel from storyboard to final. Then holo cards for the AI crew (with where each one failed), and end credits that roll while the machine cools to 41°. Direct link only, like the rest of the site.
- **Live show · Ableton standby:** menu → CONTROL → ABLETON STANDBY (Chrome / Edge). When the show runs from the ARCHIVE_404 Ableton set, its show device sends the set position over the Mac's IAC MIDI bus (CC 110–115 on channel 16); the page follows it silently with the right songs loaded, warns if the feed stops while playing, and TAKE OVER starts the page's own playback from the same spot.
- **Live show on phones and tablets (PH1):** on screens up to 900 px wide (phones and portrait tablets) the console becomes a bottom sheet: play / prev / next with PANIC always one tap away, and FX, PADS, MIX and SET tabs (tap, or swipe the sheet up and down), with the same buttons, ring knobs, gradients and rain as the desktop. Lyrics are sized for the screen; drawers and the menu go full width; the pre-show check scrolls and warns about the iPhone / iPad silent switch. Menu → LAYOUT forces PHONE or DESKTOP. On landscape tablets and small laptops (up to 1180 px) the info row drops its smaller labels so nothing overlaps.
- **Live show tools (4/4 · the room):** crowd prompts on the stage screen (SING IT!, HANDS UP, JUMP, ARCHIVE_404, plus SING IT! on every hook), pulsing on the beat; title cards before each song's first line with the chapter when one begins; stage visuals that follow the music (rain and glow on the bass, a pulse on the downbeat, a tint per chapter; no strobe). REC now captures the show mix and the mic as separate WAVs with a cue sheet and a show report (AFTER THE SHOW).
- **Live show tools (3/4 · playing it):** one-button MOVES on the next bar (BUILD-UP, DROP, BREAKDOWN, ECHO OUT; shift 1–4, MIDI, phone). KEYLAB SETUP: a guided map for the Arturia KeyLab mk3 (faders, 12 pads, transport, encoders) with optional pad lights; encoders and CC buttons can now press controls. PHONE REMOTE: scan a QR code and a phone controls the show (transport, effects, cues, moves, VOX, PANIC) over a direct WebRTC link, paired once through a new key-protected function. REHEARSE: loop any section at 70 / 85 / 100 % with a click, record mic takes per pass and play them back with the track, and a weekly practice log.
- **Live show tools (2/4 · your voice):** VOICE: a mic the page listens to (auto-duck: the recorded vocal drops 12 dB while you sing and returns when you stop; LEARN THE ROOM calibrates it), or sends to the PA with its own effects (plate, slap, doubler, telephone, megaphone), the show's ECHO / REVERB / CRUSH and a feedback guard. IN-EARS: a separate mix of click, spoken cues (a pre-recorded voice counting into every section and changeover), guide vocal, music and mic, on outputs 3–4 of an aggregate device or a second output. NOTES: breath marks and line notes, shown under the sung line and in the new PROMPTER window (mirror, size).
- **Live show tools (1/4 · the show):** SETS (menu): build any running order by dragging (or ↑ ↓), drop and restore songs, save sets by name, apply mid-show from the next song; re-ordered joins use clean patches of each song's own ends (80 small encrypted files, preloaded and offline). A show clock with a curfew that warns early and offers a song to skip. Four hot cues per song (A–D, pre-set at the hooks and breakdown, hold to re-set) that land on the next bar, with flags on the waveform. Show safety: the screen stays awake, the audio output and battery are watched, and interrupted audio resumes from the same bar. Export / import of everything saved on the show laptop.
- **Live show** at `/live/` (same access key as the Source Vault): preload the whole set for offline use, karaoke lines that fill word by word with stage cues and a next-song countdown, gapless playback, and a performance console (VOX / CROWD, EQ, filter, effects, loops, rehearse, 16 quantised pads with live vocal chops, panic, lock, recording, MIDI learn) plus a stage-screen window for a projector.
- **Source Vault** at `/vault/`: a password-gated page with every track's stems, the Suno style prompts in all five production styles (colour-coded), original and Suno-optimised lyrics (same words, shorter section tags), a one-click Remix kit, a Camelot harmonic map, and each full song with its measured length, BPM and key (and how many detection models agree). It opens with the site's rain intro decrypting the 20 files, uses the site's menu, logo draw-on and end credits, and runs the track-name rain in the gutters on wide screens.
- Password-only: the prompts, lyrics and analysis are committed only in encrypted form, locked with the access key itself and opened in the browser. Stems download through short-lived signed links from a private GitHub repo, handed out by one small Netlify function to visitors who prove they know the key (one Netlify setting: `VAULT_GH_TOKEN`).

### Changed

- Home hero: the logo, ARCHIVE_404 and the tagline now sit together as one block at the optical centre (46% down) on desktop, tablet and phone. The text used to hang far below the logo (the logo's box was the old image logo's canvas, about half empty under the letters), and phones and wider screens used different rules. The hero also measures phones with their browser bars showing, so the bars don't shift it.
- **The Build:** the thermal opening now starts already warm (64.7°, three jobs labelled, AI ISN'T FREE), so the first screen isn't an empty cold frame; the scroll before the reboot is shorter to match. The top bar's wordmark draws itself on like the site's nav (and again on hover), and the reboot screen uses the site's hero wordmark: an outline with the torch moving inside the letters and a glitch burst every few seconds.
- **Live show loading on phones:** after the key, the preload card stays centred like the lock screen (it had jumped to the top) and only scrolls once the pre-show check makes it taller than the screen; each check row now shows its result under its name instead of squeezed beside it; the keyboard-shortcut tip no longer pops up on phones.
- **Live show on small and sideways phones:** on short phones (iPhone SE) the PADS tab now stays on screen and scrolls inside the sheet. Turned sideways, the console is one row (transport, PANIC and the tabs), the lyrics shrink to fit, and an open tab slides up over the lyrics and scrolls; tap the tab again to close it.
- **Live show effects and vocal pads, more responsive:** effects and loops fire the moment a button goes down; ECHO / REVERB / CRUSH latch on a tap and throw (on only while held) on a hold; ROLL and TAPE STOP are held and slip, so the set comes back exactly in time (tape stop spins back up instead of stopping the show); echo is a ping-pong that darkens as it repeats, reverb has a pre-delay and no low-end mud, crush bites in the mids. The four vocal pads are cut on the word timings (the hook's opening phrase, its punchiest word, its last word, its longest held word), trimmed and level-matched, fire instantly, go through the effects, choke each other, repeat every 1/8 while held, and the next song's chops are cut before the changeover. MIDI note-off releases held controls.
- Live show lyrics sync: the words now follow what you hear, not what the browser has sent. Lyrics, cues, counters, the waveform, the ruler and the stage screen are delayed by the output delay the browser reports (about 10–40 ms on wired outputs, 150–300 ms on Bluetooth). The menu has a SYNC − 10 / 0 / + 10 nudge, remembered per browser, for rigs that report it wrong. The word timings are re-aligned too: a second aligner (wav2vec2) checks every word, word starts snap to the sung onsets, line starts lock to the 16th-note grid where the voice agrees, and runs of words that used to light up together are spread over the vocal (379 squashed words across the set down to 65).
- Live show menu: PADS and SETLIST now toggle. Clicking one that's already open (lit) closes it, like the console's PADS button, and Esc now also closes the pads.
- Live show: a set timecode ruler under the nav (R1), like the Source Vault's: ticks every 1.5 s, the time every minute, a magenta notch and number at each song's start, and a gradient playhead a third of the way in while the whole set scrolls past.
- Live show menu: hovering (or tabbing to) a link now fills it with the whole magenta → cyan gradient, the same as the section you're on, instead of turning it solid white.
- Live show: the nav logo now draws itself on when the show opens and replays on hover, like the Source Vault's (the site's logo-fx script).
- Access gates (/vault/ and /live/): a calmer key field that fits a long key. The card is wider (380 px), the field is 14 px with tight spacing under a small ACCESS KEY label, a SHOW / HIDE toggle lets people check what they typed, and a full-width gradient-edged UNLOCK → button replaces the arrow. Safari's key icon no longer covers the field, and phones keep 16 px text so iOS doesn't zoom.
- **Live show stage screen and menu:** the stage screen now has the cinematic look: full-screen rain (the playing song's words, paused with the show) under a vignette, the song name between gradient rules, and centred lyrics that shrink long lines to two. In the open menu the active link shows the whole magenta → cyan gradient (it was stretched across the screen, so only magenta showed).
- **Live show console (L3) and EQ:** the bottom bar is two tiers: the next song (its name in the gradient) and the safety buttons on top, transport, knobs, effects and loops below. Every knob now starts at 100% (FILTER stays centred). LOW / MID / HIGH are cut-only like a DJ mixer: full is the song as mastered, half way is -6 dB, the bottom kills the band, and they never boost. MASTER's full position is the file's own level.
- **Live show, cinematic layout (P2):** the lyrics sit centred over full-screen rain under a vignette, long lines (the narration) shrink to stay within two lines, the cue is a small glass pill, the waveform is one slim line with section labels, the setlist moves into a drawer (menu → SETLIST), and the console becomes a low bar of ring knobs (VOX, EQ, MASTER, FILTER) that dims until the mouse is on it. Clicking the waveform before it has drawn no longer jumps to the end of the song, and START can't wire the show twice.
- **Live show waveform and share card:** a waveform strip above the console (16 bars scrolling past the playhead, coloured by frequency, with section flags and bar ticks), a lane of the lines to sing, and the song's section map (click to jump, snapped to the bar). The page is now named "ARCHIVE_404 Live · ERROR_404", with its own favicon (the >_ mark with waveform bars) and a share image of the whole set as one waveform.
- **Live show on brand:** the Source Vault's nav and slat menu (LYRICS · PADS · SETLIST · STAGE SCREEN, MIDI, record, lock), chromatic-text console buttons like the nav links, the vault's digital rain behind the lyrics (words of the song that's playing, paused with the show), and no brand text on the stage screen.
- Audio: the 20 site MP3s no longer embed the 2.7 MB cover image (the players use their own artwork), so pages and the live preload load ~54 MB less. Audio unchanged.
- Audio: the site now streams the live set versions of all 20 tracks at 320 kbps (from LIVE_SET/ARCHIVE_404): each starts on its first downbeat with the short changeovers built in, so the player's in-order playback flows like the live set (72:04). Track lengths on the site are updated to match. The ↓ DOWNLOAD zip (GitHub release v1.2.0) is replaced with the same 20 files: 223 MB, 320 kbps.
- Player: lock screens and media controls now show the artist as error_404 (lowercase), matching the audio files' tags. The Source Vault's player now shows the same lock-screen details (title, error_404, ARCHIVE_404 · chapter, artwork) with play / pause / next / previous.
- Audio: the 20 tracks' MP3 tags are cleaned and rewritten. The Suno links, "made with suno" comments and C2PA records are gone; each track now carries its title (e.g. LEFT_BEHIND), artist error_404, album ARCHIVE_404, track n/20, year, genre, composers NULLSAINT · CACHEGHOST, its chapter, plain lyrics and the album artwork (with its own C2PA record stripped; the picture is unchanged). The audio itself is bit-for-bit unchanged.
- HTTPS: every response now tells browsers to use https for error404.run and all its subdomains (www included) for two years, even from an `http://` link, and to fetch any stray `http://` file over https. The site is ready to be added to the browsers' built-in https list (hstspreload.org).
- Source Vault identity: its own favicon (the vault's `>_` prompt in a gradient frame, with a 32 px PNG and an iPhone home-screen icon), page tags (title "Source Vault · ERROR_404", description "Restricted. Access key required.") and a share image for link previews: the logo beside the Nº 404 seal and ACCESS REQUIRED, in the same frame as the main site's. The tags never mention what's inside, and the vault stays noindex and blocked from search and AI crawlers.
- Source Vault: the STYLES stat in the header is now GENRE: HYPERPOP (was STYLES: 5 + NONE).
- Intros: the site intro and the vault's unlock intro now carry the ACCESS REQUIRED page's soft violet glow over the rain (one shared layer, same colour, size and position), in place of their dark edge vignette, so the gate → unlock hand-off keeps the same light.
- Source Vault: the access number is now **Nº404** everywhere (nav, phone menu, header seal, stats, end credits, unlock intro). With the stems uploaded, the "SOON" / "UPLOADING SOON" placeholders are gone: the STEMS stat counts the stems (220, each as WAV + MIDI), ALL STEMS shows its total size once the release answers, each track's stems tab shows its stem count, the intro line reads "full stems as WAV and MIDI", and a failed download now says UNAVAILABLE · TRY AGAIN instead of NOT UPLOADED YET.
- Intros: the readout card in both the site intro and the vault's unlock now matches the vault gate: no box, the four viewfinder corner ticks, the rain fading to dark behind it, a blinking tag (RECOVERY · ARCHIVE_404 / KEY ACCEPTED · SOURCE VAULT), a small title (RECOVERING FILES. / DECRYPTING VAULT.) and a gradient bar that fills with the 00 → 20 count.
- Source Vault on phones: the chapter buttons wrap onto two rows instead of running off the screen, and the vault now always opens at the top after unlocking (typing the key had left the page scrolled down).
- Source Vault stems: the remastered stems are in. Each track's zip holds its WAV stems and MIDI files (10–12 stems per track, every one as WAV + MIDI), and the stem lists now match the real files. ALL STEMS hands over the 20 track zips one after another (a chapter zip would pass GitHub's 2 GB per-file cap). The per-stem WAV / MIDI chips are labels now, not mock-up buttons.
- Source Vault phone menu: one link is always lit with the gradient, like the site's menu. At the top of the page that's PROMPTS, the first section.
- Source Vault phone menu: it now opens exactly like the site's menu: full screen with the slat wipe, the SYS::OPEN chip, big outlined poster links with numbered captions (the section you're on fills with the gradient), and the split buttons at the bottom.
- Source Vault menu: the links now follow the page, top to bottom: Prompts, Harmonic Map, Tracks, Credits (desktop nav and the phone menu).
- Source Vault gate: the ACCESS REQUIRED card is much smaller (270 px: tag, one-line title, and the key field with a → button) and has no box, just four viewfinder corner ticks with the rain fading to dark behind it. The site's digital rain now runs behind it, streaming only public words (track titles and stem types) until the key is in.
- Source Vault player: the dock now matches the site's player (borderless ▶ key, « » skips, title and chapter lines, the black bar), and the playing track's real waveform is the seek bar, with the times under it. The right-hand slot shows the tempo, key and Camelot code and opens a queue of all 20 files with their BPM; on phones it folds up like the site's dock.
- End credits: the GitHub mark beside VIEW PROJECT → GITHUB now carries the magenta → cyan gradient, matching the GitHub mark in the footer bar.
- README: new catalogue screenshot showing the Hyperpop · Metalcore · Glitchcore tags.

### Changed

- Genres: 2-step is replaced by **glitchcore** everywhere on the site. The chapter-card tags now read Hyperpop · Metalcore · Glitchcore, along with the Collective sound line and intro, THE FEED description and the page keywords. Hyperpop stays first.
- README: an animated recovery-terminal header (`docs/terminal.svg`) under the banner, a stats badge row (tracks, runtime, download size, Lighthouse scores, last transmission), the tracklist as a recovered file tree with the remastered lengths, and animated equaliser dividers (`docs/eq.svg`).

### Changed

- Stronger block on discovery: the site stays shared by direct link only. `robots.txt` now names about 100 search, AI, archive and SEO crawlers on top of blocking everyone. Every response (pages, audio, images, the 404 page and the netlify.app domains) carries an `X-Robots-Tag` noindex/noarchive/noimageindex/noai header. The site also opts out of text and data mining with `tdm-reservation`, `/.well-known/tdmrep.json` and `/ai.txt`.

### Changed

- THE WRECKAGE description: removed the closing line "It does not name it." so it matches the new description, which now ends on "It holds the frequency."

### Security

- Patched `postcss-selector-parser` to 7.1.6 (CPU-exhaustion advisory) with an npm override, keeping Tailwind CSS on v3. The built CSS is byte-for-byte identical. This replaces Dependabot's Tailwind 4 upgrade, which needs a planned migration and broke the build.

### Fixed

- Footer on iPhones: the BACK TO TOP block no longer sits too high. The footer bar was adding the home-indicator safe area (about 34 px) that the player dock below it already reserves, leaving a ~61 px gap above the dock; it's now ~27 px.

## [1.2.0] — 2026-10-06

The remastered album: all 20 tracks and the download replaced with the final remasters.

### Changed

- All 20 tracks on the site are the final remasters (ARCHIVE_404 REMASTERED FINAL), with the same filenames, so the dock, the chapter players and the queue pick them up. Each build re-stamps the tracks, so returning listeners get the new files instead of a cached copy.
- Track durations updated to the remastered lengths (19 of 20 changed; for example ORIGIN 3:19 → 2:58, WHOLE 3:20 → 2:16, BETTER_DAYS 5:05 → 4:37).
- The album download is the remastered `ARCHIVE_404.zip` (about 155 MB, the 20 MP3s without macOS metadata files), published as GitHub Release v1.2.0. The zips on the older releases are removed.

- Intro rain is finer and has depth: the falling track names are drawn in three layers (7, 10 and 14 px; 6, 9 and 12 px on phones) instead of one size that scaled with the screen (about 23 px on a laptop). A dim, slow far layer, a mid layer and a few bright, fast near streams.

### Fixed

- Page weight: the four chapter players no longer download their first track when the page loads (about 16 MB of MP3s on every visit). Audio now loads only when you press play, so a phone visit drops from about 17 MB to about 0.6 MB.
- Fonts no longer block the first paint: the Google Fonts stylesheet loads in the background, with a `<noscript>` fallback.
- Images: the brand-kit logos show 900 px previews (31 KB each) and still download at full size, the collective portrait serves an 800 px version on phones, and both carry their width and height so the layout doesn't jump.
- Accessibility: the page now has a heading for screen readers, the nav logo link, colour swatches and queue button announce the same words they show, and the nav's ARCHIVE_404 tag, inactive nav links and the dock's chapter line and times are a little brighter to meet contrast guidelines.
- Removed four unused artwork paths from the tracklist data.

## [1.1.0] — 2026-10-03

The hyperpop redesign: a new intro and hero, a site-wide player, v6 audio and a refreshed design system.

### Added

- Site player dock: a player fixed to the bottom of every page (desktop and mobile) that plays the whole archive in order, 01 → 20 and round again, styled like the chapter players (holo ▶ key, "01 — ORIGIN" + chapter, gradient seek and times, waveform). Its queue lists all 20 tracks by chapter: a popover on desktop, a bottom sheet on phones. It hands over to and from the chapter players, remembers the track and position between visits, and shows lock-screen / headphone controls. The hero now ends where the dock begins, and the wide-screen gutters stop above it.
- Hero tagline: every few seconds "SOMETHING SURVIVED THE CRASH" scrambles into "HYPERPOP MAXIMALISM" and back, in the same type and colour, with an RGB flicker while it changes (ARCHIVE_404 above it keeps its gradient). Screen readers get both lines; Reduce Motion keeps the original line.
- Safari pinned-tab icon (`safari-pinned-tab.svg`, tinted magenta).
- Android maskable icon, with the 4 inside the safe zone so launchers don't crop it.
- `apple-touch-icon-precomposed.png` for older iOS and other apps that request it.
- The 404 page now carries the full icon set.

### Changed

- Player dock: first-time visitors now start on 07 GOSPEL_OUT (was 01 ORIGIN) on every device, carrying on in album order from there. Returning visitors still resume their last track and position.
- Intro: removed the bottom loading bar, both corner frame ticks and the visible SKIP button, leaving just the tracklist rain and the readout. Tapping anywhere or pressing any key still skips, and the SKIP button stays available to screen readers, appearing only when it is focused.
- GOSPEL_OUT: final mix from the v6 masters (3:45), replacing the earlier v6 version (3:43). The other 19 tracks are unchanged (their v6 files differ only by the added genre tag).
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

## [1.0.0] — 2026-10-03

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

[Unreleased]: https://github.com/error404website/error404-website/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/error404website/error404-website/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/error404website/error404-website/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/error404website/error404-website/releases/tag/v1.0.0
