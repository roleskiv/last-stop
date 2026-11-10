# LAST STOP: Midnight Line. Handoff and readiness

This page says plainly what is finished, what was verified and how, and what a casino or
platform still has to do before the game can take real money. No game can skip the steps in the
last section, whoever built it.

## What is in the package

| Area | Delivered | How it was checked |
|---|---|---|
| Game engine | Cluster pays, cascades, Wild, Scatter, Phantom Platforms, Ticket Punch, free spins, bonus buy, max win cap | Unit tests, and an independent auditor (`src/math/verify.ts`) run over tens of thousands of rounds per variant |
| Math | Three RTP variants with one paytable and one bonus frequency | Large seeded simulations with confidence intervals, stratified and brute force (`docs/PAR_SHEET.md`) |
| RNG | CSPRNG with unbiased range reduction | Range and chi-square tests |
| Game server | Authoritative service, HTTP reference RGS, wallet port, idempotency, recovery, hash-chained history | `tests/service.test.ts`, `tests/http.test.ts` |
| Client | Landscape and portrait layouts, touch and keyboard, turbo, skip, autoplay with limits, bonus buy with confirmation, paytable and rules, round history with replay, settings, reality check, session time and net position, error and reconnect handling | Manual and scripted browser runs in desktop Chromium at several sizes |
| Jurisdiction switches | Per-operator feature flags enforced on the server, example `eu` and `uk` profiles | Service tests |
| Art and audio | Complete original set, generated from source in the repo | `docs/ASSETS.md` |
| Documentation | Rules, math, par sheet, integration guide, this page | |

## Known limits of this build

- Tested in desktop Chromium only, including phone-sized viewports. It has not been run on
  physical iOS or Android devices, Safari or Firefox.
- English only. Currency formatting uses the operator's currency code and decimals; there is no
  translation layer yet.
- The reference server keeps sessions in memory and stores rounds in a JSON file. It is a
  reference for integration, not a production deployment.
- Character animation is a code-driven rig, and audio is synthesised. Both are complete and
  consistent, and both would benefit from a specialist pass before a commercial launch.
- No accessibility audit has been done beyond keyboard control, button labels and a
  reduced-motion-safe UI layer.

## What must happen before real-money play

1. **Laboratory certification.** An accredited lab (for example GLI, BMM, eCOGRA or iTech Labs)
   must test and certify the math, the RTP of each variant, the RNG as deployed, and the game
   rules as displayed. The RTP figures in this repository are our own simulation estimates and
   carry no regulatory weight until then. The source, `docs/MATH.md`, `docs/PAR_SHEET.md` and the
   simulator are the submission material.
2. **Platform integration.** Connect the wallet, player authentication, round storage and RNG
   service of the target platform (`docs/INTEGRATION.md`), then pass that platform's
   integration test suite.
3. **Jurisdiction review.** The operator's compliance team sets the final `OperatorConfig` per
   market (bonus buy, autoplay, game speed, stake limits, required on-screen information,
   responsible-gambling tools and wording) and checks the rules text.
4. **Device and browser QA** on the operator's supported device list, plus load and security
   testing of the deployed server.
5. **Legal.** Licensing of the supplier and operator, trademark clearance for the title, and
   review of the asset provenance in `docs/ASSETS.md`.

## Submission checklist for a lab

- [x] Deterministic engine with all math in one configuration file
- [x] Outcomes independent of bet size, balance and history
- [x] RNG behind one interface, unbiased scaling, no client-side outcome logic
- [x] Reproducible simulator with seeds, sample sizes and confidence intervals
- [x] Par sheet: paytable, weights, RTP split, hit rate, win distribution, max win
- [x] Rules text matches engine behaviour (rule by rule, `docs/GAME_RULES.md`)
- [x] Complete round records, replay, interrupted-game recovery
- [x] Max win cap enforced in the engine and displayed in the rules
- [ ] Certificate from an accredited test laboratory
- [ ] Integration certificate from the target platform
