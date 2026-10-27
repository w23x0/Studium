// 活页面（`docs/设计/会话/学习对话.md` §11）：一次学习里对话旁边一直在的那张页面。
// 这里管版本（只在程序内部用，不进主模型上下文）、学习者在页面上的动作、浏览器试跑。
// 改页面由主模型派出的页面子代理做（agent.ts）；页面内容按块按指纹存（store.ts），正本只记版本号与清单指纹。
import type {
  PageAction,
  PageActionsRequest,
  PageBlockRef,
  PageManifest,
  PageStateResponse,
  PageTrialResult,
  PageVersionView,
} from '../../shared/page.ts';
import type { NumberedRecord, PageVersion } from '../../shared/records.ts';
import { localMinute } from '../../shared/time.ts';
import type { Hub } from '../hub.ts';
import type { PageStore } from './store.ts';

/** 学习者连续的动作在这么久之内合成一条、算一版。 */
const MERGE_MS = 4000;
/** 试跑等浏览器回话最多这么久；没人开着页面就不等了，直接上（标“没试跑”）。 */
const TRIAL_WAIT_MS = 20_000;
/** 一个动作的 detail 交给模型时最多保留多少字。 */
const DETAIL_MAX = 600;
/** 页面子代理的名字（派它、认它的记录都用这个）。 */
export const PAGE_AGENT = 'page';

export interface LivePagesDeps {
  hub: () => Hub;
  store: PageStore;
  iso: () => string;
  newId: (prefix: string) => string;
  /** 学习对话还开着（没结束）；不是就抛 BadRequestError。 */
  assertOpen: (loopId: string) => Promise<void>;
  /** 学习者那边的请求不合规矩时抛的错（server 按 400 回）。 */
  badRequest: (message: string) => Error;
}

interface Current {
  version: number;
  manifest: string;
  m: PageManifest;
  lastBlock: number;
}

export class LivePages {
  /** 只常驻每次学习的当前版（旧版要用时从磁盘读）。 */
  private readonly current = new Map<string, Current>();
  private readonly buffers = new Map<string, { actions: PageAction[]; timer: NodeJS.Timeout }>();
  private readonly trials = new Map<string, (r: PageTrialResult) => void>();

  constructor(private readonly o: LivePagesDeps) {}

  private get hub(): Hub {
    return this.o.hub();
  }

  // ───────────── 版本 ─────────────

  /** 现在第几版（还没有页面 = undefined，即第 0 版）。 */
  async now(loopId: string): Promise<Current | undefined> {
    const cached = this.current.get(loopId);
    if (cached !== undefined) return cached;
    const last = versionsOf(await this.hub.records(loopId)).at(-1);
    if (last === undefined) return undefined;
    const cur = {
      version: last.record.version,
      manifest: last.record.manifest,
      m: await this.o.store.manifest<PageManifest>(loopId, last.record.manifest),
      lastBlock: last.record.lastBlock,
    };
    this.current.set(loopId, cur);
    return cur;
  }

  async version(loopId: string): Promise<number> {
    return (await this.now(loopId))?.version ?? 0;
  }

  /** 记新的一版（块已存好）；返回版本号。 */
  async publish(
    loopId: string,
    p: {
      m: PageManifest;
      by: PageVersion['by'];
      from?: number;
      trialed?: boolean;
      lastBlock: number;
    },
  ): Promise<number> {
    const prev = await this.now(loopId);
    const manifest = await this.o.store.putManifest(loopId, p.m);
    const d = diff(prev?.m.blocks ?? [], p.m.blocks);
    const version = (prev?.version ?? 0) + 1;
    await this.hub.record(loopId, {
      type: 'page_version',
      at: this.o.iso(),
      version,
      manifest,
      by: p.by,
      ...(p.from !== undefined ? { from: p.from } : {}),
      ...d,
      ...(p.trialed !== undefined ? { trialed: p.trialed } : {}),
      lastBlock: p.lastBlock,
    });
    this.current.set(loopId, { version, manifest, m: p.m, lastBlock: p.lastBlock });
    return version;
  }

