// 战士（铁甲战士）卡牌数据。
// actions 由战斗引擎解释执行；up 为升级后的完整覆盖字段。
// type: attack 攻击 / skill 技能 / power 能力；target: enemy 单体 / allEnemies 全体 / self 自身
(function (root) {
  const STS = (root.STS = root.STS || {});

  const LIST = [
    { id: 'strike', name: '打击', cost: 1, type: 'attack', rarity: 'basic', target: 'enemy', icon: 'strike', tags: ['strike'],
      actions: [{ t: 'dmg', v: 6 }], desc: '造成 6 点伤害。',
      up: { actions: [{ t: 'dmg', v: 9 }], desc: '造成 9 点伤害。' } },
    { id: 'defend', name: '防御', cost: 1, type: 'skill', rarity: 'basic', target: 'self', icon: 'defend',
      actions: [{ t: 'block', v: 5 }], desc: '获得 5 点格挡。',
      up: { actions: [{ t: 'block', v: 8 }], desc: '获得 8 点格挡。' } },
    { id: 'bash', name: '痛击', cost: 2, type: 'attack', rarity: 'basic', target: 'enemy', icon: 'bash',
      actions: [{ t: 'dmg', v: 8 }, { t: 'vuln', v: 2 }], desc: '造成 8 点伤害，给予 2 层易伤。',
      up: { actions: [{ t: 'dmg', v: 10 }, { t: 'vuln', v: 3 }], desc: '造成 10 点伤害，给予 3 层易伤。' } },

    { id: 'anger', name: '愤怒', cost: 0, type: 'attack', rarity: 'common', target: 'enemy', icon: 'anger',
      actions: [{ t: 'dmg', v: 6 }, { t: 'copySelf' }], desc: '造成 6 点伤害。将一张此牌的复制放入弃牌堆。',
      up: { actions: [{ t: 'dmg', v: 8 }, { t: 'copySelf' }], desc: '造成 8 点伤害。将一张此牌的复制放入弃牌堆。' } },
    { id: 'iron_wave', name: '铁斩波', cost: 1, type: 'attack', rarity: 'common', target: 'enemy', icon: 'iron_wave',
      actions: [{ t: 'dmg', v: 5 }, { t: 'block', v: 5 }], desc: '造成 5 点伤害，获得 5 点格挡。',
      up: { actions: [{ t: 'dmg', v: 7 }, { t: 'block', v: 7 }], desc: '造成 7 点伤害，获得 7 点格挡。' } },
    { id: 'cleave', name: '顺劈斩', cost: 1, type: 'attack', rarity: 'common', target: 'allEnemies', icon: 'cleave',
      actions: [{ t: 'dmgAll', v: 8 }], desc: '对所有敌人造成 8 点伤害。',
      up: { actions: [{ t: 'dmgAll', v: 11 }], desc: '对所有敌人造成 11 点伤害。' } },
    { id: 'twin_strike', name: '双重打击', cost: 1, type: 'attack', rarity: 'common', target: 'enemy', icon: 'twin_strike', tags: ['strike'],
      actions: [{ t: 'dmg', v: 5 }, { t: 'dmg', v: 5 }], desc: '造成 5 点伤害两次。',
      up: { actions: [{ t: 'dmg', v: 7 }, { t: 'dmg', v: 7 }], desc: '造成 7 点伤害两次。' } },
    { id: 'pommel_strike', name: '头槌', cost: 1, type: 'attack', rarity: 'common', target: 'enemy', icon: 'pommel_strike', tags: ['strike'],
      actions: [{ t: 'dmg', v: 9 }, { t: 'draw', v: 1 }], desc: '造成 9 点伤害，抽 1 张牌。',
      up: { actions: [{ t: 'dmg', v: 10 }, { t: 'draw', v: 2 }], desc: '造成 10 点伤害，抽 2 张牌。' } },
    { id: 'shrug_it_off', name: '耸肩无视', cost: 1, type: 'skill', rarity: 'common', target: 'self', icon: 'shrug_it_off',
      actions: [{ t: 'block', v: 8 }, { t: 'draw', v: 1 }], desc: '获得 8 点格挡，抽 1 张牌。',
      up: { actions: [{ t: 'block', v: 11 }, { t: 'draw', v: 1 }], desc: '获得 11 点格挡，抽 1 张牌。' } },
    { id: 'clothesline', name: '交锋', cost: 2, type: 'attack', rarity: 'common', target: 'enemy', icon: 'clothesline',
      actions: [{ t: 'dmg', v: 12 }, { t: 'weak', v: 2 }], desc: '造成 12 点伤害，给予 2 层虚弱。',
      up: { actions: [{ t: 'dmg', v: 14 }, { t: 'weak', v: 3 }], desc: '造成 14 点伤害，给予 3 层虚弱。' } },
    { id: 'sword_boomerang', name: '剑柄打击', cost: 1, type: 'attack', rarity: 'common', target: 'allEnemies', icon: 'sword_boomerang',
      actions: [{ t: 'dmgRandom', v: 3, times: 3 }], desc: '对随机敌人造成 3 点伤害，共 3 次。',
      up: { actions: [{ t: 'dmgRandom', v: 3, times: 4 }], desc: '对随机敌人造成 3 点伤害，共 4 次。' } },
    { id: 'body_slam', name: '全身撞击', cost: 1, type: 'attack', rarity: 'common', target: 'enemy', icon: 'body_slam',
      actions: [{ t: 'dmgByBlock' }], desc: '造成等同于你当前格挡值的伤害。',
      up: { cost: 0, actions: [{ t: 'dmgByBlock' }], desc: '造成等同于你当前格挡值的伤害。' } },

    { id: 'heavy_blade', name: '重刃', cost: 2, type: 'attack', rarity: 'uncommon', target: 'enemy', icon: 'heavy_blade',
      actions: [{ t: 'dmg', v: 14, strMult: 2 }], desc: '造成 14 点伤害。力量加成生效 2 倍。',
      up: { actions: [{ t: 'dmg', v: 14, strMult: 3 }], desc: '造成 14 点伤害。力量加成生效 3 倍。' } },
    { id: 'whirlwind', name: '旋风斩', cost: 'X', type: 'attack', rarity: 'uncommon', target: 'allEnemies', icon: 'whirlwind',
      actions: [{ t: 'dmgXAll', per: 5 }], desc: '消耗所有能量（X），对所有敌人造成 5 点伤害 X 次。',
      up: { actions: [{ t: 'dmgXAll', per: 8 }], desc: '消耗所有能量（X），对所有敌人造成 8 点伤害 X 次。' } },
    { id: 'perfected_strike', name: '完美打击', cost: 2, type: 'attack', rarity: 'uncommon', target: 'enemy', icon: 'perfected_strike', tags: ['strike'],
      actions: [{ t: 'dmgStrike', base: 6, per: 2 }], desc: '造成 6 点伤害。你牌组中每有一张名称含「打击」的牌，伤害 +2。',
      up: { actions: [{ t: 'dmgStrike', base: 6, per: 3 }], desc: '造成 6 点伤害。你牌组中每有一张名称含「打击」的牌，伤害 +3。' } },
    { id: 'inflame', name: '燃烧', cost: 1, type: 'skill', rarity: 'uncommon', target: 'self', icon: 'inflame',
      actions: [{ t: 'str', v: 2 }], desc: '获得 2 点力量。',
      up: { actions: [{ t: 'str', v: 3 }], desc: '获得 3 点力量。' } },
    { id: 'battle_trance', name: '战吼', cost: 0, type: 'skill', rarity: 'uncommon', target: 'self', icon: 'battle_trance',
      actions: [{ t: 'draw', v: 3 }], desc: '抽 3 张牌。',
      up: { actions: [{ t: 'draw', v: 4 }], desc: '抽 4 张牌。' } },
    { id: 'armaments', name: '武装', cost: 1, type: 'skill', rarity: 'uncommon', target: 'self', icon: 'armaments',
      actions: [{ t: 'block', v: 5 }, { t: 'upgradeHand', all: false }], desc: '获得 5 点格挡。随机升级一张手牌（本场战斗内有效）。',
      up: { actions: [{ t: 'block', v: 5 }, { t: 'upgradeHand', all: true }], desc: '获得 5 点格挡。升级所有手牌（本场战斗内有效）。' } },
    { id: 'seeing_red', name: '盛怒', cost: 1, type: 'skill', rarity: 'uncommon', target: 'self', icon: 'seeing_red', exhaust: true,
      actions: [{ t: 'energy', v: 2 }], desc: '获得 2 点能量。消耗。',
      up: { cost: 0, actions: [{ t: 'energy', v: 2 }], desc: '获得 2 点能量。消耗。' } },

    { id: 'demon_form', name: '恶魔形态', cost: 2, type: 'power', rarity: 'rare', target: 'self', icon: 'demon_form',
      actions: [{ t: 'demonForm', v: 2 }], desc: '每回合开始时获得 2 点力量。',
      up: { actions: [{ t: 'demonForm', v: 3 }], desc: '每回合开始时获得 3 点力量。' } },
    { id: 'double_tap', name: '双发', cost: 1, type: 'skill', rarity: 'rare', target: 'self', icon: 'double_tap',
      actions: [{ t: 'doubleAttack', v: 1 }], desc: '本回合你的下一张攻击牌打出两次。',
      up: { actions: [{ t: 'doubleAttack', v: 2 }], desc: '本回合你的下两张攻击牌各打出两次。' } }
  ];

  const byId = {};
  LIST.forEach(c => (byId[c.id] = c));

  // 实例化一张牌（战斗/牌组中的具体一张）
  function makeCard(id, upgraded) {
    const def = byId[id];
    if (!def) throw new Error('未知卡牌: ' + id);
    return { id, up: !!upgraded };
  }

  // 取得实例的有效字段（应用升级覆盖）
  function view(inst) {
    const def = byId[inst.id];
    if (!inst.up) return def;
    return Object.assign({}, def, def.up || {});
  }

  STS.cards = { list: LIST, byId, makeCard, view };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.cards;
})(typeof window !== 'undefined' ? window : globalThis);