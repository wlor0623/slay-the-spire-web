# 杀戮尖塔 Web 版 · 第一章 · 铁甲战士

纯 HTML/CSS/JS 实现的杀戮尖塔（Slay the Spire）式爬塔卡牌游戏，无需构建、无需服务器。

## 运行

直接双击 `index.html` 用浏览器打开即可游玩（推荐 Chrome / Edge）。

## 内容

- **战士角色**：75 血、3 能量，初始牌组 打击×5 / 防御×4 / 痛击×1，初始遗物 燃烧之血
- **21 张卡牌**：含旋风斩（X 费 AOE）、重刃、完美打击、全身撞击、武装、恶魔形态、双发等
- **战斗机制**：四堆循环、格挡、力量 / 易伤 / 虚弱、消耗、敌人意图、伤害飘字
- **敌人**：邪教徒、颚虫、虱虫、酸液史莱姆 + 精英（大地精贵族、哨卫×3）+ Boss 史莱姆王（半血分裂）
- **16 层程序生成地图**：战斗 / 精英 / 休息 / 商店 / 宝箱 / 事件 / Boss
- **8 件遗物、4 种药水、4 个事件**，战斗奖励三选一加牌
- `localStorage` 自动存档，支持断点继续

## 目录结构

- `index.html` / `css/style.css` — 页面与样式
- `js/data/` — 卡牌 / 敌人 / 遗物 / 药水 / 事件数据
- `js/core/` — 战斗引擎、地图生成、存档（兼容 Node，可供测试引用）
- `js/ui/` — 各界面渲染与交互
- `assets/icons/` — 本地 SVG 图标（game-icons.net, CC BY 3.0）
- `scripts/fetch-assets.mjs` — 素材下载脚本
- `test/logic.test.mjs` — 核心逻辑测试

## 测试

```
node --test test/logic.test.mjs
```

## 素材更新

```
node scripts/fetch-assets.mjs                  # 从 game-icons.net 下载
node scripts/fetch-assets.mjs --from <本地game-icons仓库目录>
```

图标素材 © [game-icons.net](https://game-icons.net)（CC BY 3.0），按 `assets/manifest.source.json` 清单抓取，下载失败自动回退 Emoji。灵感致敬 MegaCrit《Slay the Spire》。