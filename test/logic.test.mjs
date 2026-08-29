// 核心逻辑测试：node --test test/logic.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
require('../js/core/util.js');
require('../js/data/cards.js');
require('../js/data/enemies.js');
require('../js/data/relics.js');
require('../js/data/potions.js');
require('../js/core/map.js');
require('../js/core/state.js');
require('../js/core/combat.js');

const STS = globalThis.STS;

function makeRun(overrides = {}) {
  const run = STS.state.newRun(42);
  return Object.assign(run, overrides);
}

function startWith(run, enemyIds, handIds, opts = {}) {
  const combat = STS.combat.start(run, enemyIds, opts);
  // 覆盖手牌以便精确测试
  combat.hand = handIds.map(id => ({ id, up: false }));
  return combat;
}

// ---------- 伤害与格挡 ----------
test('打击造成 6 点基础伤害', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist'], ['strike']);
  const r = STS.combat.playCard(c, 0, 0);
  assert.equal(r.ok, true);
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 6);
});

test('格挡先吸收伤害，超出部分扣生命', () => {
  const run = makeRun();
  const c = startWith(run, ['jaw_worm'], ['defend']);
  STS.combat.playCard(c, 0); // +5 格挡
  // 强制敌人意图为攻击 11
  c.enemies[0].intent = { kind: 'attack', dmg: 11 };
  const hpBefore = run.hp;
  STS.combat.endTurn(c);
  assert.equal(run.hp, hpBefore - 6); // 11 - 5
});

test('力量加成：燃烧 +2 力量后打击造成 8 点', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist'], ['inflame', 'strike']);
  STS.combat.playCard(c, 0);
  STS.combat.playCard(c, 0, 0);
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 8);
});

test('易伤使受到的攻击伤害 +50%（向下取整）', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist'], ['bash', 'strike']);
  STS.combat.playCard(c, 0, 0); // 痛击 8 + 易伤2
  assert.equal(c.enemies[0].statuses.vuln, 2);
  const hpAfterBash = c.enemies[0].hp;
  STS.combat.playCard(c, 0, 0); // 打击 6 * 1.5 = 9
  assert.equal(c.enemies[0].hp, hpAfterBash - 9);
});

test('虚弱使攻击伤害 -25%', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist'], ['strike']);
  c.statuses.weak = 1;
  STS.combat.playCard(c, 0, 0); // floor(6 * 0.75) = 4
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 4);
});

// ---------- 牌堆循环 ----------
test('抽牌堆抽空后自动重洗弃牌堆', () => {
  const run = makeRun();
  const c = STS.combat.start(run, ['cultist']);
  const total = c.drawPile.length + c.hand.length;
  assert.equal(total, run.deck.length);
  // 打空若干回合后牌堆应循环
  for (let t = 0; t < 4; t++) {
    c.discardPile.push(...c.hand.splice(0));
    STS.combat.drawCards(c, 5);
  }
  const piles = c.drawPile.length + c.hand.length + c.discardPile.length + c.exhaustPile.length;
  assert.equal(piles, run.deck.length);
});

// ---------- 特殊卡牌 ----------
test('旋风斩消耗全部能量，对每个敌人造成 X 次伤害', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist', 'cultist'], ['whirlwind']);
  c.energy = 3;
  const r = STS.combat.playCard(c, 0);
  assert.equal(r.ok, true);
  assert.equal(c.energy, 0);
  for (const e of c.enemies) assert.equal(e.hp, e.maxHp - 15); // 5 × 3
});

test('重刃力量加成按倍率生效', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist'], ['heavy_blade']);
  c.statuses.strength = 3;
  STS.combat.playCard(c, 0, 0); // 14 + 3*2 = 20
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 20);
});

test('完美打击按「打击」牌数增伤', () => {
  const run = makeRun();
  // 牌组: 打击x5 防御x4 痛击 + 手牌完美打击 → 打击牌 = 5（打击）
  const c = startWith(run, ['cultist'], ['perfected_strike']);
  // 固定牌堆：5 张打击 + 4 张防御，手牌完美打击（自身也含「打击」标签 → 共 6 张）
  c.drawPile = [1,2,3,4,5].map(() => ({ id: 'strike', up: false })).concat([1,2,3,4].map(() => ({ id: 'defend', up: false })));
  c.discardPile = [];
  STS.combat.playCard(c, 0, 0); // 6 + 2*6 = 18
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 18);
});

test('双发使下一张攻击牌生效两次', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist'], ['double_tap', 'strike']);
  STS.combat.playCard(c, 0);
  STS.combat.playCard(c, 0, 0); // 6 × 2 = 12
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 12);
});

test('全身撞击造成等于格挡值的伤害', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist'], ['defend', 'body_slam']);
  STS.combat.playCard(c, 0); // +5 格挡
  STS.combat.playCard(c, 0, 0); // 5 伤
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 5);
});

test('盛怒获得能量并进入消耗堆', () => {
  const run = makeRun();
  const c = startWith(run, ['cultist'], ['seeing_red']);
  c.energy = 1;
  STS.combat.playCard(c, 0);
  assert.equal(c.energy, 2);
  assert.equal(c.exhaustPile.length, 1);
});

