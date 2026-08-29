// 战斗界面：敌人/意图/手牌/能量/药水/牌堆/日志，点选出牌，伤害飘字与受击动画。
(function (root) {
  const STS = (root.STS = root.STS || {});
  const ui = (STS.ui = STS.ui || {});
  const U = STS.util;

  function intentHtml(combat, enemy) {
    const mv = enemy.intent;
    if (!mv) return '';
    if (mv.kind === 'attack') {
      const info = STS.combat.intentDamage(combat, enemy);
      return `<span class="intent attack" title="攻击">⚔️ ${info.dmg}${info.times > 1 ? '×' + info.times : ''}</span>`;
    }
    if (mv.kind === 'attackBlock') {
      const info = STS.combat.intentDamage(combat, enemy);
      return `<span class="intent attack" title="攻击 + 格挡">⚔️ ${info.dmg} 🛡️${mv.block}</span>`;
    }
    if (mv.kind === 'block') return `<span class="intent defend" title="格挡">🛡️ ${mv.v}</span>`;
    if (mv.kind === 'strBuff') return `<span class="intent buff" title="${mv.label || '强化'}">💪 ${mv.label || ''}</span>`;
    if (mv.kind === 'debuff') return `<span class="intent debuff" title="${mv.label || '减益'}">☠️ ${mv.label || ''}</span>`;
    return '';
  }

  function enemyHtml(combat, enemy, idx, targeting) {
    if (!enemy.alive) return '';
    const hpPct = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
    return `
      <div class="enemy ${targeting ? 'targetable' : ''} ${enemy.splitDone ? 'boss' : ''}" data-idx="${idx}" data-uid="${enemy.uid}">
        <div class="enemy-intent">${intentHtml(combat, enemy)}</div>
        <div class="enemy-sprite ${STS.enemies.defs[enemy.id].boss ? 'boss-sprite' : ''}">${ui.iconHtml(enemy.icon, 'enemy-icon')}</div>
        <div class="enemy-name">${enemy.name}</div>
        <div class="hpbar"><div class="hpbar-fill" style="width:${hpPct}%"></div>
          <span class="hpbar-text">${enemy.hp}/${enemy.maxHp}</span>
          ${enemy.block > 0 ? `<span class="block-badge" title="格挡">🛡️${enemy.block}</span>` : ''}
        </div>
        <div class="status-row">${ui.statusHtml(enemy.statuses)}</div>
      </div>`;
  }

  function handCardPlayable(combat, inst) {
    const card = STS.cards.view(inst);
    const cost = card.cost === 'X' ? combat.energy : card.cost;
    return combat.energy >= cost && !(card.cost === 'X' && combat.energy === 0);
  }

  ui.renderCombat = function (app) {
    const combat = STS.game.combat;
    const run = STS.game.run;
    const sel = STS.game.sel;
    const potionSel = STS.game.potionSel;
    const targeting = sel != null || potionSel != null;

    const wrap = document.createElement('div');
    wrap.className = 'screen combat-screen' + (combat.isBoss ? ' boss-fight' : combat.isElite ? ' elite-fight' : '');
    wrap.innerHTML = `
      <div class="combat-top">
        <span class="turn-badge">第 ${combat.turn} 回合</span>
        <span class="combat-title">${combat.isBoss ? '👑 Boss 战' : combat.isElite ? '👑 精英战' : '⚔️ 战斗'}</span>
        <span class="combat-top-right">
          <button class="btn sm" data-act="log">日志</button>
          <button class="btn sm" data-act="menu">保存退出</button>
        </span>
      </div>
      <div class="battlefield" data-act="cancel">
        <div class="enemies-row">
          ${combat.enemies.map((e, i) => enemyHtml(combat, e, i, targeting)).join('')}
        </div>
        <div class="player-row">
          <div class="player-panel" data-uid="player">
            <div class="player-avatar">${ui.iconHtml('strike', 'player-icon')}</div>
            <div class="player-name">铁甲战士</div>
            <div class="hpbar player-hpbar"><div class="hpbar-fill" style="width:${(run.hp / run.maxHp) * 100}%"></div>
              <span class="hpbar-text">${run.hp}/${run.maxHp}</span>
              ${combat.block > 0 ? `<span class="block-badge">🛡️${combat.block}</span>` : ''}
            </div>
            <div class="status-row">${ui.statusHtml(combat.statuses)}</div>
            <div class="energy-row" title="能量">
              ${Array.from({ length: combat.maxEnergy }, (_, i) => `<span class="energy-orb ${i < combat.energy ? 'full' : ''}">⚡</span>`).join('')}
              ${combat.energy > combat.maxEnergy ? `<span class="energy-extra">+${combat.energy - combat.maxEnergy}</span>` : ''}
            </div>
          </div>
          <div class="potion-row">
            ${run.potions.map((p, i) => {
              if (!p) return '<span class="potion empty">○</span>';
              const cls = 'potion usable' + (potionSel === i ? ' selected' : '');
              return `<span class="${cls}" data-potion="${i}" title="${STS.potions.byId[p].name}：${STS.potions.byId[p].desc}">${ui.iconHtml(STS.potions.byId[p].icon, 'icon')}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
      <div class="combat-bottom">
        <div class="piles">
          <button class="pile-btn" data-pile="draw" title="抽牌堆">🂠 ${combat.drawPile.length}</button>
          <button class="pile-btn" data-pile="discard" title="弃牌堆">🗑️ ${combat.discardPile.length}</button>
          <button class="pile-btn" data-pile="exhaust" title="消耗堆">💨 ${combat.exhaustPile.length}</button>
        </div>
        <div class="hand">
          ${combat.hand.map((inst, i) => {
            const playable = handCardPlayable(combat, inst);
            return ui.cardHtml(inst, {
              selected: sel === i,
              disabled: !playable,
              attrs: `data-hand="${i}"`
            });
          }).join('')}
        </div>
        <button class="btn primary end-turn" data-act="endturn">结束回合</button>
      </div>
      ${targeting ? '<div class="target-hint">🎯 点击一个敌人作为目标（点击空地取消）</div>' : ''}`;
    app.appendChild(wrap);

    // --- 事件绑定 ---
    wrap.querySelector('[data-act="endturn"]').onclick = () => doEndTurn();
    wrap.querySelector('[data-act="log"]').onclick = () => {
      const body = `<h3>战斗日志</h3><div class="log-list">${combat.log.slice().reverse().map(l => `<div>${l}</div>`).join('') || '<p class="dim">暂无</p>'}</div>
        <div class="modal-actions"><button class="btn" data-close>关闭</button></div>`;
      const m = ui.modal(body);
      m.querySelector('[data-close]').onclick = () => ui.closeModal();
    };
    wrap.querySelector('[data-act="menu"]').onclick = () => {
      if (!confirm('保存并退回主菜单？（当前战斗进度不保存，将回到本层入口）')) return;
      STS.state.save(run);
      STS.game.screen = 'menu';
      STS.game.combat = null;
      ui.render();
    };
    wrap.querySelector('[data-act="cancel"]').onclick = e => {
      if (e.target.closest('.enemy') || e.target.closest('.hand') || e.target.closest('.potion-row')) return;
      if (targeting) { STS.game.sel = null; STS.game.potionSel = null; ui.render(); }
    };
    wrap.querySelectorAll('[data-pile]').forEach(btn => {
      btn.onclick = () => {
        const kind = btn.dataset.pile;
        const title = kind === 'draw' ? '抽牌堆' : kind === 'discard' ? '弃牌堆' : '消耗堆';
        ui.pileModal(title, combat[kind + 'Pile']);
      };
    });
    wrap.querySelectorAll('[data-hand]').forEach(el => {
      el.onclick = () => onCardClick(+el.dataset.hand);
    });
    wrap.querySelectorAll('.enemy').forEach(el => {
      el.onclick = () => onEnemyClick(+el.dataset.idx);
    });
    wrap.querySelectorAll('[data-potion]').forEach(el => {
      el.onclick = () => onPotionClick(+el.dataset.potion);
    });
  };

  // ---- 快照：用于伤害飘字 ----
  function snapshot(combat) {
    return {
      enemies: combat.enemies.map(e => ({ uid: e.uid, hp: e.hp, block: e.block, alive: e.alive })),
      playerHp: combat.run.hp,
      playerBlock: combat.block
    };
  }

  function animateDiff(snap) {
    requestAnimationFrame(() => {
      snap.enemies.forEach(s => {
        const el = document.querySelector(`[data-uid="${s.uid}"]`);
        if (!el) return;
        const cur = STS.game.combat.enemies.find(e => e.uid === s.uid);
        const hpNow = cur ? cur.hp : 0;
        if (hpNow < s.hp) {
          el.classList.add('hit');
          ui.floatText(el, '-' + (s.hp - hpNow), 'dmg');
          if (!cur || !cur.alive) el.classList.add('dying');
        } else if (cur && cur.block > s.block) {
          ui.floatText(el, '+' + (cur.block - s.block) + '🛡️', 'blk');
        }
      });
      const pEl = document.querySelector('[data-uid="player"]');
      const run = STS.game.run;
      if (pEl) {
        if (run.hp < snap.playerHp) {
          pEl.classList.add('hit');
          ui.floatText(pEl, '-' + (snap.playerHp - run.hp), 'dmg');
        } else if (run.hp > snap.playerHp) {
          ui.floatText(pEl, '+' + (run.hp - snap.playerHp), 'heal');
        }
      }
      setTimeout(() => document.querySelectorAll('.hit').forEach(el => el.classList.remove('hit')), 500);
    });
  }

  function checkOver() {
    const combat = STS.game.combat;
    if (!combat.over) return false;
    if (combat.over === 'defeat') {
      setTimeout(() => { STS.game.screen = 'gameover'; ui.render(); }, 800);
    } else {
      setTimeout(() => onVictory(), 800);
    }
    return true;
  }

  function onCardClick(i) {
    const combat = STS.game.combat;
    if (combat.over) return;
    const inst = combat.hand[i];
    if (!inst) return;
    const card = STS.cards.view(inst);
    const cost = card.cost === 'X' ? combat.energy : card.cost;
    if (combat.energy < cost || (card.cost === 'X' && combat.energy === 0)) {
      ui.toast('能量不足');
      return;
    }
    STS.game.potionSel = null;
    if (card.target === 'enemy') {
      STS.game.sel = STS.game.sel === i ? null : i;
      ui.render();
    } else {
      const snap = snapshot(combat);
      STS.game.sel = null;
      STS.combat.playCard(combat, i);
      ui.render();
      animateDiff(snap);
      checkOver();
    }
  }

  function onEnemyClick(idx) {
    const combat = STS.game.combat;
    if (combat.over) return;
    if (STS.game.sel != null) {
      const snap = snapshot(combat);
      const r = STS.combat.playCard(combat, STS.game.sel, idx);
      STS.game.sel = null;
      if (!r.ok) { ui.toast('无效目标'); ui.render(); return; }
      ui.render();
      animateDiff(snap);
      checkOver();
    } else if (STS.game.potionSel != null) {
      const snap = snapshot(combat);
      const r = STS.combat.usePotion(combat, STS.game.potionSel, idx);
      STS.game.potionSel = null;
      if (!r.ok) { ui.toast('无效目标'); ui.render(); return; }
      ui.render();
      animateDiff(snap);
      checkOver();
    }
  }

  function onPotionClick(slot) {
    const combat = STS.game.combat;
    if (combat.over) return;
    const pid = combat.run.potions[slot];
    if (!pid) return;
    const def = STS.potions.byId[pid];
    STS.game.sel = null;
    if (def.target === 'enemy') {
      STS.game.potionSel = STS.game.potionSel === slot ? null : slot;
      ui.render();
    } else {
      const snap = snapshot(combat);
      STS.combat.usePotion(combat, slot);
      ui.render();
      animateDiff(snap);
      checkOver();
    }
  }

  function doEndTurn() {
    const combat = STS.game.combat;
    if (combat.over) return;
    STS.game.sel = null; STS.game.potionSel = null;
    const snap = snapshot(combat);
    STS.combat.endTurn(combat);
    ui.render();
    animateDiff(snap);
    checkOver();
  }

  // ---- 胜利 → 奖励 ----
  function onVictory() {
    const combat = STS.game.combat;
    const run = STS.game.run;

    // 战斗胜利回血遗物
    const heal = STS.combat.relicSum(run, 'healOnVictory');
    if (heal > 0) run.hp = Math.min(run.maxHp, run.hp + heal);

    if (combat.isBoss) {
      STS.game.screen = 'victory';
      ui.render();
      return;
    }

    const rng = U.mulberry32((run.seed ^ run.combatsFought * 7919) >>> 0);
    // 金币按初始遭遇计算（分裂出的子体不重复计）
    const gold = combat.encounterIds.reduce((s, id) => {
      const g = STS.enemies.defs[id].gold;
      return s + U.randInt(rng, g[0], g[1]);
    }, 0);

    // 三选一卡牌
    const cardIds = new Set();
    while (cardIds.size < 3) cardIds.add(ui.randomCard(rng, combat.isElite));

    // 药水 40% 掉落（需有空位）
    let potion = null;
    if (rng() < 0.4 && run.potions.some(p => !p)) {
      potion = STS.potions.list[Math.floor(rng() * STS.potions.list.length)].id;
    }

    // 精英掉遗物
    const relic = combat.isElite ? ui.randomRelic(run, rng) : null;

    run.gold += gold;
    if (relic) run.relics.push(relic);
    STS.state.save(run);

    STS.game.reward = { gold, healed: heal, cards: [...cardIds], potion, relic, done: false };
    STS.game.screen = 'reward';
    ui.render();
  }
})(typeof window !== 'undefined' ? window : globalThis);