// 地图界面：16 层分支地图渲染（SVG 连线 + 节点按钮）、节点进入逻辑。
(function (root) {
  const STS = (root.STS = root.STS || {});
  const ui = (STS.ui = STS.ui || {});
  const U = STS.util;

  const NODE_INFO = {
    M: { icon: 'node_combat', name: '战斗' },
    E: { icon: 'node_elite', name: '精英' },
    R: { icon: 'node_rest', name: '休息' },
    S: { icon: 'node_shop', name: '商店' },
    T: { icon: 'node_chest', name: '宝箱' },
    '?': { icon: 'node_event', name: '事件' },
    B: { icon: 'node_boss', name: 'Boss' }
  };

  ui.renderMap = function (app) {
    const run = STS.game.run;
    const available = STS.state.availableNodes(run).map(p => p.floor + ':' + p.idx);
    const wrap = document.createElement('div');
    wrap.className = 'screen map-screen';
    wrap.innerHTML = ui.hudHtml(run) + `
      <div class="map-container">
        <div class="map-inner" id="mapInner">
          <svg class="map-edges" id="mapEdges"></svg>
          <div class="map-nodes" id="mapNodes"></div>
        </div>
      </div>
      <div class="map-legend">
        ${Object.entries(NODE_INFO).map(([t, n]) => `<span>${ui.iconHtml(n.icon, 'icon sm')} ${n.name}</span>`).join('')}
      </div>`;
    app.appendChild(wrap);
    ui.bindHud(wrap, run);

    const nodesEl = wrap.querySelector('#mapNodes');
    const edgesEl = wrap.querySelector('#mapEdges');
    const floors = run.map.floors;
    const H = floors.length * 64 + 40;

    // 节点（自底向上：第 0 层在最下面）
    floors.forEach((floor, f) => {
      floor.forEach((node, i) => {
        const info = NODE_INFO[node.type];
        const el = document.createElement('button');
        const key = f + ':' + i;
        el.className = 'map-node type-' + (node.type === '?' ? 'event' : node.type);
        if (available.includes(key)) el.classList.add('available');
        if (f === run.pos.floor && i === run.pos.idx) el.classList.add('current');
        if (f < run.pos.floor) el.classList.add('passed');
        el.style.left = `calc(${(node.x * 100).toFixed(2)}% - 24px)`;
        el.style.top = (H - 60 - f * 64) + 'px';
        el.title = `${info.name}（第 ${f + 1} 层）`;
        el.innerHTML = ui.iconHtml(info.icon, 'icon');
        el.dataset.floor = f; el.dataset.idx = i;
        if (available.includes(key)) {
          el.onclick = () => ui.enterNode(f, i);
        } else {
          el.disabled = true;
        }
        nodesEl.appendChild(el);
      });
    });

    // 连线
    let svg = '';
    floors.forEach((floor, f) => {
      if (f >= floors.length - 1) return;
      floor.forEach(node => {
        node.edges.forEach(k => {
          const n2 = floors[f + 1][k];
          const x1 = node.x * 100, y1 = H - 36 - f * 64;
          const x2 = n2.x * 100, y2 = H - 36 - (f + 1) * 64;
          svg += `<line x1="${x1}%" y1="${y1}" x2="${x2}%" y2="${y2}" />`;
        });
      });
    });
    edgesEl.style.height = H + 'px';
    nodesEl.style.height = H + 'px';
    edgesEl.innerHTML = svg;

    // 滚动到当前位置附近
    const container = wrap.querySelector('.map-container');
    const focusY = H - 60 - Math.max(0, run.pos.floor + 3) * 64;
    container.scrollTop = Math.max(0, focusY);
  };

  // ---- 进入节点 ----
  ui.enterNode = function (floor, idx) {
    const run = STS.game.run;
    run.pos = { floor, idx };
    const node = run.map.floors[floor][idx];
    STS.state.save(run);
    const rng = U.mulberry32((run.seed ^ (floor * 131 + idx * 17)) >>> 0);

    if (node.type === 'M' || node.type === 'E' || node.type === 'B') {
      const kind = node.type === 'M' ? 'normal' : node.type === 'E' ? 'elite' : 'boss';
      const pool = STS.enemies.encounters[kind];
      const encounter = pool[Math.floor(rng() * pool.length)];
      run.combatsFought++;
      STS.game.combat = STS.combat.start(run, encounter, {
        elite: kind === 'elite', boss: kind === 'boss', combatIndex: run.combatsFought
      });
      STS.game.screen = 'combat';
    } else if (node.type === 'R') {
      STS.game.screen = 'rest';
    } else if (node.type === 'S') {
      ui.buildShop(run, rng);
      STS.game.screen = 'shop';
    } else if (node.type === 'T') {
      STS.game.chest = { relic: ui.randomRelic(run, rng), opened: false };
      STS.game.screen = 'chest';
    } else if (node.type === '?') {
      const ev = STS.events.list[Math.floor(rng() * STS.events.list.length)];
      STS.game.event = { def: ev, result: null, rng: run.seed ^ (floor * 31 + idx) };
      STS.game.screen = 'event';
    }
    ui.render();
  };

  // 随机一件未拥有遗物（排除初始与商店限定）
  ui.randomRelic = function (run, rng) {
    const pool = STS.relics.list.filter(r =>
      r.rarity !== 'starter' && r.id !== 'membership_card' && !run.relics.includes(r.id));
    if (!pool.length) return null;
    return U.weightedPick(rng, pool.map(r => ({
      v: r.id, w: r.rarity === 'common' ? 60 : r.rarity === 'uncommon' ? 32 : 8
    })));
  };

  // 按稀有度权重随机一张非基础牌
  ui.randomCard = function (rng, eliteBonus) {
    const rarity = U.weightedPick(rng, eliteBonus
      ? [{ v: 'common', w: 50 }, { v: 'uncommon', w: 40 }, { v: 'rare', w: 10 }]
      : [{ v: 'common', w: 62 }, { v: 'uncommon', w: 33 }, { v: 'rare', w: 5 }]);
    const pool = STS.cards.list.filter(c => c.rarity === rarity);
    return pool[Math.floor(rng() * pool.length)].id;
  };
})(typeof window !== 'undefined' ? window : globalThis);