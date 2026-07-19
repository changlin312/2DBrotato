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
  G.trails = []; G.rings = [];
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
  G.shake = 0;
  G.boss = null;
  G.spawnTimer = 0.5;
  p.x = W / 2; p.y = H / 2;
  p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
  G.state = 'play';
  G.waveStartTime = performance.now();
  recordWaveStart();
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
  for (const pk of G.pickups) if (pk.type === 'gold') collectPickup(pk);
  if (G.wave >= MAX_WAVE) { victory(); return; }
  openShop();
}

function victory() {
  G.state = 'over';
  finalizeRun('victory');
  document.getElementById('v-info').innerHTML =
    `你在 ${MAX_WAVE} 波敌潮中活了下来！<br>总击杀: ${G.kills} · 剩余金币: ${G.gold}`;
  victoryEl.classList.remove('hidden');
}

function gameOver() {
  G.state = 'over';
  finalizeRun('death');
  document.getElementById('go-info').innerHTML =
    `你在第 <b>${G.wave}</b> 波倒下了<br>总击杀: ${G.kills} · 剩余金币: ${G.gold}`;
  goEl.classList.remove('hidden');
}

function spawnEnemy() {
  const pool = Object.values(ENEMY_TYPES).filter(d => G.wave >= d.minWave);
  let total = pool.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total, def = pool[0];
  for (const d of pool) { r -= d.weight; if (r <= 0) { def = d; break; } }

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
    x, y, r: elite ? def.r * 1.3 : def.r, def,
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
  const hps = enemyHpScale(G.wave);
  const boss = {
    x: W / 2, y: 80, r: def.r, def, isBoss: true,
    hp: BOSS_BASE_HP * hps, maxHp: BOSS_BASE_HP * hps,
    dmg: def.dmg * (1 + 0.05 * (G.wave - 1)),
    speed: def.speed,
    hitCd: 0, aiT: 2.5, aimT: 1.2, warnT: 0.4,
    state: 'move', stateT: 3, vx: 0, vy: 0,
  };
  G.enemies.push(boss);
  G.boss = boss;
  G.texts.push({
    x: W / 2, y: H / 2 - 60, txt: `BOSS — ${def.name}`,
    color: '#ff5d5d', vy: -12, life: 2, maxLife: 2, size: 34,
  });
}

function updateBoss(e, dt, p) {
  const a = Math.atan2(p.y - e.y, p.x - e.x);
  const d = Math.hypot(p.x - e.x, p.y - e.y);

  if (e.def.ai === 'behemoth') {
    e.stateT -= dt;
    if (e.state === 'move') {
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
      if (e.stateT <= 0) { e.state = 'tele'; e.stateT = 0.6; e.aimX = p.x; e.aimY = p.y; }
    } else if (e.state === 'tele') {
      e.flash = 0.05;
      e.vx = Math.cos(a) * e.speed * 7;
      e.vy = Math.sin(a) * e.speed * 7;
      if (e.stateT <= 0) { e.state = 'dash'; e.stateT = 0.7; }
    } else {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.stateT <= 0) { e.state = 'move'; e.stateT = 3; }
    }
  } else if (e.def.ai === 'summoner') {
    if (d > 280) { e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; }
    else if (d < 180) { e.x -= Math.cos(a) * e.speed * dt; e.y -= Math.sin(a) * e.speed * dt; }
    e.aiT -= dt;
    if (e.aiT <= 0) {
      e.aiT = 3.2;
      e.flash = 0.15;
      const pool = ['zombie', 'bat', 'shooter'];
      for (let i = 0; i < 3; i++) {
        const def = ENEMY_TYPES[pool[Math.floor(Math.random() * pool.length)]];
        const sa = rand(0, Math.PI * 2);
        const hps = enemyHpScale(G.wave);
        G.enemies.push({
          x: clamp(e.x + Math.cos(sa) * 60, 10, W - 10),
          y: clamp(e.y + Math.sin(sa) * 60, 10, H - 10),
          r: def.r, def,
          hp: def.hp * hps,
          maxHp: def.hp * hps,
          dmg: def.dmg * (1 + 0.05 * (G.wave - 1)),
          speed: def.speed * rand(0.9, 1.1),
          hitCd: 0, shootCd: rand(1, 2.5),
        });
      }
      boom(e.x, e.y, '#c77dff', 12);
    }
  } else if (e.def.ai === 'bulletlord') {
    e.x += Math.cos(a) * e.speed * dt;
    e.y += Math.sin(a) * e.speed * dt;
    e.aiT -= dt;
    e.aimT -= dt;
    e.warnT -= dt;
    if (e.aiT <= 0) {
      e.aiT = 2.6;
      e.warnT = 0.35;
      e.warnRings = 3;
      e.warnX = e.x; e.warnY = e.y;
    }
    if (e.warnT <= 0 && e.warnRings > 0) {
      e.warnRings--;
      e.warnT = 0.35;
    }
    if (e.warnRings <= 0 && e.warnT === 0.35) {
      e.flash = 0.15;
      e.warnT = -1;
      const n = 16;
      for (let i = 0; i < n; i++) {
        const ba = (i / n) * Math.PI * 2;
        G.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 170, vy: Math.sin(ba) * 170, dmg: e.dmg, life: 4 });
      }
    }
    if (e.aimT <= 0) {
      e.aimT = 1.3;
      e.aimWarn = 0.3;
      e.aimWarnRings = 1;
    }
    if (e.aimWarn > 0) {
      e.aimWarn -= dt;
      if (e.aimWarn <= 0) {
        for (let i = -1; i <= 1; i++) {
          const ba = a + i * 0.18;
          G.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 260, vy: Math.sin(ba) * 260, dmg: e.dmg, life: 3 });
        }
      }
    }
  }

  e.x = clamp(e.x, e.r, W - e.r);
  e.y = clamp(e.y, e.r, H - e.r);
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
  }
}

