// 通用工具：可播种随机数、洗牌、随机选取等。浏览器与 Node 双端可用。
(function (root) {
  const STS = (root.STS = root.STS || {});

  // mulberry32：可播种伪随机数生成器
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function randInt(rng, min, max) { // 含两端
    return min + Math.floor(rng() * (max - min + 1));
  }

  function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }

  // weighted: [{v, w}] -> v
  function weightedPick(rng, entries) {
    const total = entries.reduce((s, e) => s + e.w, 0);
    let r = rng() * total;
    for (const e of entries) { r -= e.w; if (r < 0) return e.v; }
    return entries[entries.length - 1].v;
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  STS.util = { mulberry32, shuffle, randInt, pick, weightedPick, deepClone };
  if (typeof module !== 'undefined' && module.exports) module.exports = STS.util;
})(typeof window !== 'undefined' ? window : globalThis);