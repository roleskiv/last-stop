import { Application, Container, Sprite } from 'pixi.js';
import gsap from 'gsap';
import { BackgroundRenderer, BG_H, BG_W } from './BackgroundRenderer';
import { CharacterRenderer } from './CharacterRenderer';
import { InfoPanelRenderer } from './InfoPanelRenderer';
import { LogoRenderer } from './LogoRenderer';
import { ParticleManager } from './ParticleManager';
import { GRID_H, GRID_W, ReelRenderer } from './ReelRenderer';
import { loadGameTextures, type GameTextures } from './textures';
import { Timing } from './Timing';
import { TrainRenderer } from './TrainRenderer';

export type Orientation = 'landscape' | 'portrait';

/** Design spaces. The game layer is fitted ("contain") into the area above the HUD. */
const DESIGN = {
  landscape: { w: 1920, h: 1000 },
  portrait: { w: 1000, h: 1560 },
};

/**
 * Owns the Pixi application, scene graph and layout. Purely visual: it never
 * reads or changes game math. The AnimationController drives it.
 */
export class GameRenderer {
  app = new Application();
  textures!: GameTextures;
  readonly timing = new Timing();
  background!: BackgroundRenderer;
  reels!: ReelRenderer;
  character!: CharacterRenderer;
  logo!: LogoRenderer;
  panel!: InfoPanelRenderer;
  train!: TrainRenderer;
  particles = new ParticleManager();
  /** Particles in screen space (above everything in the game layer). */
  private bgLayer = new Container();
  readonly gameLayer = new Container();
  private camera = new Container();
  private flash!: Sprite;
  private vignette!: Sprite;
  orientation: Orientation = 'landscape';
  private hudHeight = 120;
  private ro?: ResizeObserver;
  private shakeAmt = 0;
  isMobile = false;

  async init(host: HTMLElement, onProgress?: (p: number) => void): Promise<void> {
    await this.app.init({
      resizeTo: host,
      backgroundColor: 0x0e1117,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: 'webgl',
      powerPreference: 'high-performance',
    });
    host.appendChild(this.app.canvas);
    this.textures = await loadGameTextures(onProgress);
    const fx = this.textures.fx;
    this.background = new BackgroundRenderer(fx);
    this.reels = new ReelRenderer(this.textures.symbols, fx, this.timing);
    this.character = new CharacterRenderer(this.textures.character, fx);
    this.logo = new LogoRenderer(fx);
    this.panel = new InfoPanelRenderer(fx);
    this.train = new TrainRenderer(fx);

    this.vignette = new Sprite(fx.vignette);
    this.vignette.anchor.set(0.5);
    this.vignette.alpha = 0.75;
    this.flash = new Sprite(fx.softGlow);
    this.flash.anchor.set(0.5);
    this.flash.blendMode = 'add';
    this.flash.alpha = 0;

    this.bgLayer.addChild(this.background.view, this.vignette);
    this.camera.addChild(this.panel.view, this.character.view, this.reels.view, this.logo.view, this.train.view, this.particles.view);
    this.gameLayer.addChild(this.camera);
    this.app.stage.addChild(this.bgLayer, this.gameLayer, this.flash);

    this.isMobile = matchMedia('(pointer: coarse)').matches;
    if (this.isMobile) this.particles.density = 0.6;

    this.app.ticker.add((tk) => this.update(Math.min(0.05, tk.deltaMS / 1000)));
    this.app.stage.eventMode = 'static';
    window.addEventListener('pointermove', this.onPointer);
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(host);
    this.layout();
  }

  private onPointer = (e: PointerEvent) => {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    this.background?.setPointer((e.clientX / w) * 2 - 1, (e.clientY / h) * 2 - 1);
  };

  setHudHeight(px: number): void {
    this.hudHeight = px;
    this.layout();
  }

  setReducedMotion(on: boolean): void {
    this.timing.reducedMotion = on;
    this.background.reducedMotion = on;
    this.character.reducedMotion = on;
    this.particles.density = on ? 0.3 : this.isMobile ? 0.6 : 1;
  }

