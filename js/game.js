const keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

const menuEl = document.getElementById('menu');
const goEl = document.getElementById('gameover');
const victoryEl = document.getElementById('victory');
document.getElementById('btn-start').onclick = startGame;
document.getElementById('btn-restart').onclick = () => {
  goEl.classList.add('hidden');
  startGame();
};
document.getElementById('btn-menu').onclick = () => {
  victoryEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  if (G.curRun && G.curRun.result === 'active' && G.curRun.waves.length > 0) {
    finalizeRun('abandoned');
  } else {
    G.curRun = null;
  }
  G.state = 'menu';
  G.player = null;
  G.enemies = []; G.bullets = []; G.ebullets = [];
  G.pickups = []; G.particles = []; G.texts = [];
  G.trails = []; G.rings = []; G.pools = []; G.lightnings = [];
  G.hazards = []; G.lasers = [];
  G.boss = null;
};

function startGame() {
  menuEl.classList.add('hidden');
  G.player = newPlayer();
  G.wave = 0;
  G.gold = 25;
  G.kills = 0;
  G.itemsBought = 0;
  G.bossKilled = 0;
  G.offers = [];
  G.speedMul = 1;
  btnSpeed.textContent = '1x';
  startRunLog();
  startWave();
}

function startWave() {
  const p = G.player;
  G.wave++;
  G.waveTimer = WAVE_TIME;
  G.enemies = [];
  G.bullets = [];
  G.ebullets = [];
  G.pickups = [];
  G.particles = [];
  G.texts = [];
  G.trails = [];
  G.rings = [];
  G.pools = [];
  G.lightnings = [];
  G.hazards = [];
  G.lasers = [];
  G.shake = 0;
  G.boss = null;
  G.spawnTimer = 0.5;
  p.x = W / 2; p.y = H / 2;
  p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
  G.state = 'play';
  G.waveStartTime = performance.now();
  recordWaveStart();
  SFX.waveStart();
  if (G.wave % 10 === 0) spawnBoss();
}

function waveElapsed() {
  return (performance.now() - G.waveStartTime) / 1000;
}

function endWave() {
  const dur = waveElapsed();
  recordWaveEnd(dur);
  G.state = 'shop';
  G.gold += 8 + G.wave * 2;
  // 摇钱树年金：波数 × (10 + 5 × (持有数 - 1))
  const trees = (G.player.items.tree || 0);
  if (trees > 0) {
    const bonus = G.wave * (10 + 5 * (trees - 1));
    G.gold += bonus;
    G.texts.push({
      x: W / 2, y: 90, txt: `摇钱树 +${bonus}`,
      color: '#e8b04b', vy: -20, life: 1.5, maxLife: 1.5, size: 18,
    });
    SFX.buy();
  }
  for (const pk of G.pickups) if (pk.type === 'gold') collectPickup(pk);
  if (G.wave >= MAX_WAVE) { victory(); return; }
  openShop();
}

function victory() {
  G.state = 'over';
  finalizeRun('victory');
  SFX.victory();
  document.getElementById('v-info').innerHTML =
    `你在 ${MAX_WAVE} 波敌潮中活了下来！<br>总击杀: ${G.kills} · 剩余金币: ${G.gold}`;
  victoryEl.classList.remove('hidden');
}

function gameOver() {
  G.state = 'over';
  finalizeRun('death');
  SFX.gameOver();
  document.getElementById('go-info').innerHTML =
    `你在第 <b>${G.wave}</b> 波倒下了<br>总击杀: ${G.kills} · 剩余金币: ${G.gold}`;
  goEl.classList.remove('hidden');
}

function spawnEnemy() {
  const pool = Object.entries(ENEMY_TYPES).filter(([id, d]) => G.wave >= d.minWave);
  let total = pool.reduce((s, [, d]) => s + d.weight, 0);
  let r = Math.random() * total, picked = pool[0];
  for (const entry of pool) { r -= entry[1].weight; if (r <= 0) { picked = entry; break; } }
  const [eid, def] = picked;

  let x, y;
  const side = Math.floor(Math.random() * 4);
  if (side === 0) { x = rand(0, W); y = -20; }
  else if (side === 1) { x = rand(0, W); y = H + 20; }
  else if (side === 2) { x = -20; y = rand(0, H); }
  else { x = W + 20; y = rand(0, H); }

  const hpScale = enemyHpScale(G.wave);
  const dmgScale = 1 + 0.05 * (G.wave - 1);
  const elite = G.wave >= 3 && Math.random() < 0.05;
  G.enemies.push({
    x, y, r: elite ? def.r * 1.3 : def.r, def, id: eid,
    hp: def.hp * hpScale * (elite ? 2.5 : 1),
    maxHp: def.hp * hpScale * (elite ? 2.5 : 1),
    dmg: def.dmg * dmgScale * (elite ? 1.5 : 1),
    speed: def.speed * rand(0.9, 1.1),
    hitCd: 0, shootCd: rand(1, 2.5),
    elite,
  });
}

