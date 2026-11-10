import 'pixi.js/unsafe-eval';
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import { audio } from '../audio/audio.ts';
import { anim, ease } from '../core/anim.ts';
import { ART, symbolTex, tex } from './assets.ts';
import { Particles } from './fx.ts';
import { Graves } from './graves.ts';
import { CELL, FRAME_BORDER, GRID_H, GRID_W, GridView, displayFont } from './grid.ts';

export interface Layout {
  portrait: boolean;
  /** Design size. The HUD (DOM) uses the same coordinate space. */
  w: number; h: number;
  scale: number; x: number; y: number;
}

interface Spec {
  w: number; h: number;
  bg: string; bgCx: number; bgCy: number;
  frame: { cx: number; cy: number; scale: number };
  logo: { cx: number; cy: number; scale: number };
  graves: { x: number; y: number; scale: number };
  board: { x: number; y: number; scale: number };
}

const LANDSCAPE: Spec = {
  w: 1920, h: 1080, bg: 'bg_landscape.jpg', bgCx: 1200, bgCy: 635,
  frame: { cx: 960, cy: 506, scale: 1 },
  logo: { cx: 960, cy: 64, scale: 0.58 },
  graves: { x: -30, y: 118, scale: 0.86 },
  board: { x: 1474, y: 120, scale: 1 },
};
const PORTRAIT: Spec = {
  w: 1080, h: 1920, bg: 'bg_portrait.jpg', bgCx: 675, bgCy: 1140,
  frame: { cx: 540, cy: 900, scale: 1.15 },
  logo: { cx: 540, cy: 120, scale: 0.86 },
  graves: { x: 10, y: 196, scale: 0.6 },
  board: { x: 780, y: 232, scale: 0.68 },
};

const FW = GRID_W + FRAME_BORDER * 2, FH = GRID_H + FRAME_BORDER * 2;

/** Everything drawn on the canvas, and the layout that the DOM HUD follows. */
export class Stage {
  readonly app = new Application();
  readonly grid = new GridView();
  graves!: Graves;
  layout: Layout = { portrait: false, w: 1920, h: 1080, scale: 1, x: 0, y: 0 };
  onLayout: (l: Layout) => void = () => undefined;

  private readonly world = new Container();
  private readonly game = new Container();
  private bg!: Sprite;
  private bgName = '';
  private readonly mood = new Container();
  private readonly fogBack = new Container();
  private readonly fogFront = new Container();
  private readonly gridRoot = new Container();
  private readonly gravesRoot = new Container();
  private readonly boardRoot = new Container();
  private readonly overlay = new Container();
  private readonly embers = new Particles(140);
  private readonly showers = new Particles(260);
  private logo!: Sprite;
  private boardTitle!: Text;
  private boardMain!: Text;
  private boardSub!: Text;
  private dim!: Graphics;
  private tunnelGlow!: Sprite;
  private signalL!: Sprite;
  private signalR!: Sprite;
  private fog: { s: Sprite; speed: number; base: number }[] = [];
  private bonusMood = 0;
  private shake = 0;
  private spec: Spec = LANDSCAPE;
  private emberTimer = 0;

