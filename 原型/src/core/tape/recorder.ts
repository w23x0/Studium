// 真实运行录带（04「质量」P1）：把一次运行里模型侧发生的一切（每轮输入、流式事件、工具调用与结果、中途插话）
// 和学习者的动作（发话、申请收口……）按发生顺序记进一个 JSONL 文件，供离线回放。
// 录带不是正本：正本照常写；录带只为回放与回归比较。编号一律换成稳定记号（ids.ts）。
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Hub } from '../hub.ts';
import type {
  ConversationSpec,
  ModelAdapter,
  ModelConversation,
  ModelEvent,
  ToolSpec,
  TurnInput,
} from '../model/port.ts';
import type { Studium } from '../studium.ts';
import { IdTokens } from './ids.ts';

/** 学习者经界面做的动作（Studium 的方法）：回放时按顺序重做（本地服务拿到的是录带包过的那一份）。 */
export const ACTIONS = [
  'createProject',
  'learnerSays',
  // 批 3a：项目资料（期限 W20 随谈方向删）
  'changeMaterials',
  // W8 / W9 / W11：加资料、删、重试、改归属、上传改判、删导入、项目说明
  // （上传本身带文件内容，不进录带）
  'addMaterial',
  'removeMaterial',
  'retryMaterial',
  'setMaterialOwner',
  'reroute',
  'setInstructions',
  // 批 10b：资料来源说明
  'addSourceNote',
  // 左栏：项目改名（置顶、从列表删掉、对话改名只记在 ui/sidebar.jsonl，不进正本，不录）
  'renameProject',
  // W12：停止、改最后一句、删讨论串
  'stopTurn',
  'editLast',
  'deleteThread',
  // W19：学习者在讨论串栏点结束
  'endThread',
] as const;
export type ActionName = (typeof ACTIONS)[number];

export type TapeLine =
  | {
      t: 'header';
      /** 录带格式版本：会话种类改名（工单 W7 §4.5）后是 2，旧版不回放。 */
      v: 2;
      at: string;
      adapter: string;
      /** 开录时数据目录里已有的会话数；不为 0 时回放会有偏差（回放从空目录开始）。 */
      preexisting: number;
    }
  | { t: 'turn'; s: string; n: number; at: string; input: TurnInput }
  | { t: 'interject'; s: string; n: number; at: string; input: TurnInput }
  | { t: 'event'; s: string; n: number; at: string; ev: ModelEvent }
  | {
      t: 'tool';
      s: string;
      n: number;
      at: string;
      name: string;
      args: Record<string, unknown>;
      result: string;
      isError: boolean;
    }
  | {
      t: 'action';
      seq: number;
      at: string;
      name: ActionName;
      args: unknown[];
      /** 动作发生时系统是否空闲（没有会话在跑、没有后台清单）。 */
      quiet: boolean;
      /** 发话时那个会话正在跑（W12 起排到这一轮之后再交给它）。 */
      interject: boolean;
    }
  | { t: 'action_error'; seq: number; error: string };

export class Recorder {
  readonly ids = new IdTokens();
  private hub: Hub | undefined;
  private studium: Studium | undefined;
  private readonly turns = new Map<string, number>();
  private seq = 0;

  constructor(
    private readonly path: string,
    private readonly opts: { now: () => Date },
  ) {
    mkdirSync(dirname(path), { recursive: true });
  }

  private write(line: TapeLine): void {
    // 同步追加：录带行的先后就是事情发生的先后
    appendFileSync(this.path, `${JSON.stringify(line)}\n`, 'utf8');
  }

  private at(): string {
    return this.opts.now().toISOString();
  }

  /** 在开第一个会话之前接上（createApp 里）。 */
  attach(hub: Hub, studium: Studium, adapter: string): void {
    this.hub = hub;
    this.studium = studium;
    const preexisting = hub.listSessions().length;
    if (preexisting > 0) {
      console.warn(
        `录带从已有 ${String(preexisting)} 个会话的数据目录开始；回放从空目录开始，会有偏差`,
      );
    }
    this.ids.attach(hub, studium);
    this.write({
      t: 'header',
      v: 2,
      at: this.at(),
      adapter,
      preexisting,
    });
  }

