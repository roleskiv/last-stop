import { Container, Graphics, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import type { FxTextures } from './textures';

/**
 * Right-hand station panel: Phantom Platforms gauge (haunted tiles vs cap),
 * Station arrival indicator (scatters landed / free spins) and a context line.
 * Lays out vertically (landscape) or horizontally (portrait).
 */
export class InfoPanelRenderer {
  readonly view = new Container();
  private lamps: { g: Graphics; glow: Sprite }[] = [];
  private stations: { g: Graphics; glow: Sprite }[] = [];
  private hauntedText: Text;
  private stationTitle: Text;
  private stationText: Text;
  private infoText: Text;
  private plate = new Graphics();
  private cap = 6;
  private haunted = 0;
  private t = 0;

  constructor(private fx: FxTextures) {
    const titleStyle = { fontFamily: 'Bebas Neue', fontSize: 30, fill: 0xd7b15a, letterSpacing: 4 } as const;
    this.hauntedText = new Text({ text: 'PHANTOM PLATFORMS', style: titleStyle });
    this.stationTitle = new Text({ text: 'STATION ARRIVAL', style: titleStyle });
    this.stationText = new Text({ text: 'Land 3 trains', style: { fontFamily: 'Inter', fontSize: 18, fill: 0xc7fff1 } });
    this.infoText = new Text({ text: '', style: { fontFamily: 'Inter', fontSize: 18, fill: 0xc7fff1, wordWrap: true, wordWrapWidth: 250, align: 'center', lineHeight: 24 } });
    this.view.addChild(this.plate, this.hauntedText, this.stationTitle, this.stationText, this.infoText);
    this.setCap(6);
    this.layout('landscape');
  }

  setCap(cap: number): void {
    this.cap = cap;
    for (const l of this.lamps) l.g.destroy(), l.glow.destroy();
    this.lamps = [];
    for (let i = 0; i < 15; i++) {
      const g = new Graphics();
      const glow = new Sprite(this.fx.glow);
      glow.anchor.set(0.5);
      glow.tint = 0x5ef2d6;
      glow.blendMode = 'add';
      glow.scale.set(0.45);
      glow.alpha = 0;
      this.view.addChild(glow, g);
      this.lamps.push({ g, glow });
    }
    if (this.stations.length === 0) {
      for (let i = 0; i < 3; i++) {
        const g = new Graphics();
        const glow = new Sprite(this.fx.glow);
        glow.anchor.set(0.5);
        glow.tint = 0x8dffb5;
        glow.blendMode = 'add';
        glow.scale.set(0.6);
        glow.alpha = 0;
        this.view.addChild(glow, g);
        this.stations.push({ g, glow });
      }
    }
    this.redraw();
  }

  private orientation: 'landscape' | 'portrait' = 'landscape';

  layout(o: 'landscape' | 'portrait'): void {
    this.orientation = o;
    const p = this.plate;
    p.clear();
    if (o === 'landscape') {
      const w = 300;
      const h = 600;
      p.roundRect(-w / 2, -h / 2, w, h, 22).fill({ color: 0x0b0f16, alpha: 0.88 }).stroke({ width: 4, color: 0xb78b3e });
      p.roundRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 16).stroke({ width: 1.5, color: 0x5ef2d6, alpha: 0.4 });
      p.moveTo(-w / 2 + 24, -10).lineTo(w / 2 - 24, -10).stroke({ width: 2, color: 0xb78b3e, alpha: 0.6 });
      p.moveTo(-w / 2 + 24, 170).lineTo(w / 2 - 24, 170).stroke({ width: 2, color: 0xb78b3e, alpha: 0.6 });
      this.hauntedText.anchor.set(0.5);
      this.hauntedText.position.set(0, -262);
      this.stationTitle.anchor.set(0.5);
      this.stationTitle.position.set(0, 18);
      this.stationText.anchor.set(0.5);
      this.stationText.position.set(0, 135);
      this.infoText.anchor.set(0.5);
      this.infoText.style.wordWrapWidth = 250;
      this.infoText.position.set(0, 232);
    } else {
      const w = 640;
      const h = 230;
      p.roundRect(-w / 2, -h / 2, w, h, 22).fill({ color: 0x0b0f16, alpha: 0.88 }).stroke({ width: 4, color: 0xb78b3e });
      p.moveTo(10, -h / 2 + 20).lineTo(10, h / 2 - 20).stroke({ width: 2, color: 0xb78b3e, alpha: 0.6 });
      this.hauntedText.anchor.set(0.5);
      this.hauntedText.position.set(-155, -84);
      this.stationTitle.anchor.set(0.5);
      this.stationTitle.position.set(165, -84);
      this.stationText.anchor.set(0.5);
      this.stationText.position.set(165, 26);
      this.infoText.anchor.set(0.5);
      this.infoText.style.wordWrapWidth = 280;
      this.infoText.position.set(165, 74);
    }
    this.redraw();
  }

  private redraw(): void {
    const landscape = this.orientation === 'landscape';
    this.lamps.forEach((l, i) => {
      const visible = i < this.cap;
      l.g.visible = l.glow.visible = visible;
      if (!visible) return;
      const cols = landscape ? 3 : 5;
      const x = landscape ? -70 + (i % cols) * 70 : -255 + (i % cols) * 50;
      const y = landscape ? -200 + Math.floor(i / cols) * 62 : -36 + Math.floor(i / cols) * 52;
      const on = i < this.haunted;
      l.g.clear();
      l.g.roundRect(-22, -22, 44, 44, 9).fill(on ? 0x103a36 : 0x121722).stroke({ width: 3, color: on ? 0x5ef2d6 : 0x3a4258 });
      if (on) l.g.roundRect(-12, -12, 24, 24, 5).fill(0x5ef2d6);
      l.g.position.set(x, y);
      l.glow.position.set(x, y);
      l.glow.alpha = on ? 0.7 : 0;
    });
    this.stations.forEach((s, i) => {
      const x = landscape ? -80 + i * 80 : 85 + i * 80;
      const y = landscape ? 80 : -26;
      s.g.position.set(x, y);
      s.glow.position.set(x, y);
    });
  }

  setHaunted(n: number): void {
    if (n === this.haunted) return;
    const prev = this.haunted;
    this.haunted = n;
    this.redraw();
    if (n > prev) {
      for (let i = prev; i < n && i < this.lamps.length; i++) {
        const l = this.lamps[i];
        l.g.scale.set(1.6);
        gsap.to(l.g.scale, { x: 1, y: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
      }
    }
  }

  setStations(lit: number, label: string): void {
    this.stationText.text = label;
    this.stations.forEach((s, i) => {
      const on = i < lit;
      s.g.clear();
      s.g.circle(0, 0, 24).fill(on ? 0x1f5a4a : 0x121722).stroke({ width: 4, color: on ? 0x8dffb5 : 0x3a4258 });
      s.g.rect(-10, -8, 20, 14).fill(on ? 0xc7fff1 : 0x3a4258);
      s.g.circle(-6, 10, 3).fill(on ? 0xffffff : 0x3a4258);
      s.g.circle(6, 10, 3).fill(on ? 0xffffff : 0x3a4258);
      s.glow.alpha = on ? 0.8 : 0;
    });
  }

  setInfo(text: string): void {
    this.infoText.text = text;
  }

  update(dt: number): void {
    this.t += dt;
    this.lamps.forEach((l, i) => {
      if (i < this.haunted) l.glow.alpha = 0.55 + Math.sin(this.t * 3 + i) * 0.2;
    });
  }
}
