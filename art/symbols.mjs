// The twelve reel symbols. Each is drawn on a 256 x 256 canvas.
// Light: warm amber key light from the upper left, teal rim light from the lower right.
import { K, arc, f, pt, ring, sparkle, star, svg } from './lib.mjs';

const S = 256;
const aura = (id, r = 118, o = 1) => `<circle cx="128" cy="128" r="${r}" fill="url(#${id})" opacity="${o}"/>`;

// ---------- lows ----------
const token = svg(S, S, `
<g filter="url(#shadow)">
  <circle cx="128" cy="128" r="94" fill="url(#brass)" stroke="${K}" stroke-width="5"/>
  <circle cx="128" cy="128" r="84" fill="none" stroke="#5A4119" stroke-width="3"/>
  <circle cx="128" cy="128" r="81" fill="none" stroke="#FFF0BE" stroke-width="1.6" opacity=".55"/>
  ${ring(128, 128, 73, 28, (x, y) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#6E5122"/><circle cx="${x - 0.7}" cy="${y - 0.7}" r="1.1" fill="#FFF0BE" opacity=".8"/>`)}
  <circle cx="128" cy="128" r="62" fill="#5A4119"/>
  <circle cx="128" cy="128" r="58" fill="url(#navyV)" stroke="${K}" stroke-width="3"/>
  <circle cx="128" cy="128" r="50" fill="url(#tealAura)"/>
  <g filter="url(#glow)" fill="none" stroke="#5EF2D6" stroke-width="9">
    <path d="M128 100V160M106 98C106 122 116 132 128 134C140 132 150 122 150 98"/>
  </g>
  <g fill="none" stroke="#EFFFFA" stroke-width="3.2">
    <path d="M128 100V160M106 98C106 122 116 132 128 134C140 132 150 122 150 98"/>
  </g>
  <path d="${arc(128, 128, 89, 196, 284)}" fill="none" stroke="#FFFBEA" stroke-width="4" opacity=".75"/>
  <path d="${arc(128, 128, 89, 20, 80)}" fill="none" stroke="#5EF2D6" stroke-width="3.5" opacity=".85"/>
  <path d="${arc(128, 128, 54, 200, 300)}" fill="none" stroke="#7FA0C8" stroke-width="2" opacity=".5"/>
</g>`);

const ticketHoles = [[176, 112], [196, 140], [172, 150]];
const ticket = svg(S, S, `
<g transform="rotate(-13 128 128)" filter="url(#shadow)">
  <path d="M34 78H222a8 8 0 0 1 8 8v24a18 18 0 0 0 0 36v24a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8v-24a18 18 0 0 0 0-36V86a8 8 0 0 1 8-8Z" fill="url(#paper)" stroke="${K}" stroke-width="5"/>
  <path d="M36 86H220M36 170H220" stroke="#9A7038" stroke-width="2" opacity=".7"/>
  <rect x="44" y="94" width="100" height="26" rx="3" fill="#C94B4B" stroke="#7A2A2A" stroke-width="2"/>
  <text x="94" y="115" font-size="24" text-anchor="middle" fill="#FFF1CC" letter-spacing="2">LAST STOP</text>
  <text x="46" y="158" font-size="34" fill="#4A3516" letter-spacing="1">No.13</text>
  <rect x="112" y="134" width="30" height="5" rx="2" fill="#7A5A26" opacity=".7"/>
  <rect x="112" y="146" width="22" height="5" rx="2" fill="#7A5A26" opacity=".7"/>
  <path d="M154 84V172" stroke="#7A5A26" stroke-width="2.5" stroke-dasharray="1 7"/>
  ${ticketHoles.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="13" fill="url(#tealGlow)" opacity=".9"/><circle cx="${x}" cy="${y}" r="7.5" fill="#0B1220" stroke="#5EF2D6" stroke-width="2.2"/>`).join('')}
  <text x="192" y="106" font-size="15" text-anchor="middle" fill="#7A5A26" letter-spacing="1">ONE WAY</text>
  <path d="M40 82H216" stroke="#FFFBEA" stroke-width="2.5" opacity=".8"/>
  <path d="M226 150v20a6 6 0 0 1-6 6H120" fill="none" stroke="#5EF2D6" stroke-width="3" opacity=".8"/>
</g>`);

