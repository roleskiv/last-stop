import type { OperatorConfig } from './operator.ts';
import type { RoundMode, RoundRecord } from '../math/types.ts';

/** Wire protocol between the game client and the game service. All money is in minor units. */

export interface PublicGameInfo {
  mathId: string;
  /** Theoretical return to player of the active variant, in percent. */
  rtp: number;
  coinsPerBet: number;
  maxWinBets: number;
  buyPriceBets: number;
  pay: number[][];
  ladder: number[];
  freeSpins: number[];
  retrigger: number[];
  maxFreeSpins: number;
}

export interface SessionStats {
  startedAt: number;
  rounds: number;
  wagered: number;
  won: number;
}

export interface RoundEnvelope {
  roundId: string;
  /** The client's request id, kept so that a retry always returns this round. */
  requestId: string;
  /** Sequence number of the round within the player's history. */
  seq: number;
  time: number;
  bet: number;
  /** What the player paid: the bet, or the bet times the buy price. */
  stake: number;
  win: number;
  mode: RoundMode;
  record: RoundRecord;
  balanceBefore: number;
  balanceAfter: number;
  /** SHA-256 over the previous round's hash and this round's content. */
  hash: string;
  acknowledged: boolean;
  /** False while the wallet has not confirmed the round's transaction. */
  settled: boolean;
}

export interface SessionResponse {
  sessionId: string;
  balance: number;
  operator: OperatorConfig;
  game: PublicGameInfo;
  stats: SessionStats;
  /** A round the player paid for but never saw to the end. The client must present it first. */
  pendingRound: RoundEnvelope | null;
}

export interface PlayRequest {
  sessionId: string;
  /** Client-generated id. Sending the same id again returns the same round (safe retry). */
  requestId: string;
  bet: number;
  mode: RoundMode;
}

export interface PlayResponse {
  round: RoundEnvelope;
  stats: SessionStats;
}

export type ErrorCode =
  | 'INSUFFICIENT_FUNDS' | 'INVALID_BET' | 'INVALID_REQUEST' | 'FEATURE_DISABLED'
  | 'SESSION_NOT_FOUND' | 'ROUND_NOT_FOUND' | 'TOO_FAST' | 'WALLET_ERROR' | 'NETWORK';

export class GameError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** What the client needs from a game service, local or remote. */
export interface GameClient {
  open(): Promise<SessionResponse>;
  play(bet: number, mode: RoundMode): Promise<PlayResponse>;
  acknowledge(roundId: string): Promise<void>;
  history(limit: number): Promise<RoundEnvelope[]>;
}
