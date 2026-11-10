import type { RoundMode } from '../../math/types.ts';
import { GameError, type GameClient, type RoundEnvelope, type SessionStats } from '../../shared/protocol.ts';
import { audio } from '../audio/audio.ts';
import { LocalClient } from '../net/localClient.ts';
import { Presenter } from '../stage/presenter.ts';
import type { Stage } from '../stage/stage.ts';
import { anim } from './anim.ts';
import { store, type AutoplayState } from './store.ts';

/** A pleasant resting board with no clusters on it. */
const ATTRACT_GRID = [
  0, 5, 2, 7, 1,   3, 8, 0, 4, 6,   1, 2, 9, 3, 0,
  4, 7, 1, 6, 5,   2, 0, 6, 8, 3,   5, 4, 1, 0, 7,
];

const ERROR_TEXT: Record<string, [string, string]> = {
  INSUFFICIENT_FUNDS: ['Not enough balance', 'Your balance is too low for this bet. Lower the bet to keep playing.'],
  TOO_FAST: ['One moment', 'The previous game cycle has not finished yet.'],
  FEATURE_DISABLED: ['Not available', 'This feature is not available here.'],
  INVALID_BET: ['Bet not available', 'Please choose another bet.'],
  SESSION_NOT_FOUND: ['Session expired', 'Please reload the game to continue.'],
  NETWORK: ['Connection lost', 'We could not reach the game server. If a bet was placed, the round is safe and will be shown when you reconnect.'],
  WALLET_ERROR: ['Wallet unavailable', 'The bet could not be placed. No money was taken.'],
};

/** Game flow: owns the session, runs spins and autoplay, and keeps the UI state honest. */
export class Controller {
  private readonly stage: Stage;
  private readonly client: GameClient;
  private readonly presenter: Presenter;
  private lastSpinAt = 0;
  private lastGrid = ATTRACT_GRID;
  private realityAt = 0;
  private autoTimer = 0;

  constructor(stage: Stage, client: GameClient) {
    this.stage = stage;
    this.client = client;
    this.presenter = new Presenter(stage);
  }

  get isDemoWallet(): boolean { return this.client instanceof LocalClient; }

  /** Open the session. Throws if the server cannot be reached. */
  async open(): Promise<RoundEnvelope | null> {
    const res = await this.client.open();
    let saved: { bet?: number; turbo?: boolean; sound?: boolean; music?: boolean; volume?: number } = {};
    try { saved = JSON.parse(localStorage.getItem('laststop2:prefs') ?? '{}'); } catch { /* defaults */ }
    const op = res.operator;
    store.set({
      operator: op, game: res.game, balance: res.balance, stats: res.stats,
      bet: op.bets.includes(saved.bet ?? -1) ? saved.bet! : op.defaultBet,
      turbo: op.features.turbo && saved.turbo === true,
      sound: saved.sound !== false, music: saved.music !== false,
      volume: typeof saved.volume === 'number' ? Math.min(1, Math.max(0, saved.volume)) : 0.8,
    });
    this.realityAt = Date.now();
    window.setInterval(() => this.checkReality(), 15000);
    return res.pendingRound;
  }

  showAttract(): void {
    this.stage.grid.setGrid(ATTRACT_GRID);
  }

  savePrefs(): void {
    const s = store.get();
    try {
      localStorage.setItem('laststop2:prefs', JSON.stringify({ bet: s.bet, turbo: s.turbo, sound: s.sound, music: s.music, volume: s.volume }));
    } catch { /* not persisted */ }
    audio.applySettings();
  }

  /** Finish a round that was paid for but never shown (after a reload or lost connection). */
  async resume(round: RoundEnvelope): Promise<void> {
    store.set({ phase: 'spinning', message: 'Resuming your unfinished round', balance: round.balanceBefore - round.stake, bet: store.get().operator!.bets.includes(round.bet) ? round.bet : store.get().bet });
    this.applySpeed();
    await this.presenter.playRound(round);
    await this.finish(round);
    store.set({ message: '' });
  }

  private applySpeed(fast = false): void {
    anim.timeScale = fast ? 6 : store.get().turbo ? 1.8 : 1;
  }

  setBet(bet: number): void {
    const s = store.get();
    if (s.phase !== 'idle' || !s.operator!.bets.includes(bet)) return;
    store.set({ bet });
    this.savePrefs();
    audio.play('click');
  }

  stepBet(dir: number): void {
    const s = store.get();
    const bets = s.operator!.bets;
    const i = bets.indexOf(s.bet) + dir;
    if (i >= 0 && i < bets.length) this.setBet(bets[i]);
  }

  toggleTurbo(): void {
    const s = store.get();
    if (!s.operator!.features.turbo) return;
    store.set({ turbo: !s.turbo });
    this.savePrefs();
    if (store.get().phase === 'idle') this.applySpeed();
    else if (anim.timeScale < 6) this.applySpeed();
    audio.play('click');
  }

  /** The main button: spin when idle, skip while a spin is playing. */
  primary(): void {
    const s = store.get();
    if (s.modal || s.error) return;
    this.stage.tap();
    if (s.phase === 'idle') {
      if (s.autoplay) this.stopAutoplay();
      else void this.spin('spin');
    } else if (s.phase === 'spinning' && s.canSkip) {
      store.set({ canSkip: false });
      this.applySpeed(true);
    }
  }

