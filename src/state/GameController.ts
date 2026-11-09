import { AudioManager } from '../audio/AudioManager';
import { CREDIT_SCALE, gameConfig, type WinTier } from '../config/gameConfig';
import { featureConfig } from '../config/featureConfig';
import { GameEngine, type ForcedOutcome } from '../engine/GameEngine';
import { SeededRNG, CryptoRNG } from '../engine/RNG';
import type { SpinOutcome } from '../engine/types';
import { AnimationController } from '../rendering/AnimationController';
import { GameRenderer } from '../rendering/GameRenderer';
import { GameStateMachine, type GameState } from './GameStateMachine';
import { Store, type UIState } from './store';

const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Glue between engine (math + credits), renderer (Pixi), audio and React UI.
 * Flow per paid spin: engine.spin() debits and resolves everything, the
 * presenter animates the event list, then engine.settle() credits once.
 */
export class GameController {
  readonly engine: GameEngine;
  readonly renderer = new GameRenderer();
  readonly audio = new AudioManager();
  readonly fsm = new GameStateMachine();
  readonly store: Store;
  private presenter!: AnimationController;
  private resolvers: { banner?: () => void; intro?: () => void; outro?: () => void } = {};
  private bannerKey = 0;
  lastOutcome: SpinOutcome | null = null;
  readonly log: string[] = [];
  private nextForced: ForcedOutcome | null = null;

  constructor() {
    this.engine = new GameEngine({ allowForced: import.meta.env.DEV, validate: import.meta.env.DEV });
    this.store = new Store(this.initialState());
    this.fsm.onChange((s) => this.store.set({ gameState: s }));
  }

  private initialState(): UIState {
    return {
      gameState: 'LOADING',
      loadingProgress: 0,
      balance: this.engine.balance,
      bet: this.engine.bet,
      lastWin: 0,
      spinWin: 0,
      turbo: false,
      autoplayRemaining: 0,
      autoplayActive: false,
      freeSpins: null,
      haunted: 0,
      hauntedCap: featureConfig.phantomPlatforms.baseCap,
      stationProgress: 0,
      info: '',
      banner: null,
      bonusIntro: null,
      bonusOutro: null,
      modal: null,
      canSkip: false,
      message: null,
      reducedMotion: prefersReducedMotion(),
      orientation: 'landscape',
    };
  }

  private initPromise: Promise<void> | null = null;

  /** Idempotent (React StrictMode mounts effects twice in development). */
  init(host: HTMLElement): Promise<void> {
    this.initPromise ??= this.doInit(host);
    return this.initPromise;
  }

  private async doInit(host: HTMLElement): Promise<void> {
    try {
      this.audio.load();
      await this.renderer.init(host, (p) => this.store.set({ loadingProgress: p }));
      this.renderer.setReducedMotion(this.store.get().reducedMotion);
      this.presenter = new AnimationController(this.renderer, {
        state: (s) => this.setState(s),
        spinWin: (w) => this.store.set({ spinWin: w }),
        haunted: (n, cap) => {
          this.store.set({ haunted: n, hauntedCap: cap });
          this.renderer.panel.setCap(cap);
          this.renderer.panel.setHaunted(n);
        },
        stations: (lit, label) => this.renderer.panel.setStations(lit, label),
        freeSpins: (info) => this.store.set({ freeSpins: info }),
        info: (text) => this.flashInfo(text),
        sound: (k, o) => this.audio.play(k, o),
        music: (m) => this.audio.setMusic(m),
        banner: (tier, amount) => this.showBanner(tier, amount),
        bonusIntro: (spins, scatters) =>
          new Promise<void>((resolve) => {
            this.resolvers.intro = resolve;
            this.store.set({ bonusIntro: { spins, scatters, key: Date.now() } });
          }),
        bonusOutro: (win, spins) =>
          new Promise<void>((resolve) => {
            this.resolvers.outro = resolve;
            this.store.set({ bonusOutro: { win, spins, key: Date.now() } });
          }),
        canSkip: (on) => this.store.set({ canSkip: on }),
      });
      this.renderer.reels.setGrid(this.startingGrid());
      this.renderer.panel.setStations(0, 'Land 3 trains to board');
      this.renderer.panel.setInfo('Clusters of 5+ pay.\nWilds substitute.');
      this.store.set({ orientation: this.renderer.orientation });
      window.addEventListener('resize', this.onResize);
      this.setState('READY');
    } catch (err) {
      console.error(err);
      this.store.set({ message: 'The station failed to load. Please reload the page.' });
      this.setState('ERROR');
    }
  }

