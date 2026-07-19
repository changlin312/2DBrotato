const W = 960, H = 640;
const WAVE_TIME = 30;
const MAX_WAVE = 30;
const MAX_WEAPONS = 6;

const G = {
  state: 'menu',
  wave: 0,
  gold: 25,
  waveTimer: 0,
  kills: 0,
  player: null,
  enemies: [],
  bullets: [],
  ebullets: [],
  pickups: [],
  particles: [],
  texts: [],
  trails: [],
  rings: [],
  shake: 0,
  spawnTimer: 0,
  rerollCost: 0,
  offers: [],
  boss: null,
  itemsBought: 0,
  bossKilled: 0,
  runLog: [],
  curRun: null,
  waveStartTime: 0,
  speedMul: 1,
  pools: [],
  lightnings: [],
};

const WEAPONS = {
  pistol:  { name: '手枪',     price: 15, dmg: 8,  cd: 0.75, range: 330, spd: 520, pellets: 1, spread: 0,    pierce: 0, aoe: 0,  color: '#e8e8e8', maxTier: 26, desc: '每级命中分裂几率 +4% (最高80%)' },
  smg:     { name: '冲锋枪',   price: 30, dmg: 4,  cd: 0.14, range: 270, spd: 560, pellets: 1, spread: 0.18, pierce: 0, aoe: 0,  color: '#ffd166', maxTier: 31, desc: '每级 +2% 几率额外射出随机武器子弹 (最高50%)' },
  shotgun: { name: '霰弹枪',   price: 35, dmg: 5,  cd: 1.25, range: 215, spd: 480, pellets: 5, spread: 0.45, pierce: 0, aoe: 0,  color: '#f4a261', maxTier: 26, desc: '每 2 级弹丸 +1 颗 (最多+10)' },
  sniper:  { name: '狙击枪',   price: 45, dmg: 32, cd: 2.0,  range: 540, spd: 900, pellets: 1, spread: 0,    pierce: 3, aoe: 0,  color: '#ffe066', maxTier: 31, desc: '曳光弹。每级暴击率 +3% (最高75%)，暴击3倍伤害' },
  laser:   { name: '激光枪',   price: 50, dmg: 12, cd: 0.5,  range: 360, spd: 720, pellets: 1, spread: 0,    pierce: 2, aoe: 0,  color: '#ff4d4d', maxTier: 34, desc: '每级子弹体积 +25% (最大8倍)' },
  rocket:  { name: '火箭筒',   price: 55, dmg: 26, cd: 1.8,  range: 380, spd: 420, pellets: 1, spread: 0,    pierce: 0, aoe: 75, color: '#e63946', maxTier: 26, desc: '范围爆炸。每级爆炸范围 +20% (最大5倍)' },
  flame:   { name: '火焰喷射器', price: 40, dmg: 3,   cd: 0.06, range: 180, spd: 460, pellets: 1, spread: 0.22, pierce: 6,  aoe: 0,  color: '#ff6b35', maxTier: 26, desc: '近距离高射速穿透火焰，施加燃烧 DoT' },
  frost:   { name: '冰冻弹',   price: 38, dmg: 16, cd: 0.55, range: 360, spd: 580, pellets: 1, spread: 0,    pierce: 2, aoe: 0,  color: '#eaf4f4', maxTier: 26, desc: '命中减速 50% 持续 2 秒，每级减速时间 +0.1s' },
  chain:   { name: '闪电雷',   price: 50, dmg: 22, cd: 0.7,  range: 300, spd: 0,    pellets: 1, spread: 0,    pierce: 0, aoe: 0,  color: '#ffe66d', maxTier: 26, desc: '瞬时连锁电击，每级 +1 跳跃数 (基础 3 跳)' },
  molotov: { name: '燃烧瓶',   price: 45, dmg: 30, cd: 1.4,  range: 350, spd: 380, pellets: 1, spread: 0,    pierce: 0, aoe: 50, color: '#ff9e00', maxTier: 26, desc: '落地留下 4 秒火焰池，每级持续时间 +0.3s' },
};

