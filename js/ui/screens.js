// UI 基础层：图标渲染、卡牌组件、弹窗、HUD、界面路由、主菜单、结算、图鉴。
(function (root) {
  const STS = (root.STS = root.STS || {});
  const ui = (STS.ui = STS.ui || {});

  // ---- 图标：优先本地 SVG，失败回退 emoji ----
  ui.iconHtml = function (key, cls) {
    cls = cls || 'icon';
    const info = (root.STS_ICONS || {})[key];
    if (info && info.ok) {
      return `<img class="${cls}" src="assets/icons/${key}.svg" alt="" draggable="false" onerror="this.outerHTML='<span class=&quot;${cls} emoji&quot;>${info.emoji}</span>'">`;
    }
    const emoji = info ? info.emoji : '❔';
    return `<span class="${cls} emoji">${emoji}</span>`;
  };

  const TYPE_NAMES = { attack: '攻击', skill: '技能', power: '能力' };
  const RARITY_NAMES = { basic: '基础', common: '普通', uncommon: '罕见', rare: '稀有' };

  // ---- 卡牌组件 ----
  ui.cardHtml = function (inst, opts) {
    opts = opts || {};
    const card = STS.cards.view(inst);
    const cost = card.cost === 'X' ? 'X' : card.cost;
    const cls = ['card', 'rarity-' + card.rarity, 'type-' + card.type];
    if (inst.up) cls.push('upgraded');
    if (opts.selected) cls.push('selected');
    if (opts.disabled) cls.push('disabled');
    if (opts.small) cls.push('small');
    return `
      <div class="${cls.join(' ')}" ${opts.attrs || ''}>
        <div class="card-cost">${cost}</div>
        <div class="card-art">${ui.iconHtml(card.icon, 'card-icon')}</div>
        <div class="card-name">${card.name}${inst.up ? '+' : ''}</div>
        <div class="card-type">${TYPE_NAMES[card.type]}</div>
        <div class="card-desc">${card.desc}</div>
        ${card.exhaust ? '<div class="card-kw">消耗</div>' : ''}
      </div>`;
  };

  ui.relicHtml = function (id, opts) {
    opts = opts || {};
    const r = STS.relics.byId[id];
    return `<span class="relic" title="${r.name}：${r.desc}">${ui.iconHtml(r.icon, 'icon')}${opts.name ? `<span class="relic-name">${r.name}</span>` : ''}</span>`;
  };

  ui.potionHtml = function (pid, slot, opts) {
    opts = opts || {};
    if (!pid) return `<span class="potion empty" title="空药水栏">○</span>`;
    const p = STS.potions.byId[pid];
    return `<span class="potion" data-slot="${slot}" title="${p.name}：${p.desc}">${ui.iconHtml(p.icon, 'icon')}</span>`;
  };

  ui.statusHtml = function (statuses) {
    const parts = [];
    if (statuses.strength) parts.push(`<span class="status str" title="力量：攻击伤害提升">💪${statuses.strength}</span>`);
    if (statuses.vuln) parts.push(`<span class="status vuln" title="易伤：受到的攻击伤害 +50%">🎯${statuses.vuln}</span>`);
    if (statuses.weak) parts.push(`<span class="status weak" title="虚弱：造成的攻击伤害 -25%">🥀${statuses.weak}</span>`);
    if (statuses.demonForm) parts.push(`<span class="status power" title="恶魔形态：每回合获得力量">😈${statuses.demonForm}</span>`);
    if (statuses.doubleAttack) parts.push(`<span class="status power" title="双发：下一张攻击牌打出两次">✌️${statuses.doubleAttack}</span>`);
    return parts.join('');
  };

  // ---- 弹窗 ----
  ui.modal = function (html, opts) {
    opts = opts || {};
    ui.closeModal();
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal ${opts.cls || ''}">${html}</div>`;
    if (!opts.lock) wrap.addEventListener('click', e => { if (e.target === wrap) ui.closeModal(); });
    document.body.appendChild(wrap);
    return wrap;
  };
  ui.closeModal = function () {
    document.querySelectorAll('.modal-wrap').forEach(m => m.remove());
  };

  ui.toast = function (msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 1600);
  };

  // 飘字
  ui.floatText = function (el, text, cls) {
    if (!el) return;
    const s = document.createElement('span');
    s.className = 'float-text ' + (cls || '');
    s.textContent = text;
    el.appendChild(s);
    setTimeout(() => s.remove(), 1100);
  };

  // ---- 牌组查看/选择弹窗 ----
  // opts: { title, filter(inst)->bool, onPick(inst, realIndex), picks: true 时点击卡牌触发 onPick }
  ui.deckModal = function (run, opts) {
    opts = opts || {};
    const cards = run.deck
      .map((inst, i) => ({ inst, i }))
      .filter(x => !opts.filter || opts.filter(x.inst));
    const body = `
      <h3>${opts.title || '牌组'}（${run.deck.length} 张）</h3>
      <div class="card-grid">
        ${cards.map(x => ui.cardHtml(x.inst, { attrs: `data-deck-idx="${x.i}"` + (opts.onPick ? ' data-pick="1"' : '') })).join('') || '<p class="dim">没有符合条件的卡牌</p>'}
      </div>
      <div class="modal-actions"><button class="btn" data-close>关闭</button></div>`;
    const wrap = ui.modal(body);
    wrap.querySelector('[data-close]').onclick = () => ui.closeModal();
    if (opts.onPick) {
      wrap.querySelectorAll('[data-pick]').forEach(el => {
        el.style.cursor = 'pointer';
        el.onclick = () => { const i = +el.dataset.deckIdx; ui.closeModal(); opts.onPick(run.deck[i], i); };
      });
    }
  };

  // ---- 牌堆查看（战斗内）----
  ui.pileModal = function (title, pile) {
    const body = `
      <h3>${title}（${pile.length} 张）</h3>
      <div class="card-grid">${pile.map(inst => ui.cardHtml(inst)).join('') || '<p class="dim">空的</p>'}</div>
      <div class="modal-actions"><button class="btn" data-close>关闭</button></div>`;
    const wrap = ui.modal(body);
    wrap.querySelector('[data-close]').onclick = () => ui.closeModal();
  };

  // ---- 图鉴 ----
  ui.codexModal = function () {
    const tabs = [
      { key: 'cards', name: '卡牌' },
      { key: 'relics', name: '遗物' },
      { key: 'potions', name: '药水' }
    ];
    const body = `
      <h3>图鉴</h3>
      <div class="codex-tabs">${tabs.map((t, i) => `<button class="btn tab ${i === 0 ? 'active' : ''}" data-tab="${t.key}">${t.name}</button>`).join('')}</div>
      <div class="codex-body"></div>
      <div class="modal-actions"><button class="btn" data-close>关闭</button></div>`;
    const wrap = ui.modal(body, { cls: 'codex' });
    const renderTab = key => {
      const el = wrap.querySelector('.codex-body');
      if (key === 'cards') {
        el.innerHTML = `<div class="card-grid">${STS.cards.list.map(c => ui.cardHtml({ id: c.id, up: false })).join('')}</div>`;
      } else if (key === 'relics') {
        el.innerHTML = `<div class="relic-list">${STS.relics.list.map(r =>
          `<div class="relic-row">${ui.iconHtml(r.icon, 'icon')}<b>${r.name}</b><span>${r.desc}</span></div>`).join('')}</div>`;
      } else {
        el.innerHTML = `<div class="relic-list">${STS.potions.list.map(p =>
          `<div class="relic-row">${ui.iconHtml(p.icon, 'icon')}<b>${p.name}</b><span>${p.desc}</span></div>`).join('')}</div>`;
      }
    };
    wrap.querySelectorAll('[data-tab]').forEach(btn => {
      btn.onclick = () => {
        wrap.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTab(btn.dataset.tab);
      };
    });
    wrap.querySelector('[data-close]').onclick = () => ui.closeModal();
    renderTab('cards');
  };

  // ---- HUD（局内顶栏）----
  ui.hudHtml = function (run) {
    const floor = run.pos.floor + 1;
    return `
      <div class="hud">
        <div class="hud-left">
          <span class="hud-hp">❤️ ${run.hp}/${run.maxHp}</span>
          <span class="hud-gold">${ui.iconHtml('gold', 'icon sm')} ${run.gold}</span>
          <span class="hud-floor">第 ${Math.max(1, floor)} 层 / 16</span>
        </div>
        <div class="hud-relics">${run.relics.map(id => ui.relicHtml(id)).join('')}</div>
        <div class="hud-right">
          <span class="hud-potions">${run.potions.map((p, i) => ui.potionHtml(p, i)).join('')}</span>
          <button class="btn sm" data-hud="deck">牌组(${run.deck.length})</button>
          <button class="btn sm" data-hud="codex">图鉴</button>
          <button class="btn sm" data-hud="menu">菜单</button>
        </div>
      </div>`;
  };

  ui.bindHud = function (rootEl, run) {
    rootEl.querySelector('[data-hud="deck"]').onclick = () => ui.deckModal(run);
    rootEl.querySelector('[data-hud="codex"]').onclick = () => ui.codexModal();
    rootEl.querySelector('[data-hud="menu"]').onclick = () => {
      STS.state.save(run);
      STS.game.screen = 'menu';
      ui.render();
    };
    // 地图上的治疗药水可直接使用
    rootEl.querySelectorAll('.hud-potions .potion[data-slot]').forEach(el => {
      const slot = +el.dataset.slot;
      const pid = run.potions[slot];
      if (pid && STS.potions.byId[pid].anyWhere && STS.game.screen !== 'combat') {
        el.classList.add('usable');
        el.onclick = () => {
          run.hp = Math.min(run.maxHp, run.hp + STS.potions.byId[pid].effect.v);
          run.potions[slot] = null;
          ui.toast('回复了 10 点生命');
          ui.render();
        };
      }
    });
  };

  // ---- 界面路由 ----
  ui.render = function () {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const screen = STS.game.screen;
    if (screen === 'menu') ui.renderMenu(app);
    else if (screen === 'map') ui.renderMap(app);
    else if (screen === 'combat') ui.renderCombat(app);
    else if (screen === 'reward') ui.renderReward(app);
    else if (screen === 'shop') ui.renderShop(app);
    else if (screen === 'rest') ui.renderRest(app);
    else if (screen === 'chest') ui.renderChest(app);
    else if (screen === 'event') ui.renderEvent(app);
    else if (screen === 'gameover') ui.renderGameOver(app);
    else if (screen === 'victory') ui.renderVictory(app);
  };

  ui.gotoMap = function () {
    STS.state.save(STS.game.run);
    STS.game.screen = 'map';
    STS.game.combat = null;
    ui.render();
  };

  // ---- 主菜单 ----
  ui.renderMenu = function (app) {
    const saved = STS.state.load();
    const hasRun = saved && !saved.done;
    app.innerHTML = `
      <div class="screen menu-screen">
        <div class="title-block">
          <h1 class="game-title">杀戮尖塔</h1>
          <div class="game-subtitle">WEB 版 · 第一章 · 铁甲战士</div>
        </div>
        <div class="menu-hero">${ui.iconHtml('node_boss', 'hero-icon')}</div>
        <div class="menu-actions">
          ${hasRun ? '<button class="btn primary big" data-act="continue">继续征程</button>' : ''}
          <button class="btn big" data-act="new">新的征程</button>
          <button class="btn big" data-act="codex">图鉴</button>
        </div>
        <div class="menu-footer">图标素材 © game-icons.net（CC BY 3.0） · 灵感致敬 Slay the Spire</div>
      </div>`;
    if (hasRun) app.querySelector('[data-act="continue"]').onclick = () => {
      STS.game.run = saved;
      STS.game.screen = 'map';
      ui.render();
    };
    app.querySelector('[data-act="new"]').onclick = () => {
      if (hasRun && !confirm('已有一局进行中的游戏，要开始新游戏并覆盖存档吗？')) return;
      STS.state.clearSave();
      STS.game.run = STS.state.newRun();
      STS.state.save(STS.game.run);
      STS.game.screen = 'map';
      ui.render();
    };
    app.querySelector('[data-act="codex"]').onclick = () => ui.codexModal();
  };

  // ---- 失败结算 ----
  ui.renderGameOver = function (app) {
    const run = STS.game.run;
    STS.state.clearSave();
    app.innerHTML = `
      <div class="screen end-screen defeat">
        <h1>你倒下了</h1>
        <p class="end-detail">铁甲战士在第 ${run.pos.floor + 1} 层倒下了。</p>
        <p class="end-detail">击杀了 ${run.combatsFought} 场战斗 · 收集了 ${run.relics.length} 件遗物</p>
        <button class="btn primary big" data-act="menu">回到主菜单</button>
      </div>`;
    app.querySelector('[data-act="menu"]').onclick = () => { STS.game.screen = 'menu'; ui.render(); };
  };

  // ---- 通关结算 ----
  ui.renderVictory = function (app) {
    const run = STS.game.run;
    run.done = true;
    STS.state.clearSave();
    app.innerHTML = `
      <div class="screen end-screen win">
        <h1>🏆 第一章通关！</h1>
        <p class="end-detail">史莱姆王轰然倒地，铁甲战士站在塔顶俯瞰大地。</p>
        <p class="end-detail">剩余生命 ${run.hp}/${run.maxHp} · 金币 ${run.gold} · 牌组 ${run.deck.length} 张 · 遗物 ${run.relics.length} 件</p>
        <div class="end-relics">${run.relics.map(id => ui.relicHtml(id)).join('')}</div>
        <button class="btn primary big" data-act="menu">回到主菜单</button>
      </div>`;
    app.querySelector('[data-act="menu"]').onclick = () => { STS.game.screen = 'menu'; ui.render(); };
  };
})(typeof window !== 'undefined' ? window : globalThis);