// 跑验收测试，按结果刷新 功能清单.json 的“状态”。浏览器主路径（e2e）不在这里跑，另用 npm run e2e。
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const list = JSON.parse(readFileSync('功能清单.json', 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'studium-features-'));
const out = join(dir, 'report.json');
spawnSync('npx', ['vitest', 'run', 'tests/验收', '--reporter', 'json', '--outputFile', out], {
  encoding: 'utf8',
});
const report = JSON.parse(readFileSync(out, 'utf8'));
rmSync(dir, { recursive: true, force: true });
const passed = new Set(
  report.testResults
    .filter((t) => t.status === 'passed')
    .map((t) => t.name.slice(t.name.indexOf('tests/验收/'))),
);
for (const item of list) {
  if (!item.验证.startsWith('tests/验收/')) continue;
  item.状态 = passed.has(item.验证) ? '通过' : '未通过';
}
writeFileSync('功能清单.json', `${JSON.stringify(list, null, 2)}\n`);
for (const item of list)
  console.log(`${item.状态 === '通过' ? '✓' : '✗'} ${item.id}：${item.状态}`);
