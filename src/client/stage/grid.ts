import { Container, Graphics, Sprite, Text, type TextStyleOptions } from 'pixi.js';
import { COLS, PIGEON, ROWS, SCATTER, WILD, colOf, rowOf } from '../../math/symbols.ts';
import type { Step, TileState } from '../../math/types.ts';
import { audio } from '../audio/audio.ts';
import { anim, ease } from '../core/anim.ts';
import { money } from '../core/format.ts';
import { symbolTex, tex } from './assets.ts';
import { Particles } from './fx.ts';

export const CELL = 138;
export const GRID_W = CELL * COLS;
export const GRID_H = CELL * ROWS;
export const FRAME_BORDER = 46;
const SYMBOL_SCALE = 0.53;

const cx = (pos: number): number => colOf(pos) * CELL + CELL / 2;
const cy = (pos: number): number => rowOf(pos) * CELL + CELL / 2;

export const displayFont = (size: number, fill: number, extra: Partial<TextStyleOptions> = {}): TextStyleOptions => ({
  fontFamily: 'Bebas Neue', fontSize: size, fill, letterSpacing: 2, align: 'center',
  stroke: { color: 0x0a0d14, width: Math.max(4, size * 0.14), join: 'round' },
  dropShadow: { color: 0x000000, alpha: 0.6, blur: 6, distance: 4, angle: Math.PI / 2 },
  ...extra,
});

interface SymbolView {
  c: Container;
  sprite: Sprite;
  sym: number;
}

interface TileView {
  marker: Sprite;
  badge: Container;
  label: Text;
  mult: number;
}

const TINT: Record<number, number[]> = {
  0: [0xf0b45e, 0xffe9a8], 1: [0xffe9a8, 0xc94b4b], 2: [0x8dffb5, 0x5ef2d6], 3: [0xaeb6c4, 0x5ef2d6],
  4: [0xffe9a8, 0xf0b45e], 5: [0x5ef2d6, 0xc7fff1], 6: [0x9a86c8, 0x5ef2d6], 7: [0xf0b45e, 0xc94b4b],
  8: [0x5ef2d6, 0xc7fff1],
};

/** The 6 x 5 board: symbols, Phantom Platform markers, win highlights and all board animation. */
export class GridView {
  readonly container = new Container();
  /** Layer above the frame's front border, for win labels and platform badges. */
  readonly top = new Container();
  readonly fx = new Particles(420);
  private readonly tilesLayer = new Container();
  private readonly hiLayer = new Container();
  private readonly symLayer = new Container();
  private readonly badgeLayer = new Container();
  private readonly labelLayer = new Container();
  private views: (SymbolView | null)[] = new Array(COLS * ROWS).fill(null);
  private tiles = new Map<number, TileView>();

  constructor() {
    const mask = new Graphics().rect(-2, -2, GRID_W + 4, GRID_H + 4).fill(0xffffff);
    this.symLayer.mask = mask;
    this.container.addChild(this.tilesLayer, this.hiLayer, mask, this.symLayer, this.fx.container);
    this.top.addChild(this.badgeLayer, this.labelLayer);
  }

  update(dtMs: number): void {
    this.fx.update(dtMs);
    const t = anim.clock;
    for (let i = 0; i < this.views.length; i++) {
      const v = this.views[i];
      if (v && v.sym >= WILD) v.sprite.scale.set(SYMBOL_SCALE * (1 + Math.sin(t * 2.6 + i) * 0.025));
    }
    for (const [pos, tile] of this.tiles) tile.marker.alpha = 0.78 + Math.sin(t * 3 + pos) * 0.2;
  }

  private make(sym: number, pos: number): SymbolView {
    const sprite = new Sprite(symbolTex(sym));
    sprite.anchor.set(0.5);
    sprite.scale.set(SYMBOL_SCALE);
    const c = new Container();
    c.addChild(sprite);
    c.position.set(cx(pos), cy(pos));
    this.symLayer.addChild(c);
    return { c, sprite, sym };
  }

  private setSym(v: SymbolView, sym: number): void {
    v.sym = sym;
    v.sprite.texture = symbolTex(sym);
  }

  /** Show a board immediately, without animation. */
  setGrid(grid: number[]): void {
    for (const v of this.views) v?.c.destroy({ children: true });
    this.views = grid.map((sym, pos) => this.make(sym, pos));
  }

