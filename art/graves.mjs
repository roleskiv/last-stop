// Conductor Graves, drawn as separate rig parts on a shared 640 x 960 canvas.
// Each part is exported cropped; the crop origin is stored in the manifest so the client
// can reassemble and animate the character.
import { K, sparkle, star, svg } from './lib.mjs';

const W = 640, H = 960;

const extra = `
<linearGradient id="tailFade" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#232842"/><stop offset=".32" stop-color="#27456A"/>
  <stop offset=".62" stop-color="#3FA9A2" stop-opacity=".8"/><stop offset="1" stop-color="#5EF2D6" stop-opacity="0"/>
</linearGradient>
<linearGradient id="tailLine" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${K}"/><stop offset=".5" stop-color="${K}" stop-opacity=".5"/><stop offset=".8" stop-color="#5EF2D6" stop-opacity="0"/>
</linearGradient>
<linearGradient id="glove" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#C7FFF1"/><stop offset="1" stop-color="#5EC9BE"/>
</linearGradient>
<linearGradient id="sleeve" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#3A4160"/><stop offset=".6" stop-color="#1F2439"/><stop offset="1" stop-color="#11131F"/>
</linearGradient>`;

const tail = `
<g>
  <path d="M236 560C216 640 250 700 224 770C206 818 150 836 120 880C160 876 196 860 222 834C214 870 190 900 160 930C220 916 262 880 280 830C292 868 286 900 268 936C322 908 350 860 352 800C372 836 372 872 360 900C404 872 424 820 412 760C400 690 426 640 404 560Z" fill="url(#tailFade)" stroke="url(#tailLine)" stroke-width="6"/>
  <path d="M276 580C262 660 286 720 268 790M330 580C338 660 320 720 334 800M380 590C386 650 372 700 384 760" fill="none" stroke="#5EF2D6" stroke-width="4" opacity=".28"/>
  <path d="M404 600C416 660 398 700 412 760" fill="none" stroke="#5EF2D6" stroke-width="5" opacity=".7"/>
  <path d="M250 596C240 650 256 700 242 750" fill="none" stroke="#8A93B8" stroke-width="5" opacity=".5"/>
</g>`;

const buttons = [[282, 400], [358, 400], [286, 452], [354, 452], [290, 504], [350, 504]];
const body = `
<g>
  <path d="M320 286c-16 0-28 8-30 26h60c-2-18-14-26-30-26Z" fill="#DDF6F0" stroke="${K}" stroke-width="5"/>
  <path d="M204 348C214 320 250 306 290 304L320 330L350 304C390 306 426 320 436 348C442 420 404 480 398 546C396 572 402 590 410 606H230C238 590 244 572 242 546C236 480 198 420 204 348Z" fill="url(#coat)" stroke="${K}" stroke-width="6"/>
  <path d="M350 304C390 306 426 320 436 348C442 420 404 480 398 546C396 572 402 590 410 606H336C352 500 360 400 350 304Z" fill="#0B0D16" opacity=".42"/>
  <path d="M292 304 320 392 348 304 334 296H306Z" fill="#EAF8F4" stroke="${K}" stroke-width="5"/>
  <path d="M320 318l-12 14 12 54 12-54Z" fill="#5E4B7A" stroke="${K}" stroke-width="4"/>
  <path d="M312 318h16l-4 10h-8Z" fill="#7B66A0" stroke="${K}" stroke-width="3.5"/>
  <path d="M290 304 320 392 300 420 262 330Z" fill="#161A2B" stroke="${K}" stroke-width="5"/>
  <path d="M350 304 320 392 340 420 378 330Z" fill="#12141F" stroke="${K}" stroke-width="5"/>
  <path d="M300 420C296 480 300 540 306 606M340 420C344 480 340 540 334 606" fill="none" stroke="url(#brassV)" stroke-width="5"/>
  ${buttons.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="url(#brass)" stroke="${K}" stroke-width="4"/><circle cx="${x - 3}" cy="${y - 3}" r="3" fill="#FFFBEA" opacity=".9"/>`).join('')}
  <path d="M196 344c8-22 40-34 76-38l-6 22c-28 4-50 12-62 26Z" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
  <path d="M444 344c-8-22-40-34-76-38l6 22c28 4 50 12 62 26Z" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
  <path d="M206 338c12-12 34-20 60-24M434 338c-12-12-34-20-60-24" fill="none" stroke="#FFFBEA" stroke-width="3" opacity=".7"/>
  <path d="M236 548h168v22H236Z" fill="#0E1019" stroke="${K}" stroke-width="5"/>
  <rect x="302" y="544" width="36" height="30" rx="6" fill="url(#brass)" stroke="${K}" stroke-width="4.5"/>
  <rect x="311" y="552" width="18" height="14" rx="3" fill="#0E1019"/>
  <path d="M354 452C370 500 392 520 400 500" fill="none" stroke="${K}" stroke-width="8"/>
  <path d="M354 452C370 500 392 520 400 500" fill="none" stroke="url(#brassV)" stroke-width="4" stroke-dasharray="7 4"/>
  <circle cx="398" cy="512" r="22" fill="url(#tealAura)"/>
  <circle cx="398" cy="512" r="15" fill="url(#brass)" stroke="${K}" stroke-width="4"/>
  <circle cx="398" cy="512" r="9.5" fill="#FFF6DC" stroke="${K}" stroke-width="2"/>
  <path d="M398 512v-7M398 512l1-5" stroke="#12B89A" stroke-width="2.4" filter="url(#glowS)"/>
  <path d="M214 352C208 420 244 480 246 546" fill="none" stroke="#8A93B8" stroke-width="5" opacity=".55"/>
  <path d="M434 356C438 420 404 480 400 546" fill="none" stroke="#5EF2D6" stroke-width="5" opacity=".8"/>
