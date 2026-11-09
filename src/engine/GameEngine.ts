import { CREDIT_SCALE, gameConfig } from '../config/gameConfig';
import { featureConfig } from '../config/featureConfig';
import type { SymbolId } from '../config/symbols';
import { playMidnightTrain } from '../features/MidnightTrain';
import { createDefaultRNG, type RNG } from './RNG';
import { resolveRound } from './RoundResolver';
import type { SpinOutcome } from './types';

export interface ForcedOutcome {
  base: SymbolId[];
  free?: SymbolId[][];
}

export interface EngineOptions {
  rng?: RNG;
  /** Starting balance in whole credits. */
  startingBalance?: number;
  /** Allow forced outcomes (development builds only). */
  allowForced?: boolean;
  validate?: boolean;
}

export class EngineError extends Error {}

/**
 * Authoritative game engine: owns the fictional-credit balance, the bet and
 * the outcome of every spin. Rendering never influences results.
 *
 * Lifecycle: spin() debits the bet exactly once and returns the complete
 * outcome (including every free spin). settle(id) credits that outcome's win
 * exactly once. No new spin, bet change or balance reset is possible while an
 * outcome is unsettled.
 *
 * All amounts are integers in centi-credits (1 credit = 100).
 */
export class GameEngine {
  private rng: RNG;
  private _balance: number;
  private _bet: number;
  private pending: SpinOutcome | null = null;
  private nextId = 1;
  private readonly allowForced: boolean;
  private readonly validate: boolean;
  private readonly start: number;

  constructor(opts: EngineOptions = {}) {
    this.rng = opts.rng ?? createDefaultRNG();
    this.start = Math.round((opts.startingBalance ?? gameConfig.startingBalance) * CREDIT_SCALE);
    this._balance = this.start;
    this._bet = gameConfig.defaultBet * CREDIT_SCALE;
    this.allowForced = opts.allowForced ?? false;
    this.validate = opts.validate ?? false;
  }

  get balance(): number {
    return this._balance;
  }
  get bet(): number {
    return this._bet;
  }
  get hasPending(): boolean {
    return this.pending !== null;
  }
  get pendingOutcome(): SpinOutcome | null {
    return this.pending;
  }
  get rngKind(): RNG['kind'] {
    return this.rng.kind;
  }

  canSpin(): boolean {
    return this.pending === null && this._balance >= this._bet;
  }

  /** Set the bet in whole credits. Must be one of gameConfig.bets. */
  setBet(credits: number): void {
    if (this.pending) throw new EngineError('Cannot change bet during an unresolved spin');
    if (!(gameConfig.bets as readonly number[]).includes(credits)) throw new EngineError(`Invalid bet ${credits}`);
    this._bet = credits * CREDIT_SCALE;
  }

  resetBalance(): void {
    if (this.pending) throw new EngineError('Cannot reset balance during an unresolved spin');
    this._balance = this.start;
  }

  /** Swap RNG (e.g. a seeded RNG for deterministic dev replays). */
  setRNG(rng: RNG): void {
    if (this.pending) throw new EngineError('Cannot change RNG during an unresolved spin');
    this.rng = rng;
  }

  spin(forced?: ForcedOutcome): SpinOutcome {
    if (this.pending) throw new EngineError('A spin is already unresolved');
    if (this._balance < this._bet) throw new EngineError('Insufficient credits');
    if (forced && !this.allowForced) throw new EngineError('Forced outcomes are disabled');

    const bet = this._bet;
    const balanceBefore = this._balance;
    this._balance -= bet;
    const cap = bet * gameConfig.maxWinMultiplier;

    const base = resolveRound(this.rng, {
      mode: 'base',
      bet,
      haunted: new Set(),
      winCapRemaining: cap,
      forcedGrid: forced?.base,
      validate: this.validate,
    });
    let bonus = null;
    if (!base.hitMaxWin && base.scatterCount >= featureConfig.midnightTrain.triggerCount) {
      bonus = playMidnightTrain(this.rng, bet, base.scatterCount, cap - base.win, {
        forcedGrids: forced?.free,
        validate: this.validate,
      });
    }
    const totalWin = Math.min(cap, base.win + (bonus?.win ?? 0));
    const outcome: SpinOutcome = {
      id: this.nextId++,
      bet,
      base,
      bonus,
      totalWin,
      balanceBefore,
      balanceAfterDebit: this._balance,
      forced: !!forced,
    };
    this.pending = outcome;
    return outcome;
  }

  /** Credit an outcome. Returns false (and credits nothing) if it is not the pending outcome. */
  settle(id: number): boolean {
    if (!this.pending || this.pending.id !== id) return false;
    this._balance += this.pending.totalWin;
    this.pending = null;
    return true;
  }
}
