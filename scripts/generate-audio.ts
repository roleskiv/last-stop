/**
 * Synthesises every LAST STOP sound effect and loop from scratch (no samples),
 * writing 16-bit mono WAVs into public/audio. All sounds are original.
 *   npm run audio
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'audio');
mkdirSync(OUT, { recursive: true });

let seed = 1234567;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;
const TAU = Math.PI * 2;

function writeWav(name: string, data: Float32Array, rate: number) {
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const gain = peak > 0.95 ? 0.95 / peak : 1;
  const buf = Buffer.alloc(44 + data.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + data.length * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i] * gain)) * 32767), 44 + i * 2);
  writeFileSync(join(OUT, `${name}.wav`), buf);
  console.log(`  ${name}.wav  ${(buf.length / 1024).toFixed(0)} KB`);
}

function make(seconds: number, rate: number, fn: (t: number, i: number) => number): Float32Array {
  const n = Math.floor(seconds * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / rate, i);
  return out;
}

/** One-pole low-pass, in place. */
function lowpass(d: Float32Array, rate: number, cutoff: number | ((i: number) => number)) {
  let y = 0;
  for (let i = 0; i < d.length; i++) {
    const fc = typeof cutoff === 'number' ? cutoff : cutoff(i);
    const a = 1 - Math.exp((-TAU * fc) / rate);
    y += a * (d[i] - y);
    d[i] = y;
  }
  return d;
}
/** Simple multi-tap feedback reverb. */
function reverb(d: Float32Array, rate: number, mix = 0.3, decay = 0.5) {
  const taps = [0.029, 0.037, 0.043, 0.051, 0.067, 0.079].map((s) => Math.floor(s * rate));
  const out = Float32Array.from(d);
  const bufs = taps.map((t) => new Float32Array(t));
  const idx = taps.map(() => 0);
  for (let i = 0; i < d.length; i++) {
    let wet = 0;
    for (let k = 0; k < taps.length; k++) {
      const b = bufs[k];
      const y = b[idx[k]];
      b[idx[k]] = d[i] + y * decay;
      idx[k] = (idx[k] + 1) % b.length;
      wet += y;
    }
    out[i] = d[i] * (1 - mix) + (wet / taps.length) * mix * 2;
  }
  return out;
}
function mixInto(dst: Float32Array, src: Float32Array, at: number, gain = 1) {
  for (let i = 0; i < src.length && at + i < dst.length; i++) if (at + i >= 0) dst[at + i] += src[i] * gain;
}
const env = (t: number, a: number, d: number) => (t < a ? t / a : Math.exp(-(t - a) / d));
const note = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function bell(freq: number, dur: number, rate: number, bright = 1) {
  const partials = [1, 2.01, 2.76, 4.07, 5.4];
  const amps = [1, 0.5 * bright, 0.35 * bright, 0.2 * bright, 0.1 * bright];
  return make(dur, rate, (t) => {
    let v = 0;
    for (let k = 0; k < partials.length; k++) v += amps[k] * Math.sin(TAU * freq * partials[k] * t) * Math.exp(-t * (2 + k * 2.2));
    return v * env(t, 0.004, dur);
  });
}
function crossfadeLoop(d: Float32Array, rate: number, fade = 1) {
  const n = Math.floor(fade * rate);
  const out = d.slice(0, d.length - n);
  for (let i = 0; i < n; i++) {
    const w = i / n;
    out[i] = out[i] * w + d[d.length - n + i] * (1 - w);
  }
  return out;
}

const R = 44100;
const LR = 22050;
console.log('Generating LAST STOP audio...');

