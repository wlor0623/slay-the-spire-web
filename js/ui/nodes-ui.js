// 节点界面：战斗奖励、商店、休息点、宝箱、问号事件。
(function (root) {
  const STS = (root.STS = root.STS || {});
  const ui = (STS.ui = STS.ui || {});
  const U = STS.util;

  // ============ 战斗奖励 ============
  ui.renderReward = function (app) {
    const run = STS.game.run;
    const rw = STS.game.reward;
    const wrap = document.createElement('div');
    wrap.className = 'screen node-screen reward-screen';
    wrap.innerHTML = ui.hudHtml(run) + `
      <div class="node-body">
        <h2>🏆 战斗胜利！</h2>
        <div class="reward-list">
          <div class="reward-item">${ui.iconHtml('gold', 'icon')} +${rw.gold} 金币</div>
          ${rw.healed > 0 ? `<div class="reward-item">❤️ 燃烧之血等回复了 ${rw.healed} 点生命</div>` : ''}
          ${rw.relic ? `<div class="reward-item">精英掉落：${ui.relicHtml(rw.relic, { name: true })}</div>` : ''}
          ${rw.potion ? `<div class="reward-item" data-rw="potion" style="cursor:pointer">拾取药水：${ui.iconHtml(STS.potions.byId[rw.potion].icon, 'icon')} ${STS.potions.byId[rw.potion].name}</div>` : ''}
        </div>
        ${rw.done ? '' : `
          <h3>选择一张卡牌加入牌组（或跳过）</h3>
          <div class="reward-cards">
            ${rw.cards.map(id => ui.cardHtml({ id, up: false }, { attrs: `data-card="${id}"` })).join('')}
          </div>
          <button class="btn" data-act="skip">跳过卡牌</button>`}
        <div class="node-actions"><button class="btn primary big" data-act="leave">继续爬塔 →</button></div>
      </div>`;
    app.appendChild(wrap);
    ui.bindHud(wrap, run);

    const potionEl = wrap.querySelector('[data-rw="potion"]');
    if (potionEl) potionEl.onclick = () => {
      const slot = run.potions.findIndex(p => !p);
      if (slot < 0) { ui.toast('药水栏已满'); return; }
      run.potions[slot] = rw.potion;
      rw.potion = null;
      ui.toast('拾取了药水');
      ui.render();
    };
    wrap.querySelectorAll('[data-card]').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => {
        run.deck.push({ id: el.dataset.card, up: false });
        rw.done = true;
        ui.toast('卡牌已加入牌组');
        ui.render();
      };
    });
    const skipBtn = wrap.querySelector('[data-act="skip"]');
    if (skipBtn) skipBtn.onclick = () => { rw.done = true; ui.render(); };
    wrap.querySelector('[data-act="leave"]').onclick = () => ui.gotoMap();
  };

  // ============ 商店 ============
  ui.buildShop = function (run, rng) {
    const price = (base, spread) => base + Math.floor(rng() * spread);
    const cards = [];
    const cardRolls = ['common', 'common', 'uncommon', 'uncommon', rng() < 0.3 ? 'rare' : 'uncommon'];
    for (const rarity of cardRolls) {
      const pool = STS.cards.list.filter(c => c.rarity === rarity);
      const id = pool[Math.floor(rng() * pool.length)].id;
      const p = rarity === 'common' ? price(45, 11) : rarity === 'uncommon' ? price(68, 15) : price(135, 31);
      cards.push({ id, price: p, sold: false });
    }
    const relicPool = STS.relics.list.filter(r => r.rarity !== 'starter' && !run.relics.includes(r.id));
    U.shuffle(relicPool, rng);
    const relics = relicPool.slice(0, 2).map(r => ({
      id: r.id, price: r.rarity === 'common' ? price(145, 21) : price(160, 31), sold: false
    }));
    const potions = [];
    for (let i = 0; i < 2; i++) {
      const p = STS.potions.list[Math.floor(rng() * STS.potions.list.length)];
      potions.push({ id: p.id, price: price(45, 16), sold: false });
    }
    STS.game.shop = { cards, relics, potions };
  };

  ui.shopPrice = function (run, base) {
    const discount = STS.combat.relicSum(run, 'shopDiscount');
    return Math.max(1, Math.round(base * (1 - discount)));
  };

  ui.renderShop = function (app) {
    const run = STS.game.run;
    const shop = STS.game.shop;
    const nodeKey = run.pos.floor + ':' + run.pos.idx;
    const removeUsed = !!run.shopRemoved[nodeKey];
    const removePrice = ui.shopPrice(run, 75);

    const wrap = document.createElement('div');
    wrap.className = 'screen node-screen shop-screen';
    wrap.innerHTML = ui.hudHtml(run) + `
      <div class="node-body">
        <h2>🏪 商店</h2>
        <p class="dim">欢迎光临，冒险者。金币: ${run.gold}</p>
        <h3>卡牌</h3>
        <div class="shop-row">
          ${shop.cards.map((c, i) => `
            <div class="shop-item ${c.sold ? 'sold' : ''}">
              ${ui.cardHtml({ id: c.id, up: false })}
              <button class="btn sm" data-buy-card="${i}" ${c.sold ? 'disabled' : ''}>${c.sold ? '已售出' : ui.shopPrice(run, c.price) + ' 金'}</button>
            </div>`).join('')}
        </div>
        <h3>遗物与药水</h3>
        <div class="shop-row">
          ${shop.relics.map((r, i) => `
            <div class="shop-item ${r.sold ? 'sold' : ''}">
              <div class="shop-goods">${ui.relicHtml(r.id, { name: true })}</div>
              <div class="dim sm">${STS.relics.byId[r.id].desc}</div>
              <button class="btn sm" data-buy-relic="${i}" ${r.sold ? 'disabled' : ''}>${r.sold ? '已售出' : ui.shopPrice(run, r.price) + ' 金'}</button>
            </div>`).join('')}
          ${shop.potions.map((p, i) => `
            <div class="shop-item ${p.sold ? 'sold' : ''}">
              <div class="shop-goods">${ui.iconHtml(STS.potions.byId[p.id].icon, 'icon')} ${STS.potions.byId[p.id].name}</div>
              <div class="dim sm">${STS.potions.byId[p.id].desc}</div>
              <button class="btn sm" data-buy-potion="${i}" ${p.sold ? 'disabled' : ''}>${p.sold ? '已售出' : ui.shopPrice(run, p.price) + ' 金'}</button>
            </div>`).join('')}
          <div class="shop-item">
            <div class="shop-goods">🗑️ 删牌服务</div>
            <div class="dim sm">从牌组中永久移除一张牌</div>
            <button class="btn sm" data-act="remove" ${removeUsed ? 'disabled' : ''}>${removeUsed ? '已使用' : removePrice + ' 金'}</button>
          </div>
        </div>
        <div class="node-actions"><button class="btn primary big" data-act="leave">离开商店 →</button></div>
      </div>`;
    app.appendChild(wrap);
    ui.bindHud(wrap, run);

    const tryPay = cost => {
      if (run.gold < cost) { ui.toast('金币不足'); return false; }
      run.gold -= cost;
      return true;
    };
    wrap.querySelectorAll('[data-buy-card]').forEach(btn => btn.onclick = () => {
      const item = shop.cards[+btn.dataset.buyCard];
      if (item.sold || !tryPay(ui.shopPrice(run, item.price))) return;
      item.sold = true;
      run.deck.push({ id: item.id, up: false });
      ui.toast('购买了「' + STS.cards.byId[item.id].name + '」');
      ui.render();
    });
    wrap.querySelectorAll('[data-buy-relic]').forEach(btn => btn.onclick = () => {
      const item = shop.relics[+btn.dataset.buyRelic];
      if (item.sold || !tryPay(ui.shopPrice(run, item.price))) return;
      item.sold = true;
      run.relics.push(item.id);
      ui.toast('购买了「' + STS.relics.byId[item.id].name + '」');
      ui.render();
    });
    wrap.querySelectorAll('[data-buy-potion]').forEach(btn => btn.onclick = () => {
      const item = shop.potions[+btn.dataset.buyPotion];
      if (item.sold) return;
      const slot = run.potions.findIndex(p => !p);
      if (slot < 0) { ui.toast('药水栏已满'); return; }
      if (!tryPay(ui.shopPrice(run, item.price))) return;
      item.sold = true;
      run.potions[slot] = item.id;
      ui.toast('购买了「' + STS.potions.byId[item.id].name + '」');
      ui.render();
    });
    wrap.querySelector('[data-act="remove"]').onclick = () => {
      if (removeUsed || !tryPay(removePrice)) return;
      ui.deckModal(run, {
        title: '选择要移除的卡牌',
        onPick: (inst, i) => {
          run.deck.splice(i, 1);
          run.shopRemoved[nodeKey] = true;
          ui.toast('移除了「' + STS.cards.byId[inst.id].name + '」');
          ui.render();
        }
      });
    };
    wrap.querySelector('[data-act="leave"]').onclick = () => ui.gotoMap();
  };

  // ============ 休息点 ============
  ui.renderRest = function (app) {
    const run = STS.game.run;
    const healAmt = Math.floor(run.maxHp * 0.3);
    const wrap = document.createElement('div');
    wrap.className = 'screen node-screen rest-screen';
    wrap.innerHTML = ui.hudHtml(run) + `
      <div class="node-body center">
        <div class="node-hero">${ui.iconHtml('node_rest', 'hero-icon')}</div>
        <h2>休息点</h2>
        <p class="dim">篝火噼啪作响，火焰让你感到安心。</p>
        <div class="choice-row">
          <button class="btn big" data-act="heal">😴 休息<br><span class="dim sm">回复 ${healAmt} 点生命（30%）</span></button>
          <button class="btn big" data-act="smith">🔨 锻造<br><span class="dim sm">升级牌组中的一张牌</span></button>
        </div>
      </div>`;
    app.appendChild(wrap);
    ui.bindHud(wrap, run);

    wrap.querySelector('[data-act="heal"]').onclick = () => {
      run.hp = Math.min(run.maxHp, run.hp + healAmt);
      ui.toast(`回复了 ${healAmt} 点生命`);
      ui.gotoMap();
    };
    wrap.querySelector('[data-act="smith"]').onclick = () => {
      ui.deckModal(run, {
        title: '锻造：选择要升级的卡牌',
        filter: inst => !inst.up && STS.cards.byId[inst.id].up,
        onPick: inst => {
          inst.up = true;
          ui.toast('「' + STS.cards.byId[inst.id].name + '」升级了！');
          ui.gotoMap();
        }
      });
    };
  };

  // ============ 宝箱 ============
  ui.renderChest = function (app) {
    const run = STS.game.run;
    const chest = STS.game.chest;
    const wrap = document.createElement('div');
    wrap.className = 'screen node-screen chest-screen';
    wrap.innerHTML = ui.hudHtml(run) + `
      <div class="node-body center">
        <div class="node-hero">${ui.iconHtml('node_chest', 'hero-icon')}</div>
        <h2>宝箱</h2>
        ${!chest.opened
          ? '<p class="dim">一个布满灰尘的宝箱，里面会是什么？</p><button class="btn primary big" data-act="open">打开宝箱</button>'
          : chest.relic
            ? `<p>宝箱里躺着一件遗物：</p><div class="chest-relic">${ui.relicHtml(chest.relic, { name: true })}<div class="dim">${STS.relics.byId[chest.relic].desc}</div></div><button class="btn primary big" data-act="take">收下并继续 →</button>`
            : '<p>宝箱里只有一些金币。</p><div class="chest-relic">🪙 +100 金币</div><button class="btn primary big" data-act="take">收下并继续 →</button>'}
      </div>`;
    app.appendChild(wrap);
    ui.bindHud(wrap, run);

    const openBtn = wrap.querySelector('[data-act="open"]');
    if (openBtn) openBtn.onclick = () => { chest.opened = true; ui.render(); };
    const takeBtn = wrap.querySelector('[data-act="take"]');
    if (takeBtn) takeBtn.onclick = () => {
      if (chest.relic) run.relics.push(chest.relic);
      else run.gold += 100;
      ui.gotoMap();
    };
  };

  // ============ 问号事件 ============
  ui.renderEvent = function (app) {
    const run = STS.game.run;
    const ctx = STS.game.event;
    const ev = ctx.def;
    const wrap = document.createElement('div');
    wrap.className = 'screen node-screen event-screen';

    if (!ctx.result) {
      wrap.innerHTML = ui.hudHtml(run) + `
        <div class="node-body center">
          <div class="node-hero">${ui.iconHtml('node_event', 'hero-icon')}</div>
          <h2>${ev.name}</h2>
          <p class="event-text">${ev.text}</p>
          <div class="choice-col">
            ${ev.options.map((opt, i) => {
              const afford = !opt.cost || !opt.cost.gold || run.gold >= opt.cost.gold;
              return `<button class="btn big" data-opt="${i}" ${afford ? '' : 'disabled'}>${opt.label}</button>`;
            }).join('')}
          </div>
        </div>`;
      app.appendChild(wrap);
      ui.bindHud(wrap, run);
      wrap.querySelectorAll('[data-opt]').forEach(btn => btn.onclick = () => applyOption(ctx, +btn.dataset.opt));
    } else {
      wrap.innerHTML = ui.hudHtml(run) + `
        <div class="node-body center">
          <div class="node-hero">${ui.iconHtml('node_event', 'hero-icon')}</div>
          <h2>${ev.name}</h2>
          <p class="event-text">${ctx.result}</p>
          <div class="node-actions"><button class="btn primary big" data-act="leave">继续爬塔 →</button></div>
        </div>`;
      app.appendChild(wrap);
      ui.bindHud(wrap, run);
      wrap.querySelector('[data-act="leave"]').onclick = () => {
        if (run.hp <= 0) { STS.game.screen = 'gameover'; ui.render(); return; }
        ui.gotoMap();
      };
    }
  };

  function applyOption(ctx, optIdx) {
    const run = STS.game.run;
    const ev = ctx.def;
    const opt = ev.options[optIdx];
    const rng = U.mulberry32(ctx.rng >>> 0);
    let needsCardRemoval = false;

    for (const eff of opt.effects) {
      switch (eff.t) {
        case 'gold': run.gold = Math.max(0, run.gold + eff.v); break;
        case 'loseHp': run.hp -= eff.v; break;
        case 'loseHpPct': run.hp -= Math.floor(run.maxHp * eff.v); break;
        case 'heal': run.hp = Math.min(run.maxHp, run.hp + eff.v); break;
        case 'healPct': run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * eff.v)); break;
        case 'removeCard': needsCardRemoval = true; break;
        case 'randomRelic': {
          const rid = ui.randomRelic(run, rng);
          if (rid) { run.relics.push(rid); ui.toast('获得遗物「' + STS.relics.byId[rid].name + '」'); }
          else run.gold += 100;
          break;
        }
      }
    }
    ctx.result = opt.result;

    if (needsCardRemoval && run.deck.length > 0 && run.hp > 0) {
      ui.deckModal(run, {
        title: '选择要删除的卡牌',
        onPick: (inst, i) => {
          run.deck.splice(i, 1);
          ui.toast('「' + STS.cards.byId[inst.id].name + '」已被遗忘');
          ui.render();
        }
      });
      // 弹窗关闭后渲染结果页
      ui.render();
      return;
    }
    ui.render();
  }
})(typeof window !== 'undefined' ? window : globalThis);