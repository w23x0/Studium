// 启动核心：npm start（先构建界面）或 npm run dev。
// 环境变量：STUDIUM_MODEL=claude|fake（默认 claude）· STUDIUM_CLAUDE_MODEL · STUDIUM_DATA · STUDIUM_PORT
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hub } from './hub.ts';
import { startServer } from './http/server.ts';
import { DataDir } from './log/data-dir.ts';
import { ClaudeAgentSdkModel } from './model/claude-agent-sdk.ts';
import { FakeModel } from './model/fake.ts';
import type { ModelAdapter } from './model/port.ts';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

function pickModel(dataRoot: string): ModelAdapter {
  const which = process.env.STUDIUM_MODEL ?? 'claude';
  if (which === 'fake') return new FakeModel();
  if (which === 'claude') {
    const model = process.env.STUDIUM_CLAUDE_MODEL;
    return new ClaudeAgentSdkModel({ cwd: dataRoot, ...(model !== undefined ? { model } : {}) });
  }
  throw new Error(`STUDIUM_MODEL 只能是 claude 或 fake，收到 ${which}`);
}

async function main(): Promise<void> {
  const dataDir = await DataDir.acquire(resolve(process.env.STUDIUM_DATA ?? join(root, 'var')));
  const model = pickModel(dataDir.root);
  const hub = new Hub({
    dataDir,
    model,
    systemPrompts: { main: await readFile(join(here, 'prompts/main.md'), 'utf8') },
  });
  const uiDir = join(root, 'dist/ui');
  const token = process.env.STUDIUM_TOKEN ?? randomBytes(16).toString('hex');
  const server = await startServer({
    hub,
    token,
    port: Number(process.env.STUDIUM_PORT ?? 4317),
    ...(existsSync(uiDir) ? { uiDir } : {}),
  });
  console.log(`Studium 核心已启动（模型：${model.name}，数据：${dataDir.root}）`);
  console.log(`在浏览器打开：${server.url}/?token=${token}`);

  const stop = async () => {
    await server.close();
    await hub.close();
    await dataDir.release();
    process.exit(0);
  };
  process.once('SIGINT', () => void stop());
  process.once('SIGTERM', () => void stop());
}

await main();
