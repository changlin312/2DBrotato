const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

// 墨色星野背景（离线画布，只绘制一次）：宣纸黑底 + 鎏金星点 + 流云弧 + 淡金经纬
const bgCanvas = document.createElement('canvas');
bgCanvas.width = W; bgCanvas.height = H;
(function paintBG() {
  const g = bgCanvas.getContext('2d');
  g.fillStyle = '#17120d';
  g.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.strokeStyle = 'rgba(232,176,75,0.045)';
  g.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y <= H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let i = 0; i < 110; i++) {
    const x = rnd() * W, y = rnd() * H;
    const r = rnd() < 0.85 ? 1 : 1.8;
    g.fillStyle = `rgba(232,176,75,${0.05 + rnd() * 0.13})`;
    g.fillRect(x, y, r, r);
  }
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W, y = rnd() * H, r = 1 + rnd() * 2;
    g.fillStyle = `rgba(87,204,153,${0.04 + rnd() * 0.08})`;
    g.fillRect(x, y, r, r);
  }
  g.strokeStyle = 'rgba(200,140,60,0.05)';
  g.lineWidth = 14;
  for (let i = 0; i < 4; i++) {
    const cx = rnd() * W, cy = rnd() * H, cr = 120 + rnd() * 200;
    g.beginPath();
    g.arc(cx, cy, cr, rnd() * Math.PI * 2, rnd() * Math.PI * 2 + 1.2);
    g.stroke();
  }
})();

