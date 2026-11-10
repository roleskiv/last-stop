# LAST STOP: Midnight Line. Assets and provenance

Every asset in this repository is original and is generated from source code in the repository.
There are no stock images, no third-party recordings and no AI-generated bitmaps.

## Art

| What | Source | Output |
|---|---|---|
| 12 symbols | `art/symbols.mjs` | `public/assets/sym_*.png` |
| Conductor Graves (layered rig: tail, body, arms, head, brows, eyes, mouths, hat) | `art/graves.mjs` | `public/assets/graves_*.png` |
| Station backgrounds (landscape and portrait), reel frame, logo, train | `art/scene.mjs` | `public/assets/` |
| Effects and UI pieces (glow, sparks, smoke, platform tile, sign board) | `art/ui.mjs` | `public/assets/` |

The art is vector artwork written as SVG in JavaScript and rendered to PNG/JPG with headless
Chromium (`npm run art`). It follows the project's master style guide: dark cartoon, thick
outlines, teal ghost light against brass and deep navy. Because it is code, any piece can be
restyled or re-exported at another resolution without an artist's source files.

What a studio would normally still do before a commercial release: an art director's pass,
hand-drawn or Spine-animated character animation in place of the code-driven rig, and
localisation of the text baked into the logo and signs.

## Audio

All 19 sound effects and both music loops are synthesised by `scripts/build-audio.py`
(numpy oscillators, noise, filters and a convolution reverb) and encoded to MP3 with ffmpeg
(`npm run audio`). Nothing is sampled. The music loops are written so the reverb tail folds back
onto the start and loops without a gap.

A sound designer's pass and a mastered soundtrack would raise the audio to commercial level.
The audio has been checked for levels and playback by tooling, not by ear.

## Fonts

| Font | Licence | Use |
|---|---|---|
| Bebas Neue | SIL Open Font License 1.1 | display type, logo, signs |
| Inter | SIL Open Font License 1.1 | interface text |

Both are bundled through the `@fontsource` packages.

## Code dependencies

Runtime: `pixi.js` (MIT), `react` and `react-dom` (MIT). Build and test only: `vite`, `vitest`,
`typescript`, `tsx`. The animation engine, audio manager, game engine, server and simulator are
written for this project and have no further dependencies.
