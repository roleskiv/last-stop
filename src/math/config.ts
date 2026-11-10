import { PAYING_COUNT, SYMBOL_COUNT } from './symbols.ts';

/**
 * Everything that determines the game's mathematics lives in this file.
 * Nothing else in the code base contains a probability or a pay value.
 */
export interface MathConfig {
  /** Stable identifier written into every round record. */
  id: string;
  /** Design RTP of the variant, in percent. */
  targetRtp: number;
  /** One bet is this many coins. All pays are whole coins, so money is always exact. */
  coinsPerBet: number;
  /** A round stops when it reaches this many bets. */
  maxWinBets: number;
  /** pay[symbol][clusterSize] in coins. Sizes above the last column pay the last column. */
  pay: number[][];
  /** Largest cluster size with its own pay column. */
  maxPaySize: number;
  /** Symbol weights per draw context, indexed by symbol id. */
  weights: {
    baseInitial: number[];
    baseRefill: number[];
    freeInitial: number[];
    freeRefill: number[];
    /** What a Platform Sign flips into. */
    signFlip: number[];
  };
  /** Phantom Platform multiplier ladder. A new platform starts on the first value. */
  ladder: number[];
  /** Weights for the number of extra Wilds a Ticket Punch creates (index = count). */
  punchExtra: number[];
  /** Free spins awarded for n Scatters (index = n, last entry covers everything above). */
  freeSpins: number[];
  /** Extra free spins for n Scatters during the bonus. */
  retrigger: number[];
  /** Hard limit on free spins in one bonus. */
  maxFreeSpins: number;
  /** Price of the Express Ticket bonus buy, in bets. */
  buyPriceBets: number;
}

const SIZE_COLUMNS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/** Pays in coins (1 bet = 20 coins) for cluster sizes 5..15+. */
const PAY_ROWS: number[][] = [
  /* token     */ [8, 10, 12, 16, 20, 30, 40, 60, 100, 160, 300],
  /* ticket    */ [10, 12, 16, 20, 26, 40, 50, 80, 120, 200, 400],
  /* lantern   */ [12, 16, 20, 26, 32, 50, 70, 100, 160, 240, 500],
  /* key       */ [16, 20, 26, 32, 40, 60, 90, 140, 200, 320, 640],
  /* watch     */ [20, 26, 32, 40, 50, 80, 120, 180, 260, 400, 800],
  /* pigeon    */ [30, 40, 50, 70, 90, 140, 200, 300, 440, 700, 1400],
  /* passenger */ [40, 56, 72, 100, 130, 200, 300, 440, 640, 1000, 2000],
  /* ratking   */ [80, 110, 140, 200, 260, 400, 600, 900, 1300, 2000, 4000],
];

function buildPay(rows: number[][]): number[][] {
  return rows.map((row) => {
    const out = new Array<number>(SIZE_COLUMNS[SIZE_COLUMNS.length - 1] + 1).fill(0);
    SIZE_COLUMNS.forEach((size, i) => { out[size] = row[i]; });
    return out;
  });
}

// Weights per 100,000 draws. The three variants share every table except two entries:
// the Ticket Punch weight on the base-game first drop (tunes ordinary spins) and the
// Platform Sign weight on the free-spin first drop (tunes the bonus). Weight moved in or
// out of those entries is taken from the Subway Token, so the Scatter chance and with it
// the bonus frequency are identical in all variants.
//                       tok    tic    lan    key    wat    pig    pas    rat   wild   scat   sign  punch
const BASE_INITIAL = [19000, 17500, 15500, 13000, 11000,  8000,  6000,  4500,   600,  1050,  1600,  1200];
const BASE_REFILL =  [19500, 18000, 16000, 13400, 11300,  8200,  6200,  4600,   550,     0,   800,   400];
const FREE_INITIAL = [18500, 17000, 15000, 12600, 10700,  7900,  6000,  4500,   700,   900,  8000,  1200];
const FREE_REFILL =  [19300, 17800, 15800, 13200, 11200,  8200,  6200,  4600,   650,     0,  2600,   400];
const SIGN_FLIP =       [ 150,  150,  150,  150,  150,  110,   90,   50,    0,    0,    0,    0];

