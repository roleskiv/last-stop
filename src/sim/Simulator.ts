import { CREDIT_SCALE, gameConfig } from '../config/gameConfig';
import { GameEngine } from '../engine/GameEngine';
import type { RNG } from '../engine/RNG';

export interface SimReport {
  rounds: number;
  rngKind: string;
  seconds: number;
  totalBet: number;
  totalWin: number;
  rtp: number;
  baseRtp: number;
  bonusRtp: number;
  hitFrequency: number;
  bonusFrequency: number;
  bonusEvery: number;
  averageBonusPayoutX: number;
  maxWinX: number;
  maxWinCapHits: number;
  stdDevX: number;
  /** 95% confidence half-width of the RTP estimate. */
  rtpConfidence95: number;
  platformActivationsPerSpin: number;
  punchesPerSpin: number;
  upgradesPerSpin: number;
  avgCascadesOnWin: number;
  maxCascades: number;
  distribution: { label: string; share: number; rtpShare: number }[];
}

const BUCKETS: [string, number, number][] = [
  ['0x', 0, 0],
  ['0x - 1x', 1e-9, 1],
  ['1x - 2x', 1, 2],
  ['2x - 5x', 2, 5],
  ['5x - 15x', 5, 15],
  ['15x - 50x', 15, 50],
  ['50x - 200x', 50, 200],
  ['200x - 1000x', 200, 1000],
  ['1000x +', 1000, Infinity],
];

/** Headless simulation: plays paid spins through the real engine, no rendering. */
export function simulate(rounds: number, rng: RNG, onProgress?: (done: number) => void): SimReport {
  const engine = new GameEngine({ rng, startingBalance: 1e12 });
  const t0 = performance.now();
  const betCredits = gameConfig.defaultBet;
  engine.setBet(betCredits);
  const bet = betCredits * CREDIT_SCALE;

  let totalWin = 0;
  let baseWin = 0;
  let bonusWin = 0;
  let hits = 0;
  let bonuses = 0;
  let maxX = 0;
  let capHits = 0;
  let sumX2 = 0;
  let platforms = 0;
  let punches = 0;
  let upgrades = 0;
  let cascadesOnWin = 0;
  let winningRounds = 0;
  let maxCascades = 0;
  const bucketCount = new Array(BUCKETS.length).fill(0);
  const bucketWin = new Array(BUCKETS.length).fill(0);

  for (let i = 0; i < rounds; i++) {
    const o = engine.spin();
    engine.settle(o.id);
    const x = o.totalWin / bet;
    totalWin += o.totalWin;
    baseWin += o.base.win;
    if (o.bonus) {
      bonuses++;
      bonusWin += o.totalWin - o.base.win;
    }
    if (o.totalWin > 0) hits++;
    if (x > maxX) maxX = x;
    if (o.totalWin >= bet * gameConfig.maxWinMultiplier) capHits++;
    sumX2 += x * x;
    const allRounds = o.bonus ? [o.base, ...o.bonus.rounds] : [o.base];
    for (const r of allRounds) {
      if (r.win > 0) {
        winningRounds++;
        cascadesOnWin += r.cascades;
      }
      if (r.cascades > maxCascades) maxCascades = r.cascades;
      for (const e of r.events) {
        if (e.t === 'platform') platforms++;
        else if (e.t === 'punch') punches++;
        else if (e.t === 'upgrade') upgrades++;
      }
    }
    let b = 0;
    if (x > 0) {
      b = BUCKETS.findIndex(([, lo, hi]) => x >= lo && x < hi);
      if (b < 0) b = BUCKETS.length - 1;
    }
    bucketCount[b]++;
    bucketWin[b] += o.totalWin;
    if (onProgress && (i + 1) % 100000 === 0) onProgress(i + 1);
  }

  const totalBet = bet * rounds;
  const rtp = totalWin / totalBet;
  const meanX = rtp;
  const variance = sumX2 / rounds - meanX * meanX;
  const sd = Math.sqrt(Math.max(0, variance));
  return {
    rounds,
    rngKind: rng.kind,
    seconds: (performance.now() - t0) / 1000,
    totalBet: totalBet / CREDIT_SCALE,
    totalWin: totalWin / CREDIT_SCALE,
    rtp,
    baseRtp: baseWin / totalBet,
    bonusRtp: bonusWin / totalBet,
    hitFrequency: hits / rounds,
    bonusFrequency: bonuses / rounds,
    bonusEvery: bonuses ? rounds / bonuses : Infinity,
    averageBonusPayoutX: bonuses ? bonusWin / bonuses / bet : 0,
    maxWinX: maxX,
    maxWinCapHits: capHits,
    stdDevX: sd,
    rtpConfidence95: (1.96 * sd) / Math.sqrt(rounds),
    platformActivationsPerSpin: platforms / rounds,
    punchesPerSpin: punches / rounds,
    upgradesPerSpin: upgrades / rounds,
    avgCascadesOnWin: winningRounds ? cascadesOnWin / winningRounds : 0,
    maxCascades,
    distribution: BUCKETS.map(([label], i) => ({
      label,
      share: bucketCount[i] / rounds,
      rtpShare: totalWin ? bucketWin[i] / totalWin : 0,
    })),
  };
}

export function formatReport(r: SimReport): string {
  const pct = (x: number) => (x * 100).toFixed(2) + '%';
  const lines = [
    `LAST STOP simulation — ${r.rounds.toLocaleString()} paid spins (${r.rngKind} RNG, ${r.seconds.toFixed(1)}s)`,
    `Observed RTP ........ ${pct(r.rtp)}  (±${pct(r.rtpConfidence95)} at 95%)  [development estimate, not certified]`,
    `  base game ......... ${pct(r.baseRtp)}`,
    `  Midnight Train .... ${pct(r.bonusRtp)}`,
    `Hit frequency ....... ${pct(r.hitFrequency)}  (1 in ${(1 / r.hitFrequency).toFixed(2)})`,
    `Bonus frequency ..... ${pct(r.bonusFrequency)}  (1 in ${r.bonusEvery.toFixed(0)})`,
    `Avg bonus payout .... ${r.averageBonusPayoutX.toFixed(2)}x bet`,
    `Max observed win .... ${r.maxWinX.toFixed(2)}x bet   (max-win cap hits: ${r.maxWinCapHits})`,
    `Std deviation ....... ${r.stdDevX.toFixed(2)}x bet per spin`,
    `Platform signs/spin . ${r.platformActivationsPerSpin.toFixed(3)}   punches/spin ${r.punchesPerSpin.toFixed(3)}   upgrades/spin ${r.upgradesPerSpin.toFixed(3)}`,
    `Avg cascades on win . ${r.avgCascadesOnWin.toFixed(2)}   (longest ${r.maxCascades})`,
    '',
    'Win distribution (per paid spin):',
    '  bucket         share of spins   share of RTP',
    ...r.distribution.map((d) => `  ${d.label.padEnd(14)} ${pct(d.share).padStart(10)}   ${pct(d.rtpShare).padStart(12)}`),
  ];
  return lines.join('\n');
}
