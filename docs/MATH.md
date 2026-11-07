# LAST STOP — Mathematical Model

All numbers live in `src/config/`. Change them, then re-run `npm test` and `npm run simulate`.

> **RTP status: development estimate, not certified.** The development target is ~96%. The figures below are simulation output, not a verified or certified RTP.

## Credits

- Credits are stored internally as integers in hundredths (`CREDIT_SCALE = 100`), so payouts never accumulate floating-point drift.
- Each cluster pays `round(pay[symbol][size] × bet)` in hundredths.
- `GameEngine.spin()` debits once; `GameEngine.settle(id)` credits once and is idempotent (a second call does nothing).
- Max win per paid spin (base + bonus): **5,000× bet** (`gameConfig.maxWinMultiplier`). Once reached, the round and bonus stop.

## Randomness

- **Normal play:** `CryptoRNG` uses `crypto.getRandomValues`, 53-bit floats, and rejection sampling for integers (no modulo bias).
- **Development / tests / replays / simulation only:** `SeededRNG` (sfc32). Selected explicitly; it is never the default.
- Every cell is drawn independently from the active weight table. Nothing depends on previous results, bet size or balance.

## Symbol distributions (weight and per-cell probability)

- `baseInitial`: the 30 symbols revealed by a base-game spin
- `baseRefill`: symbols that drop in during base-game cascades (no specials except a rare Wild)
- `freeInitial` / `freeRefill`: the same for free spins
- `conversion`: what a Platform Sign or Ticket Punch turns into after activating

| Symbol | baseInitial | baseRefill | freeInitial | freeRefill | conversion |
|---|---:|---:|---:|---:|---:|
| Subway Token | 340 (22.85%) | 340 (23.68%) | 340 (18.76%) | 340 (23.40%) | 340 (23.78%) |
| Ticket Stub | 300 (20.16%) | 300 (20.89%) | 300 (16.56%) | 300 (20.65%) | 300 (20.98%) |
| Station Lantern | 250 (16.80%) | 250 (17.41%) | 250 (13.80%) | 250 (17.21%) | 250 (17.48%) |
| Rusted Key | 190 (12.77%) | 190 (13.23%) | 190 (10.49%) | 190 (13.08%) | 190 (13.29%) |
| Pocket Watch | 150 (10.08%) | 150 (10.45%) | 150 (8.28%) | 150 (10.32%) | 150 (10.49%) |
| Ghost Pigeon | 90 (6.05%) | 90 (6.27%) | 95 (5.24%) | 95 (6.54%) | 90 (6.29%) |
| Phantom Passenger | 65 (4.37%) | 65 (4.53%) | 70 (3.86%) | 70 (4.82%) | 65 (4.55%) |
| Tunnel Rat King | 45 (3.02%) | 45 (3.13%) | 50 (2.76%) | 50 (3.44%) | 45 (3.15%) |
| Conductor Graves Wild | 8 (0.54%) | 6 (0.42%) | 16 (0.88%) | 8 (0.55%) | – |
| Midnight Train Scatter | 18 (1.21%) | – | 11 (0.61%) | – | – |
| Haunted Platform Sign | 18 (1.21%) | – | 230 (12.69%) | – | – |
| Ticket Punch | 14 (0.94%) | – | 110 (6.07%) | – | – |

## Paytable (multiples of total bet)

`pay = SIZE_CURVE[size] × SYMBOL_BASE[symbol] × GLOBAL_SCALE`, with `GLOBAL_SCALE = 11` (`src/config/paytable.ts`). Clusters of 20+ pay the 20 value.

| Symbol | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20+ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Subway Token | 0.66 | 0.92 | 1.32 | 1.85 | 2.51 | 3.3 | 4.29 | 5.61 | 7.26 | 9.24 | 11.88 | 15.18 | 19.8 | 26.4 | 36.3 | 49.5 |
| Ticket Stub | 0.88 | 1.23 | 1.76 | 2.46 | 3.34 | 4.4 | 5.72 | 7.48 | 9.68 | 12.32 | 15.84 | 20.24 | 26.4 | 35.2 | 48.4 | 66 |
| Station Lantern | 1.1 | 1.54 | 2.2 | 3.08 | 4.18 | 5.5 | 7.15 | 9.35 | 12.1 | 15.4 | 19.8 | 25.3 | 33 | 44 | 60.5 | 82.5 |
| Rusted Key | 1.32 | 1.85 | 2.64 | 3.7 | 5.02 | 6.6 | 8.58 | 11.22 | 14.52 | 18.48 | 23.76 | 30.36 | 39.6 | 52.8 | 72.6 | 99 |
| Pocket Watch | 1.65 | 2.31 | 3.3 | 4.62 | 6.27 | 8.25 | 10.73 | 14.02 | 18.15 | 23.1 | 29.7 | 37.95 | 49.5 | 66 | 90.75 | 123.75 |
| Ghost Pigeon | 2.75 | 3.85 | 5.5 | 7.7 | 10.45 | 13.75 | 17.88 | 23.38 | 30.25 | 38.5 | 49.5 | 63.25 | 82.5 | 110 | 151.25 | 206.25 |
| Phantom Passenger | 4.4 | 6.16 | 8.8 | 12.32 | 16.72 | 22 | 28.6 | 37.4 | 48.4 | 61.6 | 79.2 | 101.2 | 132 | 176 | 242 | 330 |
| Tunnel Rat King | 6.6 | 9.24 | 13.2 | 18.48 | 25.08 | 33 | 42.9 | 56.1 | 72.6 | 92.4 | 118.8 | 151.8 | 198 | 264 | 363 | 495 |

