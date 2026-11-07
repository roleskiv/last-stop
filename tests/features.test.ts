import { describe, expect, it } from 'vitest';
import { freeSpinsFor, featureConfig } from '../src/config/featureConfig';
import { isRegular, Sym } from '../src/config/symbols';
import { idx } from '../src/engine/Grid';
import { SeededRNG } from '../src/engine/RNG';
import { resolveRound } from '../src/engine/RoundResolver';
import { playMidnightTrain } from '../src/features/MidnightTrain';
import type { RoundEvent } from '../src/engine/types';
import { syms } from './helpers';

const base = (forced: ReturnType<typeof syms>, seed: number | string = 1, haunted = new Set<number>()) =>
  resolveRound(new SeededRNG(seed), { mode: 'base', bet: 1000, haunted, winCapRemaining: 1e12, forcedGrid: forced, validate: true });

const types = (ev: RoundEvent[]) => ev.map((e) => e.t);

describe('scatter counting and bonus award', () => {
  it('counts scatters on the initial grid only', () => {
    const r = base(syms(['S K L Y W G', 'K L Y S G P', 'L Y W G P R', 'Y W G P S T', 'W G P R T K']));
    expect(r.scatterCount).toBe(3);
    const sc = r.events.find((e) => e.t === 'scatters');
    expect(sc && sc.t === 'scatters' && sc.positions).toEqual([idx(0, 0), idx(3, 1), idx(4, 3)].sort((a, b) => a - b));
  });

  it('awards the configured free spins', () => {
    expect(freeSpinsFor(2)).toBe(0);
    expect(freeSpinsFor(3)).toBe(8);
    expect(freeSpinsFor(4)).toBe(10);
    expect(freeSpinsFor(5)).toBe(12);
    expect(freeSpinsFor(9)).toBe(12);
  });

  it('plays exactly the awarded spins (plus retriggers) and sums wins', () => {
    for (let seed = 0; seed < 50; seed++) {
      const b = playMidnightTrain(new SeededRNG(seed), 1000, 3, 1e12, { validate: true });
      const retriggers = b.rounds.reduce((a, r) => a + r.retriggered, 0);
      expect(b.totalSpins).toBe(8 + retriggers);
      expect(b.rounds.reduce((a, r) => a + r.win, 0)).toBe(b.win);
      expect(b.totalSpins).toBeLessThanOrEqual(featureConfig.midnightTrain.maxTotalSpins);
    }
  });

  it('haunted tiles persist across free spins and respect the cap', () => {
    const cap = featureConfig.phantomPlatforms.freeSpinsCap;
    for (let seed = 0; seed < 30; seed++) {
      const b = playMidnightTrain(new SeededRNG(seed), 1000, 5, 1e12);
      for (let i = 1; i < b.rounds.length; i++) {
        expect(b.rounds[i].hauntedStart).toEqual(b.rounds[i - 1].hauntedEnd);
        for (const p of b.rounds[i - 1].hauntedEnd) expect(b.rounds[i].hauntedEnd).toContain(p);
      }
      for (const r of b.rounds) expect(r.hauntedEnd.length).toBeLessThanOrEqual(cap);
    }
  });
});

describe('feature ordering', () => {
  it('reveal -> scatters -> platform -> punch -> upgrades -> win', () => {
    // Sign at (0,0), punch at (5,4), scatter at (2,2)
    const forced = syms(['H K L Y W G', 'K L Y W G P', 'L Y S G P R', 'Y W G P R T', 'W G P R T U']);
    const r = base(forced, 'order');
    const t = types(r.events);
    expect(t[0]).toBe('reveal');
    expect(t[1]).toBe('scatters');
    expect(t[2]).toBe('platform');
    expect(t[3]).toBe('punch');
    const firstWin = t.indexOf('win');
    const lastUpgradeBeforeWin = firstWin < 0 ? t.lastIndexOf('upgrade') : t.slice(0, firstWin).lastIndexOf('upgrade');
    if (lastUpgradeBeforeWin >= 0) expect(lastUpgradeBeforeWin).toBeLessThan(firstWin < 0 ? Infinity : firstWin);
    expect(t[t.length - 1]).toBe('end');
  });

  it('platform sign haunts its tile and converts to a regular symbol', () => {
    const forced = syms(['K H L Y W G', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T', 'W G P R T K']);
    const r = base(forced);
    const p = r.events.find((e) => e.t === 'platform');
    expect(p && p.t === 'platform' && p.pos).toBe(idx(1, 0));
    expect(p && p.t === 'platform' && isRegular(p.became.sym)).toBe(true);
    expect(r.hauntedEnd).toEqual([idx(1, 0)]);
    // no Sign remains anywhere after activation
    const end = r.events[r.events.length - 1];
    expect(end.t === 'end' && end.grid.some((c) => c.sym === Sym.SIGN)).toBe(false);
  });

  it('respects the base-game haunted cap', () => {
    const forced = syms(['H H H H H H', 'H H K L Y W', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T']);
    const r = base(forced);
    expect(r.hauntedEnd.length).toBe(featureConfig.phantomPlatforms.baseCap);
    const platforms = r.events.filter((e) => e.t === 'platform');
    expect(platforms).toHaveLength(8);
    expect(platforms.filter((e) => e.t === 'platform' && e.haunted)).toHaveLength(featureConfig.phantomPlatforms.baseCap);
  });

  it('upgrades only regular symbols newly landed on haunted tiles, at most once per step', () => {
    for (let seed = 0; seed < 300; seed++) {
      const forced = syms(['H K L Y W G', 'K H Y W G P', 'L Y H G P R', 'Y W G P R T', 'W G P R T K']);
      const r = base(forced, seed);
      let step = 0;
      const seen = new Set<string>();
      for (const e of r.events) {
        if (e.t === 'cascade') step++;
        if (e.t === 'upgrade') {
          expect(r.hauntedEnd).toContain(e.pos);
          expect(isRegular(e.from)).toBe(true);
          const key = `${step}:${e.pos}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
    }
  });

  it('ticket punch turns a regular symbol into a wild and converts itself', () => {
    const forced = syms(['U K L Y W G', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T', 'W G P R T K']);
    const r = base(forced, 'punch');
    const p = r.events.find((e) => e.t === 'punch');
    if (!p || p.t !== 'punch') throw new Error('no punch');
    expect(p.from).toBe(0);
    expect(isRegular(p.targetBefore)).toBe(true);
    expect(isRegular(p.became.sym)).toBe(true);
    const reveal = r.events[0];
    if (reveal.t !== 'reveal') throw new Error();
    expect(reveal.grid[0].sym).toBe(Sym.PUNCH);
  });

  it('ticket punch never triggers recursively', () => {
    for (let seed = 0; seed < 300; seed++) {
      const forced = syms(['U U U K L Y', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T', 'W G P R T K']);
      const r = base(forced, seed);
      expect(r.events.filter((e) => e.t === 'punch')).toHaveLength(3);
      for (const e of r.events) if (e.t === 'cascade') expect(e.grid.some((c) => c.sym === Sym.PUNCH)).toBe(false);
    }
  });
});

describe('deterministic replay', () => {
  it('same seed gives an identical round and bonus', () => {
    const a = playMidnightTrain(new SeededRNG('replay'), 1000, 4, 1e12);
    const b = playMidnightTrain(new SeededRNG('replay'), 1000, 4, 1e12);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = playMidnightTrain(new SeededRNG('other'), 1000, 4, 1e12);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
  });
});