function spawnBoss() {
  const ids = Object.keys(BOSSES);
  const def = BOSSES[ids[Math.floor(Math.random() * ids.length)]];
  const hps = bossHpScale(G.wave);
  const boss = {
    x: W / 2, y: 80, r: def.r, def, isBoss: true,
    hp: BOSS_BASE_HP * hps, maxHp: BOSS_BASE_HP * hps,
    dmg: def.dmg * (1 + 0.05 * (G.wave - 1)),
    speed: def.speed,
    hitCd: 0,
    // 共用冲撞系统
    state: 'move', stateT: 2.4, vx: 0, vy: 0,
    chargeT: 4 + Math.random() * 2,
    dashT: 0, dashAngle: 0, aimX: 0, aimY: 0,
    // 各自专项
    aiT: 3.0, aimT: 1.2, warnT: 0,
    laserT: 8 + Math.random() * 2,
    flameT: 6 + Math.random() * 2,
  };
  if (def.ai === 'summoner') boss.aiT = 4.0;
  G.enemies.push(boss);
  G.boss = boss;
  SFX.bossSpawn();
  G.texts.push({
    x: W / 2, y: H / 2 - 60, txt: `BOSS — ${def.name}`,
    color: '#ff5d5d', vy: -12, life: 2, maxLife: 2, size: 34,
  });
}

// 统一冲撞：telegraph 0.5s → 突进 0.6s → 恢复
// 突进时沿垂直于冲撞方向每 0.1s 喷射放射性弹幕
function bossChargeCommon(e, dt, p) {
  if (e.state === 'move') {
    e.chargeT -= dt;
    if (e.chargeT <= 0) {
      e.state = 'tele';
      e.stateT = 0.5;
      e.aimX = p.x; e.aimY = p.y;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      e.dashAngle = a;
    }
  } else if (e.state === 'tele') {
    e.flash = 0.08;
    e.stateT -= dt;
    if (e.stateT <= 0) {
      e.state = 'dash';
      e.stateT = 0.6;
      const sp = e.speed * 7;
      e.vx = Math.cos(e.dashAngle) * sp;
      e.vy = Math.sin(e.dashAngle) * sp;
      e.dashT = 0;
    }
  } else if (e.state === 'dash') {
    e.stateT -= dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.dashT -= dt;
    if (e.dashT <= 0) {
      // 沿垂直方向放射性弹幕（4 颗扇开）
      const perp = e.dashAngle + Math.PI / 2;
      for (let i = -1; i <= 1; i++) {
        const aa = perp + i * 0.35;
        G.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(aa) * 200, vy: Math.sin(aa) * 200, dmg: e.dmg * 0.8, life: 2 });
      }
      // 沿冲撞轨迹抛撒火力点
      G.ebullets.push({
        x: e.x, y: e.y,
        vx: -Math.cos(e.dashAngle) * 60, vy: -Math.sin(e.dashAngle) * 60,
        dmg: e.dmg * 0.6, life: 1.5,
      });
      e.dashT = 0.08;
    }
    if (e.stateT <= 0) {
      e.state = 'move';
      e.stateT = 2.4;
      e.chargeT = 4 + Math.random() * 2;
      e.vx = 0; e.vy = 0;
    }
  }
}

