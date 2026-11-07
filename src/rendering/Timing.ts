import gsap from 'gsap';

/**
 * Presentation timing. Turbo multiplies speed; skipping fast-forwards every
 * tracked tween. Neither ever touches the engine: outcomes are decided before
 * any animation starts.
 */
export class Timing {
  speed = 1;
  skipping = false;
  reducedMotion = false;
  private live = new Set<gsap.core.Animation>();

  /** Scaled duration in seconds. */
  d(seconds: number): number {
    if (this.skipping) return 0.0001;
    return seconds / this.speed;
  }

  track<T extends gsap.core.Animation>(anim: T): T {
    this.live.add(anim);
    if (this.skipping) anim.timeScale(40);
    anim.eventCallback('onComplete', () => this.live.delete(anim));
    return anim;
  }

  /** Promise for a gsap animation, tracked for skipping. */
  play(anim: gsap.core.Animation): Promise<void> {
    this.track(anim);
    return new Promise((resolve) => {
      const done = () => {
        this.live.delete(anim);
        resolve();
      };
      if (anim.progress() >= 1 && !anim.isActive()) return done();
      anim.eventCallback('onComplete', done);
    });
  }

  wait(seconds: number): Promise<void> {
    return this.play(gsap.to({}, { duration: this.d(seconds) }));
  }

  skip(): void {
    this.skipping = true;
    this.live.forEach((a) => a.timeScale(40));
  }

  endSkip(): void {
    this.skipping = false;
  }
}
