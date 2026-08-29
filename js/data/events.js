// 问号事件数据。options[].effects 为效果描述数组，由界面层执行并生成结果文本。
// 效果类型: gold 金币 / loseHp 失去生命 / heal 回复 / removeCard 删牌(打开选牌) / randomRelic 随机遗物
(function (root) {
  const STS = (root.STS = root.STS || {});

  const LIST = [
    {
      id: 'golden_idol', name: '金神像', icon: 'node_event',
      text: '一座金光闪闪的神像立在祭坛上，散发着诱人的光芒。你感到它在注视着你。',
      options: [
        { label: '拿走神像（获得 250 金币，失去 15% 最大生命）',
          effects: [{ t: 'gold', v: 250 }, { t: 'loseHpPct', v: 0.15 }],
          result: '你抱起神像夺路而逃。金子很沉，伤口也很疼。' },
        { label: '离开', effects: [], result: '有些东西还是不要碰为好。' }
      ]
    },
    {
      id: 'living_wall', name: '活体墙', icon: 'node_event',
      text: '前方的墙壁突然睁开了眼睛：「旅人，我可以帮你……只要你付一点代价。」',
      options: [
        { label: '「帮我忘掉一段记忆。」（删除牌组中一张牌）',
          effects: [{ t: 'removeCard' }], result: '墙壁低语着，你感到某段技艺从脑海中消失了。' },
        { label: '「帮我疗伤。」（回复 20 点生命）',
          effects: [{ t: 'heal', v: 20 }], result: '温暖的气息包裹了你，伤口缓缓愈合。' },
        { label: '「给我黄金。」（获得 100 金币，失去 10 点生命）',
          effects: [{ t: 'gold', v: 100 }, { t: 'loseHp', v: 10 }], result: '金币从墙缝涌出，同时你感到一阵眩晕。' }
      ]
    },
    {
      id: 'scrap_ooze', name: '废料软泥', icon: 'node_event',
      text: '一滩咕嘟作响的软泥堵在路中央，里面隐约闪着金属的光泽。',
      options: [
        { label: '伸手进去捞（失去 8 点生命，获得随机遗物）',
          effects: [{ t: 'loseHp', v: 8 }, { t: 'randomRelic' }],
          result: '你忍住灼痛把手伸了进去——捞出了一个奇怪的东西！' },
        { label: '绕路走', effects: [], result: '你小心翼翼地绕开了它。' }
      ]
    },
    {
      id: 'cleric', name: '流浪牧师', icon: 'node_event',
      text: '一位披着灰袍的牧师向你致意：「孩子，你看起来伤痕累累。一点奉献就能换来祝福。」',
      options: [
        { label: '捐献 50 金币（回复 25% 最大生命）', cost: { gold: 50 },
          effects: [{ t: 'gold', v: -50 }, { t: 'healPct', v: 0.25 }],
          result: '牧师为你祈祷，圣光抚平了你的伤口。' },
        { label: '婉拒离开', effects: [], result: '牧师微笑着目送你离去。' }
      ]
    }
  ];

  const byId = {};
  LIST.forEach(e => (byId[e.id] = e));

  STS.events = { list: LIST, byId };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.events;
})(typeof window !== 'undefined' ? window : globalThis);