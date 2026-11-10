// Shared palette, gradients, filters and small path helpers for all LAST STOP vector art.
export const K = '#0A0D14'; // outline ink
export const C = {
  navy: '#141B2D', charcoal: '#1E1F26', smoke: '#0E1117',
  teal: '#5EF2D6', green: '#8DFFB5', ecto: '#C7FFF1',
  brass: '#B78B3E', gold: '#D7B15A', amber: '#F0B45E',
  purple: '#5E4B7A', tile: '#6B717D', red: '#C94B4B',
};

export const DEFS = `
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#FFF0BE"/><stop offset=".22" stop-color="#E6C36C"/>
  <stop offset=".55" stop-color="#B78B3E"/><stop offset=".82" stop-color="#7A5A26"/><stop offset="1" stop-color="#4A3516"/>
</linearGradient>
<linearGradient id="brassV" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#F8E2A0"/><stop offset=".35" stop-color="#D2A852"/>
  <stop offset=".7" stop-color="#93702F"/><stop offset="1" stop-color="#54401A"/>
</linearGradient>
<linearGradient id="brassH" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#7A5A26"/><stop offset=".3" stop-color="#E6C36C"/>
  <stop offset=".5" stop-color="#FFF0BE"/><stop offset=".72" stop-color="#B78B3E"/><stop offset="1" stop-color="#5A4119"/>
</linearGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#D5DBE6"/><stop offset=".3" stop-color="#939AA8"/>
  <stop offset=".65" stop-color="#5A606D"/><stop offset="1" stop-color="#2B2F39"/>
</linearGradient>
<linearGradient id="navyV" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#2A3757"/><stop offset=".5" stop-color="#172038"/><stop offset="1" stop-color="#0B0F1A"/>
</linearGradient>
<linearGradient id="coat" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#3A4160"/><stop offset=".45" stop-color="#232842"/><stop offset="1" stop-color="#11131F"/>
</linearGradient>
<linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#FFF1CC"/><stop offset=".5" stop-color="#EBCB8C"/><stop offset="1" stop-color="#B98F4C"/>
</linearGradient>
<linearGradient id="ghostSkin" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#F4FFFC"/><stop offset=".45" stop-color="#BDEFE6"/><stop offset="1" stop-color="#5FB3AE"/>
</linearGradient>
<radialGradient id="tealGlow">
  <stop offset="0" stop-color="#F2FFFB"/><stop offset=".25" stop-color="#C7FFF1"/>
  <stop offset=".55" stop-color="#5EF2D6" stop-opacity=".75"/><stop offset="1" stop-color="#5EF2D6" stop-opacity="0"/>
</radialGradient>
<radialGradient id="tealAura">
  <stop offset="0" stop-color="#5EF2D6" stop-opacity=".55"/><stop offset=".6" stop-color="#5EF2D6" stop-opacity=".16"/>
  <stop offset="1" stop-color="#5EF2D6" stop-opacity="0"/>
</radialGradient>
<radialGradient id="greenAura">
  <stop offset="0" stop-color="#8DFFB5" stop-opacity=".6"/><stop offset=".6" stop-color="#5EF2D6" stop-opacity=".18"/>
  <stop offset="1" stop-color="#5EF2D6" stop-opacity="0"/>
</radialGradient>
<radialGradient id="amberAura">
  <stop offset="0" stop-color="#F0B45E" stop-opacity=".5"/><stop offset=".6" stop-color="#F0B45E" stop-opacity=".14"/>
  <stop offset="1" stop-color="#F0B45E" stop-opacity="0"/>
</radialGradient>
<radialGradient id="amberGlow">
  <stop offset="0" stop-color="#FFFBEA"/><stop offset=".3" stop-color="#FFE2A0"/>
  <stop offset=".6" stop-color="#F0B45E" stop-opacity=".7"/><stop offset="1" stop-color="#F0B45E" stop-opacity="0"/>
</radialGradient>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
  <feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="glowS" x="-60%" y="-60%" width="220%" height="220%">
  <feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
<filter id="blur4" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
<filter id="blur10" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="blur24" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="24"/></filter>
<filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
  <feDropShadow dx="0" dy="7" stdDeviation="6" flood-color="#000" flood-opacity=".6"/>
</filter>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 -.12"/>
  <feComposite in2="SourceGraphic" operator="in"/>
</filter>`;

export const rad = (deg) => (deg * Math.PI) / 180;
export const pt = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
export const f = (n) => Math.round(n * 100) / 100;

/** SVG arc path from angle a0 to a1 (degrees, clockwise, 0 = east). */
export function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  return `M${f(x0)} ${f(y0)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}`;
}

export function ring(cx, cy, r, n, fn) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (360 / n) * i;
    const [x, y] = pt(cx, cy, r, a);
    out += fn(f(x), f(y), a, i);
  }
  return out;
}

export function star(cx, cy, r1, r2, n, rot = -90) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const [x, y] = pt(cx, cy, i % 2 ? r2 : r1, rot + (180 / n) * i);
    d += `${i ? 'L' : 'M'}${f(x)} ${f(y)}`;
  }
  return d + 'Z';
}

/** Four-point sparkle. */
export const sparkle = (cx, cy, r, fill = '#F2FFFB') =>
  `<path d="${star(cx, cy, r, r * 0.22, 4)}" fill="${fill}"/>`;

/** Deterministic pseudo-random numbers so art builds are reproducible. */
export function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const svg = (w, h, body, extraDefs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" stroke-linejoin="round" stroke-linecap="round"><defs>${DEFS}${extraDefs}</defs>${body}</svg>`;