const lantern = svg(S, S, `
${aura('greenAura', 110, 0.9)}
<g filter="url(#shadow)">
  <path d="M128 22a22 22 0 0 1 22 22v8h-10v-8a12 12 0 0 0-24 0v8h-10v-8a22 22 0 0 1 22-22Z" fill="url(#brass)" stroke="${K}" stroke-width="4"/>
  <path d="M98 78 108 52h40l10 26Z" fill="url(#brassV)" stroke="${K}" stroke-width="4.5"/>
  <rect x="86" y="76" width="84" height="14" rx="5" fill="url(#brassH)" stroke="${K}" stroke-width="4.5"/>
  <path d="M92 90h72l8 100H84Z" fill="#0C2A2B" stroke="${K}" stroke-width="4.5"/>
  <path d="M94 92h68l7 96H87Z" fill="url(#greenAura)"/>
  <ellipse cx="128" cy="150" rx="34" ry="42" fill="url(#tealGlow)" opacity=".85"/>
  <g filter="url(#glow)">
    <path d="M128 104c16 20 24 34 24 48a24 24 0 0 1-48 0c0-12 6-18 12-28 2 10 6 12 8 12 2-10 0-20 4-32Z" fill="#8DFFB5"/>
  </g>
  <path d="M128 126c9 12 13 20 13 28a13 13 0 0 1-26 0c0-7 4-10 7-16 1 6 3 7 4 7 1-6 0-12 2-19Z" fill="#F2FFFB"/>
  <path d="M110 90 104 190M146 90 152 190" stroke="url(#brassV)" stroke-width="7"/>
  <path d="M110 90 104 190M146 90 152 190" fill="none" stroke="${K}" stroke-width="1.5" opacity=".6" transform="translate(4 0)"/>
  <path d="M92 90h72l8 100H84Z" fill="none" stroke="${K}" stroke-width="4.5"/>
  <path d="M100 98 96 176" stroke="#EFFFFA" stroke-width="4" opacity=".45"/>
  <rect x="76" y="188" width="104" height="16" rx="6" fill="url(#brassH)" stroke="${K}" stroke-width="4.5"/>
  <path d="M90 204h76l10 22a6 6 0 0 1-5 8H85a6 6 0 0 1-5-8Z" fill="url(#brassV)" stroke="${K}" stroke-width="4.5"/>
  <path d="M90 80h56" stroke="#FFFBEA" stroke-width="3" opacity=".8"/>
  <path d="M168 196h8M158 228h14" stroke="#5EF2D6" stroke-width="3" opacity=".85"/>
</g>`);

const key = svg(S, S, `
<g transform="rotate(-42 128 128)" filter="url(#shadow)">
  <circle cx="64" cy="128" r="30" fill="url(#tealAura)"/>
  <path fill-rule="evenodd" d="M64 84a44 44 0 1 1 0 88 44 44 0 0 1 0-88Zm0 24a20 20 0 1 0 0 40 20 20 0 0 0 0-40Z" fill="url(#steel)" stroke="${K}" stroke-width="5"/>
  <circle cx="64" cy="76" r="13" fill="url(#steel)" stroke="${K}" stroke-width="4.5"/>
  <circle cx="64" cy="180" r="13" fill="url(#steel)" stroke="${K}" stroke-width="4.5"/>
  <circle cx="14" cy="128" r="11" fill="url(#steel)" stroke="${K}" stroke-width="4.5"/>
  <circle cx="64" cy="128" r="20" fill="none" stroke="#5EF2D6" stroke-width="3" filter="url(#glowS)"/>
  <rect x="104" y="118" width="128" height="20" rx="5" fill="url(#steel)" stroke="${K}" stroke-width="5"/>
  <rect x="108" y="108" width="12" height="40" rx="4" fill="url(#brassV)" stroke="${K}" stroke-width="4"/>
  <rect x="128" y="112" width="8" height="32" rx="3" fill="url(#brassV)" stroke="${K}" stroke-width="3.5"/>
  <path d="M184 138h46v40h-14v-16h-6v22h-12v-22h-14Z" fill="url(#steel)" stroke="${K}" stroke-width="5"/>
  <g fill="#A8643A" opacity=".75">
    <circle cx="48" cy="100" r="7"/><circle cx="92" cy="150" r="9"/><circle cx="160" cy="130" r="5"/>
    <circle cx="206" cy="160" r="6"/><circle cx="64" cy="182" r="5"/><circle cx="222" cy="126" r="4"/>
  </g>
  <g fill="#5E3A22" opacity=".6"><circle cx="52" cy="103" r="3"/><circle cx="96" cy="153" r="4"/><circle cx="208" cy="163" r="2.5"/></g>
  <path d="${arc(64, 128, 39, 150, 250)}" fill="none" stroke="#F4F7FB" stroke-width="3.5" opacity=".75"/>
  <path d="M110 122h116" stroke="#F4F7FB" stroke-width="2.5" opacity=".6"/>
  <path d="${arc(64, 128, 39, -30, 60)}" fill="none" stroke="#5EF2D6" stroke-width="3" opacity=".8"/>
</g>`);