  /** 某一版的每一块（看旧版、编辑员摊文件、守卫读页面都经这里）。 */
  async content(
    loopId: string,
    version: number,
  ): Promise<{ id: string; summary: string; html: string }[]> {
    const m = await this.manifestOf(loopId, version);
    return Promise.all(
      m.blocks.map(async (b) => ({
        id: b.id,
        summary: b.summary,
        html: await this.o.store.block(loopId, b.hash),
      })),
    );
  }

  private async manifestOf(loopId: string, version: number): Promise<PageManifest> {
    const cur = await this.now(loopId);
    if (cur?.version === version) return cur.m;
    const v = versionsOf(await this.hub.records(loopId)).find((r) => r.record.version === version);
    if (v === undefined) throw this.o.badRequest(`没有第 ${String(version)} 版`);
    return this.o.store.manifest<PageManifest>(loopId, v.record.manifest);
  }

  async state(loopId: string): Promise<PageStateResponse> {
    const records = await this.hub.records(loopId);
    const vs = versionsOf(records);
    const versions: PageVersionView[] = vs.map(({ line, record: r }, i) => ({
      version: r.version,
      line,
      at: r.at,
      by: r.by,
      ...(r.from !== undefined ? { from: r.from } : {}),
      added: r.added,
      removed: r.removed,
      changed: r.changed,
      same: i > 0 && vs[i - 1]?.record.manifest === r.manifest,
    }));
    return { current: vs.at(-1)?.record.version ?? 0, versions, editing: editing(records) };
  }

  // ───────────── 学习者在页面上 ─────────────

  /** 学习者的动作：攒一会儿合成一条、算一版；等回应的（awaited）立刻推给学习对话。 */
  async act(loopId: string, req: PageActionsRequest): Promise<void> {
    await this.o.assertOpen(loopId);
    if ((await this.now(loopId)) === undefined) throw this.o.badRequest('页面还是空的');
    const buf = this.buffers.get(loopId);
    if (buf !== undefined) clearTimeout(buf.timer);
    const actions = [...(buf?.actions ?? []), ...req.actions];
    const timer = setTimeout(() => {
      this.flush(loopId, false).catch((e: unknown) => {
        console.error('页面动作落盘失败：', e);
      });
    }, MERGE_MS);
    this.buffers.set(loopId, { actions, timer });
    if (req.awaited === true) await this.flush(loopId, true);
  }

  private async flush(loopId: string, awaited: boolean): Promise<void> {
    const buf = this.buffers.get(loopId);
    if (buf === undefined) return;
    clearTimeout(buf.timer);
    this.buffers.delete(loopId);
    const cur = await this.now(loopId);
    if (cur === undefined || buf.actions.length === 0) return;
    const version = await this.publish(loopId, {
      m: cur.m,
      by: 'learner',
      lastBlock: cur.lastBlock,
    });
    const line = await this.hub.record(loopId, {
      type: 'page_actions',
      at: this.o.iso(),
      version,
      actions: buf.actions,
      awaited,
    });
    if (awaited) {
      // 等回应的动作当场交给主模型（会话/学习对话.md §11）：身份是学习者，和说的话一样；在跑就并进本轮
      await this.hub.send(
        loopId,
        { role: 'learner', text: `（在页面上）${describeActions(buf.actions, cur.m)}` },
        { recorded: line },
      );
    }
  }

  async error(loopId: string, version: number, message: string): Promise<void> {
    await this.hub.record(loopId, {
      type: 'page_error',
      at: this.o.iso(),
      version,
      message: message.slice(0, 2000),
    });
  }

  // ───────────── 试跑 ─────────────

