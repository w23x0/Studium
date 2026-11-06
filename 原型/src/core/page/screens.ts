// 学习页（`docs/设计/会话/学习对话.md` §11；W12 起竖流是唯一的学习页）：页面从正本算（src/shared/stream-page.ts），
// 这里只管学习者在组件上的操作（攒着 / 等回应立刻推）、组件运行时报错、组件在浏览器里试跑、每轮附给主模型的事，
// 以及不是竖流开的旧学习只读看时要的组件（每个组件最后一版）。
import type {
  ComponentManifest,
  OldComponentsResponse,
  PageTrialResult,
} from '../../shared/screen.ts';
import { localMinute } from '../../shared/time.ts';
import type { Hub } from '../hub.ts';
import type { PageStore } from './store.ts';

/** 学习者连续的操作在这么久之内合成一条。 */
const MERGE_MS = 4000;
/** 试跑先等浏览器说一声收到了：这么久没人应 = 没开着界面（或手机切到后台），不等了，直接上（标“没试跑”）。 */
const TRIAL_ACK_MS = 3000;
/** 浏览器收到之后，等它交回试跑结果最多这么久（浏览器那边 8 秒没加载完自己算没过）。 */
const TRIAL_WAIT_MS = 15_000;

export interface ScreensDeps {
  hub: () => Hub;
  store: PageStore;
  iso: () => string;
  newId: (prefix: string) => string;
  /** 学习对话还开着（没结束）；不是就抛 BadRequestError。 */
  assertOpen: (loopId: string) => Promise<void>;
  badRequest: (message: string) => Error;
}

export class Screens {
  private readonly buffers = new Map<
    string,
    { items: { component: string; text: string; state: boolean }[]; timer: NodeJS.Timeout }
  >();
  private readonly trials = new Map<
    string,
    { received: () => void; done: (r: PageTrialResult) => void }
  >();

  constructor(private readonly o: ScreensDeps) {}

  private get hub(): Hub {
    return this.o.hub();
  }

  // ───────────── 给界面 ─────────────

  /** 不是竖流开的旧学习只读看：每个组件最后一版（内容按清单从存放处取）。 */
  async oldComponents(loopId: string): Promise<OldComponentsResponse> {
    const last = new Map<
      string,
      { pointer: string; line: number; version: number; manifest: string }
    >();
    for (const { line, record: r } of await this.hub.records(loopId)) {
      if (r.type !== 'component_version') continue;
      const was = last.get(r.component);
      last.set(r.component, {
        pointer: r.pointer,
        line: was?.line ?? line,
        version: r.version,
        manifest: r.manifest,
      });
    }
    const components = await Promise.all(
      [...last.entries()].map(async ([component, v]) => ({
        component,
        pointer: v.pointer,
        line: v.line,
        version: v.version,
        blocks: await this.componentBlocks(loopId, v.manifest),
      })),
    );
    return { components };
  }

  /** 组件某一版的每一块。 */
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
   * 组件发出的一句话（学习者的操作），都交给学习对话：等回应的立刻跑一轮，别的攒着、连续的合成一条；
   * “现在的状态”只留最后一次（照 MCP Apps 的 update-model-context）。
   */
  async act(
    loopId: string,
    req: { component: string; text: string; awaited: boolean; state?: boolean },
  ): Promise<void> {
    await this.o.assertOpen(loopId);
    const state = req.state === true;
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
    const items = [...(buf?.items ?? []), { component: req.component, text: req.text, state }];
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
    // 连续的合成一条：同一个组件的并在一起；状态只留同一个组件的最后一次
    const groups = new Map<string, { component: string; state: boolean; texts: string[] }>();
    for (const it of buf.items) {
      const k = `${it.component}|${String(it.state)}`;
      const g = groups.get(k) ?? { component: it.component, state: it.state, texts: [] };
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
        ...(g.state ? { state: true as const } : {}),
      });
      if (g.state || !awaited) continue;
      // 等回应的操作当场交给学习对话：身份是学习者，和说的话一样；在跑就排到这一轮之后
      await this.hub.send(
        loopId,
        { role: 'learner', text: `（在组件「${g.component}」上）${text}` },
        { recorded: line },
      );
    }
  }

  /** 组件在学习者那边运行时报错：记一条，下一轮附给学习对话（preface）。 */
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
   * 上一轮之后攒着的：学习者在组件上的操作（没等回应的）、组件“现在的状态”（每个组件最后一次）、组件在学习者那边的
   * 报错；按时间各一条，附在这一轮的输入前面。从正本现算（上一条 turn_context 之后），重启也不丢。
   */
  async preface(loopId: string): Promise<string> {
    const records = await this.hub.records(loopId);
    const lastCtx = records.filter((r) => r.record.type === 'turn_context').at(-1)?.line ?? 0;
    const since = records.filter((r) => r.line > lastCtx);
    const lastState = new Map<string, number>();
    for (const { line, record: r } of since) {
      if (r.type === 'component_action' && r.state === true) lastState.set(r.component, line);
    }
    return since
      .flatMap(({ line, record: r }) => {
        const head = `[第 ${String(line)} 行 · ${localMinute(r.at)}]`;
        if (r.type === 'component_action' && r.state === true) {
          return lastState.get(r.component) === line
            ? [`${head} （组件「${r.component}」现在的状态）${r.text}`]
            : [];
        }
        if (r.type === 'component_error') {
          return [`${head} 组件「${r.component}」在学习者那边报错：${r.message}`];
        }
        if (r.type === 'component_action' && !r.awaited) {
          return [`${head} （在组件「${r.component}」上）${r.text}`];
        }
        return [];
      })
      .join('\n');
  }
}
