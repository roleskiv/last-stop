import { Sym, type SymbolId } from './symbols';

export type WeightTable = ReadonlyArray<readonly [SymbolId, number]>;

/**
 * Symbol probability distributions. Every cell is drawn independently from
 * the relevant table; the probability of a symbol is weight / sum(weights).
 * See docs/MATH.md for the resulting per-cell probabilities.
 */
export const reelWeights = {
  /** Base game, initial 30 symbols of a spin. */
  baseInitial: [
    [Sym.TOKEN, 340], [Sym.TICKET, 300], [Sym.LANTERN, 250], [Sym.KEY, 190], [Sym.WATCH, 150],
    [Sym.PIGEON, 90], [Sym.PASSENGER, 65], [Sym.RAT_KING, 45],
    [Sym.WILD, 8], [Sym.SCATTER, 18], [Sym.SIGN, 18], [Sym.PUNCH, 14],
  ] as WeightTable,
  /** Symbols that drop in during cascades (base game). No specials besides a rare Wild. */
  baseRefill: [
    [Sym.TOKEN, 340], [Sym.TICKET, 300], [Sym.LANTERN, 250], [Sym.KEY, 190], [Sym.WATCH, 150],
    [Sym.PIGEON, 90], [Sym.PASSENGER, 65], [Sym.RAT_KING, 45],
    [Sym.WILD, 6],
  ] as WeightTable,
  /** Free spins, initial grid of each free spin. More signs and punches, fewer scatters. */
  freeInitial: [
    [Sym.TOKEN, 340], [Sym.TICKET, 300], [Sym.LANTERN, 250], [Sym.KEY, 190], [Sym.WATCH, 150],
    [Sym.PIGEON, 95], [Sym.PASSENGER, 70], [Sym.RAT_KING, 50],
    [Sym.WILD, 16], [Sym.SCATTER, 11], [Sym.SIGN, 230], [Sym.PUNCH, 110],
  ] as WeightTable,
  freeRefill: [
    [Sym.TOKEN, 340], [Sym.TICKET, 300], [Sym.LANTERN, 250], [Sym.KEY, 190], [Sym.WATCH, 150],
    [Sym.PIGEON, 95], [Sym.PASSENGER, 70], [Sym.RAT_KING, 50],
    [Sym.WILD, 8],
  ] as WeightTable,
  /** What a Platform Sign or Ticket Punch turns into after it activates. */
  conversion: [
    [Sym.TOKEN, 340], [Sym.TICKET, 300], [Sym.LANTERN, 250], [Sym.KEY, 190], [Sym.WATCH, 150],
    [Sym.PIGEON, 90], [Sym.PASSENGER, 65], [Sym.RAT_KING, 45],
  ] as WeightTable,
} as const;

/**
 * Phantom Platforms upgrade table. When a regular symbol newly lands on a
 * haunted tile it is replaced by a draw from its row (it may stay the same).
 */
export const platformUpgrades: Record<number, WeightTable> = {
  [Sym.TOKEN]: [[Sym.TOKEN, 15], [Sym.WATCH, 20], [Sym.PIGEON, 30], [Sym.PASSENGER, 15], [Sym.WILD, 20]],
  [Sym.TICKET]: [[Sym.TICKET, 15], [Sym.WATCH, 20], [Sym.PIGEON, 30], [Sym.PASSENGER, 15], [Sym.WILD, 20]],
  [Sym.LANTERN]: [[Sym.LANTERN, 15], [Sym.WATCH, 15], [Sym.PIGEON, 30], [Sym.PASSENGER, 20], [Sym.WILD, 20]],
  [Sym.KEY]: [[Sym.KEY, 15], [Sym.PIGEON, 30], [Sym.PASSENGER, 25], [Sym.RAT_KING, 10], [Sym.WILD, 20]],
  [Sym.WATCH]: [[Sym.WATCH, 15], [Sym.PIGEON, 25], [Sym.PASSENGER, 25], [Sym.RAT_KING, 15], [Sym.WILD, 20]],
  [Sym.PIGEON]: [[Sym.PIGEON, 35], [Sym.PASSENGER, 25], [Sym.RAT_KING, 15], [Sym.WILD, 25]],
  [Sym.PASSENGER]: [[Sym.PASSENGER, 45], [Sym.RAT_KING, 25], [Sym.WILD, 30]],
  [Sym.RAT_KING]: [[Sym.RAT_KING, 65], [Sym.WILD, 35]],
};

export const featureConfig = {
  phantomPlatforms: {
    /** Max haunted tiles at once during a base-game spin. */
    baseCap: 6,
    /** Max persistent haunted tiles during the Midnight Train bonus. */
    freeSpinsCap: 15,
  },
  ticketPunch: {
    /** Every regular symbol starts with this weight as a punch target. */
    baseTargetWeight: 1,
    /** Extra weight per orthogonal neighbour sharing the target's symbol. */
    neighbourBonus: 1.5,
  },
  midnightTrain: {
    triggerCount: 3,
    /** scatters -> free spins. 5+ uses the last entry. */
    awards: { 3: 8, 4: 10, 5: 12 } as Record<number, number>,
    retriggerCount: 3,
    retriggerSpins: 4,
    /** Safety guard on the total free spins one bonus can play. */
    maxTotalSpins: 60,
  },
} as const;

export function freeSpinsFor(scatters: number): number {
  const mt = featureConfig.midnightTrain;
  if (scatters < mt.triggerCount) return 0;
  const keys = Object.keys(mt.awards).map(Number).sort((a, b) => a - b);
  let award = 0;
  for (const k of keys) if (scatters >= k) award = mt.awards[k];
  return award;
}
