# LAST STOP — Midnight Line

*Mind the gap… it might bite back.*

A browser slot game set in a haunted subway station that only appears at midnight, hosted by the ghost conductor **Conductor Graves**. It uses a 6×5 cluster-pays grid with cascades and three original features: **Phantom Platforms** (haunted tiles that upgrade symbols), **Ticket Punch** (punches symbols into Wilds) and the **Midnight Train** free spins.

> **Fictional credits only.** This is a free demo. Credits have no cash value. There are no deposits, withdrawals, purchases or crypto connections.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173 (includes the DEV panel)
npm test             # unit tests (Vitest)
npm run simulate     # 1,000,000-spin headless math simulation
npm run build        # type-check + production build into dist/ (no dev panel)
npm run preview      # serve the production build
```

Node 20+ is recommended. Press **Space** to spin (or to skip an animation while one is playing).

### Simulation options

```bash
npm run simulate -- --rounds 5000000 --seed my-seed   # seeded, reproducible
npm run simulate -- --crypto                         # production CryptoRNG
npm run simulate -- --json report.json               # also write JSON
```

See [docs/MATH.md](docs/MATH.md) for the model and the latest results.

## What you can do

- Spin with fictional credits (10,000 to start, bets 1–100, default 10). Reset the balance in **Settings**.
- Win through horizontal/vertical clusters of 5+ and watch them cascade.
- Haunt tiles with Platform Signs, punch symbols into Wilds with the Ticket Punch, and ride the Midnight Train bonus to the end.
- Paytable, features and rules under **ⓘ**; volume, mute, turbo and reduced motion under **Settings**.
- Autoplay for 10 / 25 / 50 spins; it stops immediately on tap and automatically when credits run out.
- Turbo shortens animations only. Skipping fast-forwards the presentation only. Neither changes outcomes.
- Desktop (cinematic layout, character left, feature panel right) and mobile portrait (reels on top, Graves and the panel below, thumb-reach controls).

In development builds a **DEV** button (top right) opens a panel to force outcomes (cluster, cascade chain, Phantom Platforms, Ticket Punch, Midnight Train 3/5, big win), switch to a seeded RNG, inspect engine state, symbol counts, the event log and win calculations, and run in-browser simulations. It is excluded from production builds.

## Architecture

```
src/
  config/      gameConfig, symbols, paytable, featureConfig  (all tunable numbers)
  engine/      RNG, Grid, OutcomeGenerator, ClusterEvaluator, CascadeResolver,
               RoundResolver (one round -> ordered event list), GameEngine (credits, spin/settle)
  features/    PhantomPlatforms, TicketPunch, MidnightTrain
  sim/         Simulator (headless, shared by CLI and dev panel)
  rendering/   GameRenderer (Pixi app + layout), ReelRenderer, SymbolRenderer, BackgroundRenderer,
               CharacterRenderer (Graves state machine), InfoPanelRenderer, LogoRenderer,
               TrainRenderer, ParticleManager (pooled), AnimationController (plays events), Timing
  audio/       AudioManager (Howler: master/music/sfx, mute, mobile unlock, graceful fallback)
  state/       GameStateMachine, GameController (glue), store (external store for React)
  components/  React HUD, modals, win banners, bonus overlays
  dev/         Dev panel + forced scenarios (development only)
  assets/      assetManifest.ts + SVG placeholder art
scripts/       simulate.ts, generate-audio.ts
tests/         cluster, cascade, features, accounting, simulation
```

**Outcome first, animation second.** `GameEngine.spin()` debits the bet once and resolves the whole spin up front, including every cascade and every free spin, into an ordered event list (`reveal → scatters → platform → punch → upgrade → win → cascade … → end`). The `AnimationController` only plays those events. `GameEngine.settle()` then credits the total exactly once, even if the animation was skipped or failed. This keeps the math independent of rendering and is ready to move server-side.

Pixi renders the scene graph on its own ticker. React only renders the HUD and overlays, and reads from a small external store with per-field selectors, so the game loop never triggers React renders.

## Documentation

- [docs/GAME_RULES.md](docs/GAME_RULES.md): player-facing rules
- [docs/MATH.md](docs/MATH.md): probability model, paytable, feature tables, simulation results
- [docs/ASSETS.md](docs/ASSETS.md): asset manifest and the final-art brief for each placeholder

## Known limitations

- **Art is placeholder vector work.** All 12 symbols, Conductor Graves (as a layered puppet), the logo and the station are original SVG / procedural drawings built to the style guide. They are organised so final PNG/WebP art can be swapped in via `src/assets/assetManifest.ts` without code changes (see docs/ASSETS.md). There are no sprite atlases yet; they become worthwhile once raster art arrives.
- **Audio is synthesised.** Every sound and loop is generated from code by `npm run audio` (original, no samples). It works, but a sound designer should replace it.
- **RTP is a development estimate, not certified.** Simulations put it around 95–97% (see docs/MATH.md). The bonus drives most of the variance, so short runs swing several points. The max observed win in 5M spins was ~460x against a 5,000x cap, so the top end is still conservative.
- **Character animation** is tween-based on separate parts (float, blink, eye glow, look, arm gestures, hat tip, mouth swap), not frame-by-frame or skeletal.
- **Performance** was checked in headless Chromium with software WebGL, which is far slower than real hardware. It has not yet been profiled on real low-end phones. Mobile automatically lowers particle density.
- The UI is English only, and there are no persistent saves (refreshing resets the demo balance).
