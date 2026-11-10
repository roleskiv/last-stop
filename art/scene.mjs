// Station backgrounds (landscape and portrait), the reel frame, the logo and the train.
import { K, arc, f, prng, pt, ring, sparkle, svg } from './lib.mjs';

/**
 * The haunted platform. (cx, cy) is the centre of the reel frame; the arch is built
 * around it so the frame sits in the tunnel mouth.
 */
function station({ W, H, cx, cy, archW, archTop, floorY, lamps, clock }) {
  const rnd = prng(W * 7 + H);
  const half = archW / 2;
  const springY = archTop + half; // where the arch curve meets the straight sides
  const archPath = (grow = 0) =>
    `M${cx - half - grow} ${floorY}V${springY}A${half + grow} ${half + grow} 0 0 1 ${cx + half + grow} ${springY}V${floorY}Z`;

  // Voussoir bricks around the arch.
  let bricks = '';
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const a = 180 + (180 / n) * i;
    const [x, y] = pt(cx, springY, half + 34, a);
    const shade = 0.55 + rnd() * 0.45;
    bricks += `<rect x="${f(x - 30)}" y="${f(y - 26)}" width="60" height="52" rx="5" transform="rotate(${f(a + 90)} ${f(x)} ${f(y)})" fill="rgb(${Math.round(64 * shade)},${Math.round(72 * shade)},${Math.round(92 * shade)})" stroke="#0B0F1A" stroke-width="4"/>`;
  }
  for (let y = springY + 30; y < floorY; y += 60) {
    for (const side of [-1, 1]) {
      const shade = 0.5 + rnd() * 0.45;
      bricks += `<rect x="${cx + side * (half + 34) - 34}" y="${y - 26}" width="68" height="54" rx="5" fill="rgb(${Math.round(64 * shade)},${Math.round(72 * shade)},${Math.round(92 * shade)})" stroke="#0B0F1A" stroke-width="4"/>`;
    }
  }

  // Tracks running out of the tunnel toward the viewer.
  const vx = cx, vy = cy + 40;
  let tracks = '';
  for (let i = 1; i <= 9; i++) {
    const t = i / 9;
    const y = vy + (floorY - vy) * t * t;
    const w = half * 0.92 * t * t + 30;
    tracks += `<rect x="${f(vx - w)}" y="${f(y)}" width="${f(w * 2)}" height="${f(6 + 16 * t)}" fill="#1A1410" stroke="#05070C" stroke-width="2"/>`;
  }
  const rail = (dx) => `<path d="M${vx + dx * 0.06} ${vy}L${vx + dx} ${floorY + 4}" stroke="#8FA0B8" stroke-width="9"/><path d="M${vx + dx * 0.06} ${vy}L${vx + dx} ${floorY + 4}" stroke="#C7FFF1" stroke-width="2.5" opacity=".8"/>`;

  const lampSvg = lamps.map(([x, y]) => `
    <path d="M${x} 0V${y - 46}" stroke="#05070C" stroke-width="7"/>
    <ellipse cx="${x}" cy="${y + 260}" rx="330" ry="420" fill="url(#lampPool)" style="mix-blend-mode:screen"/>
    <path d="M${x - 150} ${y + 620}L${x - 34} ${y}H${x + 34}L${x + 150} ${y + 620}Z" fill="url(#lampCone)" style="mix-blend-mode:screen"/>
    <path d="M${x - 58} ${y}C${x - 52} ${y - 34} ${x - 26} ${y - 50} ${x} ${y - 50}C${x + 26} ${y - 50} ${x + 52} ${y - 34} ${x + 58} ${y}Z" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
    <ellipse cx="${x}" cy="${y + 2}" rx="52" ry="11" fill="#FFF6DC" stroke="${K}" stroke-width="4"/>
    <circle cx="${x}" cy="${y + 8}" r="60" fill="url(#amberGlow)" style="mix-blend-mode:screen"/>
    <path d="M${x - 40} ${y - 16}C${x - 30} ${y - 34} ${x - 12} ${y - 42} ${x + 6} ${y - 42}" fill="none" stroke="#FFFBEA" stroke-width="3" opacity=".8"/>`).join('');

  // Random cracked / stained tiles.
  let stains = '';
  for (let i = 0; i < 70; i++) {
    const x = Math.floor((rnd() * W) / 96) * 96 + (Math.floor(rnd() * 2) ? 0 : 48);
    const y = Math.floor((rnd() * floorY) / 48) * 48;
    const o = 0.08 + rnd() * 0.22;
    stains += `<rect x="${x + 3}" y="${y + 3}" width="90" height="42" rx="4" fill="${rnd() > 0.5 ? '#0B0F1A' : '#8FA0B8'}" opacity="${f(o * (rnd() > 0.5 ? 1 : 0.5))}"/>`;
  }
  let cracks = '';
  for (let i = 0; i < 9; i++) {
    let x = rnd() * W, y = rnd() * floorY * 0.9;
    let d = `M${f(x)} ${f(y)}`;
    for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 70; y += 20 + rnd() * 40; d += `L${f(x)} ${f(y)}`; }
    cracks += `<path d="${d}" fill="none" stroke="#05070C" stroke-width="${f(1.5 + rnd() * 2)}" opacity=".7"/>`;
  }

  const [kx, ky, kr] = clock;
  const clockSvg = kr < 5 ? "" : `
    <g filter="url(#shadow)">
      <path d="M${kx} ${ky - kr - 60}V${ky - kr}" stroke="${K}" stroke-width="16"/><path d="M${kx} ${ky - kr - 60}V${ky - kr}" stroke="url(#brassH)" stroke-width="8"/>
      <circle cx="${kx}" cy="${ky}" r="${kr}" fill="url(#brass)" stroke="${K}" stroke-width="6"/>
      <circle cx="${kx}" cy="${ky}" r="${kr - 16}" fill="#F3E6C0" stroke="${K}" stroke-width="4"/>
      <circle cx="${kx}" cy="${ky}" r="${kr - 16}" fill="url(#amberAura)"/>
      ${ring(kx, ky, kr - 28, 12, (x, y, a, i) => { const [x2, y2] = pt(kx, ky, kr - (i % 3 ? 38 : 46), a); return `<path d="M${x} ${y}L${f(x2)} ${f(y2)}" stroke="#2A1E0C" stroke-width="${i % 3 ? 4 : 7}"/>`; })}
      <path d="M${kx} ${ky}L${kx - 4} ${ky - kr + 48}M${kx} ${ky}L${kx + 3} ${ky - kr + 34}" stroke="#0B1220" stroke-width="7"/>
      <circle cx="${kx}" cy="${ky}" r="8" fill="url(#brass)" stroke="${K}" stroke-width="3"/>
      <path d="${arc(kx, ky, kr - 7, 200, 285)}" fill="none" stroke="#FFFBEA" stroke-width="4" opacity=".8"/>
      <path d="${arc(kx, ky, kr - 7, 10, 80)}" fill="none" stroke="#5EF2D6" stroke-width="4" opacity=".8"/>
    </g>`;

  const pipes = [70, 104].map((y, i) => `
    <path d="M0 ${y}H${W}" stroke="${K}" stroke-width="${22 - i * 6}"/>
    <path d="M0 ${y}H${W}" stroke="url(#pipe)" stroke-width="${15 - i * 5}"/>
    ${Array.from({ length: Math.ceil(W / 340) }, (_, j) => `<rect x="${120 + j * 340 + i * 90}" y="${y - 14 + i * 3}" width="22" height="${28 - i * 6}" rx="4" fill="url(#brassV)" stroke="${K}" stroke-width="4"/>`).join('')}`).join('');

  // Platform floor: perspective tiles, tactile safety strip, wet reflections.
  let floor = '';
  for (let i = 0; i <= 26; i++) {
    const x = cx + (i - 13) * (W / 11);
    floor += `<path d="M${f(cx + (x - cx) * 0.42)} ${floorY + 34}L${f(cx + (x - cx) * 1.6)} ${H}" stroke="#05070C" stroke-width="3" opacity=".8"/>`;
  }
  for (let i = 1; i < 6; i++) {
    const y = floorY + 34 + (H - floorY - 34) * (i / 6) ** 1.6;
    floor += `<path d="M0 ${f(y)}H${W}" stroke="#05070C" stroke-width="${f(2 + i)}" opacity=".8"/>`;
  }
  const reflections = lamps.map(([x]) => `<ellipse cx="${x}" cy="${floorY + (H - floorY) * 0.55}" rx="70" ry="${(H - floorY) * 0.6}" fill="url(#amberAura)" style="mix-blend-mode:screen" opacity=".8"/>`).join('');

  const extra = `
  <pattern id="tiles" width="96" height="96" patternUnits="userSpaceOnUse">
    <rect width="96" height="96" fill="#0C111D"/>
    <g fill="url(#tileFace)"><rect x="3" y="3" width="90" height="42" rx="4"/><rect x="-45" y="51" width="90" height="42" rx="4"/><rect x="51" y="51" width="90" height="42" rx="4"/></g>
    <g fill="none" stroke="#7E8AA6" stroke-width="2" opacity=".5"><path d="M7 6H88M-41 54H40M55 54H136"/></g>
  </pattern>
  <linearGradient id="tileFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A5369"/><stop offset=".5" stop-color="#3A4256"/><stop offset="1" stop-color="#2A3042"/></linearGradient>
  <linearGradient id="pipe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6F7A92"/><stop offset=".5" stop-color="#3A4256"/><stop offset="1" stop-color="#151A27"/></linearGradient>
  <radialGradient id="tunnel" cx="${cx}" cy="${cy + 60}" r="${half * 1.25}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#7DFFD0"/><stop offset=".12" stop-color="#2FA98E"/><stop offset=".4" stop-color="#103C44"/><stop offset=".75" stop-color="#070C16"/><stop offset="1" stop-color="#030509"/>
  </radialGradient>
  <radialGradient id="vignette" cx="${cx}" cy="${cy}" r="${Math.hypot(W, H) * 0.56}" gradientUnits="userSpaceOnUse">
    <stop offset=".35" stop-color="#05070C" stop-opacity="0"/><stop offset=".75" stop-color="#05070C" stop-opacity=".55"/><stop offset="1" stop-color="#05070C" stop-opacity=".92"/>
  </radialGradient>
  <radialGradient id="lampPool"><stop offset="0" stop-color="#F0B45E" stop-opacity=".34"/><stop offset=".5" stop-color="#F0B45E" stop-opacity=".1"/><stop offset="1" stop-color="#F0B45E" stop-opacity="0"/></radialGradient>
  <linearGradient id="lampCone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE2A0" stop-opacity=".3"/><stop offset="1" stop-color="#F0B45E" stop-opacity="0"/></linearGradient>
  <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2233"/><stop offset=".4" stop-color="#121826"/><stop offset="1" stop-color="#070A12"/></linearGradient>
  <linearGradient id="dado" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070C" stop-opacity="0"/><stop offset="1" stop-color="#05070C" stop-opacity=".7"/></linearGradient>
  <linearGradient id="strip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9B94F"/><stop offset="1" stop-color="#8A6A22"/></linearGradient>
  <filter id="grime" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".006 .012" numOctaves="4" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 .02  0 0 0 0 .03  0 0 0 0 .06  0 0 0 1.5 -.55"/>
  </filter>
  <filter id="fine" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .22 -.06"/>
  </filter>
  <clipPath id="archClip"><path d="${archPath(0)}"/></clipPath>`;

  return svg(W, H, `
  <rect width="${W}" height="${H}" fill="#0C111D"/>
  <rect width="${W}" height="${floorY}" fill="url(#tiles)"/>
  ${stains}${cracks}
  <rect width="${W}" height="${floorY}" filter="url(#grime)"/>
  <rect y="${floorY - 250}" width="${W}" height="250" fill="url(#dado)"/>
  <path d="M0 ${floorY - 250}H${W}" stroke="${K}" stroke-width="16"/><path d="M0 ${floorY - 250}H${W}" stroke="url(#brassV)" stroke-width="8"/>
  <path d="M0 158H${W}" stroke="${K}" stroke-width="14"/><path d="M0 158H${W}" stroke="url(#brassV)" stroke-width="7"/>
  ${pipes}
  <path d="${archPath(70)}" fill="#05070C"/>
  ${bricks}
  <path d="${archPath(0)}" fill="url(#tunnel)" stroke="${K}" stroke-width="8"/>
  <g clip-path="url(#archClip)">
    ${[0.86, 0.7, 0.54, 0.4].map((s, i) => `<path d="M${cx - half * s} ${floorY}V${cy + 60 - half * s * 0.5 + half * s * 0}A${half * s} ${half * s} 0 0 1 ${cx + half * s} ${cy + 60 - half * s * 0.5}V${floorY}" fill="none" stroke="#5EF2D6" stroke-width="${5 - i}" opacity="${0.14 + i * 0.07}"/>`).join('')}
    ${tracks}${rail(-half * 0.8)}${rail(half * 0.8)}
    <ellipse cx="${cx}" cy="${cy + 60}" rx="${half * 0.5}" ry="${half * 0.42}" fill="url(#greenAura)" style="mix-blend-mode:screen"/>
    <ellipse cx="${cx}" cy="${floorY - 20}" rx="${half}" ry="90" fill="#8DFFB5" opacity=".16" filter="url(#blur24)"/>
  </g>
  <path d="${archPath(0)}" fill="none" stroke="#5EF2D6" stroke-width="4" opacity=".5" filter="url(#glowS)"/>
  ${clockSvg}
  <rect y="${floorY}" width="${W}" height="${H - floorY}" fill="url(#floorG)"/>
  <rect y="${floorY}" width="${W}" height="34" fill="url(#strip)" stroke="${K}" stroke-width="5"/>
  ${Array.from({ length: Math.ceil(W / 56) }, (_, i) => `<circle cx="${i * 56 + 20}" cy="${floorY + 17}" r="7" fill="#5A4416" opacity=".8"/>`).join('')}
  ${floor}
  ${reflections}
  <ellipse cx="${cx}" cy="${floorY + (H - floorY) * 0.5}" rx="${half * 0.9}" ry="${(H - floorY) * 0.7}" fill="url(#tealAura)" style="mix-blend-mode:screen" opacity=".9"/>
  ${lampSvg}
  <ellipse cx="${cx}" cy="${floorY + 10}" rx="${W * 0.6}" ry="70" fill="#C7FFF1" opacity=".08" filter="url(#blur24)"/>
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
  <rect width="${W}" height="${H}" filter="url(#fine)" style="mix-blend-mode:overlay" opacity=".5"/>`, extra);
}

