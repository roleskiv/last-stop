import { Container, Sprite } from 'pixi.js';
import { anim, ease } from '../core/anim.ts';
import { ART, tex } from './assets.ts';

type Mouth = 'Smirk' | 'Grin' | 'Laugh' | 'Ooh';

function part(name: string): Sprite {
  const s = new Sprite(tex(`graves/${name}.png`));
  const m = ART[`graves/${name}.png`];
  s.position.set(m.x ?? 0, m.y ?? 0);
  return s;
}

/** A container that rotates and scales around a point given in the character's own space. */
function joint(px: number, py: number, ...children: Container[]): Container {
  const c = new Container();
  c.pivot.set(px, py);
  c.position.set(px, py);
  c.addChild(...children);
  return c;
}

/**
 * Conductor Graves: a small puppet rig. Idle motion is procedural (float, sway, blink);
 * reactions are short tweens layered on top.
 */
export class Graves {
  readonly container = new Container();
  private readonly root: Container;
  private readonly tail: Container;
  private readonly head: Container;
  private readonly hat: Container;
  private readonly armL: Container;
  private readonly armR: Container;
  private readonly lids: Sprite;
  private readonly brows: Sprite;
  private readonly aura: Sprite;
  private readonly mouths: Record<Mouth, Sprite>;
  private blinkAt = 2;
  private busy = false;
  // Offsets added by reactions on top of the idle pose.
  private pose = { y: 0, lean: 0, armL: 0, armR: 0, head: 0, hat: 0, squash: 0, glow: 0 };

  constructor() {
    this.aura = new Sprite(tex('fx/glow.png'));
    this.aura.anchor.set(0.5);
    this.aura.position.set(320, 430);
    this.aura.scale.set(4.4, 5.6);
    this.aura.tint = 0x5ef2d6;
    this.aura.alpha = 0.22;
    this.aura.blendMode = 'add';

    this.tail = joint(320, 570, part('tail'));
    this.mouths = { Smirk: part('mouthSmirk'), Grin: part('mouthGrin'), Laugh: part('mouthLaugh'), Ooh: part('mouthOoh') };
    this.lids = part('eyesClosed');
    this.lids.visible = false;
    this.brows = part('brows');
    this.hat = joint(320, 130, part('hat'));
    this.head = joint(320, 300, part('head'), this.lids, this.brows, ...Object.values(this.mouths), this.hat);
    this.armR = joint(412, 342, part('armR'));
    this.armL = joint(232, 342, part('armL'));
    this.root = joint(320, 560, this.tail, part('body'), this.armR, this.head, this.armL);
    this.container.addChild(this.aura, this.root);
    this.setMouth('Smirk');
  }

  setMouth(m: Mouth): void {
    for (const [k, s] of Object.entries(this.mouths)) s.visible = k === m;
  }

  update(): void {
    const t = anim.clock;
    const p = this.pose;
    this.root.y = 560 + Math.sin(t * 1.5) * 9 + p.y;
    this.root.rotation = Math.sin(t * 0.8) * 0.012 + p.lean;
    this.root.scale.set(1 + p.squash, 1 - p.squash);
    this.tail.skew.x = Math.sin(t * 1.9) * 0.07;
    this.tail.scale.y = 1 + Math.sin(t * 2.3 + 1) * 0.03;
    this.head.rotation = Math.sin(t * 1.1 + 0.6) * 0.03 + p.head;
    this.hat.y = 130 + p.hat;
    this.hat.rotation = p.hat * -0.004;
    this.armR.rotation = Math.sin(t * 1.3) * 0.035 + p.armR;
    this.armL.rotation = Math.sin(t * 1.6 + 2) * 0.03 + p.armL;
    this.aura.alpha = 0.2 + Math.sin(t * 2.1) * 0.04 + p.glow;
    if (t > this.blinkAt) {
      this.lids.visible = true;
      if (t > this.blinkAt + 0.13) {
        this.lids.visible = false;
        this.blinkAt = t + 2.2 + Math.random() * 3.5;
      }
    }
  }

  private async react(mouth: Mouth, fn: () => Promise<unknown>, hold = 0): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.setMouth(mouth);
    await fn();
    if (hold) await anim.wait(hold, true);
    this.setMouth('Smirk');
    this.busy = false;
  }

  /** A pleased nod for ordinary wins. */
  nod(): Promise<void> {
    return this.react('Grin', async () => {
      const p = this.pose, o = { realtime: true };
      await anim.to(p, { head: 0.1, y: 6, glow: 0.08 }, 140, ease.outQuad, o);
      await anim.to(p, { head: 0, y: 0, glow: 0 }, 380, ease.outBack, o);
    }, 250);
  }

  /** Arms up, hat pops, big laugh. */
  cheer(holdMs = 1400): Promise<void> {
    return this.react('Laugh', async () => {
      const p = this.pose, o = { realtime: true };
      await anim.to(p, { y: 14, squash: 0.04 }, 110, ease.outQuad, o);
      void anim.to(p, { hat: -46 }, 240, ease.outCubic, o).then(() => anim.to(p, { hat: 0 }, 420, ease.drop, o));
      await anim.to(p, { y: -34, squash: -0.03, armR: -0.75, armL: 0.5, head: -0.1, glow: 0.2 }, 260, ease.outBack, o);
      for (let i = 0; i < 3; i++) {
        await anim.to(p, { y: -22, head: -0.04 }, 150, ease.inOutQuad, o);
        await anim.to(p, { y: -34, head: -0.1 }, 150, ease.inOutQuad, o);
      }
      await anim.wait(holdMs - 900 > 0 ? holdMs - 900 : 0, true);
      await anim.to(p, { y: 0, squash: 0, armR: 0, armL: 0, head: 0, glow: 0 }, 420, ease.inOutCubic, o);
    });
  }

  /** Swings the ticket punch toward the reels. Resolves at the moment of impact. */
  async punch(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.setMouth('Grin');
    const p = this.pose, o = { realtime: true };
    await anim.to(p, { armL: -0.5, lean: -0.04, head: -0.06 }, 200, ease.outQuad, o);
    await anim.to(p, { armL: 0.95, lean: 0.07, head: 0.06, glow: 0.2 }, 120, ease.inCubic, o);
    void (async () => {
      await anim.wait(160, true);
      await anim.to(p, { armL: 0, lean: 0, head: 0, glow: 0 }, 460, ease.outBack, o);
      this.setMouth('Smirk');
      this.busy = false;
    })();
  }

  /** Leans in, eyes wide: something is coming. */
  anticipate(on: boolean): void {
    if (on && this.busy) return;
    const p = this.pose, o = { realtime: true };
    this.setMouth(on ? 'Ooh' : 'Smirk');
    void anim.to(p, on ? { lean: 0.06, head: 0.08, hat: -14, glow: 0.12 } : { lean: 0, head: 0, hat: 0, glow: 0 }, 300, ease.outCubic, o);
  }

  /** Sweeps his open hand toward the reels. */
  present(): Promise<void> {
    return this.react('Grin', async () => {
      const p = this.pose, o = { realtime: true };
      await anim.to(p, { armR: -0.35, lean: 0.04, glow: 0.1 }, 220, ease.outBack, o);
      await anim.wait(350, true);
      await anim.to(p, { armR: 0, lean: 0, glow: 0 }, 400, ease.inOutCubic, o);
    });
  }
}