function updateBoss(e, dt, p) {
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  const d = Math.hypot(p.x - e.x, p.y - e.y);

  // ===== 共用冲撞 =====
  bossChargeCommon(e, dt, p);
  // 非冲撞阶段才执行专项行动
  if (e.state !== 'move') {
    e.x = clamp(e.x, e.r, W - e.r);
    e.y = clamp(e.y, e.r, H - e.r);
    return;
  }

  // ===== 各 Boss 日常行为（仅在 move 状态触发）=====
  if (e.def.ai === 'behemoth') {
    e.stateT -= dt;
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    if (e.stateT <= 0) e.stateT = 2.4;
  } else if (e.def.ai === 'summoner') {
    if (d > 280) { e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; }
    else if (d < 180) { e.x -= Math.cos(a) * e.speed * dt; e.y -= Math.sin(a) * e.speed * dt; }
    // 召唤 minions
    e.aiT -= dt;
    if (e.aiT <= 0) {
      e.aiT = 4.2;
      e.flash = 0.15;
      const pool = ['zombie', 'bat', 'shooter'];
      for (let i = 0; i < 3; i++) {
        const mid = pool[Math.floor(Math.random() * pool.length)];
        const def = ENEMY_TYPES[mid];
        const sa = rand(0, Math.PI * 2);
        const hps = enemyHpScale(G.wave);
        G.enemies.push({
          x: clamp(e.x + Math.cos(sa) * 60, 10, W - 10),
          y: clamp(e.y + Math.sin(sa) * 60, 10, H - 10),
          r: def.r, def, id: mid,
          hp: def.hp * hps, maxHp: def.hp * hps,
          dmg: def.dmg * (1 + 0.05 * (G.wave - 1)),
          speed: def.speed * rand(0.9, 1.1),
          hitCd: 0, shootCd: rand(1, 2.5),
        });
      }
      boom(e.x, e.y, '#e8b04b', 12);
    }
    // 紫火喷吐：每隔 6-8 秒在玩家附近落 4 个紫火坑
    e.flameT -= dt;
    if (e.flameT <= 0) {
      e.flameT = 7 + Math.random() * 2;
      e.flash = 0.2;
      for (let i = 0; i < 4; i++) {
        const tx = clamp(p.x + rand(-90, 90), 30, W - 30);
        const ty = clamp(p.y + rand(-90, 90), 30, H - 30);
        spawnHazard(tx, ty, 32, 3.5, e.dmg * 0.7);
      }
      SFX.explosion();
      boom(e.x, e.y, '#9d4edd', 16);
    }
  } else if (e.def.ai === 'bulletlord') {
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    // 环弹
    e.aiT -= dt;
    e.warnT -= dt;
    if (e.aiT <= 0) {
      e.aiT = 2.2;
      e.warnT = 0.5;
      e.warnRings = 2;
      e.warnX = e.x; e.warnY = e.y;
    }
    if (e.warnT <= 0 && e.warnRings > 0) {
      e.warnRings--;
      e.warnT = 0.5;
    }
    if (e.warnRings <= 0 && e.warnT === 0.5) {
      e.flash = 0.15;
      e.warnT = -1;
      const n = 16;
      for (let i = 0; i < n; i++) {
        const ba = (i / n) * Math.PI * 2;
        G.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 180, vy: Math.sin(ba) * 180, dmg: e.dmg, life: 4 });
      }
    }
    // 激光：朝玩家方向约 8-10 秒一次，0.5s 预警光束
    e.laserT -= dt;
    if (e.laserT <= 0) {
      e.laserT = 9 + Math.random() * 2;
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      spawnLaser(e.x, e.y, ang, 0.5, 0.7, e.dmg);
    }
  }

  e.x = clamp(e.x, e.r, W - e.r);
  e.y = clamp(e.y, e.r, H - e.r);
}

function spawnHazard(x, y, r, time, dps) {
  G.hazards.push({ x, y, r, time, maxTime: time, dps, tickT: 0, sparkT: 0 });
}

function spawnLaser(x, y, angle, warnTime, fireTime, dmg) {
  // 预警 → 期间沿 angle 方向持续推进 7 颗高速子弹
  G.lasers.push({ x, y, angle, warnT: warnTime, fireT: fireTime, tick: 0, dmg, x0: x, y0: y });
}

function boom(x, y, color, n, size) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), s = rand(30, 140);
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r: rand(1.5, size || 3.5), color, life: rand(0.2, 0.5), maxLife: 0.5,
    });
  }
}

function splitFlash(x, y, angle) {
  const perp = angle + Math.PI / 2;
  for (let d = -1; d <= 1; d += 2) {
    for (let i = 0; i < 2; i++) {
      const a = perp + d * 0.2;
      const s = rand(80, 220);
      G.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: rand(1.5, 3), color: '#ffffff', life: rand(0.1, 0.2), maxLife: 0.2,
      });
    }
  }
  G.rings.push({ x, y, r: 4, maxR: 30, life: 0.18, maxLife: 0.18 });
  G.rings.push({ x, y, r: 4, maxR: 20, life: 0.12, maxLife: 0.12 });
}

