/**
 * Minimal tween engine. Everything on screen is animated through this, so one time scale
 * drives turbo and skip, and nothing depends on a third-party animation licence.
 */
export type Ease = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  inCubic: (t: number) => t * t * t,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outBack: (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  inBack: (t: number) => 2.70158 * t * t * t - 1.70158 * t * t,
  outElastic: (t: number) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  /** Falls, then settles with one small bounce. */
  drop: (t: number) => {
    if (t < 0.72) return (t / 0.72) ** 2;
    const u = (t - 0.72) / 0.28;
    return 1 - 0.07 * Math.sin(u * Math.PI);
  },
} satisfies Record<string, Ease>;

interface Tween {
  update(dt: number): boolean;
  /** Tweens in the "fx" group ignore skip and always run in real time. */
  realtime: boolean;
}

export class Animator {
  private tweens: Tween[] = [];
  /** 1 = normal. Turbo and skip raise it. */
  timeScale = 1;
  /** Seconds since start, unscaled. For idle motion. */
  clock = 0;

  update(dtMs: number): void {
    this.clock += dtMs / 1000;
    const scaled = dtMs * this.timeScale;
    const list = this.tweens;
    for (let i = list.length - 1; i >= 0; i--) {
      const t = list[i];
      if (t.update(t.realtime ? dtMs : scaled)) {
        const last = list.pop()!;
        if (i < list.length) list[i] = last;
      }
    }
  }

  /** Animate numeric properties of `target` to the given values. */
  to(target: object, props: Record<string, number>, ms: number, easing: Ease = ease.outCubic, opts: { delay?: number; realtime?: boolean } = {}): Promise<void> {
    return new Promise((resolve) => {
      const keys = Object.keys(props);
      const obj = target as Record<string, number>;
      let from: number[] | null = null;
      let elapsed = -(opts.delay ?? 0);
      this.tweens.push({
        realtime: opts.realtime ?? false,
        update: (dt) => {
          elapsed += dt;
          if (elapsed < 0) return false;
          from ??= keys.map((k) => obj[k]);
          const t = ms <= 0 ? 1 : Math.min(1, elapsed / ms);
          const e = easing(t);
          for (let i = 0; i < keys.length; i++) {
            obj[keys[i]] = from[i] + (props[keys[i]] - from[i]) * e;
          }
          if (t >= 1) { resolve(); return true; }
          return false;
        },
      });
    });
  }

  /** Call `fn(progress)` every frame for `ms`. */
  run(ms: number, fn: (t: number) => void, opts: { delay?: number; realtime?: boolean } = {}): Promise<void> {
    return new Promise((resolve) => {
      let elapsed = -(opts.delay ?? 0);
      this.tweens.push({
        realtime: opts.realtime ?? false,
        update: (dt) => {
          elapsed += dt;
          if (elapsed < 0) return false;
          const t = ms <= 0 ? 1 : Math.min(1, elapsed / ms);
          fn(t);
          if (t >= 1) { resolve(); return true; }
          return false;
        },
      });
    });
  }

  wait(ms: number, realtime = false): Promise<void> {
    return this.run(ms, () => undefined, { realtime });
  }
}

export const anim = new Animator();
