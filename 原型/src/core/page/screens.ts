// 学习者看到的屏幕（`docs/设计/会话/学习对话.md` §11）：一次学习只有一条上下文，每一轮屏幕由主模型这一轮的输出定。
// 主模型一轮输出完，框架把这一轮新写的块、它点名拿回的旧块交框架小模型对上、摆好，存成一屏（一张块清单）、记正本。
// 这里还管：解一屏给界面、学习者在组件上的操作（攒着 / 等回应立刻推 / 先回做它的子代理）、每轮附给主模型的事、
// 组件在浏览器里试跑、守卫读的屏幕文字。块的 key、组件编号、版本号只在程序里用，不进主模型上下文。
import type {
  ActionTarget,
  ComponentManifest,
  ResolvedBlock,
  ScreenBlockRef,
  ScreenListResponse,
  ScreenManifest,
  ScreenResponse,
} from '../../shared/screen.ts';
import type { PageTrialResult } from '../../shared/page.ts';
import type { ComponentVersion, LogRecord, NumberedRecord } from '../../shared/records.ts';
import { localMinute } from '../../shared/time.ts';
import type { Hub } from '../hub.ts';
import {
  arrangeInput,
  gist,
  readAnswer,
  splitParts,
  type ArrangeAsk,
  type Candidate,
} from './arrange.ts';
import type { PageStore } from './store.ts';

/** 学习对话派的子代理的名字（派它、认它的记录都用这个）。 */
export const SUBAGENT = 'component';
/** 主模型“说给框架的话”那个工具的名字。 */
export const ARRANGE_TOOL = 'arrange_screen';

/** 学习者连续的操作在这么久之内合成一条。 */
const MERGE_MS = 4000;
/** 试跑等浏览器回话最多这么久；没人开着学习页就不等了，直接上（标“没试跑”）。 */
const TRIAL_WAIT_MS = 20_000;

export interface ScreensDeps {
  hub: () => Hub;
  store: PageStore;
  iso: () => string;
  newId: (prefix: string) => string;
  /** 框架小模型的一次调用（不带工具、不留会话）：给它的话 → 它的回答与实际执行的模型。 */
  arrange: (input: string) => Promise<{ text: string; model?: string }>;
  /** 学习对话还开着（没结束）；不是就抛 BadRequestError。 */
  assertOpen: (loopId: string) => Promise<void>;
  badRequest: (message: string) => Error;
  /** 学习者动了组件、要先回做它的子代理时：框架另开一次子代理（agent.ts）。 */
  toMaker?: (loopId: string, component: string, text: string, awaited: boolean) => Promise<void>;
}

export class Screens {
  /** 每次学习主模型写过的块（从各屏清单里来；重启后按正本现读）。 */
  private readonly written = new Map<string, Map<string, Candidate>>();
  private readonly buffers = new Map<
    string,
    { items: { component: string; text: string; to: ActionTarget }[]; timer: NodeJS.Timeout }
  >();
  private readonly trials = new Map<string, (r: PageTrialResult) => void>();

  constructor(private readonly o: ScreensDeps) {}

  private get hub(): Hub {
    return this.o.hub();
  }

  // ───────────── 摆屏 ─────────────