export interface VariantTuning {
  id: string;
  targetRtp: number;
  /** Ticket Punch weight on the base-game first drop. */
  basePunch: number;
  /** Platform Sign weight on the free-spin first drop. */
  freeSign: number;
}

/** Set one weight and balance the table total with the Subway Token. */
function withWeight(table: number[], sym: number, value: number): number[] {
  const t = [...table];
  t[0] += t[sym] - value;
  t[sym] = value;
  return t;
}

function build(t: VariantTuning): MathConfig {
  const cfg: MathConfig = {
    id: t.id,
    targetRtp: t.targetRtp,
    coinsPerBet: 20,
    maxWinBets: 10000,
    pay: buildPay(PAY_ROWS),
    maxPaySize: SIZE_COLUMNS[SIZE_COLUMNS.length - 1],
    weights: {
      baseInitial: withWeight(BASE_INITIAL, 11, t.basePunch),
      baseRefill: BASE_REFILL,
      freeInitial: withWeight(FREE_INITIAL, 10, t.freeSign),
      freeRefill: FREE_REFILL,
      signFlip: SIGN_FLIP,
    },
    ladder: [2, 4, 8, 16, 32, 64, 128],
    punchExtra: [0, 40, 40, 20],
    freeSpins: [0, 0, 0, 10, 12, 15, 20],
    retrigger: [0, 0, 0, 5, 7, 10, 12],
    maxFreeSpins: 40,
    buyPriceBets: 100,
  };
  validateConfig(cfg);
  return cfg;
}

export function validateConfig(cfg: MathConfig): void {
  const w = cfg.weights;
  for (const [name, table] of Object.entries(w)) {
    if (table.length !== SYMBOL_COUNT) throw new Error(`${cfg.id}: ${name} needs ${SYMBOL_COUNT} weights`);
    if (table.some((x) => !Number.isInteger(x) || x < 0)) throw new Error(`${cfg.id}: ${name} has a bad weight`);
  }
  if (w.signFlip.slice(PAYING_COUNT).some((x) => x !== 0)) throw new Error(`${cfg.id}: signs may only flip to paying symbols`);
  if (w.baseRefill[9] !== 0 || w.freeRefill[9] !== 0) throw new Error(`${cfg.id}: scatters may only land on the first drop`);
  if (cfg.pay.length !== PAYING_COUNT) throw new Error(`${cfg.id}: pay table size`);
  for (const row of cfg.pay) {
    for (let s = 6; s < row.length; s++) if (row[s] < row[s - 1]) throw new Error(`${cfg.id}: pays must not decrease with size`);
  }
}

// Tuned with scripts/tune.ts, verified with scripts/simulate.ts (results in math-results/).
export const MATH_96 = build({ id: 'LS2-96', targetRtp: 96.1, basePunch: 1143, freeSign: 9597 });
export const MATH_94 = build({ id: 'LS2-94', targetRtp: 94.1, basePunch: 1118, freeSign: 9370 });
export const MATH_92 = build({ id: 'LS2-92', targetRtp: 92.1, basePunch: 1092, freeSign: 9118 });

export const MATH_VARIANTS: Record<string, MathConfig> = {
  [MATH_96.id]: MATH_96,
  [MATH_94.id]: MATH_94,
  [MATH_92.id]: MATH_92,
};

export const DEFAULT_MATH_ID = MATH_96.id;

export function getMath(id: string = DEFAULT_MATH_ID): MathConfig {
  const cfg = MATH_VARIANTS[id];
  if (!cfg) throw new Error(`Unknown math variant "${id}"`);
  return cfg;
}

/** Exact probability that a base-game first drop shows at least `n` Scatters. */
export function triggerProbability(cfg: MathConfig, n = 3, table: number[] = cfg.weights.baseInitial): number {
  const total = table.reduce((a, b) => a + b, 0);
  const p = table[9] / total;
  let below = 0;
  for (let k = 0; k < n; k++) below += binom(30, k) * p ** k * (1 - p) ** (30 - k);
  return 1 - below;
}

function binom(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
