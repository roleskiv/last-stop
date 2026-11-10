/**
 * Wallet port. In production this is the operator's wallet API (seamless wallet):
 * the game never holds funds. `transact` must be idempotent on `txId`.
 */
export interface WalletTx {
  txId: string;
  playerId: string;
  roundId: string;
  debit: number;
  credit: number;
}

export interface Wallet {
  balance(playerId: string): Promise<number>;
  /** Debit the stake and credit the win in one atomic step. Throws WalletDeclined if funds are short. */
  transact(tx: WalletTx): Promise<{ balance: number }>;
}

export class WalletDeclined extends Error {}

export interface KeyValue {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Play-money wallet for demos and tests. */
export class DemoWallet implements Wallet {
  private readonly applied = new Map<string, number>();
  private readonly kv: KeyValue;
  private readonly initial: number;

  constructor(kv: KeyValue, initial: number) {
    this.kv = kv;
    this.initial = initial;
  }

  async balance(playerId: string): Promise<number> {
    const raw = this.kv.get(`wallet:${playerId}`);
    const n = raw === null ? NaN : Number(raw);
    return Number.isSafeInteger(n) && n >= 0 ? n : this.initial;
  }

  async transact(tx: WalletTx): Promise<{ balance: number }> {
    const done = this.applied.get(tx.txId);
    if (done !== undefined) return { balance: done };
    if (!Number.isSafeInteger(tx.debit) || !Number.isSafeInteger(tx.credit) || tx.debit < 0 || tx.credit < 0) {
      throw new Error('wallet: invalid amount');
    }
    const before = await this.balance(tx.playerId);
    if (tx.debit > before) throw new WalletDeclined('insufficient funds');
    const after = before - tx.debit + tx.credit;
    this.kv.set(`wallet:${tx.playerId}`, String(after));
    this.applied.set(tx.txId, after);
    return { balance: after };
  }

  /** Demo only: put the balance back to its starting value. */
  reset(playerId: string): void {
    this.kv.set(`wallet:${playerId}`, String(this.initial));
  }
}

export class MemoryKeyValue implements KeyValue {
  private readonly m = new Map<string, string>();
  get(key: string): string | null { return this.m.get(key) ?? null; }
  set(key: string, value: string): void { this.m.set(key, value); }
}