</g>`;

// Viewer's right arm: extended toward the reels, palm open.
const armR = `
<g>
  <path d="M404 322C438 318 468 340 486 378C500 406 520 424 548 420L556 462C512 476 474 458 452 420C440 398 420 376 398 372Z" fill="url(#sleeve)" stroke="${K}" stroke-width="6"/>
  <path d="M412 330C440 330 462 348 478 380" fill="none" stroke="#8A93B8" stroke-width="5" opacity=".55"/>
  <path d="M538 414 562 408 572 464 548 470Z" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
  <circle cx="600" cy="424" r="50" fill="url(#tealAura)"/>
  <path d="M566 410C580 398 600 396 612 402C624 394 636 398 634 408C628 418 616 420 606 424C620 426 632 430 636 438C632 446 618 444 604 442C614 448 622 454 620 462C612 466 600 460 590 454C594 462 594 470 588 472C580 470 576 460 572 450Z" fill="url(#glove)" stroke="${K}" stroke-width="5"/>
  <path d="M574 414C584 406 596 404 606 406" fill="none" stroke="#fff" stroke-width="4"/>
  <path d="M560 468C520 480 480 462 458 426" fill="none" stroke="#5EF2D6" stroke-width="5" opacity=".8"/>
</g>`;

// Viewer's left arm: bent, holding the oversized ticket punch.
const armL = `
<g>
  <path d="M236 322C202 318 170 344 156 386C146 420 152 452 176 470L212 444C198 434 196 416 202 398C210 378 226 372 244 372Z" fill="url(#sleeve)" stroke="${K}" stroke-width="6"/>
  <path d="M228 330C200 332 178 352 166 386" fill="none" stroke="#8A93B8" stroke-width="5" opacity=".55"/>
  <path d="M168 462 206 434 222 456 184 484Z" fill="url(#brassV)" stroke="${K}" stroke-width="5"/>
  <g transform="translate(198 462) rotate(-115) translate(-160 -488)">
    <circle cx="330" cy="486" r="56" fill="url(#tealAura)"/>
    <path d="M214 470C176 458 140 458 112 468c-7 3-7 14 0 17 30 4 64 4 102-1Z" fill="url(#brassV)" stroke="${K}" stroke-width="5.5"/>
    <path d="M214 506C176 522 140 526 114 522c-9-2-10-14-2-17 30-12 66-14 102-11Z" fill="url(#brassV)" stroke="${K}" stroke-width="5.5"/>
    <path d="M206 456h104c22 0 40 9 48 25l-24 7c-5-7-13-11-24-11h-24v22h24c11 0 19-4 24-11l24 7c-8 17-26 26-48 26H206Z" fill="url(#brass)" stroke="${K}" stroke-width="5.5"/>
    <rect x="272" y="465" width="22" height="48" rx="4" fill="url(#steel)" stroke="${K}" stroke-width="4.5"/>
    <circle cx="230" cy="488" r="14" fill="url(#steel)" stroke="${K}" stroke-width="5"/>
    <circle cx="230" cy="488" r="5" fill="${K}"/>
    <path d="M210 462h98c16 0 28 4 38 14" fill="none" stroke="#FFFBEA" stroke-width="3.5" opacity=".7"/>
    <path d="${star(352, 488, 16, 5, 6)}" fill="#F2FFFB" filter="url(#glow)"/>
  </g>
  <path d="M176 440C190 428 208 430 220 440C232 452 230 472 218 482C204 492 186 490 176 478C168 466 168 450 176 440Z" fill="url(#glove)" stroke="${K}" stroke-width="5"/>
  <path d="M184 446c10-6 20-4 28 2M182 458c10-4 22-2 32 4M186 472c8-2 18 0 26 4" fill="none" stroke="#3E8F8A" stroke-width="3.5"/>
