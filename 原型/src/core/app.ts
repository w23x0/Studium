// 组装核心：数据目录锁 → 派生索引 → 知识层 → Studium + Hub → 本地服务。
// main 与验收测试都从这里起，内部怎么拆不影响它们。
import { cp, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConversationKind } from '../shared/records.ts';
import { Hub } from './hub.ts';
import { startServer, type RunningServer } from './http/server.ts';
import { DerivedIndex } from './index/derived-index.ts';
import { Library } from './knowledge/m07.ts';
import { M08 } from './knowledge/m08.ts';
import { M09 } from './knowledge/m09.ts';
import { M10 } from './knowledge/m10.ts';
import { M15 } from './knowledge/m15.ts';
import { DataDir } from './log/data-dir.ts';
import { isNotFound } from './log/session-log.ts';
import type { ModelAdapter } from './model/port.ts';
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
  /** M08 目录（points.jsonl / clauses.jsonl）；默认 <数据>/knowledge/m08，空时拷入样例。 */
  m08Dir?: string;
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

const KINDS: ConversationKind[] = ['main', 'talk', 'loop', 'guard', 'm09', 'm05', 'm15', 'm10'];

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
  const m08Dir = opts.m08Dir ?? join(dataDir.root, 'knowledge', 'm08');
  if (opts.m08Dir === undefined && (await isEmptyDir(m08Dir))) {
    await cp(join(SAMPLE_DIR, 'm08'), m08Dir, { recursive: true });
  }
  const studium = new Studium({
    prompts: await loadPrompts(),
    m07: new Library(opts.library ?? join(SAMPLE_DIR, '书库')),
    m08: await M08.load(m08Dir),
    m09: await M09.load(join(dataDir.root, 'knowledge', 'm09')),
    m10: await M10.load(join(dataDir.root, 'knowledge', 'm10')),
    m15: await M15.load(join(dataDir.root, 'knowledge', 'm15')),
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
  await studium.ensureMain();
  const server = await startServer({
    hub,
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
      // 后台清单（合上之后、M15 整理、M10 记录）跑完再关，免得写到一半
      await studium.settled();
      await hub.close();
      index.close();
      await dataDir.release();
    },
  };
}
