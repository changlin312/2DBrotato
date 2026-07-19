const shopEl = document.getElementById('shop');
const shopTitle = document.getElementById('shop-title');
const shopInfo = document.getElementById('shop-info');
const shopCards = document.getElementById('shop-cards');
const shopStats = document.getElementById('shop-stats');
const btnReroll = document.getElementById('btn-reroll');
const btnBuyAll = document.getElementById('btn-buyall');
const btnNext = document.getElementById('btn-next');

function makeOffer() {
  const wIds = Object.keys(WEAPONS);
  const iIds = Object.keys(ITEMS);
  if (Math.random() < 0.5) {
    const id = wIds[Math.floor(Math.random() * wIds.length)];
    return { kind: 'weapon', id, price: weaponPrice(id), sold: false, locked: false };
  }
  const id = iIds[Math.floor(Math.random() * iIds.length)];
  return { kind: 'item', id, price: itemPrice(id), sold: false, locked: false };
}

function rollOffers() {
  const kept = G.offers.filter(o => o.locked && !o.sold);
  G.offers = kept;
  while (G.offers.length < 4) G.offers.push(makeOffer());
}

function openShop() {
  G.rerollCost = 4 + G.wave;
  rollOffers();
  shopEl.classList.remove('hidden');
  renderShop();
}

function closeShop() {
  shopEl.classList.add('hidden');
}

function canBuyWeapon(id) {
  const p = G.player;
  const owned = p.weapons.find(w => w.id === id);
  if (owned) return owned.tier >= WEAPONS[id].maxTier ? 'maxed' : 'upgrade';
  return p.weapons.length < MAX_WEAPONS ? 'new' : 'full';
}

function hasFreeWeaponSlot() { return G.player.weapons.length < MAX_WEAPONS; }

function itemBlocked(id) {
  return id === 'coffee' && G.player.atkSpd >= 2.0;
}

function buyOffer(idx, asDup) {
  const o = G.offers[idx];
  if (!o || o.sold || G.gold < o.price) return;
  const p = G.player;
  if (o.kind === 'weapon') {
    if (asDup) {
      if (!hasFreeWeaponSlot()) return;
      p.weapons.push({ id: o.id, tier: 1, cd: 0, angle: 0 });
    } else {
      const mode = canBuyWeapon(o.id);
      if (mode === 'full' || mode === 'maxed') return;
      if (mode === 'upgrade') p.weapons.find(w => w.id === o.id).tier++;
      else p.weapons.push({ id: o.id, tier: 1, cd: 0, angle: 0 });
    }
  } else {
    if (itemBlocked(o.id)) return;
    ITEMS[o.id].apply(p);
    p.items[o.id] = (p.items[o.id] || 0) + 1;
    G.itemsBought++;
  }
  G.gold -= o.price;
  o.sold = true;
  o.locked = false;
  SFX.buy();
  renderShop();
}

function fuseSameWeapons() {
  const p = G.player;
  const wById = {};
  p.weapons.forEach(w => {
    if (!wById[w.id]) wById[w.id] = [];
    wById[w.id].push(w);
  });
  let fused = 0;
  for (const id in wById) {
    const list = wById[id];
    while (list.length >= 2) {
      const a = list[0], b = list[1];
      if (a.tier >= WEAPONS[id].maxTier || b.tier >= WEAPONS[id].maxTier) break;
      a.tier += b.tier;
      p.weapons.splice(p.weapons.indexOf(b), 1);
      list.splice(1, 1);
      fused++;
    }
  }
  if (fused > 0) renderShop();
  return fused;
}

function weaponRefund(w) {
  // 大致估算 = 当波购买价 × 阶数 × 80%（含升级花费的总投入的约 80%）
  return Math.max(1, Math.round(weaponPrice(w.id) * w.tier * 0.8));
}

function sellWeapon(idx) {
  const w = G.player.weapons[idx];
  if (!w) return;
  G.gold += weaponRefund(w);
  G.player.weapons.splice(idx, 1);
  renderShop();
}

function fusePairAt(idx) {
  const p = G.player;
  const a = p.weapons[idx];
  if (!a) return;
  if (a.tier >= WEAPONS[a.id].maxTier) return;
  // 寻找另一把同名且未超阶的武器
  let partner = -1;
  for (let i = 0; i < p.weapons.length; i++) {
    if (i === idx) continue;
    const x = p.weapons[i];
    if (x.id === a.id && x.tier < WEAPONS[a.id].maxTier) { partner = i; break; }
  }
  if (partner < 0) return;
  a.tier += p.weapons[partner].tier;
  p.weapons.splice(partner, 1);
  SFX.fuse();
  renderShop();
}

