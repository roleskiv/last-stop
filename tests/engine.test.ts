import { describe, expect, it } from 'vitest';
import { MATH_VARIANTS, getMath, triggerProbability, validateConfig, type MathConfig } from '../src/math/config.ts';
import { Engine } from '../src/math/engine.ts';
import { SeededRng } from '../src/math/rng.ts';
import { CELLS, PAYING_COUNT, PUNCH, SCATTER, SIGN, WILD } from '../src/math/symbols.ts';
import { findClusters, verifyRound } from '../src/math/verify.ts';

const cfg = getMath('LS2-96');

describe('math configuration', () => {
  it('every variant is valid and shares the paytable and bonus frequency', () => {
    const ids = Object.keys(MATH_VARIANTS);
    expect(ids).toEqual(['LS2-96', 'LS2-94', 'LS2-92']);
    for (const id of ids) {
      const m = getMath(id);
      expect(() => validateConfig(m)).not.toThrow();
      expect(m.pay).toEqual(cfg.pay);
      expect(triggerProbability(m)).toBeCloseTo(triggerProbability(cfg), 12);
      const total = (t: number[]) => t.reduce((x, y) => x + y, 0);
      for (const k of ['baseInitial', 'baseRefill', 'freeInitial', 'freeRefill'] as const) {
        expect(total(m.weights[k])).toBe(total(cfg.weights[k]));
      }
    }
  });

  it('better symbols and bigger clusters never pay less', () => {
    for (let sym = 1; sym < PAYING_COUNT; sym++) {
      for (let size = 5; size <= cfg.maxPaySize; size++) {
        expect(cfg.pay[sym][size]).toBeGreaterThan(cfg.pay[sym - 1][size]);
        if (size > 5) expect(cfg.pay[sym][size]).toBeGreaterThan(cfg.pay[sym][size - 1]);
      }
    }
  });

  it('the bonus triggers about once in 255 spins', () => {
    expect(1 / triggerProbability(cfg)).toBeGreaterThan(240);
    expect(1 / triggerProbability(cfg)).toBeLessThan(270);
  });

  it('rejects a broken table', () => {
    const bad: MathConfig = { ...cfg, weights: { ...cfg.weights, baseRefill: cfg.weights.baseInitial } };
    expect(() => validateConfig(bad)).toThrow(/scatters/);
  });
});

describe('engine', () => {
  it('is deterministic: the same RNG stream gives the same rounds', () => {
    const a = new Engine(cfg), b = new Engine(cfg);
    const ra = new SeededRng('determinism'), rb = new SeededRng('determinism');
    for (let i = 0; i < 300; i++) expect(a.play(ra, i % 25 ? 'spin' : 'buy')).toEqual(b.play(rb, i % 25 ? 'spin' : 'buy'));
  });

  it('recording does not change outcomes (simulate and play agree)', () => {
    const a = new Engine(cfg), b = new Engine(cfg);
    const ra = new SeededRng('agree'), rb = new SeededRng('agree');
    for (let i = 0; i < 3000; i++) {
      const mode = i % 40 ? 'spin' : 'buy';
      const rec = a.play(ra, mode);
      const sum = b.simulate(rb, mode);
      expect(sum.coins).toBe(rec.coins);
      expect(sum.freeSpins).toBe(rec.free.length);
    }
  });

  for (const id of Object.keys(MATH_VARIANTS)) {
    it(`${id}: every round passes the independent audit`, () => {
      const m = getMath(id);
      const engine = new Engine(m);
      const rng = new SeededRng(`audit-${id}`);
      let wins = 0, bonuses = 0;
      for (let i = 0; i < 12000; i++) {
        const rec = engine.play(rng, i % 30 === 0 ? 'buy' : 'spin');
        const problems = verifyRound(m, rec);
        if (problems.length) throw new Error(`round ${i}: ${problems.join('; ')}`);
        if (rec.coins > 0) wins++;
        if (rec.free.length) bonuses++;
      }
      expect(wins).toBeGreaterThan(3000);
      expect(bonuses).toBeGreaterThanOrEqual(400);
    });
  }

  it('a bought bonus always starts the Midnight Train and respects the spin limit', () => {
    const engine = new Engine(cfg);
    const rng = new SeededRng('buy');
    for (let i = 0; i < 1500; i++) {
      const rec = engine.play(rng, 'buy');
      const scatters = rec.base.grid.filter((s) => s === SCATTER).length;
      expect(scatters).toBeGreaterThanOrEqual(3);
      expect(rec.base.awarded).toBe(cfg.freeSpins[Math.min(scatters, 6)]);
      if (!rec.capped) expect(rec.free.length).toBeGreaterThanOrEqual(10);
      expect(rec.free.length).toBeLessThanOrEqual(cfg.maxFreeSpins);
    }
  });

  it('never pays more than the maximum win, and stops the round there', () => {
    const small: MathConfig = { ...cfg, id: 'cap-test', maxWinBets: 30 };
    const engine = new Engine(small);
    const rng = new SeededRng('cap');
    let capped = 0;
    for (let i = 0; i < 1500; i++) {
      const rec = engine.play(rng, 'buy');
      expect(rec.coins).toBeLessThanOrEqual(30 * small.coinsPerBet);
      expect(verifyRound(small, rec)).toEqual([]);
      if (rec.capped) { capped++; expect(rec.coins).toBe(30 * small.coinsPerBet); }
    }
    expect(capped).toBeGreaterThan(100);
  });

  it('feature symbols never survive on a finished board', () => {
    const engine = new Engine(cfg);
    const rng = new SeededRng('features');
    for (let i = 0; i < 4000; i++) {
      const rec = engine.play(rng, 'spin');
      for (const spin of [rec.base, ...rec.free]) {
        const last = [...spin.steps].reverse().find((s) => s.t === 'cascade');
        if (last && last.t === 'cascade' && !rec.capped) {
          // After the final cascade only later sign/punch steps may change the board.
          const tail = spin.steps.slice(spin.steps.lastIndexOf(last) + 1);
          const board = [...last.grid];
          for (const s of tail) {
            if (s.t === 'signs') s.signs.forEach((x) => { board[x.pos] = x.becomes; });
            if (s.t === 'punch') s.punches.forEach((p) => { board[p.pos] = WILD; p.targets.forEach((t) => { board[t] = WILD; }); });
          }
          expect(board).not.toContain(SIGN);
          expect(board).not.toContain(PUNCH);
        }
      }
    }
  });
});