  wrapModel(inner: ModelAdapter): ModelAdapter {
    const select = inner.selection?.bind(inner);
    const quota = inner.quota?.bind(inner);
    return {
      get name() {
        return inner.name;
      },
      ...(select !== undefined
        ? {
            selection: (
              id: string,
              kind: Parameters<NonNullable<ModelAdapter['selection']>>[1],
            ) => {
              const selected = select(id, kind);
              return { ...selected, adapter: this.wrapModel(selected.adapter) };
            },
          }
        : {}),
      ...(quota !== undefined ? { quota } : {}),
      ...(inner.disclosure !== undefined ? { disclosure: inner.disclosure } : {}),
      open: (spec) => this.wrapConversation(inner, spec),
    };
  }

  private wrapConversation(inner: ModelAdapter, spec: ConversationSpec): ModelConversation {
    const s = spec.session ? this.ids.token(spec.session.id) : '⟦?⟧';
    const current = () => (this.turns.get(s) ?? 1) - 1;
    const tools: ToolSpec[] = spec.tools.map((t) => ({
      ...t,
      run: async (args) => {
        const r = await t.run(args);
        this.write({
          t: 'tool',
          s,
          n: current(),
          at: this.at(),
          name: t.name,
          args: this.ids.tokenize(args),
          result: this.ids.tokenize(r.text),
          isError: r.isError === true,
        });
        return r;
      },
    }));
    const conv = inner.open({ ...spec, tools });
    return {
      send: (input) => this.recordTurn(s, conv, input),
      ...(conv.interrupt ? { interrupt: () => conv.interrupt?.() ?? Promise.resolve() } : {}),
      // 子代理在后台的事与模型自己起的一轮原样转交，不进录带（回放不重现它们）
      ...(conv.listen
        ? {
            listen: (handlers: Parameters<NonNullable<ModelConversation['listen']>>[0]) =>
              conv.listen?.(handlers),
          }
        : {}),
      close: () => conv.close(),
    };
  }

  private async *recordTurn(
    s: string,
    conv: ModelConversation,
    input: TurnInput,
  ): AsyncGenerator<ModelEvent> {
    const n = this.turns.get(s) ?? 0;
    this.turns.set(s, n + 1);
    this.write({ t: 'turn', s, n, at: this.at(), input: this.ids.tokenize(input) });
    for await (const ev of conv.send(input)) {
      this.write({ t: 'event', s, n, at: this.at(), ev: this.ids.tokenize(ev) });
      yield ev;
    }
  }

  /** 给本地服务用的 Studium：方法名在 ACTIONS 里的学习者动作先记进录带再照常执行。 */
  wrapStudium(studium: Studium): Studium {
    const actions: readonly string[] = ACTIONS;
    return new Proxy(studium, {
      get: (t, prop, receiver) => {
        const value: unknown = Reflect.get(t, prop, receiver);
        if (typeof value !== 'function') return value;
        const fn = value as (...a: unknown[]) => unknown;
        const name = typeof prop === 'string' ? prop : '';
        if (!actions.includes(name)) return fn.bind(t);
        return (...args: unknown[]) => {
          const seq = ++this.seq;
          const hub = this.hub;
          this.write({
            t: 'action',
            seq,
            at: this.at(),
            name: name as ActionName,
            // 末尾没给的参数不记（JSON 里 undefined 会变成 null，回放时意思就变了）
            args: this.ids.tokenize(withoutTrailingUndefined(args)),
            quiet: !(this.studium?.busy() ?? false),
            interject:
              saysSomething(name) && typeof args[0] === 'string' && hub !== undefined
                ? hub.isRunning(args[0])
                : false,
          });
          const out = fn.apply(t, args);
          if (out instanceof Promise) {
            return out.catch((e: unknown) => {
              this.write({
                t: 'action_error',
                seq,
                error: e instanceof Error ? e.message : String(e),
              });
              throw e;
            });
          }
          return out;
        };
      },
    });
  }
}

/** 这个动作会在对话里添一句学习者的话（会话在跑时就是中途插话）。 */
function saysSomething(name: string): boolean {
  return name === 'learnerSays';
}

function withoutTrailingUndefined(args: unknown[]): unknown[] {
  let n = args.length;
  while (n > 0 && args[n - 1] === undefined) n--;
  return args.slice(0, n);
}
