import type { MathConfig } from './config.ts';
import type { Rng } from './rng.ts';
import { CELLS, COLS, PAYING_COUNT, PUNCH, ROWS, SCATTER, SIGN, WILD } from './symbols.ts';
import type { ClusterWin, RoundMode, RoundRecord, RoundSummary, SpinRecord, Step, TileState } from './types.ts';

/**
 * LAST STOP game engine.
 *
 * One instance resolves complete rounds for one math variant. The same code path is
 * used by the game server, the in-browser demo and the simulator: simulation simply
 * turns recording off. Outcomes depend only on the configuration and on the numbers
 * drawn from the RNG. Bet size, balance and history are never inputs.
 *
 * Order of play for every drop (the first drop of a spin and each cascade refill):
 *   1. Platform Signs haunt their tile and flip to a regular symbol.
 *   2. Ticket Punches become Wilds and punch further symbols into Wilds.
 *   3. Clusters of 5+ are paid. Platforms under a winning cluster multiply it,
 *      then step up their ladder.
 *   4. Winning symbols are removed, the rest fall, new symbols drop in. Repeat.
 */
export class Engine {
  readonly cfg: MathConfig;
  private readonly lutBaseInitial: Uint8Array;
  private readonly lutBaseRefill: Uint8Array;
  private readonly lutFreeInitial: Uint8Array;
  private readonly lutFreeRefill: Uint8Array;
  private readonly lutSignFlip: Uint8Array;
  private readonly lutPunchExtra: Uint8Array;
  private readonly maxWinCoins: number;
  private readonly topLadder: number;

  private readonly g = new Uint8Array(CELLS);
  /** Ladder index of the platform on each cell, -1 when the cell is not haunted. */
  private readonly tile = new Int8Array(CELLS);
  private readonly stack = new Uint8Array(CELLS);
  private readonly cand = new Uint8Array(CELLS);
  private rng!: Rng;
  private roundCoins = 0;
  private capped = false;

  readonly summary: RoundSummary = {
    coins: 0, baseCoins: 0, bonusCoins: 0, triggered: false, triggerScatters: 0, freeSpins: 0,
    capped: false, cascades: 0, signs: 0, punches: 0, maxTileMult: 0, maxClusterCoins: 0,
  };

  constructor(cfg: MathConfig) {
    this.cfg = cfg;
    this.lutBaseInitial = buildLut(cfg.weights.baseInitial);
    this.lutBaseRefill = buildLut(cfg.weights.baseRefill);
    this.lutFreeInitial = buildLut(cfg.weights.freeInitial);
    this.lutFreeRefill = buildLut(cfg.weights.freeRefill);
    this.lutSignFlip = buildLut(cfg.weights.signFlip);
    this.lutPunchExtra = buildLut(cfg.punchExtra);
    this.maxWinCoins = cfg.maxWinBets * cfg.coinsPerBet;
    this.topLadder = cfg.ladder.length - 1;
  }

  /** Resolve one paid round and return the full record the client animates. */
  play(rng: Rng, mode: RoundMode = 'spin'): RoundRecord {
    const rec: RoundRecord = {
      mathId: this.cfg.id, mode, base: null as unknown as SpinRecord, free: [],
      coins: 0, baseCoins: 0, bonusCoins: 0, capped: false,
    };
    this.run(rng, mode, rec);
    return rec;
  }

  /** Resolve one paid round without recording. Returns a summary object that is reused. */
  simulate(rng: Rng, mode: RoundMode = 'spin'): RoundSummary {
    this.run(rng, mode, null);
    return this.summary;
  }

  private run(rng: Rng, mode: RoundMode, rec: RoundRecord | null): void {
    const s = this.summary;
    this.rng = rng;
    this.roundCoins = 0;
    this.capped = false;
    s.cascades = 0; s.signs = 0; s.punches = 0; s.maxTileMult = 0; s.maxClusterCoins = 0;
    this.tile.fill(-1);

    // First drop. A bought bonus is the first natural drop that shows 3+ Scatters,
    // so its outcomes have exactly the distribution of a naturally triggered bonus.
    let scatters = this.drop(this.lutBaseInitial);
    if (mode === 'buy') while (scatters < 3) scatters = this.drop(this.lutBaseInitial);

    const base = this.resolveSpin(false, rec !== null);
    const baseCoins = this.roundCoins;
    let freeSpins = 0;

    if (scatters >= 3 && !this.capped) {
      const fs = this.cfg.freeSpins;
      let left = fs[Math.min(scatters, fs.length - 1)];
      let total = left;
      if (base) base.awarded = left;
      this.hauntScatters();
      while (left > 0 && !this.capped) {
        left--;
        freeSpins++;
        const k = this.drop(this.lutFreeInitial);
        const spin = this.resolveSpin(true, rec !== null);
        if (k >= 3 && !this.capped) {
          const rt = this.cfg.retrigger;
          const add = Math.min(rt[Math.min(k, rt.length - 1)], this.cfg.maxFreeSpins - total);
          left += add;
          total += add;
          if (spin) spin.awarded = add;
          this.hauntScatters();
        }
        if (rec && spin) rec.free.push(spin);
      }
    }

    s.coins = this.roundCoins;
    s.baseCoins = Math.min(baseCoins, this.roundCoins);
    s.bonusCoins = this.roundCoins - s.baseCoins;
    s.triggered = scatters >= 3;
    s.triggerScatters = scatters;
    s.freeSpins = freeSpins;
    s.capped = this.capped;
    if (rec) {
      rec.base = base!;
      rec.coins = s.coins;
      rec.baseCoins = s.baseCoins;
      rec.bonusCoins = s.bonusCoins;
      rec.capped = s.capped;
    }
  }

