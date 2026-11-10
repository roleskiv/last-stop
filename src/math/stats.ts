import type { RoundSummary } from './types.ts';

/** Win buckets in bets: [lower, upper). The first bucket is "no win", the last is the max win. */
export const BUCKET_EDGES = [0, 0.0001, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2500, 5000, 10000];
export const BUCKET_LABELS = [
  '0', '0 - 1x', '1x - 2x', '2x - 5x', '5x - 10x', '10x - 20x', '20x - 50x', '50x - 100x',
  '100x - 200x', '200x - 500x', '500x - 1,000x', '1,000x - 2,500x', '2,500x - 5,000x', '5,000x - 10,000x', '10,000x (max)',
];

/** Mergeable accumulator for simulation results. All sums are in bets. */
export interface Acc {
  rounds: number;
  sum: number;
  sumSq: number;
  baseSum: number;
  bonusSum: number;
  hits: number;
  triggers: number;
  /** Sum and sum of squares of wins in triggered rounds, and in the rest. */
  trigSum: number; trigSumSq: number;
  plainSum: number; plainSumSq: number;
  freeSpins: number;
  capped: number;
  cascades: number;
  signs: number;
  punches: number;
  maxWin: number;
  maxTileMult: number;
  byScatter: number[];
  byScatterSum: number[];
  bucketCount: number[];
  bucketSum: number[];
  /** Batch means, for a distribution-free confidence interval. */
  batchMeans: number[];
}

export function newAcc(): Acc {
  return {
    rounds: 0, sum: 0, sumSq: 0, baseSum: 0, bonusSum: 0, hits: 0, triggers: 0,
    trigSum: 0, trigSumSq: 0, plainSum: 0, plainSumSq: 0,
    freeSpins: 0, capped: 0, cascades: 0, signs: 0, punches: 0, maxWin: 0, maxTileMult: 0,
    byScatter: new Array(8).fill(0), byScatterSum: new Array(8).fill(0),
    bucketCount: new Array(BUCKET_EDGES.length).fill(0), bucketSum: new Array(BUCKET_EDGES.length).fill(0),
    batchMeans: [],
  };
}

export function bucketOf(x: number): number {
  let b = 0;
  for (let i = 1; i < BUCKET_EDGES.length; i++) if (x >= BUCKET_EDGES[i]) b = i;
  return b;
}

export function addRound(acc: Acc, s: RoundSummary, coinsPerBet: number): void {
  const x = s.coins / coinsPerBet;
  acc.rounds++;
  acc.sum += x;
  acc.sumSq += x * x;
  acc.baseSum += s.baseCoins / coinsPerBet;
  acc.bonusSum += s.bonusCoins / coinsPerBet;
  if (x > 0) acc.hits++;
  if (s.triggered) { acc.triggers++; acc.trigSum += x; acc.trigSumSq += x * x; acc.freeSpins += s.freeSpins; }
  else { acc.plainSum += x; acc.plainSumSq += x * x; }
  if (s.capped) acc.capped++;
  acc.cascades += s.cascades;
  acc.signs += s.signs;
  acc.punches += s.punches;
  if (x > acc.maxWin) acc.maxWin = x;
  if (s.maxTileMult > acc.maxTileMult) acc.maxTileMult = s.maxTileMult;
  const k = Math.min(s.triggerScatters, 7);
  acc.byScatter[k]++;
  acc.byScatterSum[k] += x;
  const b = bucketOf(x);
  acc.bucketCount[b]++;
  acc.bucketSum[b] += x;
}

export function merge(a: Acc, b: Acc): Acc {
  const out = newAcc();
  for (const key of Object.keys(out) as (keyof Acc)[]) {
    const av = a[key], bv = b[key];
    if (key === 'batchMeans') out.batchMeans = [...a.batchMeans, ...b.batchMeans];
    else if (key === 'maxWin' || key === 'maxTileMult') (out[key] as number) = Math.max(av as number, bv as number);
    else if (Array.isArray(av)) (out[key] as number[]) = av.map((v, i) => v + (bv as number[])[i]);
    else (out[key] as number) = (av as number) + (bv as number);
  }
  return out;
}

export const mean = (sum: number, n: number): number => (n ? sum / n : 0);
export const variance = (sum: number, sumSq: number, n: number): number => (n > 1 ? (sumSq - (sum * sum) / n) / (n - 1) : 0);
