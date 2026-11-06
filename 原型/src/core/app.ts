// 组装核心：数据目录锁 → 派生索引 → 知识层 → Studium + Hub → 本地服务。
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONVERSATION_KINDS, type ConversationKind } from '../shared/records.ts';
import { Hub } from './hub.ts';
import { startServer, type RunningServer } from './http/server.ts';
import { DerivedIndex } from './index/derived-index.ts';
import { Materials } from './knowledge/materials.ts';
import { DataDir, upgradeDataDir } from './log/data-dir.ts';
import { ModelSettings } from './model/settings.ts';
import type { ModelAdapter } from './model/port.ts';
import { Sources } from './sources.ts';
import { SidebarStore } from './sidebar.ts';
import { Studium } from './studium.ts';

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
  studium: Studium;
  dataDir: DataDir;
  close(): Promise<void>;
}

export async function loadPrompts(): Promise<Record<ConversationKind, string>> {
  // 项目里各对话管哪一份（11-04）：主对话、学习对话的提示词用 {{项目}} 接同一段，分工只写一处
  const project = (await readFile(join(here, 'prompts/project.md'), 'utf8')).trim();
  const entries = await Promise.all(
    CONVERSATION_KINDS.map(async (k) => {
      const text = await readFile(join(here, `prompts/${k}.md`), 'utf8');
      return [k, text.replaceAll('{{项目}}', project)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<ConversationKind, string>;
}

export async function createApp(opts: AppOptions): Promise<App> {
  const dataDir = await DataDir.acquire(opts.dataRoot);
  try {
    await upgradeDataDir(dataDir.root);
  } catch (err) {
    await dataDir.release();
    throw err;
  }
  const index = await DerivedIndex.open(join(dataDir.root, 'index.sqlite'), dataDir);
  // 资料与外部导入存一处（工单 W8、W11）：读原文都经它
  const materials = new Materials({
    root: join(dataDir.root, '资料'),
    pdfTool: join(here, '../../../书库处理'),
  });
  // 上次处理被服务重启打断的（还标着“处理中”、导入会话也不在跑了）改成“失败”，可重试（W11 §4）
  const interrupted = await materials.recoverInterrupted();
  if (interrupted.length > 0) {
    console.log(`上次处理被重启打断、已标失败（可重试）的资料：${interrupted.join('、')}`);
  }
  const sources = new Sources(materials);
  const studium = new Studium({
    prompts: await loadPrompts(),
    // 学习对话提示词里“页面”那一段（W12 起竖流是唯一的学习页）
    loopPage: await readFile(join(here, 'prompts/loop-stream.md'), 'utf8'),
    materials,
    sources,
    dataDir: dataDir.root,
  });
  const model = typeof opts.model === 'function' ? opts.model(dataDir.root) : opts.model;
  const hub = new Hub({ dataDir, index, model, kinds: studium.kind });
  if (model instanceof ModelSettings)
    model.onChange = () => hub.broadcast({ type: 'model_settings', sessionId: '' });
  studium.attach(hub);
  // 第一次打开不自动建“项目 1”：没有项目时界面显示全部项目页的空状态，新建时先问想学什么（界面说明 §3）
  const server = await startServer({
    hub,
    ...(model instanceof ModelSettings ? { models: model } : {}),
    sidebar: await SidebarStore.load(join(dataDir.root, 'ui', 'sidebar.jsonl')),
    sources,
    studium,
    token: opts.token,
    port: opts.port,
    ...(opts.uiDir !== undefined ? { uiDir: opts.uiDir } : {}),
  });
  return {
    server,
    hub,
    studium,
    dataDir,
    close: async () => {
      await server.close();
      // 后台的事（讨论串结束后告诉主对话、导入会话）跑完再关，免得写到一半
      await studium.settled();
      await hub.close();
      if (model instanceof ModelSettings) await model.close();
      index.close();
      await dataDir.release();
    },
  };
}