// --- Loops ---------------------------------------------------------------
{
  const dur = 13;
  const d = make(dur, LR, (t) => {
    const lfo = 0.5 + 0.5 * Math.sin((TAU * t) / 6.5);
    return 0.22 * Math.sin(TAU * 55 * t) * (0.6 + 0.4 * lfo) + 0.12 * Math.sin(TAU * 82.4 * t + Math.sin(TAU * 0.3 * t)) + 0.035 * Math.sin(TAU * 120 * t) + 0.02 * Math.sin(TAU * 180 * t);
  });
  const wind = make(dur, LR, () => noise());
  lowpass(wind, LR, (i) => 300 + 250 * Math.sin((TAU * i) / LR / 4.3));
  lowpass(wind, LR, 600);
  for (let i = 0; i < d.length; i++) d[i] += wind[i] * (0.9 + 0.6 * Math.sin((TAU * i) / LR / 6.5));
  for (const at of [1.3, 3.9, 5.2, 8.4, 10.9, 11.6]) mixInto(d, make(0.4, LR, (t) => Math.sin(TAU * (1400 - t * 1800) * t) * Math.exp(-t * 18) * 0.12), Math.floor(at * LR));
  const rumble = make(4, LR, (t) => noise() * Math.sin((Math.PI * t) / 4));
  lowpass(rumble, LR, 90);
  lowpass(rumble, LR, 90);
  mixInto(d, rumble, Math.floor(6 * LR), 2.2);
  writeWav('ambience', crossfadeLoop(reverb(d, LR, 0.35, 0.6), LR, 1), LR);
}
function musicLoop(name: string, bpm: number, bass: boolean) {
  const beat = 60 / bpm;
  const seq = [57, 60, 64, 71, 69, 64, 60, 64, 56, 59, 64, 68, 71, 68, 64, 59, 53, 57, 60, 65, 64, 60, 57, 60, 52, 56, 59, 64, 62, 59, 56, 52];
  const dur = seq.length * beat * 0.5 + 1;
  const d = new Float32Array(Math.floor(dur * LR));
  seq.forEach((n, k) => mixInto(d, bell(note(n + 12), 1.4, LR, 0.6), Math.floor(k * beat * 0.5 * LR), 0.22));
  const roots = [45, 44, 41, 40];
  roots.forEach((r, k) => {
    const len = 8 * beat;
    const pad = make(len + 0.5, LR, (t) => {
      const e = Math.min(1, t / 0.6) * Math.min(1, (len + 0.5 - t) / 0.6);
      return e * (0.12 * Math.sin(TAU * note(r) * t) + 0.06 * Math.sin(TAU * note(r + 7) * t * 1.002) + 0.05 * Math.sin(TAU * note(r + 12) * t * 0.998));
    });
    mixInto(d, pad, Math.floor(k * len * LR));
    if (bass) {
      for (let b = 0; b < 16; b++) {
        const hit = make(0.25, LR, (t) => Math.sin(TAU * note(r - 12) * t) * Math.exp(-t * 12) * 0.5);
        mixInto(d, hit, Math.floor((k * len + b * beat * 0.5) * LR));
      }
    }
  });
  writeWav(name, crossfadeLoop(reverb(d, LR, 0.4, 0.62), LR, 1), LR);
}
musicLoop('music', 76, false);
musicLoop('bonus_music', 112, true);

