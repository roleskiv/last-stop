import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import gsap from 'gsap';
import type { characterAssets } from '../assets/assetManifest';
import type { FxTextures } from './textures';

export type CharacterState = 'idle' | 'spin' | 'smallWin' | 'mediumWin' | 'bigWin' | 'bonus' | 'train' | 'punch';

type Parts = Record<keyof typeof characterAssets, Texture>;

/**
 * Conductor Graves: a layered puppet (body, head, hat, brows, mouth, two
 * arms, glowing eyes, fog wisps) driven by a small animation state machine.
 * Each state is a GSAP timeline; idle runs continuously underneath.
 * Swap in final art by replacing the part textures in the asset registry.
 */
export class CharacterRenderer {
  readonly view = new Container();
  private rig = new Container();
  private body: Sprite;
  private headGroup = new Container();
  private head: Sprite;
  private hat: Sprite;
  private brows: Sprite;
  private mouthGrin: Sprite;
  private mouthLaugh: Sprite;
  private armPunch = new Container();
  private armPresent: Sprite;
  private eyes: Graphics[] = [];
  private eyeGlows: Sprite[] = [];
  private aura: Sprite;
  private wisps: Sprite[] = [];
  private punchGlow: Sprite;
  private t = 0;
  private blinkTimer = 2;
  private eyeBoost = 0;
  private lookX = 0;
  private state: CharacterState = 'idle';
  private current?: gsap.core.Timeline;
  reducedMotion = false;

  constructor(parts: Parts, fx: FxTextures) {
    this.aura = new Sprite(fx.softGlow);
    this.aura.anchor.set(0.5);
    this.aura.tint = 0x5ef2d6;
    this.aura.blendMode = 'add';
    this.aura.scale.set(2.2, 3.4);
    this.aura.position.set(0, -60);
    this.aura.alpha = 0.35;

    this.body = new Sprite(parts.body);
    this.body.anchor.set(0.5, 0.15);
    this.body.scale.set(0.5);

    this.armPresent = new Sprite(parts.armPresent);
    this.armPresent.anchor.set(18 / 220, 30 / 120);
    this.armPresent.scale.set(0.5);
    this.armPresent.position.set(36, 8);
    this.armPresent.rotation = 0.35;

    const armPunchArt = new Sprite(parts.armPunch);
    armPunchArt.anchor.set(40 / 140, 20 / 260);
    armPunchArt.scale.set(0.5);
    this.armPunch.addChild(armPunchArt);
    this.armPunch.position.set(-42, 6);
    this.armPunch.rotation = 0.3;

    this.punchGlow = new Sprite(fx.glow);
    this.punchGlow.anchor.set(0.5);
    this.punchGlow.tint = 0x5ef2d6;
    this.punchGlow.blendMode = 'add';
    this.punchGlow.position.set(15, 85);
    this.punchGlow.scale.set(0.6);
    this.punchGlow.alpha = 0.3;
    this.armPunch.addChild(this.punchGlow);

    this.head = new Sprite(parts.head);
    this.head.anchor.set(0.5, 0.9);
    this.head.scale.set(0.5);
    this.brows = new Sprite(parts.brows);
    this.brows.anchor.set(0.5);
    this.brows.scale.set(0.5);
    this.brows.position.set(0, -57);
    this.mouthGrin = new Sprite(parts.mouthGrin);
    this.mouthGrin.anchor.set(0.5);
    this.mouthGrin.scale.set(0.5);
    this.mouthGrin.position.set(4, -22);
    this.mouthLaugh = new Sprite(parts.mouthLaugh);
    this.mouthLaugh.anchor.set(0.5);
    this.mouthLaugh.scale.set(0.5);
    this.mouthLaugh.position.set(2, -20);
    this.mouthLaugh.visible = false;
    this.hat = new Sprite(parts.hat);
    this.hat.anchor.set(0.5, 0.85);
    this.hat.scale.set(0.52);
    this.hat.position.set(4, -76);
    this.hat.rotation = -0.18;

    for (const [x, y] of [[-11, -43], [11, -43]]) {
      const glow = new Sprite(fx.glow);
      glow.anchor.set(0.5);
      glow.tint = 0x5ef2d6;
      glow.blendMode = 'add';
      glow.scale.set(0.35);
      glow.position.set(x, y);
      const eye = new Graphics().ellipse(0, 0, 5.5, 4).fill(0xc7fff1);
      eye.position.set(x, y);
      this.eyes.push(eye);
      this.eyeGlows.push(glow);
    }

    this.headGroup.position.set(0, -6);
    this.headGroup.addChild(this.head, this.brows, this.mouthGrin, this.mouthLaugh, ...this.eyeGlows, ...this.eyes, this.hat);

    for (let i = 0; i < 6; i++) {
      const w = new Sprite(fx.fog);
      w.anchor.set(0.5);
      w.tint = i % 2 ? 0x5ef2d6 : 0x8dffb5;
      w.alpha = 0.25;
      w.scale.set(0.5 + Math.random() * 0.4, 0.4);
      w.blendMode = 'add';
      this.wisps.push(w);
    }

    this.rig.addChild(this.aura, ...this.wisps, this.body, this.armPunch, this.headGroup, this.armPresent);
    this.view.addChild(this.rig);
  }

