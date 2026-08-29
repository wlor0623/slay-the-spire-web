// 敌人数据与出招 AI。
// 招式 kind: attack 攻击 / block 格挡 / attackBlock 攻击+格挡 / strBuff 力量 / debuff 给玩家上虚弱/易伤
// ai(self, ctx) 返回下一招；ctx = { turn, rng }
(function (root) {
  const STS = (root.STS = root.STS || {});
  const U = STS.util;

  const DEFS = {
    cultist: {
      id: 'cultist', name: '邪教徒', hp: [48, 54], icon: 'cultist', gold: [10, 16],
      ai(self, ctx) {
        if (self.moveCount === 0) return { kind: 'strBuff', v: 3, label: '仪式' };
        return { kind: 'attack', dmg: 6 };
      }
    },
    jaw_worm: {
      id: 'jaw_worm', name: '颚虫', hp: [40, 44], icon: 'jaw_worm', gold: [10, 16],
      ai(self, ctx) {
        return U.weightedPick(ctx.rng, [
          { v: { kind: 'attack', dmg: 11 }, w: 45 },
          { v: { kind: 'block', v: 6 }, w: 30 },
          { v: { kind: 'attackBlock', dmg: 7, block: 5 }, w: 25 }
        ]);
      }
    },
    louse: {
      id: 'louse', name: '虱虫', hp: [10, 15], icon: 'louse', gold: [5, 9],
      ai(self, ctx) {
        if (ctx.rng() < 0.25) return { kind: 'strBuff', v: 2, label: '蜷曲' };
        return { kind: 'attack', dmg: U.randInt(ctx.rng, 5, 7) };
      }
    },
    slime_s: {
      id: 'slime_s', name: '酸液史莱姆（小）', hp: [8, 12], icon: 'slime_s', gold: [4, 8],
      ai(self, ctx) {
        if (ctx.rng() < 0.3) return { kind: 'debuff', weak: 1, label: '粘液' };
        return { kind: 'attack', dmg: 3 };
      }
    },
    slime_m: {
      id: 'slime_m', name: '酸液史莱姆（中）', hp: [28, 32], icon: 'slime_m', gold: [8, 12],
      ai(self, ctx) {
        if (ctx.rng() < 0.4) return { kind: 'debuff', weak: 1, label: '粘液' };
        return { kind: 'attack', dmg: 7 };
      }
    },
    gremlin_nob: {
      id: 'gremlin_nob', name: '大地精贵族', hp: [82, 86], icon: 'gremlin_nob', gold: [22, 30], elite: true,
      ai(self, ctx) {
        const p = self.moveCount % 3;
        if (p === 1) return { kind: 'strBuff', v: 2, label: '怒吼' };
        if (p === 2) return { kind: 'attack', dmg: 14 };
        return { kind: 'attack', dmg: 8 };
      }
    },
    sentry: {
      id: 'sentry', name: '哨卫', hp: [38, 42], icon: 'sentry', gold: [10, 14], elite: true,
      ai(self, ctx) {
        const attackFirst = self.index % 2 === 0;
        const isAttackTurn = (self.moveCount % 2 === 0) === attackFirst;
        return isAttackTurn ? { kind: 'attack', dmg: 9 } : { kind: 'block', v: 5 };
      }
    },
    slime_boss: {
      id: 'slime_boss', name: '史莱姆王', hp: [140, 140], icon: 'slime_boss', gold: [90, 110], boss: true,
      split: { below: 0.5, into: ['slime_m', 'slime_m'] },
      ai(self, ctx) {
        const p = self.moveCount % 4;
        if (p === 0) return { kind: 'debuff', weak: 2, vuln: 2, label: '史莱姆喷溅' };
        if (p === 3) return { kind: 'attack', dmg: 35 };
        return { kind: 'attack', dmg: 11 };
      }
    }
  };

  const ENCOUNTERS = {
    normal: [
      ['cultist'],
      ['jaw_worm'],
      ['louse', 'louse'],
      ['slime_s', 'slime_s'],
      ['jaw_worm', 'louse']
    ],
    elite: [
      ['gremlin_nob'],
      ['sentry', 'sentry', 'sentry']
    ],
    boss: [
      ['slime_boss']
    ]
  };

  STS.enemies = { defs: DEFS, encounters: ENCOUNTERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.enemies;
})(typeof window !== 'undefined' ? window : globalThis);