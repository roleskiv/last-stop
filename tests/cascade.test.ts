import { describe, expect, it } from 'vitest';
import { cascade } from '../src/engine/CascadeResolver';
import { idx } from '../src/engine/Grid';
import { IdSource, WeightedPicker } from '../src/engine/OutcomeGenerator';
import { SeededRNG } from '../src/engine/RNG';
import { resolveRound } from '../src/engine/RoundResolver';
import { gameConfig } from '../src/config/gameConfig';
import { Sym } from '../src/config/symbols';
import { DEAD, grid, syms } from './helpers';

const onlyKey = new WeightedPicker([[Sym.KEY, 1]]);

describe('cascade gravity', () => {
  it('drops survivors down and spawns new symbols on top', () => {
    const g = grid(DEAD);
    const ids = new IdSource();
    for (let i = 0; i < 100; i++) ids.next();
    // remove rows 3 and 4 of column 0
    const removed = [idx(0, 3), idx(0, 4)];
    const before = g.map((c) => c.id);
    const res = cascade(g, removed, new SeededRNG(1), onlyKey, ids);
    // column 0 rows 0..2 moved to rows 2..4
    expect(res.grid[idx(0, 2)].id).toBe(before[idx(0, 0)]);
    expect(res.grid[idx(0, 3)].id).toBe(before[idx(0, 1)]);
    expect(res.grid[idx(0, 4)].id).toBe(before[idx(0, 2)]);
    expect(res.grid[idx(0, 0)].sym).toBe(Sym.KEY);
    expect(res.grid[idx(0, 1)].sym).toBe(Sym.KEY);
    expect(res.grid[idx(0, 0)].id).toBeGreaterThan(100);
    // other columns unchanged
    for (let i = 5; i < 30; i++) expect(res.grid[i]).toBe(g[i]);
    expect(res.landed).toEqual([0, 1, 2, 3, 4]);
  });

  it('removing from the middle only moves the cells above', () => {
    const g = grid(DEAD);
    const ids = new IdSource();
    for (let i = 0; i < 100; i++) ids.next();
    const res = cascade(g, [idx(2, 2)], new SeededRNG(1), onlyKey, ids);
    expect(res.grid[idx(2, 3)]).toBe(g[idx(2, 3)]);
    expect(res.grid[idx(2, 4)]).toBe(g[idx(2, 4)]);
    expect(res.grid[idx(2, 2)].id).toBe(g[idx(2, 1)].id);
    expect(res.grid[idx(2, 1)].id).toBe(g[idx(2, 0)].id);
    expect(res.landed).toEqual([idx(2, 0), idx(2, 1), idx(2, 2)]);
  });

  it('never leaves undefined symbols and ids stay unique', () => {
    const rng = new SeededRNG('cascades');
    for (let n = 0; n < 2000; n++) {
      const r = resolveRound(rng, { mode: 'base', bet: 1000, haunted: new Set(), winCapRemaining: 1e12, validate: true });
      for (const e of r.events) {
        if (e.t === 'cascade' || e.t === 'reveal' || e.t === 'end') {
          expect(e.grid).toHaveLength(30);
          const ids = new Set(e.grid.map((c) => c.id));
          expect(ids.size).toBe(30);
        }
      }
    }
  });
});

describe('cascade sequence', () => {
  it('resolves fully: the final grid has no winning cluster', async () => {
    const { findClusters } = await import('../src/engine/ClusterEvaluator');
    const rng = new SeededRNG('full');
    for (let n = 0; n < 3000; n++) {
      const r = resolveRound(rng, { mode: 'base', bet: 1000, haunted: new Set(), winCapRemaining: 1e12 });
      const end = r.events[r.events.length - 1];
      if (end.t !== 'end') throw new Error('last event must be end');
      if (r.cascades < gameConfig.maxCascades) expect(findClusters(end.grid, 1000)).toEqual([]);
    }
  });

  it('a forced winning grid pays, cascades, and keeps paying until dead', () => {
    const forced = syms(['T T T T T G', 'K L Y W G P', 'L Y W G P R', 'Y W G P R T', 'W G P R T K']);
    const r = resolveRound(new SeededRNG(3), { mode: 'base', bet: 1000, haunted: new Set(), winCapRemaining: 1e12, forcedGrid: forced });
    expect(r.cascades).toBeGreaterThanOrEqual(1);
    expect(r.win).toBeGreaterThan(0);
    const wins = r.events.filter((e) => e.t === 'win');
    const sum = wins.reduce((a, e) => a + (e.t === 'win' ? e.stepWin : 0), 0);
    expect(sum).toBe(r.win);
  });

  it('max cascade guard stops an endless chain', () => {
    // A refill made only of tokens and a full token grid: every step wins.
    const forced = syms(['T T T T T T', 'T T T T T T', 'T T T T T T', 'T T T T T T', 'T T T T T T']);
    // Patch refill table temporarily via module-level pickers.
    return import('../src/engine/RoundResolver').then(({ pickers }) => {
      const original = pickers.baseRefill;
      pickers.baseRefill = new WeightedPicker([[Sym.TOKEN, 1]]);
      try {
        const r = resolveRound(new SeededRNG(1), { mode: 'base', bet: 100, haunted: new Set(), winCapRemaining: 1e15, forcedGrid: forced });
        expect(r.cascades).toBe(gameConfig.maxCascades);
      } finally {
        pickers.baseRefill = original;
      }
    });
  });

  it('max win cap stops the round and truncates the win', () => {
    const forced = syms(['R R R R R R', 'R R R R R R', 'R R R R R R', 'R R R R R R', 'R R R R R R']);
    const r = resolveRound(new SeededRNG(1), { mode: 'base', bet: 1000, haunted: new Set(), winCapRemaining: 5000, forcedGrid: forced });
    expect(r.win).toBe(5000);
    expect(r.hitMaxWin).toBe(true);
    expect(r.events.some((e) => e.t === 'maxWin')).toBe(true);
  });
});