  get currentState(): CharacterState {
    return this.state;
  }

  update(dt: number): void {
    this.t += dt;
    const rm = this.reducedMotion;
    // idle float + coat sway
    this.rig.y = rm ? 0 : Math.sin(this.t * 1.4) * 10;
    this.body.skew.x = rm ? 0 : Math.sin(this.t * 1.1) * 0.03;
    this.headGroup.rotation += ((rm ? 0 : Math.sin(this.t * 0.9) * 0.04) + this.lookX * 0.12 - this.headGroup.rotation) * 0.08;
    // eyes
    const glow = 0.55 + this.eyeBoost + Math.sin(this.t * 3) * 0.12;
    this.eyeGlows.forEach((g) => (g.alpha = glow));
    this.eyes.forEach((e) => (e.x = (e === this.eyes[0] ? -11 : 11) + this.lookX * 4));
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkTimer = 2.5 + Math.random() * 4;
      for (const e of this.eyes) gsap.timeline().to(e.scale, { y: 0.1, duration: 0.07 }).to(e.scale, { y: 1, duration: 0.1 });
    }
    this.aura.alpha = 0.3 + this.eyeBoost * 0.4 + Math.sin(this.t * 2) * 0.05;
    this.wisps.forEach((w, i) => {
      const a = this.t * 0.6 + i;
      w.position.set(Math.sin(a) * 40, 150 + (i % 3) * 30 + Math.cos(a * 1.3) * 10);
      w.alpha = 0.18 + 0.12 * Math.sin(a * 2);
    });
    this.punchGlow.alpha = 0.25 + this.eyeBoost * 0.6 + Math.sin(this.t * 4) * 0.08;
  }

  /** Switch animation state. Each state returns to idle on completion. */
  play(state: CharacterState, speed = 1): Promise<void> {
    this.current?.progress(1).kill();
    this.state = state;
    this.reset();
    const tl = gsap.timeline({ onComplete: () => void (this.state = 'idle') });
    tl.timeScale(speed);
    const g = this;
    switch (state) {
      case 'spin':
        tl.to(g, { lookX: 1, duration: 0.25 })
          .to(this.armPresent, { rotation: -0.2, duration: 0.2, ease: 'back.out(2)' }, 0)
          .to(this.armPresent, { rotation: 0.35, duration: 0.4, ease: 'sine.inOut' }, 0.4)
          .to(g, { lookX: 0.4, duration: 0.5 }, 0.5);
        break;
      case 'smallWin':
        tl.to(this.headGroup, { y: 0, duration: 0.15, yoyo: true, repeat: 1 })
          .to(this.brows, { y: -61, duration: 0.15, yoyo: true, repeat: 1 }, 0);
        break;
      case 'mediumWin':
        tl.add(() => this.setMouth('laugh'))
          .to(this.hat, { y: -96, rotation: 0.1, duration: 0.25, ease: 'back.out(2)' })
          .to(this.headGroup, { rotation: -0.12, duration: 0.12, yoyo: true, repeat: 3 }, 0)
          .to(this.hat, { y: -76, rotation: -0.18, duration: 0.35, ease: 'bounce.out' }, 0.5)
          .add(() => this.setMouth('grin'), 0.9);
        break;
      case 'bigWin':
        tl.add(() => this.setMouth('laugh'))
          .to(this.view, { y: '-=60', duration: 0.5, ease: 'power2.out' })
          .to(g, { eyeBoost: 0.6, duration: 0.3 }, 0)
          .to(this.armPresent, { rotation: -1.1, duration: 0.35, ease: 'back.out(2)' }, 0)
          .to(this.armPunch, { rotation: -1.6, duration: 0.35, ease: 'back.out(2)' }, 0)
          .to(this.hat, { y: -110, rotation: 0.3, duration: 0.3, yoyo: true, repeat: 3 }, 0.2)
          .to(this.view, { y: '+=60', duration: 0.6, ease: 'bounce.out' }, 1.6)
          .to(this.armPresent, { rotation: 0.35, duration: 0.4 }, 1.6)
          .to(this.armPunch, { rotation: 0.3, duration: 0.4 }, 1.6)
          .to(g, { eyeBoost: 0, duration: 0.5 }, 1.8)
          .add(() => this.setMouth('grin'), 2);
        break;
      case 'bonus':
      case 'punch': {
        const big = state === 'bonus';
        tl.to(g, { eyeBoost: big ? 1 : 0.6, duration: 0.15 })
          .to(this.armPunch, { rotation: -2.3, duration: big ? 0.35 : 0.18, ease: 'power2.out' }, 0)
          .to(this.armPunch, { rotation: 0.6, duration: 0.12, ease: 'power4.in' }, big ? 0.55 : 0.28)
          .to(this.rig, { x: 10, duration: 0.06, yoyo: true, repeat: 1 }, '<0.1')
          .to(this.armPunch, { rotation: 0.3, duration: 0.3 }, '>')
          .to(g, { eyeBoost: 0, duration: 0.6 }, '>-0.1');
        break;
      }
      case 'train':
        tl.to(g, { lookX: -1, duration: 0.6, ease: 'sine.inOut' })
          .to(this.armPresent, { rotation: -0.6, duration: 0.4, ease: 'back.out(2)' }, 0.2)
          .to(this.hat, { rotation: -0.4, y: -84, duration: 0.3 }, 0.6)
          .add(() => this.setMouth('laugh'), 0.6)
          .to(this.armPresent, { rotation: -1.3, duration: 0.5, ease: 'elastic.out(1, 0.5)' }, 1.0)
          .to(g, { lookX: 0, duration: 0.6 }, 2.0)
          .to(this.armPresent, { rotation: 0.35, duration: 0.5 }, 2.2)
          .to(this.hat, { rotation: -0.18, y: -76, duration: 0.4 }, 2.2)
          .add(() => this.setMouth('grin'), 2.4);
        break;
      case 'idle':
        break;
    }
    this.current = tl;
    return new Promise((r) => tl.eventCallback('onComplete', () => ((this.state = 'idle'), r())));
  }

  private setMouth(m: 'grin' | 'laugh'): void {
    this.mouthGrin.visible = m === 'grin';
    this.mouthLaugh.visible = m === 'laugh';
  }

  private reset(): void {
    this.setMouth('grin');
  }
}
