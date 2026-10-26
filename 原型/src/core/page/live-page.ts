// 活页面（`docs/设计/会话/学习对话.md` §11）：一次学习里对话旁边一直在的那张页面。
// 这里管版本（主对话、编辑员、学习者共用一个版本号）、学习者在页面上的动作、浏览器试跑、退回。
// 改页面的代码由页面编辑员写（editor.ts）；页面内容按块按指纹存（store.ts），正本只记版本号与清单指纹。
import type {
  PageAction,
  PageActionsRequest,
  PageBlockRef,
  PageManifest,
  PageRollbackReason,
  PageStateResponse,
  PageTrialResult,
  PageVersionView,
  PageViewRequest,
} from '../../shared/page.ts';
import type { LogRecord, NumberedRecord, PageVersion } from '../../shared/records.ts';
import { effectiveCheckpoints, type Hub } from '../hub.ts';
import type { PageStore } from './store.ts';

/** 学习者连续的动作在这么久之内合成一条、算一版。 */
const MERGE_MS = 4000;
/** 试跑等浏览器回话最多这么久；没人开着页面就不等了，直接上（标“没试跑”）。 */
const TRIAL_WAIT_MS = 20_000;
/** 一个动作的 detail 进事实时最多保留多少字。 */
const DETAIL_MAX = 600;

/** 编辑员那边给页面这边的几样（退回时要一起截、要先等它停）。 */
export interface EditorsView {
  /** 这次学习的页面编辑员会话（还没开过 = undefined）。 */
  editorOf(loopId: string): string | undefined;
  /** 编辑员正在改这次学习的页面。 */
  busy(loopId: string): boolean;
  /** 编辑员的上下文截回后，它读过哪些块就不作数了。 */
  forgetReads(editorId: string): void;
}

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

/** 编辑员交回的那条程序事实以它开头；退回时据此认出“学习对话得知第 N 版改好了”那一轮。 */
export function editResultHead(version: number | undefined): string {
  return version === undefined
    ? '页面编辑员交回（没改成）：'
    : `页面编辑员交回（第 ${String(version)} 版）：`;
}

export class LivePages {
  /** 只常驻每次学习的当前版（旧版要用时从磁盘读）。 */
  private readonly current = new Map<string, Current>();
  private readonly buffers = new Map<string, { actions: PageAction[]; timer: NodeJS.Timeout }>();
  private readonly lastVisible = new Map<string, string>();
  private readonly trials = new Map<string, (r: PageTrialResult) => void>();
  private editors: EditorsView | undefined;

  constructor(private readonly o: LivePagesDeps) {}