const ITEMS = {
  armor:    { name: '护甲板',   price: 22, desc: '受到的伤害 -1',        apply: p => p.armor += 1 },
  heart:    { name: '大心脏',   price: 26, desc: '生命上限 +20 并回复 20', apply: p => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); } },
  coffee:   { name: '浓缩咖啡', price: 24, desc: '攻击速度 +10% (上限+100%)', apply: p => p.atkSpd = Math.min(2.0, p.atkSpd + 0.10) },
  boots:    { name: '跑鞋',     price: 18, desc: '移动速度 +8%',         apply: p => p.speed *= 1.08 },
  magnet:   { name: '磁铁',     price: 15, desc: '拾取范围 +40',         apply: p => p.pickup += 40 },
  dumbbell: { name: '哑铃',     price: 28, desc: '所有伤害 +15%',        apply: p => p.dmgMult += 0.15 },
  leaf:     { name: '再生叶',   price: 30, desc: '每秒回复 0.6 生命',    apply: p => p.regen += 0.6 },
  clover:   { name: '幸运草',   price: 25, desc: '金币获取 +20%',        apply: p => p.goldMult += 0.20 },
};

const ENEMY_TYPES = {
  zombie:   { name: '僵尸',   hp: 12, speed: 62,  dmg: 6,  r: 12, gold: 1, color: '#3d5a2e', weight: 10, minWave: 1 },
  bat:      { name: '蝙蝠',   hp: 7,  speed: 118, dmg: 4,  r: 9,  gold: 1, color: '#8d5524', weight: 6,  minWave: 2 },
  tank:     { name: '重装兵', hp: 48, speed: 36,  dmg: 14, r: 18, gold: 3, color: '#a8794a', weight: 3,  minWave: 3 },
  shooter:  { name: '射手',   hp: 16, speed: 46,  dmg: 6,  r: 11, gold: 2, color: '#c96f4a', weight: 4,  minWave: 4, shoot: true },
  slime:    { name: '粘液怪', hp: 35, speed: 45,  dmg: 5,  r: 13, gold: 2, color: '#7a9b2e', weight: 5,  minWave: 3, split: 0.6 },
  spider:   { name: '蜘蛛',   hp: 10, speed: 138, dmg: 5,  r: 10, gold: 1, color: '#5d4037', weight: 6,  minWave: 4, zigzag: true },
  bomber:   { name: '自爆虫', hp: 22, speed: 80,  dmg: 14, r: 13, gold: 2, color: '#c76a2e', weight: 4,  minWave: 6, explode: 60 },
  shielder: { name: '守卫者', hp: 75, speed: 38,  dmg: 9,  r: 17, gold: 4, color: '#6b7d6e', weight: 3,  minWave: 7, armor: 0.5 },
  brute:    { name: '暴徒',   hp: 110, speed: 32, dmg: 22, r: 20, gold: 5, color: '#7a2e1d', weight: 2,  minWave: 9 },
  hunter:   { name: '猎手',   hp: 50, speed: 60,  dmg: 8,  r: 14, gold: 3, color: '#c96f4a', weight: 3,  minWave: 11, shoot: true },
};

const BOSS_BASE_HP = 3600;

const BOSSES = {
  behemoth:   { name: '年兽',     speed: 52, dmg: 22, r: 34, gold: 60, color: '#a32026', ai: 'behemoth' },
  summoner:   { name: '道士',     speed: 65, dmg: 12, r: 27, gold: 60, color: '#c19a1a', ai: 'summoner' },
  bulletlord: { name: '机关傀儡', speed: 38, dmg: 10, r: 30, gold: 60, color: '#8a6a3a', ai: 'bulletlord' },
};

function newPlayer() {
  return {
    x: W / 2, y: H / 2, r: 13,
    hp: 100, maxHp: 100,
    speed: 175, armor: 0, regen: 0,
    dmgMult: 1, atkSpd: 1, pickup: 70, goldMult: 1,
    weapons: [{ id: 'pistol', tier: 1, cd: 0, angle: 0 }],
    hurtCd: 0, regenAcc: 0, faceX: 1,
    items: {},
  };
}

function rand(a, b) { return a + Math.random() * (b - a); }
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function weaponStats(w) {
  const d = WEAPONS[w.id];
  const t = w.tier - 1;
  return {
    dmg: d.dmg * Math.pow(1.5, t),
    cd: d.cd * Math.pow(0.9, t),
    range: d.range + t * 20,
  };
}

function weaponPrice(id) {
  return Math.round(WEAPONS[id].price * Math.pow(1.15, Math.max(0, G.wave - 1)));
}
function itemPrice(id) {
  const n = (G.player && G.player.items && G.player.items[id]) || 0;
  return Math.round(ITEMS[id].price * Math.pow(1.15, Math.max(0, G.wave - 1)) * Math.pow(1.15, n));
}

