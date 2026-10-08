// 一条检查命令：类型（严格）· lint · 格式 · 测试。本地、hooks、CI 都跑这一条。
// 每步失败只打印该步输出（报错一行一条），最后汇总。
import { spawnSync } from 'node:child_process';

const steps = [
  ['类型', 'npx', ['tsc', '-p', 'tsconfig.json', '--noEmit', '--pretty', 'false']],
  [
    'lint',
    'npx',
    ['eslint', '.', '--max-warnings', '0', '--format', './scripts/eslint-oneline.cjs'],
  ],
  ['格式', 'npx', ['prettier', '--list-different', '.']],
  ['测试', 'npx', ['vitest', 'run', '--reporter', 'dot']],
];

const failed = [];
for (const [name, cmd, args] of steps) {
  const t = Date.now();
  const r = spawnSync(cmd, args, { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } });
  const secs = ((Date.now() - t) / 1000).toFixed(1);
  if (r.status === 0) {
    console.log(`✓ ${name} (${secs}s)`);
    continue;
  }
  failed.push(name);
  console.log(`✗ ${name} (${secs}s)`);
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  if (name === '格式') {
    for (const f of out.split('\n')) console.log(`${f} 格式不对：运行 npm run format`);
  } else {
    console.log(out);
  }
}

if (failed.length > 0) {
  console.log(`\n检查未通过：${failed.join('、')}`);
  process.exit(1);
}
console.log('\n检查全部通过');
