// PostToolUse（Edit / Write）：改完原型里的文件就格式化、lint --fix；剩下的 lint 错误回给 agent。
import { spawnSync } from 'node:child_process';
import { APP_DIR, inApp, readInput } from './lib.mjs';

const input = await readInput();
const file = input.tool_input?.file_path;
const rel = inApp(file);
if (rel === undefined || !/\.(ts|tsx|js|mjs|json|css|md|html)$/.test(rel)) process.exit(0);

const run = (args) =>
  spawnSync('npx', args, {
    cwd: APP_DIR,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });

run(['prettier', '--write', '--log-level', 'warn', rel]);
if (/\.(ts|tsx)$/.test(rel)) {
  const r = run(['eslint', '--fix', '--format', './scripts/eslint-oneline.cjs', rel]);
  if (r.status !== 0) {
    process.stderr.write(`lint 还有问题，请修：\n${r.stdout}${r.stderr}`);
    process.exit(2);
  }
}