function enemyHpScale(wave) {
  let v = 1.0;
  for (let w = 2; w <= wave; w++) {
    if (w === 11 || w === 21) { v *= 2; continue; }
    let g = 0.15;
    // 第 25 波后逐波衰减增长率，避免后段敌人血量爆炸。
    // 26→13% 27→11% 28→9% 29→7% 30→5%; 30+ 后封顶 5%。
    if (w > 25) g = Math.max(0.05, 0.15 - (w - 25) * 0.02);
    v *= 1 + g;
  }
  return v * Math.pow(1.5, G.bossKilled);
}

function bossHpScale(wave) {
  const base = enemyHpScale(wave);
  // 平衡目标（基于实际存档数据 run0）：
  //   wave 10 Boss kill ≈ 30 秒，DPS ~ 0.5K；multip=1
  //   wave 20 Boss kill ≈ 20-30 秒，DPS ~ 100K；multip=22 (使 HP 达 3M)
  //   wave 30 Boss kill ≈ 60-90 秒，DPS ~ 300K；multip=38 (使 HP 达 18M)
  // 由此保持 wave10 < boss20 < boss30，强度递增且不失控。
  if (wave === 20) return base * 22;
  if (wave === 30) return base * 38;
  return base;
}

const RUNLOG_KEY = '2dbrotato_runlog_v1';

function loadRunLog() {
  try {
    const data = localStorage.getItem(RUNLOG_KEY);
    G.runLog = data ? JSON.parse(data) : [];
  } catch (e) { G.runLog = []; }
}

function saveRunLog() {
  try { localStorage.setItem(RUNLOG_KEY, JSON.stringify(G.runLog)); } catch (e) {}
}

const MAX_RUNS = 30;
function pushRun(run) {
  G.runLog.push(run);
  if (G.runLog.length > MAX_RUNS) G.runLog.shift();
  saveRunLog();
}

loadRunLog();

function snapshotPlayer(p) {
  return {
    hp: Math.round(p.hp * 10) / 10, maxHp: p.maxHp,
    dmgMult: Math.round(p.dmgMult * 1000) / 1000,
    atkSpd: Math.round(p.atkSpd * 1000) / 1000,
    speed: Math.round(p.speed), armor: p.armor,
    regen: Math.round(p.regen * 100) / 100,
    pickup: p.pickup, goldMult: Math.round(p.goldMult * 1000) / 1000,
    weapons: p.weapons.map(w => ({ id: w.id, tier: w.tier })),
    items: Object.assign({}, p.items),
  };
}

function startRunLog() {
  G.curRun = {
    id: Date.now(),
    started: new Date().toISOString(),
    result: 'active',
    finalWave: 0,
    totalKills: 0,
    totalGold: 0,
    waves: [],
  };
}

function recordWaveStart() {
  if (!G.curRun) return;
  const p = G.player;
  G.curRun.waves.push({
    wave: G.wave,
    startSnapshot: snapshotPlayer(p),
    enemyHpScale: Math.round(enemyHpScale(G.wave) * 1000) / 1000,
    isBossWave: G.wave % 10 === 0,
    enemyKills: [],
    bossKillTime: null,
    waveDuration: 0,
    endSnapshot: null,
  });
}

function recordEnemyKill(killTime) {
  if (!G.curRun || !G.curRun.waves.length) return;
  G.curRun.waves[G.curRun.waves.length - 1].enemyKills.push(
    Math.round(killTime * 10) / 10
  );
}

function recordBossKill(killTime) {
  if (!G.curRun || !G.curRun.waves.length) return;
  G.curRun.waves[G.curRun.waves.length - 1].bossKillTime =
    Math.round(killTime * 10) / 10;
}

function recordWaveEnd(duration) {
  if (!G.curRun || !G.curRun.waves.length) return;
  const w = G.curRun.waves[G.curRun.waves.length - 1];
  w.waveDuration = Math.round(duration * 10) / 10;
  w.endSnapshot = snapshotPlayer(G.player);
}

function finalizeRun(result) {
  if (!G.curRun) return;
  G.curRun.result = result;
  G.curRun.finalWave = G.wave;
  G.curRun.totalKills = G.kills;
  G.curRun.totalGold = G.gold;
  G.curRun.ended = new Date().toISOString();
  pushRun(G.curRun);
  G.curRun = null;
}

function avgEnemyKillTime(waveData) {
  if (!waveData.enemyKills.length) return 0;
  return waveData.enemyKills.reduce((s, x) => s + x, 0) / waveData.enemyKills.length;
}

function sumEnemyKills(waveData) {
  return waveData.enemyKills.length;
}

window._dbgRunStats = {
  snapshotPlayer, enemyHpScale,
  avgOf: arr => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0,
};
