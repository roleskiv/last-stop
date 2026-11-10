import { CryptoRng, SeededRng } from '../../math/rng.ts';
import type { RoundMode } from '../../math/types.ts';
import { GameService } from '../../server/service.ts';
import { DemoWallet, MemoryKeyValue, type KeyValue } from '../../server/wallet.ts';
import type { OperatorConfig } from '../../shared/operator.ts';
import type { GameClient, PlayResponse, RoundEnvelope, SessionResponse } from '../../shared/protocol.ts';

/** localStorage when it is available, memory otherwise (private windows, sandboxed frames). */
class BrowserStore implements KeyValue {
  private readonly fallback = new MemoryKeyValue();
  private readonly prefix: string;
  constructor(prefix: string) { this.prefix = prefix; }
  get(key: string): string | null {
    try { return globalThis.localStorage.getItem(this.prefix + key) ?? this.fallback.get(key); } catch { return this.fallback.get(key); }
  }
  set(key: string, value: string): void {
    this.fallback.set(key, value);
    try { globalThis.localStorage.setItem(this.prefix + key, value); } catch { /* memory only */ }
  }
}

/**
 * Demo transport: the real game service running inside the page with a play-money wallet.
 * It exists so the game can be shown without a server. Real-money play always uses
 * RemoteClient, where outcomes are produced on the operator's game server.
 */
export class LocalClient implements GameClient {
  private readonly service: GameService;
  private readonly wallet: DemoWallet;
  private sessionId = '';
  private readonly playerId = 'demo';

  /** `qaSeed` makes the demo repeatable for testing. It only exists in this offline demo transport. */
  constructor(operator: OperatorConfig, qaSeed?: string) {
    const store = new BrowserStore(`laststop2:${operator.profile}:`);
    this.wallet = new DemoWallet(store, operator.demoBalance);
    this.service = new GameService({ operator, store, wallet: this.wallet, rng: qaSeed ? new SeededRng(qaSeed) : new CryptoRng(), historySize: 30 });
  }

  async open(): Promise<SessionResponse> {
    const res = await this.service.openSession(this.playerId);
    this.sessionId = res.sessionId;
    return res;
  }

  play(bet: number, mode: RoundMode): Promise<PlayResponse> {
    return this.service.play({ sessionId: this.sessionId, requestId: globalThis.crypto.randomUUID(), bet, mode });
  }

  acknowledge(roundId: string): Promise<void> {
    return this.service.acknowledge(this.sessionId, roundId);
  }

  history(limit: number): Promise<RoundEnvelope[]> {
    return this.service.history(this.sessionId, limit);
  }

  /** Demo only. */
  async resetBalance(): Promise<number> {
    this.wallet.reset(this.playerId);
    return this.wallet.balance(this.playerId);
  }
}
