import { describe, expect, it } from 'vitest';
import { SeededRNG } from '../src/engine/RNG';
import { simulate } from '../src/sim/Simulator';

describe('headless simulation', () => {
  it('runs without rendering and produces consistent stats', () => {
    const r = simulate(20_000, new SeededRNG('sim-test'));
    expect(r.rounds).toBe(20_000);
    expect(r.rtp).toBeGreaterThan(0.3);
    expect(r.rtp).toBeLessThan(2);
    expect(r.hitFrequency).toBeGreaterThan(0.1);
    const shares = r.distribution.reduce((a, d) => a + d.share, 0);
    expect(shares).toBeCloseTo(1, 6);
    expect(Math.abs(r.baseRtp + r.bonusRtp - r.rtp)).toBeLessThan(1e-9);
  });

  it('is reproducible with the same seed', () => {
    const a = simulate(5000, new SeededRNG('x'));
    const b = simulate(5000, new SeededRNG('x'));
    expect(a.totalWin).toBe(b.totalWin);
  });
});
