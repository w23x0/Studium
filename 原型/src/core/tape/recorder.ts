// 真实运行录带（04「质量」P1）：把一次运行里模型侧发生的一切（每轮输入、流式事件、工具调用与结果、中途插话）
// 和学习者的动作（发话、选卡、申请收口……）按发生顺序记进一个 JSONL 文件，供离线回放。
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

/**
 * 学习者经界面做的动作：回放时按顺序重做。不带点的是 Studium 的方法；“longterm.” 是 studium.longterm 的、
 * “practice.” 是 studium.practice 的、“outputs.” 是 M14 产出物的、“notes.” 是个人笔记的、
 * “notes.” / “outputs.” 是个人笔记与产出物那几处的（本地服务拿到的都是录带包过的那一份）。
 */
export const ACTIONS = [
  'createProject',
  'learnerSays',
  'requestCard',
  'choose',
  'requestClose',
  'confirmClose',
  'endUnclosed',
  'objectToVerdict',
  'objectToRecord',
  'confirmRecord',
  // 批 3a：项目资料、期限、笔记导入与提点
  'changeMaterials',
  'setDeadline',
  'notes.import',
  'extractNotePoints',
  // 批 5：小卡上的选择、搁置、恢复
  'chooseDetour',
  'shelveLoop',
  'resumeLoop',
  // 批 6：接着学、提醒、复盘、重新分析
  'longterm.continueLoop',
  'longterm.addReminder',
  'longterm.closeReminder',
  'longterm.startReview',
  'reanalyzeLoop',
  // 批 8：产出物、版本、文献、候选、写产出对话
  'outputs.create',
  'outputs.save',
  'outputs.addLiterature',
  'outputs.openTask',
  // 批 10b：资料来源说明、状态记录的“我的解释”
  'addSourceNote',
  'addStateExplanation',
  // 批 9：练习的交作答、要提示、先不做、请老师归纳
  'practice.submit',
  'practice.askHint',
  'practice.abandon',
  'practice.requestSummary',
  // 左栏：项目改名（置顶、从列表删掉、对话改名只记在 ui/sidebar.jsonl，不进正本，不录）
  'renameProject',
] as const;
export type ActionName = (typeof ACTIONS)[number];

export type TapeLine =
  | {
      t: 'header';
      v: 1;
      at: string;
      adapter: string;
      /** 开录时数据目录里已有的会话数；不为 0 时回放会有偏差（回放从空目录开始）。 */
      preexisting: number;
      library?: string;
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
      /** 发话时那个会话正在跑（中途插话）。 */
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
    private readonly opts: { library?: string; now: () => Date },
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
      v: 1,
      at: this.at(),
      adapter,
      preexisting,
      ...(this.opts.library !== undefined ? { library: this.opts.library } : {}),
    });
  }

  wrapModel(inner: ModelAdapter): ModelAdapter {
    return {
      name: inner.name,
      ...(inner.disclosure !== undefined ? { disclosure: inner.disclosure } : {}),
      // 图片转写不进录带：它的结果随学习者消息一起记在正本里（回放按那条消息重放）
      ...(inner.transcriber !== undefined ? { transcriber: inner.transcriber } : {}),
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
      ...(conv.interject
        ? {
            interject: (input: TurnInput) => {
              const accepted = conv.interject?.(input) === true;
              if (accepted) {
                this.write({
                  t: 'interject',
                  s,
                  n: current(),
                  at: this.at(),
                  input: this.ids.tokenize(input),
                });
              }
              return accepted;
            },
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

  /** 给本地服务用的 Studium：学习者动作先记进录带再照常执行（studium.longterm、studium.practice 的动作同样）。 */
  wrapStudium(studium: Studium): Studium {
    const longterm = this.wrap(studium.longterm, 'longterm.');
    const practice = this.wrap(studium.practice, 'practice.');
    return this.wrap(studium, '', (prop) =>
      prop === 'longterm' ? longterm : prop === 'practice' ? practice : undefined,
    );
  }

  /** 给本地服务用的其他对象（产出物、笔记）：名字前缀 + 方法名在 ACTIONS 里的，先记再执行。 */
  wrap<T extends object>(
    target: T,
    prefix: string,
    override: (prop: string | symbol) => unknown = () => undefined,
  ): T {
    const actions: readonly string[] = ACTIONS;
    return new Proxy(target, {
      get: (t, prop, receiver) => {
        const replaced = override(prop);
        if (replaced !== undefined) return replaced;
        const value: unknown = Reflect.get(t, prop, receiver);
        if (typeof value !== 'function') return value;
        const fn = value as (...a: unknown[]) => unknown;
        const name = typeof prop === 'string' ? `${prefix}${prop}` : '';
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
              saysSomething(name, args) && typeof args[0] === 'string' && hub !== undefined
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

/** 这个动作会在对话里添一句学习者的话（会话在跑时就是中途插话）：发话，或写一段作答交给练习。 */
function saysSomething(name: string, args: unknown[]): boolean {
  if (name === 'learnerSays') return true;
  if (name !== 'practice.submit') return false;
  const body = args[2];
  return typeof body === 'object' && body !== null && 'text' in body;
}

function withoutTrailingUndefined(args: unknown[]): unknown[] {
  let n = args.length;
  while (n > 0 && args[n - 1] === undefined) n--;
  return args.slice(0, n);
}