const watch = svg(S, S, `
<g filter="url(#shadow)">
  <path d="M128 12a16 16 0 0 1 16 16c0 6-3 10-8 13v9h-16v-9c-5-3-8-7-8-13a16 16 0 0 1 16-16Zm0 9a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" fill-rule="evenodd" fill="url(#brass)" stroke="${K}" stroke-width="4"/>
  <rect x="114" y="46" width="28" height="18" rx="5" fill="url(#brassH)" stroke="${K}" stroke-width="4.5"/>
  <circle cx="128" cy="146" r="90" fill="url(#brass)" stroke="${K}" stroke-width="5"/>
  <circle cx="128" cy="146" r="78" fill="#5A4119"/>
  <circle cx="128" cy="146" r="73" fill="#FFF6DC" stroke="${K}" stroke-width="3.5"/>
  <circle cx="128" cy="146" r="73" fill="url(#amberAura)" opacity=".7"/>
  <circle cx="128" cy="146" r="60" fill="none" stroke="#B78B3E" stroke-width="1.5" opacity=".7"/>
  ${ring(128, 146, 64, 12, (x, y, a, i) => {
    const big = i % 3 === 0;
    const [x2, y2] = pt(128, 146, big ? 50 : 56, a);
    return `<path d="M${x} ${y}L${f(x2)} ${f(y2)}" stroke="#2A1E0C" stroke-width="${big ? 6 : 3}"/>`;
  })}
  <text x="128" y="124" font-size="20" text-anchor="middle" fill="#7A5A26" letter-spacing="1">XII</text>
  <circle cx="128" cy="176" r="15" fill="none" stroke="#B78B3E" stroke-width="2"/>
  <path d="M128 176v-10" stroke="#7A5A26" stroke-width="2.5"/>
  <g filter="url(#glowS)">
    <path d="M128 146 123 104" stroke="#12B89A" stroke-width="7"/>
    <path d="M128 146 131 88" stroke="#12B89A" stroke-width="4.5"/>
  </g>
  <path d="M128 146 123 104" stroke="#0B1220" stroke-width="4.5"/>
  <path d="M128 146 131 88" stroke="#0B1220" stroke-width="2.6"/>
  <circle cx="128" cy="146" r="7" fill="url(#brass)" stroke="${K}" stroke-width="3"/>
  <path d="M86 108a62 62 0 0 1 60-24c-28 4-48 20-60 46Z" fill="#fff" opacity=".5"/>
  <path d="${arc(128, 146, 85, 200, 280)}" fill="none" stroke="#FFFBEA" stroke-width="4" opacity=".8"/>
  <path d="${arc(128, 146, 85, 15, 85)}" fill="none" stroke="#5EF2D6" stroke-width="3.5" opacity=".85"/>
</g>`);

// ---------- premiums ----------
const pigeon = svg(S, S, `
${aura('tealAura', 122)}
<g filter="url(#shadow)">
  <path d="M70 168c-18 8-36 26-46 50 14-2 24-8 32-16-2 12-2 22 2 32 10-14 20-28 34-40Z" fill="#3FA9A2" stroke="${K}" stroke-width="5" opacity=".92"/>
  <path d="M40 206c8-10 18-20 30-28M58 226c4-14 12-26 22-36" stroke="#C7FFF1" stroke-width="3" opacity=".6" fill="none"/>
  <path d="M62 150c-6-44 26-78 70-76 8-26 34-42 58-34 22 8 30 34 16 56 12 40-8 92-56 100-44 8-80-12-88-46Z" fill="url(#ghostSkin)" stroke="${K}" stroke-width="5"/>
  <path d="M132 74c8-26 34-42 58-34 22 8 30 34 16 56-22 14-56 6-74-22Z" fill="#D9FBF4"/>
  <path d="M134 80c10 30 44 44 72 20 2 12 0 22-4 34-30 10-64-8-76-40Z" fill="#6C5A9C" opacity=".85"/>
  <path d="M138 96c14 22 40 30 64 16" fill="none" stroke="#8DFFB5" stroke-width="5" opacity=".8"/>
  <path d="M76 130c20-22 56-22 82 0 14 14 14 40-4 56-28 16-60 6-78-18-6-12-6-26 0-38Z" fill="#4CB7AE" stroke="${K}" stroke-width="5"/>
  <path d="M88 142c18-8 40-6 56 6M84 160c20-6 42-2 58 10M92 178c16-2 30 2 42 10" fill="none" stroke="#12525A" stroke-width="4" opacity=".7"/>
  <path d="M84 132c18-14 44-14 64-2" fill="none" stroke="#EFFFFA" stroke-width="3.5" opacity=".7"/>
  <path d="M208 66 240 78 210 90Z" fill="#F0B45E" stroke="${K}" stroke-width="4.5"/>
  <path d="M210 70 228 77" stroke="#FFF0BE" stroke-width="2.5"/>
  <circle cx="186" cy="64" r="20" fill="url(#tealGlow)"/>
  <circle cx="186" cy="64" r="11" fill="#0B1220" stroke="${K}" stroke-width="2"/>
  <circle cx="186" cy="64" r="7" fill="#5EF2D6" filter="url(#glowS)"/>
  <circle cx="183" cy="61" r="3" fill="#fff"/>
  <path d="M150 52c10-12 26-16 40-12" fill="none" stroke="#fff" stroke-width="4" opacity=".75"/>
  <path d="M116 216c-4 10-2 18 4 24M142 220c-2 8 2 16 8 20" fill="none" stroke="#5EF2D6" stroke-width="5" opacity=".7"/>
  <path d="M206 100c10 38-8 86-54 96" fill="none" stroke="#5EF2D6" stroke-width="3.5" opacity=".9"/>
</g>
${sparkle(46, 60, 12)}${sparkle(224, 190, 9, '#C7FFF1')}${sparkle(74, 34, 6, '#C7FFF1')}`);

