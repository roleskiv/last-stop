import { getMath, type MathConfig } from '../math/config.ts';
import { Engine } from '../math/engine.ts';
import type { Rng } from '../math/rng.ts';
import type { RoundMode } from '../math/types.ts';
import type { OperatorConfig } from '../shared/operator.ts';
import {
  GameError, type PlayRequest, type PlayResponse, type PublicGameInfo, type RoundEnvelope,
  type SessionResponse, type SessionStats,
} from '../shared/protocol.ts';
import { WalletDeclined, type KeyValue, type Wallet } from './wallet.ts';

export interface ServiceDeps {
  wallet: Wallet;
  /** Durable storage for rounds. A database in production. */
  store: KeyValue;
  rng: Rng;
  operator: OperatorConfig;
  now?: () => number;
  uuid?: () => string;
  /** Rounds kept per player for the history screen. */
  historySize?: number;
}

interface Session {
  id: string;
  playerId: string;
  stats: SessionStats;
  lastPlayAt: number;
  requests: Map<string, RoundEnvelope>;
  queue: Promise<unknown>;
}

/**
 * The authoritative game service. It runs unchanged in Node (reference RGS) and in the
 * browser (offline demo). The client never decides an outcome: it sends a bet, receives a
 * finished round record and plays it back.
 *
 * Guarantees:
 *  - A round is resolved, written to the store and settled with the wallet before the
 *    response is sent. A lost response cannot lose or duplicate money: the client retries
 *    with the same requestId and gets the same round back.
 *  - A round the player has not seen to the end is returned again when a session opens.
 *  - Bets, features and pacing are validated here against the operator configuration.
 *  - Rounds are hash-chained per player, so stored history is tamper evident.
 */
export class GameService {
  private readonly deps: Required<Omit<ServiceDeps, 'historySize'>> & { historySize: number };
  private readonly math: MathConfig;
  private readonly engine: Engine;
  private readonly sessions = new Map<string, Session>();

  constructor(deps: ServiceDeps) {
    this.deps = {
      now: () => Date.now(),
      uuid: () => globalThis.crypto.randomUUID(),
      historySize: 50,
      ...deps,
    };
    this.math = getMath(deps.operator.mathId);
    this.engine = new Engine(this.math);
    for (const bet of deps.operator.bets) {
      if (!Number.isSafeInteger(bet) || bet <= 0 || bet % this.math.coinsPerBet !== 0) {
        throw new Error(`Bet ${bet} is not a positive multiple of ${this.math.coinsPerBet} minor units`);
      }
    }
  }

  gameInfo(): PublicGameInfo {
    const m = this.math;
    return {
      mathId: m.id, rtp: m.targetRtp, coinsPerBet: m.coinsPerBet, maxWinBets: m.maxWinBets,
      buyPriceBets: m.buyPriceBets, pay: m.pay, ladder: m.ladder, freeSpins: m.freeSpins,
      retrigger: m.retrigger, maxFreeSpins: m.maxFreeSpins,
    };
  }

  async openSession(playerId: string): Promise<SessionResponse> {
    if (typeof playerId !== 'string' || !/^[\w.:-]{1,64}$/.test(playerId)) {
      throw new GameError('INVALID_REQUEST', 'Invalid player id');
    }
    const id = this.deps.uuid();
    const session: Session = {
      id, playerId, lastPlayAt: 0, requests: new Map(), queue: Promise.resolve(),
      stats: { startedAt: this.deps.now(), rounds: 0, wagered: 0, won: 0 },
    };
    this.sessions.set(id, session);
    const history = this.loadHistory(playerId);
    const last = history[history.length - 1];
    if (last && !last.settled) {
      try { await this.settle(playerId, history); } catch (err) { if (!(err instanceof GameError && err.code === 'INSUFFICIENT_FUNDS')) throw err; }
    }
    const pending = history[history.length - 1];
    return {
      sessionId: id,
      balance: await this.deps.wallet.balance(playerId),
      operator: this.deps.operator,
      game: this.gameInfo(),
      stats: { ...session.stats },
      pendingRound: pending && !pending.acknowledged ? pending : null,
    };
  }

  async play(req: PlayRequest): Promise<PlayResponse> {
    const session = this.session(req?.sessionId);
    // One round at a time per session.
    const run = session.queue.then(() => this.playLocked(session, req));
    session.queue = run.catch(() => undefined);
    return run;
  }

