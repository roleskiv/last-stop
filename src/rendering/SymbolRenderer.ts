import { Container, Sprite, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { SYMBOLS, type SymbolId } from '../config/symbols';
import type { FxTextures } from './textures';

export const CELL = 150;
const SYMBOL_SIZE = CELL * 0.88;

/**
 * One symbol on the reels: a glow halo + the symbol art (from the asset
 * registry). Handles idle breathing, win pulse and transformations.
 */
export class SymbolView extends Container {
  readonly art: Sprite;
  readonly halo: Sprite;
  sym: SymbolId;
  cellId: number;
  private phase = Math.random() * Math.PI * 2;
  private glowBoost = 0;

  constructor(
    private textures: Record<SymbolId, Texture>,
    fx: FxTextures,
    sym: SymbolId,
    cellId: number,
  ) {
    super();
    this.sym = sym;
    this.cellId = cellId;
    this.halo = new Sprite(fx.glow);
    this.halo.anchor.set(0.5);
    this.halo.blendMode = 'add';
    this.halo.scale.set(1.9);
    this.art = new Sprite(textures[sym]);
    this.art.anchor.set(0.5);
    this.addChild(this.halo, this.art);
    this.applySymbol();
  }

  private applySymbol(): void {
    this.art.texture = this.textures[this.sym];
    const tex = this.art.texture;
    const k = SYMBOL_SIZE / Math.max(tex.width, tex.height);
    this.art.scale.set(k);
    this.halo.tint = SYMBOLS[this.sym].glow;
  }

  setSymbol(sym: SymbolId): void {
    this.sym = sym;
    this.applySymbol();
  }

  get isSpecial(): boolean {
    return SYMBOLS[this.sym].tier === 'special';
  }

  update(t: number): void {
    const special = this.isSpecial;
    const base = special ? 0.32 : 0;
    this.halo.alpha = base + this.glowBoost + (special ? Math.sin(t * 2.4 + this.phase) * 0.12 : 0);
    if (special) this.art.rotation = Math.sin(t * 1.6 + this.phase) * 0.025;
  }

  /** Bright glow + pulse used for winning symbols. */
  winPulse(duration: number, strength = 1): gsap.core.Timeline {
    const tl = gsap.timeline();
    tl.to(this, { glowBoost: 0.85 * strength, duration: duration * 0.25, ease: 'power2.out' }, 0);
    tl.to(this.scale, { x: 1.12, y: 1.12, duration: duration * 0.25, ease: 'back.out(3)', yoyo: true, repeat: 3 }, 0);
    return tl;
  }

  clearGlow(): void {
    gsap.killTweensOf(this);
    this.glowBoost = 0;
  }

  /** Squash-and-stretch landing. */
  land(d: number): gsap.core.Timeline {
    return gsap
      .timeline()
      .to(this.art.scale, { y: this.art.scale.y * 0.86, x: this.art.scale.x * 1.1, duration: d * 0.35, ease: 'power2.out' })
      .to(this.art.scale, { y: this.baseScale(), x: this.baseScale(), duration: d * 0.65, ease: 'elastic.out(1.1, 0.45)' });
  }

  baseScale(): number {
    const tex = this.art.texture;
    return SYMBOL_SIZE / Math.max(tex.width, tex.height);
  }

  /** Pop-swap into another symbol (used for upgrades, punches, sign conversions). */
  morph(to: SymbolId, d: number): gsap.core.Timeline {
    const tl = gsap.timeline();
    tl.to(this.scale, { x: 0.1, y: 1.25, duration: d * 0.4, ease: 'power2.in' });
    tl.add(() => this.setSymbol(to));
    tl.to(this.scale, { x: 1, y: 1, duration: d * 0.6, ease: 'elastic.out(1, 0.5)' });
    tl.to(this, { glowBoost: 0.9, duration: d * 0.2, yoyo: true, repeat: 1 }, d * 0.4);
    return tl;
  }
}