function damageEnemy(e, dmg, crit) {
  if (e.def.armor) dmg *= (1 - e.def.armor);
  e.hp -= dmg;
  e.flash = 0.1;
  SFX.enemyHit();
  G.texts.push({
    x: e.x + rand(-8, 8), y: e.y - e.r - 4,
    txt: (crit ? '暴击 ' : '') + Math.round(dmg),
    color: crit ? '#ff6b35' : '#ffe066',
    vy: crit ? -70 : -50, life: crit ? 0.8 : 0.6, maxLife: crit ? 0.8 : 0.6,
    size: crit ? 18 : 13,
  });
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    G.kills++;
    SFX.enemyDie();
    if (e.isBoss) {
      G.boss = null;
      G.bossKilled++;
      G.shake = 0.5;
      boom(e.x, e.y, e.def.color, 40, 6);
      const total = Math.max(1, Math.round(e.def.gold * (1 + 0.25 * (G.wave - 1))));
      for (let i = 0; i < 10; i++) {
        G.pickups.push({
          x: clamp(e.x + rand(-50, 50), 10, W - 10),
          y: clamp(e.y + rand(-50, 50), 10, H - 10),
          type: 'gold', value: Math.ceil(total / 10),
        });
      }
      G.pickups.push({ x: e.x, y: e.y, type: 'heal', value: 0 });
      recordBossKill(waveElapsed());
      endWave();
      return;
    }
    recordEnemyKill(waveElapsed());
    boom(e.x, e.y, e.def.color, 8);
    const type = Math.random() < 0.04 ? 'heal' : 'gold';
    const value = Math.max(1, Math.round(e.def.gold * (1 + 0.25 * (G.wave - 1))));
    G.pickups.push({ x: e.x, y: e.y, type, value });
    if (e.def.explode) {
      explode(e.x, e.y, e.def.explode, e.dmg);
    }
    if (e.def.split && !e.noSplit && Math.random() < e.def.split) {
      for (let i = 0; i < 2; i++) {
        const sa = rand(0, Math.PI * 2);
        const sm = Object.assign({}, e.def, { hp: e.def.hp * 0.4, r: e.def.r * 0.6, gold: Math.max(1, Math.round(e.def.gold * 0.5)) });
        G.enemies.push({
          x: clamp(e.x + Math.cos(sa) * 20, 10, W - 10),
          y: clamp(e.y + Math.sin(sa) * 20, 10, H - 10),
          r: sm.r, def: sm, id: e.id,
          hp: sm.hp * enemyHpScale(G.wave), maxHp: sm.hp * enemyHpScale(G.wave),
          dmg: e.dmg * 0.6,
          speed: e.speed * 1.2, hitCd: 0, shootCd: 1, noSplit: true,
        });
      }
    }
  }
}

function collectPickup(pk) {
  const p = G.player;
  if (pk.type === 'gold') {
    G.gold += Math.max(1, pk.value);
    SFX.coin();
  } else {
    p.hp = Math.min(p.maxHp, p.hp + 8);
  }
  pk.dead = true;
}

function makeBullet(wid, x, y, a, tier, dmgMult, opts) {
  const d = WEAPONS[wid];
  const t = tier - 1;
  return Object.assign({
    x, y,
    vx: Math.cos(a) * d.spd, vy: Math.sin(a) * d.spd,
    angle: a,
    dmg: d.dmg * Math.pow(1.5, t) * dmgMult,
    pierce: d.pierce,
    aoe: wid === 'rocket' ? d.aoe * Math.min(5, 1 + 0.2 * t) : d.aoe,
    poolTime: wid === 'molotov' ? 4 + 0.3 * t : 0,
    poolR: wid === 'molotov' ? d.aoe + t * 4 : 0,
    range: (d.range + t * 20) * 1.15, traveled: 0,
    color: d.color, hits: [], wid, tier,
    br: wid === 'laser' ? 5 * Math.min(8, 1 + 0.25 * t) : 4,
    crit: wid === 'sniper' ? Math.min(0.75, 0.03 * t) : 0,
    split: wid === 'pistol' ? Math.min(0.8, 0.04 * t) : 0,
    slow: wid === 'frost' ? 2.0 + 0.1 * t : 0,
    burn: wid === 'flame' ? { time: 1.2, dps: d.dmg * Math.pow(1.5, t) * dmgMult * 0.4 } : null,
    chain: wid === 'chain' ? 3 + Math.floor(t / 1) : 0,
    chainRange: 180,
  }, opts || {});
}

