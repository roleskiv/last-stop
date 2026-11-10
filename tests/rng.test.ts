import { describe, expect, it } from 'vitest';
import { CryptoRng, SeededRng } from '../src/math/rng.ts';

describe('random number generators', () => {
  it('stay inside the requested range', () => {
    for (const rng of [new CryptoRng(), new SeededRng(7)]) {
      for (const n of [1, 2, 3, 30, 1000, 99_000, 2 ** 31 - 1]) {
        for (let i = 0; i < 2000; i++) {
          const x = rng.below(n);
          expect(Number.isInteger(x) && x >= 0 && x < n).toBe(true);
        }
      }
    }
  });

  it('seeded streams repeat, different seeds differ', () => {
    const a = new SeededRng('x'), b = new SeededRng('x'), c = new SeededRng('y');
    const sa = Array.from({ length: 50 }, () => a.below(1e6));
    expect(Array.from({ length: 50 }, () => b.below(1e6))).toEqual(sa);
    expect(Array.from({ length: 50 }, () => c.below(1e6))).not.toEqual(sa);
  });

  it('have no modulo bias (chi-square over an awkward range)', () => {
    // 2^31 is not a multiple of 7 or 99,000: a biased generator would fail here.
    for (const rng of [new SeededRng('chi'), new CryptoRng()]) {
      const k = 7, draws = 700_000;
      const counts = new Array<number>(k).fill(0);
      for (let i = 0; i < draws; i++) counts[rng.below(99_000) % k]++;
      const expected = counts.map((_, i) => draws * (Math.floor((99_000 - 1 - i) / k) + 1) / 99_000);
      const chi = counts.reduce((s, c, i) => s + (c - expected[i]) ** 2 / expected[i], 0);
      // 6 degrees of freedom: 22.46 is the 99.9th percentile.
      expect(chi).toBeLessThan(22.46);
    }
  });
});
