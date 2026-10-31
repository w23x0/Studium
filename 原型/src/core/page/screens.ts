// 学习页（`docs/设计/会话/学习对话.md` §11）：一次学习只有一条上下文，学习者眼前是一份一直在的页面（区域图布局）。
// 主模型一轮输出完，框架把这一轮新写的块放上页面：没给布局指令就接在最下面；给了就交框架小模型照指令改布局
// （拿回、拿掉、挪），检查过了才换上，存成新一版、记正本。放上去的块一直在，主模型说拿掉才拿掉（10-29 起，取代每轮一屏）。
// 这里还管：解页面给界面、学习者在组件上的操作（攒着 / 等回应立刻推 / 先回做它的子代理）、每轮附给主模型的事、
// 组件在浏览器里试跑、守卫读的页面文字。块的名字、组件编号、版本号只在程序里用，不进主模型上下文。
import type {
  ActionTarget,
  ComponentManifest,
  PageLayout,
  LearnPageResponse,
  ResolvedBlock,
  ScreenBlockRef,
  ScreenManifest,
} from '../../shared/screen.ts';
import type { PageTrialResult } from '../../shared/page.ts';
import type { ComponentVersion, LogRecord, NumberedRecord } from '../../shared/records.ts';
import { replayStream, streamPageText } from '../../shared/stream-page.ts';
import { localMinute } from '../../shared/time.ts';
import type { Hub } from '../hub.ts';
import {
  appendBlocks,
  arrangeInput,
  checkLayout,
  EMPTY_LAYOUT,
  fromScreen,
  gist,
  nameOf,
  readAnswer,
  readingOrder,
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
/** 小模型交回的布局没过检查时，最多再让它交几次。 */
const RETRIES = 1;
/** 试跑先等浏览器说一声收到了：这么久没人应 = 没开着界面（或手机切到后台），不等了，直接上（标“没试跑”）。 */
const TRIAL_ACK_MS = 3000;
/** 浏览器收到之后，等它交回试跑结果最多这么久（浏览器那边 8 秒没加载完自己算没过）。 */
const TRIAL_WAIT_MS = 15_000;

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
  /** 组件运行时报错：先另开做它的子代理修（W10 §9 第 9 条）。 */
  toRepair?: (loopId: string, component: string, version: number, message: string) => Promise<void>;
}

export class Screens {
  /** 每次学习主模型写过的块（从各屏清单里来；重启后按正本现读）。 */
  private readonly written = new Map<string, Map<string, Candidate>>();
  private readonly buffers = new Map<
    string,
    {
      items: { component: string; text: string; to: ActionTarget; state: boolean }[];
      timer: NodeJS.Timeout;
    }
  >();
  private readonly trials = new Map<
    string,
    { received: () => void; done: (r: PageTrialResult) => void }
  >();

  constructor(private readonly o: ScreensDeps) {}

  private get hub(): Hub {
    return this.o.hub();
  }

  // ───────────── 改布局 ─────────────

