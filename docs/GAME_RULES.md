# LAST STOP — Game Rules

LAST STOP is a free demo played with **fictional credits** only. Credits have no monetary value and cannot be purchased, deposited, withdrawn or exchanged.

## Basics

- 6 columns × 5 rows, 30 symbols per spin.
- Start balance: 10,000 demo credits. Bets: 1, 2, 5, 10, 20, 50, 100 (default 10).
- The bet is deducted once when the spin starts. Everything won in that spin, including a whole Midnight Train bonus, is credited once when it finishes.
- The bet cannot change while a spin is unresolved. The balance can never go negative, and a spin will not start without enough credits.
- A single paid spin (base game plus bonus) can win at most 5,000× the bet.

## Symbols

| Tier | Symbols |
|---|---|
| Low | Subway Token, Ticket Stub, Station Lantern, Rusted Key, Pocket Watch |
| Premium | Ghost Pigeon, Phantom Passenger, Tunnel Rat King |
| Special | Conductor Graves Wild, Midnight Train Scatter, Haunted Platform Sign, Ticket Punch |

## Cluster wins

- 5+ identical regular symbols connected horizontally or vertically form a cluster. Diagonals never connect.
- Each separate cluster pays independently, by symbol and size (see the in-game paytable). Clusters of 20+ pay the top value.
- **Wilds** substitute for any regular symbol. One Wild can be part of clusters of different symbols, and each of those clusters pays.
- Special symbols never form clusters. Groups made only of Wilds do not pay.

## Cascades

1. Winning symbols are highlighted and paid.
2. They are removed. Symbols above fall straight down into the gaps.
3. New symbols drop in from the top (cascade drops never contain Scatters, Signs or Punches).
4. The grid is evaluated again, repeating until no cluster forms (safety limit 60 cascades).

## Order of play on each spin

1. Count Midnight Train Scatters (initial grid only).
2. Haunted Platform Signs activate.
3. Ticket Punches resolve.
4. Haunted tiles upgrade newly landed symbols.
5. Clusters are evaluated, paid and cascaded. After each cascade, haunted tiles upgrade the symbols that landed on them, then the grid is evaluated again.

## Phantom Platforms

- Each Haunted Platform Sign shakes, haunts its tile and turns into a regular symbol.
- When a regular symbol newly lands on a haunted tile (the sign's own replacement, a cascade drop, or a new free spin), it may upgrade to a better symbol or a Wild, based on a fixed probability table, before wins are evaluated.
- Each haunted tile activates at most once per cascade step.
- Base game: up to 6 haunted tiles, cleared when the spin ends.
- Midnight Train: haunted tiles persist across all free spins, up to 15.

## Ticket Punch

- Before any win is evaluated, each Ticket Punch (left to right, top to bottom) punches one regular symbol into a Wild. Spots next to matching symbols are more likely to be chosen.
- The Ticket Punch then becomes a regular symbol itself.
- Punches never appear in cascades, so a punch can never trigger another punch.

## Midnight Train (free spins)

- 3 Scatters award 8 free spins, 4 award 10, and 5 or more award 12.
- Free spins play at the triggering bet and cost nothing.
- During the ride Platform Signs and Ticket Punches appear more often, and haunted tiles stay haunted for the whole bonus.
- 3+ Scatters during the bonus add 4 more spins (total bonus length capped at 60 spins).
- The intro cinematic can be skipped. Skipping never changes the result.
- The bonus total is shown at the end and credited once together with the triggering spin's win.

## Fairness

Normal play uses the browser's cryptographic random number generator (Web Crypto). Every probability is fixed in configuration; results never depend on previous results, bet changes or balance. The return-to-player figure is a development estimate from simulation and is not certified. Turbo and skip only change animation speed.
