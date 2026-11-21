# VICE PRESS

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun)
[![rank](https://make.fun/badge/gta6-cover-art-01/endog-ai/makefun-gta6-cover-art-01/rank.svg)](https://make.fun)
[![reward](https://make.fun/badge/gta6-cover-art-01/endog-ai/makefun-gta6-cover-art-01/reward.svg)](https://make.fun)

VICE PRESS turns your photos plus a caption into Vice City-style cover art:
the multi-panel poster look with bold lettering, a neon sunset colour grade
and a film-grain finish, exported as a PNG ready to share. It runs entirely
in the browser — photos are read locally and never uploaded anywhere.

> An original design in the style of a Vice City sunset poster. It uses no
> Rockstar Games logo, artwork or font, and no GTA wordmark appears in the
> cover art itself.

## How to use it

1. Serve the app locally (`node serve.ts`) and open http://localhost:8080.
2. Pick a layout: Hero + three, 2 x 2 grid, full bleed, 3 x 3 grid, tilted
   snapshots, or triptych.
3. Pick a colour grade: Vice Sunset, Neon Night, Golden Hour, Palm Teal or
   Mono Noir.
4. Click a photo in the strip to put it in the selected panel. Click a panel
   on the cover to select it, drag inside it to pan the photo, and use the
   zoom slider to scale it. One photo can fill several panels, or several
   photos can fill different panels.
5. Upload your own photos with the file input — they stay on your machine.
6. Type a title and a subtitle, move the title block top or bottom, set the
   star heat meter and the badge ribbon text.
7. Undo / redo walk back through your edits. Pick an export size
   (1080 x 1080, 1080 x 1350 or 1920 x 1080) and hit **Export PNG**.

## What is inside

- `app/index.html` — the editor page (dark UI, controls left, live canvas right).
- `app/style.css` — the editor styles and the vendored `@font-face` rules.
- `app/src/main.js` — editor wiring: upload, pickers, pan/zoom, assignment,
  export, undo/redo, screenshot scenes.
- `app/src/cover.js` — the canvas cover renderer (layouts, grades, lettering,
  grain, vignette, halftone, badge, stars).
- `app/src/layouts.js` — the six layout definitions (panel rectangles).
- `app/src/grades.js` — the five colour-grade definitions.
- `app/src/shots.js` — the fixed screenshot scenes (`?shot=cover`, `?shot=editor`).
- `app/fonts/` — Anton and Pacifico (SIL Open Font License, see `OFL.txt`).
- `app/samples/` — four sample photos (two from the kit, two AI-generated
  with no real person in them).
- `tools/shoot.mjs` — headless screenshot driver (serves the app, waits for
  `window.__shotReady`, saves the four shots as JPEGs).

## Build

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into the output directory and writes
`dossier.json` with the vendored make.fun library.