function fireWeapon(w, target) {
  const p = G.player;
  const d = WEAPONS[w.id];
  const st = weaponStats(w);
  const t = w.tier - 1;
  const baseAngle = Math.atan2(target.y - p.y, target.x - p.x);
  w.angle = baseAngle;
  for (let i = 0; i < 3; i++) {
    const ma = baseAngle + rand(-0.3, 0.3);
    G.particles.push({
      x: p.x + Math.cos(baseAngle) * 18, y: p.y + Math.sin(baseAngle) * 18,
      vx: Math.cos(ma) * rand(80, 180), vy: Math.sin(ma) * rand(80, 180),
      r: rand(1, 2.5), color: d.color, life: 0.12, maxLife: 0.12,
    });
  }
  if (w.id === 'chain') {
    const b = makeBullet('chain', p.x, p.y, baseAngle, w.tier, p.dmgMult);
    strikeChain(target, b);
    w.cd = st.cd / p.atkSpd;
    return;
  }
  let pellets = d.pellets;
  let spreadMul = 1;
  if (w.id === 'shotgun') {
    pellets += Math.min(10, Math.floor(t / 2));
    spreadMul = Math.max(0.05, 1 - 0.05 * t);
  }
  if (w.id === 'flame') pellets = 2;
  for (let i = 0; i < pellets; i++) {
    let a = baseAngle;
    if (pellets > 1) a += (i / (pellets - 1) - 0.5) * d.spread * 2 * spreadMul;
    else if (d.spread) a += rand(-d.spread * spreadMul, d.spread * spreadMul);
    const opts = w.id === 'shotgun' ? { range: (d.range + t * 20) * 1.15 * (1 + 0.15 * t) } : {};
    G.bullets.push(makeBullet(w.id, p.x, p.y, a, w.tier, p.dmgMult, opts));
  }
  if (w.id === 'smg' && Math.random() < Math.min(0.5, 0.02 * t)) {
    const others = Object.keys(WEAPONS).filter(id => id !== 'smg');
    const rid = others[Math.floor(Math.random() * others.length)];
    const owned = p.weapons.find(x => x.id === rid);
    G.bullets.push(makeBullet(rid, p.x, p.y, baseAngle, owned ? owned.tier : 1, p.dmgMult));
  }
  w.cd = st.cd / p.atkSpd;
}

function explode(x, y, radius, dmg) {
  SFX.explosion();
  G.shake = Math.max(G.shake, 0.2);
  G.rings.push({ x, y, r: 10, maxR: radius, life: 0.35, maxLife: 0.35 });
  // 主体散射火焰粒子（24 颗）
  for (let i = 0; i < 24; i++) {
    const a = rand(0, Math.PI * 2), s = rand(60, 320);
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r: rand(2, 6), color: ['#ff9f1c', '#ffbf69', '#e63946', '#fff3b0'][Math.floor(rand(0, 4))],
      life: rand(0.25, 0.6), maxLife: 0.6,
    });
  }
  // 烟灰上浮
  for (let i = 0; i < 8; i++) {
    const a = rand(0, Math.PI * 2), s = rand(20, 70);
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
      r: rand(4, 8), color: '#555', life: rand(0.4, 0.8), maxLife: 0.8,
    });
  }
  // 放射状 8 道火焰长尾（每道 5 颗串联）
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + rand(-0.1, 0.1);
    for (let k = 0; k < 5; k++) {
      const s = 140 + k * 40 + rand(-20, 20);
      G.particles.push({
        x: x + Math.cos(a) * k * 4, y: y + Math.sin(a) * k * 4,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        r: 3 + (4 - k) * 0.8, color: ['#ff9f1c', '#e63946', '#ffb703'][k % 3],
        life: 0.3 + k * 0.05, maxLife: 0.55,
      });
    }
  }
  for (const e of G.enemies) {
    if (!e.dead && dist2(x, y, e.x, e.y) < radius * radius) damageEnemy(e, dmg);
  }
}

function spawnInfernoPool(x, y, radius, dmg) {
  // 玩家持有 inferno 道具时，火箭爆炸留下燃烧池
  const n = G.player.items.inferno || 0;
  if (n <= 0) return;
  const time = 2 + 0.4 * n;
  const dps = dmg * 0.4;
  spawnPool(x, y, radius, time, dps);
}

function strikeChain(source, b) {
  const hit = [source];
  let last = source;
  for (let i = 0; i < b.chain; i++) {
    let next = null, nextD = b.chainRange * b.chainRange;
    for (const e of G.enemies) {
      if (e.dead || hit.includes(e)) continue;
      const d2 = dist2(last.x, last.y, e.x, e.y);
      if (d2 < nextD) { nextD = d2; next = e; }
    }
    if (!next) break;
    damageEnemy(next, b.dmg, false);
    if (b.slow > 0) next.slowTime = Math.max(next.slowTime || 0, b.slow);
    if (b.burn) { next.burnTime = Math.max(next.burnTime || 0, b.burn.time); next.burnDps = b.burn.dps; }
    G.lightnings.push({ x1: last.x, y1: last.y, x2: next.x, y2: next.y, life: 0.25, maxLife: 0.25 });
    hit.push(next);
    last = next;
  }
}

function spawnPool(x, y, r, time, dps) {
  G.pools.push({ x, y, r, time, maxTime: time, dps, tickT: 0,
    nextSpark: 0 });
}