  private onResize = () => this.store.set({ orientation: this.renderer.orientation });

  private startingGrid() {
    // A calm decorative grid for the first screen (not an outcome).
    const rows = ['RWLGKT', 'KPTYWG', 'LGKRPY', 'WTYLGK', 'PKGWTR'];
    const map: Record<string, number> = { T: 0, K: 1, L: 2, Y: 3, W: 4, G: 5, P: 6, R: 7 };
    return Array.from({ length: 30 }, (_, i) => ({ id: 100000 + i, sym: map[rows[i % 5][Math.floor(i / 5)]] as 0 }));
  }

  private setState(s: GameState): void {
    try {
      this.fsm.to(s);
    } catch (e) {
      console.warn(e);
      this.log.push(`state warning: ${(e as Error).message}`);
    }
  }

  private flashInfo(text: string): void {
    this.renderer.panel.setInfo(text);
    this.store.set({ info: text });
  }

  /** First user gesture: unlock audio. */
  unlockAudio(): void {
    this.audio.unlock();
  }

  get busy(): boolean {
    return this.fsm.state !== 'READY';
  }

  async spin(): Promise<void> {
    this.unlockAudio();
    if (this.fsm.state !== 'READY') return;
    if (!this.engine.canSpin()) {
      this.store.set({ message: 'Not enough demo credits for this bet. Lower the bet or reset the demo balance in Settings.' });
      this.stopAutoplay();
      return;
    }
    this.store.set({ message: null, spinWin: 0, banner: null });
    const forced = this.nextForced ?? undefined;
    this.nextForced = null;
    let outcome: SpinOutcome;
    try {
      outcome = this.engine.spin(forced);
    } catch (e) {
      this.store.set({ message: (e as Error).message });
      return;
    }
    this.lastOutcome = outcome;
    this.logOutcome(outcome);
    this.store.set({ balance: this.engine.balance });
    this.renderer.panel.setInfo(outcome.bonus ? '' : 'Clusters of 5+ pay.\nWilds substitute.');
    try {
      await this.presenter.play(outcome);
    } catch (e) {
      console.error(e);
      this.log.push(`presentation error: ${(e as Error).message}`);
    } finally {
      // Credit exactly once, whatever happened to the animation.
      this.engine.settle(outcome.id);
      this.renderer.timing.endSkip();
      this.store.set({ balance: this.engine.balance, lastWin: outcome.totalWin, spinWin: outcome.totalWin, canSkip: false, freeSpins: null, bonusIntro: null, bonusOutro: null });
      if (outcome.totalWin > 0) this.audio.play('coin');
      this.forceReady();
    }
    this.continueAutoplay();
  }

  private forceReady(): void {
    const s = this.fsm.state;
    if (s === 'READY') return;
    if (this.fsm.can('READY')) this.fsm.to('READY');
    else {
      // Route through a legal path (e.g. CASCADING -> EVALUATING -> READY).
      if (this.fsm.can('EVALUATING')) this.fsm.to('EVALUATING');
      if (this.fsm.can('READY')) this.fsm.to('READY');
      else {
        this.fsm.to('ERROR');
        this.fsm.to('READY');
      }
    }
  }

