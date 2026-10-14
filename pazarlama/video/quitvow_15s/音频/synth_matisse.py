# QuitVow 15 sn müzik: 80 BPM (vuruş 0.75 s). Gerilimli kalp atışı → 2.25'te basış çanı → sakinleşen pad ve arpej
# → 10.5'te hücre çanı → 12.75'te kapanış akoru. Rastgelelik yok (deterministik).
import numpy as np, wave
SR = 48000; D = 15.0; n = int(SR * D); t = np.arange(n) / SR; out = np.zeros(n)
def env(t0, a, d, dur):
    e = np.zeros(n); i0 = int(t0 * SR); m = min(n, i0 + int(dur * SR)); tt = t[i0:m] - t0
    e[i0:m] = np.minimum(tt / a, 1) * np.exp(-tt / d); return e
f = lambda note: 440 * 2 ** ((note - 69) / 12)
# kalp atışı (0–2.25): her vuruşta çift tık
for k in range(5):
    for dt, g in ((0, 1), (0.22, .6)):
        t0 = k * 0.75 + dt; out += g * .55 * env(t0, .004, .09, .4) * np.sin(2 * np.pi * 55 * t * (1 + .5 * np.exp(-(t - t0).clip(0) * 30)))
# drone: A minör (0–6) → C majör (6–15) yumuşak geçiş
x = np.clip((t - 6.0) / 3, 0, 1)
for a, b in ((45, 48), (52, 55), (57, 60)):
    out += .07 * ((1 - x) * np.sin(2 * np.pi * f(a) * t) + x * np.sin(2 * np.pi * f(b) * t)) * np.clip(t / 1.5, 0, 1) * np.clip((D - t) / 1.0, 0, 1)
def bell(t0, note, g=.35, d=1.4):
    e = env(t0, .002, d, 4); return g * e * (np.sin(2 * np.pi * f(note) * t) + .4 * np.sin(2 * np.pi * f(note) * 2.76 * t) + .2 * np.sin(2 * np.pi * f(note) * 5.4 * t))
out += bell(6.0, 81) + bell(6.0, 76, .2)
# arpej (5.25–12): C majör, sekizlik notalar, yumuşak
arp = [60, 64, 67, 72, 67, 64]
for i in range(int((12 - 6.75) / 0.375)):
    t0 = 6.75 + i * 0.375; out += .12 * min(1, i / 6) * env(t0, .005, .35, 1.2) * np.sin(2 * np.pi * f(arp[i % 6] + 12) * t)
# hafif vuruş (4.5 sonrası, her 2 vuruşta)
for k in range(8, 20, 2):
    t0 = k * 0.75; out += .25 * env(t0, .004, .12, .4) * np.sin(2 * np.pi * 60 * t * (1 + .4 * np.exp(-(t - t0).clip(0) * 25)))
out += bell(9.0, 84, .3) + bell(9.0, 79, .18)
for nn, g in ((48, .18), (60, .2), (64, .18), (67, .18), (72, .2)): out += bell(12.75, nn, g, 2.2)
out = out / np.abs(out).max() * .85
w = wave.open('音频/配乐_matisse.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype('<i2').tobytes()); w.close(); print('ok')