  /** Fill the board from a weight table. Returns the number of Scatters that landed. */
  private drop(lut: Uint8Array): number {
    const g = this.g;
    const n = lut.length;
    let scatters = 0;
    for (let i = 0; i < CELLS; i++) {
      const sym = lut[this.rng.below(n)];
      g[i] = sym;
      if (sym === SCATTER) scatters++;
    }
    return scatters;
  }

  /** Scatters that award free spins haunt the tile they stand on. */
  private hauntScatters(): void {
    const g = this.g, tile = this.tile;
    for (let i = 0; i < CELLS; i++) {
      if (g[i] === SCATTER) tile[i] = tile[i] < 0 ? 0 : Math.min(tile[i] + 1, this.topLadder);
    }
  }

  private tiles(): TileState[] {
    const out: TileState[] = [];
    for (let i = 0; i < CELLS; i++) if (this.tile[i] >= 0) out.push({ pos: i, mult: this.cfg.ladder[this.tile[i]] });
    return out;
  }

  private resolveSpin(isFree: boolean, record: boolean): SpinRecord | null {
    const g = this.g, tile = this.tile, s = this.summary, cfg = this.cfg, rng = this.rng;
    const ladder = cfg.ladder, pay = cfg.pay, maxSize = cfg.maxPaySize;
    const refill = isFree ? this.lutFreeRefill : this.lutBaseRefill;
    const refillN = refill.length;
    if (!isFree) tile.fill(-1);

    const spin: SpinRecord | null = record
      ? { grid: Array.from(g), tilesStart: this.tiles(), steps: [], coins: 0, scatters: [], awarded: 0 }
      : null;
    const steps: Step[] | null = spin ? spin.steps : null;
    let spinCoins = 0;

    for (;;) {
      // 1. Platform Signs
      let signRec: { pos: number; becomes: number; mult: number }[] | null = null;
      for (let i = 0; i < CELLS; i++) {
        if (g[i] !== SIGN) continue;
        const idx = tile[i] < 0 ? 0 : Math.min(tile[i] + 1, this.topLadder);
        tile[i] = idx;
        const becomes = this.lutSignFlip[rng.below(this.lutSignFlip.length)];
        g[i] = becomes;
        s.signs++;
        if (steps) (signRec ??= []).push({ pos: i, becomes, mult: ladder[idx] });
      }
      if (steps && signRec) steps.push({ t: 'signs', signs: signRec });

      // 2. Ticket Punches
      let punchRec: { pos: number; targets: number[] }[] | null = null;
      for (let i = 0; i < CELLS; i++) {
        if (g[i] !== PUNCH) continue;
        g[i] = WILD;
        s.punches++;
        const extra = this.lutPunchExtra[rng.below(this.lutPunchExtra.length)];
        const cand = this.cand;
        let n = 0;
        for (let j = 0; j < CELLS; j++) if (g[j] < PAYING_COUNT) cand[n++] = j;
        const targets: number[] | null = steps ? [] : null;
        for (let e = 0; e < extra && n > 0; e++) {
          const pick = rng.below(n);
          const pos = cand[pick];
          cand[pick] = cand[--n];
          g[pos] = WILD;
          if (targets) targets.push(pos);
        }
        if (steps) (punchRec ??= []).push({ pos: i, targets: targets! });
      }
      if (steps && punchRec) steps.push({ t: 'punch', punches: punchRec });

      // 3. Clusters
      let wilds = 0;
      const counts = COUNTS;
      counts.fill(0);
      for (let i = 0; i < CELLS; i++) {
        const sym = g[i];
        if (sym < PAYING_COUNT) counts[sym]++;
        else if (sym === WILD) wilds++;
      }
      let removeMask = 0;
      let stepCoins = 0;
      let clusters: ClusterWin[] | null = null;
      for (let sym = 0; sym < PAYING_COUNT; sym++) {
        if (counts[sym] === 0 || counts[sym] + wilds < 5) continue;
        let visited = 0;
        for (let start = 0; start < CELLS; start++) {
          if (g[start] !== sym || (visited & (1 << start)) !== 0) continue;
          // Flood fill over orthogonal neighbours that hold this symbol or a Wild.
          const stack = this.stack;
          let sp = 0, mask = 0, size = 0;
          stack[sp++] = start;
          visited |= 1 << start;
          while (sp > 0) {
            const p = stack[--sp];
            mask |= 1 << p;
            size++;
            const row = p % ROWS;
            if (row > 0) { const q = p - 1; if ((visited & (1 << q)) === 0 && (g[q] === sym || g[q] === WILD)) { visited |= 1 << q; stack[sp++] = q; } }
            if (row < ROWS - 1) { const q = p + 1; if ((visited & (1 << q)) === 0 && (g[q] === sym || g[q] === WILD)) { visited |= 1 << q; stack[sp++] = q; } }
            if (p >= ROWS) { const q = p - ROWS; if ((visited & (1 << q)) === 0 && (g[q] === sym || g[q] === WILD)) { visited |= 1 << q; stack[sp++] = q; } }
            if (p < CELLS - ROWS) { const q = p + ROWS; if ((visited & (1 << q)) === 0 && (g[q] === sym || g[q] === WILD)) { visited |= 1 << q; stack[sp++] = q; } }
          }
          if (size < 5) continue;
          let mult = 0;
          for (let p = 0; p < CELLS; p++) if ((mask & (1 << p)) !== 0 && tile[p] >= 0) mult += ladder[tile[p]];
          if (mult === 0) mult = 1;
          const coins = pay[sym][size > maxSize ? maxSize : size] * mult;
          stepCoins += coins;
          removeMask |= mask;
          if (coins > s.maxClusterCoins) s.maxClusterCoins = coins;
          if (steps) {
            const cells: number[] = [];
            for (let p = 0; p < CELLS; p++) if ((mask & (1 << p)) !== 0) cells.push(p);
            (clusters ??= []).push({ sym, cells, mult, coins });
          }
        }
      }
      if (removeMask === 0) break;

      // Platforms under a win step up their ladder.
      let tileRec: TileState[] | null = steps ? [] : null;
      for (let p = 0; p < CELLS; p++) {
        if ((removeMask & (1 << p)) !== 0 && tile[p] >= 0) {
          if (tile[p] < this.topLadder) tile[p]++;
          const m = ladder[tile[p]];
          if (m > s.maxTileMult) s.maxTileMult = m;
          if (tileRec) tileRec.push({ pos: p, mult: m });
        }
      }

      spinCoins += stepCoins;
      this.roundCoins += stepCoins;
      if (steps) steps.push({ t: 'win', clusters: clusters!, coins: stepCoins, tiles: tileRec! });
      if (this.roundCoins >= this.maxWinCoins) {
        spinCoins -= this.roundCoins - this.maxWinCoins;
        this.roundCoins = this.maxWinCoins;
        this.capped = true;
        break;
      }

      // 4. Remove, fall, refill. New symbols are drawn bottom-up within a column, left to right.
      s.cascades++;
      for (let c = 0; c < COLS; c++) {
        const top = c * ROWS;
        let write = top + ROWS - 1;
        for (let p = top + ROWS - 1; p >= top; p--) {
          if ((removeMask & (1 << p)) === 0) g[write--] = g[p];
        }
        for (; write >= top; write--) g[write] = refill[rng.below(refillN)];
      }
      if (steps) {
        const removed: number[] = [];
        for (let p = 0; p < CELLS; p++) if ((removeMask & (1 << p)) !== 0) removed.push(p);
        steps.push({ t: 'cascade', removed, grid: Array.from(g) });
      }
    }

    if (spin) {
      spin.coins = spinCoins;
      for (let i = 0; i < CELLS; i++) if (g[i] === SCATTER) spin.scatters.push(i);
    }
    return spin;
  }
}

const COUNTS = new Uint8Array(PAYING_COUNT);

function buildLut(weights: number[]): Uint8Array {
  const total = weights.reduce((a, b) => a + b, 0);
  const lut = new Uint8Array(total);
  let k = 0;
  weights.forEach((w, sym) => { for (let i = 0; i < w; i++) lut[k++] = sym; });
  return lut;
}