function renderShop() {
  const p = G.player;
  shopTitle.textContent = `商店 — 第 ${G.wave} 波已通过`;
  shopInfo.textContent = `金币: ${G.gold}`;

  shopCards.innerHTML = '';
  G.offers.forEach((o, idx) => {
    const card = document.createElement('div');
    card.className = 'card' + (o.sold ? ' sold' : '') + (o.locked ? ' lockedcard' : '');
    let name, type, desc, note = '';
    if (o.kind === 'weapon') {
      const d = WEAPONS[o.id];
      name = d.name; type = '武器'; desc = d.desc;
      const mode = canBuyWeapon(o.id);
      if (mode === 'upgrade') note = '已拥有 → 升级到 Tier ' + (p.weapons.find(w => w.id === o.id).tier + 1);
      else if (mode === 'maxed') note = '已达最大等级 T' + WEAPONS[o.id].maxTier;
      else if (mode === 'full') note = '武器槽已满';
    } else {
      const d = ITEMS[o.id];
      name = d.name; type = '道具'; desc = d.desc;
      if (itemBlocked(o.id)) note = '攻速已达上限';
    }
    const disabled = o.sold || G.gold < o.price ||
      (o.kind === 'weapon' && ['full', 'maxed'].includes(canBuyWeapon(o.id))) ||
      (o.kind === 'item' && itemBlocked(o.id));
    let dupBtn = '';
    if (o.kind === 'weapon' && !o.sold) {
      const owns = p.weapons.find(w => w.id === o.id);
      const canDup = owns && hasFreeWeaponSlot();
      if (canDup) {
        dupBtn = `<button class="dupbtn" ${G.gold < o.price ? 'disabled' : ''}>另购副本</button>`;
      }
    }
    card.innerHTML = `
      <button class="lockbtn ${o.locked ? 'locked' : ''}">${o.locked ? '已锁定' : '锁定'}</button>
      <div class="cname">${name}</div>
      <div class="ctype">${type}${note ? ' · ' + note : ''}</div>
      <div class="cdesc">${desc}</div>
      <button class="buybtn" ${disabled ? 'disabled' : ''}>${o.sold ? '已购买' : o.price + ' 金币'}</button>
      ${dupBtn}`;
    card.querySelector('.buybtn').onclick = () => buyOffer(idx);
    if (card.querySelector('.dupbtn')) {
      card.querySelector('.dupbtn').onclick = () => buyOffer(idx, true);
    }
    card.querySelector('.lockbtn').onclick = () => {
      if (o.sold) return;
      o.locked = !o.locked;
      renderShop();
    };
    shopCards.appendChild(card);
  });

  btnReroll.textContent = `刷新 (${G.rerollCost} 金币) [空格]`;
  btnReroll.disabled = G.gold < G.rerollCost;

  const remaining = G.offers.filter(o => !o.sold);
  const total = remaining.reduce((s, o) => s + o.price, 0);
  btnBuyAll.textContent = `一键购买 (${total} 金币) [Enter]`;
  btnBuyAll.disabled = remaining.length === 0;

  const wtags = p.weapons.map(w => {
    const d = WEAPONS[w.id];
    const over = w.tier > d.maxTier ? ' ★' : '';
    return `<span class="weapon-tag" style="border-left:3px solid ${d.color}">${d.name} T${w.tier}${over}</span>`;
  }).join('');
  const itags = Object.entries(p.items).map(([id, n]) =>
    `<span class="weapon-tag">${ITEMS[id].name}${n > 1 ? ' x' + n : ''}</span>`).join('');
  shopStats.innerHTML = `
    武器 (${p.weapons.length}/${MAX_WEAPONS}): ${wtags || '无'}<br>
    道具: ${itags || '无'}<br>
    生命 ${Math.ceil(p.hp)}/${p.maxHp} · 伤害 +${Math.round((p.dmgMult - 1) * 100)}% ·
    攻速 +${Math.round((p.atkSpd - 1) * 100)}% · 移速 ${Math.round(p.speed)} ·
    护甲 ${p.armor} · 回复 ${p.regen.toFixed(1)}/秒 · 金币加成 +${Math.round((p.goldMult - 1) * 100)}%`;

  // 武器槽交互区：每行一把武器，给出合成 / 出售按钮
  const wm = document.getElementById('weapon-manage');
  if (wm) {
    wm.innerHTML = '';
    p.weapons.forEach((w, idx) => {
      const d = WEAPONS[w.id];
      const over = w.tier > d.maxTier;
      // 是否还有同名未超阶的搭档可合成
      let partner = -1;
      for (let i = 0; i < p.weapons.length; i++) {
        if (i === idx) continue;
        const x = p.weapons[i];
        if (x.id === w.id && x.tier < d.maxTier && w.tier < d.maxTier) { partner = i; break; }
      }
      const refund = weaponRefund(w);
      const row = document.createElement('div');
      row.className = 'wm-row';
      row.innerHTML = `
        <span class="wm-name" style="border-left:3px solid ${d.color}">
          ${d.name} T${w.tier}${over ? ' ★' : ''}
        </span>
        <button class="wm-fuse" ${partner < 0 ? 'disabled' : ''} ${over ? 'disabled' : ''}>
          ${over ? '已超阶' : (partner >= 0 ? `合成 → T${w.tier + p.weapons[partner].tier}` : '不可合成')}
        </button>
        <button class="wm-sell">出售 +${refund}金</button>`;
      row.querySelector('.wm-fuse').onclick = () => fusePairAt(idx);
      row.querySelector('.wm-sell').onclick = () => {
        if (confirm(`出售 ${d.name} T${w.tier} 并获得 ${refund} 金币？`)) sellWeapon(idx);
      };
      wm.appendChild(row);
    });
  }
}

function hasFuseablePair() {
  const counts = {};
  let any = false;
  for (const w of G.player.weapons) {
    if (w.tier >= WEAPONS[w.id].maxTier) continue;
    counts[w.id] = (counts[w.id] || 0) + 1;
    if (counts[w.id] === 2) any = true;
  }
  return any;
}

btnReroll.onclick = () => {
  if (G.gold < G.rerollCost) return;
  G.gold -= G.rerollCost;
  G.rerollCost += 3;
  rollOffers();
  renderShop();
};

function buyAll() {
  G.offers.forEach((o, idx) => buyOffer(idx));
}
btnBuyAll.onclick = buyAll;

addEventListener('keydown', e => {
  if (G.state !== 'shop') return;
  if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
    document.activeElement.blur();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (!btnReroll.disabled) btnReroll.onclick();
  } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    e.preventDefault();
    buyAll();
  }
});

btnNext.onclick = () => {
  closeShop();
  startWave();
};
