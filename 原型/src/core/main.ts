// 启动核心：npm start（先构建界面）或 npm run dev。
// 环境变量：STUDIUM_MODEL=claude|fake（默认 claude）· STUDIUM_CLAUDE_MODEL · STUDIUM_DATA · STUDIUM_PORT · STUDIUM_TOKEN
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { ClaudeAgentSdkModel } from './model/claude-agent-sdk.ts';
import { FakeModel } from './model/fake.ts';
import type { ModelAdapter } from './model/port.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function pickModel(dataRoot: string): ModelAdapter {
  const which = process.env.STUDIUM_MODEL ?? 'claude';
  if (which === 'fake') return new FakeModel();
  if (which === 'claude') {
    const model = process.env.STUDIUM_CLAUDE_MODEL;
    return new ClaudeAgentSdkModel({ cwd: dataRoot, ...(model !== undefined ? { model } : {}) });
  }
  throw new Error(`STUDIUM_MODEL 只能是 claude 或 fake，收到 ${which}`);
}

const uiDir = join(root, 'dist/ui');
const token = process.env.STUDIUM_TOKEN ?? randomBytes(16).toString('hex');
const app = await createApp({
  dataRoot: resolve(process.env.STUDIUM_DATA ?? join(root, 'var')),
  model: pickModel,
  token,
  port: Number(process.env.STUDIUM_PORT ?? 4317),
  ...(existsSync(uiDir) ? { uiDir } : {}),
});
console.log(`Studium 核心已启动（数据：${app.dataDir.root}）`);
console.log(`在浏览器打开：${app.server.url}/?token=${token}`);

const stop = async () => {
  await app.close();
  process.exit(0);
};
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
