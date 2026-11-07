import { BlurFilter, Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import gsap from 'gsap';
import { GRID_COLS, GRID_ROWS } from '../config/gameConfig';
import { REGULAR_SYMBOLS, type SymbolId } from '../config/symbols';
import { colOf, idx, rowOf } from '../engine/Grid';
import type { Cluster, Grid } from '../engine/types';
import { CELL, SymbolView } from './SymbolRenderer';
import type { FxTextures } from './textures';
import type { Timing } from './Timing';

export const GRID_W = GRID_COLS * CELL;
export const GRID_H = GRID_ROWS * CELL;

/** Haunted-tile overlay: pulsing teal border, floor cracks, arcs and spectral motes. */
class HauntedTile extends Container {
  private border = new Graphics();
  private cracks = new Graphics();
  private glow: Sprite;
  private arcs = new Graphics();
  private motes: Sprite[] = [];
  private t = Math.random() * 10;
  active = false;

  constructor(fx: FxTextures) {
    super();
    this.glow = new Sprite(fx.softGlow);
    this.glow.anchor.set(0.5);
    this.glow.tint = 0x5ef2d6;
    this.glow.blendMode = 'add';
    this.glow.scale.set(0.75);
    const h = CELL / 2 - 6;
    this.cracks.moveTo(-h + 10, h - 20).lineTo(-10, 6).lineTo(-24, -18).moveTo(-10, 6).lineTo(18, 14).lineTo(h - 12, -10).moveTo(18, 14).lineTo(10, h - 10).stroke({ width: 3, color: 0x8dffb5, alpha: 0.85 });
    this.border.roundRect(-h, -h, h * 2, h * 2, 16).stroke({ width: 5, color: 0x5ef2d6 });
    this.border.roundRect(-h + 7, -h + 7, h * 2 - 14, h * 2 - 14, 12).stroke({ width: 2, color: 0xc7fff1, alpha: 0.6 });
    for (let i = 0; i < 4; i++) {
      const m = new Sprite(fx.ember);
      m.anchor.set(0.5);
      m.tint = i % 2 ? 0x8dffb5 : 0xc7fff1;
      m.blendMode = 'add';
      this.motes.push(m);
    }
    this.addChild(this.glow, this.cracks, ...this.motes, this.arcs, this.border);
    this.visible = false;
    this.alpha = 0;
  }

  show(animated: boolean, d: number): gsap.core.Timeline {
    this.active = true;
    this.visible = true;
    const tl = gsap.timeline();
    if (!animated) {
      this.alpha = 1;
      this.scale.set(1);
      return tl;
    }
    this.alpha = 0;
    this.scale.set(0.3);
    tl.to(this, { alpha: 1, duration: d * 0.3 });
    tl.to(this.scale, { x: 1, y: 1, duration: d * 0.6, ease: 'elastic.out(1, 0.5)' }, 0);
    return tl;
  }

  hide(d: number): void {
    this.active = false;
    gsap.to(this, { alpha: 0, duration: d, onComplete: () => void (this.visible = !this.active ? false : true) });
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.t += dt;
    const pulse = 0.65 + Math.sin(this.t * 3.2) * 0.35;
    this.border.alpha = pulse;
    this.glow.alpha = 0.25 + pulse * 0.25;
    this.cracks.alpha = 0.4 + Math.sin(this.t * 5.1) * 0.25;
    this.motes.forEach((m, i) => {
      const a = this.t * (0.8 + i * 0.3) + i * 1.7;
      m.position.set(Math.cos(a) * 46, Math.sin(a * 1.3) * 46);
      m.alpha = 0.5 + 0.5 * Math.sin(a * 2);
      m.scale.set(0.5 + 0.3 * Math.sin(a * 3));
    });
    // little electric arcs every so often
    this.arcs.clear();
    if (Math.sin(this.t * 7.3) > 0.82) {
      let x = -CELL / 2 + 10;
      let y = (Math.random() - 0.5) * CELL * 0.6;
      this.arcs.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += CELL / 7;
        y += (Math.random() - 0.5) * 24;
        this.arcs.lineTo(x, y);
      }
      this.arcs.stroke({ width: 2, color: 0xc7fff1, alpha: 0.9 });
    }
  }
}