function update(dt) {
  if (G.state !== 'play') return;
  const p = G.player;

  G.waveTimer -= dt;
  if (G.boss) {
    G.waveTimer = Math.max(G.waveTimer, 1);
  } else if (G.waveTimer <= 0) {
    endWave();
    return;
  }

  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    p.x = clamp(p.x + dx / len * p.speed * dt, p.r, W - p.r);
    p.y = clamp(p.y + dy / len * p.speed * dt, p.r, H - p.r);
    if (dx !== 0) p.faceX = dx > 0 ? 1 : -1;
  }

  if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  if (p.hurtCd > 0) p.hurtCd -= dt;

  G.spawnTimer -= dt;
  if (G.spawnTimer <= 0) {
    const count = 1 + Math.floor(G.wave / 4);
    for (let i = 0; i < count; i++) spawnEnemy();
    G.spawnTimer = Math.max(0.22, 0.95 * Math.pow(0.93, G.wave - 1)) * (G.boss ? 2.5 : 1);
  }

  for (const w of p.weapons) {
    w.cd -= dt;
    if (w.cd > 0) continue;
    const range = weaponStats(w).range;
    let best = null, bestD = range * range;
    for (const e of G.enemies) {
      const d2 = dist2(p.x, p.y, e.x, e.y);
      if (d2 < bestD) { bestD = d2; best = e; }
    }
    if (best) fireWeapon(w, best);
  }

  for (const b of G.bullets) {
    const px = b.x, py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.traveled += Math.hypot(b.vx, b.vy) * dt;
    if (b.wid === 'sniper') {
      G.trails.push({ x1: px, y1: py, x2: b.x, y2: b.y, life: 1, maxLife: 1, color: b.color, w: 2 });
    } else if (b.wid === 'rocket') {
      G.particles.push({
        x: b.x - Math.cos(b.angle) * 8 + rand(-2, 2),
        y: b.y - Math.sin(b.angle) * 8 + rand(-2, 2),
        vx: -Math.cos(b.angle) * 40 + rand(-20, 20),
        vy: -Math.sin(b.angle) * 40 + rand(-20, 20),
        r: rand(2, 4), color: Math.random() < 0.5 ? '#ff9f1c' : '#888',
        life: rand(0.15, 0.35), maxLife: 0.35,
      });
    } else if (b.wid === 'flame') {
      G.particles.push({
        x: b.x + rand(-4, 4), y: b.y + rand(-4, 4),
        vx: rand(-30, 30), vy: rand(-30, 30),
        r: rand(2, 5), color: Math.random() < 0.5 ? '#ff6b35' : '#ffd166',
        life: 0.2, maxLife: 0.2,
      });
    }
    if (b.traveled > b.range || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
      if (b.wid === 'rocket') { explode(b.x, b.y, b.aoe, b.dmg); spawnInfernoPool(b.x, b.y, b.aoe, b.dmg); }
      else if (b.wid === 'molotov') spawnPool(b.x, b.y, b.poolR, b.poolTime, b.dmg * 0.5);
      b.dead = true; continue;
    }
    for (const e of G.enemies) {
      if (e.dead || b.hits.includes(e)) continue;
      if (dist2(b.x, b.y, e.x, e.y) < (e.r + b.br) * (e.r + b.br)) {
        if (b.wid === 'rocket') {
          explode(b.x, b.y, b.aoe, b.dmg);
          spawnInfernoPool(b.x, b.y, b.aoe, b.dmg);
          b.dead = true;
        } else if (b.wid === 'molotov') {
          spawnPool(b.x, b.y, b.poolR, b.poolTime, b.dmg * 0.5);
          damageEnemy(e, b.dmg, false);
          b.dead = true;
        } else {
          if (b.wid === 'sniper') SFX.sniperHit();
          else if (b.wid === 'laser') SFX.laserHit();
          else if (b.wid === 'chain') SFX.laserHit();
          else if (b.wid === 'frost') { SFX.coin(); SFX.coin(); }
          let dmg = b.dmg, crit = false;
          if (b.crit && Math.random() < b.crit) { dmg *= 3; crit = true; }
          damageEnemy(e, dmg, crit);
          if (b.slow > 0) { e.slowTime = Math.max(e.slowTime || 0, b.slow); }
          if (b.burn) {
            e.burnTime = Math.max(e.burnTime || 0, b.burn.time);
            e.burnDps = b.burn.dps;
          }
          if (b.chain > 0) {
            strikeChain(e, b);
          }
          if (b.split && Math.random() < b.split) {
            const pistolW = p.weapons.find(w => w.id === 'pistol');
            const pt = pistolW ? pistolW.tier : 1;
            const sdmg = WEAPONS.pistol.dmg * Math.pow(1.5, pt - 1) * 1.5;
            for (let i = 0; i < 2; i++) {
              const sa = b.angle + rand(-1.1, 1.1);
              G.bullets.push(makeBullet('pistol', b.x, b.y, sa, pt, 1, {
                dmg: sdmg, split: 0, range: 200, hits: [e],
              }));
            }
            splitFlash(b.x, b.y, b.angle);
          }
          for (let i = 0; i < 4; i++) {
            const sa = Math.atan2(-b.vy, -b.vx) + rand(-0.8, 0.8);
            G.particles.push({
              x: b.x, y: b.y,
              vx: Math.cos(sa) * rand(60, 200), vy: Math.sin(sa) * rand(60, 200),
              r: rand(1, 2.5), color: b.color, life: rand(0.1, 0.25), maxLife: 0.25,
            });
          }
          b.hits.push(e);
          if (b.hits.length > b.pierce) b.dead = true;
        }
        if (b.dead) break;
      }
    }
  }

  for (const e of G.enemies) {
    if (e.dead) continue;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const d2 = dist2(e.x, e.y, p.x, p.y);
    let spd = e.speed;
    if (e.slowTime > 0) { spd *= 0.5; e.slowTime -= dt; }
    if (e.burnTime > 0) {
      e.hp -= e.burnDps * dt;
      e.burnTime -= dt;
      if (Math.random() < 0.5)
        G.particles.push({ x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r),
          vx: rand(-10, 10), vy: rand(-30, -10), r: rand(2, 3), color: '#ff6b35',
          life: 0.3, maxLife: 0.3 });
    }
    if (e.isBoss) {
      updateBoss(e, dt, p);
    } else if (e.def.shoot && d2 < 350 * 350) {
      e.shootCd -= dt;
      if (d2 > 180 * 180) { e.x += Math.cos(a) * spd * dt; e.y += Math.sin(a) * spd * dt; }
      if (e.shootCd <= 0) {
        e.shootCd = 2.2;
        const bv = 260 + G.wave * 6;
        G.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * bv, vy: Math.sin(a) * bv, dmg: e.dmg, life: 3 });
      }
    } else if (e.def.zigzag) {
      const za = a + Math.sin(performance.now() * 0.01 + e.x * 0.1) * 0.8;
      e.x += Math.cos(za) * spd * dt;
      e.y += Math.sin(za) * spd * dt;
    } else {
      e.x += Math.cos(a) * spd * dt;
      e.y += Math.sin(a) * spd * dt;
    }
    if (e.hitCd > 0) e.hitCd -= dt;
    if (e.hitCd <= 0 && d2 < (e.r + p.r) * (e.r + p.r)) {
      e.hitCd = 0.8;
      hurtPlayer(e.dmg);
      if (e.def.explode) {
        e.dead = true; recordEnemyKill(waveElapsed()); boom(e.x, e.y, e.def.color, 12, 4);
        explode(e.x, e.y, e.def.explode, e.dmg);
      }
    }
    if (e.hp <= 0 && !e.dead) damageEnemy(e, 0);
  }

  for (const b of G.ebullets) {
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; continue; }
    if (dist2(b.x, b.y, p.x, p.y) < (p.r + 5) * (p.r + 5)) {
      b.dead = true;
      hurtPlayer(b.dmg);
    }
  }

  for (const pk of G.pickups) {
    const d2 = dist2(pk.x, pk.y, p.x, p.y);
    if (d2 < p.pickup * p.pickup) {
      const a = Math.atan2(p.y - pk.y, p.x - pk.x);
      pk.x += Math.cos(a) * 340 * dt;
      pk.y += Math.sin(a) * 340 * dt;
    }
    if (d2 < (p.r + 8) * (p.r + 8)) collectPickup(pk);
  }

  for (const pt of G.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) pt.dead = true;
  }

  for (const e of G.enemies) if (e.flash > 0) e.flash -= dt;
  for (const tx of G.texts) {
    tx.y += tx.vy * dt;
    tx.life -= dt;
    if (tx.life <= 0) tx.dead = true;
  }
  for (const tr of G.trails) {
    tr.life -= dt;
    if (tr.life <= 0) tr.dead = true;
  }
  for (const rg of G.rings) {
    rg.life -= dt;
    if (rg.life <= 0) rg.dead = true;
  }
  for (const lt of G.lightnings) {
    lt.life -= dt;
    if (lt.life <= 0) lt.dead = true;
  }
  for (const pl of G.pools) {
    pl.time -= dt;
    pl.nextSpark -= dt;
    pl.tickT -= dt;
    if (pl.nextSpark <= 0) {
      pl.nextSpark = 0.08;
      G.particles.push({
        x: pl.x + rand(-pl.r, pl.r), y: pl.y + rand(-pl.r, pl.r),
        vx: rand(-20, 20), vy: rand(-50, -15),
        r: rand(1.5, 3), color: Math.random() < 0.5 ? '#ff6b35' : '#ffd166',
        life: 0.3, maxLife: 0.3,
      });
    }
    if (pl.tickT <= 0) {
      pl.tickT = 0.25;
      for (const e of G.enemies) {
        if (!e.dead && dist2(pl.x, pl.y, e.x, e.y) < pl.r * pl.r) {
          damageEnemy(e, pl.dps * 0.25, false);
          e.burnTime = Math.max(e.burnTime || 0, 1);
          e.burnDps = pl.dps;
        }
      }
    }
    if (pl.time <= 0) pl.dead = true;
  }
  // ===== 紫火坑危险池（伤害玩家）=====
  for (const hz of G.hazards) {
    hz.time -= dt;
    hz.tickT -= dt;
    hz.sparkT -= dt;
    if (hz.sparkT <= 0) {
      hz.sparkT = 0.06;
      G.particles.push({
        x: hz.x + rand(-hz.r, hz.r), y: hz.y + rand(-hz.r, hz.r),
        vx: rand(-25, 25), vy: rand(-50, -20),
        r: rand(2, 4), color: Math.random() < 0.5 ? '#9d4edd' : '#c77dff',
        life: 0.4, maxLife: 0.4,
      });
    }
    if (hz.tickT <= 0) {
      hz.tickT = 0.2;
      if (!G.player.dead && dist2(hz.x, hz.y, G.player.x, G.player.y) < hz.r * hz.r) {
        hurtPlayer(hz.dps * 0.2, true);
      }
    }
    if (hz.time <= 0) hz.dead = true;
  }
  // ===== 预警激光发射 =====
  for (const lz of G.lasers) {
    if (lz.warnT > 0) {
      lz.warnT -= dt;
      if (lz.warnT <= 0) {
        // 开始发射：每 0.04s 朝 angle 方向刷出一颗高速大型子弹
        lz.tick = 0;
        SFX.laserHit();
      }
    } else if (lz.fireT > 0) {
      lz.fireT -= dt;
      lz.tick -= dt;
      if (lz.tick <= 0) {
        lz.tick = 0.04;
        // 同时沿 angle 方向略带散布喷射 5 颗高速弹，模拟"光束流"
        for (let i = -2; i <= 2; i++) {
          const off = i * 0.02;
          const ba = lz.angle + off;
          G.ebullets.push({
            x: lz.x0, y: lz.y0,
            vx: Math.cos(ba) * 900, vy: Math.sin(ba) * 900,
            dmg: lz.dmg * 0.5, life: 0.6, beam: true,
          });
        }
      }
      if (lz.fireT <= 0) lz.dead = true;
    }
  }
  if (G.shake > 0) G.shake -= dt;

  G.enemies = G.enemies.filter(e => !e.dead);
  G.bullets = G.bullets.filter(b => !b.dead);
  G.ebullets = G.ebullets.filter(b => !b.dead);
  G.pickups = G.pickups.filter(pk => !pk.dead);
  G.particles = G.particles.filter(pt => !pt.dead);
  G.texts = G.texts.filter(tx => !tx.dead);
  G.trails = G.trails.filter(tr => !tr.dead);
  G.rings = G.rings.filter(rg => !rg.dead);
  G.lightnings = G.lightnings.filter(lt => !lt.dead);
  G.pools = G.pools.filter(pl => !pl.dead);
  G.hazards = G.hazards.filter(hz => !hz.dead);
  G.lasers = G.lasers.filter(lz => !lz.dead);
}

