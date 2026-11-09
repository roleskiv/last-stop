import { CanvasSource, Texture } from 'pixi.js';
import { characterAssets, symbolAssets } from '../assets/assetManifest';
import { ALL_SYMBOLS, type SymbolId } from '../config/symbols';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function radial(size: number, stops: [number, string][]): Texture {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(c);
}

/** Procedural textures shared by every renderer (created once, reused). */
export interface FxTextures {
  glow: Texture;
  softGlow: Texture;
  spark: Texture;
  ember: Texture;
  ring: Texture;
  fog: Texture;
  beam: Texture;
  hole: Texture;
  vignette: Texture;
}

export interface GameTextures {
  symbols: Record<SymbolId, Texture>;
  character: Record<keyof typeof characterAssets, Texture>;
  fx: FxTextures;
}

function makeFx(): FxTextures {
  const glow = radial(128, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]);
  const softGlow = radial(256, [[0, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]);
  const spark = radial(32, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]);
  const ember = radial(24, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);

  const [rc, rctx] = canvas(128, 128);
  rctx.strokeStyle = 'white';
  rctx.lineWidth = 6;
  rctx.shadowColor = 'white';
  rctx.shadowBlur = 12;
  rctx.beginPath();
  rctx.arc(64, 64, 48, 0, Math.PI * 2);
  rctx.stroke();
  const ring = Texture.from(rc);

  const [fc, fctx] = canvas(512, 256);
  for (let i = 0; i < 14; i++) {
    const x = 80 + Math.random() * 352;
    const y = 80 + Math.random() * 96;
    const r = 50 + Math.random() * 70;
    const g = fctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    fctx.fillStyle = g;
    fctx.fillRect(0, 0, 512, 256);
  }
  const fog = Texture.from(fc);

  const [bc, bctx] = canvas(64, 512);
  const bg = bctx.createLinearGradient(0, 0, 64, 0);
  bg.addColorStop(0, 'rgba(255,255,255,0)');
  bg.addColorStop(0.5, 'rgba(255,255,255,1)');
  bg.addColorStop(1, 'rgba(255,255,255,0)');
  bctx.fillStyle = bg;
  bctx.fillRect(0, 0, 64, 512);
  const fade = bctx.createLinearGradient(0, 0, 0, 512);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  bctx.globalCompositeOperation = 'destination-out';
  bctx.fillStyle = fade;
  bctx.fillRect(0, 0, 64, 512);
  const beam = Texture.from(bc);

  const [hc, hctx] = canvas(128, 128);
  const hg = hctx.createRadialGradient(64, 64, 20, 64, 64, 60);
  hg.addColorStop(0, 'rgba(14,17,23,1)');
  hg.addColorStop(0.55, 'rgba(14,17,23,1)');
  hg.addColorStop(0.62, 'rgba(94,242,214,1)');
  hg.addColorStop(1, 'rgba(94,242,214,0)');
  hctx.fillStyle = hg;
  hctx.fillRect(0, 0, 128, 128);
  const hole = Texture.from(hc);

  const [vc, vctx] = canvas(512, 512);
  const vg = vctx.createRadialGradient(256, 256, 120, 256, 256, 360);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,1)');
  vctx.fillStyle = vg;
  vctx.fillRect(0, 0, 512, 512);
  const vignette = Texture.from(vc);

  return { glow, softGlow, spark, ember, ring, fog, beam, hole, vignette };
}

/**
 * Rasterise an SVG (URL or data: URI) through an <img> element instead of Pixi's fetch-based loader.
 * Strict hosts (such as sandboxed previews) often block fetch() of data: URIs but still allow images.
 */
function loadSvgTexture(src: string, resolution: number): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || 256;
      const h = img.naturalHeight || 256;
      const [c, ctx] = canvas(Math.round(w * resolution), Math.round(h * resolution));
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(new Texture({ source: new CanvasSource({ resource: c, resolution }) }));
    };
    img.onerror = () => reject(new Error(`Failed to load image ${src.slice(0, 64)}`));
    img.src = src;
  });
}

export async function loadGameTextures(onProgress?: (p: number) => void): Promise<GameTextures> {
  const symbolUrls = ALL_SYMBOLS.map((s) => symbolAssets[s]);
  const charKeys = Object.keys(characterAssets) as (keyof typeof characterAssets)[];
  const charUrls = charKeys.map((k) => characterAssets[k]);
  const all = [...symbolUrls, ...charUrls];
  let done = 0;
  const loaded = await Promise.all(
    all.map(async (src) => {
      const t = await loadSvgTexture(src, 2);
      done++;
      onProgress?.(done / all.length);
      return t;
    }),
  );
  const symbols = {} as Record<SymbolId, Texture>;
  ALL_SYMBOLS.forEach((s, i) => (symbols[s] = loaded[i]));
  const character = {} as Record<keyof typeof characterAssets, Texture>;
  charKeys.forEach((k, i) => (character[k] = loaded[symbolUrls.length + i]));
  return { symbols, character, fx: makeFx() };
}