  /** 主模型一轮输出完：照这一轮的输出摆一屏（没输出就不出新屏，W10 §9 第 12 条）。 */
  async afterTurn(loopId: string, fromLine: number): Promise<void> {
    if ((await this.hub.opened(loopId)).screens !== true) return;
    const records = await this.hub.records(loopId);
    const turn = records.filter((r) => r.line > fromLine);
    const texts = turn.flatMap(({ line, record: r }) =>
      r.type === 'assistant_message' ? [{ line, text: r.text }] : [],
    );
    const ask = askOf(turn);
    const started = turn.flatMap(({ record: r }) =>
      r.type === 'subagent_started' && r.agent === SUBAGENT ? [r] : [],
    );
    if (texts.length === 0 && ask === undefined && started.length === 0) return;
    const a: ArrangeAsk = ask ?? { parts: [], bringBack: [] };

    // 这一轮的新块：主模型的话（按它说的切块）+ 这一轮派出去、还没做好的组件（占位）
    const firstLine = texts[0]?.line ?? fromLine + 1;
    const fresh: ScreenBlockRef[] = [];
    const parts = splitParts(texts.map((t) => t.text).join('\n\n'), a);
    for (const [i, p] of parts.entries()) {
      const hash = await this.o.store.putBlock(loopId, p.text, 'md');
      fresh.push({
        kind: 'text',
        key: `t${String(firstLine)}.${String(i)}`,
        pointer: p.pointer,
        hash,
        line: firstLine,
      });
    }
    for (const s of started) {
      fresh.push({
        kind: 'pending',
        key: `p:${s.taskId}`,
        pointer: s.description ?? '正在做的组件',
        task: s.taskId,
      });
    }

    const candidates = await this.candidates(loopId, records, fromLine);
    let rows: string[][] = fresh.map((b) => [b.key]);
    let matched: { desc: string; key?: string }[] = [];
    let ms: number | undefined;
    let model: string | undefined;
    let failure: string | undefined;
    // 没点名、没说放法：不用对、不用摆，新块照顺序一块一行（不调小模型）
    if (a.bringBack.length > 0 || (a.layout !== undefined && a.layout.trim() !== '')) {
      const started = Date.now();
      try {
        const r = await this.o.arrange(arrangeInput(candidates, fresh, a));
        ms = Date.now() - started;
        model = r.model;
        const answer = readAnswer(r.text, candidates, fresh, a);
        rows = answer.rows;
        matched = answer.matches;
      } catch (err) {
        ms = Date.now() - started;
        failure = err instanceof Error ? err.message : String(err);
        console.error(`学习 ${loopId} 摆屏没成：`, err);
        matched = a.bringBack.map((desc) => ({ desc }));
      }
    }

    const byKey = new Map<string, ScreenBlockRef>([
      ...candidates.map((c) => [c.ref.key, c.ref] as const),
      ...fresh.map((b) => [b.key, b] as const),
    ]);
    const m: ScreenManifest = {
      rows: rows.map((row) => row.flatMap((k) => byKey.get(k) ?? [])).filter((r) => r.length > 0),
    };
    const manifest = await this.o.store.putManifest(loopId, m);
    const n = screensOf(records).length + 1;
    await this.hub.record(loopId, {
      type: 'screen',
      at: this.o.iso(),
      n,
      manifest,
      fromLine,
      ...(ms !== undefined ? { ms } : {}),
      ...(model !== undefined ? { model } : {}),
      ...(matched.length > 0 ? { matched } : {}),
    });
    const at = this.o.iso();
    const mine = this.written.get(loopId);
    for (const b of fresh) if (b.kind === 'text') mine?.set(b.key, { ref: b, at });

    // 对不上的不猜：回一句接到线后面（下一轮主模型看得到）
    const missed = matched.filter((x) => x.key === undefined).map((x) => `「${x.desc}」`);
    if (missed.length > 0) {
      await this.hub.record(loopId, {
        type: 'screen_note',
        at: this.o.iso(),
        text: `框架没对上你点名拿回的${missed.join('')}（${failure !== undefined ? '框架这次出错了' : '找不到，或有几块都像'}），这一屏没放它；要放就换个说法再点一次。`,
      });
    }
  }

  /** 可点名的旧块：主模型写过的、学习者说过的、子代理交回的、组件（最新版）、还在做的组件；按时间先后。 */
  private async candidates(
    loopId: string,
    records: NumberedRecord[],
    beforeLine: number,
  ): Promise<Candidate[]> {
    const out: (Candidate & { line: number })[] = [];
    const written = await this.writtenOf(loopId, records);
    for (const c of written.values()) {
      if (c.ref.kind === 'text') out.push({ ...c, line: c.ref.line });
    }
    const latest = new Map<string, { line: number; r: ComponentVersion }>();
    const made = new Set<string>();
    const done = new Set<string>();
    for (const { line, record: r } of records) {
      if (r.type === 'component_version') {
        latest.set(r.component, { line, r });
        if (r.task !== undefined) made.add(r.task);
      }
      if (r.type === 'subagent_result') done.add(r.taskId);
    }
    for (const { line, record: r } of records) {
      if (line > beforeLine && r.type !== 'component_version') continue;
      if (r.type === 'user_message') {
        out.push({
          ref: { kind: 'learner', key: `u${String(line)}`, pointer: gist('', r.text), line },
          at: r.at,
          line,
        });
      }
      if (r.type === 'subagent_result' && r.agent === SUBAGENT) {
        out.push({
          ref: { kind: 'subagent', key: `s${String(line)}`, pointer: gist('', r.text), line },
          at: r.at,
          line,
        });
      }
      if (r.type === 'component_report') {
        out.push({
          ref: { kind: 'subagent', key: `s${String(line)}`, pointer: gist('', r.text), line },
          at: r.at,
          line,
        });
      }
      if (
        r.type === 'subagent_started' &&
        r.agent === SUBAGENT &&
        !made.has(r.taskId) &&
        !done.has(r.taskId)
      ) {
        out.push({
          ref: {
            kind: 'pending',
            key: `p:${r.taskId}`,
            pointer: r.description ?? '正在做的组件',
            task: r.taskId,
          },
          at: r.at,
          line,
        });
      }
    }
    for (const [component, { line, r }] of latest) {
      out.push({
        ref: { kind: 'component', key: `c:${component}`, pointer: r.pointer, component },
        at: r.at,
        line,
      });
    }
    return out.sort((x, y) => x.line - y.line).map(({ ref, at }) => ({ ref, at }));
  }

