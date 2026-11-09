import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { FxTextures } from './textures';

/** LAST STOP station-sign logo with MIDNIGHT LINE destination board. */
export class LogoRenderer {
  readonly view = new Container();
  private glow: Sprite;
  private title: Text;
  private dot: Sprite;
  private t = 0;

  constructor(fx: FxTextures) {
    const W = 640;
    const H = 132;
    this.glow = new Sprite(fx.softGlow);
    this.glow.anchor.set(0.5);
    this.glow.width = W * 1.5;
    this.glow.height = H * 2.4;
    this.glow.tint = 0x5ef2d6;
    this.glow.alpha = 0.35;
    this.glow.blendMode = 'add';

    const plate = new Graphics();
    plate.roundRect(-W / 2 - 8, -H / 2 - 8, W + 16, H + 16, 30).fill(0x5b3e17);
    plate.roundRect(-W / 2 - 4, -H / 2 - 4, W + 8, H + 8, 28).fill(0xb78b3e);
    plate.roundRect(-W / 2 + 4, -H / 2 + 4, W - 8, H - 8, 24).fill(0x141b2d);
    plate.roundRect(-W / 2 + 4, -H / 2 + 4, W - 8, H - 8, 24).stroke({ width: 2, color: 0x5ef2d6, alpha: 0.6 });
    plate.roundRect(-W / 2, -H / 2 - 2, W, 6, 3).fill({ color: 0xffe9ae, alpha: 0.5 });
    for (const x of [-W / 2 + 18, W / 2 - 18]) for (const y of [-H / 2 + 16, H / 2 - 16]) plate.circle(x, y, 5).fill(0xffe9ae).stroke({ width: 1, color: 0x3d2a0e });
    // route line
    plate.moveTo(-W / 2 + 60, 38).lineTo(W / 2 - 80, 38).stroke({ width: 4, color: 0x5ef2d6, alpha: 0.7 });
    for (let i = 0; i < 6; i++) plate.circle(-W / 2 + 60 + i * ((W - 140) / 5), 38, 6).fill(0x141b2d).stroke({ width: 3, color: 0x5ef2d6 });
    // ticket punch hole top-right
    plate.circle(W / 2 - 46, -H / 2 + 26, 12).fill(0x0e1117).stroke({ width: 3, color: 0x5ef2d6 });

    this.title = new Text({
      text: 'LAST STOP',
      style: {
        fontFamily: 'Bebas Neue',
        fontSize: 104,
        fill: 0xc7fff1,
        letterSpacing: 14,
        stroke: { color: 0xb78b3e, width: 4 },
        dropShadow: { color: 0x5ef2d6, blur: 18, distance: 0, alpha: 1 },
      },
    });
    this.title.anchor.set(0.5);
    this.title.position.set(0, -8);

    this.dot = new Sprite(fx.glow);
    this.dot.anchor.set(0.5);
    this.dot.tint = 0x8dffb5;
    this.dot.blendMode = 'add';
    this.dot.position.set(W / 2 - 80, 38);
    this.dot.scale.set(0.5);

    const board = new Container();
    board.position.set(0, H / 2 + 26);
    const bg = new Graphics();
    bg.roundRect(-150, -20, 300, 40, 8).fill(0x0e1117).stroke({ width: 3, color: 0xb78b3e });
    const sub = new Text({ text: 'MIDNIGHT LINE', style: { fontFamily: 'Bebas Neue', fontSize: 30, fill: 0xf0b45e, letterSpacing: 10, dropShadow: { color: 0xf0b45e, blur: 8, distance: 0, alpha: 0.7 } } });
    sub.anchor.set(0.5);
    board.addChild(bg, sub);

    this.view.addChild(this.glow, plate, this.title, this.dot, board);
  }

  update(dt: number): void {
    this.t += dt;
    this.glow.alpha = 0.3 + Math.sin(this.t * 1.7) * 0.06;
    // occasional neon stutter
    const s = Math.sin(this.t * 0.7) > 0.985 ? 0.6 : 1;
    this.title.alpha = s;
    this.dot.alpha = 0.6 + Math.sin(this.t * 4) * 0.4;
  }
}