const passenger = svg(S, S, `
${aura('tealAura', 124)}
<g filter="url(#shadow)">
  <path d="M30 256c0-58 34-92 98-92s98 34 98 92Z" fill="#4B3C66" stroke="${K}" stroke-width="5"/>
  <path d="M30 256c0-58 34-92 98-92v92Z" fill="#6A568F" opacity=".55"/>
  <path d="M128 172 96 164 76 256h36ZM128 172l32-8 20 92h-36Z" fill="#2E2542" stroke="${K}" stroke-width="4.5"/>
  <path d="M108 180h40l-8 76h-24Z" fill="#E9F7F2" stroke="${K}" stroke-width="4"/>
  <path d="M128 186 118 200l10 44 10-44Z" fill="#C94B4B" stroke="${K}" stroke-width="3.5"/>
  <circle cx="94" cy="224" r="6" fill="url(#brass)" stroke="${K}" stroke-width="2.5"/>
  <circle cx="162" cy="224" r="6" fill="url(#brass)" stroke="${K}" stroke-width="2.5"/>
  <path d="M78 104c0-34 22-52 50-52s50 18 50 52c0 40-20 70-50 70s-50-30-50-70Z" fill="url(#ghostSkin)" stroke="${K}" stroke-width="5"/>
  <path d="M128 52c28 0 50 18 50 52 0 40-20 70-50 70 22-20 30-70 0-122Z" fill="#58AFA9" opacity=".5"/>
  <ellipse cx="106" cy="112" rx="18" ry="20" fill="url(#tealGlow)"/>
  <ellipse cx="150" cy="112" rx="18" ry="20" fill="url(#tealGlow)"/>
  <ellipse cx="106" cy="112" rx="11" ry="13" fill="#0B1220" stroke="${K}" stroke-width="2"/>
  <ellipse cx="150" cy="112" rx="11" ry="13" fill="#0B1220" stroke="${K}" stroke-width="2"/>
  <ellipse cx="107" cy="113" rx="6" ry="8" fill="#5EF2D6" filter="url(#glowS)"/>
  <ellipse cx="151" cy="113" rx="6" ry="8" fill="#5EF2D6" filter="url(#glowS)"/>
  <circle cx="104" cy="109" r="2.6" fill="#fff"/><circle cx="148" cy="109" r="2.6" fill="#fff"/>
  <path d="M90 92c8-8 20-10 30-4M136 88c10-6 22-4 30 4" fill="none" stroke="#1B3B45" stroke-width="5"/>
  <path d="M128 118v16l-6 4" fill="none" stroke="#2D7C7C" stroke-width="4"/>
  <path d="M100 146c8-10 20-10 28-2 8-8 20-8 28 2-8 6-18 6-28 0-10 6-20 6-28 0Z" fill="#1B2A3F" stroke="${K}" stroke-width="3"/>
  <path d="M112 158c10 6 22 6 32 0" fill="none" stroke="#1B3B45" stroke-width="4"/>
  <path d="M58 78c0-40 30-62 70-62s70 22 70 62Z" fill="url(#coat)" stroke="${K}" stroke-width="5"/>
  <path d="M38 78h180a8 8 0 0 1 0 16H38a8 8 0 0 1 0-16Z" fill="#1A1D2E" stroke="${K}" stroke-width="5"/>
  <path d="M60 64h136v14H60Z" fill="url(#brassH)" stroke="${K}" stroke-width="4"/>
  <path d="M76 44c10-14 28-22 48-22" fill="none" stroke="#8A93B8" stroke-width="5" opacity=".7"/>
  <path d="M178 104c0 40-20 70-50 70" fill="none" stroke="#5EF2D6" stroke-width="3.5" opacity=".9"/>
  <path d="M222 220c2-20-6-36-22-46" fill="none" stroke="#5EF2D6" stroke-width="3.5" opacity=".8"/>
</g>`);

