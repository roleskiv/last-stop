/**
 * Verification run for one math variant.
 *
 *   npm run simulate -- --math LS2-96 --spins 1000000000 --buys 20000000 --seed verify
 *
 * Reports the stratified RTP estimate (see simlib.ts), the brute-force RTP from the same
 * spins as an independent cross-check, and the statistics that go on the par sheet.
 * The result is written to math-results/<id>.json, which `npm run parsheet` turns into
 * docs/PAR_SHEET.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { getMath } from '../src/math/config.ts';
import { BUCKET_LABELS, mean, variance, type Acc } from '../src/math/stats.ts';
import { arg, flag, runParallel, stratified } from './simlib.ts';

const mathId = arg('math', 'LS2-96');
const cfg = getMath(mathId);
const nSpins = +arg('spins', '200000000');
const nBuys = +arg('buys', '5000000');
const seed = arg('seed', 'verify');
const t0 = Date.now();

const spins = await runParallel({ mathId, mode: 'spin', rounds: nSpins, seed: `${seed}/spin` });
const buys = await runParallel({ mathId, mode: 'buy', rounds: nBuys, seed: `${seed}/buy` });
const e = stratified(cfg, spins, buys);

function batchCi(acc: Acc): number {
  const b = acc.batchMeans, n = b.length;
  if (n < 2) return NaN;
  const m = b.reduce((x, y) => x + y, 0) / n;
  const v = b.reduce((x, y) => x + (y - m) ** 2, 0) / (n - 1);
  return 1.96 * Math.sqrt(v / n);
}

const bruteRtp = 100 * mean(spins.sum, spins.rounds);
const sd = Math.sqrt(variance(spins.sum, spins.sumSq, spins.rounds));
const buyMean = mean(buys.sum, buys.rounds);
const buySd = Math.sqrt(variance(buys.sum, buys.sumSq, buys.rounds));
const pMaxGivenBonus = buys.capped / buys.rounds;

const result = {
  mathId, targetRtp: cfg.targetRtp, seed,
  generatedAt: new Date().toISOString(),
  spins: spins.rounds, buys: buys.rounds,
  rtp: { stratified: e.rtp, ci95: e.ci, bruteForce: bruteRtp, bruteForceCi95: 100 * batchCi(spins) },
  split: {
    baseGame: 100 * (1 - e.pTrigger) * e.plainMean,
    bonusRounds: 100 * e.pTrigger * e.trigMean,
  },
  trigger: { exactProbability: e.pTrigger, oneIn: 1 / e.pTrigger, observedOneIn: spins.rounds / spins.triggers },
  hitRate: 100 * spins.hits / spins.rounds,
  stdDevBets: sd,
  cascadesPerSpin: spins.cascades / spins.rounds,
  signsPerSpin: spins.signs / spins.rounds,
  punchesPerSpin: spins.punches / spins.rounds,
  bonus: {
    meanBets: buyMean, meanCi95: e.trigCi, stdDevBets: buySd,
    buyRtp: 100 * buyMean / cfg.buyPriceBets, buyRtpCi95: 100 * e.trigCi / cfg.buyPriceBets,
    avgFreeSpins: buys.freeSpins / buys.rounds,
    belowPrice: 100 * buys.bucketCount.slice(0, 8).reduce((a, b) => a + b, 0) / buys.rounds,
    byScatter: buys.byScatter.map((n, k) => ({ scatters: k, share: n / buys.rounds, meanBets: n ? buys.byScatterSum[k] / n : 0 })).filter((r) => r.share > 0),
    maxTileMultiplierSeen: Math.max(buys.maxTileMult, spins.maxTileMult),
  },
  maxWin: {
    capBets: cfg.maxWinBets,
    largestSeenBets: Math.max(spins.maxWin, buys.maxWin),
    cappedSpins: spins.capped, cappedBuys: buys.capped,
    perBonus: pMaxGivenBonus, perBonusOneIn: pMaxGivenBonus ? 1 / pMaxGivenBonus : null,
    perSpinOneIn: pMaxGivenBonus ? 1 / (pMaxGivenBonus * e.pTrigger) : null,
  },
  distribution: {
    labels: BUCKET_LABELS,
    spin: spins.bucketCount.map((c, i) => ({ share: c / spins.rounds, rtp: 100 * spins.bucketSum[i] / spins.rounds })),
    buy: buys.bucketCount.map((c, i) => ({ share: c / buys.rounds, rtp: 100 * buys.bucketSum[i] / buys.rounds / cfg.buyPriceBets })),
  },
};

const pct = (x: number, d = 3) => `${x.toFixed(d)}%`;
console.log(`${mathId}  target ${cfg.targetRtp}%  (${spins.rounds.toLocaleString()} spins, ${buys.rounds.toLocaleString()} bought bonuses, seed "${seed}")`);
console.log(`  RTP stratified   ${pct(e.rtp)} ± ${pct(e.ci)} (95%)`);
console.log(`  RTP brute force  ${pct(bruteRtp)} ± ${pct(result.rtp.bruteForceCi95)} (95%, batch means)`);
console.log(`  base game ${pct(result.split.baseGame, 2)}  bonus ${pct(result.split.bonusRounds, 2)}`);
console.log(`  bonus 1 in ${result.trigger.oneIn.toFixed(1)} (observed 1 in ${result.trigger.observedOneIn.toFixed(1)})  mean ${buyMean.toFixed(2)}x ± ${e.trigCi.toFixed(2)}  buy RTP ${pct(result.bonus.buyRtp, 2)}`);
console.log(`  hit rate ${pct(result.hitRate, 2)}  std dev ${sd.toFixed(2)} bets  avg free spins ${result.bonus.avgFreeSpins.toFixed(2)}`);
console.log(`  max win: largest seen ${result.maxWin.largestSeenBets.toFixed(0)}x, capped ${buys.capped} of ${buys.rounds} bonuses` + (result.maxWin.perSpinOneIn ? ` (about 1 in ${Math.round(result.maxWin.perSpinOneIn).toLocaleString()} spins)` : ''));
console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)}s`);

if (!flag('no-write')) {
  mkdirSync('math-results', { recursive: true });
  writeFileSync(`math-results/${mathId}.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(`  wrote math-results/${mathId}.json`);
}