  /** 主模型写过的块（各屏清单里的文字块）；第一次用时从磁盘读回，之后跟着新屏加。 */
  private async writtenOf(
    loopId: string,
    records: NumberedRecord[],
  ): Promise<Map<string, Candidate>> {
    const cached = this.written.get(loopId);
    if (cached !== undefined) return cached;
    const map = new Map<string, Candidate>();
    for (const { record: r } of screensOf(records)) {
      const m = await this.o.store.manifest<ScreenManifest>(loopId, r.manifest);
      for (const b of m.rows.flat()) {
        if (b.kind === 'text' && !map.has(b.key)) map.set(b.key, { ref: b, at: r.at });
      }
    }
    this.written.set(loopId, map);
    return map;
  }

  // ───────────── 给界面 ─────────────

  async list(loopId: string): Promise<ScreenListResponse> {
    return {
      screens: screensOf(await this.hub.records(loopId)).map(({ line, record: r }) => ({
        n: r.n,
        line,
        at: r.at,
      })),
    };
  }

  /** 第 n 屏摆好的每一块。组件显示这一屏在前台时的那一版（当前屏 = 最新版）；占位换成做好的组件。 */
  async resolve(loopId: string, n: number): Promise<ScreenResponse> {
    const records = await this.hub.records(loopId);
    const all = screensOf(records);
    const i = all.findIndex((s) => s.record.n === n);
    const s = all[i];
    if (s === undefined) throw this.o.badRequest(`没有第 ${String(n)} 屏`);
    const until = all[i + 1]?.line ?? Number.POSITIVE_INFINITY;
    const m = await this.o.store.manifest<ScreenManifest>(loopId, s.record.manifest);
    const at = (line: number) => records.find((r) => r.line === line)?.record;
    const rows: ResolvedBlock[][] = [];
    for (const row of m.rows) {
      const out: ResolvedBlock[] = [];
      for (const b of row) out.push(await this.resolveBlock(loopId, records, b, until, at));
      rows.push(out);
    }
    return { n, at: s.record.at, rows };
  }

  private async resolveBlock(
    loopId: string,
    records: NumberedRecord[],
    b: ScreenBlockRef,
    until: number,
    at: (line: number) => LogRecord | undefined,
  ): Promise<ResolvedBlock> {
    const base = { key: b.key, pointer: b.pointer };
    switch (b.kind) {
      case 'text':
        return { ...base, kind: 'text', text: await this.o.store.block(loopId, b.hash, 'md') };
      case 'learner': {
        const r = at(b.line);
        return { ...base, kind: 'learner', text: r?.type === 'user_message' ? r.text : '' };
      }
      case 'subagent': {
        const r = at(b.line);
        const text = r?.type === 'subagent_result' || r?.type === 'component_report' ? r.text : '';
        return { ...base, kind: 'subagent', text };
      }
      case 'component':
      case 'pending': {
        const v = versionAt(records, b, until);
        if (v === undefined) return { ...base, kind: 'pending' };
        return {
          ...base,
          kind: 'component',
          component: v.component,
          version: v.version,
          blocks: await this.componentBlocks(loopId, v.manifest),
        };
      }
    }
  }