// --- One-shots -------------------------------------------------------------
{
  const d = make(0.45, R, (t) => noise() * Math.sin((Math.PI * t) / 0.45));
  lowpass(d, R, (i) => 400 + (i / R) * 9000);
  writeWav('reel_start', d, R);
}
{
  const d = make(0.22, R, (t) => Math.sin(TAU * (95 - 160 * t) * t) * Math.exp(-t * 22) + noise() * Math.exp(-t * 90) * 0.4);
  writeWav('reel_stop', lowpass(d, R, 2400), R);
}
writeWav('land', lowpass(make(0.09, R, (t) => (Math.sin(TAU * 520 * t) * 0.5 + noise() * 0.3) * Math.exp(-t * 60)), R, 3000), R);
{
  const d = new Float32Array(Math.floor(1.0 * R));
  [72, 76, 79, 84].forEach((n, k) => mixInto(d, bell(note(n), 0.8, R), Math.floor(k * 0.06 * R), 0.4));
  writeWav('cluster_win', reverb(d, R, 0.3), R);
}
{
  const d = make(0.5, R, (t) => noise() * Math.exp(-t * 6));
  lowpass(d, R, (i) => 6000 - (i / R) * 9000);
  const sp = new Float32Array(d.length);
  [88, 84, 81].forEach((n, k) => mixInto(sp, bell(note(n), 0.4, R, 0.3), Math.floor(k * 0.05 * R), 0.2));
  for (let i = 0; i < d.length; i++) d[i] = d[i] * 0.5 + sp[i];
  writeWav('cascade', d, R);
}
{
  const d = make(0.9, R, (t) => {
    let v = 0;
    for (let k = 0; k < 6; k++) v += Math.sin(TAU * (600 + k * 330 + t * 900) * t) * 0.12;
    return v * env(t, 0.05, 0.35) * (0.6 + 0.4 * Math.sin(TAU * 18 * t));
  });
  writeWav('wild', reverb(d, R, 0.35), R);
}
{
  const d = make(0.5, R, (t) => {
    const ring = [523, 1371, 2210, 3170].reduce((a, f, k) => a + Math.sin(TAU * f * t) * Math.exp(-t * (14 + k * 6)) * (0.5 / (k + 1)), 0);
    return ring + noise() * Math.exp(-t * 70) * 0.8 + Math.sin(TAU * 70 * t) * Math.exp(-t * 25) * 0.7;
  });
  writeWav('punch', reverb(d, R, 0.2), R);
}
{
  const d = make(1.1, R, (t) => {
    const zap = noise() * (rand() < 0.08 ? 1 : 0.15) * Math.exp(-t * 5);
    const swell = Math.sin(TAU * (110 + 220 * t) * t) * env(t, 0.3, 0.4) * 0.5;
    const shimmer = Math.sin(TAU * 1760 * t) * Math.sin(TAU * 7 * t) * 0.08 * env(t, 0.2, 0.5);
    return zap * 0.5 + swell + shimmer;
  });
  writeWav('platform', reverb(lowpass(d, R, 5000), R, 0.35), R);
}
{
  const d = bell(note(45), 1.8, R, 0.8);
  mixInto(d, bell(note(57), 1.4, R), 0, 0.5);
  writeWav('scatter', reverb(d, R, 0.4), R);
}
{
  const dur = 2.2;
  const d = make(dur, R, (t) => {
    const e = env(t, 0.08, 1.2) * Math.min(1, (dur - t) * 3);
    const vib = 1 + 0.004 * Math.sin(TAU * 5 * t);
    const saw = (f: number) => 2 * ((f * t * vib) % 1) - 1;
    return e * (saw(233) * 0.3 + saw(277) * 0.25 + saw(349) * 0.2);
  });
  lowpass(d, R, 1300);
  const echo = new Float32Array(Math.floor(3.4 * R));
  mixInto(echo, d, 0, 1);
  mixInto(echo, d, Math.floor(0.45 * R), 0.35);
  mixInto(echo, d, Math.floor(0.9 * R), 0.15);
  writeWav('train_horn', reverb(echo, R, 0.45, 0.65), R);
}
{
  const dur = 2.8;
  const d = make(dur, R, (t) => {
    const swell = Math.exp(-Math.pow((t - 1.3) / 0.55, 2));
    const clack = (t * 9) % 1 < 0.04 ? noise() * 1.4 : 0;
    return (noise() * 0.8 + clack) * swell;
  });
  lowpass(d, R, (i) => 300 + 2500 * Math.exp(-Math.pow((i / R - 1.3) / 0.5, 2)));
  writeWav('train_pass', d, R);
}
{
  const d = new Float32Array(Math.floor(3.0 * R));
  [60, 64, 67, 72, 76, 79, 84, 88].forEach((n, k) => mixInto(d, bell(note(n), 1.6, R), Math.floor(k * 0.09 * R), 0.35));
  mixInto(d, make(2.4, R, (t) => (Math.sin(TAU * note(48) * t) + 0.5 * Math.sin(TAU * note(55) * t)) * env(t, 0.1, 1.2) * 0.3), Math.floor(0.6 * R));
  writeWav('big_win', reverb(d, R, 0.4), R);
}
{
  const d = make(3.2, R, (t) => {
    const f = 55 * Math.pow(2, t / 1.6);
    return (Math.sin(TAU * f * t) * 0.4 + noise() * 0.1) * env(t, 2.5, 0.4);
  });
  lowpass(d, R, 1800);
  [69, 72, 76, 81].forEach((n, k) => mixInto(d, bell(note(n), 1.2, R), Math.floor((2.2 + k * 0.12) * R), 0.3));
  writeWav('bonus_intro', reverb(d, R, 0.45, 0.6), R);
}
{
  const d = new Float32Array(Math.floor(2.4 * R));
  [84, 79, 76, 72, 69].forEach((n, k) => mixInto(d, bell(note(n), 1.2, R), Math.floor(k * 0.14 * R), 0.35));
  writeWav('bonus_outro', reverb(d, R, 0.45), R);
}
writeWav('click', make(0.05, R, (t) => (Math.sin(TAU * 1800 * t) * 0.4 + noise() * 0.2) * Math.exp(-t * 120)), R);
writeWav('coin', reverb(bell(note(93), 0.5, R, 0.5), R, 0.2), R);
console.log('Done.');
