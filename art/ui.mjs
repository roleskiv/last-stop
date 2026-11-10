// Effect textures and the arrivals board.
import { K, star, svg } from './lib.mjs';
import { CELL } from './scene.mjs';

const glow = svg(256, 256, `<circle cx="128" cy="128" r="128" fill="url(#g)"/>`,
  `<radialGradient id="g"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#fff" stop-opacity=".6"/><stop offset=".6" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);

const spark = svg(96, 96, `<circle cx="48" cy="48" r="30" fill="url(#g)"/><path d="${star(48, 48, 46, 5, 4)}" fill="#fff"/>`,
  `<radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`);

const smoke = svg(256, 256, `<g filter="url(#blur24)" fill="#fff" opacity=".8">
  <circle cx="110" cy="130" r="60"/><circle cx="160" cy="110" r="46"/><circle cx="150" cy="160" r="40"/><circle cx="90" cy="100" r="34"/></g>`);

const ringTex = svg(256, 256, `<circle cx="128" cy="128" r="104" fill="none" stroke="#fff" stroke-width="10" filter="url(#blur4)"/><circle cx="128" cy="128" r="104" fill="none" stroke="#fff" stroke-width="4"/>`);

const T = CELL;
const tile = svg(T, T, `
  <rect x="5" y="5" width="${T - 10}" height="${T - 10}" rx="14" fill="url(#fill)"/>
  <rect x="6" y="6" width="${T - 12}" height="${T - 12}" rx="13" fill="none" stroke="#5EF2D6" stroke-width="5" filter="url(#glow)"/>
  <rect x="6" y="6" width="${T - 12}" height="${T - 12}" rx="13" fill="none" stroke="#EFFFFA" stroke-width="2"/>
  <g stroke="#F0B45E" stroke-width="4" opacity=".9">
    <path d="M14 30V20a6 6 0 0 1 6-6h10M${T - 30} 14h10a6 6 0 0 1 6 6v10M14 ${T - 30}v10a6 6 0 0 0 6 6h10M${T - 30} ${T - 14}h10a6 6 0 0 0 6-6v-10" fill="none"/>
  </g>`,
  `<radialGradient id="fill" cx="50%" cy="50%" r="70%"><stop offset=".3" stop-color="#5EF2D6" stop-opacity=".05"/><stop offset="1" stop-color="#5EF2D6" stop-opacity=".4"/></radialGradient>`);

const badge = svg(72, 44, `
  <rect x="3" y="3" width="66" height="38" rx="10" fill="url(#brassV)" stroke="${K}" stroke-width="4"/>
  <rect x="8" y="8" width="56" height="28" rx="6" fill="#0B1220"/>`);

const BW = 400, BH = 330;
const board = svg(BW, BH, `
  <g fill="none" stroke="${K}" stroke-width="10"><path d="M90 0V60M310 0V60"/></g>
  <g fill="none" stroke="url(#brassV)" stroke-width="5" stroke-dasharray="10 5"><path d="M90 0V60M310 0V60"/></g>
  <g filter="url(#shadow)">
    <rect x="6" y="54" width="388" height="262" rx="22" fill="url(#brass)" stroke="${K}" stroke-width="6"/>
    <rect x="22" y="70" width="356" height="230" rx="12" fill="#070B14" stroke="${K}" stroke-width="5"/>
    <rect x="22" y="70" width="356" height="230" rx="12" fill="url(#tealAura)" opacity=".55"/>
    <rect x="14" y="62" width="372" height="246" rx="17" fill="none" stroke="#FFF0BE" stroke-width="2.2" opacity=".65"/>
  </g>
  ${[[22, 70], [378, 70], [22, 300], [378, 300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="url(#brass)" stroke="${K}" stroke-width="3"/>`).join('')}
  <path d="M40 118H360" stroke="#B78B3E" stroke-width="2.5"/>
  <g opacity=".12" stroke="#5EF2D6" stroke-width="1">${Array.from({ length: 44 }, (_, i) => `<path d="M26 ${126 + i * 4}H374"/>`).join('')}</g>
  <path d="M26 64H374" stroke="#FFFBEA" stroke-width="3" opacity=".6"/>`);

export default [
  { name: 'fx/glow.png', w: 256, h: 256, svg: glow },
  { name: 'fx/spark.png', w: 96, h: 96, svg: spark },
  { name: 'fx/smoke.png', w: 256, h: 256, svg: smoke },
  { name: 'fx/ring.png', w: 256, h: 256, svg: ringTex },
  { name: 'fx/tile.png', w: T, h: T, svg: tile },
  { name: 'fx/badge.png', w: 72, h: 44, svg: badge },
  { name: 'board.png', w: BW, h: BH, svg: board },
];
