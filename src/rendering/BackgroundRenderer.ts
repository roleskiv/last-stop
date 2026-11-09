import { Container, Graphics, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import type { FxTextures } from './textures';

export const BG_W = 1920;
export const BG_H = 1080;

const C = {
  navy: 0x141b2d,
  charcoal: 0x1e1f26,
  black: 0x0e1117,
  teal: 0x5ef2d6,
  green: 0x8dffb5,
  ecto: 0xc7fff1,
  brass: 0xb78b3e,
  gold: 0xd7b15a,
  amber: 0xf0b45e,
  purple: 0x5e4b7a,
  tile: 0x6b717d,
  red: 0xc94b4b,
};

interface Lamp {
  glow: Sprite;
  pool: Sprite;
  bulb: Graphics;
  base: number;
  flickerT: number;
}

/**
 * Procedural haunted-station environment with layered parallax: tunnel and
 * tracks (far), tiled walls, pillars and signage (mid), lamps, wet floor
 * reflections and fog (near), plus drifting embers and occasional distant
 * train headlights. All drawn in a 1920x1080 design space.
 */
export class BackgroundRenderer {
  readonly view = new Container();
  private far = new Container();
  private mid = new Container();
  private near = new Container();
  private tunnelGlow!: Sprite;
  private headlights: Sprite[] = [];
  private lamps: Lamp[] = [];
  private fogs: Sprite[] = [];
  private embers: { s: Sprite; vx: number; vy: number; ph: number }[] = [];
  private board!: Text;
  private boardTimer = 0;
  private headlightTimer = 6;
  private t = 0;
  private parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  private bonus = 0;
  private bonusTint!: Graphics;
  private warningLights: Sprite[] = [];
  reducedMotion = false;

  constructor(private fx: FxTextures) {
    this.view.addChild(this.far, this.mid, this.near);
    this.buildFar();
    this.buildMid();
    this.buildNear();
  }

  private buildFar(): void {
    const g = new Graphics();
    // base gradient (banded rects for a cheap vertical gradient)
    const bands = 24;
    for (let i = 0; i < bands; i++) {
      const k = i / (bands - 1);
      const col = lerpColor(C.navy, C.black, Math.abs(k - 0.35) * 1.2);
      g.rect(-400, -300 + (i * (BG_H + 600)) / bands, BG_W + 800, (BG_H + 600) / bands + 2).fill(col);
    }
    this.far.addChild(g);

    // tunnel mouth
    const tunnel = new Graphics();
    const cx = BG_W / 2;
    tunnel.moveTo(cx - 470, 900).lineTo(cx - 470, 420).arc(cx, 420, 470, Math.PI, 0).lineTo(cx + 470, 900).closePath().fill(0x1a2030);
    // brick ring
    for (let a = 0; a <= 36; a++) {
      const ang = Math.PI + (a / 36) * Math.PI;
      const x = cx + Math.cos(ang) * 470;
      const y = 420 + Math.sin(ang) * 470;
      tunnel.roundRect(x - 22, y - 14, 44, 28, 4).fill({ color: a % 2 ? 0x2a3142 : 0x323a4e }).stroke({ width: 2, color: 0x0e1117 });
    }
    tunnel.moveTo(cx - 420, 900).lineTo(cx - 420, 430).arc(cx, 430, 420, Math.PI, 0).lineTo(cx + 420, 900).closePath().fill(0x070a0f);
    this.far.addChild(tunnel);

    this.tunnelGlow = new Sprite(this.fx.softGlow);
    this.tunnelGlow.anchor.set(0.5);
    this.tunnelGlow.position.set(cx, 560);
    this.tunnelGlow.scale.set(3.6, 2.6);
    this.tunnelGlow.tint = C.green;
    this.tunnelGlow.alpha = 0.55;
    this.tunnelGlow.blendMode = 'add';
    this.far.addChild(this.tunnelGlow);

    // tracks into the darkness
    const tracks = new Graphics();
    const vanish = { x: cx, y: 600 };
    for (const off of [-260, -120, 120, 260]) {
      tracks.moveTo(vanish.x + off * 0.08, vanish.y).lineTo(cx + off * 2.4, BG_H + 60).stroke({ width: 7, color: 0x6b717d, alpha: 0.75 });
      tracks.moveTo(vanish.x + off * 0.08, vanish.y).lineTo(cx + off * 2.4, BG_H + 60).stroke({ width: 2, color: C.teal, alpha: 0.25 });
    }
    for (let i = 0; i < 14; i++) {
      const k = Math.pow(i / 13, 2);
      const y = vanish.y + k * (BG_H - vanish.y + 40);
      const half = 30 + k * 760;
      tracks.rect(cx - half, y, half * 2, 4 + k * 16).fill({ color: 0x241e1a, alpha: 0.9 });
    }
    this.far.addChild(tracks);

    // headlights (hidden until a train passes far away)
    for (const dx of [-60, 60]) {
      const h = new Sprite(this.fx.glow);
      h.anchor.set(0.5);
      h.position.set(cx + dx, 600);
      h.tint = C.ecto;
      h.blendMode = 'add';
      h.alpha = 0;
      h.scale.set(0.2);
      this.headlights.push(h);
      this.far.addChild(h);
    }
    for (const dx of [-400, 400]) {
      const w = new Sprite(this.fx.glow);
      w.anchor.set(0.5);
      w.position.set(cx + dx, 470);
      w.tint = C.red;
      w.blendMode = 'add';
      w.alpha = 0;
      w.scale.set(0.5);
      this.warningLights.push(w);
      this.far.addChild(w);
    }
  }

  private buildMid(): void {
    const walls = new Graphics();
    const tileW = 64;
    const tileH = 32;
    for (const side of [0, 1]) {
      const x0 = side === 0 ? -300 : BG_W / 2 + 520;
      const x1 = side === 0 ? BG_W / 2 - 520 : BG_W + 300;
      for (let y = 40; y < 820; y += tileH) {
        const shift = (Math.floor(y / tileH) % 2) * (tileW / 2);
        for (let x = x0 - shift; x < x1; x += tileW) {
          const shade = 0.12 + ((x * 7 + y * 13) % 17) / 170;
          const col = lerpColor(C.navy, C.tile, shade);
          walls.roundRect(x + 2, y + 2, tileW - 4, tileH - 4, 3).fill(col);
        }
      }
      // brass trim bands
      walls.rect(x0, 300, x1 - x0, 10).fill(C.brass);
      walls.rect(x0, 312, x1 - x0, 3).fill({ color: 0x000000, alpha: 0.5 });
      walls.rect(x0, 640, x1 - x0, 8).fill(C.brass);
      // grime gradient towards floor
      for (let i = 0; i < 8; i++) walls.rect(x0, 660 + i * 20, x1 - x0, 20).fill({ color: C.black, alpha: 0.1 + i * 0.08 });
    }
    // cracks
    walls.moveTo(180, 120).lineTo(210, 170).lineTo(196, 230).lineTo(240, 300).stroke({ width: 2, color: C.black, alpha: 0.8 });
    walls.moveTo(1700, 380).lineTo(1660, 430).lineTo(1690, 520).stroke({ width: 2, color: C.black, alpha: 0.8 });
    this.mid.addChild(walls);

    // pillars framing the tunnel
    const pillars = new Graphics();
    for (const x of [BG_W / 2 - 560, BG_W / 2 + 500]) {
      pillars.rect(x, 0, 60, 840).fill(0x232838).stroke({ width: 3, color: C.black });
      pillars.rect(x + 8, 0, 8, 840).fill({ color: 0x3a4258, alpha: 0.8 });
      pillars.rect(x - 8, 120, 76, 16).fill(C.brass);
      pillars.rect(x - 8, 780, 76, 20).fill(C.brass);
      for (let y = 160; y < 760; y += 60) pillars.circle(x + 30, y, 4).fill(C.gold);
    }
    this.mid.addChild(pillars);

    // Arrival board, left wall
    const board = new Container();
    board.position.set(250, 150);
    const bg = new Graphics();
    bg.roundRect(-190, -60, 380, 120, 10).fill(0x0b0f16).stroke({ width: 6, color: C.brass });
    bg.rect(-176, -46, 352, 92).fill(0x060a0e);
    board.addChild(bg);
    const title = new Text({ text: 'ARRIVALS', style: { fontFamily: 'Bebas Neue', fontSize: 22, fill: C.amber, letterSpacing: 6 } });
    title.anchor.set(0.5);
    title.position.set(0, -32);
    board.addChild(title);
    this.board = new Text({ text: 'MIDNIGHT LINE   00:00', style: { fontFamily: 'Bebas Neue', fontSize: 34, fill: C.teal, letterSpacing: 4, dropShadow: { color: C.teal, blur: 10, distance: 0, alpha: 0.9 } } });
    this.board.anchor.set(0.5);
    this.board.position.set(0, 10);
    board.addChild(this.board);
    this.mid.addChild(board);

    // Enamel sign, right wall
    const sign = new Container();
    sign.position.set(1680, 200);
    sign.rotation = 0.03;
    const sg = new Graphics();
    sg.roundRect(-170, -40, 340, 80, 40).fill(0x1c2b44).stroke({ width: 6, color: C.brass });
    sg.rect(-150, -8, 300, 16).fill({ color: C.red, alpha: 0.85 });
    sign.addChild(sg);
    const st = new Text({ text: 'LAST STOP', style: { fontFamily: 'Bebas Neue', fontSize: 38, fill: 0xe8eef5, letterSpacing: 8, stroke: { color: 0x0e1117, width: 4 } } });
    st.anchor.set(0.5);
    sign.addChild(st);
    sign.addChild(new Graphics().moveTo(-100, 40).lineTo(-80, 20).stroke({ width: 3, color: 0x5a3a20, alpha: 0.7 }));
    this.mid.addChild(sign);

  }

  private buildNear(): void {
    // platform floor
    const floor = new Graphics();
    floor.rect(-400, 840, BG_W + 800, 400).fill(0x12161f);
    floor.rect(-400, 836, BG_W + 800, 16).fill({ color: C.amber, alpha: 0.55 });
    for (let x = -400; x < BG_W + 400; x += 48) floor.rect(x, 836, 24, 16).fill({ color: C.black, alpha: 0.6 });
    for (let i = 0; i < 10; i++) floor.rect(-400, 860 + i * 24, BG_W + 800, 24).fill({ color: C.black, alpha: i * 0.06 });
    this.near.addChild(floor);

    // reflections of the tunnel glow on the wet floor
    const refl = new Sprite(this.fx.beam);
    refl.anchor.set(0.5, 0);
    refl.position.set(BG_W / 2, 850);
    refl.width = 900;
    refl.height = 260;
    refl.tint = C.green;
    refl.alpha = 0.18;
    refl.blendMode = 'add';
    this.near.addChild(refl);

    // hanging lamps
    const lampXs = [120, 480, 1440, 1800];
    for (const x of lampXs) {
      const lc = new Container();
      lc.position.set(x, 0);
      const wire = new Graphics().moveTo(0, -20).lineTo(0, 70).stroke({ width: 3, color: 0x2a2a2a });
      const shade = new Graphics();
      shade.moveTo(-36, 100).lineTo(-16, 70).lineTo(16, 70).lineTo(36, 100).closePath().fill(C.brass).stroke({ width: 2, color: 0x3d2a0e });
      const bulb = new Graphics().circle(0, 102, 9).fill(0xfff1c9);
      const glow = new Sprite(this.fx.glow);
      glow.anchor.set(0.5);
      glow.position.set(0, 104);
      glow.scale.set(2.2);
      glow.tint = C.amber;
      glow.blendMode = 'add';
      glow.alpha = 0.7;
      const pool = new Sprite(this.fx.beam);
      pool.anchor.set(0.5, 0);
      pool.position.set(0, 108);
      pool.width = 260;
      pool.height = 760;
      pool.tint = C.amber;
      pool.alpha = 0.12;
      pool.blendMode = 'add';
      lc.addChild(pool, wire, shade, bulb, glow);
      this.near.addChild(lc);
      this.lamps.push({ glow, pool, bulb, base: 0.7, flickerT: Math.random() * 4 });
    }

    // fog banks
    for (let i = 0; i < 5; i++) {
      const f = new Sprite(this.fx.fog);
      f.anchor.set(0.5);
      f.position.set(Math.random() * BG_W, 860 + Math.random() * 160);
      f.scale.set(2.4 + Math.random() * 1.6, 1.4 + Math.random());
      f.tint = i % 2 ? C.teal : C.ecto;
      f.alpha = 0.18 + Math.random() * 0.12;
      this.fogs.push(f);
      this.near.addChild(f);
    }

    // embers
    for (let i = 0; i < 60; i++) {
      const s = new Sprite(this.fx.ember);
      s.anchor.set(0.5);
      s.position.set(Math.random() * BG_W, Math.random() * BG_H);
      s.scale.set(0.3 + Math.random() * 0.6);
      s.tint = Math.random() < 0.7 ? C.teal : C.green;
      s.alpha = 0.2 + Math.random() * 0.5;
      s.blendMode = 'add';
      this.embers.push({ s, vx: (Math.random() - 0.5) * 12, vy: -8 - Math.random() * 18, ph: Math.random() * 6 });
      this.near.addChild(s);
    }

    this.bonusTint = new Graphics().rect(-400, -300, BG_W + 800, BG_H + 600).fill(C.purple);
    this.bonusTint.alpha = 0;
    this.bonusTint.blendMode = 'multiply';
    this.near.addChild(this.bonusTint);
  }

  /** Pointer position in -1..1, used for parallax. */
  setPointer(nx: number, ny: number): void {
    this.parallax.tx = nx;
    this.parallax.ty = ny;
  }

  update(dt: number): void {
    this.t += dt;
    const rm = this.reducedMotion;
    // parallax with gentle drift
    const p = this.parallax;
    p.x += (p.tx - p.x) * Math.min(1, dt * 2);
    p.y += (p.ty - p.y) * Math.min(1, dt * 2);
    const sway = rm ? 0 : Math.sin(this.t * 0.2) * 0.25;
    this.far.position.set(-(p.x + sway) * 8, -p.y * 5);
    this.mid.position.set(-(p.x + sway) * 18, -p.y * 10);
    this.near.position.set(-(p.x + sway) * 32, -p.y * 16);

    // tunnel breathing glow
    const glowBase = 0.5 + this.bonus * 0.35;
    this.tunnelGlow.alpha = glowBase + Math.sin(this.t * 1.3) * 0.06;

    // lamps flicker
    for (const l of this.lamps) {
      l.flickerT -= dt;
      let a = l.base + Math.sin(this.t * 7 + l.flickerT) * 0.03;
      if (l.flickerT < 0) {
        if (l.flickerT < -0.25) l.flickerT = 2 + Math.random() * 6;
        a = Math.random() < 0.5 ? 0.15 : l.base;
      }
      l.glow.alpha = a;
      l.pool.alpha = a * 0.17;
      l.bulb.alpha = 0.4 + a * 0.8;
    }

    // fog drift
    for (const f of this.fogs) {
      f.x += dt * (rm ? 4 : 16) * (f.tint === C.teal ? 1 : -0.7);
      if (f.x > BG_W + 500) f.x = -500;
      if (f.x < -500) f.x = BG_W + 500;
    }

    // embers rise
    if (!rm) {
      for (const e of this.embers) {
        e.ph += dt;
        e.s.x += (e.vx + Math.sin(e.ph) * 6) * dt;
        e.s.y += e.vy * dt * (1 + this.bonus);
        if (e.s.y < -20) {
          e.s.y = BG_H + 20;
          e.s.x = Math.random() * BG_W;
        }
      }
    }

    // arrival board glyph changes
    this.boardTimer -= dt;
    if (this.boardTimer <= 0) {
      this.boardTimer = 2.5 + Math.random() * 3;
      const glyphs = ['MIDNIGHT LINE   00:00', 'NEXT ▸ ??:??', 'MIND THE GAP', 'MIDNIGHT LINE   ∞', 'LAST STOP   00:00'];
      this.board.text = this.bonus > 0.5 ? 'MIDNIGHT TRAIN ▸ NOW' : glyphs[Math.floor(Math.random() * glyphs.length)];
    }

    // occasional distant headlights
    this.headlightTimer -= dt;
    if (this.headlightTimer <= 0) {
      this.headlightTimer = (this.bonus > 0.5 ? 5 : 11) + Math.random() * 10;
      this.distantTrain();
    }
    for (const w of this.warningLights) w.alpha = this.bonus * (0.4 + 0.4 * Math.max(0, Math.sin(this.t * 6 + w.x)));
  }

  distantTrain(): void {
    for (const h of this.headlights) {
      gsap.killTweensOf(h);
      gsap.killTweensOf(h.scale);
      h.alpha = 0;
      h.scale.set(0.15);
      gsap.timeline()
        .to(h, { alpha: 0.9, duration: 2.2, ease: 'sine.in' })
        .to(h.scale, { x: 0.9, y: 0.9, duration: 2.2, ease: 'sine.in' }, 0)
        .to(h, { alpha: 0, duration: 0.6 }, 2.2);
    }
  }

  /** Station lights flicker hard (feature activations). */
  flicker(duration = 0.6): void {
    const tl = gsap.timeline();
    for (const l of this.lamps) {
      tl.to(l.glow, { alpha: 0.05, duration: 0.05, repeat: Math.round(duration / 0.1), yoyo: true, ease: 'steps(1)' }, Math.random() * 0.1);
    }
  }

  setBonus(on: boolean): void {
    gsap.to(this, { bonus: on ? 1 : 0, duration: 1.5 });
    gsap.to(this.bonusTint, { alpha: on ? 0.35 : 0, duration: 1.5 });
  }

  /** Dim the whole station (bonus intro / big wins). */
  dim(amount: number, duration = 0.5): void {
    gsap.to(this.view, { alpha: 1 - amount, duration });
  }
}

function lerpColor(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