export class ReelRenderer {
  readonly view = new Container();
  readonly fxLayer = new Container();
  private frame = new Graphics();
  private backs = new Graphics();
  private hauntLayer = new Container();
  private symbolLayer = new Container();
  private mask = new Graphics();
  private tiles: HauntedTile[] = [];
  private views = new Map<number, SymbolView>();
  private frameGlow: Sprite;
  private dimmer = new Graphics();
  private t = 0;

  constructor(
    private textures: Record<SymbolId, Texture>,
    private fx: FxTextures,
    private timing: Timing,
  ) {
    this.frameGlow = new Sprite(fx.softGlow);
    this.frameGlow.anchor.set(0.5);
    this.frameGlow.width = GRID_W * 1.7;
    this.frameGlow.height = GRID_H * 1.7;
    this.frameGlow.tint = 0x5ef2d6;
    this.frameGlow.alpha = 0.22;
    this.frameGlow.blendMode = 'add';
    this.drawFrame();
    this.mask.rect(-GRID_W / 2, -GRID_H / 2, GRID_W, GRID_H).fill(0xffffff);
    this.symbolLayer.mask = this.mask;
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const tile = new HauntedTile(fx);
      const p = this.cellPos(i);
      tile.position.set(p.x, p.y);
      this.tiles.push(tile);
      this.hauntLayer.addChild(tile);
    }
    this.dimmer.rect(-GRID_W / 2, -GRID_H / 2, GRID_W, GRID_H).fill(0x000000);
    this.dimmer.alpha = 0;
    this.view.addChild(this.frameGlow, this.frame, this.backs, this.hauntLayer, this.symbolLayer, this.mask, this.dimmer, this.fxLayer);
  }

  private drawFrame(): void {
    const f = this.frame;
    const pad = 26;
    const w = GRID_W + pad * 2;
    const h = GRID_H + pad * 2;
    const x = -w / 2;
    const y = -h / 2;
    // outer shadow
    f.roundRect(x - 10, y - 4, w + 20, h + 24, 34).fill({ color: 0x000000, alpha: 0.55 });
    // brass body
    f.roundRect(x, y, w, h, 30).fill(0x6b4a1c);
    f.roundRect(x + 4, y + 4, w - 8, h - 8, 27).fill(0xb78b3e);
    f.roundRect(x + 8, y + 8, w - 16, h - 16, 24).fill(0x8a6428);
    // highlight stripe
    f.roundRect(x + 6, y + 6, w - 12, 10, 6).fill({ color: 0xffe9ae, alpha: 0.45 });
    // inner panel
    f.roundRect(-GRID_W / 2 - 10, -GRID_H / 2 - 10, GRID_W + 20, GRID_H + 20, 16).fill(0x0b0f16);
    f.roundRect(-GRID_W / 2 - 10, -GRID_H / 2 - 10, GRID_W + 20, GRID_H + 20, 16).stroke({ width: 3, color: 0x5ef2d6, alpha: 0.7 });
    // rivets
    for (let i = 0; i <= 12; i++) {
      const rx = x + 30 + ((w - 60) * i) / 12;
      f.circle(rx, y + pad / 2 + 2, 4).fill(0xffe9ae).stroke({ width: 1, color: 0x3d2a0e });
      f.circle(rx, y + h - pad / 2 - 2, 4).fill(0xffe9ae).stroke({ width: 1, color: 0x3d2a0e });
    }
    for (let i = 1; i < 10; i++) {
      const ry = y + 20 + ((h - 40) * i) / 10;
      f.circle(x + pad / 2 + 2, ry, 4).fill(0xffe9ae).stroke({ width: 1, color: 0x3d2a0e });
      f.circle(x + w - pad / 2 - 2, ry, 4).fill(0xffe9ae).stroke({ width: 1, color: 0x3d2a0e });
    }
    // corner ornaments
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]] as [number, number][]) {
      f.circle(cx, cy, 22).fill(0xb78b3e).stroke({ width: 3, color: 0x3d2a0e });
      f.circle(cx, cy, 12).fill(0x0e1117).stroke({ width: 2, color: 0x5ef2d6 });
      f.circle(cx, cy, 5).fill(0x5ef2d6);
    }
    // cell backplates
    const b = this.backs;
    for (let i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      const p = this.cellPos(i);
      const odd = (colOf(i) + rowOf(i)) % 2;
      b.roundRect(p.x - CELL / 2 + 4, p.y - CELL / 2 + 4, CELL - 8, CELL - 8, 14).fill(odd ? 0x151c2b : 0x111723);
      b.roundRect(p.x - CELL / 2 + 4, p.y - CELL / 2 + 4, CELL - 8, CELL - 8, 14).stroke({ width: 1.5, color: 0x5ef2d6, alpha: 0.12 });
    }
  }

  cellPos(i: number): { x: number; y: number } {
    return { x: (colOf(i) + 0.5) * CELL - GRID_W / 2, y: (rowOf(i) + 0.5) * CELL - GRID_H / 2 };
  }

  /** Global position (for particles living in other layers). */
  cellGlobal(i: number) {
    const p = this.cellPos(i);
    return this.view.toGlobal(p);
  }

  viewAt(i: number): SymbolView | undefined {
    for (const v of this.views.values()) if (v.parent === this.symbolLayer && this.posOf(v) === i) return v;
    return undefined;
  }

  private posOf(v: SymbolView): number {
    const c = Math.round((v.x + GRID_W / 2) / CELL - 0.5);
    const r = Math.round((v.y + GRID_H / 2) / CELL - 0.5);
    return idx(c, r);
  }

  private makeView(sym: SymbolId, id: number): SymbolView {
    const v = new SymbolView(this.textures, this.fx, sym, id);
    this.views.set(id, v);
    return v;
  }

  private destroyView(v: SymbolView): void {
    this.views.delete(v.cellId);
    gsap.killTweensOf(v);
    gsap.killTweensOf(v.scale);
    gsap.killTweensOf(v.art.scale);
    v.destroy({ children: true });
  }

  /** Instantly show a grid. */
  setGrid(grid: Grid): void {
    for (const v of [...this.views.values()]) this.destroyView(v);
    grid.forEach((cell, i) => {
      const v = this.makeView(cell.sym, cell.id);
      const p = this.cellPos(i);
      v.position.set(p.x, p.y);
      this.symbolLayer.addChild(v);
    });
  }

  /**
   * Full spin: every column scrolls a motion-blurred strip and stops in turn
   * with a bounce, revealing `grid`.
   */
  async spinTo(grid: Grid, onColumnStop: (col: number) => void, anticipationCols: number[] = []): Promise<void> {
    const old = [...this.views.values()];
    const promises: Promise<void>[] = [];
    const turbo = this.timing.speed > 1.5;
    const blurOn = !this.timing.reducedMotion;
    for (let c = 0; c < GRID_COLS; c++) {
      const strip = new Container();
      strip.x = (c + 0.5) * CELL - GRID_W / 2;
      this.symbolLayer.addChild(strip);
      const extra = anticipationCols.includes(c) ? 8 : 0;
      const K = (turbo ? 3 : 5) + c * (turbo ? 1 : 2) + extra;
      // finals
      const finals: SymbolView[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        const cell = grid[idx(c, r)];
        const v = this.makeView(cell.sym, cell.id);
        v.position.set(0, (r + 0.5) * CELL - GRID_H / 2);
        strip.addChild(v);
        finals.push(v);
      }
      // fillers
      for (let k = 0; k < K; k++) {
        const s = new Sprite(this.textures[REGULAR_SYMBOLS[Math.floor(Math.random() * REGULAR_SYMBOLS.length)]]);
        s.anchor.set(0.5);
        const sc = (CELL * 0.86) / Math.max(s.texture.width, s.texture.height);
        s.scale.set(sc);
        s.alpha = 0.85;
        s.position.set(0, (GRID_ROWS + k + 0.5) * CELL - GRID_H / 2);
        strip.addChild(s);
      }
      // the old symbols of this column ride along at the bottom
      for (const v of old) {
        const p = this.posOf(v);
        if (colOf(p) !== c) continue;
        strip.addChild(v);
        v.x = 0;
        v.y = (GRID_ROWS + K + rowOf(p) + 0.5) * CELL - GRID_H / 2;
      }
      const startY = -(GRID_ROWS + K) * CELL;
      strip.y = startY;
      const blur = new BlurFilter({ strengthX: 0, strengthY: 0, quality: 2 });
      if (blurOn) strip.filters = [blur];
      const speed = (turbo ? 9000 : 5200) * (this.timing.skipping ? 30 : 1);
      const travel = Math.abs(startY) - CELL * 0.35;
      const tl = gsap.timeline({ delay: this.timing.d(c * 0.04) });
      tl.to(strip, { y: startY - 22, duration: this.timing.d(0.12), ease: 'power2.out' });
      tl.to(blur, { strengthY: 14, duration: this.timing.d(0.12) }, '<0.08');
      tl.to(strip, { y: -CELL * 0.35, duration: travel / speed + (extra ? this.timing.d(0.6) : 0), ease: extra ? 'sine.inOut' : 'none' });
      tl.to(blur, { strengthY: 0, duration: this.timing.d(0.12) }, '>-0.1');
      tl.to(strip, { y: 0, duration: this.timing.d(0.28), ease: 'back.out(2.2)' });
      tl.add(() => {
        onColumnStop(c);
        // hand finals over to the symbol layer
        for (const v of finals) {
          this.symbolLayer.addChild(v);
          v.x = strip.x;
          this.timing.track(v.land(this.timing.d(0.3)));
        }
        for (const child of [...strip.children]) {
          if (child instanceof SymbolView) this.destroyView(child);
        }
        gsap.killTweensOf(strip);
        strip.destroy({ children: true });
      });
      promises.push(this.timing.play(tl));
    }
    await Promise.all(promises);
  }

  async highlightClusters(clusters: Cluster[], d: number): Promise<void> {
    const anims: Promise<void>[] = [];
    const seen = new Set<number>();
    for (const c of clusters)
      for (const p of c.positions) {
        if (seen.has(p)) continue;
        seen.add(p);
        const v = this.viewAt(p);
        if (v) anims.push(this.timing.play(v.winPulse(d)));
      }
    // dim non-winning symbols slightly
    for (const v of this.views.values()) if (!seen.has(this.posOf(v))) gsap.to(v, { alpha: 0.45, duration: d * 0.3 });
    await Promise.all(anims);
  }

  restoreAlpha(d: number): void {
    for (const v of this.views.values()) gsap.to(v, { alpha: 1, duration: d });
  }

  /** Dissolve winning symbols. */
  async removeCells(positions: number[], d: number, onEach?: (pos: number) => void): Promise<void> {
    const anims: Promise<void>[] = [];
    for (const p of positions) {
      const v = this.viewAt(p);
      if (!v) continue;
      onEach?.(p);
      v.clearGlow();
      const tl = gsap.timeline();
      tl.to(v.scale, { x: 1.25, y: 1.25, duration: d * 0.3, ease: 'power2.out' });
      tl.to(v.scale, { x: 0, y: 0, duration: d * 0.7, ease: 'back.in(2)' });
      tl.to(v, { alpha: 0, duration: d * 0.7 }, '<');
      tl.add(() => this.destroyView(v));
      anims.push(this.timing.play(tl));
    }
    await Promise.all(anims);
  }

  /** Gravity: existing symbols slide to their new rows, new ones fall in from above. */
  async applyCascade(grid: Grid, d: number, onLand: () => void): Promise<void> {
    const anims: Promise<void>[] = [];
    // count new symbols per column to stack them above the grid
    const spawnCount = new Array(GRID_COLS).fill(0);
    for (let i = 0; i < grid.length; i++) if (!this.views.has(grid[i].id)) spawnCount[colOf(i)]++;
    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];
      const target = this.cellPos(i);
      let v = this.views.get(cell.id);
      let delay = colOf(i) * 0.03;
      if (!v) {
        v = this.makeView(cell.sym, cell.id);
        v.position.set(target.x, target.y - spawnCount[colOf(i)] * CELL - CELL * 0.5);
        this.symbolLayer.addChild(v);
        delay += 0.08;
      } else if (v.sym !== cell.sym) {
        v.setSymbol(cell.sym);
      }
      if (Math.abs(v.y - target.y) < 1) continue;
      const view = v;
      const dist = (target.y - v.y) / CELL;
      const tl = gsap.timeline({ delay: this.timing.d(delay) });
      tl.to(view, { y: target.y, duration: d * (0.55 + dist * 0.05), ease: 'bounce.out' });
      tl.add(() => {
        onLand();
        this.timing.track(view.land(d * 0.5));
      }, '-=' + d * 0.35);
      anims.push(this.timing.play(tl));
    }
    await Promise.all(anims);
  }

  morph(pos: number, to: SymbolId, d: number): Promise<void> {
    const v = this.viewAt(pos);
    if (!v) return Promise.resolve();
    return this.timing.play(v.morph(to, d));
  }

  shakeCell(pos: number, d: number): Promise<void> {
    const v = this.viewAt(pos);
    if (!v) return Promise.resolve();
    const x0 = v.x;
    const tl = gsap.timeline();
    tl.to(v, { x: x0 + 6, duration: d / 10, repeat: 7, yoyo: true, ease: 'sine.inOut' });
    tl.to(v, { x: x0, duration: d / 10 });
    tl.to(v.scale, { x: 1.15, y: 1.15, duration: d * 0.3, yoyo: true, repeat: 1 }, 0);
    return this.timing.play(tl);
  }

  /** Set haunted tiles. `animate` lists positions that light up with the full effect. */
  setHaunted(positions: number[], animate: number[] = [], d = 0.6): Promise<void> {
    const set = new Set(positions);
    const anims: Promise<void>[] = [];
    this.tiles.forEach((tile, i) => {
      if (set.has(i)) {
        if (!tile.active) anims.push(this.timing.play(tile.show(animate.includes(i), d)));
      } else if (tile.active) tile.hide(0.4);
    });
    return Promise.all(anims).then(() => undefined);
  }

  pulseTile(pos: number, d: number): Promise<void> {
    const tile = this.tiles[pos];
    return this.timing.play(gsap.timeline().to(tile.scale, { x: 1.15, y: 1.15, duration: d / 2, yoyo: true, repeat: 1, ease: 'sine.inOut' }));
  }

  hauntedPositions(): number[] {
    const out: number[] = [];
    this.tiles.forEach((tile, i) => tile.active && out.push(i));
    return out;
  }

  get hauntedCount(): number {
    return this.tiles.filter((t) => t.active).length;
  }

  dim(amount: number, d: number): void {
    gsap.to(this.dimmer, { alpha: amount, duration: d });
  }

  setFrameGlow(color: number, alpha: number, d: number): void {
    this.frameGlow.tint = color;
    gsap.to(this.frameGlow, { alpha, duration: d });
  }

  /** Floating credit label above a cluster. */
  showAmount(text: string, pos: { x: number; y: number }, d: number): void {
    const t = new Text({
      text,
      style: { fontFamily: 'Bebas Neue', fontSize: 54, fill: 0xffe9ae, stroke: { color: 0x3d2a0e, width: 6 }, dropShadow: { color: 0xf0b45e, blur: 12, distance: 0, alpha: 0.9 }, letterSpacing: 2 },
    });
    t.anchor.set(0.5);
    t.position.set(pos.x, pos.y);
    t.scale.set(0.4);
    this.fxLayer.addChild(t);
    const tl = gsap.timeline({ onComplete: () => t.destroy() });
    tl.to(t.scale, { x: 1, y: 1, duration: d * 0.3, ease: 'back.out(3)' });
    tl.to(t, { y: pos.y - 50, duration: d, ease: 'power1.out' }, 0);
    tl.to(t, { alpha: 0, duration: d * 0.3 }, d * 0.75);
    this.timing.track(tl);
  }

  update(dt: number): void {
    this.t += dt;
    for (const v of this.views.values()) v.update(this.t);
    for (const tile of this.tiles) tile.update(dt);
    this.frameGlow.alpha += ((0.18 + Math.sin(this.t * 1.5) * 0.04) - this.frameGlow.alpha) * 0.02;
  }

  centroid(positions: number[]): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const p of positions) {
      const c = this.cellPos(p);
      x += c.x;
      y += c.y;
    }
    return { x: x / positions.length, y: y / positions.length };
  }
}
