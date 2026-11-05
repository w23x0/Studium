// 组装核心：数据目录锁 → 派生索引 → 知识层 → Studium + Hub → 本地服务。
// main 与验收测试都从这里起，内部怎么拆不影响它们。
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONVERSATION_KINDS, type ConversationKind } from '../shared/records.ts';
import { Crosslinks } from './crosslinks.ts';
import { Evidence } from './evidence.ts';
import { Hub } from './hub.ts';
import { Inputs } from './inputs.ts';
import { startServer, type RunningServer } from './http/server.ts';
import { DerivedIndex } from './index/derived-index.ts';
import { Materials } from './knowledge/materials.ts';
import { Originals } from './knowledge/originals.ts';
import { SourceReports } from './knowledge/source-reports.ts';
import { Objections } from './knowledge/objections.ts';
import { SourceNotes } from './knowledge/source-notes.ts';
import { DataDir, upgradeDataDir } from './log/data-dir.ts';
import type { ModelAdapter } from './model/port.ts';
import { Sources } from './sources.ts';
import { SidebarStore } from './sidebar.ts';
import { OFFICIAL_TOOLS_DIR, TeachingTools } from './teaching-tools.ts';
import { Studium } from './studium.ts';
import { Recorder } from './tape/recorder.ts';

const here = dirname(fileURLToPath(import.meta.url));

export interface AppOptions {
  dataRoot: string;
  model: ModelAdapter | ((dataRoot: string) => ModelAdapter);
  token: string;
  port: number;
  uiDir?: string;
  /** 时钟（测试与回放用）；记录时间、离开多久都按它算。 */
  now?: () => Date;
  /** 录带文件：给了就把这次运行的模型侧与学习者动作记进去，供离线回放（tape/）。 */
  tape?: string;
  /** 在开第一个会话之前接上 Hub 与 Studium（回放用来对编号）。 */
  instrument?: (hub: Hub, studium: Studium) => void;
}

export interface App {
  server: RunningServer;
  hub: Hub;
  studium: Studium;
  dataDir: DataDir;
  close(): Promise<void>;
}

/** 全部会话种类（提示词一个种类一份，按这个名单装载）。 */
const KINDS: readonly ConversationKind[] = CONVERSATION_KINDS;

/**
 * 不再开的会话种类：没有自己的提示词文件（守卫 10-31 起；导航、检索子代理、状态整理、教法记录整理、写产出、
 * 页面编辑员 W12 起；找资料 11-04 起；谈方向 W20 起）。旧会话照旧能打开看。
 */
const RETIRED_PROMPT_KINDS: readonly ConversationKind[] = [
  'talk',
  'guard',
  'nav',
  'retrieve',
  'state',
  'pedagogy',
  'output',
  'find',
  'editor',
];

export async function loadPrompts(): Promise<Record<ConversationKind, string>> {
  // 项目里各对话管哪一份（11-04）：主对话、学习对话的提示词用 {{项目}} 接同一段，分工只写一处
  const project = (await readFile(join(here, 'prompts/project.md'), 'utf8')).trim();
  const entries = await Promise.all(
    KINDS.map(async (k) => {
      if (RETIRED_PROMPT_KINDS.includes(k)) return [k, ''] as const;
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
  const objections = await Objections.load(join(dataDir.root, 'knowledge', 'objections'));
  // 资料与外部导入存一处（工单 W8、W11）：读原文都经它
  const materials = new Materials({
    root: join(dataDir.root, '资料'),
    pdfTool: join(here, '../../../书库处理'),
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  // 上次处理被服务重启打断的（还标着“处理中”、导入会话也不在跑了）改成“失败”，可重试（W11 §4）
  const interrupted = await materials.recoverInterrupted();
  if (interrupted.length > 0) {
    console.log(`上次处理被重启打断、已标失败（可重试）的资料：${interrupted.join('、')}`);
  }
  const originals = new Originals(materials, join(dataDir.root, 'cache', 'pages'));
  const reports = await SourceReports.load(join(dataDir.root, 'knowledge', 'source-reports'));
  const sources = new Sources({
    materials,
    originals,
    reports,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const cross = new Crosslinks({
    materials,
    reports,
    originals,
    notes: await SourceNotes.load(join(dataDir.root, 'knowledge', 'source-notes')),
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  // 附图原样存（W12 §5.6 起原样随消息送给模型，不再转写）
  const inputs = await Inputs.load({
    dir: join(dataDir.root, 'inputs'),
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const teaching = new TeachingTools(OFFICIAL_TOOLS_DIR, join(dataDir.root, 'teaching-tools'));
  const studium = new Studium({
    prompts: await loadPrompts(),
    // 学习对话提示词里“页面”那一段（W12 起竖流是唯一的学习页）
    loopPage: await readFile(join(here, 'prompts/loop-stream.md'), 'utf8'),
    materials,
    sources,
    dataDir: dataDir.root,
    objections,
    teaching,
    inputs,
    cross,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const inner = typeof opts.model === 'function' ? opts.model(dataDir.root) : opts.model;
  const recorder =
    opts.tape !== undefined
      ? new Recorder(opts.tape, { now: opts.now ?? (() => new Date()) })
      : undefined;
  const model = recorder ? recorder.wrapModel(inner) : inner;
  const hub = new Hub({
    dataDir,
    index,
    model,
    kinds: studium.kind,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  studium.attach(hub);
  recorder?.attach(hub, studium, inner.name);
  opts.instrument?.(hub, studium);
  // 第一次打开不自动建“项目 1”：没有项目时界面显示全部项目页的空状态，新建时先问想学什么（界面说明 §3）
  const evidence = new Evidence({
    hub,
    learned: studium.learned,
    objections,
    sources,
    inputs,
    teaching,
    webSearchKinds: () => studium.webSearchKinds(),
  });
  const server = await startServer({
    hub,
    sidebar: await SidebarStore.load(join(dataDir.root, 'ui', 'sidebar.jsonl'), opts.now),
    sources,
    evidence,
    cross: { links: cross },
    inputs,
    studium: recorder ? recorder.wrapStudium(studium) : studium,
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
      // 后台清单（合上之后、导入会话）跑完再关，免得写到一半
      await studium.settled();
      await hub.close();
      index.close();
      await dataDir.release();
    },
  };
}