  /** 新一版先在学习者浏览器的隐藏小窗里跑；没人开着页面时等不到回话，返回 undefined。 */
  trial(
    loopId: string,
    blocks: { id: string; html: string }[],
  ): Promise<PageTrialResult | undefined> {
    const trialId = this.o.newId('trial');
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.trials.delete(trialId);
        resolve(undefined);
      }, TRIAL_WAIT_MS);
      this.trials.set(trialId, (r) => {
        clearTimeout(timer);
        this.trials.delete(trialId);
        resolve(r);
      });
      this.hub.broadcast({ type: 'page_trial', sessionId: loopId, trialId, blocks });
    });
  }

  /** 浏览器交回试跑结果（几个标签页都开着时，先到的算）。 */
  trialResult(trialId: string, r: PageTrialResult): void {
    this.trials.get(trialId)?.(r);
  }

  // ───────────── 每轮附给学习对话的 ─────────────

  /**
   * 上一轮之后学习者在页面上做的事（没等回应、攒着的那些），按时间各一条，附在学习者这一轮的话前面；
   * 身份是学习者，和说的话一样（会话/学习对话.md §3）。页面在学习者那边报错也按时间接上（程序看到的）。
   * 从正本现算（上一条 turn_context 之后），重启也不丢；没有就为空。
   */
  async preface(loopId: string): Promise<string> {
    const records = await this.hub.records(loopId);
    const lastCtx = records.filter((r) => r.record.type === 'turn_context').at(-1)?.line ?? 0;
    const after = records.filter((r) => r.line > lastCtx);
    const m = (await this.now(loopId))?.m;
    return after
      .flatMap(({ line, record: r }) => {
        const head = `[第 ${String(line)} 行 · ${localMinute(r.at)}]`;
        if (r.type === 'page_actions' && !r.awaited) {
          return [`${head} （在页面上）${describeActions(r.actions, m)}`];
        }
        if (r.type === 'page_error') {
          return [`${head} 页面在学习者那边运行时报错：${r.message.slice(0, 300)}`];
        }
        return [];
      })
      .join('\n');
  }

  /** 守卫读的页面：最后一版每块的一句话与文字（去掉标签与代码）。 */
  async textForGuard(loopId: string): Promise<string | undefined> {
    const cur = await this.now(loopId);
    if (cur === undefined) return undefined;
    const blocks = await this.content(loopId, cur.version);
    return [
      '学习者最后看到的页面（每块：一句话、页面上的文字）：',
      ...blocks.map((b) => `- ${b.summary}：${visibleText(b.html).slice(0, 1500)}`),
    ].join('\n');
  }
}

// ───────────── 纯函数 ─────────────

export function versionsOf(records: NumberedRecord[]): { line: number; record: PageVersion }[] {
  return records.flatMap(({ line, record: r }) =>
    r.type === 'page_version' ? [{ line, record: r }] : [],
  );
}

/** 子代理正在改页面：派出去了、还没交回（看正本，重启也对）。 */
export function editing(records: NumberedRecord[]): boolean {
  return openTasks(records).length > 0;
}

/** 派出去还没交回的页面子代理（taskId）。 */
export function openTasks(records: NumberedRecord[]): string[] {
  const open = new Set<string>();
  for (const { record: r } of records) {
    if (r.type === 'subagent_started' && r.agent === PAGE_AGENT) open.add(r.taskId);
    if (r.type === 'subagent_result') open.delete(r.taskId);
  }
  return [...open];
}

function diff(
  before: PageBlockRef[],
  after: PageBlockRef[],
): { added: string[]; removed: string[]; changed: string[] } {
  const old = new Map(before.map((b) => [b.id, b.hash]));
  const now = new Set(after.map((b) => b.id));
  return {
    added: after.filter((b) => !old.has(b.id)).map((b) => b.id),
    removed: before.filter((b) => !now.has(b.id)).map((b) => b.id),
    changed: after.filter((b) => old.has(b.id) && old.get(b.id) !== b.hash).map((b) => b.id),
  };
}

/** 学习者在页面上的动作各一句；块用它的一句话指（编号不进主模型上下文）。 */
export function describeActions(actions: PageAction[], m?: PageManifest): string {
  const name = (id: string) => {
    const summary = m?.blocks.find((b) => b.id === id)?.summary;
    return summary !== undefined && summary !== '' ? `「${summary}」` : '一块';
  };
  return actions
    .map((a) => {
      if (a.kind === 'toggle') return `${a.open ? '展开' : '折起'}了${name(a.block)}`;
      const detail =
        a.detail === undefined ? '' : `：${JSON.stringify(a.detail).slice(0, DETAIL_MAX)}`;
      return `${a.block !== undefined ? `在${name(a.block)}上` : ''}「${a.name}」${detail}`;
    })
    .join('；');
}

/** 一块 HTML 里学习者看得到的文字（粗略：去掉脚本、样式与标签）。 */
export function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