describe('independent audit', () => {
  const engine = new Engine(cfg);
  const rng = new SeededRng('tamper');
  const winning = () => { for (;;) { const r = engine.play(rng, 'spin'); if (r.coins > 0 && !r.free.length) return r; } };

  it('detects an inflated pay', () => {
    const rec = structuredClone(winning());
    const win = rec.base.steps.find((s) => s.t === 'win');
    if (win?.t === 'win') { win.clusters[0].coins += 20; win.coins += 20; }
    rec.base.coins += 20; rec.coins += 20; rec.baseCoins += 20;
    expect(verifyRound(cfg, rec).join()).toMatch(/pay/);
  });

  it('detects an edited board', () => {
    const rec = structuredClone(winning());
    const win = rec.base.steps.find((s) => s.t === 'win');
    if (win?.t === 'win') { const cell = win.clusters[0].cells.find((c) => rec.base.grid[c] !== WILD) ?? win.clusters[0].cells[0]; rec.base.grid[cell] = SCATTER; }
    expect(verifyRound(cfg, rec).length).toBeGreaterThan(0);
  });

  it('detects a changed total', () => {
    const rec = structuredClone(winning());
    rec.coins += 1;
    expect(verifyRound(cfg, rec).join()).toMatch(/total/);
  });

  it('finds clusters through Wilds and ignores diagonals', () => {
    const g = new Array<number>(CELLS).fill(SCATTER);
    // column-major: pos = col * 5 + row
    [0, 1, 2].forEach((p) => { g[p] = 3; });
    g[7] = WILD; g[12] = 3;            // 0,1,2 (col 0) - wild (col 1,row 2) - col 2,row 2
    g[24] = 5; g[18] = 5;              // diagonal neighbours only
    const found = findClusters(g);
    expect(found).toEqual([{ sym: 3, cells: [0, 1, 2, 7, 12] }]);
  });
});

describe('return to player (smoke test)', () => {
  it('ordinary spins of LS2-96 return what the par sheet says', () => {
    const engine = new Engine(cfg);
    const rng = new SeededRng('rtp-smoke');
    let plain = 0, n = 0, hits = 0;
    const rounds = 1_500_000;
    for (let i = 0; i < rounds; i++) {
      const s = engine.simulate(rng, 'spin');
      if (s.coins > 0) hits++;
      if (!s.triggered) { plain += s.coins / cfg.coinsPerBet; n++; }
    }
    // Rounds without a bonus are low variance: 1.5M spins pin their mean to about +-0.01.
    expect(plain / n).toBeGreaterThan(0.565);
    expect(plain / n).toBeLessThan(0.61);
    expect(hits / rounds).toBeGreaterThan(0.2);
    expect(hits / rounds).toBeLessThan(0.4);
  }, 60_000);
});