  attachEditors(e: EditorsView): void {
    this.editors = e;
  }

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
      m: await this.o.store.manifest(loopId, last.record.manifest),
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
    return this.o.store.manifest(loopId, v.record.manifest);
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
    return {
      current: vs.at(-1)?.record.version ?? 0,
      versions,
      visible: visibleOf(records),
      editing: this.editors?.busy(loopId) ?? false,
    };
  }

  /** 页面目录：每块的编号与一句话 + 学习者此刻看得到哪几块（主对话看的就是这些，不看代码）。 */
  async catalog(loopId: string): Promise<string> {
    const cur = await this.now(loopId);
    if (cur === undefined) return '页面现在是空的（第 0 版）。';
    const visible = new Set(visibleOf(await this.hub.records(loopId)));
    return [
      `页面第 ${String(cur.version)} 版，共 ${String(cur.m.blocks.length)} 块${visible.size > 0 ? `；学习者此刻看得到 ${[...visible].join('、')}` : ''}：`,
      ...cur.m.blocks.map((b) => `- ${b.id}：${b.summary}${visible.has(b.id) ? '（看得到）' : ''}`),
    ].join('\n');
  }

  /** 从第 version 版到现在页面上发生了什么（主对话依据的版本过期时说给它听）。 */
  async since(loopId: string, version: number): Promise<string> {
    const records = await this.hub.records(loopId);
    const from = versionsOf(records).find((r) => r.record.version === version)?.line ?? 0;
    const lines = pageEventLines(records.filter((r) => r.line > from));
    return lines.length > 0 ? lines.join('；') : '（没有别的变化）';
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
    await this.hub.record(loopId, {
      type: 'page_actions',
      at: this.o.iso(),
      version,
      actions: buf.actions,
      awaited,
    });
    if (awaited) {
      // 等回应的动作当场推（会话/学习对话.md §11）；学习对话在跑就并进本轮
      await this.hub.send(loopId, {
        role: 'program',
        text: `学习者在页面上（第 ${String(version)} 版）：${describeActions(buf.actions)}。这个动作在等你回应。`,
      });
    }
  }

  /** 学习者此刻看得到哪几块（框架自己看到的，不算一版）：变了才记。 */
  async view(loopId: string, req: PageViewRequest): Promise<void> {
    const key = req.visible.join(',');
    const dwell = Object.fromEntries(
      Object.entries(req.dwell ?? {}).filter(([, s]) => Number.isFinite(s) && s >= 1),
    );
    const hasDwell = Object.keys(dwell).length > 0;
    if (this.lastVisible.get(loopId) === key && !hasDwell) return;
    this.lastVisible.set(loopId, key);
    await this.hub.record(loopId, {
      type: 'page_view',
      at: this.o.iso(),
      version: req.version,
      visible: req.visible,
      ...(hasDwell ? { dwell } : {}),
    });
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

  // ───────────── 每轮附给学习对话的页面事实 ─────────────

  /**
   * 上一轮之后页面上的事 + 页面现状，附在这一轮输入前（会话/学习对话.md §11：平时攒到学习者下次说话时附上）。
   * 从正本现算（上一条 turn_context 之后），重启也不丢；没有页面也没有页面事件时为空。
   */
  async preface(loopId: string): Promise<string> {
    const records = await this.hub.records(loopId);
    const lastCtx = records.filter((r) => r.record.type === 'turn_context').at(-1)?.line ?? 0;
    const after = records.filter((r) => r.line > lastCtx);
    // 等回应的动作当场推过了；编辑员改好的那版由它交回的事实说，这里都不重复
    const events = pageEventLines(after, { skipAwaited: true, skipEdits: true });
    const cur = await this.now(loopId);
    if (cur === undefined && events.length === 0) return '';
    const visible = visibleOf(records);
    const dwell = dwellOf(after);
    return [
      cur === undefined
        ? '页面现在是空的（第 0 版）。'
        : `页面现在第 ${String(cur.version)} 版${visible.length > 0 ? `；学习者此刻看得到 ${visible.join('、')}` : ''}${dwell !== '' ? `；停留较久的：${dwell}` : ''}。目录在 只读/页面.md。`,
      ...(events.length > 0 ? ['上一轮之后页面上的事：', ...events.map((e) => `- ${e}`)] : []),
    ].join('\n');
  }

  // ───────────── 退回 ─────────────

  /**
   * 学习者把页面退回到第 to 版（会话/学习对话.md §11）：先请主模型在现在的上下文上写一句教训，
   * 再把页面换回那一版（记成新的一版），把学习对话与编辑员的上下文截到分叉点；正本照旧全留。
   */
  async rollback(loopId: string, to: number, reason?: PageRollbackReason): Promise<number> {
    await this.o.assertOpen(loopId);
    const editorId = this.editors?.editorOf(loopId);
    if (this.hub.isRunning(loopId)) throw this.o.badRequest('正在回答，等这一轮说完再退回。');
    if (
      this.editors?.busy(loopId) === true ||
      (editorId !== undefined && this.hub.isRunning(editorId))
    ) {
      throw this.o.badRequest('页面正在改，等改完再退回。');
    }
    await this.flush(loopId, false);
    const cur = await this.now(loopId);
    if (cur === undefined || to < 1 || to >= cur.version) {
      throw this.o.badRequest(`只能退回到第 1 到第 ${String((cur?.version ?? 1) - 1)} 版`);
    }
    const records = await this.hub.records(loopId);
    const target = versionsOf(records).find((r) => r.record.version === to);
    if (target === undefined) throw this.o.badRequest(`没有第 ${String(to)} 版`);
    const m = await this.o.store.manifest(loopId, target.record.manifest);
    const back = diff(cur.m.blocks, m.blocks);
    const removed = [...back.removed, ...back.changed];
    const facts = `退回到第 ${String(to)} 版（现在第 ${String(cur.version)} 版）；退掉 ${removed.join('、') || '（没有块）'}${back.added.length > 0 ? `，换回 ${back.added.join('、')}` : ''}；${reason !== undefined ? `学习者选的原因：${reason}` : '学习者没选原因'}`;
    const lesson = await this.lesson(loopId, to, facts);
    const line = await this.hub.record(loopId, {
      type: 'page_rollback',
      at: this.o.iso(),
      to,
      version: cur.version + 1,
      removed,
      added: back.added,
      ...(reason !== undefined ? { reason } : {}),
    });
    const version = await this.publish(loopId, {
      m,
      by: 'rollback',
      from: to,
      lastBlock: cur.lastBlock,
    });
    await this.hub.record(loopId, {
      type: 'page_lesson',
      at: this.o.iso(),
      rollbackLine: line,
      text: lesson.text,
      by: lesson.by,
    });
    await this.cutContexts(loopId, editorId, records, target.line, to);
    return version;
  }

  /** 教训由主模型在现在的上下文上当场写（旁问，不进对话）；写不出时按事实拼一句、标“程序写的”。 */
  private async lesson(
    loopId: string,
    to: number,
    facts: string,
  ): Promise<{ text: string; by: 'model' | 'program' }> {
    try {
      const text = await this.hub.aside(
        loopId,
        `学习者要把页面${facts}。退回后，第 ${String(to)} 版之后的几轮会从你的上下文里拿掉。用一两句话写下教训，留给退回后的你：那几轮讲了什么、退掉了哪几块、学习者为什么退。只写教训本身，不对学习者说话。`,
      );
      return { text, by: 'model' };
    } catch (e) {
      console.error('请主模型写退回教训失败，改用程序拼的一句：', e);
      return { text: `第 ${String(to)} 版之后讲的几轮被学习者退回了：${facts}。`, by: 'program' };
    }
  }

  /**
   * 截上下文：分叉点 = 第 to 版之后学习对话收到的第一条输入（学习者的话或程序事实；
   * 编辑员交回第 to 版的那条不算，那一轮是“得知第 to 版改好了”，留着）。
   * 学习对话截到这条输入之前最后一轮的末尾；编辑员截到这个时刻之前它最后一轮的末尾。
   */
  private async cutContexts(
    loopId: string,
    editorId: string | undefined,
    records: NumberedRecord[],
    versionLine: number,
    to: number,
  ): Promise<void> {
    const boundary = records.find(
      ({ line, record: r }) =>
        line > versionLine &&
        (r.type === 'user_message' ||
          (r.type === 'program_fact' && !r.text.includes(editResultHead(to)))),
    );
    if (boundary === undefined) return; // 第 to 版之后学习对话没再跑过：没什么可截
    const adapter = this.hub.modelName;
    const why = `学习者把页面退回到第 ${String(to)} 版`;
    const loopCps = effectiveCheckpoints(records, adapter);
    const loopCut = loopCps.filter((c) => c.line < boundary.line).at(-1);
    if (loopCut !== undefined && loopCut.line !== loopCps.at(-1)?.line) {
      await this.hub.rewind(loopId, loopCut.line, why);
    }
    if (editorId === undefined) return;
    const editorRecs = await this.hub.records(editorId);
    const cps = effectiveCheckpoints(editorRecs, adapter);
    const cut = cps.filter((c) => c.at < boundary.record.at).at(-1);
    const ranAfter = editorRecs.some(
      (r) => r.record.type === 'model_checkpoint' && r.record.at >= boundary.record.at,
    );
    if (!ranAfter) return;
    await this.hub.rewind(editorId, cut?.line, why);
    this.editors?.forgetReads(editorId);
  }

  /** 守卫读的页面：最后一版每块的一句话与文字（去掉标签与代码）。 */
  async textForGuard(loopId: string): Promise<string | undefined> {
    const cur = await this.now(loopId);
    if (cur === undefined) return undefined;
    const blocks = await this.content(loopId, cur.version);
    return [
      `学习者最后看到的页面（第 ${String(cur.version)} 版，每块：编号、一句话、页面上的文字）：`,
      ...blocks.map((b) => `- ${b.id}（${b.summary}）：${visibleText(b.html).slice(0, 1500)}`),
    ].join('\n');
  }
}