</g>
${sparkle(96, 262, 13)}${sparkle(150, 250, 7, '#C7FFF1')}${sparkle(84, 316, 6, '#C7FFF1')}`;

const head = `
<g>
  <path d="M252 188C250 130 280 100 320 100C360 100 390 130 388 188C386 226 376 250 362 270C350 288 338 302 320 302C302 302 290 288 278 270C264 250 254 226 252 188Z" fill="url(#ghostSkin)" stroke="${K}" stroke-width="6"/>
  <path d="M320 100C360 100 390 130 388 188C386 226 376 250 362 270C350 288 338 302 320 302C352 250 356 170 320 100Z" fill="#4FA7A2" opacity=".5"/>
  <path d="M256 214c8 10 16 14 26 14M384 214c-8 10-16 14-26 14" fill="none" stroke="#3E8F8A" stroke-width="5" opacity=".7"/>
  <ellipse cx="290" cy="196" rx="28" ry="22" fill="url(#tealGlow)"/>
  <ellipse cx="350" cy="196" rx="28" ry="22" fill="url(#tealGlow)"/>
  <path d="M270 198C276 180 304 180 310 198C304 212 276 212 270 198Z" fill="#0B1220" stroke="${K}" stroke-width="3"/>
  <path d="M330 198C336 180 364 180 370 198C364 212 336 212 330 198Z" fill="#0B1220" stroke="${K}" stroke-width="3"/>
  <ellipse cx="291" cy="198" rx="10" ry="9" fill="#5EF2D6" filter="url(#glowS)"/>
  <ellipse cx="351" cy="198" rx="10" ry="9" fill="#5EF2D6" filter="url(#glowS)"/>
  <circle cx="288" cy="195" r="3.4" fill="#fff"/><circle cx="348" cy="195" r="3.4" fill="#fff"/>
  <path d="M320 204V236L310 244" fill="none" stroke="#2D7C7C" stroke-width="5"/>
  <path d="M260 176c2-12 6-20 12-26M380 176c-2-12-6-20-12-26" fill="none" stroke="#fff" stroke-width="4" opacity=".6"/>
  <path d="M388 188C386 226 376 250 362 270" fill="none" stroke="#5EF2D6" stroke-width="5" opacity=".9"/>
</g>`;

const brows = `
<g fill="none" stroke="#0E2A33" stroke-width="8">
  <path d="M264 176C278 162 296 162 312 172"/>
  <path d="M328 164C344 152 362 156 376 172"/>
</g>`;

const eyesClosed = `
<g>
  <path d="M268 198C274 178 306 178 312 198C306 214 274 214 268 198Z" fill="#BDEFE6" stroke="${K}" stroke-width="3"/>
  <path d="M328 198C334 178 366 178 372 198C366 214 334 214 328 198Z" fill="#9FDDD5" stroke="${K}" stroke-width="3"/>
  <path d="M272 202C282 210 298 210 308 202M332 202C342 210 358 210 368 202" fill="none" stroke="${K}" stroke-width="4"/>
</g>`;

const mouthSmirk = `
<g>
  <path d="M286 256C304 268 334 266 356 244" fill="none" stroke="${K}" stroke-width="7"/>
  <path d="M352 238c6 2 8 8 6 14" fill="none" stroke="${K}" stroke-width="5"/>
  <path d="M300 260c14 4 30 2 44-8" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/>
