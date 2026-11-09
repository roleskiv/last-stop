import { Container, Graphics, Sprite } from 'pixi.js';
import gsap from 'gsap';
import type { FxTextures } from './textures';

/** Spectral ghost train that rushes across the screen (bonus intro / outro, legendary wins). */
export class TrainRenderer {
  readonly view = new Container();
  private train = new Container();
  private beams: Sprite[] = [];

  constructor(fx: FxTextures) {
    const cars = 4;
    const carW = 520;
    for (let c = 0; c < cars; c++) {
      const g = new Graphics();
      const x = c * (carW + 20);
      g.roundRect(x, -150, carW, 240, 30).fill({ color: 0x1c2b44, alpha: 0.85 }).stroke({ width: 6, color: 0x5ef2d6, alpha: 0.9 });
      g.rect(x, 40, carW, 20).fill({ color: 0xb78b3e, alpha: 0.9 });
      for (let w = 0; w < 4; w++) g.roundRect(x + 40 + w * 118, -110, 90, 90, 12).fill({ color: 0x8dffb5, alpha: 0.55 }).stroke({ width: 3, color: 0xc7fff1, alpha: 0.7 });
      for (let w = 0; w < 4; w++) g.circle(x + 70 + w * 118, -60, 16).fill({ color: 0x0e1117, alpha: 0.7 });
      g.circle(x + 80, 100, 32).fill(0x0e1117).stroke({ width: 5, color: 0x5ef2d6 });
      g.circle(x + carW - 80, 100, 32).fill(0x0e1117).stroke({ width: 5, color: 0x5ef2d6 });
      this.train.addChild(g);
    }
    // nose
    const nose = new Graphics();
    nose.moveTo(-10, -150).bezierCurveTo(-160, -140, -200, 40, -180, 90).lineTo(-10, 90).closePath().fill({ color: 0x1c2b44, alpha: 0.9 }).stroke({ width: 6, color: 0x5ef2d6 });
    nose.rect(-150, 40, 140, 20).fill(0xb78b3e);
    this.train.addChild(nose);
    for (const y of [-20, 30]) {
      const lamp = new Sprite(fx.glow);
      lamp.anchor.set(0.5);
      lamp.position.set(-170, y);
      lamp.scale.set(1.4);
      lamp.tint = 0xffffff;
      lamp.blendMode = 'add';
      this.train.addChild(lamp);
      const beam = new Sprite(fx.beam);
      beam.anchor.set(0.5, 0);
      beam.rotation = Math.PI / 2;
      beam.position.set(-170, y);
      beam.width = 220;
      beam.height = 900;
      beam.tint = 0xc7fff1;
      beam.alpha = 0.5;
      beam.blendMode = 'add';
      this.train.addChild(beam);
      this.beams.push(beam);
    }
    this.train.alpha = 0.85;
    this.view.addChild(this.train);
    this.view.visible = false;
  }

  /** Rush right-to-left across `width`. */
  rush(width: number, y: number, duration: number): gsap.core.Timeline {
    this.view.visible = true;
    this.train.position.set(width + 400, y);
    return gsap
      .timeline({ onComplete: () => void (this.view.visible = false) })
      .to(this.train, { x: -2600, duration, ease: 'power1.in' });
  }

  /** Headlight sweep only (very large wins). */
  sweep(width: number, y: number, duration: number): gsap.core.Timeline {
    this.view.visible = true;
    this.train.position.set(width + 1200, y);
    return gsap
      .timeline({ onComplete: () => void (this.view.visible = false) })
      .to(this.train, { x: width + 250, duration: duration * 0.5, ease: 'power2.out' })
      .to(this.train, { x: width + 1400, duration: duration * 0.5, ease: 'power2.in' });
  }
}
