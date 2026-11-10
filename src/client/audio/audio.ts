import { store } from '../core/store.ts';

export type Sfx =
  | 'click' | 'spin' | 'land' | 'scatter' | 'win' | 'pop' | 'sign' | 'tile' | 'punch' | 'wild'
  | 'anticipation' | 'horn' | 'train' | 'bonusStart' | 'bonusEnd' | 'bigwin' | 'tick' | 'coin' | 'tension';
export type Music = 'base' | 'bonus';

const SFX: Sfx[] = ['click', 'spin', 'land', 'scatter', 'win', 'pop', 'sign', 'tile', 'punch', 'wild',
  'anticipation', 'horn', 'train', 'bonusStart', 'bonusEnd', 'bigwin', 'tick', 'coin', 'tension'];

/**
 * Web Audio playback: one-shots with pitch and volume control, and two music loops that
 * cross-fade. Audio is optional everywhere: if a file fails to load or the browser blocks
 * playback, the game carries on silently.
 */
class AudioManager {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxGain!: GainNode;
  private musicGain!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private raw = new Map<string, ArrayBuffer>();
  private music: { name: Music; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private wanted: Music | null = null;
  private loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();

  /** Download the files. Decoding waits for the first user gesture. */
  async preload(base: string, onProgress: (done: number, total: number) => void): Promise<void> {
    const names = [...SFX, 'music_base', 'music_bonus'];
    let done = 0;
    await Promise.all(names.map(async (n) => {
      try {
        const res = await fetch(`${base}audio/${n}.mp3`);
        if (res.ok) this.raw.set(n, await res.arrayBuffer());
      } catch { /* optional */ }
      onProgress(++done, names.length);
    }));
  }

  /** Must be called from a user gesture. */
  async unlock(): Promise<void> {
    if (this.ctx) { void this.ctx.resume(); return; }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.sfxGain.connect(this.master);
      this.musicGain.connect(this.master);
      this.master.connect(comp).connect(this.ctx.destination);
      this.applySettings();
      await Promise.all([...this.raw].map(async ([name, data]) => {
        try { this.buffers.set(name, await this.ctx!.decodeAudioData(data.slice(0))); } catch { /* skip */ }
      }));
      this.raw.clear();
      if (this.wanted) this.playMusic(this.wanted);
    } catch {
      this.ctx = null;
    }
  }

  applySettings(): void {
    if (!this.ctx) return;
    const s = store.get();
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.volume, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(s.sound ? 1 : 0, t, 0.05);
    this.musicGain.gain.setTargetAtTime(s.music ? 0.55 : 0, t, 0.2);
  }

  play(name: Sfx, opts: { volume?: number; rate?: number; delay?: number } = {}): void {
    const buf = this.buffers.get(name);
    if (!this.ctx || !buf || this.ctx.state !== 'running') return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? 1;
    const g = this.ctx.createGain();
    g.gain.value = opts.volume ?? 1;
    src.connect(g).connect(this.sfxGain);
    src.start(this.ctx.currentTime + (opts.delay ?? 0) / 1000);
  }

  /** Start a looping effect (for example the win count-up). Returns a function that stops it. */
  loop(name: Sfx, volume = 1): () => void {
    const buf = this.buffers.get(name);
    if (!this.ctx || !buf) return () => undefined;
    this.loops.get(name)?.src.stop();
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.sfxGain);
    src.start();
    this.loops.set(name, { src, gain });
    return () => {
      if (!this.ctx) return;
      gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
      src.stop(this.ctx.currentTime + 0.3);
      if (this.loops.get(name)?.src === src) this.loops.delete(name);
    };
  }

  playMusic(name: Music): void {
    this.wanted = name;
    const buf = this.buffers.get(`music_${name}`);
    if (!this.ctx || !buf || this.music?.name === name) return;
    const t = this.ctx.currentTime;
    if (this.music) {
      const old = this.music;
      old.gain.gain.setTargetAtTime(0, t, 0.4);
      old.src.stop(t + 2);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(1, t, 0.6);
    src.connect(gain).connect(this.musicGain);
    src.start();
    this.music = { name, src, gain };
  }

  /** Lower the music briefly under a big moment. */
  duck(level: number, seconds: number): void {
    if (!this.ctx || !this.music) return;
    const t = this.ctx.currentTime;
    const g = this.music.gain.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(level, t, 0.08);
    g.setTargetAtTime(1, t + seconds, 0.5);
  }

  suspend(): void { void this.ctx?.suspend(); }
  resume(): void { void this.ctx?.resume(); }
}

export const audio = new AudioManager();