// ---------- reel frame ----------
export const CELL = 138;
export const GRID_W = CELL * 6, GRID_H = CELL * 5;
const BORDER = 46;
const FW = GRID_W + BORDER * 2, FH = GRID_H + BORDER * 2;

const frameBack = (() => {
  let cells = '';
  for (let c = 0; c < 6; c++) for (let r = 0; r < 5; r++) {
    cells += `<rect x="${BORDER + c * CELL + 4}" y="${BORDER + r * CELL + 4}" width="${CELL - 8}" height="${CELL - 8}" rx="14" fill="url(#cell)" stroke="#2B3854" stroke-width="2"/>`;
  }
  return svg(FW, FH, `
  <rect x="${BORDER - 8}" y="${BORDER - 8}" width="${GRID_W + 16}" height="${GRID_H + 16}" rx="18" fill="#070B14"/>
  ${cells}
  <rect x="${BORDER}" y="${BORDER}" width="${GRID_W}" height="${GRID_H}" fill="url(#panelGlow)"/>`,
  `<linearGradient id="cell" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18223A"/><stop offset="1" stop-color="#0D1424"/></linearGradient>
   <radialGradient id="panelGlow" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="#5EF2D6" stop-opacity=".12"/><stop offset="1" stop-color="#5EF2D6" stop-opacity="0"/></radialGradient>`);
})();

