import { describe, expect, it } from 'vitest';
import { getMath } from '../src/math/config.ts';
import { SeededRng } from '../src/math/rng.ts';
import { verifyRound } from '../src/math/verify.ts';
import { GameService, verifyChain } from '../src/server/service.ts';
import { DemoWallet, MemoryKeyValue, WalletDeclined, type Wallet, type WalletTx } from '../src/server/wallet.ts';
import { OPERATOR_PROFILES, type OperatorConfig } from '../src/shared/operator.ts';
import { GameError } from '../src/shared/protocol.ts';

function setup(profile: OperatorConfig = OPERATOR_PROFILES.demo, opts: { wallet?: (kv: MemoryKeyValue) => Wallet; store?: MemoryKeyValue; seed?: string } = {}) {
  const store = opts.store ?? new MemoryKeyValue();
  const wallet = opts.wallet ? opts.wallet(store) : new DemoWallet(store, profile.demoBalance);
  const clock = { t: 1_700_000_000_000 };
  let n = 0;
  const service = new GameService({
    operator: profile, store, wallet, rng: new SeededRng(opts.seed ?? 'service'),
    now: () => clock.t, uuid: () => `id-${(++n).toString().padStart(6, '0')}-${Math.random().toString(36).slice(2, 8)}`,
  });
  return { service, store, wallet, clock };
}
const rid = (i: number) => `request-${i}`;
const code = async (p: Promise<unknown>) => { try { await p; return 'OK'; } catch (e) { return e instanceof GameError ? e.code : `THROWN ${String(e)}`; } };

