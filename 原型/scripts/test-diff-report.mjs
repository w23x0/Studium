// CI 用：列出本次改动里删掉或改掉的测试断言（expect 行），让人一眼看到测试有没有被放水。
// 用法：node scripts/test-diff-report.mjs <基准分支>
import { spawnSync } from 'node:child_process';

const base = process.argv[2] ?? 'origin/main';
spawnSync('git', ['fetch', '--depth=50', 'origin', base.replace(/^origin\//, '')], {
  stdio: 'ignore',
});
const diff = spawnSync(
  'git',
  ['diff', '--unified=0', `${base}...HEAD`, '--', '*.test.ts', 'e2e/*.spec.ts'],
  { encoding: 'utf8' },
);
if (diff.status !== 0) {
  console.log(`拿不到与 ${base} 的差异，跳过：${diff.stderr.trim()}`);
  process.exit(0);
}
let file = '';
const removed = [];
for (const line of diff.stdout.split('\n')) {
  if (line.startsWith('--- a/')) file = line.slice(6);
  else if (line.startsWith('-') && !line.startsWith('---') && /expect\(/.test(line)) {
    removed.push(`${file}: ${line.slice(1).trim()}`);
  }
}
if (removed.length === 0) console.log('没有删改已有断言');
else {
  console.log(`删改了 ${String(removed.length)} 条已有断言：`);
  for (const r of removed) console.log(`  ${r}`);
}