  /** The old symbols fall out through the floor. */
  async dropOut(): Promise<void> {
    const old = this.views;
    this.views = new Array(COLS * ROWS).fill(null);
    this.clearLabels();
    const jobs: Promise<void>[] = [];
    old.forEach((v, pos) => {
      if (!v) return;
      const delay = colOf(pos) * 34 + (ROWS - 1 - rowOf(pos)) * 16;
      jobs.push(anim.to(v.c, { y: v.c.y + GRID_H + CELL }, 250, ease.inQuad, { delay }).then(() => v.c.destroy({ children: true })));
    });
    await Promise.all(jobs);
  }

  /** New symbols drop in column by column. Slows down when a third Scatter is still possible. */
  async dropIn(grid: number[], onAnticipation: (on: boolean) => void): Promise<void> {
    for (const v of this.views) v?.c.destroy({ children: true });
    this.views = new Array(COLS * ROWS).fill(null);
    let scatters = 0;
    let delay = 0;
    let anticipating = false;
    const jobs: Promise<void>[] = [];
    for (let c = 0; c < COLS; c++) {
      const tense = scatters >= 2 && c >= 2;
      if (tense) {
        delay += 420;
        if (!anticipating) {
          anticipating = true;
          const at = delay - 420;
          void anim.wait(at).then(() => { onAnticipation(true); audio.play('tension', { volume: 0.7 }); });
        }
      }
      let colScatters = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        const pos = c * ROWS + r;
        const v = this.make(grid[pos], pos);
        this.views[pos] = v;
        const target = v.c.y;
        v.c.y = target - GRID_H - CELL * 0.6;
        const d = delay + (ROWS - 1 - r) * 26;
        if (grid[pos] === SCATTER) colScatters++;
        jobs.push(anim.to(v.c, { y: target }, 400, ease.drop, { delay: d }));
      }
      const landAt = delay + 310;
      const before = scatters;
      void anim.wait(landAt).then(() => {
        audio.play('land', { rate: 0.92 + c * 0.03, volume: 0.6 });
        for (let r = 0; r < ROWS; r++) {
          const pos = c * ROWS + r;
          if (grid[pos] === SCATTER) this.scatterLand(pos, before + 1);
          else if (grid[pos] >= WILD) this.sparkle(pos, 6);
        }
      });
      scatters += colScatters;
      delay += 78;
    }
    await Promise.all(jobs);
    if (anticipating) onAnticipation(false);
  }

  private scatterLand(pos: number, nth: number): void {
    audio.play('scatter', { rate: 0.9 + Math.min(nth, 4) * 0.1 });
    this.ring(pos, 0x8dffb5);
    this.fx.burst(cx(pos), cy(pos), { count: 14, tint: [0x8dffb5, 0xc7fff1], speed: [60, 260], scale: [0.1, 0.3] });
    const v = this.views[pos];
    if (v) void anim.to(v.c.scale, { x: 1.25, y: 1.25 }, 140, ease.outQuad).then(() => anim.to(v.c.scale, { x: 1, y: 1 }, 320, ease.outBack));
  }

  private sparkle(pos: number, count: number, tint: number[] = [0x5ef2d6, 0xc7fff1]): void {
    this.fx.burst(cx(pos), cy(pos), { texture: tex('fx/spark.png'), count, tint, speed: [40, 200], scale: [0.12, 0.35], spin: 4 });
  }

  private ring(pos: number, tint: number): void {
    const s = new Sprite(tex('fx/ring.png'));
    s.anchor.set(0.5);
    s.position.set(cx(pos), cy(pos));
    s.tint = tint;
    s.blendMode = 'add';
    s.scale.set(0.3);
    this.fx.container.addChild(s);
    void Promise.all([
      anim.to(s.scale, { x: 1.5, y: 1.5 }, 520, ease.outCubic),
      anim.to(s, { alpha: 0 }, 520, ease.inQuad),
    ]).then(() => s.destroy());
  }

  // ---------- Phantom Platforms ----------

  /** Make the platform markers match `list`. */
  setTiles(list: TileState[], animate: boolean): void {
    const want = new Map(list.map((t) => [t.pos, t.mult]));
    for (const [pos, tile] of this.tiles) {
      if (!want.has(pos)) {
        tile.marker.destroy();
        tile.badge.destroy({ children: true });
        this.tiles.delete(pos);
      }
    }
    for (const [pos, mult] of want) this.setTile(pos, mult, animate);
  }

  private setTile(pos: number, mult: number, animate: boolean): void {
    let tile = this.tiles.get(pos);
    if (!tile) {
      const marker = new Sprite(tex('fx/tile.png'));
      marker.anchor.set(0.5);
      marker.position.set(cx(pos), cy(pos));
      marker.blendMode = 'add';
      this.tilesLayer.addChild(marker);
      const badge = new Container();
      const plate = new Sprite(tex('fx/badge.png'));
      plate.anchor.set(0.5);
      const label = new Text({ text: '', style: { fontFamily: 'Bebas Neue', fontSize: 30, fill: 0x8dffb5, letterSpacing: 1 } });
      label.anchor.set(0.5, 0.46);
      badge.addChild(plate, label);
      badge.position.set(cx(pos) + CELL / 2 - 38, cy(pos) + CELL / 2 - 24);
      this.badgeLayer.addChild(badge);
      tile = { marker, badge, label, mult: 0 };
      this.tiles.set(pos, tile);
      if (animate) {
        marker.scale.set(1.7);
        marker.alpha = 0;
        void anim.to(marker.scale, { x: 1, y: 1 }, 360, ease.outBack);
        this.ring(pos, 0x5ef2d6);
      }
    }
    if (tile.mult !== mult) {
      const grew = tile.mult !== 0;
      tile.mult = mult;
      tile.label.text = `x${mult}`;
      tile.label.style.fill = mult >= 32 ? 0xffe9a8 : mult >= 8 ? 0xc7fff1 : 0x8dffb5;
      if (animate) {
        tile.badge.scale.set(grew ? 1.9 : 0.2);
        void anim.to(tile.badge.scale, { x: 1, y: 1 }, 420, ease.outBack);
        if (grew) this.sparkle(pos, 5, [0xf0b45e, 0xffe9a8]);
      }
    }
  }

  /** Platform Signs haunt their tile and flip into a regular symbol. */
  async signs(step: Extract<Step, { t: 'signs' }>): Promise<void> {
    await Promise.all(step.signs.map(async (s, i) => {
      const v = this.views[s.pos];
      await anim.wait(i * 130);
      audio.play('sign', { rate: 1 + i * 0.05 });
      if (v) {
        await anim.run(260, (t) => { v.c.rotation = Math.sin(t * Math.PI * 5) * 0.12 * (1 - t); });
        v.c.rotation = 0;
      }
      this.setTile(s.pos, s.mult, true);
      audio.play('tile', { rate: 1 + Math.log2(s.mult) * 0.06 });
      if (v) {
        await anim.to(v.c.scale, { x: 0 }, 110, ease.inQuad);
        this.setSym(v, s.becomes);
        await anim.to(v.c.scale, { x: 1 }, 200, ease.outBack);
      }
    }));
    await anim.wait(160);
  }

  /** Ticket Punches: `swing` plays Graves' swing and resolves at the moment of impact. */
  async punch(step: Extract<Step, { t: 'punch' }>, swing: () => Promise<void>): Promise<void> {
    for (const p of step.punches) {
      const v = this.views[p.pos];
      if (v) void anim.to(v.c.scale, { x: 1.2, y: 1.2 }, 160, ease.outQuad);
      await swing();
      audio.play('punch');
      if (v) {
        this.setSym(v, WILD);
        this.sparkle(p.pos, 12);
        this.ring(p.pos, 0x5ef2d6);
        void anim.to(v.c.scale, { x: 1, y: 1 }, 300, ease.outBack);
      }
      await Promise.all(p.targets.map(async (target, i) => {
        await anim.wait(60 + i * 110);
        const bolt = new Sprite(tex('fx/spark.png'));
        bolt.anchor.set(0.5);
        bolt.tint = 0xc7fff1;
        bolt.blendMode = 'add';
        bolt.position.set(cx(p.pos), cy(p.pos));
        this.fx.container.addChild(bolt);
        const tx = cx(target), ty = cy(target);
        await anim.run(190, (t) => {
          const e = ease.inOutQuad(t);
          bolt.x = cx(p.pos) + (tx - cx(p.pos)) * e;
          bolt.y = cy(p.pos) + (ty - cy(p.pos)) * e - Math.sin(t * Math.PI) * 40;
          bolt.rotation += 0.5;
          this.fx.burst(bolt.x, bolt.y, { count: 1, tint: 0x5ef2d6, speed: [0, 30], scale: [0.08, 0.16], life: [0.2, 0.4] });
        });
        bolt.destroy();
        audio.play('wild', { rate: 1 + i * 0.08, volume: 0.8 });
        const tv = this.views[target];
        if (tv) {
          this.setSym(tv, WILD);
          tv.c.scale.set(1.45);
          void anim.to(tv.c.scale, { x: 1, y: 1 }, 340, ease.outBack);
        }
        this.sparkle(target, 10);
        this.ring(target, 0x5ef2d6);
      }));
      await anim.wait(180);
    }
  }

  // ---------- wins ----------

  /** Highlight the winning clusters, show what each pays and step the platforms up. */
  async win(step: Extract<Step, { t: 'win' }>, coinValue: number, cascadeIndex: number, celebrate: boolean): Promise<void> {
    const winning = new Set<number>();
    for (const cl of step.clusters) for (const p of cl.cells) winning.add(p);
    this.views.forEach((v, pos) => { if (v && !winning.has(pos)) void anim.to(v.c, { alpha: 0.32 }, 140); });

    const best = Math.max(...step.clusters.map((c) => c.sym));
    if (celebrate) audio.play('win', { rate: 1 + Math.min(cascadeIndex, 8) * 0.06 + (best >= PIGEON ? 0.12 : 0), volume: 0.9 });
    else audio.play('tick', { volume: 0.5 });

    const hi = new Graphics();
    hi.blendMode = 'add';
    for (const cl of step.clusters) {
      const col = cl.sym >= PIGEON ? 0xf0b45e : 0x5ef2d6;
      for (const p of cl.cells) hi.roundRect(colOf(p) * CELL + 5, rowOf(p) * CELL + 5, CELL - 10, CELL - 10, 14).fill({ color: col, alpha: 0.2 }).stroke({ color: col, width: 3, alpha: 0.85 });
    }
    hi.alpha = 0;
    this.hiLayer.addChild(hi);
    void anim.to(hi, { alpha: 1 }, 160);

    for (const p of winning) {
      const v = this.views[p];
      if (!v) continue;
      void anim.to(v.c.scale, { x: 1.14, y: 1.14 }, 200, ease.outBack).then(() => anim.to(v.c.scale, { x: 1, y: 1 }, 380, ease.inOutQuad));
    }

    const labels: Container[] = [];
    step.clusters.forEach((cl, i) => {
      const mx = cl.cells.reduce((a, p) => a + cx(p), 0) / cl.cells.length;
      const my = cl.cells.reduce((a, p) => a + cy(p), 0) / cl.cells.length;
      const label = new Container();
      const amount = new Text({ text: money(cl.coins * coinValue), style: displayFont(cl.mult > 1 ? 62 : 52, cl.sym >= PIGEON || cl.mult > 1 ? 0xffe9a8 : 0xf2fffb) });
      amount.anchor.set(0.5);
      label.addChild(amount);
      if (cl.mult > 1) {
        const tag = new Text({ text: `x${cl.mult}`, style: displayFont(44, 0x8dffb5) });
        tag.anchor.set(0.5);
        tag.y = -50;
        label.addChild(tag);
      }
      label.position.set(Math.max(90, Math.min(GRID_W - 90, mx)), Math.max(60, Math.min(GRID_H - 40, my)));
      label.scale.set(0.2);
      label.alpha = 0;
      this.labelLayer.addChild(label);
      labels.push(label);
      void anim.to(label, { alpha: 1 }, 120, ease.outQuad, { delay: i * 70 });
      void anim.to(label.scale, { x: 1, y: 1 }, 360, ease.outBack, { delay: i * 70 });
      void anim.to(label, { y: label.y - 26 }, 900, ease.outCubic, { delay: i * 70 });
    });

    await anim.wait(260);
    if (step.tiles.length) {
      audio.play('tile', { rate: 1.2 });
      for (const t of step.tiles) this.setTile(t.pos, t.mult, true);
    }
    await anim.wait(560 + Math.min(step.clusters.length - 1, 3) * 80);

    await Promise.all([
      anim.to(hi, { alpha: 0 }, 160),
      ...labels.map((l) => anim.to(l, { alpha: 0 }, 160)),
    ]);
    hi.destroy();
    labels.forEach((l) => l.destroy({ children: true }));
    this.views.forEach((v) => { if (v) void anim.to(v.c, { alpha: 1 }, 140); });
  }

  /** Winning symbols burst, the rest fall, new symbols drop in. */
  async cascade(step: Extract<Step, { t: 'cascade' }>): Promise<void> {
    audio.play('pop', { rate: 0.95 + Math.random() * 0.1 });
    const removed = new Set(step.removed);
    await Promise.all(step.removed.map((pos) => {
      const v = this.views[pos];
      if (!v) return Promise.resolve();
      this.fx.burst(cx(pos), cy(pos), { count: 9, tint: TINT[v.sym] ?? [0x5ef2d6], speed: [60, 300], scale: [0.1, 0.32], life: [0.3, 0.7] });
      this.views[pos] = null;
      return Promise.all([
        anim.to(v.c.scale, { x: 1.35, y: 1.35 }, 170, ease.outQuad),
        anim.to(v.c, { alpha: 0 }, 170, ease.inQuad),
      ]).then(() => v.c.destroy({ children: true }));
    }));

    const jobs: Promise<void>[] = [];
    const next: (SymbolView | null)[] = new Array(COLS * ROWS).fill(null);
    let moved = false;
    for (let c = 0; c < COLS; c++) {
      const survivors: SymbolView[] = [];
      for (let r = 0; r < ROWS; r++) {
        const pos = c * ROWS + r;
        if (!removed.has(pos) && this.views[pos]) survivors.push(this.views[pos]!);
      }
      const fresh = ROWS - survivors.length;
      survivors.forEach((v, i) => {
        const pos = c * ROWS + fresh + i;
        next[pos] = v;
        const target = cy(pos);
        if (Math.abs(v.c.y - target) > 1) {
          moved = true;
          jobs.push(anim.to(v.c, { y: target }, 150 + Math.abs(target - v.c.y) * 0.75, ease.drop, { delay: c * 22 }));
        }
      });
      for (let r = fresh - 1; r >= 0; r--) {
        const pos = c * ROWS + r;
        const v = this.make(step.grid[pos], pos);
        next[pos] = v;
        const target = v.c.y;
        v.c.y = target - fresh * CELL - CELL * 0.4;
        moved = true;
        jobs.push(anim.to(v.c, { y: target }, 300 + fresh * 34, ease.drop, { delay: c * 22 + (fresh - 1 - r) * 30 }));
      }
    }
    this.views = next;
    if (moved) void anim.wait(260).then(() => audio.play('land', { volume: 0.45, rate: 1.1 }));
    await Promise.all(jobs);
    // The record is authoritative. If the view ever disagrees, resynchronise to it.
    if (this.views.some((v, pos) => !v || (v.sym !== step.grid[pos]))) this.setGrid(step.grid);
  }

  /** Triggering Scatters pulse before the bonus starts. */
  async celebrateScatters(cells: number[]): Promise<void> {
    this.views.forEach((v, pos) => { if (v && !cells.includes(pos)) void anim.to(v.c, { alpha: 0.3 }, 200); });
    for (let k = 0; k < 2; k++) {
      await Promise.all(cells.map((pos, i) => {
        const v = this.views[pos];
        if (!v) return Promise.resolve();
        return anim.wait(i * 90).then(() => {
          this.ring(pos, 0x8dffb5);
          this.sparkle(pos, 8, [0x8dffb5, 0xc7fff1]);
          return anim.to(v.c.scale, { x: 1.3, y: 1.3 }, 180, ease.outQuad).then(() => anim.to(v.c.scale, { x: 1, y: 1 }, 300, ease.outBack));
        });
      }));
    }
    this.views.forEach((v) => { if (v) void anim.to(v.c, { alpha: 1 }, 200); });
  }

  /** A soft burst over the whole board, used by big wins. */
  flash(tints: number[]): void {
    for (let i = 0; i < 26; i++) {
      this.fx.burst(Math.random() * GRID_W, Math.random() * GRID_H, { texture: tex('fx/spark.png'), count: 1, tint: tints, speed: [20, 120], scale: [0.15, 0.5], life: [0.5, 1.1], spin: 3 });
    }
  }

  private clearLabels(): void {
    for (const l of this.labelLayer.removeChildren()) l.destroy({ children: true });
    for (const h of this.hiLayer.removeChildren()) h.destroy();
  }
}
