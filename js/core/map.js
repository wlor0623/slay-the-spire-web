// 爬塔地图生成：16 层分支地图，保证连通性。
// 节点类型: M 战斗 / E 精英 / R 休息 / S 商店 / T 宝箱 / ? 事件 / B Boss
(function (root) {
  const STS = (root.STS = root.STS || {});
  const U = STS.util;

  const FLOORS = 16;
  const BOSS_FLOOR = FLOORS - 1;   // 15
  const REST_FLOOR = FLOORS - 2;   // 14（Boss 前必休息）
  const CHEST_FLOOR = 7;           // 中层宝箱

  function makeNode(type, x) { return { type, x, edges: [] }; }

  function rollType(rng, floor) {
    const entries = [{ v: 'M', w: 45 }, { v: '?', w: 22 }];
    if (floor >= 4) entries.push({ v: 'E', w: 10 });
    if (floor >= 5) entries.push({ v: 'R', w: 15 });
    if (floor >= 4) entries.push({ v: 'S', w: 8 });
    return U.weightedPick(rng, entries);
  }

  function generateMap(seed) {
    const rng = U.mulberry32(seed);
    const floors = [];

    // 第 0 层：3 个战斗入口
    floors.push([0.2, 0.5, 0.8].map(x => makeNode('M', x)));

    // 第 1..13 层
    for (let f = 1; f <= 13; f++) {
      const n = U.randInt(rng, 3, 4);
      const nodes = [];
      for (let i = 0; i < n; i++) {
        const baseX = (i + 0.5) / n;
        const x = Math.min(0.92, Math.max(0.08, baseX + (rng() - 0.5) * 0.16));
        const type = f === CHEST_FLOOR ? 'T' : rollType(rng, f);
        nodes.push(makeNode(type, x));
      }
      nodes.sort((a, b) => a.x - b.x);
      floors.push(nodes);
    }

    floors.push([makeNode('R', 0.5)]);           // 14 层休息点
    floors.push([makeNode('B', 0.5)]);           // 15 层 Boss

    // 连线：每个节点连向下一层最近的 1~2 个节点
    for (let f = 0; f < FLOORS - 1; f++) {
      const cur = floors[f], nxt = floors[f + 1];
      cur.forEach((node, j) => {
        const byDist = nxt.map((n2, k) => ({ k, d: Math.abs(n2.x - node.x) })).sort((a, b) => a.d - b.d);
        node.edges.push(byDist[0].k);
        if (byDist[1] && rng() < 0.6) node.edges.push(byDist[1].k);
        node.edges = [...new Set(node.edges)].sort((a, b) => a - b);
      });
      // 保证下一层每个节点至少有一条入边
      nxt.forEach((n2, k) => {
        const hasIncoming = cur.some(node => node.edges.includes(k));
        if (!hasIncoming) {
          const nearest = cur.map((n1, j) => ({ j, d: Math.abs(n1.x - n2.x) })).sort((a, b) => a.d - b.d)[0].j;
          cur[nearest].edges.push(k);
          cur[nearest].edges = [...new Set(cur[nearest].edges)].sort((a, b) => a - b);
        }
      });
    }

    // 保底：全图至少 2 个精英、1 个商店
    const flat = [];
    for (let f = 4; f <= 13; f++) floors[f].forEach((n, i) => { if (n.type === 'M') flat.push({ f, i }); });
    U.shuffle(flat, rng);
    const countType = t => floors.flat().filter(n => n.type === t).length;
    let need = Math.max(0, 2 - countType('E')) + Math.max(0, 1 - countType('S'));
    let idx = 0;
    while (need > 0 && idx < flat.length) {
      const elites = countType('E'), shops = countType('S');
      if (elites < 2) floors[flat[idx].f][flat[idx].i].type = 'E';
      else if (shops < 1) floors[flat[idx].f][flat[idx].i].type = 'S';
      idx++; need--;
    }

    return { floors };
  }

  // 从起点出发可达的节点集合（用于测试与 UI 高亮）
  function reachable(map) {
    const seen = new Set();
    const queue = map.floors[0].map((_, i) => ({ f: 0, i }));
    queue.forEach(p => seen.add(p.f + ':' + p.i));
    while (queue.length) {
      const { f, i } = queue.shift();
      for (const k of map.floors[f][i].edges) {
        const key = (f + 1) + ':' + k;
        if (!seen.has(key)) { seen.add(key); queue.push({ f: f + 1, i: k }); }
      }
    }
    return seen;
  }

  STS.map = { generateMap, reachable, FLOORS, BOSS_FLOOR, REST_FLOOR, CHEST_FLOOR };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.map;
})(typeof window !== 'undefined' ? window : globalThis);