// ───────────── 纯函数 ─────────────

export function versionsOf(records: NumberedRecord[]): { line: number; record: PageVersion }[] {
  return records.flatMap(({ line, record: r }) =>
    r.type === 'page_version' ? [{ line, record: r }] : [],
  );
}

/** 学习者此刻看得到哪几块：最近一次报告。 */
function visibleOf(records: NumberedRecord[]): string[] {
  const v = records.filter((r) => r.record.type === 'page_view').at(-1)?.record;
  return v?.type === 'page_view' ? v.visible : [];
}

/** 这段时间里停留较久的几块（合计 ≥ 10 秒，最多三块）。 */
function dwellOf(records: NumberedRecord[]): string {
  const sum = new Map<string, number>();
  for (const { record: r } of records) {
    if (r.type !== 'page_view' || r.dwell === undefined) continue;
    for (const [id, s] of Object.entries(r.dwell)) sum.set(id, (sum.get(id) ?? 0) + s);
  }
  return [...sum]
    .filter(([, s]) => s >= 10)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, s]) => `${id} 约 ${String(Math.round(s))} 秒`)
    .join('、');
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

export function describeActions(actions: PageAction[]): string {
  return actions
    .map((a) => {
      if (a.kind === 'toggle') return `${a.open ? '展开' : '折起'}了 ${a.block}`;
      const detail =
        a.detail === undefined ? '' : `：${JSON.stringify(a.detail).slice(0, DETAIL_MAX)}`;
      return `${a.block !== undefined ? `在 ${a.block} 上` : ''}「${a.name}」${detail}`;
    })
    .join('；');
}

