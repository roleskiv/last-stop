# LAST STOP: Midnight Line. Math model

Everything that determines an outcome lives in two files: `src/math/config.ts` (data) and
`src/math/engine.ts` (rules). The numbers in this document come from `docs/PAR_SHEET.md`, which
is generated from the configuration and from verification runs.

> RTP figures are simulation estimates produced by this repository. They are not certified.
> An accredited test laboratory must certify the math and the RNG before real-money use.

## Model in one page

- **No reel strips.** Every cell is an independent draw from a weight table. There are four
  tables: base first drop, base refill, free-spin first drop, free-spin refill, plus a table for
  what a Platform Sign flips into. Tables sum to about 100,000, so one unit is 0.001%.
- **Outcomes are bet independent.** The engine works in coins (1 bet = 20 coins). The bet,
  balance, history and time are never inputs. Money is `coins x bet / 20` and always exact because
  every allowed bet is a multiple of 20 minor units.
- **One code path.** The server, the offline demo and the simulator run the same `Engine.run`;
  simulation only turns recording off. A test asserts that both give identical results for the
  same RNG stream.
- **Order per drop:** Platform Signs, Ticket Punches, cluster pays (with platform multipliers),
  platform step-up, cascade. Refill symbols are drawn column by column from the left, bottom-up.
- **Bonus trigger** is decided by the first drop only (Scatters have zero weight in refills), so
  its probability is exact: P(at least 3 of 30 cells are Scatters), about 1 in 255 spins.
- **Bonus buy** draws first drops until one shows 3 or more Scatters, then plays on normally.
  The bought bonus therefore has exactly the distribution of a natural one, including the
  4, 5 and 6+ Scatter cases. Its price is 100x, and its RTP equals the game RTP by construction
  of the tuning (below).
- **Maximum win** 10,000x. The round stops at the cap.

## RTP variants

Three variants share the paytable, the feature rules and the bonus frequency. Only two weights
differ between them:

| Lever | Table entry | Effect |
|---|---|---|
| A | Ticket Punch weight on the base-game first drop | value of ordinary spins |
| B | Platform Sign weight on the free-spin first drop | value of the bonus |

Weight moved in or out of a lever is taken from or given to the Subway Token, so table totals and
the Scatter probability never change. `scripts/tune.ts` solves lever A against the target for
non-bonus rounds and lever B against the target bonus value (`target x 100` bets), which makes the
base game and the bonus buy land on the same RTP.

## How RTP is measured

A plain average over spins is dominated by rare, large bonuses and converges slowly. Because the
trigger probability `p` is known exactly, RTP is split into two parts that are each measured well:

```
RTP = (1 - p) x E[win | no bonus] + p x E[win | bonus]
```

- `E[win | no bonus]` comes from ordinary spins (hundreds of millions, low variance).
- `E[win | bonus]` comes from bought bonuses (millions), which have the same distribution as
  triggered rounds.

The plain brute-force average of the same spins is reported next to it as an independent check;
the two must agree within their confidence intervals.

Reproduce:

```
npm run simulate -- --math LS2-96 --spins 1000000000 --buys 20000000 --seed verify
npm run parsheet
```

Runs are deterministic for a given seed and process count (`xoshiro128**` streams, one per
worker). Results are written to `math-results/`.

## Random numbers

- Production draws use `CryptoRng`: the platform CSPRNG (Web Crypto `getRandomValues`), with
  rejection sampling so that `below(n)` has no modulo bias.
- `SeededRng` (xoshiro128**) exists for simulation, tests and repeatable QA of the offline demo.
  It is never used by the game server.
- A certified deployment normally replaces `CryptoRng` with the operator platform's certified RNG
  service. The engine only needs `below(n)`, see `src/math/rng.ts`.

## Independent audit

`src/math/verify.ts` re-derives every cluster, multiplier, pay, cascade and free-spin award of a
stored round with a separate, simple implementation and reports any mismatch. The test suite runs
it over tens of thousands of rounds for every variant, and over rounds stopped by the maximum win.
A back office can run the same function over stored history.