const ratking = svg(S, S, `
${aura('amberAura', 124)}
<g filter="url(#shadow)">
  <path d="M26 256c4-44 30-72 102-72s98 28 102 72Z" fill="#A53A3A" stroke="${K}" stroke-width="5"/>
  <path d="M26 256c4-44 30-72 102-72v72Z" fill="#D25C5C" opacity=".5"/>
  <path d="M52 196c22-18 48-24 76-24s54 6 76 24c-6 16-12 24-18 30-18-10-38-14-58-14s-40 4-58 14c-6-6-12-14-18-30Z" fill="#F7F3E8" stroke="${K}" stroke-width="5"/>
  <g fill="${K}"><ellipse cx="78" cy="200" rx="4" ry="6"/><ellipse cx="108" cy="192" rx="4" ry="6"/><ellipse cx="148" cy="192" rx="4" ry="6"/><ellipse cx="178" cy="200" rx="4" ry="6"/><ellipse cx="128" cy="198" rx="4" ry="6"/></g>
  <circle cx="58" cy="92" r="38" fill="#7C8291" stroke="${K}" stroke-width="5"/>
  <circle cx="198" cy="92" r="38" fill="#7C8291" stroke="${K}" stroke-width="5"/>
  <circle cx="60" cy="94" r="24" fill="#E7A0A8"/><circle cx="196" cy="94" r="24" fill="#E7A0A8"/>
  <path d="M46 86c4-12 14-18 26-16M184 70c12-2 22 4 26 16" fill="none" stroke="#FBD3D6" stroke-width="4" opacity=".8"/>
  <path d="M68 124c0-38 26-58 60-58s60 20 60 58c0 26-12 42-28 54-10 8-20 14-32 14s-22-6-32-14c-16-12-28-28-28-54Z" fill="#8E95A4" stroke="${K}" stroke-width="5"/>
  <path d="M128 66c34 0 60 20 60 58 0 26-12 42-28 54-10 8-20 14-32 14 30-30 34-80 0-126Z" fill="#5A606D" opacity=".55"/>
  <path d="M96 158c0-18 14-28 32-28s32 10 32 28-14 30-32 30-32-12-32-30Z" fill="#D9DDE6" stroke="${K}" stroke-width="4.5"/>
  <path d="M114 138c4-8 24-8 28 0 0 8-8 14-14 14s-14-6-14-14Z" fill="#E7808C" stroke="${K}" stroke-width="4"/>
  <path d="M120 140c2-2 6-3 10-2" stroke="#fff" stroke-width="2.5" fill="none" opacity=".8"/>
  <path d="M128 152v10M128 162c-8 8-18 6-22-2M128 162c8 8 18 6 22-2" fill="none" stroke="${K}" stroke-width="4"/>
  <path d="M120 166h16v16a3 3 0 0 1-3 3h-10a3 3 0 0 1-3-3Z" fill="#FFFBEA" stroke="${K}" stroke-width="3.5"/>
  <path d="M128 166v18" stroke="${K}" stroke-width="2.5"/>
  <ellipse cx="102" cy="112" rx="15" ry="16" fill="url(#amberGlow)"/>
  <ellipse cx="154" cy="112" rx="15" ry="16" fill="url(#amberGlow)"/>
  <ellipse cx="102" cy="112" rx="10" ry="11" fill="#0B1220" stroke="${K}" stroke-width="2"/>
  <ellipse cx="154" cy="112" rx="10" ry="11" fill="#0B1220" stroke="${K}" stroke-width="2"/>
  <circle cx="103" cy="113" r="6" fill="#F0B45E" filter="url(#glowS)"/><circle cx="155" cy="113" r="6" fill="#F0B45E" filter="url(#glowS)"/>
  <circle cx="100" cy="109" r="2.6" fill="#fff"/><circle cx="152" cy="109" r="2.6" fill="#fff"/>
  <path d="M84 100c10-10 24-10 32-2M140 98c8-8 22-8 32 2" fill="none" stroke="${K}" stroke-width="6"/>
  <path d="M94 156 44 146M94 164 46 170M162 156l50-10M162 164l48 6" stroke="#EDEFF4" stroke-width="2.6" opacity=".9"/>
  <path d="M74 70 62 18l30 26 18-34 18 32 18-32 18 34 30-26-12 52Z" fill="url(#brass)" stroke="${K}" stroke-width="5"/>
  <path d="M72 58h112l-3 14H75Z" fill="url(#brassH)" stroke="${K}" stroke-width="4"/>
  <circle cx="128" cy="50" r="9" fill="#5EF2D6" stroke="${K}" stroke-width="3" filter="url(#glowS)"/>
  <circle cx="96" cy="54" r="6" fill="#C94B4B" stroke="${K}" stroke-width="3"/><circle cx="160" cy="54" r="6" fill="#C94B4B" stroke="${K}" stroke-width="3"/>
  <circle cx="62" cy="18" r="6" fill="url(#brass)" stroke="${K}" stroke-width="3"/><circle cx="194" cy="18" r="6" fill="url(#brass)" stroke="${K}" stroke-width="3"/>
  <circle cx="110" cy="10" r="6" fill="url(#brass)" stroke="${K}" stroke-width="3"/><circle cx="146" cy="10" r="6" fill="url(#brass)" stroke="${K}" stroke-width="3"/>
  <path d="M68 26 86 44M112 18l12 22" stroke="#FFFBEA" stroke-width="3" opacity=".8"/>
  <circle cx="125" cy="47" r="3" fill="#fff"/>
  <path d="M188 124c0 26-12 42-28 54" fill="none" stroke="#5EF2D6" stroke-width="3.5" opacity=".85"/>
</g>`);

