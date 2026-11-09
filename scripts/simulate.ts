/**
 * Headless math simulation. No rendering.
 *   npm run simulate                    # 1,000,000 spins, seeded
 *   npm run simulate -- --rounds 200000 --seed abc
 *   npm run simulate -- --crypto        # use the production CryptoRNG
 *   npm run simulate -- --json out.json
 */
import { writeFileSync } from 'node:fs';
import { CryptoRNG, SeededRNG } from '../src/engine/RNG';
import { formatReport, simulate } from '../src/sim/Simulator';

const args = process.argv.slice(2);
const opt = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const rounds = Number(opt('rounds', '1000000'));
const rng = args.includes('--crypto') ? new CryptoRNG() : new SeededRNG(opt('seed', 'last-stop'));
const report = simulate(rounds, rng, (n) => process.stderr.write(`  ${n.toLocaleString()} / ${rounds.toLocaleString()}\r`));
process.stderr.write('\n');
console.log(formatReport(report));
const json = opt('json');
if (json) writeFileSync(json, JSON.stringify(report, null, 2));
