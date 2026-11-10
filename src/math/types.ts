/** Round records: the complete, replayable description of one paid round. */

export interface ClusterWin {
  sym: number;
  cells: number[];
  /** Sum of the Phantom Platform multipliers under the cluster (1 when there are none). */
  mult: number;
  /** Coins won by this cluster, multiplier included. */
  coins: number;
}

export interface TileState { pos: number; mult: number }

export type Step =
  /** Platform Signs haunt their tile (or raise its multiplier) and flip to a regular symbol. */
  | { t: 'signs'; signs: { pos: number; becomes: number; mult: number }[] }
  /** Ticket Punches turn into Wilds and punch further symbols into Wilds. */
  | { t: 'punch'; punches: { pos: number; targets: number[] }[] }
  /** Clusters pay. `tiles` lists the platforms that took part, with their multiplier after the win. */
  | { t: 'win'; clusters: ClusterWin[]; coins: number; tiles: TileState[] }
  /** Winning symbols leave, the rest fall, new ones drop in. `grid` is the board afterwards. */
  | { t: 'cascade'; removed: number[]; grid: number[] };

export interface SpinRecord {
  /** The 30 symbols that land, column-major. */
  grid: number[];
  /** Phantom Platforms active when the spin starts. */
  tilesStart: TileState[];
  steps: Step[];
  coins: number;
  /** Positions of Scatters when the spin has finished cascading. */
  scatters: number[];
  /** Free spins awarded by this spin (trigger or retrigger), 0 if none. */
  awarded: number;
}

export type RoundMode = 'spin' | 'buy';

export interface RoundRecord {
  mathId: string;
  mode: RoundMode;
  base: SpinRecord;
  free: SpinRecord[];
  /** Total coins won, after the max-win cap. One bet is `coinsPerBet` coins. */
  coins: number;
  baseCoins: number;
  bonusCoins: number;
  /** True when the round was stopped at the maximum win. */
  capped: boolean;
}

/** Lightweight result used by simulation. The object is reused between rounds. */
export interface RoundSummary {
  coins: number;
  baseCoins: number;
  bonusCoins: number;
  triggered: boolean;
  triggerScatters: number;
  freeSpins: number;
  capped: boolean;
  cascades: number;
  signs: number;
  punches: number;
  maxTileMult: number;
  maxClusterCoins: number;
}
