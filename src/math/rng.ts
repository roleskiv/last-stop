/**
 * Random number sources.
 *
 * The engine only ever asks for one thing: a uniformly distributed integer in [0, n).
 * Both implementations draw raw 32-bit words, keep the top 31 bits and use rejection
 * sampling (values at or above the largest multiple of n are redrawn), so there is no
 * modulo bias for any n.
 *
 *  - CryptoRng: production. Backed by the platform CSPRNG (Web Crypto, available in
 *    browsers and in Node 20+). Not seedable and not predictable.
 *  - SeededRng: xoshiro128**. Deterministic. Used only by tests, simulation and
 *    replay tooling. It is never selected implicitly.
 */
export interface Rng {
  /** Uniform integer in [0, n), 1 <= n <= 2^31. */
  below(n: number): number;
}

const TWO31 = 2147483648;

export class CryptoRng implements Rng {
  private n = 0;
  private limit = 0;
  private buf = new Uint32Array(1024);
  private idx = 1024;

  private next32(): number {
    if (this.idx >= this.buf.length) {
      globalThis.crypto.getRandomValues(this.buf);
      this.idx = 0;
    }
    return this.buf[this.idx++];
  }

  below(n: number): number {
    if (n !== this.n) { this.n = n; this.limit = TWO31 - (TWO31 % n); }
    const limit = this.limit;
    let x = this.next32() >>> 1;
    while (x >= limit) x = this.next32() >>> 1;
    return x % n;
  }
}

export class SeededRng implements Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  private n = 0;
  private limit = 0;

  constructor(seed: number | string) {
    // Expand the seed with splitmix32 so that similar seeds give unrelated streams.
    let h = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    const sm = (): number => {
      h = (h + 0x9e3779b9) >>> 0;
      let z = h;
      z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
      z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
      return (z ^ (z >>> 15)) >>> 0;
    };
    this.a = sm(); this.b = sm(); this.c = sm(); this.d = sm();
    if ((this.a | this.b | this.c | this.d) === 0) this.a = 1;
  }

  next32(): number {
    const r = Math.imul(rotl(Math.imul(this.b, 5), 7), 9) >>> 0;
    const t = this.b << 9;
    this.c ^= this.a; this.d ^= this.b; this.b ^= this.c; this.a ^= this.d;
    this.c ^= t;
    this.d = rotl(this.d, 11);
    return r;
  }

  below(n: number): number {
    if (n !== this.n) { this.n = n; this.limit = TWO31 - (TWO31 % n); }
    const limit = this.limit;
    let x = this.next32() >>> 1;
    while (x >= limit) x = this.next32() >>> 1;
    return x % n;
  }
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