function render() {
  ctx.clearRect(0, 0, W, H);

  ctx.save();
  if (G.shake > 0) {
    const s = G.shake * 14;
    ctx.translate(rand(-s, s), rand(-s, s));
  }

  ctx.drawImage(bgCanvas, 0, 0);

  if (!G.player) { ctx.restore(); return; }
  const p = G.player;

  for (const pk of G.pickups) {
    ctx.fillStyle = pk.type === 'heal' ? '#57cc99' : '#e8b04b';
    ctx.beginPath();
    const r = pk.type === 'heal' ? 6 : Math.min(7, 3.5 + pk.value * 0.3);
    ctx.arc(pk.x, pk.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (pk.type === 'heal') {
      ctx.fillStyle = '#17120d';
      ctx.fillRect(pk.x - 1, pk.y - 4, 2, 8);
      ctx.fillRect(pk.x - 4, pk.y - 1, 8, 2);
    }
  }

  for (const pl of G.pools) {
    const a = clamp(pl.time / pl.maxTime, 0, 1);
    // 渐变中心高亮 → 边缘无淡
    const g = ctx.createRadialGradient(pl.x, pl.y, 0, pl.x, pl.y, pl.r);
    g.addColorStop(0, `rgba(255, 200, 80, ${0.5 * a})`);
    g.addColorStop(0.4, `rgba(255, 130, 40, ${0.35 * a})`);
    g.addColorStop(0.85, `rgba(180, 60, 10, ${0.15 * a})`);
    g.addColorStop(1, 'rgba(120, 30, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
    ctx.fill();
    // 不规则暗斑（火焰纹理）
    for (let s = 0; s < 4; s++) {
      const sa = s * 1.7 + pl.x * 0.013;
      const sd = pl.r * (0.25 + 0.15 * Math.sin(s + pl.y * 0.01));
      ctx.globalAlpha = 0.13 * a;
      ctx.fillStyle = '#5a0e00';
      ctx.beginPath();
      ctx.arc(pl.x + Math.cos(sa) * sd, pl.y + Math.sin(sa) * sd, pl.r * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const e of G.enemies) {
    if (e.isBoss && e.def.ai === 'bulletlord') {
      if (e.warnRings > 0) {
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(performance.now() * 0.02);
        ctx.strokeStyle = '#ff5d5d';
        ctx.lineWidth = 2;
        const n = 16;
        for (let i = 0; i < n; i++) {
          const ba = (i / n) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(e.warnX, e.warnY);
          ctx.lineTo(e.warnX + Math.cos(ba) * e.r + 3, e.warnY + Math.sin(ba) * e.r + 3);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
        ctx.globalAlpha = 1;
      }
      if (e.aimWarn > 0) {
        const a = Math.atan2(G.player.y - e.y, G.player.x - e.x);
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(performance.now() * 0.03);
        for (let i = -1; i <= 1; i++) {
          const ba = a + i * 0.18;
          ctx.strokeStyle = '#ff8500';
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + Math.cos(ba) * 350, e.y + Math.sin(ba) * 350);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    if (e.isBoss && e.state === 'tele') {
      ctx.globalAlpha = 0.3 + 0.2 * Math.sin(performance.now() * 0.03);
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.aimX, e.aimY);
      ctx.stroke();
      // 在路径上画上"放射性"标示（垂直线交叉）
      ctx.lineWidth = 2;
      const perp = e.dashAngle + Math.PI / 2;
      const sx = (e.x + e.aimX) / 2;
      const sy = (e.y + e.aimY) / 2;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(perp) * 30, sy + Math.sin(perp) * 30);
      ctx.lineTo(sx - Math.cos(perp) * 30, sy - Math.sin(perp) * 30);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
      ctx.globalAlpha = 1;
    }

    // 冲撞中：在 boss 周围画 4 条放射粒子线
    if (e.isBoss && e.state === 'dash') {
      for (let k = 0; k < 4; k++) {
        const aa = e.dashAngle + Math.PI / 2 + (k - 1.5) * 0.4;
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ff4d4d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(aa) * 70, e.y + Math.sin(aa) * 70);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (e.elite) {
      const pulse = 1 + 0.12 * Math.sin(performance.now() * 0.006 + e.x);
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * pulse + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#ff5555';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * pulse + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (e.mega) {
      const pulse = 1 + 0.15 * Math.sin(performance.now() * 0.009 + e.y);
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#9d4edd';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * pulse + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * pulse + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (e.frozenT > 0) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#aee3f0';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#eaf4f4';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ja = i * Math.PI / 2 + Math.sin(performance.now() * 0.004 + i) * 0.3;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(ja) * (e.r + 2), e.y + Math.sin(ja) * (e.r + 2));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (e.frozenImmuneT > 0) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#7be0c0';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    if (e.slowTime > 0) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#eaf4f4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (e.burnTime > 0) {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 2, -0.3, Math.PI - 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 2, Math.PI + 0.3, Math.PI * 2 - 0.3);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const flip = G.player.x < e.x;
    const size = e.r * (e.isBoss ? 2.6 : 2.4) * (e.flash > 0 ? 1.12 : 1);
    const sid = e.isBoss ? e.def.ai : e.id;
    if (!drawSprite(ctx, sid, e.x, e.y, size, flip)) {
      ctx.fillStyle = e.def.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (e.flash > 0) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 1.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.def.armor) {
      ctx.strokeStyle = '#57cc99';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 2, -0.6, 2.5);
      ctx.stroke();
    }
    if (e.isBoss) {
      ctx.strokeStyle = e.state === 'tele' ? '#fff' : 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.def.zigzag) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(e.x - 2, e.y); ctx.lineTo(e.x + 2, e.y);
      ctx.moveTo(e.x, e.y - 2); ctx.lineTo(e.x, e.y + 2);
      ctx.stroke();
    }
    if (e.def.explode) {
      ctx.strokeStyle = '#ffe066';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#000a';
      ctx.fillRect(e.x - e.r, e.y - e.r - 7, e.r * 2, 4);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(e.x - e.r, e.y - e.r - 7, e.r * 2 * (e.hp / e.maxHp), 4);
    }
  }

  for (const tr of G.trails) {
    ctx.globalAlpha = Math.max(0, tr.life / tr.maxLife) * 0.8;
    ctx.strokeStyle = tr.color;
    ctx.lineWidth = tr.w;
    ctx.beginPath();
    ctx.moveTo(tr.x1, tr.y1);
    ctx.lineTo(tr.x2, tr.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const lt of G.lightnings) {
    ctx.globalAlpha = Math.max(0, lt.life / lt.maxLife);
    ctx.strokeStyle = '#ffe66d';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffe66d';
    ctx.beginPath();
    ctx.moveTo(lt.x1, lt.y1);
    const segs = 4;
    for (let s = 1; s < segs; s++) {
      const f = s / segs;
      const mx = lt.x1 + (lt.x2 - lt.x1) * f + rand(-12, 12);
      const my = lt.y1 + (lt.y2 - lt.y1) * f + rand(-12, 12);
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(lt.x2, lt.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
  }
  ctx.globalAlpha = 1;

  for (const rg of G.rings) {
    const t = 1 - rg.life / rg.maxLife;
    const r = rg.r + (rg.maxR - rg.r) * t;
    ctx.globalAlpha = Math.max(0, rg.life / rg.maxLife);
    ctx.strokeStyle = '#ffbf69';
    ctx.lineWidth = 5 * (1 - t) + 1;
    ctx.beginPath();
    ctx.arc(rg.x, rg.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, rg.life / rg.maxLife) * 0.25;
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.arc(rg.x, rg.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const b of G.bullets) {
    drawBullet(b);
  }
  for (const b of G.ebullets) {
    if (b.beam) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.shadowColor = '#ff4d4d';
      ctx.shadowBlur = 12;
      const len = 26;
      const grad = ctx.createLinearGradient(-len, 0, len, 0);
      grad.addColorStop(0, 'rgba(255,77,77,0)');
      grad.addColorStop(0.5, '#ff4d4d');
      grad.addColorStop(1, '#fff5f5');
      ctx.fillStyle = grad;
      ctx.fillRect(-len, -3, len * 2, 6);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 紫火坑（boss 危险池）
  for (const hz of G.hazards) {
    const isTele = hz.phase === 'tele';
    if (isTele) {
      const tA = 1 - hz.teleT / hz.teleMax;
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(performance.now() * 0.025);
      ctx.strokeStyle = '#c77dff';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.arc(hz.x, hz.y, hz.r + Math.sin(performance.now() * 0.02) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.15 + 0.2 * tA;
      ctx.fillStyle = '#9d4edd';
      ctx.beginPath();
      ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      const tc = hz.teleT >> 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`+${tc}`, hz.x, hz.y + 4);
      ctx.textAlign = 'left';
    } else {
      const a = clamp(hz.time / hz.maxTime, 0, 1);
      const g = ctx.createRadialGradient(hz.x, hz.y, 0, hz.x, hz.y, hz.r);
      g.addColorStop(0, `rgba(199,125,255,${0.5 * a})`);
      g.addColorStop(0.5, `rgba(123,44,191,${0.35 * a})`);
      g.addColorStop(0.85, `rgba(70,20,130,${0.15 * a})`);
      g.addColorStop(1, 'rgba(40,10,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(hz.x, hz.y, hz.r, 0, Math.PI * 2);
      ctx.fill();
      // 紫色不规则纹理
      for (let s = 0; s < 4; s++) {
        const sa = s * 1.9 + hz.x * 0.013;
        const sd = hz.r * (0.25 + 0.15 * Math.sin(s + hz.y * 0.01));
        ctx.globalAlpha = 0.13 * a;
        ctx.fillStyle = '#3a0050';
        ctx.beginPath();
        ctx.arc(hz.x + Math.cos(sa) * sd, hz.y + Math.sin(sa) * sd, hz.r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  // 激光预警 + 开火后的发光线
  for (const lz of G.lasers) {
    if (lz.warnT > 0) {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(performance.now() * 0.03);
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.moveTo(lz.x0, lz.y0);
      ctx.lineTo(lz.x0 + Math.cos(lz.angle) * 900, lz.y0 + Math.sin(lz.angle) * 900);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    } else if (lz.fireT > 0) {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#fff5f5';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(lz.x0, lz.y0);
      ctx.lineTo(lz.x0 + Math.cos(lz.angle) * 900, lz.y0 + Math.sin(lz.angle) * 900);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const pflash = p.hurtCd > 0 && Math.floor(p.hurtCd * 20) % 2 === 0;
  drawSprite(ctx, 'player', p.x, p.y, p.r * 2.6, p.faceX < 0);
  if (pflash) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  p.weapons.forEach((w, i) => {
    const n = p.weapons.length;
    const base = (i / n) * Math.PI * 2;
    const ox = p.x + Math.cos(base) * 24;
    const oy = p.y + Math.sin(base) * 24;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(w.angle);
    ctx.fillStyle = WEAPONS[w.id].color;
    ctx.fillRect(-3, -3, 14, 6);
    ctx.restore();
  });

  ctx.textAlign = 'center';
  for (const tx of G.texts) {
    ctx.globalAlpha = Math.max(0, tx.life / tx.maxLife);
    ctx.font = `bold ${tx.size}px sans-serif`;
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.txt, tx.x, tx.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';

  ctx.restore();

  if (p.hurtCd > 0) {
    ctx.globalAlpha = clamp(p.hurtCd / 0.4, 0, 1) * 0.35;
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    grad.addColorStop(0, 'rgba(255,0,0,0)');
    grad.addColorStop(1, 'rgba(255,0,0,1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  drawHUD(p);
}

function drawBullet(b) {
  ctx.save();
  const tv = Math.min(1, (b.tier || 0) / 25);
  const glow = tv > 0.3 ? (tv - 0.3) * 10 : 0;
  if (glow > 0) { ctx.shadowBlur = glow * 8; ctx.shadowColor = b.color; }
  if (b.wid === 'sniper') {
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 8 + glow * 6;
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-14, -1.5 - tv * 1, 20 + tv * 6, 3 + tv * 2);
    ctx.fillStyle = b.color;
    ctx.fillRect(-4, -2 - tv * 1, 10 + tv * 4, 4 + tv * 2);
  } else if (b.wid === 'laser') {
    if (glow > 0) ctx.shadowBlur = (10 + b.br * 1.5) * (1 + glow * 0.5);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.br, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = tv > 0.5 ? '#ffffff' : '#fff';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.br * (0.45 + tv * 0.1), 0, Math.PI * 2);
    ctx.fill();
  } else if (b.wid === 'rocket') {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = '#c1121f';
    ctx.fillRect(-7, -3.5 - tv, 12 + tv * 3, 7 + tv * 2);
    ctx.fillStyle = '#e5e5e5';
    ctx.beginPath();
    ctx.moveTo(5, -3.5 - tv); ctx.lineTo(10, 0); ctx.lineTo(5, 3.5 + tv);
    ctx.fill();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.arc(-8, 0, 3 + Math.random() * 2 + tv * 1.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.wid === 'shotgun') {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.8 + tv * 1.5, 0, Math.PI * 2);
    ctx.fill();
    if (tv > 0.5) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  } else if (b.wid === 'smg') {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = b.color;
    ctx.fillRect(-5 - tv * 1.5, -1.5, 8 + tv * 3, 3);
  } else if (b.wid === 'flame') {
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = ['#ff6b35', '#ffd166', '#ff9e00'][Math.floor(rand(0, 3))];
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3 + tv * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (b.wid === 'frost') {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle + performance.now() * 0.01);
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 4 + tv * 1.5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  } else if (b.wid === 'molotov') {
    ctx.fillStyle = '#5a2d0c';
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9e00';
    ctx.beginPath(); ctx.arc(b.x - 2, b.y - 3, 2.5, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = tv > 0.4 ? '#ffffff' : '#f5f5f5';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5 + tv * 3, 3 + tv * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHUD(p) {
  ctx.fillStyle = '#000a';
  ctx.fillRect(14, 14, 210, 20);
  ctx.fillStyle = '#2d9d78';
  ctx.fillRect(16, 16, 206 * clamp(p.hp / p.maxHp, 0, 1), 16);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 119, 29);

  ctx.textAlign = 'left';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = '#e8b04b';
  ctx.fillText(`金币 ${G.gold}`, 16, 56);
  ctx.fillStyle = '#cbb9a0';
  ctx.fillText(`击杀 ${G.kills}`, 110, 56);

  ctx.textAlign = 'center';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = '#f5e6c8';
  ctx.fillText(`第 ${G.wave} / ${MAX_WAVE} 波`, W / 2, 32);
  if (G.boss && !G.boss.dead) {
    const b = G.boss;
    ctx.fillStyle = '#000a';
    ctx.fillRect(W / 2 - 180, 42, 360, 18);
    ctx.fillStyle = b.def.color;
    ctx.fillRect(W / 2 - 178, 44, 356 * clamp(b.hp / b.maxHp, 0, 1), 14);
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#f5e6c8';
    ctx.fillText(`BOSS · ${b.def.name}`, W / 2, 55);
  } else {
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = G.waveTimer < 6 ? '#ff5d5d' : '#e8b04b';
    ctx.fillText(Math.ceil(G.waveTimer), W / 2, 62);
  }
  ctx.textAlign = 'left';
}