function collectPickup(pk) {
  const p = G.player;
  if (pk.type === 'gold') {
    G.gold += Math.max(1, Math.round(pk.value * p.goldMult));
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
    range: (d.range + t * 20) * 1.15, traveled: 0,
    color: d.color, hits: [], wid, tier,
    br: wid === 'laser' ? 5 * Math.min(8, 1 + 0.25 * t) : 4,
    crit: wid === 'sniper' ? Math.min(0.75, 0.03 * t) : 0,
    split: wid === 'pistol' ? Math.min(0.8, 0.04 * t) : 0,
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
  let pellets = d.pellets;
  let spreadMul = 1;
  if (w.id === 'shotgun') {
    pellets += Math.min(10, Math.floor(t / 2));
    spreadMul = Math.max(0.05, 1 - 0.05 * t);
  }
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
  for (let i = 0; i < 24; i++) {
    const a = rand(0, Math.PI * 2), s = rand(60, 320);
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r: rand(2, 6), color: ['#ff9f1c', '#ffbf69', '#e63946', '#fff3b0'][Math.floor(rand(0, 4))],
      life: rand(0.25, 0.6), maxLife: 0.6,
    });
  }
  for (let i = 0; i < 8; i++) {
    const a = rand(0, Math.PI * 2), s = rand(20, 70);
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
      r: rand(4, 8), color: '#555', life: rand(0.4, 0.8), maxLife: 0.8,
    });
  }
  for (const e of G.enemies) {
    if (!e.dead && dist2(x, y, e.x, e.y) < radius * radius) damageEnemy(e, dmg);
  }
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
    }
    if (b.traveled > b.range || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
      if (b.wid === 'rocket') explode(b.x, b.y, b.aoe, b.dmg);
      b.dead = true; continue;
    }
    for (const e of G.enemies) {
      if (e.dead || b.hits.includes(e)) continue;
      if (dist2(b.x, b.y, e.x, e.y) < (e.r + b.br) * (e.r + b.br)) {
        if (b.wid === 'rocket') {
          explode(b.x, b.y, b.aoe, b.dmg);
          b.dead = true;
        } else {
          if (b.wid === 'sniper') SFX.sniperHit();
          else if (b.wid === 'laser') SFX.laserHit();
          let dmg = b.dmg, crit = false;
          if (b.crit && Math.random() < b.crit) { dmg *= 3; crit = true; }
          damageEnemy(e, dmg, crit);
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
    if (e.isBoss) {
      updateBoss(e, dt, p);
    } else if (e.def.shoot && d2 < 300 * 300) {
      e.shootCd -= dt;
      if (d2 > 180 * 180) { e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; }
      if (e.shootCd <= 0) {
        e.shootCd = 2.2;
        G.ebullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, dmg: e.dmg, life: 3 });
      }
    } else {
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
    }
    if (e.hitCd > 0) e.hitCd -= dt;
    if (e.hitCd <= 0 && d2 < (e.r + p.r) * (e.r + p.r)) {
      e.hitCd = 0.8;
      hurtPlayer(e.dmg);
    }
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
  if (G.shake > 0) G.shake -= dt;

  G.enemies = G.enemies.filter(e => !e.dead);
  G.bullets = G.bullets.filter(b => !b.dead);
  G.ebullets = G.ebullets.filter(b => !b.dead);
  G.pickups = G.pickups.filter(pk => !pk.dead);
  G.particles = G.particles.filter(pt => !pt.dead);
  G.texts = G.texts.filter(tx => !tx.dead);
  G.trails = G.trails.filter(tr => !tr.dead);
  G.rings = G.rings.filter(rg => !rg.dead);
}

function hurtPlayer(dmg) {
  const p = G.player;
  const real = Math.max(1, dmg - p.armor);
  p.hp -= real;
  p.hurtCd = 0.4;
  G.shake = 0.25;
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
function loop(t) {
  const dt = Math.min(0.033, (t - lastT) / 1000);
  lastT = t;
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