</g>`;

const mouthGrin = `
<g>
  <path d="M280 248C300 262 340 260 362 240C360 266 344 282 320 282C298 282 284 268 280 248Z" fill="#0B1220" stroke="${K}" stroke-width="5"/>
  <path d="M288 254C306 262 336 260 354 248L350 258C334 268 306 270 292 262Z" fill="#F4FFFC"/>
  <path d="M302 258v8M316 260v8M330 258v8M343 254v7" stroke="#0B1220" stroke-width="2"/>
  <path d="M362 234c6 2 8 8 6 14" fill="none" stroke="${K}" stroke-width="5"/>
</g>`;

const mouthLaugh = `
<g>
  <path d="M282 244C300 252 342 252 360 242C362 274 346 294 320 294C296 294 280 274 282 244Z" fill="#0B1220" stroke="${K}" stroke-width="5"/>
  <path d="M288 248C306 254 338 254 354 247L353 256C336 262 306 262 290 257Z" fill="#F4FFFC"/>
  <path d="M302 280C310 272 330 272 338 280C332 288 308 288 302 280Z" fill="#5EC9BE"/>
  <path d="M304 252v7M320 253v7M336 252v7" stroke="#0B1220" stroke-width="2"/>
</g>`;

const mouthOoh = `
<g>
  <ellipse cx="322" cy="262" rx="14" ry="18" fill="#0B1220" stroke="${K}" stroke-width="5"/>
  <ellipse cx="322" cy="270" rx="8" ry="7" fill="#5EC9BE"/>
</g>`;

const hat = `
<g transform="translate(0 -24) rotate(-10 320 120)">
  <path d="M246 132C240 76 268 44 322 44C376 44 404 76 398 132Z" fill="url(#coat)" stroke="${K}" stroke-width="6"/>
  <path d="M322 44C376 44 404 76 398 132H344C352 100 346 68 322 44Z" fill="#0B0D16" opacity=".4"/>
  <path d="M242 116H402V140H242Z" fill="url(#brassH)" stroke="${K}" stroke-width="5"/>
  <path d="M220 140H398C434 140 456 150 468 166C420 174 320 178 226 170A15 15 0 0 1 220 140Z" fill="#12141F" stroke="${K}" stroke-width="6"/>
  <path d="M250 152C310 158 380 158 440 156" fill="none" stroke="#8A93B8" stroke-width="4" opacity=".5"/>
  <path d="M322 60 344 74V98L322 112 300 98V74Z" fill="url(#brass)" stroke="${K}" stroke-width="5"/>
  <circle cx="322" cy="86" r="12" fill="url(#tealGlow)"/>
  <circle cx="322" cy="86" r="7" fill="#5EF2D6" filter="url(#glowS)"/>
  <path d="M262 84C272 64 290 54 310 52" fill="none" stroke="#8A93B8" stroke-width="5" opacity=".6"/>
  <path d="M248 122H396" stroke="#FFFBEA" stroke-width="3" opacity=".7"/>
</g>`;

const parts = {
  tail: { g: tail, crop: [90, 540, 360, 420] },
  body: { g: body, crop: [180, 270, 280, 350] },
  armR: { g: armR, crop: [380, 300, 260, 200] },
  armL: { g: armL, crop: [40, 220, 240, 320] },
  head: { g: head, crop: [230, 80, 180, 240] },
  brows: { g: brows, crop: [250, 140, 140, 50] },
  eyesClosed: { g: eyesClosed, crop: [256, 170, 128, 56] },
  mouthSmirk: { g: mouthSmirk, crop: [270, 224, 104, 60] },
  mouthGrin: { g: mouthGrin, crop: [266, 224, 112, 70] },
  mouthLaugh: { g: mouthLaugh, crop: [268, 230, 106, 76] },
  mouthOoh: { g: mouthOoh, crop: [296, 234, 52, 56] },
  hat: { g: hat, crop: [190, 0, 300, 180] },
};

const part = (g, [x, y, w, h]) =>
  svg(w, h, `<g transform="translate(${-x} ${-y})">${g}</g>`, extra);

const full = svg(W, H, `${tail}${body}${armR}${head}${brows}${mouthSmirk}${hat}${armL}`, extra);

export default [
  ...Object.entries(parts).map(([name, p]) => ({
    name: `graves/${name}.png`, w: p.crop[2], h: p.crop[3], svg: part(p.g, p.crop), meta: { x: p.crop[0], y: p.crop[1] }, sheetH: 200,
  })),
  { name: 'graves/preview.png', w: W, h: H, svg: full, sheetH: 760 },
];