// ---------- specials ----------
const gravesBust = `
  <path d="M44 214c6-38 34-54 84-54s78 16 84 54Z" fill="url(#coat)" stroke="${K}" stroke-width="5"/>
  <path d="M128 164 104 160 92 214h30ZM128 164l24-4 12 54h-30Z" fill="#151827" stroke="${K}" stroke-width="4"/>
  <path d="M114 170h28l-6 44h-16Z" fill="#E9F7F2" stroke="${K}" stroke-width="3.5"/>
  <path d="M128 174l-7 10 7 30 7-30Z" fill="#5E4B7A" stroke="${K}" stroke-width="3"/>
  <circle cx="84" cy="196" r="5" fill="url(#brass)" stroke="${K}" stroke-width="2.5"/><circle cx="172" cy="196" r="5" fill="url(#brass)" stroke="${K}" stroke-width="2.5"/>
  <path d="M60 190c-6-10-4-20 6-24M196 190c6-10 4-20-6-24" fill="none" stroke="url(#brassV)" stroke-width="6"/>
  <path d="M88 96c0-30 16-46 40-46s40 16 40 46c0 22-6 40-14 54-6 12-14 20-26 20s-20-8-26-20c-8-14-14-32-14-54Z" fill="url(#ghostSkin)" stroke="${K}" stroke-width="5"/>
  <path d="M128 50c24 0 40 16 40 46 0 22-6 40-14 54-6 12-14 20-26 20 20-28 22-76 0-120Z" fill="#4FA7A2" opacity=".5"/>
  <ellipse cx="110" cy="104" rx="16" ry="14" fill="url(#tealGlow)"/><ellipse cx="148" cy="104" rx="16" ry="14" fill="url(#tealGlow)"/>
  <path d="M98 106c4-10 20-10 24 0-4 8-20 8-24 0ZM136 106c4-10 20-10 24 0-4 8-20 8-24 0Z" fill="#0B1220" stroke="${K}" stroke-width="2"/>
  <ellipse cx="110" cy="106" rx="6" ry="5.5" fill="#5EF2D6" filter="url(#glowS)"/><ellipse cx="148" cy="106" rx="6" ry="5.5" fill="#5EF2D6" filter="url(#glowS)"/>
  <circle cx="108" cy="104" r="2" fill="#fff"/><circle cx="146" cy="104" r="2" fill="#fff"/>
  <path d="M94 92c8-8 18-8 28-2M134 84c10-6 20-4 28 6" fill="none" stroke="#0E2A33" stroke-width="5.5"/>
  <path d="M128 110v16l-5 4" fill="none" stroke="#2D7C7C" stroke-width="3.5"/>
  <path d="M104 140c14 14 38 12 50-6-2 16-12 24-24 24s-22-6-26-18Z" fill="#0B1220" stroke="${K}" stroke-width="3.5"/>
  <path d="M110 144c12 6 26 4 38-6l-2 8c-10 6-22 8-34 4Z" fill="#F4FFFC"/>
  <path d="M118 147v6M127 147v7M136 145v7" stroke="#0B1220" stroke-width="1.6"/>
  <g transform="rotate(-9 128 60)">
    <path d="M76 60c2-30 22-44 52-44s50 14 52 44Z" fill="url(#coat)" stroke="${K}" stroke-width="5"/>
    <path d="M74 52h108v14H74Z" fill="url(#brassH)" stroke="${K}" stroke-width="4"/>
    <path d="M58 66h124c22 0 34 6 40 14-30 4-90 6-160 2a8 8 0 0 1-4-16Z" fill="#12141F" stroke="${K}" stroke-width="5"/>
    <path d="M128 24l12 8v12l-12 8-12-8V32Z" fill="url(#brass)" stroke="${K}" stroke-width="3.5"/>
    <circle cx="128" cy="38" r="5" fill="#5EF2D6" filter="url(#glowS)"/>
    <path d="M88 40c6-10 16-16 28-18" fill="none" stroke="#8A93B8" stroke-width="4" opacity=".7"/>
  </g>
  <path d="M168 96c0 22-6 40-14 54" fill="none" stroke="#5EF2D6" stroke-width="3.5" opacity=".9"/>`;

const plate = (label, y = 208, w = 150, size = 46) => `
  <g filter="url(#shadow)">
    <rect x="${128 - w / 2}" y="${y}" width="${w}" height="40" rx="9" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
    <rect x="${128 - w / 2 + 6}" y="${y + 6}" width="${w - 12}" height="28" rx="5" fill="#111827" stroke="#5A4119" stroke-width="2"/>
    <text x="128" y="${y + 33}" font-size="${size * 0.72}" text-anchor="middle" fill="#5EF2D6" letter-spacing="3" filter="url(#glow)">${label}</text>
    <text x="128" y="${y + 33}" font-size="${size * 0.72}" text-anchor="middle" fill="#F2FFFB" letter-spacing="3">${label}</text>
    <circle cx="${128 - w / 2 + 3}" cy="${y + 20}" r="0"/>
  </g>`;

