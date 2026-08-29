// 运行状态（一局游戏）与 localStorage 存档。
(function (root) {
  const STS = (root.STS = root.STS || {});
  const SAVE_KEY = 'sts_run_v1';

  function newRun(seed) {
    seed = seed == null ? (Date.now() % 2147483647) : seed;
    const deck = [];
    for (let i = 0; i < 5; i++) deck.push({ id: 'strike', up: false });
    for (let i = 0; i < 4; i++) deck.push({ id: 'defend', up: false });
    deck.push({ id: 'bash', up: false });
    return {
      seed,
      character: 'ironclad',
      hp: 75, maxHp: 75,
      gold: 50,
      deck,
      relics: ['burning_blood'],
      potions: [null, null, null],
      map: STS.map.generateMap(seed),
      pos: { floor: -1, idx: -1 },   // -1 表示尚未进入第 0 层
      combatsFought: 0,
      shopRemoved: {},               // 记录每个商店节点是否已使用删牌服务 "f:i": true
      done: false                    // 通关或死亡
    };
  }

  // 当前可选节点：入口层全部可选；之后只能沿连线走
  function availableNodes(run) {
    if (run.pos.floor < 0) return run.map.floors[0].map((_, i) => ({ floor: 0, idx: i }));
    const cur = run.map.floors[run.pos.floor][run.pos.idx];
    return cur.edges.map(k => ({ floor: run.pos.floor + 1, idx: k }));
  }

  function hasStorage() { return typeof localStorage !== 'undefined'; }

  function save(run) {
    if (!hasStorage()) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(run)); } catch (e) { /* 忽略 */ }
  }

  function load() {
    if (!hasStorage()) return null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearSave() {
    if (!hasStorage()) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 忽略 */ }
  }

  STS.state = { newRun, availableNodes, save, load, clearSave, SAVE_KEY };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.state;
})(typeof window !== 'undefined' ? window : globalThis);