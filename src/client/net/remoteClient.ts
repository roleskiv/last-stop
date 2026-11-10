import type { RoundMode } from '../../math/types.ts';
import { GameError, type ErrorCode, type GameClient, type PlayResponse, type RoundEnvelope, type SessionResponse } from '../../shared/protocol.ts';

/** Talks to a game server over HTTP. Launch with ?rgs=<base url>&token=<launch token>. */
export class RemoteClient implements GameClient {
  private sessionId = '';
  private readonly base: string;
  private readonly token: string;

  constructor(base: string, token: string) {
    this.base = base.replace(/\/+$/, '');
    this.token = token;
  }

  private async post<T>(path: string, body: unknown, attempts = 1): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        const res = await fetch(`${this.base}/api/${path}`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal,
        });
        clearTimeout(timer);
        const json = await res.json();
        if (!res.ok) throw new GameError((json?.error?.code ?? 'NETWORK') as ErrorCode, json?.error?.message ?? 'Request failed');
        return json as T;
      } catch (err) {
        if (err instanceof GameError && err.code !== 'NETWORK') throw err;
        lastError = err;
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
    throw lastError instanceof GameError ? lastError : new GameError('NETWORK', 'Connection lost. Please check your connection.');
  }

  async open(): Promise<SessionResponse> {
    const res = await this.post<SessionResponse>('session', { token: this.token }, 2);
    this.sessionId = res.sessionId;
    return res;
  }

  play(bet: number, mode: RoundMode): Promise<PlayResponse> {
    // The same requestId is sent on every retry, so a retried bet can never be charged twice.
    const requestId = globalThis.crypto.randomUUID();
    return this.post<PlayResponse>('play', { sessionId: this.sessionId, requestId, bet, mode }, 3);
  }

  async acknowledge(roundId: string): Promise<void> {
    await this.post('ack', { sessionId: this.sessionId, roundId }, 2);
  }

  history(limit: number): Promise<RoundEnvelope[]> {
    return this.post<RoundEnvelope[]>('history', { sessionId: this.sessionId, limit }, 2);
  }
}
