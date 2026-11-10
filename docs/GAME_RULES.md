# LAST STOP: Midnight Line. Game rules

These are the rules as the player sees them in the in-game paytable (`src/client/ui/Modals.tsx`).
The engine in `src/math/engine.ts` is the authority; this page describes exactly what it does.

## Basics

- The board has 6 columns and 5 rows. Every spin drops 30 new symbols.
- A **cluster** is 5 or more matching symbols connected side by side or one above the other.
  Diagonals do not connect. Every cluster on the board pays.
- Pays depend on the symbol and the cluster size (5 to 15+). See the paytable in the game or
  `docs/PAR_SHEET.md`.
- After all clusters have paid, the winning symbols disappear, the symbols above fall down and
  new symbols drop in from the top (a **cascade**). This repeats until no new cluster forms.
- One bet covers the whole board. There are no paylines and no side bets.

## Symbols

| Symbol | Role |
|---|---|
| Tunnel Rat King, Phantom Passenger, Ghost Pigeon | High-paying symbols |
| Pocket Watch, Rusted Key, Station Lantern, Ticket Stub, Subway Token | Low-paying symbols |
| Conductor Graves | **Wild.** Substitutes for every paying symbol. One Wild can be part of several clusters at once. Wilds do not pay on their own. |
| Midnight Train | **Scatter.** Lands only on the first drop of a spin, never in a cascade. |
| Platform Sign | Feature symbol, see Phantom Platforms. |
| Ticket Punch | Feature symbol, see Ticket Punch. |

## Phantom Platforms

1. A Platform Sign **haunts** the tile it lands on, then flips into a random paying symbol.
2. A haunted tile carries a multiplier. A new one starts at **x2**.
3. A cluster that covers one or more haunted tiles is multiplied by the **sum** of their multipliers.
4. After the win, every haunted tile under the cluster steps up: x2, x4, x8, x16, x32, x64, x128.
5. A Platform Sign that lands on a tile that is already haunted also steps it up.
6. In the base game haunted tiles are cleared before each new spin.

## Ticket Punch

When a Ticket Punch lands, Conductor Graves punches it: the Ticket Punch becomes a Wild and
1, 2 or 3 more paying symbols, chosen at random, also become Wilds.

## Order of play

On the first drop and after every cascade: Platform Signs resolve first, then Ticket Punches,
then all clusters pay, then the cascade happens.

## Midnight Train free spins

- 3, 4, 5 or 6+ Scatters on the first drop of a spin award **10, 12, 15 or 20 free spins**.
  The triggering spin finishes its cascades first.
- Every triggering Scatter haunts its tile (x2, or one step up if it was already haunted).
- During free spins haunted tiles and their multipliers **stay for the whole ride**, and
  Platform Signs land more often.
- 3, 4, 5 or 6+ Scatters on the first drop of a free spin add **5, 7, 10 or 12** spins,
  up to 40 free spins in one bonus.
- Free spins are played at the bet of the triggering spin.

## Express Ticket (bonus buy)

Where the operator allows it, the player can pay 100x the bet for a spin that is guaranteed to
land at least 3 Scatters. The result is drawn exactly like a naturally triggered bonus, so the
theoretical return is the same as the game's.

## Maximum win

The most a single paid round can win is **10,000x the bet**. When a round reaches it, the round
ends immediately and the maximum is paid; remaining free spins are forfeited.

## General

- Malfunction voids all pays and plays.
- A round is decided and settled on the game server before any animation is shown. If the game
  is interrupted, the unfinished round is shown again the next time the game is opened and is
  listed in the game history.
- Turbo, skipping animations and autoplay never change results.
- The return to player (RTP) is a long-term theoretical average and is not a prediction for any
  single session.
