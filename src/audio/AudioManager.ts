import { Howl, Howler } from 'howler';
import { audioAssets, type SoundKey } from '../assets/assetManifest';

export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
  muted: boolean;
}

const MUSIC_KEYS: SoundKey[] = ['ambience', 'music', 'bonusMusic'];
const BASE_VOLUME: Partial<Record<SoundKey, number>> = {
  ambience: 0.55,
  music: 0.35,
  bonusMusic: 0.4,
  land: 0.35,
  click: 0.5,
  reelStop: 0.6,
};

/**
 * Howler-based audio manager. Missing or undecodable files fail silently:
 * every play() is a no-op until its sound has loaded, so the game never
 * blocks on audio. Mobile browsers unlock audio on the first user gesture.
 */
export class AudioManager {
  private sounds = new Map<SoundKey, Howl>();
  private failed = new Set<SoundKey>();
  private settings: AudioSettings = { master: 0.8, music: 0.6, sfx: 0.9, muted: false };
  private musicTrack: 'music' | 'bonusMusic' = 'music';
  private started = false;
  private lastPlayed = new Map<SoundKey, number>();

  constructor(private base: string = import.meta.env.BASE_URL ?? '/') {}

  load(): void {
    (Object.keys(audioAssets) as SoundKey[]).forEach((key) => {
      const isLoop = MUSIC_KEYS.includes(key);
      const howl = new Howl({
        src: [this.base + audioAssets[key]],
        loop: isLoop,
        preload: true,
        html5: false,
        volume: this.volumeFor(key),
        onloaderror: () => this.failed.add(key),
        onplayerror: () => howl.once('unlock', () => howl.play()),
      });
      this.sounds.set(key, howl);
    });
    Howler.volume(this.settings.master);
  }

  /** Call on the first user interaction (click / tap). Starts ambience and music. */
  unlock(): void {
    if (this.started) return;
    this.started = true;
    const ctx = Howler.ctx;
    if (ctx && ctx.state === 'suspended') void ctx.resume();
    this.sounds.get('ambience')?.play();
    this.sounds.get(this.musicTrack)?.play();
  }

  play(key: SoundKey, opts: { rate?: number; volume?: number; throttleMs?: number } = {}): void {
    if (this.settings.muted || this.failed.has(key)) return;
    const now = performance.now();
    if (opts.throttleMs && now - (this.lastPlayed.get(key) ?? 0) < opts.throttleMs) return;
    this.lastPlayed.set(key, now);
    const s = this.sounds.get(key);
    if (!s || s.state() !== 'loaded') return;
    const id = s.play();
    if (opts.rate) s.rate(opts.rate, id);
    if (opts.volume !== undefined) s.volume(this.volumeFor(key) * opts.volume, id);
  }

  setMusic(track: 'music' | 'bonusMusic'): void {
    if (track === this.musicTrack) return;
    const prev = this.sounds.get(this.musicTrack);
    const next = this.sounds.get(track);
    this.musicTrack = track;
    if (!this.started) return;
    prev?.fade(prev.volume(), 0, 800);
    setTimeout(() => prev?.stop(), 820);
    if (next) {
      next.volume(0);
      next.play();
      next.fade(0, this.volumeFor(track), 1000);
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  update(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    Howler.volume(this.settings.master);
    Howler.mute(this.settings.muted);
    this.sounds.forEach((s, k) => s.volume(this.volumeFor(k)));
  }

  private volumeFor(key: SoundKey): number {
    const group = MUSIC_KEYS.includes(key) ? this.settings.music : this.settings.sfx;
    return (BASE_VOLUME[key] ?? 0.8) * group;
  }
}
