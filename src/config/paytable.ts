import { Sym, type SymbolId, REGULAR_SYMBOLS } from './symbols';

/**
 * Cluster paytable, expressed as multiples of the total bet.
 *
 * PAYTABLE[symbol][size - MIN_SIZE] gives the pay for a cluster of `size`.
 * Clusters at or above MAX_SIZE pay the last entry.
 *
 * The table is built from a shared size curve times a per-symbol value so it
 * is easy to retune; the generated numbers are what the engine uses and what
 * the in-game paytable displays.
 */
export const MIN_SIZE = 5;
export const MAX_SIZE = 20;

/** Relative growth of a cluster's value with size (5 .. 20+). */
export const SIZE_CURVE = [1, 1.4, 2, 2.8, 3.8, 5, 6.5, 8.5, 11, 14, 18, 23, 30, 40, 55, 75] as const;

/** Value of a 5-cluster for each regular symbol, before GLOBAL_SCALE. */
export const SYMBOL_BASE: Record<number, number> = {
  [Sym.TOKEN]: 0.06,
  [Sym.TICKET]: 0.08,
  [Sym.LANTERN]: 0.1,
  [Sym.KEY]: 0.12,
  [Sym.WATCH]: 0.15,
  [Sym.PIGEON]: 0.25,
  [Sym.PASSENGER]: 0.4,
  [Sym.RAT_KING]: 0.6,
};

/** Single tuning knob used to bring the simulated RTP to the development target. */
export const GLOBAL_SCALE = 11;

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export const PAYTABLE: Record<number, number[]> = Object.fromEntries(
  REGULAR_SYMBOLS.map((s) => [s, SIZE_CURVE.map((c) => round2(c * SYMBOL_BASE[s] * GLOBAL_SCALE))]),
);

export function clusterPay(sym: SymbolId, size: number): number {
  if (size < MIN_SIZE) return 0;
  const row = PAYTABLE[sym];
  if (!row) return 0;
  return row[Math.min(size, MAX_SIZE) - MIN_SIZE];
}
