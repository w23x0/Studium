// 组装核心：数据目录锁 → 派生索引 → 知识层 → Studium + Hub → 本地服务。
// main 与验收测试都从这里起，内部怎么拆不影响它们。
import { cp, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConversationKind } from '../shared/records.ts';
import { Crosslinks } from './crosslinks.ts';
import { Evidence } from './evidence.ts';
import { Hub } from './hub.ts';
import { Inputs } from './inputs.ts';
import { Lookback } from './lookback.ts';
import { startServer, type RunningServer } from './http/server.ts';
import { DerivedIndex } from './index/derived-index.ts';
import { Library } from './knowledge/m07.ts';
import { Notes } from './knowledge/m07-notes.ts';
import { Originals } from './knowledge/m07-originals.ts';
import { SourceReports } from './knowledge/m07-reports.ts';
import { M08 } from './knowledge/m08.ts';
import { ReviewStore } from './knowledge/m08-review.ts';
import { M08Review } from './m08-review.ts';
import { M09 } from './knowledge/m09.ts';
import { Deviations } from './knowledge/m05-deviations.ts';
import { M10 } from './knowledge/m10.ts';
import { M14 } from './knowledge/m14.ts';
import { M15 } from './knowledge/m15.ts';
import { Objections } from './knowledge/objections.ts';
import { SourceNotes } from './knowledge/source-notes.ts';
import { Outputs } from './outputs.ts';
import { DataDir } from './log/data-dir.ts';
import { isNotFound } from './log/session-log.ts';
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
  /** M07 书库根目录（每本书 <书>/m07/index.md）；默认用样例教材。 */
  library?: string;
  /**
   * M08 目录（points.jsonl / clauses.jsonl）；默认 <数据>/knowledge/m08，空时拷入样例。
   * 可以给多个目录，或一个目录下按 <书>/<章>/ 摆的多套产出，合并读取（点 id 重复时加前缀，见 M08.loadAll）。
   */
  m08Dir?: string | string[];
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
  /** M14 产出物与个人笔记（回放重做学习者在这两处的动作用）。 */
  outputs: Outputs;
  /** M08 候选区与更正（回放重做学习者在这里的动作用）。 */
  m08Review: M08Review;
  notes: Notes;
  studium: Studium;
  dataDir: DataDir;
  close(): Promise<void>;
}

const KINDS: ConversationKind[] = [
  'main',
  'talk',
  'loop',
  'guard',
  'm09',
  'm05',
  'm15',
  'm10',
  'output',
];

export async function loadPrompts(): Promise<Record<ConversationKind, string>> {
  const entries = await Promise.all(
    KINDS.map(async (k) => [k, await readFile(join(here, `prompts/${k}.md`), 'utf8')] as const),
  );
  return Object.fromEntries(entries) as Record<ConversationKind, string>;
}

async function isEmptyDir(dir: string): Promise<boolean> {
  try {
    return (await readdir(dir)).length === 0;
  } catch (err) {
    if (isNotFound(err)) return true;
    throw err;
  }
}

export async function createApp(opts: AppOptions): Promise<App> {
  const dataDir = await DataDir.acquire(opts.dataRoot);
  const index = await DerivedIndex.open(join(dataDir.root, 'index.sqlite'), dataDir);
  const ownM08 = join(dataDir.root, 'knowledge', 'm08');
  if (opts.m08Dir === undefined && (await isEmptyDir(ownM08))) {
    await cp(join(SAMPLE_DIR, 'm08'), ownM08, { recursive: true });
  }
  const m08 = await M08.loadAll(
    opts.m08Dir === undefined ? [ownM08] : Array.isArray(opts.m08Dir) ? opts.m08Dir : [opts.m08Dir],
  );
  const m09 = await M09.load(join(dataDir.root, 'knowledge', 'm09'));
  const m10 = await M10.load(join(dataDir.root, 'knowledge', 'm10'));
  const m15 = await M15.load(join(dataDir.root, 'knowledge', 'm15'));
  const deviations = await Deviations.load(join(dataDir.root, 'knowledge', 'm05'));
  const objections = await Objections.load(join(dataDir.root, 'knowledge', 'objections'));
  const library = new Library(
    opts.library ?? join(SAMPLE_DIR, '书库'),
    join(dataDir.root, 'knowledge', 'm07-notes'),
  );
  const notes = new Notes(
    join(dataDir.root, 'knowledge', 'm07-notes'),
    library,
    opts.now ?? (() => new Date()),
  );
  const originals = new Originals(library, join(dataDir.root, 'cache', 'pages'));
  const reports = await SourceReports.load(join(dataDir.root, 'knowledge', 'source-reports'));
  const sources = new Sources({
    library,
    originals,
    m08,
    reports,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const cross = new Crosslinks({
    library,
    m08,
    reports,
    originals,
    notes: await SourceNotes.load(join(dataDir.root, 'knowledge', 'source-notes')),
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const outputs = new Outputs({
    store: await M14.load(join(dataDir.root, 'knowledge', 'm14')),
    sources,
    library,
    m08,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const m08Review = M08Review.create({
    store: await ReviewStore.load(join(dataDir.root, 'knowledge', 'm08-review')),
    m08,
    sources,
    m14: { candidates: () => outputs.candidates(), outputTitle: (id) => outputs.titleOf(id) },
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const teaching = new TeachingTools(OFFICIAL_TOOLS_DIR, join(dataDir.root, 'teaching-tools'));
  const studium = new Studium({
    prompts: await loadPrompts(),
    m07: library,
    sources,
    m08,
    m09,
    m10,
    m15,
    objections,
    deviations,
    teaching,
    outputs,
    cross,
    m08Review,
    ...(opts.now !== undefined ? { now: opts.now } : {}),
  });
  const inner = typeof opts.model === 'function' ? opts.model(dataDir.root) : opts.model;
  const recorder =
    opts.tape !== undefined
      ? new Recorder(opts.tape, {
          now: opts.now ?? (() => new Date()),
          ...(opts.library !== undefined ? { library: opts.library } : {}),
          ...(opts.m08Dir !== undefined ? { m08Dir: opts.m08Dir } : {}),
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
  m08Review.attach(hub);
  recorder?.attach(hub, studium, inner.name);
  opts.instrument?.(hub, studium);
  await studium.ensureMain();
  await studium.recover();
  const evidence = new Evidence({
    hub,
    m08,
    m09,
    m10,
    m15,
    objections,
    sources,
    inputs,
    teaching,
    m08Review,
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
        m15,
        ...(opts.now !== undefined ? { now: opts.now } : {}),
      }),
    },
    inputs,
    outputs: recorder ? recorder.wrap(outputs, 'outputs.') : outputs,
    m08Review: recorder ? recorder.wrap(m08Review, 'm08review.') : m08Review,
    studium: recorder ? recorder.wrapStudium(studium) : studium,
    token: opts.token,
    port: opts.port,
    ...(opts.uiDir !== undefined ? { uiDir: opts.uiDir } : {}),
  });
  return {
    server,
    hub,
    outputs,
    m08Review,
    notes,
    studium,
    dataDir,
    close: async () => {
      await server.close();
      // 后台清单（合上之后、M15 整理、M10 记录）跑完再关，免得写到一半
      await studium.settled();
      await hub.close();
      index.close();
      await dataDir.release();
    },
  };
}