const frameFront = (() => {
  const rivets = [];
  for (let x = BORDER + 70; x < FW - BORDER - 20; x += 115) rivets.push([x, 20], [x, FH - 20]);
  for (let y = BORDER + 70; y < FH - BORDER - 20; y += 115) rivets.push([20, y], [FW - 20, y]);
  const corner = (x, y) => `
    <circle cx="${x}" cy="${y}" r="40" fill="url(#brass)" stroke="${K}" stroke-width="6"/>
    <circle cx="${x}" cy="${y}" r="27" fill="#0B1220" stroke="${K}" stroke-width="4"/>
    <circle cx="${x}" cy="${y}" r="24" fill="url(#tealGlow)"/>
    <circle cx="${x}" cy="${y}" r="11" fill="#5EF2D6" filter="url(#glow)"/>
    <circle cx="${x - 4}" cy="${y - 4}" r="4" fill="#fff"/>
    <path d="${arc(x, y, 34, 200, 280)}" fill="none" stroke="#FFFBEA" stroke-width="3" opacity=".8"/>`;
  return svg(FW, FH, `
  <g filter="url(#shadow)">
    <path fill-rule="evenodd" d="M30 4H${FW - 30}a26 26 0 0 1 26 26V${FH - 30}a26 26 0 0 1-26 26H30a26 26 0 0 1-26-26V30A26 26 0 0 1 30 4ZM${BORDER} ${BORDER - 4}a4 4 0 0 0-4 4V${FH - BORDER}a4 4 0 0 0 4 4H${FW - BORDER}a4 4 0 0 0 4-4V${BORDER}a4 4 0 0 0-4-4Z" fill="url(#brass)" stroke="${K}" stroke-width="6"/>
  </g>
  <rect x="12" y="12" width="${FW - 24}" height="${FH - 24}" rx="20" fill="none" stroke="#FFF0BE" stroke-width="2.5" opacity=".7"/>
  <rect x="${BORDER - 13}" y="${BORDER - 13}" width="${GRID_W + 26}" height="${GRID_H + 26}" rx="10" fill="none" stroke="#4A3516" stroke-width="4"/>
  <rect x="${BORDER - 8}" y="${BORDER - 8}" width="${GRID_W + 16}" height="${GRID_H + 16}" rx="8" fill="none" stroke="#5EF2D6" stroke-width="3" opacity=".75" filter="url(#glowS)"/>
  <rect x="${BORDER - 4}" y="${BORDER - 4}" width="${GRID_W + 8}" height="${GRID_H + 8}" fill="none" stroke="url(#inner)" stroke-width="26" opacity=".9"/>
  ${rivets.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="url(#brass)" stroke="${K}" stroke-width="3"/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#FFFBEA"/>`).join('')}
  ${corner(34, 34)}${corner(FW - 34, 34)}${corner(34, FH - 34)}${corner(FW - 34, FH - 34)}
  <path d="M90 9H${FW - 90}" stroke="#FFFBEA" stroke-width="3" opacity=".55"/>`,
  `<radialGradient id="inner" cx="50%" cy="50%" r="72%"><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>`);
})();

// ---------- logo ----------
const logo = (() => {
  const W = 820, H = 250;
  const stops = [150, 250, 350, 450, 550, 650];
  return svg(W, H, `
  <ellipse cx="410" cy="110" rx="390" ry="100" fill="url(#tealAura)"/>
  <g filter="url(#shadow)">
    <rect x="40" y="14" width="740" height="172" rx="34" fill="url(#brass)" stroke="${K}" stroke-width="6"/>
    <rect x="58" y="32" width="704" height="136" rx="20" fill="url(#navyV)" stroke="${K}" stroke-width="5"/>
    <rect x="58" y="32" width="704" height="136" rx="20" fill="url(#tealAura)" opacity=".7"/>
    <rect x="49" y="23" width="722" height="154" rx="27" fill="none" stroke="#FFF0BE" stroke-width="2.5" opacity=".65"/>
  </g>
  ${[[72, 46], [748, 46], [72, 154], [748, 154]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="url(#brass)" stroke="${K}" stroke-width="3"/>`).join('')}
  <g filter="url(#glow)"><text x="402" y="142" font-size="138" text-anchor="middle" fill="#5EF2D6" letter-spacing="14">LAST STOP</text></g>
  <text x="402" y="142" font-size="138" text-anchor="middle" fill="url(#letters)" stroke="#0B3A40" stroke-width="2" letter-spacing="14">LAST STOP</text>
  <path d="M110 154H690" stroke="#5EF2D6" stroke-width="4" filter="url(#glowS)"/>
  ${stops.map((x) => `<circle cx="${x}" cy="154" r="7" fill="#0B1220" stroke="#5EF2D6" stroke-width="3"/>`).join('')}
  <circle cx="690" cy="154" r="10" fill="#F2FFFB" filter="url(#glow)"/>
  <circle cx="728" cy="60" r="20" fill="url(#tealGlow)"/>
  <circle cx="728" cy="60" r="11" fill="#070B14" stroke="#5EF2D6" stroke-width="3"/>
  <g filter="url(#shadow)">
    <rect x="270" y="178" width="280" height="56" rx="12" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
    <rect x="279" y="187" width="262" height="38" rx="6" fill="#111827" stroke="#5A4119" stroke-width="2"/>
    <text x="410" y="218" font-size="33" text-anchor="middle" fill="#F0B45E" letter-spacing="9">MIDNIGHT LINE</text>
  </g>
  <path d="M70 24H740" stroke="#FFFBEA" stroke-width="3" opacity=".6"/>
  ${sparkle(64, 30, 12)}${sparkle(768, 150, 9, '#C7FFF1')}`,
  `<linearGradient id="letters" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#C7FFF1"/><stop offset="1" stop-color="#5EF2D6"/></linearGradient>`);
})();