  async spin(mode: RoundMode): Promise<void> {
    const s = store.get();
    if (s.phase !== 'idle' || s.replaying) return;
    const game = s.game!, op = s.operator!;
    const stake = mode === 'buy' ? s.bet * game.buyPriceBets : s.bet;
    if (stake > s.balance) {
      this.stopAutoplay();
      this.fail(new GameError('INSUFFICIENT_FUNDS', ''));
      return;
    }
    store.set({ phase: 'spinning', win: 0, balance: s.balance - stake, modal: null, canSkip: false, message: '' });
    this.applySpeed();
    audio.play('spin');

    const sinceLast = Date.now() - this.lastSpinAt;
    if (op.minSpinMs > 0 && sinceLast < op.minSpinMs) await new Promise((r) => setTimeout(r, op.minSpinMs - sinceLast));
    this.lastSpinAt = Date.now();

    const out = this.stage.grid.dropOut();
    let round: RoundEnvelope;
    let stats: SessionStats;
    try {
      const res = await this.client.play(s.bet, mode);
      round = res.round;
      stats = res.stats;
      // The stake shows at once. The win is added when the player has seen it.
      store.set({ stats: { ...stats, won: stats.won - round.win } });
    } catch (err) {
      await out;
      this.stage.grid.setGrid(this.lastGrid);
      store.set({ phase: 'idle', balance: s.balance });
      this.stopAutoplay();
      this.fail(err);
      return;
    }
    await out;
    store.set({ canSkip: op.features.skip });
    await this.presenter.playRound(round);
    store.set({ stats });
    await this.finish(round);
  }

  private async finish(round: RoundEnvelope): Promise<void> {
    const last = round.record.free.length ? round.record.free[round.record.free.length - 1] : round.record.base;
    const cascades = last.steps.filter((x) => x.t === 'cascade');
    this.lastGrid = cascades.length ? (cascades[cascades.length - 1] as { grid: number[] }).grid : last.grid;
    store.set({ balance: round.balanceAfter, win: round.win, phase: 'idle', canSkip: false, bonus: null });
    this.applySpeed();
    try { await this.client.acknowledge(round.roundId); } catch { /* it will be offered again on the next launch */ }
    this.afterRound(round);
  }

  private afterRound(round: RoundEnvelope): void {
    const s = store.get();
    const a = s.autoplay;
    if (!a) return;
    const left = a.left - 1;
    const lost = a.startBalance - s.balance;
    const stop = left <= 0
      || (a.lossLimit > 0 && lost >= a.lossLimit)
      || (a.singleWinLimit > 0 && round.win >= a.singleWinLimit)
      || (s.operator!.autoplay.stopOnBonus && round.record.free.length > 0)
      || s.bet > s.balance;
    if (stop) { this.stopAutoplay(); return; }
    store.set({ autoplay: { ...a, left } });
    this.autoTimer = window.setTimeout(() => { if (store.get().autoplay) void this.spin('spin'); }, 420);
  }

  startAutoplay(spins: number, lossLimit: number, singleWinLimit: number): void {
    const s = store.get();
    const op = s.operator!;
    if (!op.features.autoplay || s.phase !== 'idle') return;
    if (op.autoplay.requireLossLimit && lossLimit <= 0) return;
    const auto: AutoplayState = { left: spins, lossLimit, singleWinLimit, startBalance: s.balance };
    store.set({ autoplay: auto, modal: null });
    void this.spin('spin');
  }

  stopAutoplay(): void {
    window.clearTimeout(this.autoTimer);
    if (store.get().autoplay) store.set({ autoplay: null });
  }

  buyBonus(): void {
    const s = store.get();
    if (!s.operator!.features.buy || s.phase !== 'idle') return;
    this.stopAutoplay();
    void this.spin('buy');
  }

  async openHistory(): Promise<void> {
    store.set({ modal: 'history' });
    try { store.set({ history: await this.client.history(25) }); } catch (err) { this.fail(err); }
  }

  /** Show a past round again. Balance and statistics are not touched. */
  async replay(round: RoundEnvelope): Promise<void> {
    const s = store.get();
    if (s.phase !== 'idle') return;
    this.stopAutoplay();
    const keep = { balance: s.balance, win: s.win, bet: s.bet };
    store.set({ modal: null, replaying: true, phase: 'spinning', canSkip: true, bet: round.bet, balance: round.balanceBefore - round.stake });
    this.applySpeed();
    await this.stage.grid.dropOut();
    await this.presenter.playRound(round);
    this.stage.grid.setGrid(this.lastGrid);
    store.set({ ...keep, replaying: false, phase: 'idle', canSkip: false, bonus: null });
    this.applySpeed();
  }

  async resetDemoBalance(): Promise<void> {
    if (this.client instanceof LocalClient && store.get().phase === 'idle') {
      store.set({ balance: await this.client.resetBalance(), error: null });
    }
  }

  private checkReality(): void {
    const s = store.get();
    const minutes = s.operator?.realityCheckMinutes ?? 0;
    if (minutes <= 0 || s.phase !== 'idle' || s.modal === 'reality') return;
    if (Date.now() - this.realityAt >= minutes * 60000) {
      this.stopAutoplay();
      store.set({ modal: 'reality' });
    }
  }

  acknowledgeReality(): void {
    this.realityAt = Date.now();
    store.set({ modal: null });
  }

  fail(err: unknown): void {
    const code = err instanceof GameError ? err.code : 'NETWORK';
    const [title, text] = ERROR_TEXT[code] ?? ['Something went wrong', 'Please reload the game.'];
    store.set({ error: { title, text, fatal: code === 'SESSION_NOT_FOUND' } });
  }
}