  /** 组件某一版的每一块（摊文件、试跑、显示都经这里）。 */
  async componentBlocks(
    loopId: string,
    manifest: string,
  ): Promise<{ id: string; summary: string; html: string }[]> {
    const m = await this.o.store.manifest<ComponentManifest>(loopId, manifest);
    return Promise.all(
      m.blocks.map(async (b) => ({
        id: b.id,
        summary: b.summary,
        html: await this.o.store.block(loopId, b.hash),
      })),
    );
  }

  // ───────────── 学习者在组件上 ─────────────

  /**
   * 组件发出的一句话（学习者的操作）。先交给谁按组件代码里写的（子代理按交代做进去）：
   * 做它的子代理 → 框架另开一次子代理（4.0：SDK 做不到不经主模型给后台子代理送话）；主对话 → 攒着，
   * 等回应的立刻跑一轮；连续的合成一条。
   */
  async act(
    loopId: string,
    req: { component: string; text: string; awaited: boolean; to: ActionTarget },
  ): Promise<void> {
    await this.o.assertOpen(loopId);
    const records = await this.hub.records(loopId);
    if (
      !records.some(
        (r) => r.record.type === 'component_version' && r.record.component === req.component,
      )
    ) {
      throw this.o.badRequest(`没有这个组件：${req.component}`);
    }
    const buf = this.buffers.get(loopId);
    if (buf !== undefined) clearTimeout(buf.timer);
    const items = [...(buf?.items ?? []), { component: req.component, text: req.text, to: req.to }];
    const timer = setTimeout(() => {
      this.flush(loopId, false).catch((e: unknown) => {
        console.error('组件操作落盘失败：', e);
      });
    }, MERGE_MS);
    this.buffers.set(loopId, { items, timer });
    if (req.awaited) await this.flush(loopId, true);
  }

  private async flush(loopId: string, awaited: boolean): Promise<void> {
    const buf = this.buffers.get(loopId);
    if (buf === undefined) return;
    clearTimeout(buf.timer);
    this.buffers.delete(loopId);
    // 连续的合成一条：同一个组件、同一个去处的并在一起
    const groups = new Map<string, { component: string; to: ActionTarget; texts: string[] }>();
    for (const it of buf.items) {
      const k = `${it.component}|${it.to}`;
      const g = groups.get(k) ?? { component: it.component, to: it.to, texts: [] };
      g.texts.push(it.text);
      groups.set(k, g);
    }
    for (const g of groups.values()) {
      const text = g.texts.join('；');
      const line = await this.hub.record(loopId, {
        type: 'component_action',
        at: this.o.iso(),
        component: g.component,
        text,
        awaited,
        to: g.to,
      });
      if (g.to !== 'main' && this.o.toMaker !== undefined) {
        await this.o.toMaker(loopId, g.component, text, awaited);
      }
      if (g.to !== 'maker' && awaited) {
        // 等回应的操作当场交给主模型：身份是学习者，和说的话一样；在跑就并进本轮
        const pointer = await this.pointerOf(loopId, g.component);
        await this.hub.send(
          loopId,
          { role: 'learner', text: `（在「${pointer}」上）${text}` },
          { recorded: line },
        );
      }
    }
  }

  async pointerOf(loopId: string, component: string): Promise<string> {
    const v = (await this.hub.records(loopId))
      .flatMap(({ record: r }) =>
        r.type === 'component_version' && r.component === component ? [r] : [],
      )
      .at(-1);
    return v?.pointer ?? '一个组件';
  }

  async error(loopId: string, component: string, version: number, message: string): Promise<void> {
    await this.hub.record(loopId, {
      type: 'component_error',
      at: this.o.iso(),
      component,
      version,
      message: message.slice(0, 2000),
    });
  }

  // ───────────── 试跑 ─────────────

  /** 组件的新一版先在学习者浏览器的隐藏小窗里跑；没人开着学习页时等不到回话，返回 undefined。 */
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

  // ───────────── 每轮附给主模型的 ─────────────

