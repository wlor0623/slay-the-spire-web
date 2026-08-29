// 遗物数据。钩子由战斗引擎 / 商店界面按需调用。
(function (root) {
  const STS = (root.STS = root.STS || {});

  const LIST = [
    { id: 'burning_blood', name: '燃烧之血', rarity: 'starter', icon: 'burning_blood',
      desc: '战斗胜利后回复 6 点生命。', healOnVictory: 6 },
    { id: 'anchor', name: '锚', rarity: 'common', icon: 'anchor',
      desc: '每场战斗的第一回合获得 10 点格挡。', startBlock: 10 },
    { id: 'smooth_stone', name: '意外光滑的石头', rarity: 'common', icon: 'smooth_stone',
      desc: '战斗中获得 1 点力量。', strength: 1 },
    { id: 'blood_vial', name: '小血瓶', rarity: 'common', icon: 'blood_vial',
      desc: '战斗胜利后回复 2 点生命。', healOnVictory: 2 },
    { id: 'membership_card', name: '会员卡', rarity: 'shop', icon: 'membership_card',
      desc: '商店价格降低 50%。', shopDiscount: 0.5 },
    { id: 'whetstone', name: '磨刀石', rarity: 'uncommon', icon: 'whetstone',
      desc: '名称含「打击」的卡牌伤害 +2。', strikeBonus: 2 },
    { id: 'lantern', name: '油灯', rarity: 'common', icon: 'lantern',
      desc: '战斗开始时获得 1 点能量。', startEnergy: 1 },
    { id: 'red_skull', name: '红头骨', rarity: 'uncommon', icon: 'red_skull',
      desc: '生命低于 50% 时，战斗中获得 3 点力量。', lowHpStrength: 3 }
  ];

  const byId = {};
  LIST.forEach(r => (byId[r.id] = r));

  STS.relics = { list: LIST, byId };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.relics;
})(typeof window !== 'undefined' ? window : globalThis);