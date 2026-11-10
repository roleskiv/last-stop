import { Texture } from 'pixi.js';
import manifest from '../../../art/manifest.json';
import { SYMBOL_KEYS } from '../../math/symbols.ts';

export const BASE = import.meta.env.BASE_URL;
export const ART = manifest as Record<string, { w: number; h: number; x?: number; y?: number }>;

const textures = new Map<string, Texture>();

/** Texture by art path, for example tex('symbols/wild.png'). */
export function tex(name: string): Texture {
  const t = textures.get(name);
  if (!t) throw new Error(`Texture not loaded: ${name}`);
  return t;
}

export const symbolTex = (sym: number): Texture => tex(`symbols/${SYMBOL_KEYS[sym]}.png`);

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

/**
 * Loads every texture through plain <img> elements. This avoids workers, blobs and fetch,
 * so the game also loads inside strictly sandboxed operator frames.
 */
export async function loadTextures(onProgress: (done: number, total: number) => void): Promise<void> {
  const names = Object.keys(ART).filter((n) => n !== 'graves/preview.png');
  let done = 0;
  await Promise.all(names.map(async (name) => {
    let img: HTMLImageElement;
    try {
      img = await loadImage(`${BASE}assets/${name}`);
    } catch {
      img = await loadImage(`${BASE}assets/${name}`); // one retry
    }
    textures.set(name, Texture.from(img));
    onProgress(++done, names.length);
  }));
}