  /** 主模型一轮输出完：把这一轮的新块放上页面、照它的布局指令改布局（什么都没说、没写就不改）。 */
  async afterTurn(loopId: string, fromLine: number): Promise<void> {
    const opened = await this.hub.opened(loopId);
    // 竖流学习页（10-29 #74）不摆布局：页面从正本算，主模型自己用页面工具改
    if (opened.screens !== true || opened.page === 'stream') return;
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
    // 这一轮没跑成（如额度用完，SDK 会把报错当一句话交回）：页面不变；界面另说一句
    if (turn.some((r) => r.record.type === 'turn_failed')) return;
    const a: ArrangeAsk = ask ?? { parts: [], bringBack: [], remove: [] };

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

    const page = await this.layoutOf(loopId, records);
    const offPage = await this.offPage(loopId, records, fromLine, page);
    let layout = appendBlocks(page, fresh);
    let matched: { desc: string; key?: string }[] = [];
    let ms: number | undefined;
    let model: string | undefined;
    let retries = 0;
    let fallback: string | undefined;
    const hasAsk =
      a.bringBack.length > 0 ||
      a.remove.length > 0 ||
      (a.layout !== undefined && a.layout.trim() !== '');
    // 没点名、没说放法：新块照顺序接在最下面（不调小模型）
    if (hasAsk) {
      const t0 = Date.now();
      let retry: { answer: string; errors: string[] } | undefined;
      for (;;) {
        try {
          const r = await this.o.arrange(arrangeInput(page, offPage, fresh, a, retry));
          model = r.model;
          const answer = readAnswer(r.text, a);
          matched = [...answer.bringBack, ...answer.remove];
          const checked = checkLayout(page, answer, fresh, offPage);
          if ('layout' in checked) {
            layout = checked.layout;
            break;
          }
          retry = { answer: r.text, errors: checked.errors };
        } catch (err) {
          retry = { answer: '', errors: [err instanceof Error ? err.message : String(err)] };
        }
        if (retries >= RETRIES) {
          fallback = retry.errors.join('；').slice(0, 500);
          console.error(`学习 ${loopId} 改布局没成，新块接在最下面：${fallback}`);
          matched = [...a.bringBack, ...a.remove].map((desc) => ({ desc }));
          break;
        }
        retries += 1;
      }
      ms = Date.now() - t0;
    }

    const manifest = await this.o.store.putManifest(loopId, layout);
    await this.hub.record(loopId, {
      type: 'layout',
      at: this.o.iso(),
      v: layoutsOf(records).length + 1,
      manifest,
      fromLine,
      ...(ms !== undefined ? { ms } : {}),
      ...(model !== undefined ? { model } : {}),
      ...(matched.length > 0 ? { matched } : {}),
      ...(retries > 0 ? { retries } : {}),
      ...(fallback !== undefined ? { fallback } : {}),
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
        text: `框架没对上你点名拿回或拿掉的${missed.join('')}（${fallback !== undefined ? '框架这次出错了' : '找不到，或有几块都像'}），页面上这几处没动；要动就换个说法再点一次。`,
      });
    }
  }

  /** 现在的布局：最后一版；10-29 前开的学习对话没有布局，就从最后一屏转；都没有就是空的。 */
  private async layoutOf(loopId: string, records: NumberedRecord[]): Promise<PageLayout> {
    const last = layoutsOf(records).at(-1);
    if (last !== undefined) return this.o.store.manifest<PageLayout>(loopId, last.record.manifest);
    const screen = screensOf(records).at(-1);
    if (screen === undefined) return EMPTY_LAYOUT;
    return fromScreen(await this.o.store.manifest<ScreenManifest>(loopId, screen.record.manifest));
  }

  /** 可以拿回的旧块：全部可点名的旧块里，不在页面上的（页面上的占位已换成组件的，那个组件也算在页面上）。 */
  private async offPage(
    loopId: string,
    records: NumberedRecord[],
    beforeLine: number,
    page: PageLayout,
  ): Promise<Candidate[]> {
    const on = new Set(Object.keys(page.blocks));
    for (const b of Object.values(page.blocks)) {
      if (b.kind !== 'pending') continue;
      const v = versionAt(records, b, Number.POSITIVE_INFINITY);
      if (v !== undefined) on.add(v.component);
    }
    return (await this.candidates(loopId, records, beforeLine)).filter(
      (c) => !on.has(nameOf(c.ref)),
    );
  }

  /**
   * 可点名的旧块：主模型写过的、学习者说过的、子代理交回的、组件（最新版）、还在做的组件，
   * 加上程序推来的开场与收尾记录（守卫交回之后才有）；按时间先后。
   */
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
    let opening = false;
    for (const { line, record: r } of records) {
      if (line > beforeLine && r.type !== 'component_version') continue;
      // 开场：开学习时程序交的第一条事实（§11.3「程序推来的块上屏」：上屏只显示单子）
      if (r.type === 'program_fact' && !opening) {
        opening = true;
        const first = records[0]?.record;
        const ticket = first?.type === 'session_opened' ? first.ticket : undefined;
        out.push({
          ref: {
            kind: 'opening',
            key: `o${String(line)}`,
            pointer: gist('开场：这次学习的单子——', ticket?.newPoint ?? ''),
            line,
          },
          at: r.at,
          line,
        });
      }
      // 收尾记录：守卫交回了的才算（没交回的 problem 那条不是收尾记录）
      if (r.type === 'guard_verdict' && r.problem === undefined) {
        out.push({
          ref: {
            kind: 'closing',
            key: `v${String(line)}`,
            pointer: gist('收尾记录：这次学到了什么——', r.understanding?.[0]?.text ?? r.basis),
            line,
          },
          at: r.at,
          line,
        });
      }
      if (r.type === 'user_message') {
        out.push({
          ref: { kind: 'learner', key: `u${String(line)}`, pointer: gist('', r.text), line },
          at: r.at,
          line,
        });
      }
      // 学习者在组件上的操作也是学习者的块（§11.1：学习者说的话与操作同一身份）
      if (r.type === 'component_action') {
        out.push({
          ref: {
            kind: 'learner',
            key: `u${String(line)}`,
            pointer: gist('', r.text),
            line,
            op: true,
          },
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

  /** 主模型写过的块（各屏清单、各版布局里的文字块）；第一次用时从磁盘读回，之后跟着新屏加。 */
  private async writtenOf(
    loopId: string,
    records: NumberedRecord[],
  ): Promise<Map<string, Candidate>> {
    const cached = this.written.get(loopId);
    if (cached !== undefined) return cached;
    const map = new Map<string, Candidate>();
    const add = (b: ScreenBlockRef, at: string) => {
      if (b.kind === 'text' && !map.has(b.key)) map.set(b.key, { ref: b, at });
    };
    for (const { record: r } of screensOf(records)) {
      const m = await this.o.store.manifest<ScreenManifest>(loopId, r.manifest);
      for (const b of m.rows.flat()) add(b, r.at);
    }
    for (const { record: r } of layoutsOf(records)) {
      const m = await this.o.store.manifest<PageLayout>(loopId, r.manifest);
      for (const b of Object.values(m.blocks)) add(b, r.at);
    }
    this.written.set(loopId, map);
    return map;
  }

  // ───────────── 给界面 ─────────────

  /**
   * 现在的页面：最后一版布局解好的每一块（组件显示最新版，占位换成做好的组件）；fresh = 这一版比上一版新放上去的。
   * 同一个组件在页面上出现两次（派子代理改它时又占了一个位）只显示先放的那个。
   */
  async page(loopId: string): Promise<LearnPageResponse> {
    const records = await this.hub.records(loopId);
    const layouts = layoutsOf(records);
    const last = layouts.at(-1);
    const layout = await this.layoutOf(loopId, records);
    const prev = layouts.at(-2);
    const before =
      prev !== undefined
        ? new Set(
            Object.keys(
              (await this.o.store.manifest<PageLayout>(loopId, prev.record.manifest)).blocks,
            ),
          )
        : new Set<string>();
    const at = (line: number) => records.find((r) => r.line === line)?.record;
    const blocks: Record<string, ResolvedBlock> = {};
    const shown = new Set<string>();
    for (const name of readingOrder(layout.areas)) {
      const ref = layout.blocks[name];
      if (ref === undefined) continue;
      const b = await this.resolveBlock(loopId, records, ref, Number.POSITIVE_INFINITY, at);
      if (b.kind === 'component') {
        if (shown.has(b.component)) continue;
        shown.add(b.component);
      }
      blocks[name] = b;
    }
    return {
      v: last?.record.v ?? 0,
      ...(last !== undefined ? { at: last.record.at } : {}),
      columns: layout.columns,
      areas: layout.areas,
      blocks,
      fresh: last !== undefined ? Object.keys(layout.blocks).filter((n) => !before.has(n)) : [],
    };
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
        const text = r?.type === 'user_message' || r?.type === 'component_action' ? r.text : '';
        return { ...base, kind: 'learner', text };
      }
      case 'subagent': {
        const r = at(b.line);
        const text = r?.type === 'subagent_result' || r?.type === 'component_report' ? r.text : '';
        return { ...base, kind: 'subagent', text };
      }
      case 'opening': {
        // 只给单子（学习者在单子条上本来就看得到的）；开场里的沙盒路径、资料核对这些只给模型看
        const first = records[0]?.record;
        const ticket = first?.type === 'session_opened' ? first.ticket : undefined;
        return { ...base, kind: 'opening', ...(ticket !== undefined ? { ticket } : {}) };
      }
      case 'closing':
        // 整理的内容由界面按这一行取（同“看整理的内容”那份）
        return { ...base, kind: 'closing', verdictLine: b.line };
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
    req: { component: string; text: string; awaited: boolean; to: ActionTarget; state?: boolean },
  ): Promise<void> {
    await this.o.assertOpen(loopId);
    // 竖流学习页：组件是主模型自己写的，操作都直接给主模型；“现在的状态”只留最后一次（照 MCP Apps）
    const stream = (await this.hub.opened(loopId)).page === 'stream';
    const to: ActionTarget = stream ? 'main' : req.to;
    const state = stream && req.state === true;
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
    const items = [...(buf?.items ?? []), { component: req.component, text: req.text, to, state }];
    const timer = setTimeout(() => {
      this.flush(loopId, false).catch((e: unknown) => {
        console.error('组件操作落盘失败：', e);
      });
    }, MERGE_MS);
    this.buffers.set(loopId, { items, timer });
    if (req.awaited && !state) await this.flush(loopId, true);
  }

  private async flush(loopId: string, awaited: boolean): Promise<void> {
    const buf = this.buffers.get(loopId);
    if (buf === undefined) return;
    clearTimeout(buf.timer);
    this.buffers.delete(loopId);
    // 连续的合成一条：同一个组件、同一个去处的并在一起
    // 状态只留同一个组件的最后一次
    const groups = new Map<
      string,
      { component: string; to: ActionTarget; state: boolean; texts: string[] }
    >();
    for (const it of buf.items) {
      const k = `${it.component}|${it.to}|${String(it.state)}`;
      const g = groups.get(k) ?? { component: it.component, to: it.to, state: it.state, texts: [] };
      if (it.state) g.texts = [it.text];
      else g.texts.push(it.text);
      groups.set(k, g);
    }
    for (const g of groups.values()) {
      const text = g.texts.join('；');
      const line = await this.hub.record(loopId, {
        type: 'component_action',
        at: this.o.iso(),
        component: g.component,
        text,
        awaited: awaited && !g.state,
        to: g.to,
        ...(g.state ? { state: true as const } : {}),
      });
      if (g.state) continue;
      if (g.to !== 'main' && this.o.toMaker !== undefined) {
        // 先回做它的子代理：框架另开一次，在后台跑（要几秒到几十秒），不挡学习者那边的请求
        this.o.toMaker(loopId, g.component, text, awaited).catch((e: unknown) => {
          console.error(`学习 ${loopId} 交给做组件的子代理失败：`, e);
        });
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
    // 竖流学习页：组件是主模型写的，报错攒到下一轮附给它（preface）
    if ((await this.hub.opened(loopId)).page === 'stream') return;
    // 先回做它的子代理修；修不好它会按普通交回报上来（不直接附给主模型）
    this.o.toRepair?.(loopId, component, version, message).catch((e: unknown) => {
      console.error(`学习 ${loopId} 交给子代理修组件失败：`, e);
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
      const giveUp = () => {
        this.trials.delete(trialId);
        resolve(undefined);
      };
      let timer = setTimeout(giveUp, TRIAL_ACK_MS);
      this.trials.set(trialId, {
        received: () => {
          clearTimeout(timer);
          timer = setTimeout(giveUp, TRIAL_WAIT_MS);
        },
        done: (r) => {
          clearTimeout(timer);
          this.trials.delete(trialId);
          resolve(r);
        },
      });
      this.hub.broadcast({ type: 'page_trial', sessionId: loopId, trialId, blocks });
    });
  }

  /** 浏览器说收到了要试跑的组件（开始跑）。 */
  trialReceived(trialId: string): void {
    this.trials.get(trialId)?.received();
  }

  /** 浏览器交回试跑结果（几个标签页都开着时，先到的算）。 */
  trialResult(trialId: string, r: PageTrialResult): void {
    this.trials.get(trialId)?.done(r);
  }

  // ───────────── 每轮附给主模型的 ─────────────

  /**
   * 上一轮之后攒着的（会话/学习对话.md §11.3「何时跑一轮」）：学习者在组件上报给主对话的操作（没等回应的）、
   * 子代理改了组件或往上报的（没等回应的；组件报错修不好的也走这里）、框架对不上时回的一句；按时间各一条，
   * 附在这一轮的输入前面。从正本现算（上一条 turn_context 之后），重启也不丢。
   */
  async preface(loopId: string): Promise<string> {
    const records = await this.hub.records(loopId);
    const stream = (await this.hub.opened(loopId)).page === 'stream';
    const lastCtx = records.filter((r) => r.record.type === 'turn_context').at(-1)?.line ?? 0;
    const pointers = new Map<string, string>();
    for (const { record: r } of records) {
      if (r.type === 'component_version') pointers.set(r.component, r.pointer);
    }
    const name = (c: string) => `「${pointers.get(c) ?? '一个组件'}」`;
    const since = records.filter((r) => r.line > lastCtx);
    // 组件的“现在的状态”只带每个组件最后一次
    const lastState = new Map<string, number>();
    for (const { line, record: r } of since) {
      if (r.type === 'component_action' && r.state === true) lastState.set(r.component, line);
    }
    return since
      .flatMap(({ line, record: r }) => {
        const head = `[第 ${String(line)} 行 · ${localMinute(r.at)}]`;
        if (r.type === 'component_action' && r.state === true) {
          return lastState.get(r.component) === line
            ? [`${head} （${name(r.component)}现在的状态）${r.text}`]
            : [];
        }
        if (r.type === 'component_error' && stream) {
          return [`${head} 组件${name(r.component)}在学习者那边报错：${r.message}`];
        }
        if (r.type === 'component_action' && !r.awaited && r.to !== 'maker') {
          return [`${head} （在${name(r.component)}上）${r.text}`];
        }
        if (r.type === 'component_report' && !r.awaited) {
          return [`${head} 子代理交回（${name(r.component)}）：${r.text}`];
        }
        if (r.type === 'screen_note') return [`${head} 框架：${r.text}`];
        return [];
      })
      .join('\n');
  }

  /** 守卫读的页面（W10 §9 第 6 条过渡）：现在页面上组件的一句话与可见文字。 */
  async textForGuard(loopId: string): Promise<string | undefined> {
    if ((await this.hub.opened(loopId)).page === 'stream') {
      const page = replayStream(await this.hub.records(loopId));
      return [
        '学习者收尾时的页面（从上到下；组件只给名字和上面的文字）：',
        streamPageText(page, {
          withOff: false,
          component: (html) => visibleText(html).slice(0, 1500),
        }),
      ].join('\n');
    }
    const p = await this.page(loopId);
    const comps = Object.values(p.blocks).flatMap((b) => (b.kind === 'component' ? [b] : []));
    if (comps.length === 0) return undefined;
    return [
      '学习者页面上的组件（每个：一句话、组件上的文字）：',
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

export function layoutsOf(
  records: NumberedRecord[],
): { line: number; record: Extract<LogRecord, { type: 'layout' }> }[] {
  return records.flatMap(({ line, record: r }) =>
    r.type === 'layout' ? [{ line, record: r }] : [],
  );
}

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
  const ask: ArrangeAsk = { parts: [], bringBack: [], remove: [] };
  for (const raw of calls) {
    const a = raw as {
      parts?: { begins?: unknown; about?: unknown }[];
      about?: unknown;
      bring_back?: unknown[];
      remove?: unknown[];
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
    for (const d of a.remove ?? [])
      if (typeof d === 'string' && d.trim() !== '') ask.remove.push(d.trim());
    if (typeof a.layout === 'string' && a.layout.trim() !== '') {
      ask.layout = ask.layout === undefined ? a.layout : `${ask.layout}；${a.layout}`;
    }
  }
  return ask;
}

/** 组件 / 占位显示哪一版：until 之前最新的一版（占位 = 那件活交上的组件）。 */
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
