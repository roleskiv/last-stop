import gsap from 'gsap';
import { CREDIT_SCALE, GRID_ROWS, winTierFor, type WinTier } from '../config/gameConfig';
import { featureConfig } from '../config/featureConfig';
import { SYMBOLS, Sym } from '../config/symbols';
import type { SoundKey } from '../assets/assetManifest';
import { colOf } from '../engine/Grid';
import type { RoundEvent, RoundResult, SpinOutcome } from '../engine/types';
import type { GameState } from '../state/GameStateMachine';
import type { GameRenderer } from './GameRenderer';

export interface PresenterHooks {
  state(s: GameState): void;
  spinWin(centi: number): void;
  haunted(n: number, cap: number): void;
  stations(lit: number, label: string): void;
  freeSpins(info: { remaining: number; total: number; played: number; bonusWin: number; retrigger?: number } | null): void;
  info(text: string): void;
  sound(key: SoundKey, opts?: { rate?: number; volume?: number; throttleMs?: number }): void;
  music(track: 'music' | 'bonusMusic'): void;
  banner(tier: WinTier, amount: number): Promise<void>;
  bonusIntro(spins: number, scatters: number): Promise<void>;
  bonusOutro(win: number, spins: number): Promise<void>;
  canSkip(on: boolean): void;
}

const fmt = (centi: number) => (centi / CREDIT_SCALE).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Plays a fully resolved SpinOutcome as a sequence of animations. It only
 * reads the outcome; nothing here can change what was won.
 */
export class AnimationController {
  constructor(
    private r: GameRenderer,
    private hooks: PresenterHooks,
  ) {}

  private get t() {
    return this.r.timing;
  }

  async play(outcome: SpinOutcome): Promise<void> {
    const { base, bonus, bet } = outcome;
    this.hooks.canSkip(true);
    let shown = 0;
    await this.playRound(base, bet, 0, (w) => this.hooks.spinWin((shown = w)));

    if (bonus) {
      this.hooks.state('BONUS_INTRO');
      await this.bonusIntro(base.scatterCount, bonus.initialSpins);
      this.hooks.state('FREE_SPINS');
      let bonusWin = 0;
      let total = bonus.initialSpins;
      this.hooks.freeSpins({ remaining: bonus.initialSpins, total, played: 0, bonusWin: 0 });
      for (const fr of bonus.rounds) {
        this.hooks.state('SPINNING');
        const before = bonusWin;
        await this.playRound(fr, bet, before, (w) => {
          this.hooks.spinWin(base.win + w);
          this.hooks.freeSpins({ remaining: fr.spinsRemaining, total, played: fr.index, bonusWin: w });
        });
        bonusWin = fr.bonusWinSoFar;
        if (fr.retriggered) {
          total += fr.retriggered;
          this.hooks.sound('scatter');
          this.hooks.info(`+${fr.retriggered} FREE SPINS!`);
          this.r.flashScreen(0x8dffb5, 0.4, 0.6);
        }
        this.hooks.freeSpins({ remaining: fr.spinsRemaining, total, played: fr.index, bonusWin, retrigger: fr.retriggered || undefined });
        this.hooks.state('FREE_SPINS');
        await this.t.wait(0.35);
      }
      this.hooks.state('BONUS_OUTRO');
      await this.bonusOutro(bonus.win, bonus.totalSpins);
      this.hooks.freeSpins(null);
      shown = outcome.totalWin;
      this.hooks.spinWin(shown);
    } else {
      this.hooks.state('EVALUATING');
    }

    const tier = winTierFor(outcome.totalWin, bet);
    if (tier === 'big' || tier === 'mega' || tier === 'legendary') {
      this.hooks.state('WIN_PRESENTATION');
      await this.bigWin(tier, outcome.totalWin);
    } else if (tier === 'medium' && !bonus) {
      this.hooks.state('WIN_PRESENTATION');
      void this.hooks.banner('medium', outcome.totalWin);
      this.r.character.play('mediumWin', this.t.speed);
    } else if (tier === 'small') {
      this.r.character.play('smallWin', this.t.speed);
    }
    this.r.reels.setHaunted([]);
    this.hooks.haunted(0, featureConfig.phantomPlatforms.baseCap);
    this.hooks.canSkip(false);
  }

