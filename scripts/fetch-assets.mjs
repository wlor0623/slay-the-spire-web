// 素材下载脚本：按 assets/manifest.source.json 抓取 game-icons.net 图标到 assets/icons/，
// 并生成 assets/manifest.js（浏览器全局 STS_ICONS，含 emoji 回退）。
// 用法：
//   node scripts/fetch-assets.mjs                 # 从 game-icons.net 下载
//   node scripts/fetch-assets.mjs --from <dir>    # 从本地 game-icons 仓库克隆目录复制
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(root, 'assets/manifest.source.json'), 'utf8'));
const outDir = join(root, 'assets/icons');
mkdirSync(outDir, { recursive: true });

const fromIdx = process.argv.indexOf('--from');
const fromDir = fromIdx >= 0 ? process.argv[fromIdx + 1] : null;

const result = {};
let okCount = 0;
const failed = [];

for (const [key, info] of Object.entries(src.icons)) {
  const outFile = join(outDir, `${key}.svg`);
  result[key] = { emoji: info.emoji, ok: false };
  try {
    if (fromDir) {
      const local = join(fromDir, info.author, `${info.name}.svg`);
      if (!existsSync(local)) throw new Error(`本地不存在: ${local}`);
      copyFileSync(local, outFile);
    } else {
      const url = src.source.replace('{author}', info.author).replace('{name}', info.name);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
    }
    result[key].ok = true;
    okCount++;
  } catch (err) {
    failed.push(`${key}: ${err.message}`);
  }
}

const banner = '// 由 scripts/fetch-assets.mjs 生成，请勿手改。图标素材: https://game-icons.net (CC BY 3.0)\n';
writeFileSync(join(root, 'assets/manifest.js'), banner + 'window.STS_ICONS = ' + JSON.stringify(result, null, 1) + ';\n');

console.log(`成功 ${okCount}/${Object.keys(src.icons).length}`);
if (failed.length) { console.log('失败项（将回退 emoji）:'); failed.forEach(f => console.log('  ' + f)); }