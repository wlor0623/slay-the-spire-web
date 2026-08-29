// 药水数据。effect 由战斗引擎或界面层解释。
(function (root) {
  const STS = (root.STS = root.STS || {});

  const LIST = [
    { id: 'heal_potion', name: '治疗药水', icon: 'heal_potion', target: 'none', anyWhere: true,
      desc: '回复 10 点生命。', effect: { t: 'heal', v: 10 } },
    { id: 'block_potion', name: '格挡药水', icon: 'block_potion', target: 'none',
      desc: '获得 12 点格挡。', effect: { t: 'block', v: 12 } },
    { id: 'strength_potion', name: '力量药水', icon: 'strength_potion', target: 'none',
      desc: '获得 2 点力量。', effect: { t: 'str', v: 2 } },
    { id: 'fire_potion', name: '火焰药水', icon: 'fire_potion', target: 'enemy',
      desc: '对一名敌人造成 20 点伤害。', effect: { t: 'dmg', v: 20 } }
  ];

  const byId = {};
  LIST.forEach(p => (byId[p.id] = p));

  STS.potions = { list: LIST, byId };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.potions;
})(typeof window !== 'undefined' ? window : globalThis);