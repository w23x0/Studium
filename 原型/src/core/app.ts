// 组装核心：数据目录锁 → 派生索引 → Hub → 本地服务。main 与验收测试都从这里起，内部怎么拆不影响它们。
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hub } from './hub.ts';
import { startServer, type RunningServer } from './http/server.ts';
import { DerivedIndex } from './index/derived-index.ts';
import { DataDir } from './log/data-dir.ts';
import type { ModelAdapter } from './model/port.ts';

const here = dirname(fileURLToPath(import.meta.url));

export interface AppOptions {
  dataRoot: string;
  model: ModelAdapter | ((dataRoot: string) => ModelAdapter);
  token: string;
  port: number;
  uiDir?: string;
}

export interface App {
  server: RunningServer;
  hub: Hub;
  dataDir: DataDir;
  close(): Promise<void>;
}

export async function loadPrompts(): Promise<Record<'main', string>> {
  return { main: await readFile(join(here, 'prompts/main.md'), 'utf8') };
}

export async function createApp(opts: AppOptions): Promise<App> {
  const dataDir = await DataDir.acquire(opts.dataRoot);
  const index = await DerivedIndex.open(join(dataDir.root, 'index.sqlite'), dataDir);
  const model = typeof opts.model === 'function' ? opts.model(dataDir.root) : opts.model;
  const hub = new Hub({ dataDir, index, model, systemPrompts: await loadPrompts() });
  const server = await startServer({
    hub,
    token: opts.token,
    port: opts.port,
    ...(opts.uiDir !== undefined ? { uiDir: opts.uiDir } : {}),
  });
  return {
    server,
    hub,
    dataDir,
    close: async () => {
      await server.close();
      await hub.close();
      index.close();
      await dataDir.release();
    },
  };
}
