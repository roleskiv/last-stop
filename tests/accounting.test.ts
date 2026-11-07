import { describe, expect, it } from 'vitest';
import { CREDIT_SCALE, gameConfig } from '../src/config/gameConfig';
import { EngineError, GameEngine } from '../src/engine/GameEngine';
import { SeededRNG } from '../src/engine/RNG';
import { syms } from './helpers';

const mk = (seed: string | number = 1, startingBalance?: number) =>
  new GameEngine({ rng: new SeededRNG(seed), startingBalance, allowForced: true, validate: true });

describe('credit accounting', () => {
  it('starts with 10,000 demo credits and a 10 credit bet', () => {
    const e = mk();
    expect(e.balance).toBe(10_000 * CREDIT_SCALE);
    expect(e.bet).toBe(10 * CREDIT_SCALE);
  });

  it('debits once on spin and credits once on settle', () => {
    const e = mk('acct');
    for (let i = 0; i < 500; i++) {
      const before = e.balance;
      const o = e.spin();
      expect(e.balance).toBe(before - o.bet);
      expect(e.settle(o.id)).toBe(true);
      expect(e.balance).toBe(before - o.bet + o.totalWin);
      expect(e.settle(o.id)).toBe(false);
      expect(e.balance).toBe(before - o.bet + o.totalWin);
    }
  });

  it('total win equals base plus bonus, bonus counted once', () => {
    const e = mk('bonus');
    const forced = syms(['S K L Y W G', 'K L Y S G P', 'L Y W G P R', 'Y W G P S T', 'W G P R T K']);
    const o = e.spin({ base: forced });
    expect(o.bonus).not.toBeNull();
    expect(o.totalWin).toBe(o.base.win + o.bonus!.win);
    const bonusSum = o.bonus!.rounds.reduce((a, r) => a + r.win, 0);
    expect(bonusSum).toBe(o.bonus!.win);
    const before = e.balance;
    e.settle(o.id);
    expect(e.balance - before).toBe(o.totalWin);
  });

  it('blocks a new spin, bet change or reset while a spin is unresolved', () => {
    const e = mk();
    const o = e.spin();
    expect(() => e.spin()).toThrow(EngineError);
    expect(() => e.setBet(20)).toThrow(EngineError);
    expect(() => e.resetBalance()).toThrow(EngineError);
    expect(e.canSpin()).toBe(false);
    e.settle(o.id);
    expect(e.canSpin()).toBe(true);
  });

  it('never goes negative and refuses spins without enough credits', () => {
    const e = mk('poor', 25);
    e.setBet(10);
    let spins = 0;
    while (e.canSpin() && spins < 10_000) {
      const o = e.spin();
      e.settle(o.id);
      expect(e.balance).toBeGreaterThanOrEqual(0);
      spins++;
    }
    if (!e.canSpin()) expect(() => e.spin()).toThrow(EngineError);
  });

  it('only accepts configured bets', () => {
    const e = mk();
    for (const b of gameConfig.bets) expect(() => e.setBet(b)).not.toThrow();
    expect(() => e.setBet(3)).toThrow(EngineError);
  });

  it('reset restores the demo balance', () => {
    const e = mk();
    e.settle(e.spin().id);
    e.resetBalance();
    expect(e.balance).toBe(10_000 * CREDIT_SCALE);
  });

  it('forced outcomes are rejected unless allowed', () => {
    const e = new GameEngine({ rng: new SeededRNG(1) });
    const forced = syms(['S K L Y W G', 'K L Y S G P', 'L Y W G P R', 'Y W G P S T', 'W G P R T K']);
    expect(() => e.spin({ base: forced })).toThrow(EngineError);
  });

  it('respects the max-win cap across base + bonus', () => {
    const e = mk('cap');
    for (let i = 0; i < 300; i++) {
      const o = e.spin();
      expect(o.totalWin).toBeLessThanOrEqual(o.bet * gameConfig.maxWinMultiplier);
      e.settle(o.id);
    }
  });

  it('uses Web Crypto randomness by default', () => {
    expect(new GameEngine().rngKind).toBe('crypto');
  });
});
