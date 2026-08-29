// 战斗引擎：四堆循环、能量、格挡、力量/易伤/虚弱、敌人意图与出招、Boss 分裂。
// 浏览器与 Node 双端可用（依赖 STS.util / STS.cards / STS.enemies / STS.relics / STS.potions）。
(function (root) {
  const STS = (root.STS = root.STS || {});
  const U = STS.util;

  // ---- 战斗内随机数（状态可序列化）----
  function nextRand(c) {
    let a = c.rngState | 0;
    a = (a + 0x6d2b79f5) | 0;
    c.rngState = a;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function rngOf(c) { return () => nextRand(c); }
  function randInt(c, min, max) { return min + Math.floor(nextRand(c) * (max - min + 1)); }
  function shuffleIn(c, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand(c) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---- 遗物辅助 ----
  function relicDefs(run) { return run.relics.map(id => STS.relics.byId[id]).filter(Boolean); }
  function relicSum(run, key) { return relicDefs(run).reduce((s, r) => s + (r[key] || 0), 0); }

  function strengthOf(combat) {
    const run = combat.run;
    let s = combat.statuses.strength + relicSum(run, 'strength');
    if (run.hp < run.maxHp / 2) s += relicSum(run, 'lowHpStrength');
    return s;
  }

  // ---- 伤害管线 ----
  // 玩家攻击牌伤害：基础 + 打击加成(磨刀石) + 力量*倍率；虚弱 *0.75
  function playerAttackDamage(combat, inst, base, strMult) {
    const card = STS.cards.view(inst);
    let v = base;
    if (card.tags && card.tags.includes('strike')) v += relicSum(combat.run, 'strikeBonus');
    v += strengthOf(combat) * (strMult || 1);
    if (combat.statuses.weak > 0) v = Math.floor(v * 0.75);
    return Math.max(0, v);
  }

  function enemyAttackDamage(enemy, base) {
    let v = base + enemy.statuses.strength;
    if (enemy.statuses.weak > 0) v = Math.floor(v * 0.75);
    return Math.max(0, v);
  }

  function aliveEnemies(combat) { return combat.enemies.filter(e => e.alive); }

  function spawnEnemy(combat, id, index, hpOverride) {
    const def = STS.enemies.defs[id];
    const hp = hpOverride != null ? hpOverride : randInt(combat, def.hp[0], def.hp[1]);
    const e = {
      uid: id + '_' + index + '_' + Math.floor(nextRand(combat) * 1e9),
      id, name: def.name, icon: def.icon, index,
      hp, maxHp: hp, block: 0,
      statuses: { strength: 0, vuln: 0, weak: 0 },
      moveCount: 0, intent: null, alive: true, splitDone: false
    };
    e.intent = def.ai(e, { turn: combat.turn, rng: rngOf(combat) });
    return e;
  }

  function log(combat, msg) { combat.log.push(msg); if (combat.log.length > 80) combat.log.shift(); }

  // 对敌人结算伤害。isAttack: 是否吃易伤加成。返回实际生命损失。
  function hitEnemy(combat, enemy, v, isAttack) {
    if (!enemy || !enemy.alive) return 0;
    if (isAttack && enemy.statuses.vuln > 0) v = Math.floor(v * 1.5);
    v = Math.max(0, v);
    const absorbed = Math.min(enemy.block, v);
    enemy.block -= absorbed;
    const loss = v - absorbed;
    enemy.hp -= loss;
    const def = STS.enemies.defs[enemy.id];
    if (enemy.hp <= 0) {
      enemy.hp = 0; enemy.alive = false; enemy.intent = null;
      log(combat, `${enemy.name} 被击败了！`);
    } else if (def.split && !enemy.splitDone && enemy.hp <= enemy.maxHp * def.split.below) {
      enemy.splitDone = true;
      splitEnemy(combat, enemy, def.split);
    }
    if (aliveEnemies(combat).length === 0 && !combat.over) combat.over = 'victory';
    return loss;
  }

  // Boss 分裂：以当前生命生成两个子体，母体退场
  function splitEnemy(combat, enemy, split) {
    const idx = combat.enemies.indexOf(enemy);
    enemy.alive = false; enemy.intent = null; enemy.hp = 0;
    const children = split.into.map((childId, i) => {
      const child = spawnEnemy(combat, childId, enemy.index + i, enemy.maxHp * split.below);
      child.hp = Math.max(1, Math.floor(enemy.maxHp * split.below));
      child.maxHp = child.hp;
      return child;
    });
    combat.enemies.splice(idx, 1, enemy, ...children);
    log(combat, `${enemy.name} 分裂成了两个小史莱姆！`);
  }

  function hitPlayer(combat, v, isAttack) {
    if (isAttack && combat.statuses.vuln > 0) v = Math.floor(v * 1.5);
    v = Math.max(0, v);
    const absorbed = Math.min(combat.block, v);
    combat.block -= absorbed;
    const loss = v - absorbed;
    combat.run.hp -= loss;
    if (combat.run.hp <= 0) { combat.run.hp = 0; combat.over = 'defeat'; }
    return loss;
  }

  // ---- 抽牌 ----
  function drawCards(combat, n) {
    for (let i = 0; i < n; i++) {
      if (combat.hand.length >= 10) return;
      if (combat.drawPile.length === 0) {
        if (combat.discardPile.length === 0) return;
        combat.drawPile = shuffleIn(combat, combat.discardPile.splice(0));
      }
      combat.hand.push(combat.drawPile.pop());
    }
  }

  // ---- 卡牌动作执行 ----
  function execActions(combat, inst, target, xValue) {
    const card = STS.cards.view(inst);
    for (const a of card.actions) {
      switch (a.t) {
        case 'dmg': {
          hitEnemy(combat, target, playerAttackDamage(combat, inst, a.v, a.strMult), true);
          break;
        }
        case 'dmgAll': {
          for (const e of aliveEnemies(combat)) hitEnemy(combat, e, playerAttackDamage(combat, inst, a.v, 1), true);
          break;
        }
        case 'dmgRandom': {
          for (let i = 0; i < a.times; i++) {
            const alive = aliveEnemies(combat);
            if (!alive.length) break;
            const e = alive[Math.floor(nextRand(combat) * alive.length)];
            hitEnemy(combat, e, playerAttackDamage(combat, inst, a.v, 1), true);
          }
          break;
        }
        case 'dmgXAll': {
          for (let i = 0; i < xValue; i++) {
            for (const e of aliveEnemies(combat)) hitEnemy(combat, e, playerAttackDamage(combat, inst, a.per, 1), true);
          }
          break;
        }
        case 'dmgByBlock': {
          hitEnemy(combat, target, combat.block, true);
          break;
        }
        case 'dmgStrike': {
          const all = combat.drawPile.concat(combat.hand, combat.discardPile, combat.exhaustPile, [inst]);
          const count = all.filter(ci => {
            const cv = STS.cards.view(ci);
            return cv.tags && cv.tags.includes('strike');
          }).length;
          hitEnemy(combat, target, playerAttackDamage(combat, inst, a.base + a.per * count, 1), true);
          break;
        }
        case 'block': combat.block += a.v; break;
        case 'str': combat.statuses.strength += a.v; break;
        case 'vuln': if (target && target.alive) target.statuses.vuln += a.v; break;
        case 'weak': if (target && target.alive) target.statuses.weak += a.v; break;
        case 'draw': drawCards(combat, a.v); break;
        case 'energy': combat.energy += a.v; break;
        case 'upgradeHand': {
          const upgradable = combat.hand.filter(ci => !ci.up && STS.cards.byId[ci.id].up);
          if (a.all) upgradable.forEach(ci => (ci.up = true));
          else if (upgradable.length) upgradable[Math.floor(nextRand(combat) * upgradable.length)].up = true;
          break;
        }
        case 'copySelf': combat.discardPile.push({ id: inst.id, up: inst.up }); break;
        case 'doubleAttack': combat.statuses.doubleAttack += a.v; break;
        case 'demonForm': combat.statuses.demonForm += a.v; break;
        default: throw new Error('未知卡牌效果: ' + a.t);
      }
    }
  }

  // ---- 出牌 ----
  function playCard(combat, handIdx, targetIdx) {
    if (combat.over) return { ok: false, reason: 'over' };
    const inst = combat.hand[handIdx];
    if (!inst) return { ok: false, reason: 'no_card' };
    const card = STS.cards.view(inst);
    const cost = card.cost === 'X' ? combat.energy : card.cost;
    if (combat.energy < cost) return { ok: false, reason: 'energy' };

    let target = null;
    if (card.target === 'enemy') {
      target = combat.enemies[targetIdx];
      if (!target || !target.alive) return { ok: false, reason: 'target' };
    }

    combat.energy -= cost;
    combat.hand.splice(handIdx, 1);
    log(combat, `打出「${card.name}」`);

    const xValue = card.cost === 'X' ? cost : 0;
    execActions(combat, inst, target, xValue);

    // 双发：攻击牌额外打出一次
    if (card.type === 'attack' && combat.statuses.doubleAttack > 0 && !combat.over) {
      combat.statuses.doubleAttack--;
      let t2 = target;
      if (card.target === 'enemy' && (!t2 || !t2.alive)) t2 = aliveEnemies(combat)[0] || null;
      if (card.target !== 'enemy' || t2) {
        log(combat, `「${card.name}」再次生效！`);
        execActions(combat, inst, t2, xValue);
      }
    }

    if (card.type === 'power' || card.exhaust) combat.exhaustPile.push(inst);
    else combat.discardPile.push(inst);
    return { ok: true };
  }

  // ---- 回合流程 ----
  function startPlayerTurn(combat) {
    combat.turn++;
    combat.block = 0;
    combat.energy = combat.maxEnergy + (combat.turn === 1 ? relicSum(combat.run, 'startEnergy') : 0);
    if (combat.turn === 1) combat.block += relicSum(combat.run, 'startBlock');
    if (combat.statuses.demonForm > 0) combat.statuses.strength += combat.statuses.demonForm;
    drawCards(combat, 5);
  }

  function execEnemyMove(combat, enemy) {
    const mv = enemy.intent;
    if (!mv) return;
    switch (mv.kind) {
      case 'attack': {
        const times = mv.times || 1;
        for (let i = 0; i < times; i++) {
          if (combat.over) return;
          hitPlayer(combat, enemyAttackDamage(enemy, mv.dmg), true);
        }
        log(combat, `${enemy.name} 攻击造成 ${enemyAttackDamage(enemy, mv.dmg)}${times > 1 ? '×' + times : ''} 点伤害`);
        break;
      }
      case 'block': enemy.block += mv.v; log(combat, `${enemy.name} 获得 ${mv.v} 点格挡`); break;
      case 'attackBlock': {
        enemy.block += mv.block;
        hitPlayer(combat, enemyAttackDamage(enemy, mv.dmg), true);
        log(combat, `${enemy.name} 攻击并获得格挡`);
        break;
      }
      case 'strBuff': enemy.statuses.strength += mv.v; log(combat, `${enemy.name} 力量提升 ${mv.v}`); break;
      case 'debuff': {
        if (mv.weak) combat.statuses.weak += mv.weak;
        if (mv.vuln) combat.statuses.vuln += mv.vuln;
        log(combat, `${enemy.name} 施加了减益效果`);
        break;
      }
    }
  }

  function tickStatuses(s) { if (s.vuln > 0) s.vuln--; if (s.weak > 0) s.weak--; }

  function endTurn(combat) {
    if (combat.over) return;
    combat.discardPile.push(...combat.hand.splice(0));
    tickStatuses(combat.statuses);

    for (const enemy of combat.enemies) {
      if (!enemy.alive) continue;
      enemy.block = 0;
      execEnemyMove(combat, enemy);
      enemy.moveCount++;
      tickStatuses(enemy.statuses);
      if (combat.over) return;
      const def = STS.enemies.defs[enemy.id];
      enemy.intent = def.ai(enemy, { turn: combat.turn, rng: rngOf(combat) });
    }
    startPlayerTurn(combat);
  }

  // ---- 开战 ----
  function start(run, enemyIds, opts) {
    opts = opts || {};
    const combat = {
      run,
      isElite: !!opts.elite, isBoss: !!opts.boss,
      turn: 0, maxEnergy: 3, energy: 0, block: 0,
      statuses: { strength: 0, vuln: 0, weak: 0, doubleAttack: 0, demonForm: 0 },
      drawPile: [], hand: [], discardPile: [], exhaustPile: [],
      enemies: [],
      encounterIds: enemyIds.slice(),
      rngState: (run.seed ^ (opts.combatIndex || 1) * 2654435761) >>> 0,
      log: [], over: null
    };
    combat.drawPile = shuffleIn(combat, run.deck.map(ci => ({ id: ci.id, up: !!ci.up })));
    combat.enemies = enemyIds.map((id, i) => spawnEnemy(combat, id, i));
    startPlayerTurn(combat);
    return combat;
  }

  // ---- 药水 ----
  function usePotion(combat, slot, targetIdx) {
    const pid = combat.run.potions[slot];
    if (!pid) return { ok: false, reason: 'empty' };
    const def = STS.potions.byId[pid];
    const eff = def.effect;
    if (eff.t === 'dmg') {
      const target = combat.enemies[targetIdx];
      if (!target || !target.alive) return { ok: false, reason: 'target' };
      hitEnemy(combat, target, eff.v, false);
    } else if (eff.t === 'heal') {
      combat.run.hp = Math.min(combat.run.maxHp, combat.run.hp + eff.v);
    } else if (eff.t === 'block') {
      combat.block += eff.v;
    } else if (eff.t === 'str') {
      combat.statuses.strength += eff.v;
    }
    combat.run.potions[slot] = null;
    log(combat, `使用了「${def.name}」`);
    return { ok: true };
  }

  // 意图展示用：敌人本回合攻击将造成的伤害（含力量/虚弱，不含玩家易伤）
  function intentDamage(combat, enemy) {
    const mv = enemy.intent;
    if (!mv) return null;
    if (mv.kind === 'attack') return { dmg: enemyAttackDamage(enemy, mv.dmg), times: mv.times || 1 };
    if (mv.kind === 'attackBlock') return { dmg: enemyAttackDamage(enemy, mv.dmg), times: 1 };
    return null;
  }

  STS.combat = {
    start, playCard, endTurn, usePotion, drawCards,
    aliveEnemies, strengthOf, playerAttackDamage, enemyAttackDamage,
    hitEnemy, hitPlayer, intentDamage, relicSum
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.combat;
})(typeof window !== 'undefined' ? window : globalThis);