/** 页面上的事各一句（版本、学习者动作、退回、教训、报错），给学习对话与“过期了”的说明用。 */
function pageEventLines(
  records: NumberedRecord[],
  o: { skipAwaited?: boolean; skipEdits?: boolean } = {},
): string[] {
  return records.flatMap(({ line, record: r }) => {
    const one = pageEventLine(line, r, o);
    return one === undefined ? [] : [one];
  });
}

function pageEventLine(
  line: number,
  r: LogRecord,
  o: { skipAwaited?: boolean; skipEdits?: boolean },
): string | undefined {
  switch (r.type) {
    case 'page_actions':
      if (o.skipAwaited === true && r.awaited) return undefined;
      return `L${String(line)} 学习者在页面上（第 ${String(r.version)} 版）：${describeActions(r.actions)}`;
    case 'page_rollback':
      return `L${String(line)} 学习者把页面退回到第 ${String(r.to)} 版（成了第 ${String(r.version)} 版；退掉 ${r.removed.join('、') || '无'}${r.added.length > 0 ? `，换回 ${r.added.join('、')}` : ''}；原因：${r.reason ?? '没选'}）`;
    case 'page_lesson':
      return `L${String(line)} 退回的教训（${r.by === 'model' ? '你退回前写的' : '程序按事实拼的'}，只作参考）：${r.text}`;
    case 'page_error':
      return `L${String(line)} 第 ${String(r.version)} 版在学习者那边运行时报错：${r.message.slice(0, 300)}（要修就叫编辑员）`;
    case 'page_version':
      return r.by === 'editor' && o.skipEdits !== true
        ? `L${String(line)} 页面换到第 ${String(r.version)} 版（编辑员改的）`
        : undefined;
    default:
      return undefined;
  }
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