  layout(): void {
    if (!this.background) return;
    this.app.resize();
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    // background covers the whole viewport
    const bgScale = Math.max(W / BG_W, H / BG_H) * 1.06;
    this.bgLayer.scale.set(bgScale);
    this.bgLayer.position.set((W - BG_W * bgScale) / 2, (H - BG_H * bgScale) / 2);
    this.vignette.position.set(BG_W / 2, BG_H / 2);
    this.vignette.width = BG_W * 1.1;
    this.vignette.height = BG_H * 1.2;
    this.flash.position.set(W / 2, H / 2);
    this.flash.width = W * 2;
    this.flash.height = H * 2;

    const availH = Math.max(200, H - this.hudHeight);
    const portrait = W / availH < 1.15;
    this.orientation = portrait ? 'portrait' : 'landscape';
    const d = DESIGN[this.orientation];
    const s = Math.min(W / d.w, availH / d.h);
    this.gameLayer.scale.set(s);
    this.gameLayer.position.set((W - d.w * s) / 2, (availH - d.h * s) / 2);
    this.camera.pivot.set(d.w / 2, d.h / 2);
    this.camera.position.set(d.w / 2, d.h / 2);

    if (!portrait) {
      this.reels.view.position.set(960, 560);
      this.reels.view.scale.set(0.84);
      this.logo.view.position.set(960, 92);
      this.logo.view.scale.set(0.85);
      this.character.view.position.set(290, 500);
      this.character.view.scale.set(1.7);
      this.panel.view.position.set(1640, 560);
      this.panel.view.scale.set(0.95);
      this.panel.layout('landscape');
    } else {
      this.reels.view.position.set(500, 690);
      this.reels.view.scale.set(1.0);
      this.logo.view.position.set(500, 110);
      this.logo.view.scale.set(0.95);
      this.character.view.position.set(165, 1250);
      this.character.view.scale.set(1.0);
      this.panel.view.position.set(660, 1300);
      this.panel.view.scale.set(1.0);
      this.panel.layout('portrait');
    }
  }

  /** Screen-space reel rectangle (CSS pixels) for DOM overlays. */
  reelRect(): DOMRect {
    const tl = this.reels.view.toGlobal({ x: -GRID_W / 2, y: -GRID_H / 2 });
    const br = this.reels.view.toGlobal({ x: GRID_W / 2, y: GRID_H / 2 });
    return new DOMRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  }

  /** Convert a reel cell to particle-layer coordinates. */
  cellToFx(pos: number): { x: number; y: number } {
    return this.particles.view.toLocal(this.reels.cellGlobal(pos));
  }

  shake(amount: number, duration: number): void {
    if (this.timing.reducedMotion) return;
    this.shakeAmt = amount;
    gsap.to(this, { shakeAmt: 0, duration, ease: 'power2.out' });
  }

  zoom(scale: number, duration: number): Promise<void> {
    if (this.timing.reducedMotion) return Promise.resolve();
    return this.timing.play(gsap.timeline().to(this.camera.scale, { x: scale, y: scale, duration: duration * 0.4, ease: 'power2.out' }).to(this.camera.scale, { x: 1, y: 1, duration: duration * 0.6, ease: 'power2.inOut' }));
  }

  flashScreen(color: number, alpha: number, duration: number): void {
    this.flash.tint = color;
    this.flash.alpha = this.timing.reducedMotion ? alpha * 0.4 : alpha;
    gsap.to(this.flash, { alpha: 0, duration });
  }

  private update(dt: number): void {
    this.background.update(dt);
    this.reels.update(dt);
    this.character.update(dt);
    this.logo.update(dt);
    this.panel.update(dt);
    this.particles.update(dt);
    const s = this.shakeAmt;
    const d = DESIGN[this.orientation];
    this.camera.position.set(d.w / 2 + (s ? (Math.random() - 0.5) * s : 0), d.h / 2 + (s ? (Math.random() - 0.5) * s : 0));
  }

  get fps(): number {
    return this.app.ticker.FPS;
  }

  destroy(): void {
    window.removeEventListener('pointermove', this.onPointer);
    this.ro?.disconnect();
    this.app.destroy(true, { children: true });
  }
}
