import type { SymbolId } from '../config/symbols';

/** One symbol instance on the grid. `id` is unique within a round so renderers can track movement. */
export interface Cell {
  id: number;
  sym: SymbolId;
}

/** Grid stored column-major: index = col * ROWS + row, row 0 is the top. */
export type Grid = Cell[];

export interface Cluster {
  sym: SymbolId;
  positions: number[];
  size: number;
  /** Pay in centi-credits. */
  payout: number;
}

export type RoundEvent =
  | { t: 'reveal'; grid: Grid }
  | { t: 'scatters'; positions: number[] }
  | { t: 'platform'; pos: number; haunted: boolean; became: Cell }
  | { t: 'punch'; from: number; target: number; targetBefore: SymbolId; became: Cell }
  | { t: 'upgrade'; pos: number; from: SymbolId; to: SymbolId }
  | { t: 'win'; clusters: Cluster[]; stepWin: number; roundWin: number }
  | { t: 'cascade'; removed: number[]; grid: Grid; landed: number[] }
  | { t: 'maxWin' }
  | { t: 'end'; roundWin: number; grid: Grid };

export type RoundMode = 'base' | 'free';

export interface RoundResult {
  mode: RoundMode;
  /** Bet in centi-credits. */
  bet: number;
  events: RoundEvent[];
  /** Win of this round, centi-credits. */
  win: number;
  scatterCount: number;
  cascades: number;
  hauntedStart: number[];
  hauntedEnd: number[];
  hitMaxWin: boolean;
}

export interface FreeSpinRound extends RoundResult {
  index: number;
  spinsRemaining: number;
  retriggered: number;
  bonusWinSoFar: number;
}

export interface BonusResult {
  initialSpins: number;
  totalSpins: number;
  rounds: FreeSpinRound[];
  win: number;
}

export interface SpinOutcome {
  id: number;
  /** Bet in centi-credits. */
  bet: number;
  base: RoundResult;
  bonus: BonusResult | null;
  /** Total credited for this spin (base + bonus, capped), centi-credits. */
  totalWin: number;
  balanceBefore: number;
  balanceAfterDebit: number;
  forced: boolean;
}
