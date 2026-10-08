// 离线回放（04「质量」P1）：只凭录带，在一个空数据目录里把一次运行重放一遍，不调模型。
// 模型侧：每个会话的第 n 轮照录带吐事件、按录带的参数调工具（工具由这次的核心真跑，写正本、写知识层）。
// 学习者侧：按录带顺序重做动作（空闲时做的等空闲再做；中途插话等那个会话在跑时再发）。
// 交给模型的输入、工具结果与录带不一致的，都记进问题清单；改了核心代码后用它看行为变没变。
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createApp } from '../app.ts';
import type {
  ConversationSpec,
  ModelAdapter,
  ModelConversation,
  ModelEvent,
  TurnInput,
} from '../model/port.ts';
import type { Studium } from '../studium.ts';
import { IdTokens, normalizeForCompare } from './ids.ts';
import type { ActionName, TapeLine } from './recorder.ts';

export interface ReplayOptions {
  dataRoot: string;
  /** 不给就用录带头里记的（录的时候用的书库与 M08）。 */
  library?: string;
  m08Dir?: string;
  /** 等一个条件的最长毫秒数（插话、会话出现）。 */
  waitMs?: number;
}

export interface ReplayReport {
  /** 与录带不一致之处；空 = 回放与录的那次一致。 */
  problems: string[];
  /** 回放走过的模型轮数。 */
  turns: number;
  actions: number;
}

type Item = Extract<TapeLine, { t: 'event' | 'tool' | 'interject' }>;

interface Turn {
  input: TurnInput;
  items: Item[];
  used: boolean;
}

export async function replayTape(path: string, opts: ReplayOptions): Promise<ReplayReport> {
  const lines = (await readFile(path, 'utf8'))
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as TapeLine);
  const header = lines[0];
  if (header?.t !== 'header') throw new Error(`${path} 不是录带（缺开头）`);
  const problems: string[] = [];
  if (header.preexisting > 0) {
    problems.push(
      `录带从已有 ${String(header.preexisting)} 个会话的数据目录开始，回放从空目录开始`,
    );
  }
  const waitMs = opts.waitMs ?? 10_000;

  const turns = new Map<string, Map<number, Turn>>();
  const errors = new Map<number, string>();
  const actions: Extract<TapeLine, { t: 'action' }>[] = [];
  for (const l of lines) {
    if (l.t === 'turn') {
      const m = turns.get(l.s) ?? new Map<number, Turn>();
      m.set(l.n, { input: l.input, items: [], used: false });
      turns.set(l.s, m);
    } else if (l.t === 'event' || l.t === 'tool' || l.t === 'interject') {
      turns.get(l.s)?.get(l.n)?.items.push(l);
    } else if (l.t === 'action') {
      actions.push(l);
    } else if (l.t === 'action_error') {
      errors.set(l.seq, l.error);
    }
  }

  // 时钟跟着录带走：取已回放到的最晚时间，离开多久、记录时间都与录的那次接近
  let clock = Date.parse(header.at);
  const advance = (at: string) => {
    const t = Date.parse(at);
    if (t > clock) clock = t;
  };
  const ids = new IdTokens();
  const model = new ReplayModel(header.adapter, turns, ids, problems, advance, waitMs);
  const library = opts.library ?? header.library;
  const m08Dir = opts.m08Dir ?? header.m08Dir;
  const app = await createApp({
    dataRoot: opts.dataRoot,
    model,
    token: randomBytes(16).toString('hex'),
    port: 0,
    now: () => new Date(clock),
    instrument: (hub, studium) => ids.attach(hub, studium),
    ...(library !== undefined ? { library } : {}),
    ...(m08Dir !== undefined ? { m08Dir } : {}),
  });

  try {
    for (const a of actions) {
      advance(a.at);
      const where = `动作 ${String(a.seq)} ${a.name}`;
      const ready = await waitUntil(waitMs, async () => {
        if (ids.unresolved(a.args).length > 0) return false;
        // 插话：等回放走到录带里插话的那一处再发，行号才对得上
        if (a.interject) return model.waitingForInterjection(String(a.args[0]));
        if (a.quiet) await app.studium.settled();
        return true;
      });
      if (!ready) {
        problems.push(
          `${where}：等不到${a.interject ? '那个会话在跑（插话的时机）' : `${ids.unresolved(a.args).join('、')} 出现`}`,
        );
        if (ids.unresolved(a.args).length > 0) continue;
      }
      const expected = errors.get(a.seq);
      try {
        await perform(app.studium, a.name, ids.resolve(a.args));
        if (expected !== undefined)
          problems.push(`${where}：录的那次报错“${expected}”，回放没报错`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (expected === undefined) problems.push(`${where}：回放报错“${msg}”，录的那次没报错`);
        else if (normalizeForCompare(expected) !== normalizeForCompare(msg)) {
          problems.push(`${where}：报错不同：录带“${expected}”，回放“${msg}”`);
        }
      }
    }
    await app.studium.settled();
  } finally {
    await app.close();
  }

  let used = 0;
  for (const [s, m] of turns) {
    for (const [n, t] of m) {
      if (t.used) used++;
      else
        problems.push(
          `${s} 第 ${String(n)} 轮：录带里有，回放没走到（输入：${short(t.input.text)}）`,
        );
    }
  }
  return { problems, turns: used, actions: actions.length };
}