// ---------- Boss 分裂 ----------
test('史莱姆王半血分裂为两只中史莱姆', () => {
  const run = makeRun();
  const c = STS.combat.start(run, ['slime_boss'], { boss: true });
  const boss = c.enemies[0];
  boss.hp = 75; // 略高于 50% (140*0.5=70)
  STS.combat.hitEnemy(c, boss, 10, true); // 75-10=65 <= 70 → 分裂
  const alive = STS.combat.aliveEnemies(c);
  assert.equal(alive.length, 2);
  assert.ok(alive.every(e => e.id === 'slime_m'));
  assert.equal(boss.alive, false);
});

test('史莱姆王未过半血不分裂', () => {
  const run = makeRun();
  const c = STS.combat.start(run, ['slime_boss'], { boss: true });
  const boss = c.enemies[0];
  STS.combat.hitEnemy(c, boss, 30, true); // 140-30=110 > 70
  assert.equal(STS.combat.aliveEnemies(c).length, 1);
  assert.equal(c.enemies[0].id, 'slime_boss');
});

// ---------- 遗物 ----------
test('锚：第一回合获得 10 点格挡', () => {
  const run = makeRun({ relics: ['burning_blood', 'anchor'] });
  const c = STS.combat.start(run, ['cultist']);
  assert.equal(c.block, 10);
});

test('油灯：战斗开始 +1 能量', () => {
  const run = makeRun({ relics: ['burning_blood', 'lantern'] });
  const c = STS.combat.start(run, ['cultist']);
  assert.equal(c.energy, 4);
});

test('意外光滑的石头：力量 +1', () => {
  const run = makeRun({ relics: ['burning_blood', 'smooth_stone'] });
  const c = startWith(run, ['cultist'], ['strike']);
  STS.combat.playCard(c, 0, 0); // 6 + 1 = 7
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 7);
});

test('磨刀石：打击类卡牌 +2 伤害', () => {
  const run = makeRun({ relics: ['burning_blood', 'whetstone'] });
  const c = startWith(run, ['cultist'], ['strike']);
  STS.combat.playCard(c, 0, 0); // 6 + 2 = 8
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 8);
});

test('红头骨：半血以下 +3 力量', () => {
  const run = makeRun({ relics: ['burning_blood', 'red_skull'], hp: 30 });
  const c = startWith(run, ['cultist'], ['strike']);
  STS.combat.playCard(c, 0, 0); // 6 + 3 = 9
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 9);
});

// ---------- 药水 ----------
test('火焰药水对指定敌人造成 20 点伤害', () => {
  const run = makeRun({ potions: ['fire_potion', null, null] });
  const c = STS.combat.start(run, ['cultist']);
  const r = STS.combat.usePotion(c, 0, 0);
  assert.equal(r.ok, true);
  assert.equal(c.enemies[0].hp, c.enemies[0].maxHp - 20);
  assert.equal(run.potions[0], null);
});

test('治疗药水回复生命且不超过上限', () => {
  const run = makeRun({ hp: 70, potions: ['heal_potion', null, null] });
  const c = STS.combat.start(run, ['cultist']);
  STS.combat.usePotion(c, 0);
  assert.equal(run.hp, 75);
});

// ---------- 地图生成 ----------
test('地图结构：16 层、Boss 唯一终点、Boss 前休息点、首层全战斗', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const map = STS.map.generateMap(seed);
    assert.equal(map.floors.length, 16);
    assert.equal(map.floors[15].length, 1);
    assert.equal(map.floors[15][0].type, 'B');
    assert.ok(map.floors[14].every(n => n.type === 'R'));
    assert.ok(map.floors[0].every(n => n.type === 'M'));
  }
});

test('地图连通性：所有节点可达，Boss 可达，出边入边合法', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const map = STS.map.generateMap(seed);
    const seen = STS.map.reachable(map);
    let total = 0;
    map.floors.forEach((floor, f) => floor.forEach((node, i) => {
      total++;
      assert.ok(seen.has(f + ':' + i), `种子 ${seed} 节点 ${f}:${i} 不可达`);
      for (const k of node.edges) {
        assert.ok(k >= 0 && k < map.floors[f + 1].length, '出边越界');
      }
    }));
    assert.equal(seen.size, total);
    // 至少 2 精英 1 商店
    const types = map.floors.flat().map(n => n.type);
    assert.ok(types.filter(t => t === 'E').length >= 2, `种子 ${seed} 精英不足`);
    assert.ok(types.filter(t => t === 'S').length >= 1, `种子 ${seed} 无商店`);
  }
});

// ---------- 存档 ----------
test('开局状态：75 血、初始牌组 10 张、燃烧之血', () => {
  const run = STS.state.newRun(1);
  assert.equal(run.hp, 75);
  assert.equal(run.deck.length, 10);
  assert.deepEqual(run.relics, ['burning_blood']);
  assert.equal(run.potions.length, 3);
});

test('存档序列化往返', () => {
  const run = STS.state.newRun(7);
  const clone = JSON.parse(JSON.stringify(run));
  assert.deepEqual(clone, run);
});