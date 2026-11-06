// 启动核心：npm start（先构建界面）或 npm run dev。
// 环境变量：STUDIUM_MODEL_ADAPTER · STUDIUM_CLAUDE_MODEL · STUDIUM_CODEX_MODEL · STUDIUM_CODEX_BIN
// · STUDIUM_PROFILES · STUDIUM_DATA · STUDIUM_PORT · STUDIUM_TOKEN
// · STUDIUM_TAPE（录带文件：给了就录这次运行，供 npm run replay 离线回放；宜配一个新的空 STUDIUM_DATA）
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { ModelSettings } from './model/settings.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// 口令存在数据目录里，重启不变：手机上的书签一直能用
function savedToken(dataRoot: string): string {
  const file = join(dataRoot, 'token');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const fresh = randomBytes(24).toString('hex');
  mkdirSync(dataRoot, { recursive: true });
  writeFileSync(file, `${fresh}\n`, { mode: 0o600 });
  return fresh;
}

const uiDir = join(root, 'dist/ui');
const dataRoot = resolve(process.env.STUDIUM_DATA ?? join(root, 'var'));
const token = process.env.STUDIUM_TOKEN ?? savedToken(dataRoot);
const app = await createApp({
  dataRoot,
  model: (root) => new ModelSettings(root),
  token,
  port: Number(process.env.STUDIUM_PORT ?? 4317),
  ...(existsSync(uiDir) ? { uiDir } : {}),
  ...(process.env.STUDIUM_TAPE !== undefined ? { tape: resolve(process.env.STUDIUM_TAPE) } : {}),
});
console.log(`Studium 核心已启动（数据：${app.dataDir.root}）`);
console.log(`在浏览器打开：${app.server.url}/?token=${token}`);

const stop = async () => {
  await app.close();
  process.exit(0);
};
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
