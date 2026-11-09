/**
 * Random number sources. Normal play uses CryptoRNG (Web Crypto). SeededRNG
 * is a deterministic PRNG for development, tests, replays and simulations,
 * and is never used for normal play.
 */
export interface RNG {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [0, n). */
  int(n: number): number;
  readonly kind: 'crypto' | 'seeded';
}

const TWO32 = 4294967296;

export class CryptoRNG implements RNG {
  readonly kind = 'crypto' as const;
  private buf = new Uint32Array(1024);
  private i = this.buf.length;

  constructor() {
    if (!globalThis.crypto?.getRandomValues) throw new Error('Web Crypto is not available');
  }

  private u32(): number {
    if (this.i >= this.buf.length) {
      globalThis.crypto.getRandomValues(this.buf);
      this.i = 0;
    }
    return this.buf[this.i++];
  }

  next(): number {
    // 53 random bits for a full-precision double.
    const hi = this.u32() >>> 5;
    const lo = this.u32() >>> 6;
    return (hi * 67108864 + lo) / 9007199254740992;
  }

  int(n: number): number {
    // Rejection sampling removes modulo bias.
    const limit = TWO32 - (TWO32 % n);
    let x: number;
    do x = this.u32(); while (x >= limit);
    return x % n;
  }
}

/** sfc32: small, fast, well-distributed PRNG. DEVELOPMENT / TESTING ONLY. */
export class SeededRNG implements RNG {
  readonly kind = 'seeded' as const;
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number | string = 1) {
    let h = 1779033703 ^ String(seed).length;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) {
      h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    const mix = () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
    this.a = mix();
    this.b = mix();
    this.c = mix();
    this.d = mix();
    for (let i = 0; i < 15; i++) this.u32();
  }

  private u32(): number {
    this.a >>>= 0; this.b >>>= 0; this.c >>>= 0; this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return t >>> 0;
  }

  next(): number {
    return this.u32() / TWO32;
  }

  int(n: number): number {
    const limit = TWO32 - (TWO32 % n);
    let x: number;
    do x = this.u32(); while (x >= limit);
    return x % n;
  }
}

export function createDefaultRNG(): RNG {
  return new CryptoRNG();
}