  private async playRound(round: RoundResult, bet: number, offset: number, onWin: (w: number) => void): Promise<void> {
    const reels = this.r.reels;
    const isFree = round.mode === 'free';
    const cap = isFree ? featureConfig.phantomPlatforms.freeSpinsCap : featureConfig.phantomPlatforms.baseCap;
    if (!isFree) {
      await reels.setHaunted([]);
      this.hooks.haunted(0, cap);
    } else {
      await reels.setHaunted(round.hauntedStart);
      this.hooks.haunted(round.hauntedStart.length, cap);
    }
    this.hooks.stations(0, isFree ? 'Land 3 trains for +4 spins' : 'Land 3 trains to board');

    let landed = 0;
    const ev = round.events;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      // Consecutive platform activations / upgrades play together so features stay snappy.
      if (e.t === 'platform' || e.t === 'upgrade') {
        const batch: RoundEvent[] = [e];
        while (i + 1 < ev.length && ev[i + 1].t === e.t) batch.push(ev[++i]);
        if (e.t === 'platform') await this.playPlatforms(batch as Extract<RoundEvent, { t: 'platform' }>[], cap);
        else await Promise.all(batch.map((b) => this.playEvent(b, round, bet, cap, () => {}, () => {})));
        continue;
      }
      await this.playEvent(e, round, bet, cap, (w) => onWin(offset + w), () => landed++);
    }
    reels.restoreAlpha(this.t.d(0.2));
    void landed;
    const roundTier = winTierFor(round.win, bet);
    if (isFree && (roundTier === 'medium' || roundTier === 'big')) this.r.character.play('mediumWin', this.t.speed);
  }

  private async playEvent(e: RoundEvent, round: RoundResult, bet: number, cap: number, onWin: (w: number) => void, onLand: () => void): Promise<void> {
    const reels = this.r.reels;
    const fx = this.r.textures.fx;
    const P = this.r.particles;
    const t = this.t;
    switch (e.t) {
      case 'reveal': {
        this.hooks.state('SPINNING');
        this.hooks.sound('reelStart');
        void this.r.character.play('spin', t.speed);
        // anticipation when two scatters already landed in earlier columns
        const scatterCols = e.grid.map((c, i) => (c.sym === Sym.SCATTER ? colOf(i) : -1)).filter((c) => c >= 0);
        const antic: number[] = [];
        for (let c = 0; c < 6; c++) if (scatterCols.filter((x) => x < c).length >= 2) antic.push(c);
        await reels.spinTo(e.grid, (col) => {
          this.hooks.sound('reelStop', { rate: 0.95 + col * 0.03 });
          for (let r = 0; r < GRID_ROWS; r++) if (e.grid[col * GRID_ROWS + r].sym === Sym.SCATTER) this.hooks.sound('scatter', { volume: 0.7 });
        }, antic.slice(0, 2));
        this.hooks.state('EVALUATING');
        break;
      }
      case 'scatters': {
        const n = e.positions.length;
        this.hooks.stations(Math.min(3, n), n >= 3 ? 'MIDNIGHT TRAIN INCOMING!' : `${n} of 3 trains`);
        await Promise.all(e.positions.map((p) => reels.shakeCell(p, t.d(0.5))));
        for (const p of e.positions) {
          const g = this.r.cellToFx(p);
          P.emit({ x: g.x, y: g.y, count: 14, texture: fx.spark, tint: [0x8dffb5, 0xc7fff1], speed: [80, 260], life: [0.4, 0.9], scale: [0.3, 0.7] });
        }
        break;
      }
      case 'platform': {
        this.hooks.state('FEATURE_ACTIVE');
        void this.r.character.play('punch', t.speed);
        this.r.background.flicker(t.d(0.6));
        this.hooks.sound('platform');
        await reels.shakeCell(e.pos, t.d(0.45));
        if (e.haunted) {
          const g = this.r.cellToFx(e.pos);
          P.emit({ x: g.x, y: g.y, count: 30, texture: fx.ember, tint: [0x5ef2d6, 0x8dffb5, 0xc7fff1], speed: [60, 280], life: [0.5, 1.2], scale: [0.4, 1] });
          P.emit({ x: g.x, y: g.y, count: 1, texture: fx.ring, tint: 0x5ef2d6, speed: [0, 0], life: [0.5, 0.5], scale: [0.6, 0.6], endScale: 3 });
          this.r.shake(10, t.d(0.3));
          const current = reels.hauntedCount;
          await reels.setHaunted([...this.currentHaunted(), e.pos], [e.pos], t.d(0.6));
          this.hooks.haunted(Math.min(cap, current + 1), cap);
        }
        await reels.morph(e.pos, e.became.sym, t.d(0.35));
        break;
      }
      case 'punch': {
        this.hooks.state('FEATURE_ACTIVE');
        void this.r.character.play('punch', t.speed);
        await reels.shakeCell(e.from, t.d(0.3));
        if (e.target >= 0) {
          this.hooks.sound('punch');
          const g = this.r.cellToFx(e.target);
          this.r.shake(14, t.d(0.25));
          this.r.flashScreen(0xc7fff1, 0.25, t.d(0.3));
          P.emit({ x: g.x, y: g.y, count: 1, texture: fx.hole, tint: 0xffffff, speed: [0, 0], life: [0.7, 0.7], scale: [0.4, 0.4], endScale: 2.2, blend: 'normal' });
          P.emit({ x: g.x, y: g.y, count: 26, texture: fx.spark, tint: [0xd7b15a, 0x5ef2d6, 0xc7fff1], speed: [140, 420], life: [0.3, 0.8], scale: [0.25, 0.6] });
          await reels.morph(e.target, Sym.WILD, t.d(0.4));
          this.hooks.sound('wild');
          P.emit({ x: g.x, y: g.y, count: 18, texture: fx.ember, tint: 0x5ef2d6, speed: [30, 140], life: [0.6, 1.2], gravity: -80, scale: [0.4, 0.9] });
        }
        await reels.morph(e.from, e.became.sym, t.d(0.3));
        break;
      }
      case 'upgrade': {
        this.hooks.state('FEATURE_ACTIVE');
        const g = this.r.cellToFx(e.pos);
        void reels.pulseTile(e.pos, t.d(0.4));
        P.emit({ x: g.x, y: g.y, count: 16, texture: fx.ember, tint: [0x5ef2d6, 0xc7fff1], speed: [40, 180], life: [0.4, 0.9], gravity: -120, scale: [0.4, 0.9] });
        this.hooks.sound(e.to === Sym.WILD ? 'wild' : 'platform', { volume: 0.6, throttleMs: 80 });
        await reels.morph(e.pos, e.to, t.d(0.4));
        break;
      }
      case 'win': {
        this.hooks.state('EVALUATING');
        this.hooks.sound('clusterWin', { rate: 1 + Math.min(0.5, (round.cascades > 0 ? 0.08 : 0) * this.stepIndex(round, e)) });
        const d = t.d(0.9);
        void reels.highlightClusters(e.clusters, d);
        for (const c of e.clusters) {
          for (const p of c.positions) {
            const g = this.r.cellToFx(p);
            P.emit({ x: g.x, y: g.y, count: 5, texture: fx.spark, tint: SYMBOLS[c.sym].glow, speed: [40, 160], life: [0.4, 0.9], scale: [0.2, 0.5] });
          }
          const cen = reels.centroid(c.positions);
          reels.showAmount(fmt(c.payout), cen, t.d(1.2));
        }
        onWin(e.roundWin);
        const stepTier = winTierFor(e.stepWin, bet);
        if (stepTier === 'medium') {
          this.r.flashScreen(0x8dffb5, 0.18, t.d(0.5));
          void this.r.character.play('smallWin', t.speed);
        }
        await t.wait(0.95);
        break;
      }
      case 'cascade': {
        this.hooks.state('CASCADING');
        this.hooks.sound('cascade');
        await reels.removeCells(e.removed, t.d(0.32), (p) => {
          const g = this.r.cellToFx(p);
          P.emit({ x: g.x, y: g.y, count: 10, texture: fx.ember, tint: [0x5ef2d6, 0x8dffb5, 0xd7b15a], speed: [80, 260], life: [0.4, 0.8], scale: [0.3, 0.7] });
        });
        await reels.applyCascade(e.grid, t.d(0.45), () => {
          onLand();
          this.hooks.sound('land', { throttleMs: 60 });
        });
        this.hooks.state('EVALUATING');
        break;
      }
      case 'maxWin':
        this.hooks.info('MAX WIN REACHED');
        break;
      case 'end':
        this.hooks.state('EVALUATING');
        break;
    }
  }

  private async playPlatforms(batch: Extract<RoundEvent, { t: 'platform' }>[], cap: number): Promise<void> {
    const reels = this.r.reels;
    const fx = this.r.textures.fx;
    const t = this.t;
    this.hooks.state('FEATURE_ACTIVE');
    void this.r.character.play('punch', t.speed);
    this.r.background.flicker(t.d(0.6));
    this.hooks.sound('platform');
    await Promise.all(batch.map((e) => reels.shakeCell(e.pos, t.d(0.4))));
    const newly = batch.filter((e) => e.haunted).map((e) => e.pos);
    if (newly.length) {
      for (const pos of newly) {
        const g = this.r.cellToFx(pos);
        this.r.particles.emit({ x: g.x, y: g.y, count: 24, texture: fx.ember, tint: [0x5ef2d6, 0x8dffb5, 0xc7fff1], speed: [60, 280], life: [0.5, 1.2], scale: [0.4, 1] });
        this.r.particles.emit({ x: g.x, y: g.y, count: 1, texture: fx.ring, tint: 0x5ef2d6, speed: [0, 0], life: [0.5, 0.5], scale: [0.6, 0.6], endScale: 3 });
      }
      this.r.shake(8 + newly.length * 2, t.d(0.3));
      const all = [...new Set([...this.currentHaunted(), ...newly])];
      await reels.setHaunted(all, newly, t.d(0.5));
      this.hooks.haunted(Math.min(cap, all.length), cap);
    }
    await Promise.all(batch.map((e) => reels.morph(e.pos, e.became.sym, t.d(0.3))));
  }

  private stepIndex(round: RoundResult, e: RoundEvent): number {
    let n = 0;
    for (const x of round.events) {
      if (x === e) return n;
      if (x.t === 'win') n++;
    }
    return n;
  }

  private currentHaunted(): number[] {
    return this.r.reels.hauntedPositions();
  }

  private async bonusIntro(scatters: number, spins: number): Promise<void> {
    const r = this.r;
    const t = this.t;
    r.character.play('bonus', t.speed);
    r.reels.dim(0.65, t.d(0.6));
    r.background.flicker(t.d(1.2));
    this.hooks.sound('bonusIntro');
    await t.wait(0.7);
    this.hooks.sound('trainHorn');
    void r.character.play('train', t.speed);
    r.background.distantTrain();
    const overlay = this.hooks.bonusIntro(spins, scatters);
    await t.wait(1.3);
    this.hooks.sound('trainPass');
    r.shake(18, t.d(1.4));
    r.flashScreen(0xc7fff1, 0.5, t.d(0.8));
    const W = r.orientation === 'landscape' ? 1920 : 1000;
    const y = r.orientation === 'landscape' ? 560 : 690;
    void t.play(r.train.rush(W, y, t.d(1.6)));
    r.background.setBonus(true);
    r.reels.setFrameGlow(0x8dffb5, 0.4, 1);
    this.hooks.music('bonusMusic');
    await overlay;
    r.reels.dim(0, t.d(0.4));
  }

  private async bonusOutro(win: number, spins: number): Promise<void> {
    const r = this.r;
    const t = this.t;
    this.hooks.sound('trainPass');
    const W = r.orientation === 'landscape' ? 1920 : 1000;
    const y = r.orientation === 'landscape' ? 560 : 690;
    void t.play(r.train.rush(W, y, t.d(1.4)));
    r.reels.dim(0.55, t.d(0.5));
    await t.wait(0.8);
    this.hooks.sound('bonusOutro');
    await this.hooks.bonusOutro(win, spins);
    r.background.setBonus(false);
    r.reels.setFrameGlow(0x5ef2d6, 0.22, 1);
    r.reels.dim(0, t.d(0.4));
    this.hooks.music('music');
  }

  private async bigWin(tier: WinTier, amount: number): Promise<void> {
    const r = this.r;
    r.background.dim(0.35, 0.4);
    r.reels.dim(0.35, 0.4);
    this.hooks.sound('bigWin');
    void r.character.play('bigWin');
    void r.zoom(1.04, 1.2);
    const fx = r.textures.fx;
    const burst = () => {
      const c = { x: r.orientation === 'landscape' ? 960 : 500, y: r.orientation === 'landscape' ? 520 : 650 };
      r.particles.emit({ x: c.x, y: c.y, count: 60, texture: fx.spark, tint: [0x5ef2d6, 0xd7b15a, 0xffe9ae, 0x8dffb5], speed: [200, 700], life: [0.8, 1.6], gravity: 300, scale: [0.3, 0.8], drag: 0.8 });
    };
    burst();
    const bursts = gsap.timeline({ repeat: tier === 'big' ? 2 : 5 }).call(burst, [], 0.7);
    if (tier === 'legendary' || tier === 'mega') {
      const W = r.orientation === 'landscape' ? 1920 : 1000;
      void this.t.play(r.train.sweep(W, r.orientation === 'landscape' ? 300 : 400, 2.4));
      r.flashScreen(0xc7fff1, 0.45, 1);
    }
    await this.hooks.banner(tier, amount);
    bursts.kill();
    r.background.dim(0, 0.4);
    r.reels.dim(0, 0.4);
  }
}
