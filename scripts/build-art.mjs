// Renders the vector art in art/*.mjs to raster files in public/assets with headless Chromium.
//   npm run art              # everything
//   npm run art -- symbols   # only assets whose name contains "symbols"
//   npm run art -- --sheet   # also write a contact sheet to sim-out/sheet.png
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'public/assets');
const filters = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const fontUrl = 'data:font/woff2;base64,' + readFileSync(resolve(root, 'node_modules/@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff2')).toString('base64');

const modules = ['symbols', 'graves', 'scene', 'ui'];
const assets = [];
for (const m of modules) {
  try {
    const mod = await import(pathToFileURL(resolve(root, `art/${m}.mjs`)).href + `?t=${Date.now()}`);
    assets.push(...mod.default);
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  }
}

const browser = await chromium.launch();
const manifest = {};
for (const a of assets) {
  if (filters.length && !filters.some((x) => a.name.includes(x))) continue;
  const scale = a.scale ?? 1;
  const page = await browser.newPage({ viewport: { width: Math.ceil(a.w), height: Math.ceil(a.h) }, deviceScaleFactor: scale });
  await page.setContent(`<!doctype html><style>@font-face{font-family:"Bebas Neue";src:url("${fontUrl}") format("woff2")}
    html,body{margin:0;background:transparent}svg{display:block}text{font-family:"Bebas Neue"}</style>${a.svg}`);
  await page.evaluate(() => document.fonts.load('40px "Bebas Neue"'));
  await page.evaluate(() => document.fonts.ready);
  const file = resolve(out, a.name);
  mkdirSync(dirname(file), { recursive: true });
  const jpeg = a.name.endsWith('.jpg');
  for (let attempt = 0; ; attempt++) {
    try {
      await page.screenshot({ path: file, omitBackground: !jpeg, type: jpeg ? 'jpeg' : 'png', ...(jpeg ? { quality: a.quality ?? 86 } : {}) });
      break;
    } catch (e) {
      if (attempt >= 3) throw e;
    }
  }
  await page.close();
  manifest[a.name] = { w: a.w * scale, h: a.h * scale, ...(a.meta ?? {}) };
  console.log('wrote', a.name);
}

if (process.argv.includes('--sheet')) {
  const picks = assets.filter((a) => (!filters.length || filters.some((x) => a.name.includes(x))) && a.w <= 1000);
  const page = await browser.newPage({ viewport: { width: 1560, height: 100 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><body style="margin:0;background:#141B2D;display:flex;flex-wrap:wrap;gap:4px;padding:4px">${picks
    .map((a) => `<div style="background:#0f1524;outline:1px solid #26304a"><img src="data:image/${a.name.endsWith('.jpg') ? 'jpeg' : 'png'};base64,${readFileSync(resolve(out, a.name)).toString('base64')}" style="display:block;height:${a.sheetH ?? 252}px"></div>`).join('')}</body>`);
  await page.waitForLoadState('networkidle');
  mkdirSync(resolve(root, 'sim-out'), { recursive: true });
  await page.screenshot({ path: resolve(root, 'sim-out/sheet.png'), fullPage: true });
}
await browser.close();
if (!filters.length) writeFileSync(resolve(root, 'art/manifest.json'), JSON.stringify(manifest, null, 1));