function hurtPlayer(dmg, noShake) {
  const p = G.player;
  if (!p || p.dead) return;
  const real = Math.max(1, dmg - p.armor);
  p.hp -= real;
  p.hurtCd = 0.4;
  if (!noShake) G.shake = 0.25;
  SFX.playerHit();
  G.texts.push({
    x: p.x, y: p.y - p.r - 8,
    txt: '-' + Math.round(real), color: '#ff5d5d',
    vy: -60, life: 0.7, maxLife: 0.7, size: 16,
  });
  boom(p.x, p.y, '#ff5d5d', 10);
  if (p.hp <= 0) gameOver();
}

let lastT = performance.now();
const FIXED_DT = 1 / 120;
function loop(t) {
  const realDt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  let simTime = realDt * G.speedMul;
  let steps = 0;
  while (simTime > 0 && steps < 480) {
    const d = Math.min(FIXED_DT, simTime);
    update(d);
    simTime -= d;
    steps++;
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

const SPEED_LEVELS = [1, 2, 4, 8];
const btnSpeed = document.getElementById('btn-speed');
btnSpeed.onclick = () => {
  const i = (SPEED_LEVELS.indexOf(G.speedMul) + 1) % SPEED_LEVELS.length;
  G.speedMul = SPEED_LEVELS[i];
  btnSpeed.textContent = `${G.speedMul}x`;
};
