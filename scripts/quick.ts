// Quick tuning probe: npm exec tsx scripts/quick.ts -- --spins 4000000 --buys 400000
import { getMath } from '../src/math/config.ts';
import { arg, runParallel, stratified } from './simlib.ts';

const mathId = arg('math', 'LS2-96');
const baseCfg = getMath(mathId);
const ov = JSON.parse(arg('ov', '{}'));
const scale = +arg('scale', '1');
if (scale !== 1) ov.pay = baseCfg.pay.map((r) => r.map((v) => Math.round(v * scale)));
const cfg = { ...baseCfg, ...ov, weights: { ...baseCfg.weights, ...(ov.weights ?? {}) } };
const t0 = Date.now();
const [spins, buys] = await Promise.all([
  runParallel({ mathId, mode: 'spin', rounds: +arg('spins', '4000000'), seed: arg('seed', 'q'), override: ov }, 2),
  runParallel({ mathId, mode: 'buy', rounds: +arg('buys', '400000'), seed: arg('seed', 'q') + 'b', override: ov }, 2),
]);
const e = stratified(cfg, spins, buys);
const sd = Math.sqrt(spins.sumSq / spins.rounds - (spins.sum / spins.rounds) ** 2);
console.log(`${mathId}  RTP ${e.rtp.toFixed(2)}% ±${e.ci.toFixed(2)}  plain ${(100 * (1 - e.pTrigger) * e.plainMean).toFixed(2)}%  bonus part ${(100 * e.pTrigger * e.trigMean).toFixed(2)}%`);
console.log(`trigger 1 in ${(1 / e.pTrigger).toFixed(1)}  buy mean ${e.trigMean.toFixed(2)}x ±${e.trigCi.toFixed(2)} (buy RTP ${(100 * e.trigMean / cfg.buyPriceBets).toFixed(2)}%)  hit ${(100 * spins.hits / spins.rounds).toFixed(2)}%  sd ${sd.toFixed(1)}`);
console.log(`avg FS/bonus ${(buys.freeSpins / buys.rounds).toFixed(2)}  max ${Math.max(spins.maxWin, buys.maxWin).toFixed(0)}x  capped buys ${buys.capped}  maxTile x${buys.maxTileMult}  signs/spin ${(spins.signs / spins.rounds).toFixed(3)} punches/spin ${(spins.punches / spins.rounds).toFixed(3)}`);
const n = buys.rounds;
console.log('buy dist:', buys.bucketCount.map((c, i) => `${i}:${(100 * c / n).toFixed(2)}`).join(' '));
console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
