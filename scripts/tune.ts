/**
 * Tuning helper. Finds the two lever values that bring a variant to its target RTP:
 *   lever A  Ticket Punch weight on the base-game first drop  -> RTP of rounds without a bonus
 *   lever B  Platform Sign weight on the free-spin first drop -> value of the bonus
 * Weight moved in or out of a lever is taken from or given to the Subway Token, so table
 * totals (and with them the Scatter probability) never change.
 *
 *   npm run tune -- --math LS2-96 --target 96.1 --spins 100000000 --buys 4000000
 *
 * The same seeds are used for every evaluation, so differences between lever values are
 * far less noisy than the absolute numbers.
 */
import { getMath, triggerProbability } from '../src/math/config.ts';
import { PUNCH, SIGN, TOKEN } from '../src/math/symbols.ts';
import { arg, runParallel } from './simlib.ts';

const mathId = arg('math', 'LS2-96');
const cfg = getMath(mathId);
const target = +arg('target', String(cfg.targetRtp)) / 100;
const spins = +arg('spins', '100000000');
const buys = +arg('buys', '4000000');
const p = triggerProbability(cfg);
const buyTarget = target * cfg.buyPriceBets;
const plainTarget = (target - p * buyTarget) / (1 - p);
console.log(`${mathId}: target ${(100 * target).toFixed(2)}%  trigger p=${p.toFixed(6)}  plain mean target ${plainTarget.toFixed(5)}  buy mean target ${buyTarget.toFixed(2)}x`);

const move = (table: number[], sym: number, value: number): number[] => {
  const t = [...table];
  t[TOKEN] += t[sym] - value;
  t[sym] = value;
  return t;
};

let a = +arg('a', String(cfg.weights.baseInitial[PUNCH]));
let b = +arg('b', String(cfg.weights.freeInitial[SIGN]));

async function plain(x: number): Promise<number> {
  const acc = await runParallel({ mathId, mode: 'spin', rounds: spins, seed: 'tune-a', override: { weights: { ...cfg.weights, baseInitial: move(cfg.weights.baseInitial, PUNCH, x) } } });
  const m = acc.plainSum / (acc.rounds - acc.triggers);
  console.log(`  A=${x}  plain mean ${m.toFixed(5)}`);
  return m;
}
async function buy(x: number, y: number): Promise<number> {
  const acc = await runParallel({ mathId, mode: 'buy', rounds: buys, seed: 'tune-b', override: { weights: { ...cfg.weights, baseInitial: move(cfg.weights.baseInitial, PUNCH, x), freeInitial: move(cfg.weights.freeInitial, SIGN, y) } } });
  const m = acc.sum / acc.rounds;
  console.log(`  B=${y}  buy mean ${m.toFixed(3)}x`);
  return m;
}

async function solve(f: (x: number) => Promise<number>, x0: number, goal: number, step: number): Promise<number> {
  let xa = x0, fa = await f(xa);
  let xb = fa < goal ? xa + step : xa - step, fb = await f(xb);
  for (let i = 0; i < 4; i++) {
    const slope = (fb - fa) / (xb - xa);
    const next = Math.round(xb + (goal - fb) / slope);
    if (next === xb || next === xa) break;
    xa = xb; fa = fb; xb = next; fb = await f(xb);
  }
  return Math.abs(fa - goal) < Math.abs(fb - goal) ? xa : xb;
}

a = await solve(plain, a, plainTarget, 15);
b = await solve((y) => buy(a, y), b, buyTarget, 500);
console.log(`RESULT ${mathId}: baseInitial punch=${a} -> [${move(cfg.weights.baseInitial, PUNCH, a).join(', ')}]`);
console.log(`RESULT ${mathId}: freeInitial sign=${b} -> [${move(cfg.weights.freeInitial, SIGN, b).join(', ')}]`);
