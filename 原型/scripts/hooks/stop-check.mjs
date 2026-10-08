// Stop：本次会话改过原型目录就跑一遍检查；不通过则把报错交回 agent 接着修。
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { APP_DIR, readInput } from './lib.mjs';

const input = await readInput();
if (input.stop_hook_active === true) process.exit(0); // 已经因检查失败续过一次，不再拦

const status = spawnSync('git', ['status', '--porcelain', '--', '.'], {
  cwd: APP_DIR,
  encoding: 'utf8',
});
if (status.status !== 0 || status.stdout.trim() === '') process.exit(0);
if (!existsSync(join(APP_DIR, 'node_modules'))) {
  process.stderr.write('原型目录有改动，但没装依赖，跳过检查；先在 原型/ 里 npm ci\n');
  process.exit(0);
}

const r = spawnSync('node', ['scripts/check.mjs'], { cwd: APP_DIR, encoding: 'utf8' });
if (r.status === 0) process.exit(0);
process.stderr.write(`原型检查没通过，修好再结束：\n${r.stdout}${r.stderr}`);
process.exit(2);
