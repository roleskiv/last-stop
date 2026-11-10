#!/usr/bin/env python3
"""Synthesises every sound in the game and writes MP3 files to public/audio.

All audio is original and generated from this script (numpy + ffmpeg); there are no
samples or third-party recordings. Run: npm run audio
"""
import os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio')
rng = np.random.default_rng(13)

def t(sec): return np.arange(int(SR * sec)) / SR
def sine(f, sec, ph=0.0): return np.sin(2 * np.pi * f * t(sec) + ph)
def env(n, a=0.005, d=0.2, curve=4.0):
    x = np.arange(n) / SR
    e = np.exp(-curve * x / max(d, 1e-4))
    att = np.clip(x / max(a, 1e-4), 0, 1)
    return e * att
def noise(sec): return rng.uniform(-1, 1, int(SR * sec))
def lowpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / (1 + (f / fc) ** 4), len(x))
def highpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X * (f / fc) ** 4 / (1 + (f / fc) ** 4), len(x))
def bandpass(x, lo, hi): return highpass(lowpass(x, hi), lo)
def sweep(f0, f1, sec, shape=1.0):
    x = t(sec) / sec
    f = f0 + (f1 - f0) * x ** shape
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def fade(x, a=0.004, r=0.02):
    n = len(x); e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return x * e
def mix(length, *parts):
    out = np.zeros(int(SR * length))
    for start, x, gain in parts:
        i = int(start * SR); j = min(len(out), i + len(x))
        if j > i: out[i:j] += x[: j - i] * gain
    return out
def reverb(x, sec=1.4, wet=0.25, tone=5000):
    ir = noise(sec) * np.exp(-5.5 * t(sec) / sec)
    ir = lowpass(ir, tone); ir[0] = 0
    n = len(x) + len(ir)
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)
    y /= max(1e-9, np.max(np.abs(y)))
    out = np.zeros(n); out[: len(x)] = x * (1 - wet * 0.3)
    return out + y * wet * np.max(np.abs(x))
def norm(x, peak=0.89): return x / max(1e-9, np.max(np.abs(x))) * peak
def note(n): return 440.0 * 2 ** ((n - 69) / 12)

def pluck(f, sec, bright=1.0):
    x = sum(sine(f * k, sec) * (1.0 / k ** (2.2 - bright)) for k in range(1, 7))
    return x * env(len(x), 0.002, sec * 0.35)
def bell(f, sec):
    parts = [(1, 1), (2.01, 0.55), (2.76, 0.4), (4.07, 0.25), (5.43, 0.15), (6.8, 0.08)]
    x = sum(sine(f * r, sec) * a * np.exp(-t(sec) * (2.5 + r * 1.4) / sec * 2.2) for r, a in parts)
    return x * np.clip(t(sec) / 0.002, 0, 1)
def pad(f, sec):
    x = sum(sine(f * d, sec, rng.uniform(0, 6)) for d in (0.996, 1.0, 1.004, 2.0, 0.5))
    x += 0.3 * sum(sine(f * 3 * d, sec, rng.uniform(0, 6)) for d in (0.998, 1.003))
    return lowpass(x, 1800)
def kick(sec=0.35): return sweep(120, 38, sec, 0.35) * env(int(SR * sec), 0.001, 0.14)
def hat(sec=0.06): return highpass(noise(sec), 7000) * env(int(SR * sec), 0.001, 0.02)
def clack(sec=0.12, f=1800): return (bandpass(noise(sec), f * 0.6, f * 1.8) + 0.5 * sine(f, sec)) * env(int(SR * sec), 0.001, 0.025)

def save(name, x, stereo=False, bitrate='96k'):
    x = np.clip(x, -1, 1)
    if x.ndim == 1: x = np.stack([x, x], axis=1) if stereo else x[:, None]
    pcm = (x * 32767).astype('<i2')
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: tmp = f.name
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(pcm.shape[1]); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    dst = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', bitrate, dst], check=True)
    os.unlink(tmp)
    print('wrote', name, f'{os.path.getsize(dst) / 1024:.0f} KB')

def widen(x, ms=11):
    d = int(SR * ms / 1000)
    r = np.concatenate([np.zeros(d), x[:-d]]) * 0.9 + x * 0.25
    return np.stack([x, r], axis=1)

