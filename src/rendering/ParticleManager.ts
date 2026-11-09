import { Container, Sprite, type Texture } from 'pixi.js';

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  drag: number;
  life: number;
  maxLife: number;
  s0: number;
  s1: number;
  a0: number;
  spin: number;
  active: boolean;
}

export interface EmitOptions {
  x: number;
  y: number;
  count: number;
  texture: Texture;
  tint?: number | number[];
  speed?: [number, number];
  angle?: [number, number];
  life?: [number, number];
  scale?: [number, number];
  endScale?: number;
  alpha?: number;
  gravity?: number;
  drag?: number;
  spread?: number;
  blend?: 'add' | 'normal';
  spin?: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Pooled sprite particles. Never allocates once the pool is warm. */
export class ParticleManager {
  readonly view = new Container();
  private pool: Particle[] = [];
  private active: Particle[] = [];
  /** 0..1: lowered on mobile / reduced-motion to cut particle counts. */
  density = 1;

  emit(o: EmitOptions): void {
    const n = Math.max(1, Math.round(o.count * this.density));
    for (let i = 0; i < n; i++) {
      const p = this.pool.pop() ?? this.create();
      const s = p.sprite;
      s.texture = o.texture;
      const tint = Array.isArray(o.tint) ? o.tint[Math.floor(Math.random() * o.tint.length)] : (o.tint ?? 0xffffff);
      s.tint = tint;
      s.blendMode = o.blend ?? 'add';
      const spread = o.spread ?? 0;
      s.position.set(o.x + rnd(-spread, spread), o.y + rnd(-spread, spread));
      const ang = rnd(...(o.angle ?? [0, Math.PI * 2]));
      const sp = rnd(...(o.speed ?? [50, 200]));
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp;
      p.ax = 0;
      p.ay = o.gravity ?? 0;
      p.drag = o.drag ?? 1.5;
      p.maxLife = rnd(...(o.life ?? [0.5, 1.1]));
      p.life = 0;
      p.s0 = rnd(...(o.scale ?? [0.3, 0.8]));
      p.s1 = p.s0 * (o.endScale ?? 0.1);
      p.a0 = o.alpha ?? 1;
      p.spin = rnd(-(o.spin ?? 0), o.spin ?? 0);
      s.scale.set(p.s0);
      s.alpha = p.a0;
      s.visible = true;
      p.active = true;
      this.active.push(p);
    }
  }

  update(dt: number): void {
    const list = this.active;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.sprite.visible = false;
        list[i] = list[list.length - 1];
        list.pop();
        this.pool.push(p);
        continue;
      }
      const k = p.life / p.maxLife;
      const d = Math.exp(-p.drag * dt);
      p.vx = (p.vx + p.ax * dt) * d;
      p.vy = (p.vy + p.ay * dt) * d;
      const s = p.sprite;
      s.x += p.vx * dt;
      s.y += p.vy * dt;
      s.rotation += p.spin * dt;
      s.scale.set(p.s0 + (p.s1 - p.s0) * k);
      s.alpha = p.a0 * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85);
    }
  }

  get count(): number {
    return this.active.length;
  }

  private create(): Particle {
    const sprite = new Sprite();
    sprite.anchor.set(0.5);
    sprite.visible = false;
    this.view.addChild(sprite);
    return { sprite, vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, life: 0, maxLife: 1, s0: 1, s1: 1, a0: 1, spin: 0, active: false };
  }
}
