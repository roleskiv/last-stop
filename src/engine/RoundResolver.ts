import { gameConfig } from '../config/gameConfig';
import { featureConfig, reelWeights } from '../config/featureConfig';
import { Sym, type SymbolId } from '../config/symbols';
import { activateSigns, applyUpgrades } from '../features/PhantomPlatforms';
import { resolvePunches } from '../features/TicketPunch';
import { cascade } from './CascadeResolver';
import { findClusters, winningPositions } from './ClusterEvaluator';
import { assertValidGrid, cloneGrid } from './Grid';
import { generateGrid, gridFromSymbols, IdSource, WeightedPicker } from './OutcomeGenerator';
import type { RNG } from './RNG';
import type { RoundEvent, RoundMode, RoundResult } from './types';

export const pickers = {
  baseInitial: new WeightedPicker(reelWeights.baseInitial),
  baseRefill: new WeightedPicker(reelWeights.baseRefill),
  freeInitial: new WeightedPicker(reelWeights.freeInitial),
  freeRefill: new WeightedPicker(reelWeights.freeRefill),
  conversion: new WeightedPicker(reelWeights.conversion),
};

export interface RoundContext {
  mode: RoundMode;
  /** Bet in centi-credits. */
  bet: number;
  /** Haunted tiles carried into this round (free spins). Mutated in place. */
  haunted: Set<number>;
  /** Remaining win allowed before the max-win cap, centi-credits. */
  winCapRemaining: number;
  /** Development only: force the initial 30 symbols. */
  forcedGrid?: SymbolId[];
  /** Validate grid integrity after every step (tests / dev). */
  validate?: boolean;
}

/**
 * Resolves one complete round (a base spin or a single free spin) and returns
 * every event in presentation order. Pure with respect to the RNG: the same
 * seed and context always yield the same result.
 *
 * Order of operations:
 *  1. Reveal the initial grid.
 *  2. Count scatters (only the initial grid counts).
 *  3. Haunted Platform Signs activate, then convert to regular symbols.
 *  4. Ticket Punches resolve, then convert to regular symbols.
 *  5. Haunted tiles upgrade newly landed regular symbols (free spins: every
 *     symbol on a persistent haunted tile counts as landed).
 *  6. Evaluate clusters -> pay -> remove -> gravity + refill -> upgrades on
 *     newly landed haunted tiles -> repeat until no win (or guard / cap).
 */
export function resolveRound(rng: RNG, ctx: RoundContext): RoundResult {
  const isFree = ctx.mode === 'free';
  const initial = isFree ? pickers.freeInitial : pickers.baseInitial;
  const refill = isFree ? pickers.freeRefill : pickers.baseRefill;
  const cap = isFree ? featureConfig.phantomPlatforms.freeSpinsCap : featureConfig.phantomPlatforms.baseCap;
  const ids = new IdSource();
  const events: RoundEvent[] = [];
  const haunted = ctx.haunted;
  const hauntedStart = [...haunted].sort((a, b) => a - b);

  let grid = ctx.forcedGrid ? gridFromSymbols(ctx.forcedGrid, ids) : generateGrid(rng, initial, ids);
  events.push({ t: 'reveal', grid: cloneGrid(grid) });

  const scatterPositions: number[] = [];
  for (let i = 0; i < grid.length; i++) if (grid[i].sym === Sym.SCATTER) scatterPositions.push(i);
  if (scatterPositions.length > 0) events.push({ t: 'scatters', positions: scatterPositions });

  const landed = new Set<number>(isFree ? haunted : []);
  activateSigns(grid, haunted, cap, rng, pickers.conversion, ids, events, landed);
  resolvePunches(grid, rng, pickers.conversion, ids, events, landed);
  applyUpgrades(grid, haunted, landed, rng, events);
  if (ctx.validate) assertValidGrid(grid);

  let win = 0;
  let cascades = 0;
  let hitMaxWin = false;
  while (cascades < gameConfig.maxCascades) {
    const clusters = findClusters(grid, ctx.bet);
    if (clusters.length === 0) break;
    let stepWin = 0;
    for (const c of clusters) stepWin += c.payout;
    if (win + stepWin >= ctx.winCapRemaining) {
      stepWin = Math.max(0, ctx.winCapRemaining - win);
      win += stepWin;
      events.push({ t: 'win', clusters, stepWin, roundWin: win });
      events.push({ t: 'maxWin' });
      hitMaxWin = true;
      break;
    }
    win += stepWin;
    events.push({ t: 'win', clusters, stepWin, roundWin: win });
    const removed = winningPositions(clusters);
    const res = cascade(grid, removed, rng, refill, ids);
    grid = res.grid;
    cascades++;
    events.push({ t: 'cascade', removed, grid: cloneGrid(grid), landed: res.landed });
    applyUpgrades(grid, haunted, res.landed, rng, events);
    if (ctx.validate) assertValidGrid(grid);
  }

  events.push({ t: 'end', roundWin: win, grid: cloneGrid(grid) });
  return {
    mode: ctx.mode,
    bet: ctx.bet,
    events,
    win,
    scatterCount: scatterPositions.length,
    cascades,
    hauntedStart,
    hauntedEnd: [...haunted].sort((a, b) => a - b),
    hitMaxWin,
  };
}