  private logOutcome(o: SpinOutcome): void {
    const line = `#${o.id} bet ${o.bet / CREDIT_SCALE} win ${(o.totalWin / CREDIT_SCALE).toFixed(2)} cascades ${o.base.cascades}${o.bonus ? ` BONUS ${o.bonus.totalSpins} spins ${(o.bonus.win / CREDIT_SCALE).toFixed(2)}` : ''}${o.forced ? ' (forced)' : ''}`;
    this.log.push(line);
    if (this.log.length > 200) this.log.shift();
  }

  skip(): void {
    if (!this.store.get().canSkip) return;
    this.renderer.timing.skip();
    this.resolvers.intro?.();
    this.resolvers.intro = undefined;
  }

  private showBanner(tier: WinTier, amount: number): Promise<void> {
    this.bannerKey++;
    this.store.set({ banner: { tier, amount, key: this.bannerKey } });
    if (tier === 'medium' || tier === 'small') {
      const key = this.bannerKey;
      setTimeout(() => {
        if (this.store.get().banner?.key === key) this.store.set({ banner: null });
      }, this.store.get().turbo ? 900 : 1600);
      return Promise.resolve();
    }
    return new Promise((resolve) => (this.resolvers.banner = resolve));
  }

  bannerDone(): void {
    this.store.set({ banner: null });
    this.resolvers.banner?.();
    this.resolvers.banner = undefined;
  }
  introDone(): void {
    this.store.set({ bonusIntro: null });
    this.resolvers.intro?.();
    this.resolvers.intro = undefined;
  }
  outroDone(): void {
    this.store.set({ bonusOutro: null });
    this.resolvers.outro?.();
    this.resolvers.outro = undefined;
  }

  changeBet(dir: 1 | -1): void {
    if (this.busy) return;
    const bets = gameConfig.bets as readonly number[];
    const cur = bets.indexOf(this.engine.bet / CREDIT_SCALE);
    const next = bets[Math.max(0, Math.min(bets.length - 1, cur + dir))];
    this.engine.setBet(next);
    this.audio.play('click');
    this.store.set({ bet: this.engine.bet, message: null });
  }

  setBet(credits: number): void {
    if (this.busy) return;
    this.engine.setBet(credits);
    this.store.set({ bet: this.engine.bet });
  }

  setTurbo(on: boolean): void {
    this.renderer.timing.speed = on ? 2.2 : 1;
    this.store.set({ turbo: on });
  }

  setReducedMotion(on: boolean): void {
    this.renderer.setReducedMotion(on);
    this.store.set({ reducedMotion: on });
  }

  startAutoplay(n: number): void {
    if (this.busy) return;
    this.store.set({ autoplayRemaining: n, autoplayActive: true, modal: null });
    this.continueAutoplay();
  }

  stopAutoplay(): void {
    this.store.set({ autoplayRemaining: 0, autoplayActive: false });
  }

  private continueAutoplay(): void {
    const s = this.store.get();
    if (!s.autoplayActive) return;
    if (s.autoplayRemaining <= 0 || !this.engine.canSpin()) {
      if (!this.engine.canSpin()) this.store.set({ message: 'Autoplay stopped: not enough demo credits.' });
      this.stopAutoplay();
      return;
    }
    this.store.set({ autoplayRemaining: s.autoplayRemaining - 1 });
    setTimeout(() => void this.spin(), s.turbo ? 150 : 450);
  }

  resetBalance(): void {
    if (this.busy) return;
    this.engine.resetBalance();
    this.store.set({ balance: this.engine.balance, lastWin: 0, message: null });
  }

  openModal(m: UIState['modal']): void {
    this.audio.play('click');
    this.store.set({ modal: m });
  }

  // ---- development helpers (dev panel only) ----
  forceNext(f: ForcedOutcome): void {
    if (!import.meta.env.DEV) return;
    this.nextForced = f;
  }

  useSeed(seed: string | null): void {
    if (!import.meta.env.DEV || this.busy) return;
    this.engine.setRNG(seed ? new SeededRNG(seed) : new CryptoRNG());
  }
}