# ---------------- sound effects ----------------
def sfx():
    save('click', norm(fade(clack(0.07, 2400) + 0.4 * pluck(1200, 0.07)), 0.5), bitrate='64k')
    save('tick', norm(fade(pluck(1568, 0.09, 1.2) * 0.8 + clack(0.09, 4200) * 0.3), 0.45), bitrate='64k')

    whoosh = bandpass(noise(0.55), 300, 2600) * np.sin(np.pi * t(0.55) / 0.55) ** 2
    whoosh *= 0.6 + 0.4 * sweep(3, 9, 0.55)
    save('spin', norm(fade(mix(0.6, (0, whoosh, 1), (0, sweep(180, 90, 0.3) * env(int(SR * 0.3), 0.005, 0.12), 0.5))), 0.6), bitrate='64k')

    thud = sweep(150, 55, 0.16, 0.4) * env(int(SR * 0.16), 0.001, 0.06) + 0.35 * clack(0.16, 900)
    save('land', norm(fade(thud), 0.7), bitrate='64k')

    sc = mix(1.3, (0, bell(note(69), 1.2), 0.8), (0.02, bell(note(76), 1.1), 0.6), (0.05, bell(note(81), 1.0), 0.5),
             (0, sweep(300, 1400, 0.35) * env(int(SR * 0.35), 0.01, 0.2), 0.2), (0, kick(0.3), 0.6))
    save('scatter', norm(reverb(sc, 1.2, 0.3)), bitrate='80k')

    chord = [72, 76, 79, 84]
    w = mix(0.9, *[(i * 0.055, pluck(note(n), 0.6, 1.1) + 0.5 * bell(note(n + 12), 0.6), 0.6) for i, n in enumerate(chord)])
    save('win', norm(reverb(w, 0.9, 0.22)), bitrate='80k')

    pop = mix(0.3, (0, sweep(900, 220, 0.12, 0.5) * env(int(SR * 0.12), 0.001, 0.04), 1),
              (0, highpass(noise(0.2), 3000) * env(int(SR * 0.2), 0.001, 0.06), 0.45), (0.03, bell(note(88), 0.25), 0.3))
    save('pop', norm(fade(pop), 0.7), bitrate='64k')

    zap = bandpass(noise(0.45), 1200, 6000) * (0.5 + 0.5 * np.sign(sine(55, 0.45))) * env(int(SR * 0.45), 0.002, 0.2)
    hum = (sine(110, 0.45) + 0.5 * sine(220, 0.45)) * env(int(SR * 0.45), 0.01, 0.3)
    save('sign', norm(reverb(mix(0.5, (0, zap, 0.7), (0, hum, 0.6), (0.05, sweep(400, 1600, 0.3) * env(int(SR * 0.3), 0.01, 0.15), 0.3)), 0.8, 0.25)), bitrate='80k')

    ding = mix(0.9, (0, bell(note(81), 0.8), 0.8), (0.06, bell(note(88), 0.7), 0.6), (0, clack(0.05, 3000), 0.3))
    save('tile', norm(reverb(ding, 0.8, 0.25)), bitrate='80k')

    pn = mix(0.5, (0, clack(0.1, 1500), 1), (0.004, sweep(220, 70, 0.14, 0.4) * env(int(SR * 0.14), 0.001, 0.05), 0.9),
             (0.03, bell(note(90), 0.4), 0.35), (0.02, highpass(noise(0.2), 5000) * env(int(SR * 0.2), 0.001, 0.05), 0.4))
    save('punch', norm(reverb(pn, 0.6, 0.18)), bitrate='80k')

    wl = mix(1.0, *[(i * 0.035, bell(note(n), 0.7), 0.5) for i, n in enumerate([76, 81, 85, 88, 93])],
             (0, sweep(600, 2400, 0.4) * env(int(SR * 0.4), 0.02, 0.2), 0.15))
    save('wild', norm(reverb(wl, 1.0, 0.3)), bitrate='80k')

    L = 2.2
    riser = bandpass(noise(L), 400, 5000) * (t(L) / L) ** 2 * 0.5 + sweep(110, 440, L, 2) * (t(L) / L) ** 1.5 * 0.5
    trem = 0.6 + 0.4 * sine(1, L) * 0 + 0.4 * np.sign(sweep(6, 18, L))
    heart = mix(L, *[(i * 0.36, kick(0.3), 0.8) for i in range(6)])
    save('tension', norm(fade(riser * trem + heart * 0.7, 0.01, 0.25), 0.75), bitrate='80k')
    save('anticipation', norm(fade(riser * trem, 0.01, 0.25), 0.6), bitrate='64k')

    H = 2.4
    horn = sum(lowpass(np.sign(sine(f, H)) * 0.5 + sine(f, H), 1500) for f in (155.6, 185.0, 233.1, 311.1))
    hornenv = np.clip(t(H) / 0.08, 0, 1) * np.clip((H - t(H)) / 0.5, 0, 1) * (0.85 + 0.15 * sine(5.5, H))
    save('horn', widen(norm(reverb(horn * hornenv, 2.2, 0.4, 3000))), bitrate='96k')

    T = 3.2
    x = t(T) / T
    rumble = lowpass(noise(T), 220) * np.sin(np.pi * np.clip(x * 1.15, 0, 1)) ** 1.5 * 2.2
    rush = bandpass(noise(T), 500, 5000) * np.exp(-((x - 0.42) / 0.18) ** 2)
    clk = mix(T, *[(0.15 + i * (0.16 - i * 0.004), clack(0.07, 700 + i * 30), 0.25 + 0.5 * np.exp(-((i / 18 - 0.42) / 0.25) ** 2)) for i in range(20)])
    doppler = sweep(520, 330, T, 0.6) * np.exp(-((x - 0.35) / 0.2) ** 2) * 0.25
    save('train', widen(norm(reverb(rumble + rush * 0.9 + clk + doppler, 1.6, 0.25))), bitrate='96k')

    fan = [(0, [60, 67, 72]), (0.22, [62, 69, 74]), (0.44, [64, 71, 76]), (0.7, [67, 72, 76, 79, 84])]
    parts = []
    for st, ns in fan:
        dur = 1.8 if st > 0.6 else 0.35
        for n in ns:
            parts.append((st, pluck(note(n), dur, 1.3) + 0.6 * lowpass(np.sign(sine(note(n), dur)), 2500) * env(int(SR * dur), 0.01, dur * 0.5), 0.3))
    parts += [(0.7, kick(0.4), 0.9), (0.7, bell(note(96), 1.5), 0.3), (0, sweep(200, 1800, 0.7, 2) * 0.12, 1)]
    save('bonusStart', widen(norm(reverb(mix(2.8, *parts), 1.8, 0.3))), bitrate='96k')

    out = [(0, [72, 76, 79]), (0.2, [71, 74, 79]), (0.4, [69, 72, 76]), (0.62, [60, 67, 72, 76])]
    parts = []
    for st, ns in out:
        dur = 2.0 if st > 0.6 else 0.3
        for n in ns: parts.append((st, pluck(note(n), dur, 1.2) + 0.4 * bell(note(n + 12), dur), 0.35))
    parts.append((0.62, kick(0.4), 0.8))
    save('bonusEnd', widen(norm(reverb(mix(3.0, *parts), 1.8, 0.3))), bitrate='96k')

    bw = []
    for i, ns in enumerate([[60, 64, 67], [64, 67, 72], [67, 72, 76], [72, 76, 79, 84]]):
        st = i * 0.16; dur = 1.6 if i == 3 else 0.3
        for n in ns: bw.append((st, lowpass(np.sign(sine(note(n), dur)) + sine(note(n) * 2, dur), 3200) * env(int(SR * dur), 0.006, dur * 0.6), 0.22))
    bw += [(0.48, kick(0.4), 1.0), (0.48, highpass(noise(1.2), 6000) * env(int(SR * 1.2), 0.002, 0.5), 0.3), (0.5, bell(note(96), 1.3), 0.35)]
    save('bigwin', widen(norm(reverb(mix(2.4, *bw), 1.6, 0.28))), bitrate='96k')

    coin = mix(0.7, (0, bell(note(96), 0.5), 0.7), (0.07, bell(note(100), 0.5), 0.6), (0.14, bell(note(103), 0.5), 0.5))
    save('coin', norm(reverb(coin, 0.7, 0.2), 0.8), bitrate='80k')