const wild = svg(S, S, `
${aura('tealAura', 128)}
<g filter="url(#shadow)">
  <rect x="22" y="14" width="212" height="214" rx="26" fill="url(#brass)" stroke="${K}" stroke-width="5"/>
  <rect x="36" y="28" width="184" height="186" rx="16" fill="#0B1220" stroke="${K}" stroke-width="4"/>
  <rect x="36" y="28" width="184" height="186" rx="16" fill="url(#tealAura)"/>
  <rect x="29" y="21" width="198" height="200" rx="21" fill="none" stroke="#FFF0BE" stroke-width="1.8" opacity=".6"/>
  ${[[36, 28], [220, 28], [36, 214], [220, 214]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#brass)" stroke="${K}" stroke-width="3"/><circle cx="${x - 2}" cy="${y - 2}" r="2" fill="#FFFBEA"/>`).join('')}
</g>
<g clip-path="url(#wildClip)">${gravesBust}</g>
<rect x="36" y="28" width="184" height="186" rx="16" fill="none" stroke="#5EF2D6" stroke-width="2.5" opacity=".8" filter="url(#glowS)"/>
${plate('WILD', 204, 156, 50)}
${sparkle(48, 44, 9)}${sparkle(214, 150, 7, '#C7FFF1')}`,
`<clipPath id="wildClip"><rect x="38" y="16" width="180" height="196" rx="14"/></clipPath>`);

const scatter = svg(S, S, `
${aura('greenAura', 128)}
<g filter="url(#shadow)">
  <circle cx="128" cy="116" r="104" fill="url(#brass)" stroke="${K}" stroke-width="5"/>
  <circle cx="128" cy="116" r="90" fill="#070B14" stroke="${K}" stroke-width="4"/>
  <circle cx="128" cy="116" r="97" fill="none" stroke="#FFF0BE" stroke-width="1.8" opacity=".6"/>
  ${ring(128, 116, 97, 16, (x, y) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#5A4119"/><circle cx="${x - 0.8}" cy="${y - 0.8}" r="1.2" fill="#FFF0BE"/>`)}
</g>
<g clip-path="url(#scClip)">
  <circle cx="128" cy="116" r="90" fill="url(#greenAura)"/>
  <path d="M40 220 110 150M216 220 146 150" stroke="#39445E" stroke-width="5"/>
  <ellipse cx="128" cy="96" rx="110" ry="70" fill="url(#tealAura)"/>
  <path d="M66 210V92c0-34 28-56 62-56s62 22 62 56v118Z" fill="url(#navyV)" stroke="${K}" stroke-width="5"/>
  <path d="M128 36c34 0 62 22 62 56v118h-30c10-60 4-130-32-174Z" fill="#070B14" opacity=".45"/>
  <path d="M74 96c0-28 24-46 54-46s54 18 54 46v6H74Z" fill="#1C2842" stroke="${K}" stroke-width="4"/>
  <path d="M82 124h38v34H82ZM136 124h38v34h-38Z" fill="#5EF2D6" stroke="${K}" stroke-width="4" filter="url(#glowS)"/>
  <path d="M86 128h30v10H86ZM140 128h30v10h-30Z" fill="#F2FFFB" opacity=".75"/>
  <circle cx="128" cy="84" r="44" fill="url(#tealGlow)"/>
  <circle cx="128" cy="84" r="22" fill="url(#brass)" stroke="${K}" stroke-width="4"/>
  <circle cx="128" cy="84" r="15" fill="#F2FFFB" filter="url(#glow)"/>
  <path d="M60 172h136v14H60Z" fill="url(#brassH)" stroke="${K}" stroke-width="4"/>
  <circle cx="84" cy="198" r="7" fill="#C94B4B" stroke="${K}" stroke-width="3" filter="url(#glowS)"/>
  <circle cx="172" cy="198" r="7" fill="#C94B4B" stroke="${K}" stroke-width="3" filter="url(#glowS)"/>
  <path d="M76 96c2-22 18-36 40-42" fill="none" stroke="#8FB0E0" stroke-width="4" opacity=".6"/>
  <path d="M128 84 30 40M128 84 226 40M128 84 20 96M128 84l108 12" stroke="#C7FFF1" stroke-width="5" opacity=".28"/>
</g>
<circle cx="128" cy="116" r="90" fill="none" stroke="#8DFFB5" stroke-width="2.5" opacity=".8" filter="url(#glowS)"/>
${plate('BONUS', 204, 170, 50)}
${sparkle(40, 48, 10)}${sparkle(222, 60, 7, '#C7FFF1')}`,
`<clipPath id="scClip"><circle cx="128" cy="116" r="88"/></clipPath>`);

const sign = svg(S, S, `
${aura('tealAura', 128)}
<g fill="none" stroke="${K}" stroke-width="9"><path d="M70 8V66M186 8V66"/></g>
<g fill="none" stroke="url(#brassV)" stroke-width="5" stroke-dasharray="9 5"><path d="M70 8V66M186 8V66"/></g>
<g filter="url(#shadow)">
  <rect x="18" y="62" width="220" height="150" rx="20" fill="url(#brass)" stroke="${K}" stroke-width="5"/>
  <rect x="32" y="76" width="192" height="122" rx="11" fill="url(#navyV)" stroke="${K}" stroke-width="4"/>
  <rect x="32" y="76" width="192" height="122" rx="11" fill="url(#tealAura)" opacity=".8"/>
  <rect x="25" y="69" width="206" height="136" rx="16" fill="none" stroke="#FFF0BE" stroke-width="1.8" opacity=".6"/>
  ${[[32, 76], [224, 76], [32, 198], [224, 198]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="url(#brass)" stroke="${K}" stroke-width="3"/>`).join('')}
  <text x="128" y="112" font-size="34" text-anchor="middle" fill="#F0B45E" letter-spacing="5">PLATFORM</text>
  <path d="M48 122H208" stroke="#B78B3E" stroke-width="2.5"/>
  <g filter="url(#glow)"><text x="128" y="188" font-size="84" text-anchor="middle" fill="#5EF2D6" letter-spacing="2">13</text></g>
  <text x="128" y="188" font-size="84" text-anchor="middle" fill="#F2FFFB" letter-spacing="2">13</text>
  <g filter="url(#glowS)" fill="#5EF2D6">
    <path d="M46 160 66 144v10h18v12H66v10Z"/><path d="M210 160 190 144v10h-18v12h18v10Z"/>
  </g>
  <path d="M40 84 78 82 58 100 70 118" fill="none" stroke="#0B0F1A" stroke-width="2.2" opacity=".8"/>
  <path d="M26 74h200" stroke="#FFFBEA" stroke-width="3" opacity=".7"/>
  <path d="M234 100v96a14 14 0 0 1-14 14H120" fill="none" stroke="#5EF2D6" stroke-width="3" opacity=".85"/>
</g>
<path d="M60 222c6 10 2 18-4 24M128 220c-4 10 0 20 6 26M194 222c-6 8-4 16 4 22" fill="none" stroke="#5EF2D6" stroke-width="5" opacity=".55"/>
${sparkle(30, 48, 9)}${sparkle(230, 232, 8, '#C7FFF1')}`);

const punch = svg(S, S, `
${aura('tealAura', 128)}
<g transform="rotate(-38 128 128)" filter="url(#shadow)">
  <path d="M96 112C60 100 30 100 6 110c-6 3-6 13 0 15 26 4 56 4 90-1Z" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
  <path d="M96 146C60 160 30 164 8 160c-8-2-9-12-2-15 26-10 58-12 90-9Z" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
  <path d="M14 114c24-6 50-6 76 0" fill="none" stroke="#FFFBEA" stroke-width="3" opacity=".7"/>
  <path d="M88 100h96c20 0 36 8 44 22l-22 6c-4-6-12-10-22-10h-22v20h22c10 0 18-4 22-10l22 6c-8 16-24 24-44 24H88Z" fill="url(#brass)" stroke="${K}" stroke-width="5"/>
  <rect x="150" y="108" width="20" height="44" rx="4" fill="url(#steel)" stroke="${K}" stroke-width="4"/>
  <circle cx="110" cy="129" r="13" fill="url(#steel)" stroke="${K}" stroke-width="4.5"/>
  <circle cx="110" cy="129" r="4.5" fill="${K}"/>
  <path d="M92 106h90c14 0 26 4 34 12" fill="none" stroke="#FFFBEA" stroke-width="3" opacity=".7"/>
  <circle cx="222" cy="129" r="26" fill="url(#tealGlow)"/>
  <path d="${star(222, 129, 15, 5, 6)}" fill="#F2FFFB" filter="url(#glow)"/>
  <path d="M96 158h88c14 0 28-4 38-14" fill="none" stroke="#5EF2D6" stroke-width="3" opacity=".85"/>
</g>
<g filter="url(#glowS)">
  <circle cx="214" cy="118" r="7" fill="#F0B45E" stroke="${K}" stroke-width="2.5"/>
  <circle cx="236" cy="82" r="5" fill="#FFF1CC" stroke="${K}" stroke-width="2.5"/>
  <circle cx="196" cy="34" r="5" fill="#F0B45E" stroke="${K}" stroke-width="2.5"/>
</g>
${sparkle(232, 40, 13)}${sparkle(178, 20, 7, '#C7FFF1')}${sparkle(240, 120, 6, '#C7FFF1')}`);

const all = { token, ticket, lantern, key, watch, pigeon, passenger, ratking, wild, scatter, sign, punch };
export const SYMBOL_SVG = all;
export const GRAVES_BUST = gravesBust;
export default Object.entries(all).map(([name, s]) => ({ name: `symbols/${name}.png`, w: S, h: S, svg: s }));