  private async playLocked(session: Session, req: PlayRequest): Promise<PlayResponse> {
    const { operator, wallet, now } = this.deps;
    if (typeof req.requestId !== 'string' || req.requestId.length < 8 || req.requestId.length > 64) {
      throw new GameError('INVALID_REQUEST', 'Missing request id');
    }
    const repeat = session.requests.get(req.requestId);
    if (repeat) return { round: repeat, stats: { ...session.stats } };

    const mode: RoundMode = req.mode;
    if (mode !== 'spin' && mode !== 'buy') throw new GameError('INVALID_REQUEST', 'Unknown play mode');
    if (mode === 'buy' && !operator.features.buy) throw new GameError('FEATURE_DISABLED', 'The bonus buy is not available');
    if (!operator.bets.includes(req.bet)) throw new GameError('INVALID_BET', 'This bet is not available');
    const t = now();
    if (operator.minSpinMs > 0 && t - session.lastPlayAt < operator.minSpinMs) {
      throw new GameError('TOO_FAST', 'Please wait for the current game cycle to finish');
    }

    const history = this.loadHistory(session.playerId);
    const prev = history[history.length - 1];
    // A round whose settlement never got an answer is settled before anything else happens.
    if (prev && !prev.settled) await this.settle(session.playerId, history);
    // Idempotency also survives a restart: the request id is stored with the round.
    const stored = history.find((r) => r.requestId === req.requestId);
    if (stored) return { round: stored, stats: { ...session.stats } };

    const stake = mode === 'buy' ? req.bet * this.math.buyPriceBets : req.bet;
    const balanceBefore = await wallet.balance(session.playerId);
    if (stake > balanceBefore) throw new GameError('INSUFFICIENT_FUNDS', 'Not enough balance for this bet');

    const record = this.engine.play(this.deps.rng, mode);
    // Pays are whole coins and the bet is a whole number of coins, so this is exact.
    const win = record.coins * (req.bet / this.math.coinsPerBet);
    const roundId = this.deps.uuid();

    // Write ahead: the outcome is durable before any money moves. If the process dies
    // between here and the wallet's answer, the round is settled when the player returns
    // (the wallet transaction is idempotent on the round id).
    if (prev && !prev.acknowledged) prev.acknowledged = true;
    const round: RoundEnvelope = {
      roundId, requestId: req.requestId, seq: (prev?.seq ?? 0) + 1, time: t, bet: req.bet, stake, win, mode, record,
      balanceBefore, balanceAfter: balanceBefore - stake + win, hash: '', acknowledged: false, settled: false,
    };
    round.hash = await roundHash(prev?.hash ?? '', round);
    history.push(round);
    this.saveHistory(session.playerId, history);

    await this.settle(session.playerId, history);

    session.lastPlayAt = t;
    session.stats.rounds++;
    session.stats.wagered += stake;
    session.stats.won += win;
    session.requests.set(req.requestId, round);
    if (session.requests.size > 8) session.requests.delete(session.requests.keys().next().value!);
    return { round, stats: { ...session.stats } };
  }

  /** Settle the newest round with the wallet. Safe to call again after a failure. */
  private async settle(playerId: string, history: RoundEnvelope[]): Promise<void> {
    const round = history[history.length - 1];
    try {
      const { balance } = await this.deps.wallet.transact({
        txId: `round:${round.roundId}`, playerId, roundId: round.roundId, debit: round.stake, credit: round.win,
      });
      round.balanceAfter = balance;
      round.settled = true;
      this.saveHistory(playerId, history);
    } catch (err) {
      if (err instanceof WalletDeclined) {
        // The wallet refused the stake, so no money moved: the round never happened.
        history.pop();
        this.saveHistory(playerId, history);
        throw new GameError('INSUFFICIENT_FUNDS', 'Not enough balance for this bet');
      }
      // No answer or an unknown answer: the round stays stored and is settled on the next call.
      throw new GameError('WALLET_ERROR', 'The wallet could not process the bet');
    }
  }

  async acknowledge(sessionId: string, roundId: string): Promise<void> {
    const session = this.session(sessionId);
    const history = this.loadHistory(session.playerId);
    const round = history.find((r) => r.roundId === roundId);
    if (!round) throw new GameError('ROUND_NOT_FOUND', 'Unknown round');
    if (!round.acknowledged) {
      round.acknowledged = true;
      this.saveHistory(session.playerId, history);
    }
  }

  async history(sessionId: string, limit = 25): Promise<RoundEnvelope[]> {
    const session = this.session(sessionId);
    const n = Math.max(1, Math.min(this.deps.historySize, Math.floor(limit) || 25));
    return this.loadHistory(session.playerId).slice(-n).reverse();
  }

  private session(id: string): Session {
    const s = typeof id === 'string' ? this.sessions.get(id) : undefined;
    if (!s) throw new GameError('SESSION_NOT_FOUND', 'The session has expired. Please reload the game.');
    return s;
  }

  private loadHistory(playerId: string): RoundEnvelope[] {
    const raw = this.deps.store.get(`rounds:${this.math.id}:${playerId}`);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as RoundEnvelope[]) : [];
    } catch {
      return [];
    }
  }

  private saveHistory(playerId: string, history: RoundEnvelope[]): void {
    const keep = history.slice(-this.deps.historySize);
    this.deps.store.set(`rounds:${this.math.id}:${playerId}`, JSON.stringify(keep));
  }
}

/** Verify a player's stored history. Returns the sequence number of the first broken link, or 0. */
export async function verifyChain(rounds: RoundEnvelope[]): Promise<number> {
  for (let i = 1; i < rounds.length; i++) {
    if ((await roundHash(rounds[i - 1].hash, rounds[i])) !== rounds[i].hash) return rounds[i].seq;
  }
  return 0;
}

export async function roundHash(prevHash: string, r: RoundEnvelope): Promise<string> {
  const body = JSON.stringify([prevHash, r.roundId, r.seq, r.time, r.bet, r.stake, r.win, r.mode, r.record]);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