  async init(parent: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: window, antialias: true, backgroundColor: 0x0c111d, autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2), preference: 'webgl', powerPreference: 'high-performance',
    });
    parent.appendChild(this.app.canvas);
    this.app.canvas.style.touchAction = 'none';
  }

  /** Build the scene. Call once textures are loaded. */
  build(): void {
    this.bg = new Sprite();
    this.bg.anchor.set(0.5);

    this.tunnelGlow = this.glow(0x8dffb5, 0);
    this.signalL = this.glow(0xc94b4b, 0);
    this.signalR = this.glow(0xc94b4b, 0);
    this.mood.addChild(this.tunnelGlow, this.signalL, this.signalR);

    for (let i = 0; i < 7; i++) {
      const s = new Sprite(tex('fx/smoke.png'));
      s.anchor.set(0.5);
      s.tint = i % 3 === 0 ? 0x8dffb5 : 0xc7fff1;
      s.blendMode = 'add';
      const front = i >= 4;
      (front ? this.fogFront : this.fogBack).addChild(s);
      this.fog.push({ s, speed: (12 + Math.random() * 22) * (i % 2 ? 1 : -1), base: front ? 0.05 : 0.085 });
    }

    const back = new Sprite(tex('frame_back.png'));
    const front = new Sprite(tex('frame_front.png'));
    this.grid.container.position.set(FRAME_BORDER, FRAME_BORDER);
    this.grid.top.position.set(FRAME_BORDER, FRAME_BORDER);
    this.gridRoot.addChild(back, this.grid.container, front, this.grid.top);
    this.gridRoot.pivot.set(FW / 2, FH / 2);

    this.graves = new Graves();
    this.gravesRoot.addChild(this.graves.container);

    const board = new Sprite(tex('board.png'));
    this.boardTitle = new Text({ text: 'ARRIVALS', style: { fontFamily: 'Bebas Neue', fontSize: 30, fill: 0xf0b45e, letterSpacing: 8 } });
    this.boardTitle.anchor.set(0.5);
    this.boardTitle.position.set(200, 96);
    this.boardMain = new Text({ text: '', style: { fontFamily: 'Bebas Neue', fontSize: 64, fill: 0x8dffb5, letterSpacing: 3, align: 'center', lineHeight: 62 } });
    this.boardMain.anchor.set(0.5);
    this.boardMain.position.set(200, 186);
    this.boardSub = new Text({ text: '', style: { fontFamily: 'Bebas Neue', fontSize: 30, fill: 0xc7fff1, letterSpacing: 3, align: 'center' } });
    this.boardSub.anchor.set(0.5);
    this.boardSub.position.set(200, 268);
    this.boardRoot.addChild(board, this.boardTitle, this.boardMain, this.boardSub);

    this.logo = new Sprite(tex('logo.png'));
    this.logo.anchor.set(0.5);

    this.dim = new Graphics().rect(-4000, -4000, 8000, 8000).fill(0x04060b);
    this.dim.alpha = 0;
    this.overlay.addChild(this.dim);

    this.game.addChild(this.mood, this.fogBack, this.gravesRoot, this.boardRoot, this.gridRoot, this.logo, this.embers.container, this.fogFront, this.showers.container, this.overlay);
    this.world.addChild(this.bg, this.game);
    this.app.stage.addChild(this.world);

    this.setBoard('MIND\nTHE GAP', 'NEXT TRAIN: MIDNIGHT');
    this.app.renderer.on('resize', () => this.resize());
    this.resize();
    this.app.ticker.add((ticker) => this.update(ticker.deltaMS));
  }

  private glow(tint: number, alpha: number): Sprite {
    const s = new Sprite(tex('fx/glow.png'));
    s.anchor.set(0.5);
    s.tint = tint;
    s.alpha = alpha;
    s.blendMode = 'add';
    return s;
  }

  resize(): void {
    const W = this.app.screen.width, H = this.app.screen.height;
    const portrait = H > W;
    const spec = portrait ? PORTRAIT : LANDSCAPE;
    this.spec = spec;
    const scale = Math.min(W / spec.w, H / spec.h);
    const x = (W - spec.w * scale) / 2, y = (H - spec.h * scale) / 2;
    this.layout = { portrait, w: spec.w, h: spec.h, scale, x, y };
    this.game.scale.set(scale);
    this.game.position.set(x, y);

    if (this.bgName !== spec.bg) {
      this.bgName = spec.bg;
      this.bg.texture = tex(spec.bg);
    }
    // The background covers the whole window and stays registered to the frame centre.
    const art = ART[spec.bg];
    const fcx = x + spec.frame.cx * scale, fcy = y + spec.frame.cy * scale;
    const need = Math.max(
      scale,
      fcx / spec.bgCx, (W - fcx) / (art.w - spec.bgCx),
      fcy / spec.bgCy, (H - fcy) / (art.h - spec.bgCy),
    );
    this.bg.scale.set(need);
    this.bg.anchor.set(spec.bgCx / art.w, spec.bgCy / art.h);
    this.bg.position.set(fcx, fcy);

    this.gridRoot.position.set(spec.frame.cx, spec.frame.cy);
    this.gridRoot.scale.set(spec.frame.scale);
    this.logo.position.set(spec.logo.cx, spec.logo.cy);
    this.logo.scale.set(spec.logo.scale);
    this.gravesRoot.position.set(spec.graves.x, spec.graves.y);
    this.gravesRoot.scale.set(spec.graves.scale);
    this.boardRoot.position.set(spec.board.x, spec.board.y);
    this.boardRoot.scale.set(spec.board.scale);

    const fh = FH * spec.frame.scale;
    this.tunnelGlow.position.set(spec.frame.cx, spec.frame.cy);
    this.tunnelGlow.scale.set((spec.w / 256) * 1.5, (fh / 256) * 2.1);
    this.signalL.position.set(spec.frame.cx - FW * spec.frame.scale * 0.56, spec.frame.cy - fh * 0.2);
    this.signalR.position.set(spec.frame.cx + FW * spec.frame.scale * 0.56, spec.frame.cy - fh * 0.2);
    this.signalL.scale.set(1.6); this.signalR.scale.set(1.6);

    const floorY = spec.frame.cy + fh / 2 + 30;
    this.fog.forEach((f, i) => {
      f.s.position.set((spec.w / this.fog.length) * (i + 0.5), floorY + (i % 3) * 26 - 20);
      f.s.scale.set(3.2 + (i % 3) * 0.7, 1.1 + (i % 2) * 0.4);
    });
    this.onLayout(this.layout);
  }

  private update(dtMs: number): void {
    anim.update(dtMs);
    this.graves.update();
    this.grid.update(dtMs);
    this.embers.update(dtMs);
    this.showers.update(dtMs);
    const t = anim.clock, spec = this.spec, dt = dtMs / 1000;

    for (const f of this.fog) {
      f.s.x += f.speed * dt;
      if (f.s.x > spec.w + 420) f.s.x = -420;
      if (f.s.x < -420) f.s.x = spec.w + 420;
      f.s.alpha = (f.base + Math.sin(t * 0.5 + f.speed) * 0.02) * (1 + this.bonusMood * 1.4);
    }
    this.emberTimer -= dtMs;
    if (this.emberTimer <= 0) {
      this.emberTimer = 260 - this.bonusMood * 170;
      this.embers.burst(Math.random() * spec.w, spec.h * (0.35 + Math.random() * 0.6), {
        count: 1, tint: [0x5ef2d6, 0x8dffb5, 0xc7fff1], speed: [8, 40], angle: [-Math.PI * 0.75, -Math.PI * 0.25],
        life: [2.5, 5], scale: [0.03, 0.09], endScale: 0.6, drag: 0, gravity: -6,
      });
    }
    const m = this.bonusMood;
    this.tunnelGlow.alpha = m * (0.2 + Math.sin(t * 2.2) * 0.05);
    const blink = Math.sin(t * 5) > 0 ? 1 : 0.25;
    this.signalL.alpha = m * 0.75 * blink;
    this.signalR.alpha = m * 0.75 * (1.25 - blink);
    const c = Math.round(255 - m * 95);
    this.bg.tint = (c << 16) | (Math.round(255 - m * 40) << 8) | Math.round(255 - m * 55);

    if (this.shake > 0.2) {
      this.world.position.set((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      this.shake *= 0.9;
    } else if (this.world.x !== 0 || this.world.y !== 0) {
      this.world.position.set(0, 0);
    }
  }

  kick(amount: number): void { this.shake = Math.max(this.shake, amount * this.layout.scale); }

  /** Write on the arrivals board. */
  setBoard(main: string, sub = '', title = 'ARRIVALS'): void {
    if (this.boardMain.text === main && this.boardSub.text === sub) return;
    this.boardTitle.text = title;
    this.boardMain.text = main;
    this.boardSub.text = sub;
    const fit = Math.min(1, 330 / Math.max(1, this.boardMain.width / this.boardMain.scale.x));
    this.boardMain.scale.set(fit);
    this.boardSub.scale.set(Math.min(1, 330 / Math.max(1, this.boardSub.width / this.boardSub.scale.x)));
    this.boardMain.alpha = 0.2;
    void anim.run(260, (k) => { this.boardMain.alpha = k < 0.3 ? 0.2 : k < 0.5 ? 1 : k < 0.65 ? 0.4 : 1; }, { realtime: true });
  }

  setBonusMood(on: boolean): Promise<void> {
    return anim.to(this as unknown as { bonusMood: number }, { bonusMood: on ? 1 : 0 }, 900, ease.inOutQuad, { realtime: true });
  }

  private frameCentre(): { x: number; y: number } { return { x: this.spec.frame.cx, y: this.spec.frame.cy }; }

  // ---------- cinematics ----------

  /** The Midnight Train bursts out of the tunnel toward the camera. */
  async trainIntro(): Promise<void> {
    const { x, y } = this.frameCentre();
    audio.duck(0.15, 4);
    await anim.to(this.dim, { alpha: 0.72 }, 350, ease.outQuad, { realtime: true });
    audio.play('horn');
    const light = this.glow(0xc7fff1, 0);
    light.position.set(x, y);
    this.overlay.addChild(light);
    const train = new Sprite(tex('train.png'));
    train.anchor.set(0.5, 0.42);
    train.position.set(x, y);
    train.scale.set(0.02);
    train.alpha = 0;
    this.overlay.addChild(train);
    this.graves.anticipate(true);
    await Promise.all([
      anim.to(light, { alpha: 0.9 }, 900, ease.inQuad, { realtime: true }),
      anim.to(light.scale, { x: 5, y: 5 }, 900, ease.inQuad, { realtime: true }),
      anim.to(train, { alpha: 1 }, 500, ease.outQuad, { realtime: true, delay: 300 }),
      anim.to(train.scale, { x: 0.22, y: 0.22 }, 900, ease.inQuad, { realtime: true }),
    ]);
    audio.play('train');
    this.kick(26);
    const big = Math.max(this.spec.w, this.spec.h) / 240;
    await Promise.all([
      anim.to(train.scale, { x: big, y: big }, 620, ease.inCubic, { realtime: true }),
      anim.to(train, { y: y + this.spec.h * 0.3 }, 620, ease.inCubic, { realtime: true }),
      anim.to(light.scale, { x: 30, y: 30 }, 620, ease.inCubic, { realtime: true }),
      anim.run(620, () => this.kick(18), { realtime: true }),
    ]);
    const flash = new Graphics().rect(-4000, -4000, 8000, 8000).fill(0xe8fff8);
    this.overlay.addChild(flash);
    train.destroy();
    light.destroy();
    this.graves.anticipate(false);
    await anim.to(flash, { alpha: 0 }, 520, ease.outQuad, { realtime: true });
    flash.destroy();
  }

  /**
   * A centred announcement card. Resolves when the player taps it or after `autoMs`.
   */
  async banner(title: string, lines: { text: string; size?: number; color?: number }[], opts: { autoMs: number; prompt?: string; keepDim?: boolean }): Promise<void> {
    const { x, y } = this.frameCentre();
    if (this.dim.alpha < 0.6) void anim.to(this.dim, { alpha: 0.72 }, 250, ease.outQuad, { realtime: true });
    const card = new Container();
    card.position.set(x, y);
    const width = Math.min(this.spec.w - 80, 860);
    const rays = this.glow(0x5ef2d6, 0.5);
    rays.scale.set(width / 150, 3.4);
    const body: Container[] = [];
    let cursor = 0;
    const head = new Text({ text: title, style: displayFont(108, 0xc7fff1, { letterSpacing: 6 }) });
    head.anchor.set(0.5, 0);
    head.scale.set(Math.min(1, (width - 80) / head.width));
    body.push(head);
    cursor += head.height + 6;
    for (const l of lines) {
      const txt = new Text({ text: l.text, style: displayFont(l.size ?? 60, l.color ?? 0xffe9a8, { letterSpacing: 3 }) });
      txt.anchor.set(0.5, 0);
      txt.y = cursor;
      txt.scale.set(Math.min(1, (width - 80) / txt.width));
      cursor += txt.height + 4;
      body.push(txt);
    }
    const prompt = new Text({ text: opts.prompt ?? 'TAP TO CONTINUE', style: { fontFamily: 'Bebas Neue', fontSize: 30, fill: 0x8fa0b8, letterSpacing: 6 } });
    prompt.anchor.set(0.5, 0);
    prompt.y = cursor + 22;
    body.push(prompt);
    cursor += 70;
    const panel = new Graphics()
      .roundRect(-width / 2, -40, width, cursor + 80, 30).fill({ color: 0x0b1220, alpha: 0.94 }).stroke({ color: 0xb78b3e, width: 8 })
      .roundRect(-width / 2 + 12, -28, width - 24, cursor + 56, 22).stroke({ color: 0x5ef2d6, width: 2, alpha: 0.7 });
    const inner = new Container();
    inner.addChild(panel, ...body);
    inner.y = -(cursor + 0) / 2;
    card.addChild(rays, inner);
    card.scale.set(0.5);
    card.alpha = 0;
    this.overlay.addChild(card);
    await Promise.all([
      anim.to(card, { alpha: 1 }, 200, ease.outQuad, { realtime: true }),
      anim.to(card.scale, { x: 1, y: 1 }, 420, ease.outBack, { realtime: true }),
    ]);
    const blink = anim.run(opts.autoMs, (k) => { prompt.alpha = 0.55 + Math.sin(k * opts.autoMs / 260) * 0.45; }, { realtime: true });
    await Promise.race([blink, this.nextTap(350)]);
    await Promise.all([
      anim.to(card, { alpha: 0 }, 200, ease.inQuad, { realtime: true }),
      anim.to(card.scale, { x: 1.1, y: 1.1 }, 200, ease.inQuad, { realtime: true }),
      opts.keepDim ? Promise.resolve() : anim.to(this.dim, { alpha: 0 }, 300, ease.inQuad, { realtime: true }),
    ]);
    card.destroy({ children: true });
  }

  undim(): Promise<void> { return anim.to(this.dim, { alpha: 0 }, 300, ease.inQuad, { realtime: true }); }

  private tapWaiters: (() => void)[] = [];
  /** Called by the controller for any tap / key press on the stage. */
  tap(): void { const w = this.tapWaiters; this.tapWaiters = []; w.forEach((f) => f()); }
  nextTap(armAfterMs = 0): Promise<void> {
    return new Promise((resolve) => { setTimeout(() => this.tapWaiters.push(resolve), armAfterMs); });
  }

  /**
   * Big win celebration with a count-up. `tiers` are the titles reached, in order.
   * `format` turns the running amount into text.
   */
  async bigWin(tiers: { title: string; at: number }[], total: number, format: (v: number) => string, maxWin: boolean): Promise<void> {
    const { x, y } = this.frameCentre();
    audio.duck(0.2, 6);
    void anim.to(this.dim, { alpha: 0.6 }, 250, ease.outQuad, { realtime: true });
    const root = new Container();
    root.position.set(x, y);
    const rays = new Container();
    for (let i = 0; i < 12; i++) {
      const r = new Graphics().moveTo(0, 0).lineTo(-70, -900).lineTo(70, -900).closePath().fill({ color: i % 2 ? 0x5ef2d6 : 0xf0b45e, alpha: 0.16 });
      r.rotation = (Math.PI * 2 * i) / 12;
      r.blendMode = 'add';
      rays.addChild(r);
    }
    const halo = this.glow(0xf0b45e, 0.55);
    halo.scale.set(6, 3.6);
    const title = new Text({ text: tiers[0].title, style: displayFont(150, 0xffe9a8, { letterSpacing: 8 }) });
    title.anchor.set(0.5);
    title.y = -70;
    const amount = new Text({ text: format(0), style: displayFont(120, 0xf2fffb, { letterSpacing: 4 }) });
    amount.anchor.set(0.5);
    amount.y = 80;
    root.addChild(rays, halo, title, amount);
    root.scale.set(0.3);
    root.alpha = 0;
    this.overlay.addChild(root);
    const fitTitle = (): void => { title.scale.set(Math.min(1, (this.spec.w - 100) / (title.width / title.scale.x))); };
    fitTitle();

    let done = false;
    const spin = anim.run(60000, () => { if (!done) rays.rotation += 0.006; }, { realtime: true });
    void spin;
    const shower = async (): Promise<void> => {
      while (!done) {
        this.showers.burst(Math.random() * this.spec.w, -60, {
          texture: symbolTex(0), count: 1, additive: false, speed: [200, 520], angle: [Math.PI * 0.4, Math.PI * 0.6],
          gravity: 900, drag: 0, life: [1.8, 2.6], scale: [0.16, 0.34], endScale: 1, spin: 6,
        });
        this.showers.burst(Math.random() * this.spec.w, Math.random() * this.spec.h, { texture: tex('fx/spark.png'), count: 1, tint: [0xffe9a8, 0x5ef2d6], speed: [10, 60], scale: [0.2, 0.6], life: [0.4, 0.9], spin: 4 });
        await anim.wait(45, true);
      }
    };
    void shower();
    void this.graves.cheer(2600);
    audio.play('bigwin');
    const stopTick = audio.loop('tick', 0.5);
    await Promise.all([
      anim.to(root, { alpha: 1 }, 200, ease.outQuad, { realtime: true }),
      anim.to(root.scale, { x: 1, y: 1 }, 500, ease.outElastic, { realtime: true }),
    ]);

    let skipped = false;
    void this.nextTap(500).then(() => { skipped = true; });
    let tier = 0;
    const countMs = Math.min(9000, 2600 + tiers.length * 1700);
    await anim.run(countMs, (k) => {
      const v = skipped ? total : total * ease.outQuad(k);
      amount.text = format(v);
      while (tier + 1 < tiers.length && v >= tiers[tier + 1].at) {
        tier++;
        title.text = tiers[tier].title;
        title.scale.set(1);
        fitTitle();
        const s = title.scale.x;
        title.scale.set(s * 1.6);
        void anim.to(title.scale, { x: s, y: s }, 420, ease.outBack, { realtime: true });
        audio.play('bigwin', { rate: 1 + tier * 0.12 });
        this.kick(16);
        this.grid.flash([0xffe9a8, 0x5ef2d6]);
      }
    }, { realtime: true }).then(() => undefined);
    // A tap during the count jumps to the end.
    amount.text = format(total);
    if (maxWin) { title.text = 'MAX WIN'; fitTitle(); }
    stopTick();
    audio.play('coin');
    await anim.to(amount.scale, { x: 1.2, y: 1.2 }, 140, ease.outQuad, { realtime: true });
    await anim.to(amount.scale, { x: 1, y: 1 }, 300, ease.outBack, { realtime: true });
    await Promise.race([anim.wait(skipped ? 900 : 1900, true), this.nextTap(400)]);
    done = true;
    await Promise.all([
      anim.to(root, { alpha: 0 }, 300, ease.inQuad, { realtime: true }),
      anim.to(this.dim, { alpha: 0 }, 300, ease.inQuad, { realtime: true }),
    ]);
    root.destroy({ children: true });
  }

  /** A quick line of praise over the board, for wins below the big-win threshold. */
  async toast(text: string, color = 0xc7fff1): Promise<void> {
    const { x, y } = this.frameCentre();
    const t = new Text({ text, style: displayFont(96, color, { letterSpacing: 6 }) });
    t.anchor.set(0.5);
    t.position.set(x, y);
    t.scale.set(0.3);
    t.alpha = 0;
    this.overlay.addChild(t);
    await Promise.all([anim.to(t, { alpha: 1 }, 140), anim.to(t.scale, { x: 1, y: 1 }, 360, ease.outBack)]);
    await anim.wait(620);
    await Promise.all([anim.to(t, { alpha: 0, y: y - 50 }, 260, ease.inQuad)]);
    t.destroy();
  }

  get cell(): number { return CELL; }
}
