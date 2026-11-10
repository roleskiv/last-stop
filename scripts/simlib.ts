import { fork } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import type { MathConfig } from '../src/math/config.ts';
import { getMath, triggerProbability } from '../src/math/config.ts';
import { Engine } from '../src/math/engine.ts';
import { SeededRng } from '../src/math/rng.ts';
import { addRound, mean, merge, newAcc, variance, type Acc } from '../src/math/stats.ts';
import type { RoundMode } from '../src/math/types.ts';

export interface Job { mathId: string; mode: RoundMode; rounds: number; seed: string; override?: Partial<MathConfig> }

const BATCH = 100_000;

export function runJob(job: Job): Acc {
  const base = getMath(job.mathId);
  const cfg: MathConfig = job.override ? { ...base, ...job.override, weights: { ...base.weights, ...(job.override.weights ?? {}) } } : base;
  const engine = new Engine(cfg);
  const rng = new SeededRng(job.seed);
  const acc = newAcc();
  let batchSum = 0, inBatch = 0;
  for (let i = 0; i < job.rounds; i++) {
    const s = engine.simulate(rng, job.mode);
    addRound(acc, s, cfg.coinsPerBet);
    batchSum += s.coins / cfg.coinsPerBet;
    if (++inBatch === BATCH) { acc.batchMeans.push(batchSum / BATCH); batchSum = 0; inBatch = 0; }
  }
  return acc;
}

const WORKER = fileURLToPath(new URL('./simworker.ts', import.meta.url));

/** Split a job across processes. Each process gets its own seed stream. */
export async function runParallel(job: Job, procs = Math.min(availableParallelism(), 8)): Promise<Acc> {
  const per = Math.ceil(job.rounds / procs);
  const parts = await Promise.all(
    Array.from({ length: procs }, (_, i) => new Promise<Acc>((resolve, reject) => {
      const child = fork(WORKER, [], { execArgv: process.execArgv });
      child.once('message', (m) => { resolve(m as Acc); child.kill(); });
      child.once('error', reject);
      child.send({ ...job, rounds: per, seed: `${job.seed}/${i}` });
    })),
  );
  return parts.reduce(merge);
}

export interface Estimate {
  /** RTP in percent and its 95% half-width. */
  rtp: number; ci: number;
  pTrigger: number;
  plainMean: number; trigMean: number;
  plainCi: number; trigCi: number;
}

/**
 * Stratified RTP estimate.
 *
 * The first drop is 30 independent draws, so the chance of a trigger (3+ Scatters) is
 * known exactly. A round is either "plain" (no trigger) or "triggered", and
 *     RTP = (1 - p) * E[win | plain] + p * E[win | triggered].
 * E[win | plain] is measured from ordinary spins. E[win | triggered] is measured from
 * bought bonuses, which have exactly the distribution of triggered rounds. This removes
 * the largest source of noise in a brute-force run (how many bonuses happened to land).
 */
export function stratified(cfg: MathConfig, spins: Acc, buys: Acc): Estimate {
  const p = triggerProbability(cfg);
  const nPlain = spins.rounds - spins.triggers;
  const plainMean = mean(spins.plainSum, nPlain);
  const plainVar = variance(spins.plainSum, spins.plainSumSq, nPlain);
  const trigMean = mean(buys.sum, buys.rounds);
  const trigVar = variance(buys.sum, buys.sumSq, buys.rounds);
  const se = Math.sqrt((1 - p) ** 2 * (plainVar / nPlain) + p ** 2 * (trigVar / buys.rounds));
  return {
    rtp: 100 * ((1 - p) * plainMean + p * trigMean), ci: 100 * 1.96 * se, pTrigger: p,
    plainMean, trigMean,
    plainCi: 1.96 * Math.sqrt(plainVar / nPlain), trigCi: 1.96 * Math.sqrt(trigVar / buys.rounds),
  };
}

export function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
export const flag = (name: string): boolean => process.argv.includes(`--${name}`);