# ---------------- music ----------------
def music(name, bpm, prog, drive):
    beat = 60 / bpm
    bars = len(prog)
    L = bars * 4 * beat
    out = np.zeros(int(SR * L) + SR * 4)
    def add(start, x, g):
        i = int(start * SR); out[i:i + len(x)] += x * g
    for b, (root, quality) in enumerate(prog):
        st = b * 4 * beat
        triad = [0, 3, 7, 10] if quality == 'm' else [0, 4, 7, 11]
        chord = sum(pad(note(root + 12 + iv), 4 * beat + 0.6) for iv in triad)
        e = np.clip(t(4 * beat + 0.6) / 0.5, 0, 1) * np.clip((4 * beat + 0.6 - t(4 * beat + 0.6)) / 0.6, 0, 1)
        add(st, chord * e, 0.045)
        # bass
        pattern = [0, 0, 7, 0, 0, 10, 7, 0] if drive else [0, None, None, 0, None, 7, None, None]
        for k, iv in enumerate(pattern):
            if iv is None: continue
            dur = beat * 0.48
            x = lowpass(np.sign(sine(note(root - 12 + iv), dur)) * 0.5 + sine(note(root - 12 + iv), dur), 500) * env(int(SR * dur), 0.004, dur * 0.7)
            add(st + k * beat / 2, x, 0.3)
        # arpeggio
        arp = [0, 2, 1, 3, 2, 1, 3, 2] if drive else [0, None, 2, None, 1, None, 3, None]
        for rep in range(2):
            for k, idx in enumerate(arp):
                if idx is None: continue
                n = root + 24 + triad[idx]
                add(st + rep * 2 * beat + k * beat / 4 + (0.012 if k % 2 else 0), pluck(note(n), beat * 0.9, 1.1), 0.075 if drive else 0.06)
        # eerie bell melody
        if b % 2 == 0:
            for k, iv in enumerate([7, 10, 12] if b % 4 == 0 else [12, 10, 3]):
                add(st + (2 + k * 0.75) * beat, bell(note(root + 24 + iv), 1.6), 0.07)
        # drums
        for k in range(8):
            pos = st + k * beat / 2
            if drive:
                if k % 2 == 0: add(pos, kick(0.3), 0.5)
                add(pos + beat / 4, hat(0.05), 0.09)
                add(pos, hat(0.04), 0.05)
                if k in (2, 6): add(pos, clack(0.12, 1200) + highpass(noise(0.12), 2500) * env(int(SR * 0.12), 0.001, 0.05), 0.2)
            else:
                if k in (0, 5): add(pos, kick(0.3), 0.38)
                if k % 2 == 1: add(pos, hat(0.05), 0.06)
                if k == 4: add(pos, clack(0.1, 900), 0.12)
        # train-on-rails shuffle
        for k in range(4):
            add(st + k * beat + beat * 0.5, clack(0.05, 500), 0.05 if drive else 0.03)
            add(st + k * beat + beat * 0.66, clack(0.05, 420), 0.04 if drive else 0.025)
    wind = bandpass(noise(L + 4), 200, 900) * (0.5 + 0.5 * np.sin(2 * np.pi * t(L + 4) / L)) * 0.035
    k = min(len(out), len(wind)); out[:k] += wind[:k]
    wet = reverb(out, 2.2, 0.22)
    # fold the tail back onto the start so the loop is seamless
    n = int(SR * L)
    loop = wet[:n].copy()
    tail = wet[n:]
    m = min(len(tail), n)
    loop[:m] += tail[:m]
    save(name, widen(norm(loop, 0.8), 7), bitrate='112k')

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1:]
    if not only or 'sfx' in only: sfx()
    Dm = [(50, 'm'), (50, 'm'), (46, 'M'), (46, 'M'), (43, 'm'), (43, 'm'), (45, 'm'), (45, 'M')]
    if not only or 'music' in only:
        music('music_base', 92, Dm, False)
        music('music_bonus', 118, [(50, 'm'), (46, 'M'), (41, 'M'), (48, 'M'), (50, 'm'), (46, 'M'), (43, 'm'), (45, 'M')], True)
