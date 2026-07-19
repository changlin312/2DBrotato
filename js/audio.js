let AC = null;
let lastHitSfx = 0;

function audioCtx() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}

function tone(freq, dur, type, vol, slide) {
  const c = audioCtx();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

function noiseBurst(dur, vol, freq) {
  const c = audioCtx();
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq, c.currentTime);
  filter.frequency.exponentialRampToValueAtTime(80, c.currentTime + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start();
}

const SFX = {
  enemyHit() {
    const now = performance.now();
    if (now - lastHitSfx < 45) return;
    lastHitSfx = now;
    tone(280 + Math.random() * 120, 0.07, 'square', 0.07, 0.55);
  },
  enemyDie() {
    tone(170, 0.22, 'sawtooth', 0.11, 0.3);
  },
  playerHit() {
    tone(120, 0.3, 'sawtooth', 0.18, 0.45);
    tone(80, 0.35, 'triangle', 0.15, 0.4);
  },
  coin() {
    tone(880 + Math.random() * 100, 0.09, 'sine', 0.06, 1.7);
  },
  explosion() {
    noiseBurst(0.5, 0.35, 1200);
    tone(70, 0.45, 'triangle', 0.25, 0.5);
  },
  sniperHit() {
    tone(1400, 0.12, 'sawtooth', 0.14, 0.15);
    noiseBurst(0.08, 0.1, 3000);
  },
  laserHit() {
    tone(500, 0.12, 'sine', 0.12, 3.0);
    tone(900, 0.08, 'square', 0.05, 1.8);
  },
};