## Feature rules (as implemented)

**Order inside a round** (`src/engine/RoundResolver.ts`): reveal → count scatters → Platform Signs → Ticket Punches → haunted upgrades → [evaluate → pay → remove → gravity/refill → haunted upgrades on landed tiles] until no win, 60 cascades, or the max-win cap.

**Cluster evaluation** (`ClusterEvaluator.ts`): for each regular symbol S (in id order), flood-fill orthogonal components over cells equal to S or Wild, starting only from real S cells. A component of size ≥ 5 is a cluster. Wilds may belong to several clusters; each pays. Removal uses the union of positions.

**Phantom Platforms** (`features/PhantomPlatforms.ts`)
- A sign haunts its tile if fewer than the cap are haunted (base 6, free spins 15), then converts via `conversion`.
- A regular symbol that *newly lands* on a haunted tile is redrawn from `platformUpgrades[symbol]` (it may stay the same). "Newly landed" means: the sign's own replacement, a punch's replacement, a symbol that moved or spawned into that cell in a cascade, and, in free spins, every symbol on a persistent haunted tile at the start of each free spin.
- One upgrade roll per haunted tile per step.

| From | Upgrade table (weights) |
|---|---|
| Token / Ticket | same 15, Watch 20, Pigeon 30, Passenger 15, Wild 20 |
| Lantern | same 15, Watch 15, Pigeon 30, Passenger 20, Wild 20 |
| Key | same 15, Pigeon 30, Passenger 25, Rat King 10, Wild 20 |
| Watch | same 15, Pigeon 25, Passenger 25, Rat King 15, Wild 20 |
| Pigeon | same 35, Passenger 25, Rat King 15, Wild 25 |
| Passenger | same 45, Rat King 25, Wild 30 |
| Rat King | same 65, Wild 35 |

**Ticket Punch** (`features/TicketPunch.ts`): punches resolve in ascending cell order. Target weight for each regular symbol = `1 + 1.5 × (orthogonal neighbours with the same symbol or Wild)`. The target becomes a Wild; the punch converts via `conversion`. Refill tables contain no punches, so there is no recursion.

**Midnight Train** (`features/MidnightTrain.ts`): 3/4/5+ scatters → 8/10/12 spins. A free spin with 3+ scatters adds 4 spins. Total spins are capped at 60. Haunted tiles persist (cap 15). The whole bonus is resolved inside `spin()` before any animation.

## Simulation

```
npm run simulate                              # 1M spins, seeded "last-stop"
npm run simulate -- --rounds 5000000 --seed doc-5m
npm run simulate -- --crypto                  # production RNG
```

Speed: about 120,000 paid spins per second on one core (Node 22).

### Latest results (bet 10, 5,000,000 paid spins, seed `doc-5m`)

```
LAST STOP simulation — 5,000,000 paid spins (seeded RNG, 40.0s)
Observed RTP ........ 96.86%  (±0.53% at 95%)  [development estimate, not certified]
  base game ......... 58.48%
  Midnight Train .... 38.38%
Hit frequency ....... 34.03%  (1 in 2.94)
Bonus frequency ..... 0.57%  (1 in 175)
Avg bonus payout .... 67.24x bet
Max observed win .... 461.49x bet   (max-win cap hits: 0)
Std deviation ....... 6.00x bet per spin
Platform signs/spin . 0.542   punches/spin 0.368   upgrades/spin 1.021
Avg cascades on win . 1.27   (longest 15)

Win distribution (per paid spin):
  bucket         share of spins   share of RTP
  0x                 65.97%          0.00%
  0x - 1x            12.23%          9.96%
  1x - 2x            12.20%         18.41%
  2x - 5x             8.00%         24.64%
  5x - 15x            1.04%          7.12%
  15x - 50x           0.22%          7.65%
  50x - 200x          0.34%         30.77%
  200x - 1000x        0.01%          1.46%
  1000x +             0.00%          0.00%
```

Other runs of 1,000,000 spins: seeded `last-stop` gave 95.16%, CryptoRNG gave 95.48%. The spread between runs comes mostly from the bonus (about 38% of RTP, ~1 in 175 spins), so treat the RTP as **roughly 95–97%** until much longer runs or an analytic evaluation are done.

### Reading the report

- **Hit frequency**: share of paid spins with any win (including the bonus).
- **Bonus frequency / avg bonus payout**: how often the Midnight Train starts and its mean total win in multiples of bet.
- **Std deviation**: standard deviation of the per-spin win multiple. The ± figure is the 95% confidence half-width of the RTP estimate.
- **Distribution**: share of spins and share of total return by win-size bucket.

## Tuning notes

- `GLOBAL_SCALE` scales all cluster pays linearly. With the cap rarely reached, RTP scales roughly linearly too.
- The Scatter weight in `baseInitial` sets bonus frequency. The Sign and Punch weights in `freeInitial` set bonus richness.
- After any change, run at least 5M spins and keep the tests green.