describe('game service', () => {
  it('keeps the wallet exact over many rounds', async () => {
    const { service, wallet } = setup();
    const s = await service.openSession('p1');
    let balance = s.balance, wagered = 0, won = 0;
    for (let i = 0; i < 400; i++) {
      const bet = [20, 100, 500, 2000][i % 4];
      const { round, stats } = await service.play({ sessionId: s.sessionId, requestId: rid(i), bet, mode: i % 97 === 0 ? 'buy' : 'spin' });
      expect(round.balanceBefore).toBe(balance);
      expect(round.stake).toBe(round.mode === 'buy' ? bet * 100 : bet);
      expect(round.win).toBe(round.record.coins * bet / 20);
      expect(Number.isSafeInteger(round.win)).toBe(true);
      balance = balance - round.stake + round.win;
      expect(round.balanceAfter).toBe(balance);
      expect(round.settled).toBe(true);
      expect(verifyRound(getMath('LS2-96'), round.record)).toEqual([]);
      wagered += round.stake; won += round.win;
      expect(stats).toMatchObject({ rounds: i + 1, wagered, won });
    }
    expect(await wallet.balance('p1')).toBe(balance);
  });

  it('a retried request returns the same round and charges once', async () => {
    const { service, wallet } = setup();
    const s = await service.openSession('p1');
    const first = await service.play({ sessionId: s.sessionId, requestId: rid(1), bet: 100, mode: 'spin' });
    const again = await service.play({ sessionId: s.sessionId, requestId: rid(1), bet: 100, mode: 'spin' });
    expect(again.round).toEqual(first.round);
    expect(await wallet.balance('p1')).toBe(first.round.balanceAfter);
    expect((await service.history(s.sessionId)).length).toBe(1);
  });

  it('a retry after a server restart still returns the same round', async () => {
    const a = setup();
    const s1 = await a.service.openSession('p1');
    const first = await a.service.play({ sessionId: s1.sessionId, requestId: rid(1), bet: 100, mode: 'spin' });
    const b = setup(OPERATOR_PROFILES.demo, { store: a.store, seed: 'other' });
    const s2 = await b.service.openSession('p1');
    const again = await b.service.play({ sessionId: s2.sessionId, requestId: rid(1), bet: 100, mode: 'spin' });
    expect(again.round.roundId).toBe(first.round.roundId);
    expect(await b.wallet.balance('p1')).toBe(first.round.balanceAfter);
  });

  it('returns an unfinished round when the player comes back', async () => {
    const { service } = setup();
    const s1 = await service.openSession('p1');
    expect(s1.pendingRound).toBeNull();
    const { round } = await service.play({ sessionId: s1.sessionId, requestId: rid(1), bet: 100, mode: 'buy' });
    const s2 = await service.openSession('p1');
    expect(s2.pendingRound?.roundId).toBe(round.roundId);
    expect(s2.balance).toBe(round.balanceAfter);
    await service.acknowledge(s2.sessionId, round.roundId);
    expect((await service.openSession('p1')).pendingRound).toBeNull();
    expect(await code(service.acknowledge(s2.sessionId, 'nope'))).toBe('ROUND_NOT_FOUND');
  });

  it('validates every request on the server', async () => {
    const { service } = setup();
    const s = await service.openSession('p1');
    const ok = { sessionId: s.sessionId, requestId: rid(1), bet: 100, mode: 'spin' as const };
    expect(await code(service.play({ ...ok, bet: 101 }))).toBe('INVALID_BET');
    expect(await code(service.play({ ...ok, bet: -100 }))).toBe('INVALID_BET');
    expect(await code(service.play({ ...ok, bet: NaN }))).toBe('INVALID_BET');
    expect(await code(service.play({ ...ok, mode: 'free' as never }))).toBe('INVALID_REQUEST');
    expect(await code(service.play({ ...ok, requestId: 'x' }))).toBe('INVALID_REQUEST');
    expect(await code(service.play({ ...ok, sessionId: 'unknown' }))).toBe('SESSION_NOT_FOUND');
    expect(await code(service.openSession('bad id!'))).toBe('INVALID_REQUEST');
    expect((await service.history(s.sessionId)).length).toBe(0);
  });

  it('refuses a bet the balance cannot cover and stores nothing', async () => {
    const poor: OperatorConfig = { ...OPERATOR_PROFILES.demo, demoBalance: 150 };
    const { service, wallet } = setup(poor);
    const s = await service.openSession('p1');
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(1), bet: 200, mode: 'spin' }))).toBe('INSUFFICIENT_FUNDS');
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(2), bet: 20, mode: 'buy' }))).toBe('INSUFFICIENT_FUNDS');
    expect(await wallet.balance('p1')).toBe(150);
    expect((await service.history(s.sessionId)).length).toBe(0);
  });

  it('enforces the jurisdiction profile (UK: no bonus buy, stake limit, minimum game cycle)', async () => {
    const { service, clock } = setup(OPERATOR_PROFILES.uk);
    const s = await service.openSession('p1');
    expect(s.game.mathId).toBe('LS2-94');
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(1), bet: 100, mode: 'buy' }))).toBe('FEATURE_DISABLED');
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(2), bet: 1000, mode: 'spin' }))).toBe('INVALID_BET');
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(3), bet: 100, mode: 'spin' }))).toBe('OK');
    clock.t += 2499;
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(4), bet: 100, mode: 'spin' }))).toBe('TOO_FAST');
    clock.t += 1;
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(4), bet: 100, mode: 'spin' }))).toBe('OK');
  });

  it('plays one round at a time per session, even when requests arrive together', async () => {
    const { service, wallet } = setup();
    const s = await service.openSession('p1');
    const results = await Promise.all(Array.from({ length: 25 }, (_, i) => service.play({ sessionId: s.sessionId, requestId: rid(i), bet: 100, mode: 'spin' })));
    expect(results.map((r) => r.round.seq)).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    for (let i = 1; i < results.length; i++) expect(results[i].round.balanceBefore).toBe(results[i - 1].round.balanceAfter);
    expect(await wallet.balance('p1')).toBe(results[24].round.balanceAfter);
  });

  it('hash-chains history so that edits are detected', async () => {
    const { service } = setup();
    const s = await service.openSession('p1');
    for (let i = 0; i < 12; i++) await service.play({ sessionId: s.sessionId, requestId: rid(i), bet: 100, mode: 'spin' });
    const rounds = (await service.history(s.sessionId, 50)).reverse();
    expect(await verifyChain(rounds)).toBe(0);
    const forged = structuredClone(rounds);
    forged[5].win += 1000;
    expect(await verifyChain(forged)).toBe(6);
    const reordered = structuredClone(rounds);
    [reordered[3], reordered[4]] = [reordered[4], reordered[3]];
    expect(await verifyChain(reordered)).toBeGreaterThan(0);
  });

  it('survives a wallet that applies the transaction but loses the answer', async () => {
    let failNext = false;
    let applied = 0;
    const { service, wallet } = setup(OPERATOR_PROFILES.demo, {
      wallet: (kv) => {
        const real = new DemoWallet(kv, 500000);
        return {
          balance: (p) => real.balance(p),
          async transact(tx: WalletTx) {
            const before = await real.balance(tx.playerId);
            const res = await real.transact(tx);
            if ((await real.balance(tx.playerId)) !== before || tx.debit === tx.credit) applied++;
            if (failNext) { failNext = false; throw new Error('timeout'); }
            return res;
          },
        };
      },
    });
    const s = await service.openSession('p1');
    failNext = true;
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(1), bet: 100, mode: 'spin' }))).toBe('WALLET_ERROR');
    // The outcome is already stored. The retry settles it and returns that same round.
    const retry = await service.play({ sessionId: s.sessionId, requestId: rid(1), bet: 100, mode: 'spin' });
    expect(retry.round.settled).toBe(true);
    expect(retry.round.seq).toBe(1);
    expect(await wallet.balance('p1')).toBe(500000 - 100 + retry.round.win);
    expect((await service.history(s.sessionId)).length).toBe(1);
  });

  it('settles a stored round when the player returns after a crash', async () => {
    let down = true;
    const store = new MemoryKeyValue();
    const make = () => setup(OPERATOR_PROFILES.demo, {
      store,
      wallet: (kv) => {
        const real = new DemoWallet(kv, 500000);
        return { balance: (p) => real.balance(p), transact: async (tx) => { if (down) throw new Error('down'); return real.transact(tx); } };
      },
    });
    const a = make();
    const s1 = await a.service.openSession('p1');
    expect(await code(a.service.play({ sessionId: s1.sessionId, requestId: rid(1), bet: 100, mode: 'spin' }))).toBe('WALLET_ERROR');
    const b = make();
    expect(await code(b.service.openSession('p1'))).toBe('WALLET_ERROR');
    down = false;
    const s2 = await b.service.openSession('p1');
    expect(s2.pendingRound?.settled).toBe(true);
    expect(s2.balance).toBe(500000 - 100 + s2.pendingRound!.win);
  });

  it('drops the round when the wallet declines the stake', async () => {
    const { service } = setup(OPERATOR_PROFILES.demo, {
      wallet: () => ({ balance: async () => 500000, transact: async () => { throw new WalletDeclined('limit reached'); } }),
    });
    const s = await service.openSession('p1');
    expect(await code(service.play({ sessionId: s.sessionId, requestId: rid(1), bet: 100, mode: 'spin' }))).toBe('INSUFFICIENT_FUNDS');
    expect((await service.history(s.sessionId)).length).toBe(0);
    expect((await service.openSession('p1')).pendingRound).toBeNull();
  });

  it('does not accept a bet list that would break exact accounting', () => {
    expect(() => setup({ ...OPERATOR_PROFILES.demo, bets: [25] })).toThrow(/multiple/);
  });
});
