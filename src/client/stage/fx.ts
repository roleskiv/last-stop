import { Container, Sprite, type Texture } from 'pixi.js';
import { tex } from './assets.ts';

interface Particle {
  s: Sprite;
  vx: number; vy: number; g: number; drag: number;
  life: number; max: number;
  spin: number; scale0: number; scale1: number; alpha0: number;
}

export interface BurstOptions {
  texture?: Texture;
  count?: number;
  tint?: number | number[];
  speed?: [number, number];
  angle?: [number, number];
  life?: [number, number];
  scale?: [number, number];
  endScale?: number;
  gravity?: number;
  drag?: number;
  spread?: number;
  additive?: boolean;
  spin?: number;
  alpha?: number;
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

/** Pooled sprite particles. One instance per layer. */
export class Particles {
  readonly container = new Container();
  private live: Particle[] = [];
  private pool: Sprite[] = [];
  private readonly cap: number;

  constructor(cap = 500) {
    this.cap = cap;
  }

  burst(x: number, y: number, o: BurstOptions = {}): void {
    const count = o.count ?? 12;
    const texture = o.texture ?? tex('fx/glow.png');
    for (let i = 0; i < count; i++) {
      if (this.live.length >= this.cap) return;
      const s = this.pool.pop() ?? new Sprite();
      s.texture = texture;
      s.anchor.set(0.5);
      s.blendMode = o.additive === false ? 'normal' : 'add';
      const tint = Array.isArray(o.tint) ? o.tint[(Math.random() * o.tint.length) | 0] : o.tint ?? 0xffffff;
      s.tint = tint;
      const a = rand(...(o.angle ?? [0, Math.PI * 2]));
      const v = rand(...(o.speed ?? [80, 320]));
      const spread = o.spread ?? 0;
      s.position.set(x + rand(-spread, spread), y + rand(-spread, spread));
      const scale0 = rand(...(o.scale ?? [0.15, 0.4]));
      s.scale.set(scale0);
      s.rotation = Math.random() * Math.PI * 2;
      s.alpha = o.alpha ?? 1;
      const max = rand(...(o.life ?? [0.4, 0.9]));
      this.live.push({
        s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.gravity ?? 0, drag: o.drag ?? 1.5,
        life: max, max, spin: rand(-1, 1) * (o.spin ?? 0), scale0, scale1: scale0 * (o.endScale ?? 0.2), alpha0: o.alpha ?? 1,
      });
      this.container.addChild(s);
    }
  }

  update(dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000;
    const list = this.live;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.container.removeChild(p.s);
        this.pool.push(p.s);
        list[i] = list[list.length - 1];
        list.pop();
        continue;
      }
      const k = 1 - p.life / p.max;
      p.vy += p.g * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.rotation += p.spin * dt;
      p.s.scale.set(p.scale0 + (p.scale1 - p.scale0) * k);
      p.s.alpha = p.alpha0 * (k < 0.15 ? k / 0.15 : 1 - ((k - 0.15) / 0.85) ** 2);
    }
  }
}
