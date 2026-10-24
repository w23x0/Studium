// 启动核心：npm start（先构建界面）或 npm run dev。
// 环境变量：STUDIUM_CLAUDE_MODEL · STUDIUM_PROFILES · STUDIUM_DATA · STUDIUM_PORT · STUDIUM_TOKEN
// · STUDIUM_TAPE（录带文件：给了就录这次运行，供 npm run replay 离线回放；宜配一个新的空 STUDIUM_DATA）
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { ClaudeAgentSdkModel } from './model/claude-agent-sdk.ts';
import type { ModelAdapter } from './model/port.ts';
import { mergeProfiles } from './model/profiles.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function pickModel(dataRoot: string): ModelAdapter {
  const model = process.env.STUDIUM_CLAUDE_MODEL;
  const raw = process.env.STUDIUM_PROFILES;
  return new ClaudeAgentSdkModel({
    cwd: dataRoot,
    profiles: mergeProfiles(raw === undefined ? undefined : (JSON.parse(raw) as unknown)),
    ...(model !== undefined ? { model } : {}),
  });
}

const uiDir = join(root, 'dist/ui');
const token = process.env.STUDIUM_TOKEN ?? randomBytes(16).toString('hex');
const app = await createApp({
  dataRoot: resolve(process.env.STUDIUM_DATA ?? join(root, 'var')),
  model: pickModel,
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
