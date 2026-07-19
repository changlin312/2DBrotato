// 音频 —— 全 Web Audio 合成。中式五声音阶（宫商角徵羽）+ 锣鼓铃笛。
let AC = null;
let lastHitSfx = 0;

function audioCtx() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  if (AC.state === 'suspended') AC.resume();
  return AC;
}

// 五声音阶（D 宫调）
const PENTA = {
  D3: 146.83, G3: 196.0, A3: 220.0,
  D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  D6: 1174.66, E6: 1318.51,
};

function tone(freq, dur, type, vol, slide, delay) {
  const c = audioCtx();
  const t0 = c.currentTime + (delay || 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, freq, delay) {
  const c = audioCtx();
  const t0 = c.currentTime + (delay || 0);
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq, t0);
  filter.frequency.exponentialRampToValueAtTime(80, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter); filter.connect(g); g.connect(c.destination);
  src.start(t0);
}

// 鼓：低频正弦 + 噪声
function drum(vol, freq, dur, delay) {
  tone(freq || 110, dur || 0.18, 'sine', vol, 0.35, delay);
  noiseBurst((dur || 0.18) * 0.6, vol * 0.4, 900, delay);
}

// 锣：多个失谐金属泛音 + 长衰减
function gong(big, delay) {
  const base = big ? 98 : 164;
  const partials = [1, 1.34, 1.68, 2.12, 2.7];
  const vol = big ? 0.16 : 0.1;
  const dur = big ? 1.6 : 0.9;
  partials.forEach((r, i) => {
    tone(base * r, dur * (1 - i * 0.12), 'triangle', vol / (i + 1), 0.98, delay);
  });
  noiseBurst(0.25, vol * 0.5, big ? 500 : 1200, delay);
}

// 铃：高频正弦 + 泛音
function bell(freq, vol, delay) {
  tone(freq, 0.35, 'sine', vol, 0.99, delay);
  tone(freq * 2.01, 0.22, 'sine', vol * 0.4, 0.99, delay);
}

// 笛：正弦 + 轻微滑音
function flute(freq, dur, vol, delay) {
  tone(freq * 0.98, dur, 'sine', vol, 1.02, delay);
  tone(freq * 2, dur * 0.9, 'sine', vol * 0.15, 1.0, delay);
}

const SFX = {
  enemyHit() {
    const now = performance.now();
    if (now - lastHitSfx < 45) return;
    lastHitSfx = now;
    drum(0.09, 130 + Math.random() * 60, 0.08);
  },
  enemyDie() {
    drum(0.14, 90, 0.25);
    tone(PENTA.A3, 0.3, 'triangle', 0.06, 0.6);
  },
  playerHit() {
    drum(0.22, 70, 0.4);
    tone(PENTA.D3, 0.45, 'sawtooth', 0.08, 0.7);
  },
  coin() {
    const notes = [PENTA.D5, PENTA.E5, PENTA.G5, PENTA.A5];
    bell(notes[Math.floor(Math.random() * notes.length)], 0.06);
  },
  explosion() {
    noiseBurst(0.5, 0.35, 1200);
    drum(0.25, 60, 0.5);
  },
  sniperHit() {
    tone(PENTA.D6, 0.1, 'square', 0.1, 0.3);
    noiseBurst(0.06, 0.08, 3000);
  },
  laserHit() {
    tone(PENTA.A5, 0.12, 'sine', 0.1, 2.6);
    tone(PENTA.D6, 0.07, 'square', 0.04, 1.6);
  },
  waveStart() {
    gong(false);
    tone(PENTA.D4, 0.5, 'triangle', 0.05, 1.0, 0.05);
  },
  bossSpawn() {
    gong(true);
    drum(0.2, 55, 0.6, 0.15);
    tone(PENTA.D3, 1.4, 'sawtooth', 0.06, 0.8, 0.1);
  },
  buy() {
    bell(PENTA.A5, 0.05);
    bell(PENTA.D6, 0.04, 0.06);
  },
  fuse() {
    tone(PENTA.D5, 0.15, 'triangle', 0.08, 1.0);
    tone(PENTA.A5, 0.25, 'triangle', 0.08, 1.0, 0.1);
    gong(false, 0.18);
  },
  victory() {
    const seq = [PENTA.D4, PENTA.E4, PENTA.G4, PENTA.A4, PENTA.D5, PENTA.E5, PENTA.G5, PENTA.A5, PENTA.D6];
    seq.forEach((f, i) => flute(f, i === seq.length - 1 ? 1.2 : 0.35, 0.12, i * 0.22));
    gong(true, seq.length * 0.22);
  },
  gameOver() {
    const seq = [PENTA.A4, PENTA.G4, PENTA.E4, PENTA.D4, PENTA.D3];
    seq.forEach((f, i) => flute(f, 0.5, 0.1, i * 0.3));
    drum(0.2, 55, 1.0, seq.length * 0.3);
  },
};