/** 重做一个学习者动作。本地服务在后台做的（出选择卡、申请收口），回放也放后台。 */
async function perform(studium: Studium, name: ActionName, args: unknown[]): Promise<void> {
  const s = studium as unknown as Record<ActionName, (...a: unknown[]) => Promise<unknown>>;
  if (name === 'requestCard' || name === 'requestClose') {
    studium.background(`回放 ${name}`, () => s[name](...args));
    return;
  }
  await s[name](...args);
}

async function waitUntil(ms: number, cond: () => Promise<boolean>): Promise<boolean> {
  const end = Date.now() + ms;
  for (;;) {
    if (await cond()) return true;
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, 10));
  }
}

function short(s: string): string {
  const one = s.replace(/\s+/g, ' ');
  return one.length > 80 ? `${one.slice(0, 80)}…` : one;
}

/** 回放用的模型：照录带吐事件、调工具；对不上的记进问题清单。 */
class ReplayModel implements ModelAdapter {
  private readonly next = new Map<string, number>();
  private readonly waiting = new Set<string>();

  /** 某会话（记号）正停在录带里插话的那一处等着。 */
  waitingForInterjection(sessionToken: string): boolean {
    return this.waiting.has(sessionToken);
  }

  constructor(
    readonly name: string,
    private readonly turns: Map<string, Map<number, Turn>>,
    private readonly ids: IdTokens,
    private readonly problems: string[],
    private readonly advance: (at: string) => void,
    private readonly waitMs: number,
  ) {}

  open(spec: ConversationSpec): ModelConversation {
    const s = spec.session ? this.ids.token(spec.session.id) : '⟦?⟧';
    const state: ReplayState = { active: false, pending: [], waiting: undefined };
    return {
      send: (input) => this.play(s, spec, state, input),
      interject: (input) => {
        if (!state.active) return false;
        const w = state.waiting;
        if (w) {
          state.waiting = undefined;
          w(input);
        } else {
          state.pending.push(input);
        }
        return true;
      },
      close: () => Promise.resolve(),
    };
  }

  private compare(where: string, taped: string, live: string): void {
    const a = normalizeForCompare(taped);
    const b = normalizeForCompare(this.ids.tokenize(live));
    if (a === b) return;
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    this.problems.push(
      `${where}不一致（第 ${String(i)} 个字起）：录带“${short(a.slice(Math.max(0, i - 20)))}”，回放“${short(b.slice(Math.max(0, i - 20)))}”`,
    );
  }

  private async *play(
    s: string,
    spec: ConversationSpec,
    state: ReplayState,
    input: TurnInput,
  ): AsyncGenerator<ModelEvent> {
    const n = this.next.get(s) ?? 0;
    this.next.set(s, n + 1);
    const turn = this.turns.get(s)?.get(n);
    const where = `${s} 第 ${String(n)} 轮`;
    if (!turn) {
      this.problems.push(`${where}：录带里没有，回放多出一轮（输入：${short(input.text)}）`);
      yield { kind: 'turn_end' };
      return;
    }
    turn.used = true;
    if (turn.input.role !== input.role) this.problems.push(`${where}：输入的角色不同`);
    this.compare(`${where}的输入`, turn.input.text, input.text);
    state.active = true;
    try {
      for (const item of turn.items) {
        this.advance(item.at);
        if (item.t === 'event') {
          // 同步收尾：此后的插话由核心按新一轮发（与真适配器一致）
          if (item.ev.kind === 'turn_end' || item.ev.kind === 'turn_error') state.active = false;
          yield this.ids.resolve(item.ev);
        } else if (item.t === 'tool') {
          const tool = spec.tools.find((t) => t.name === item.name);
          if (!tool) {
            this.problems.push(`${where}：录带调了 ${item.name}，这次没有这个工具`);
            continue;
          }
          const r = await tool.run(this.ids.resolve(item.args));
          this.compare(`${where}工具 ${item.name} 的结果`, item.result, r.text);
          if ((r.isError === true) !== item.isError) {
            this.problems.push(
              `${where}工具 ${item.name}：录带${item.isError ? '' : '没'}报错，回放相反`,
            );
          }
        } else {
          const got = state.pending.shift() ?? (await this.waitInterjection(s, state));
          if (got === undefined) {
            this.problems.push(`${where}：录带里这里有中途插话，回放没等到`);
          } else {
            this.compare(`${where}的插话`, item.input.text, got.text);
          }
        }
      }
      for (const x of state.pending.splice(0)) {
        this.problems.push(`${where}：回放多出一次插话（${short(x.text)}）`);
      }
    } finally {
      state.active = false;
    }
  }

  private waitInterjection(s: string, state: ReplayState): Promise<TurnInput | undefined> {
    this.waiting.add(s);
    return new Promise<TurnInput | undefined>((resolve) => {
      const done = (x: TurnInput | undefined) => {
        clearTimeout(timer);
        resolve(x);
      };
      state.waiting = done;
      const timer = setTimeout(() => {
        if (state.waiting === done) state.waiting = undefined;
        resolve(undefined);
      }, this.waitMs);
    }).finally(() => this.waiting.delete(s));
  }
}

interface ReplayState {
  active: boolean;
  pending: TurnInput[];
  waiting: ((x: TurnInput | undefined) => void) | undefined;
}
