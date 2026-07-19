// 像素贴图库 —— 中式科幻像素风
// 调色板: 墨 #221c14 · 鎏金 #c9a227 · 朱红 #c3272b · 玉绿 #57cc99 · 赭石 #a8794a · 宣纸 #e8dcc4
// 每个像素字符 = 1 个像素，绘制时关闭抗锯齿保持锐利像素边缘。

const SPRITE_DEFS = {
  // 玩家：墨甲行者 —— 斗笠金檐、玉绿双目、墨甲玉核
  player: {
    map: { g: '#c9a227', k: '#221c14', e: '#57e6a8', a: '#4a3f2c' },
    rows: [
      '.....gg.....',
      '....gggg....',
      '..gggggggg..',
      '....kkkk....',
      '....keek....',
      '....kkkk....',
      '...aaaaaa...',
      '..aaaaaaaa..',
      '..aakgkaaa..',
      '...aa..aa...',
      '...kk..kk...',
    ],
  },

  // 清朝僵尸 —— 红顶官帽、黄符、深袍
  zombie: {
    map: { r: '#c3272b', m: '#1f1a14', k: '#221c14', w: '#e8dcc4', f: '#e8c34a', d: '#3d2f23' },
    rows: [
      '.....rr.....',
      '....rrrr....',
      '...mmmmmm...',
      '....kkkk....',
      '...kwwwwk...',
      '...kwkkwk...',
      '...kwwwwk...',
      '....ffff....',
      '...dddddd...',
      '...dddddd...',
      '....d..d....',
      '....d..d....',
    ],
  },

  // 蝙蝠（福） —— 棕翼红目
  bat: {
    map: { k: '#1f1a14', b: '#6b4f3a', e: '#ff5d5d' },
    rows: [
      '.k........k.',
      '.kk..kk..kk.',
      '.kkbbbbbbkk.',
      '..kbbbbbbk..',
      '..kbebbebk..',
      '..kbbbbbbk..',
      '...kb..bk...',
      '...k....k...',
    ],
  },

  // 粘液怪 —— 青碧一团
  slime: {
    map: { s: '#7a9b2e', w: '#e8dcc4' },
    rows: [
      '....ssss....',
      '..ssssssss..',
      '.ssssssssss.',
      '.sswsssswss.',
      '.ssssssssss.',
      '..ssssssss..',
      '...ssssss...',
      '....ssss....',
      '.....ss.....',
    ],
  },

  // 兵马俑（重装兵） —— 陶土甲士
  tank: {
    map: { k: '#221c14', s: '#8a6a4a', t: '#b08a5e' },
    rows: [
      '....kkkk....',
      '...kkkkkk...',
      '...stttts...',
      '...ststts...',
      '...stttts...',
      '..ssssssss..',
      '..stststss..',
      '..stttttts..',
      '..ss....ss..',
      '..ss....ss..',
      '...s....s...',
      '...ss..ss...',
    ],
  },

  // 蜘蛛 —— 赭腿朱目
  spider: {
    map: { k: '#221c14', s: '#5d4037', e: '#ff5d5d' },
    rows: [
      '..k..kk..k..',
      '...kkkkkk...',
      '..kssssssk..',
      '.kssesseesk.',
      '.kssssssssk.',
      '..kssssssk..',
      '..k..kk..k..',
      '.k...k...k..',
    ],
  },

  // 弩手（射手） —— 金冠墨甲持弩
  shooter: {
    map: { g: '#c9a227', k: '#221c14', e: '#57e6a8', a: '#4a3f2c', b: '#8a5a2e' },
    rows: [
      '.....gg.....',
      '....kkkk....',
      '....keek....',
      '....kkkk....',
      '...aaaaaa...',
      '..abbbbba...',
      '..aab.baa...',
      '...a...a....',
      '...aa.aa....',
      '...aa..aa...',
      '...kk..kk...',
    ],
  },

  // 自爆虫（火雷） —— 引线燃火、赭体
  bomber: {
    map: { f: '#ffb703', o: '#c76a2e', e: '#221c14' },
    rows: [
      '....f..f....',
      '.....ff.....',
      '...oooooo...',
      '..oooooooo..',
      '.oooooooooo.',
      '.ooeooooeoo.',
      '.oooooooooo.',
      '..oooooooo..',
      '...o....o...',
      '..oo....oo..',
    ],
  },

  // 守卫者（盾卫） —— 玉盾石躯
  shielder: {
    map: { k: '#221c14', w: '#d8cfba', j: '#57cc99', s: '#6b7d6e' },
    rows: [
      '....kkkk....',
      '...kkkkkk...',
      '...kwwwwk...',
      '...kwkkwk...',
      '...kwwwwk...',
      '..jjjjjjjj..',
      '..jssssssj..',
      '..jssssssj..',
      '...s....s...',
      '...ss..ss...',
      '...kk..kk...',
    ],
  },

  // 暴徒（武僧） —— 赭袍筋肉
  brute: {
    map: { k: '#221c14', e: '#ff5d5d', s: '#c78d5e', d: '#7a2e1d' },
    rows: [
      '.....kk.....',
      '....kkkk....',
      '....keek....',
      '....kkkk....',
      '..sdddddds..',
      '.sdddddddds.',
      '.sddkkkkdds.',
      '..dd....dd..',
      '...dd..dd...',
      '...dd..dd...',
      '...kk..kk...',
    ],
  },

  // 猎手 —— 金笠弯弓
  hunter: {
    map: { g: '#c9a227', k: '#221c14', e: '#57e6a8', a: '#4a3f2c', b: '#8a5a2e' },
    rows: [
      '.....gg.....',
      '....gggg....',
      '....keek....',
      '....kkkk....',
      '...aaaaaa...',
      '..baaaaaab..',
      '..b.aa.a.b..',
      '..b..aa..b..',
      '...b....b...',
      '...aa..aa...',
      '...kk..kk...',
    ],
  },

  // BOSS 年兽（巨兽） —— 朱鬃金目獠牙
  behemoth: {
    map: { k: '#221c14', r: '#a32026', e: '#ffb703', f: '#e8dcc4' },
    rows: [
      '.....kk..kk.....',
      '....kkkkkkkk....',
      '...krrrrrrrrk...',
      '..krrrrrrrrrrk..',
      '..krerrrrrrerk..',
      '..krrrrrrrrrrk..',
      '..krrkffffkrrk..',
      '...krrffffrrk...',
      '...kkrrrrrrkk...',
      '....kkkkkkkk....',
      '.....kk..kk.....',
      '....kk....kk....',
    ],
  },

  // BOSS 道士（召唤者） —— 金冠黄符墨袍
  summoner: {
    map: { g: '#c9a227', k: '#221c14', w: '#e8dcc4', f: '#e8c34a', d: '#2e2418' },
    rows: [
      '......gggg......',
      '....gggggggg....',
      '.....kkkkkk.....',
      '....kwwwwwwk....',
      '....kwkwwkwk....',
      '....kwwwwwwk....',
      '.....ffffff.....',
      '....ffffffff....',
      '...ddffffffdd...',
      '..dddddddddddd..',
      '..dd..ffff..dd..',
      '...dd..ff..dd...',
      '....dd....dd....',
    ],
  },

  // BOSS 机关傀儡（弹幕领主） —— 青铜机身、熔核炮膛
  bulletlord: {
    map: { m: '#4a3a22', s: '#8a6a3a', e: '#ffb703', b: '#221c14' },
    rows: [
      '.....mmmmmm.....',
      '...mmssssssmm...',
      '..mssssssssssm..',
      '..msessssssesm..',
      '..mssssssssssm..',
      '..mssbbbbbbssm..',
      '..mssbmmmmmbsm..',
      '..mssbbbbbbssm..',
      '..mssssssssssm..',
      '...mmmmmmmmmm...',
      '....mm.mm.mm....',
      '...mm..mm..mm...',
    ],
  },
};

const SPRITES = {};

(function buildSprites() {
  for (const [name, def] of Object.entries(SPRITE_DEFS)) {
    const rows = def.rows;
    const h = rows.length;
    const w = rows[0].length;
    for (const row of rows) {
      if (row.length !== w) console.warn(`sprite ${name} 行宽不一致: "${row}" (${row.length} != ${w})`);
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch !== '.' && def.map[ch]) {
          g.fillStyle = def.map[ch];
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    SPRITES[name] = c;
  }
})();

function drawSprite(ctx, name, x, y, width, flip) {
  const c = SPRITES[name];
  if (!c) return false;
  const h = c.height * (width / c.width);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(c, Math.round(-width / 2), Math.round(-h / 2), Math.round(width), Math.round(h));
  ctx.restore();
  return true;
}