  /**
   * 上一轮之后攒着的（会话/学习对话.md §11.3「何时跑一轮」）：学习者在组件上报给主对话的操作（没等回应的）、
   * 子代理改了组件或往上报的（没等回应的）、组件在学习者那边报的错、框架对不上时回的一句；按时间各一条，
   * 附在这一轮的输入前面。从正本现算（上一条 turn_context 之后），重启也不丢。
   */
  async preface(loopId: string): Promise<string> {
    const records = await this.hub.records(loopId);
    const lastCtx = records.filter((r) => r.record.type === 'turn_context').at(-1)?.line ?? 0;
    const pointers = new Map<string, string>();
    for (const { record: r } of records) {
      if (r.type === 'component_version') pointers.set(r.component, r.pointer);
    }
    const name = (c: string) => `「${pointers.get(c) ?? '一个组件'}」`;
    return records
      .filter((r) => r.line > lastCtx)
      .flatMap(({ line, record: r }) => {
        const head = `[第 ${String(line)} 行 · ${localMinute(r.at)}]`;
        if (r.type === 'component_action' && !r.awaited && r.to !== 'maker') {
          return [`${head} （在${name(r.component)}上）${r.text}`];
        }
        if (r.type === 'component_report' && !r.awaited) {
          return [`${head} 子代理交回（${name(r.component)}）：${r.text}`];
        }
        if (r.type === 'component_error') {
          return [`${head} ${name(r.component)}在学习者那边运行时报错：${r.message.slice(0, 300)}`];
        }
        if (r.type === 'screen_note') return [`${head} 框架：${r.text}`];
        return [];
      })
      .join('\n');
  }

  /** 守卫读的屏幕（W10 §9 第 6 条过渡）：最后一屏里组件的一句话与可见文字。 */
  async textForGuard(loopId: string): Promise<string | undefined> {
    const last = screensOf(await this.hub.records(loopId)).at(-1);
    if (last === undefined) return undefined;
    const s = await this.resolve(loopId, last.record.n);
    const comps = s.rows.flat().flatMap((b) => (b.kind === 'component' ? [b] : []));
    if (comps.length === 0) return undefined;
    return [
      '学习者最后一屏上的组件（每个：一句话、组件上的文字）：',
      ...comps.map(
        (c) =>
          `- ${c.pointer}：${c.blocks
            .map((b) => visibleText(b.html))
            .join(' ')
            .slice(0, 1500)}`,
      ),
    ].join('\n');
  }
}

// ───────────── 纯函数 ─────────────

export function screensOf(
  records: NumberedRecord[],
): { line: number; record: Extract<LogRecord, { type: 'screen' }> }[] {
  return records.flatMap(({ line, record: r }) =>
    r.type === 'screen' ? [{ line, record: r }] : [],
  );
}

/** 这一轮主模型说给框架的话（arrange_screen 的参数；几次调用合在一起）；没调就是 undefined。 */
function askOf(turn: NumberedRecord[]): ArrangeAsk | undefined {
  const calls = turn.flatMap(({ record: r }) =>
    r.type === 'tool_call' && r.name === ARRANGE_TOOL && !r.isError ? [r.args] : [],
  );
  if (calls.length === 0) return undefined;
  const ask: ArrangeAsk = { parts: [], bringBack: [] };
  for (const raw of calls) {
    const a = raw as {
      parts?: { begins?: unknown; about?: unknown }[];
      about?: unknown;
      bring_back?: unknown[];
      layout?: unknown;
    };
    for (const p of a.parts ?? []) {
      if (typeof p.about === 'string') {
        ask.parts.push({ begins: typeof p.begins === 'string' ? p.begins : '', about: p.about });
      }
    }
    if (typeof a.about === 'string' && a.about !== '') ask.about = a.about;
    for (const d of a.bring_back ?? [])
      if (typeof d === 'string' && d.trim() !== '') ask.bringBack.push(d.trim());
    if (typeof a.layout === 'string' && a.layout.trim() !== '') {
      ask.layout = ask.layout === undefined ? a.layout : `${ask.layout}；${a.layout}`;
    }
  }
  return ask;
}

/** 组件 / 占位在某一屏下显示哪一版：until 之前最新的一版（占位 = 那件活交上的组件）。 */
function versionAt(
  records: NumberedRecord[],
  b: Extract<ScreenBlockRef, { kind: 'component' | 'pending' }>,
  until: number,
): ComponentVersion | undefined {
  let component = b.kind === 'component' ? b.component : undefined;
  let found: ComponentVersion | undefined;
  for (const { line, record: r } of records) {
    if (line >= until) break;
    if (r.type !== 'component_version') continue;
    if (component === undefined && b.kind === 'pending' && r.task === b.task)
      component = r.component;
    if (r.component === component) found = r;
  }
  return found;
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
