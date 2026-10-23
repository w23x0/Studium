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
import { Lookback } from './lookback.ts';
import { startServer, type RunningServer } from './http/server.ts';
import { DerivedIndex } from './index/derived-index.ts';
import { Library } from './knowledge/library.ts';
import { Materials } from './knowledge/materials.ts';
import { Notes } from './knowledge/notes.ts';
import { Originals } from './knowledge/originals.ts';
import { SourceReports } from './knowledge/source-reports.ts';
import { PedagogyStore } from './knowledge/pedagogy.ts';
import { OutputStore } from './knowledge/output.ts';
import { StateStore } from './knowledge/state.ts';
import { Objections } from './knowledge/objections.ts';
import { SourceNotes } from './knowledge/source-notes.ts';
import { Outputs } from './outputs.ts';
import { checkDataVersion, DataDir, writeDataVersion } from './log/data-dir.ts';
import type { ModelAdapter } from './model/port.ts';
import { Sources } from './sources.ts';
import { SidebarStore } from './sidebar.ts';
import { OFFICIAL_TOOLS_DIR, TeachingTools } from './teaching-tools.ts';
import { Studium } from './studium.ts';
import { Recorder } from './tape/recorder.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const SAMPLE_DIR = join(here, '../../样例');

export interface AppOptions {
  dataRoot: string;
  model: ModelAdapter | ((dataRoot: string) => ModelAdapter);
  token: string;
  port: number;
  uiDir?: string;
  /** 书库根目录（每本书下是切分结果）；默认用样例教材。 */
  library?: string;
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
  /** 知识产出物与个人笔记（回放重做学习者在这两处的动作用）。 */
  outputs: Outputs;
  notes: Notes;
  studium: Studium;
  dataDir: DataDir;
  close(): Promise<void>;
}

/** 全部会话种类（提示词一个种类一份，按这个名单装载）。 */
const KINDS: readonly ConversationKind[] = CONVERSATION_KINDS;

/** 用证据标准的会话：提示词后面接 prompts/evidence.md。只给守卫：学习对话拿到这把尺子会照着去造证据（10-23）。 */
const EVIDENCE_KINDS: ConversationKind[] = ['guard'];

export async function loadPrompts(): Promise<Record<ConversationKind, string>> {
  const evidence = await readFile(join(here, 'prompts/evidence.md'), 'utf8');
  const entries = await Promise.all(
    KINDS.map(async (k) => {
      const own = await readFile(join(here, `prompts/${k}.md`), 'utf8');
      return [k, EVIDENCE_KINDS.includes(k) ? `${own}\n${evidence}` : own] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<ConversationKind, string>;
}

export async function createApp(opts: AppOptions): Promise<App> {
  await checkDataVersion(opts.dataRoot);
  const dataDir = await DataDir.acquire(opts.dataRoot);
  await writeDataVersion(dataDir.root);
  const index = await DerivedIndex.open(join(dataDir.root, 'index.sqlite'), dataDir);
  const pedagogy = await PedagogyStore.load(join(dataDir.root, 'knowledge', 'pedagogy'));
  const state = await StateStore.load(join(dataDir.root, 'knowledge', 'state'));
  const objections = await Objections.load(join(dataDir.root, 'knowledge', 'objections'));
  const library = new Library(
    opts.library ?? join(SAMPLE_DIR, '书库'),
    join(dataDir.root, 'knowledge', 'notes'),
  );
  const notes = new Notes(
    join(dataDir.root, 'knowledge', 'notes'),
    library,
    opts.now ?? (() => new Date()),
  );
  // 项目资料（工单 W8）：读原文都经它，认不出的 id 退回书库；个人笔记仍在书库那边（W9 分流）
  const materials = new Materials({
    root: join(dataDir.root, 'projects'),
    library,
    pdfTool: join(here, '../../../书库处理'),
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const originals = new Originals(materials, join(dataDir.root, 'cache', 'pages'));
  const reports = await SourceReports.load(join(dataDir.root, 'knowledge', 'source-reports'));
  const sources = new Sources({
    library: materials,
    originals,
    reports,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const cross = new Crosslinks({
    library: materials,
    reports,
    originals,
    notes: await SourceNotes.load(join(dataDir.root, 'knowledge', 'source-notes')),
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const outputs = new Outputs({
    store: await OutputStore.load(join(dataDir.root, 'knowledge', 'output')),
    sources,
    library: materials,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const teaching = new TeachingTools(OFFICIAL_TOOLS_DIR, join(dataDir.root, 'teaching-tools'));
  const studium = new Studium({
    prompts: await loadPrompts(),
    library: materials,
    materials,
    sources,
    dataDir: dataDir.root,
    pedagogy,
    state,
    objections,
    teaching,
    outputs,
    cross,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const inner = typeof opts.model === 'function' ? opts.model(dataDir.root) : opts.model;
  const recorder =
    opts.tape !== undefined
      ? new Recorder(opts.tape, {
          now: opts.now ?? (() => new Date()),
          ...(opts.library !== undefined ? { library: opts.library } : {}),
        })
      : undefined;
  const model = recorder ? recorder.wrapModel(inner) : inner;
  const inputs = await Inputs.load({
    dir: join(dataDir.root, 'inputs'),
    model,
    instructions: await readFile(join(here, 'prompts/transcribe.md'), 'utf8'),
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const hub = new Hub({
    dataDir,
    index,
    model,
    kinds: studium.kind,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  studium.attach(hub);
  outputs.attach(hub);
  recorder?.attach(hub, studium, inner.name);
  opts.instrument?.(hub, studium);
  await studium.ensureMain();
  const evidence = new Evidence({
    hub,
    learned: studium.learned,
    pedagogy,
    state,
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
    notes: recorder ? recorder.wrap(notes, 'notes.') : notes,
    evidence,
    cross: {
      links: cross,
      lookback: new Lookback({
        evidence,
        state,
        ...(opts.now !== undefined ? { now: opts.now } : {}),
      }),
    },
    inputs,
    outputs: recorder ? recorder.wrap(outputs, 'outputs.') : outputs,
    studium: recorder ? recorder.wrapStudium(studium) : studium,
    token: opts.token,
    port: opts.port,
    ...(opts.uiDir !== undefined ? { uiDir: opts.uiDir } : {}),
  });
  return {
    server,
    hub,
    outputs,
    notes,
    studium,
    dataDir,
    close: async () => {
      await server.close();
      // 后台清单（合上之后、状态整理、教法记录整理）跑完再关，免得写到一半
      await studium.settled();
      await hub.close();
      index.close();
      await dataDir.release();
    },
  };
}