// ---------- the Midnight Train, head on ----------
const train = (() => {
  const W = 900, H = 900;
  return svg(W, H, `
  <ellipse cx="450" cy="380" rx="440" ry="380" fill="url(#greenAura)"/>
  <g filter="url(#shadow)">
    <path d="M150 800V330C150 180 280 90 450 90S750 180 750 330V800Z" fill="url(#navyV)" stroke="${K}" stroke-width="10"/>
    <path d="M450 90C620 90 750 180 750 330V800H620C660 560 640 260 450 90Z" fill="#05070C" opacity=".5"/>
    <path d="M190 350C190 220 300 140 450 140S710 220 710 350V372H190Z" fill="#1C2842" stroke="${K}" stroke-width="8"/>
    <path d="M210 330C220 230 310 168 430 160" fill="none" stroke="#8FB0E0" stroke-width="8" opacity=".5"/>
    <rect x="210" y="440" width="200" height="170" rx="18" fill="#5EF2D6" stroke="${K}" stroke-width="8" filter="url(#glowS)"/>
    <rect x="490" y="440" width="200" height="170" rx="18" fill="#5EF2D6" stroke="${K}" stroke-width="8" filter="url(#glowS)"/>
    <path d="M226 456H394V510H226ZM506 456H674V510H506Z" fill="#F2FFFB" opacity=".7"/>
    <path d="M260 610c10-60 30-90 50-90s40 30 50 90ZM540 610c10-60 30-90 50-90s40 30 50 90Z" fill="#0B1220" opacity=".8"/>
    <rect x="430" y="430" width="40" height="190" rx="8" fill="url(#brassH)" stroke="${K}" stroke-width="6"/>
    <rect x="120" y="650" width="660" height="54" rx="12" fill="url(#brassH)" stroke="${K}" stroke-width="8"/>
    <rect x="330" y="662" width="240" height="30" rx="6" fill="#111827"/>
    <text x="450" y="688" font-size="30" text-anchor="middle" fill="#F0B45E" letter-spacing="8">MIDNIGHT LINE</text>
    <path d="M170 704H730L690 850H210Z" fill="#12141F" stroke="${K}" stroke-width="8"/>
    ${[250, 330, 410, 490, 570, 650].map((x) => `<path d="M${x} 712L${450 + (x - 450) * 0.8} 842" stroke="url(#brassV)" stroke-width="12"/>`).join('')}
    <circle cx="230" cy="760" r="26" fill="#C94B4B" stroke="${K}" stroke-width="7" filter="url(#glowS)"/>
    <circle cx="670" cy="760" r="26" fill="#C94B4B" stroke="${K}" stroke-width="7" filter="url(#glowS)"/>
    <circle cx="222" cy="752" r="8" fill="#FFD0D0"/><circle cx="662" cy="752" r="8" fill="#FFD0D0"/>
  </g>
  <circle cx="450" cy="270" r="170" fill="url(#tealGlow)"/>
  <circle cx="450" cy="270" r="84" fill="url(#brass)" stroke="${K}" stroke-width="8"/>
  <circle cx="450" cy="270" r="62" fill="#F2FFFB" filter="url(#glow)"/>
  <circle cx="450" cy="270" r="62" fill="#fff"/>
  <path d="${arc(450, 270, 76, 200, 290)}" fill="none" stroke="#FFFBEA" stroke-width="6" opacity=".8"/>
  <rect x="380" y="100" width="140" height="50" rx="10" fill="#111827" stroke="${K}" stroke-width="6"/>
  <text x="450" y="140" font-size="44" text-anchor="middle" fill="#5EF2D6" letter-spacing="4" filter="url(#glowS)">13</text>`);
})();

export default [
  { name: 'bg_landscape.jpg', w: 2400, h: 1350, quality: 84,
    svg: station({ W: 2400, H: 1350, cx: 1200, cy: 635, archW: 1180, archTop: 60, floorY: 1050, lamps: [[250, 250], [650, 210], [1750, 210], [2150, 250]], clock: [420, 330, 74] }) },
  { name: 'bg_portrait.jpg', w: 1350, h: 2400, quality: 84,
    svg: station({ W: 1350, H: 2400, cx: 675, cy: 1140, archW: 1210, archTop: 420, floorY: 1640, lamps: [[160, 300], [1190, 300]], clock: [675, 300, 0.01] }) },
  { name: 'frame_back.png', w: FW, h: FH, svg: frameBack, sheetH: 380 },
  { name: 'frame_front.png', w: FW, h: FH, svg: frameFront, sheetH: 380 },
  { name: 'logo.png', w: 820, h: 250, svg: logo, sheetH: 200 },
  { name: 'train.png', w: 900, h: 900, svg: train, sheetH: 380 },
];
