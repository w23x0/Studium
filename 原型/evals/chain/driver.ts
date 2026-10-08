// 链路评测的驱动：一个模拟学生在一个全新的核心上走完整条链——开项目 → 主对话说想学什么 → 畅谈谈出方向 →
// 下一步 → 选择卡 → 学习对话（含一次中途插话）→ 我觉得懂了（守卫）→ 学完了 / 先到这里 → 写 M09 → 下一张卡，
// 后台 M15 / M10 跑完才算完。学习者的每个动作都经本地服务的 HTTP 接口做（录带只录经接口的动作，回放才对得上）；
// 学生只看到界面按 thread-model 转出来的文字，看不到系统提示、诊断记录、工具调用、程序事实。
// 驱动只在学生不动或轮数用完时代点，代点一律记进步骤日志，报告里标“驱动”。
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { createApp, type App } from '../../src/core/app.ts';
import { M08 } from '../../src/core/knowledge/m08.ts';
import { M09, type FormationRecord } from '../../src/core/knowledge/m09.ts';
import { M10, type StrategyRecord } from '../../src/core/knowledge/m10.ts';
import { M15 } from '../../src/core/knowledge/m15.ts';
import type { ModelAdapter, ModelConversation } from '../../src/core/model/port.ts';
import type {
  ChooseResponse,
  ListProjectsResponse,
  ProjectResponse,
  RecordsResponse,
  SessionSummary,
} from '../../src/shared/protocol.ts';
import type { ChoiceCard, NumberedRecord } from '../../src/shared/records.ts';
import { loopState, pendingCard, toUiMessages } from '../../src/ui/thread-model.ts';
import { studentPrompt, type Student } from './students.ts';
import { Usage } from './usage.ts';

export interface ChainModels {
  /** 被测系统（每个学生一个新的）；按会话类的模型与强度在里面配。 */
  system: (dataRoot: string) => ModelAdapter;
  student: (cwd: string) => ModelAdapter;
  judge: (cwd: string) => ModelAdapter;
}

export interface StepLog {
  at: string;
  by: '学生' | '驱动';
  where: string;
  what: string;
}

export interface SessionSnapshot extends SessionSummary {
  records: NumberedRecord[];
}

export interface InterjectionObs {
  text: string;
  /** 等到了什么才插：delta = 模型开始出字；idle = 没等到出字这一轮就完了；timeout。 */
  trigger: 'delta' | 'idle' | 'timeout';
  /** 发插话那一刻这个会话还在跑。 */
  whileRunning: boolean;
  /** 插话落在正本里的行号。 */
  line: number | undefined;
}

export interface ChainRun {
  student: Student;
  dir: string;
  dataRoot: string;
  tapePath: string;
  steps: StepLog[];
  mainId?: string;
  talkId?: string;
  loopId?: string;
  /** 单子、新点、子句的文字（给判分器）。 */
  ticketText?: string;
  sessions: SessionSnapshot[];
  m09: FormationRecord[];
  m10: StrategyRecord[];
  m15Records: number;
  m15Current: string | undefined;
  interjection?: InterjectionObs;
  studentTurns: number;
  studentErrors: string[];
  /** 驱动中断的原因（整条链没走完）。 */
  error?: string;
  usage: Usage;
  startedAt: string;
  endedAt: string;
}

export interface RunOptions {
  /** 这个学生的目录：录带、数据目录、学生与判分的工作目录都在下面。 */
  dir: string;
  /** 等系统停下的最长毫秒数（一次）。 */
  settleMs?: number;
  /** 插话前等模型出字的最长毫秒数。 */
  interjectWaitMs?: number;
  log?: (line: string) => void;
}

/** 学习对话第几轮（从 0 数）插话。 */
export const INTERJECT_AT = 2;

type Act =
  | { kind: 'say'; text: string }
  | { kind: 'press'; label: string }
  | { kind: 'pick'; index: number }
  | { kind: 'none' };

class SimStudent {
  private picked: Act | undefined;
  private readonly conv: ModelConversation;
  turns = 0;
  readonly errors: string[] = [];

  constructor(model: ModelAdapter, s: Student) {
    this.conv = model.open({
      systemPrompt: studentPrompt(s),
      tools: [
        {
          name: 'press_button',
          description: '点界面上的一个按钮；label 写按钮上的字。',
          input: { label: z.string() },
          run: (a) => {
            this.picked ??= { kind: 'press', label: String(a.label) };
            return Promise.resolve({ text: '已点' });
          },
        },
        {
          name: 'pick_option',
          description: '在选项卡里选一项；index 从 0 数。',
          input: { index: z.number().int() },
          run: (a) => {
            this.picked ??= { kind: 'pick', index: Number(a.index) };
            return Promise.resolve({ text: '已选' });
          },
        },
      ],
    });
  }

  async act(screen: string): Promise<Act> {
    this.picked = undefined;
    this.turns++;
    let text = '';
    for await (const ev of this.conv.send({ role: 'learner', text: screen })) {
      if (ev.kind === 'assistant_text') text += ev.text;
      if (ev.kind === 'turn_error') this.errors.push(ev.reason);
    }
    const picked = this.takePicked();
    if (picked) return picked;
    const t = text.trim();
    return t === '' ? { kind: 'none' } : { kind: 'say', text: t };
  }

  /** 本轮学生点了什么（工具回调里记下的）；读完清掉。 */
  private takePicked(): Act | undefined {
    const p = this.picked;
    this.picked = undefined;
    return p;
  }

  close(): Promise<void> {
    return this.conv.close();
  }
}

class Http {
  constructor(
    private readonly base: string,
    private readonly token: string,
  ) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}/api${path}`, {
      headers: { authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error(`GET ${path} → ${String(res.status)}：${await res.text()}`);
    return (await res.json()) as T;
  }

  async post(path: string, body: object = {}): Promise<{ status: number; text: string }> {
    const res = await fetch(`${this.base}/api${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { status: res.status, text: await res.text() };
  }
}

/** 把一个会话里学生还没看过的内容转成界面文字。 */
export function renderScreen(opts: {
  where: string;
  records: NumberedRecord[];
  seen: number;
  buttons: string[];
  card?: ChoiceCard | undefined;
  note?: string | undefined;
  welcome?: string | undefined;
}): string {
  const fresh = toUiMessages(opts.records, '').filter(
    (m) => m.line > opts.seen && m.role !== 'user',
  );
  const out = [`【你现在在：${opts.where}】`];
  if (opts.note !== undefined) out.push(opts.note);
  if (fresh.length === 0) {
    out.push(opts.welcome !== undefined ? `（界面提示）${opts.welcome}` : '（没有新内容）');
  }
  for (const m of fresh) {
    out.push(m.role === 'assistant' ? `Studium：${m.text}` : `（界面提示）${m.text}`);
  }
  if (opts.card) {
    out.push('选项卡：接下来学哪个？挑一个开始');
    opts.card.options.forEach((o, i) => {
      const rec = i === opts.card?.recommended ? '（推荐）' : '';
      out.push(`  ${String(i)}. ${o.title}${rec}：${o.reason}`);
    });
  }
  out.push(
    opts.buttons.length > 0
      ? `可点的按钮：${opts.buttons.map((b) => `「${b}」`).join(' ')}`
      : '（这里没有按钮，只能打字）',
  );
  return out.join('\n');
}

class Driver {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly app: App,
    private readonly http: Http,
    private readonly student: SimStudent,
    private readonly run: ChainRun,
    private readonly opts: Required<Pick<RunOptions, 'settleMs' | 'interjectWaitMs'>> &
      Pick<RunOptions, 'log'>,
  ) {}

  log(by: StepLog['by'], where: string, what: string): void {
    this.run.steps.push({ at: new Date().toISOString(), by, where, what });
    this.opts.log?.(`[${this.run.student.id}] ${by}@${where}：${what.slice(0, 80)}`);
  }

  async records(id: string): Promise<NumberedRecord[]> {
    return (await this.http.get<RecordsResponse>(`/sessions/${id}/records`)).records;
  }

  /** 等系统（含后台清单）停下。 */
  async settle(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`等系统停下超过 ${String(Math.round(this.opts.settleMs / 60000))} 分钟`));
      }, this.opts.settleMs);
    });
    try {
      await Promise.race([this.app.studium.settled(), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async ask(
    id: string,
    where: string,
    buttons: string[],
    extra: { card?: ChoiceCard; note?: string; welcome?: string } = {},
  ): Promise<Act> {
    const records = await this.records(id);
    const screen = renderScreen({
      where,
      records,
      seen: this.seen.get(id) ?? 0,
      buttons,
      card: extra.card,
      note: extra.note,
      welcome: extra.welcome,
    });
    this.seen.set(id, records.at(-1)?.line ?? 0);
    const act = await this.student.act(screen);
    const what =
      act.kind === 'say'
        ? act.text
        : act.kind === 'press'
          ? `点「${act.label}」`
          : act.kind === 'pick'
            ? `选第 ${String(act.index)} 项`
            : '（没动）';
    this.log('学生', where, what);
    return act;
  }

  async say(id: string, text: string): Promise<void> {
    const r = await this.http.post(`/sessions/${id}/messages`, { text });
    if (r.status !== 202) throw new Error(`发话失败 ${String(r.status)}：${r.text}`);
    await this.settle();
  }

  async press(id: string, action: 'close-request' | 'confirm-close' | 'end', note: string) {
    const r = await this.http.post(`/sessions/${id}/${action}`, { note });
    if (r.status !== 202) {
      this.log('驱动', '界面', `按钮没生效（${String(r.status)}）：${r.text}`);
    }
    await this.settle();
  }

  async requestCard(mainId: string): Promise<void> {
    const r = await this.http.post('/cards/request', { projectId: mainId });
    if (r.status !== 202) throw new Error(`要下一步失败 ${String(r.status)}：${r.text}`);
    await this.settle();
  }

  async choose(card: ChoiceCard, option: number): Promise<string | undefined> {
    const r = await this.http.post(`/cards/${card.cardId}/choose`, { option });
    if (r.status !== 201) {
      this.log('驱动', '选项卡', `选不上（${String(r.status)}）：${r.text}`);
      return undefined;
    }
    await this.settle();
    return (JSON.parse(r.text) as ChooseResponse).loopSessionId;
  }

  /** 学生发一句，在模型答到一半时再插一句（插话本身是人设里写好的）。 */
  async sayWithInterjection(id: string, text: string, extra: string): Promise<void> {
    let stop: () => void = () => undefined;
    const started = new Promise<'delta' | 'idle'>((resolve) => {
      stop = this.app.hub.subscribe((e) => {
        if (e.sessionId !== id) return;
        if (e.type === 'delta') resolve('delta');
        if (e.type === 'running' && !e.running) resolve('idle');
      });
    });
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => {
        resolve('timeout');
      }, this.opts.interjectWaitMs);
    });
    try {
      const r = await this.http.post(`/sessions/${id}/messages`, { text });
      if (r.status !== 202) throw new Error(`发话失败 ${String(r.status)}：${r.text}`);
      const trigger = await Promise.race([started, timeout]);
      const whileRunning = this.app.hub.isRunning(id);
      const r2 = await this.http.post(`/sessions/${id}/messages`, { text: extra });
      if (r2.status !== 202) throw new Error(`插话失败 ${String(r2.status)}：${r2.text}`);
      this.log('学生', '学习对话', `（对方回答到一半时插话）${extra}`);
      await this.settle();
      const line = (await this.records(id)).find(
        (x) => x.record.type === 'user_message' && x.record.text === extra,
      )?.line;
      this.run.interjection = { text: extra, trigger, whileRunning, line };
    } finally {
      stop();
      clearTimeout(timer);
    }
  }
}

async function chain(d: Driver, run: ChainRun, http: Http, app: App): Promise<void> {
  const s = run.student;
  const mainId = (await http.get<ProjectResponse>('/project')).mainSessionId;
  run.mainId = mainId;
  const title = async () =>
    (await http.get<ListProjectsResponse>('/projects')).projects.find(
      (p) => p.mainSessionId === mainId,
    )?.title ?? '项目';

  // ① 主对话：学生说想学什么，主对话应在那条消息下开畅谈
  let talkId: string | undefined;
  let wantsNext = false;
  for (let i = 0; i < 3 && talkId === undefined && !wantsNext; i++) {
    const act = await d.ask(mainId, `项目「${await title()}」的主对话`, ['下一步学什么'], {
      welcome: '想学什么？说说你的打算，或点“下一步学什么”。',
    });
    if (act.kind === 'say') {
      await d.say(mainId, act.text);
      const opened = (await d.records(mainId)).find((r) => r.record.type === 'task_opened');
      if (opened?.record.type === 'task_opened') talkId = opened.record.sessionId;
    } else if (act.kind === 'press' && act.label.includes('下一步')) {
      wantsNext = true;
    }
  }

  // ② 畅谈：谈出方向
  if (talkId !== undefined) {
    run.talkId = talkId;
    d.log('驱动', '主对话', '打开“单独谈谈你想学什么”（界面上的入口）');
    for (let i = 0; i < s.maxTalkTurns; i++) {
      if ((await d.records(talkId)).some((r) => r.record.type === 'talk_ended')) break;
      const act = await d.ask(talkId, '“谈谈你想学什么”对话', []);
      if (act.kind === 'say') await d.say(talkId, act.text);
    }
    const ended = (await d.records(talkId)).some((r) => r.record.type === 'talk_ended');
    if (!ended) d.log('驱动', '畅谈', `学生说满 ${String(s.maxTalkTurns)} 轮还没谈定，回到项目`);
  } else {
    d.log('驱动', '主对话', '主对话没有开“谈谈你想学什么”');
  }

  // ③ 回到项目，要下一步
  let card = pendingCard(await d.records(mainId));
  for (let i = 0; i < 2 && !card && !wantsNext; i++) {
    const act = await d.ask(mainId, `项目「${await title()}」的主对话`, ['下一步学什么'], {
      ...(i === 0 && talkId !== undefined ? { note: '（你回到了项目主页）' } : {}),
    });
    if (act.kind === 'press' && act.label.includes('下一步')) {
      await d.requestCard(mainId);
    } else if (act.kind === 'say') {
      await d.say(mainId, act.text);
    }
    card = pendingCard(await d.records(mainId));
  }
  if (!card) {
    d.log('驱动', '主对话', wantsNext ? '点“下一步学什么”（学生点的）' : '代点“下一步学什么”');
    await d.requestCard(mainId);
    card = pendingCard(await d.records(mainId));
  }
  if (!card) throw new Error('点了“下一步学什么”也没出选项');

  // ④ 选择卡
  let loopId: string | undefined;
  for (let i = 0; i < 2 && loopId === undefined; i++) {
    card = pendingCard(await d.records(mainId)) ?? card;
    const act = await d.ask(mainId, `项目「${await title()}」的主对话`, [], { card });
    if (act.kind === 'pick') loopId = await d.choose(card, act.index);
    else if (act.kind === 'say') await d.say(mainId, act.text);
  }
  if (loopId === undefined) {
    card = pendingCard(await d.records(mainId)) ?? card;
    d.log('驱动', '选项卡', `代选推荐项（第 ${String(card.recommended)} 项）`);
    loopId = await d.choose(card, card.recommended);
  }
  if (loopId === undefined) throw new Error('选项卡上一项都开不了');
  run.loopId = loopId;
  const opened = await app.hub.opened(loopId);
  if (opened.ticket) {
    const m08 = await M08.load(join(run.dataRoot, 'knowledge', 'm08'));
    const point = m08.points.get(opened.ticket.newPoint);
    const clause = m08.clauses.get(opened.ticket.clause);
    run.ticketText = [
      app.studium.describeTicket(opened.ticket),
      point ? `新点：${m08.describePoint(point)}` : '',
      clause ? `子句：${m08.describeClause(clause)}` : '',
    ].join('\n');
  }

  // ⑤ 学习对话
  let note: string | undefined;
  for (let t = 0; t < s.maxLoopTurns; t++) {
    const state = loopState(await d.records(loopId));
    if (state.kind === 'ended') break;
    const buttons = state.kind === 'awaiting_confirm' ? ['学完了'] : ['我觉得懂了', '先到这里'];
    const act = await d.ask(loopId, `学习对话「${opened.title}」`, buttons, {
      ...(note !== undefined ? { note } : {}),
    });
    note = undefined;
    if (act.kind === 'say') {
      if (t >= INTERJECT_AT && run.interjection === undefined && state.kind === 'open') {
        await d.sayWithInterjection(loopId, act.text, s.interjection);
        note = `（你刚才在对方回答到一半时插了一句：「${s.interjection}」）`;
      } else {
        await d.say(loopId, act.text);
      }
    } else if (act.kind === 'press' && buttons.includes(act.label)) {
      if (act.label === '我觉得懂了') {
        await d.press(loopId, 'close-request', '学习者点了“我觉得懂了”');
      } else if (act.label === '先到这里') {
        await d.press(loopId, 'end', '学习者点了“先到这里”');
      } else {
        await d.press(loopId, 'confirm-close', '学习者点了“学完了”');
      }
    } else if (act.kind === 'press') {
      note = `（没有「${act.label}」这个按钮）`;
    }
  }
  if (loopState(await d.records(loopId)).kind !== 'ended') {
    d.log('驱动', '学习对话', `学生说满 ${String(s.maxLoopTurns)} 轮，代点“先到这里”`);
    await d.press(loopId, 'end', '评测驱动：轮数用完，代点“先到这里”');
  }

  // ⑥ 结束后的清单（写 M09、下一张卡、M15 / M10）跑完
  await d.settle();
  const after = await d.records(mainId);
  const next = pendingCard(after);
  d.log('驱动', '主对话', next ? `下一张选项卡出来了（${next.cardId}）` : '没有出下一张选项卡');
}

export async function runStudent(
  s: Student,
  models: ChainModels,
  opts: RunOptions,
): Promise<ChainRun> {
  const dataRoot = join(opts.dir, 'data');
  const tapePath = join(opts.dir, 'tape.jsonl');
  await mkdir(opts.dir, { recursive: true });
  const usage = new Usage();
  const run: ChainRun = {
    student: s,
    dir: opts.dir,
    dataRoot,
    tapePath,
    steps: [],
    sessions: [],
    m09: [],
    m10: [],
    m15Records: 0,
    m15Current: undefined,
    studentTurns: 0,
    studentErrors: [],
    usage,
    startedAt: new Date().toISOString(),
    endedAt: '',
  };
  const token = randomBytes(16).toString('hex');
  const app = await createApp({
    dataRoot,
    model: (root) => usage.wrap(models.system(root), (spec) => `系统·${spec.session?.kind ?? '?'}`),
    token,
    port: 0,
    tape: tapePath,
  });
  const studentDir = join(opts.dir, 'student-cwd');
  await mkdir(studentDir, { recursive: true });
  const student = new SimStudent(
    usage.wrap(models.student(studentDir), () => '学生'),
    s,
  );
  const http = new Http(app.server.url, token);
  const driver = new Driver(app, http, student, run, {
    settleMs: opts.settleMs ?? 25 * 60_000,
    interjectWaitMs: opts.interjectWaitMs ?? 3 * 60_000,
    ...(opts.log !== undefined ? { log: opts.log } : {}),
  });
  try {
    await chain(driver, run, http, app);
  } catch (err) {
    run.error = err instanceof Error ? err.message : String(err);
    opts.log?.(`[${s.id}] 链路中断：${run.error}`);
  } finally {
    run.studentTurns = student.turns;
    run.studentErrors = student.errors;
    await student.close();
    await snapshot(app, run);
    await app.close();
    run.endedAt = new Date().toISOString();
  }
  return run;
}

async function snapshot(app: App, run: ChainRun): Promise<void> {
  for (const s of app.hub.listSessions()) {
    run.sessions.push({ ...s, records: await app.hub.records(s.sessionId) });
  }
  const k = join(app.dataDir.root, 'knowledge');
  run.m09 = (await M09.load(join(k, 'm09'))).all();
  run.m10 = (await M10.load(join(k, 'm10'))).all();
  const m15 = await M15.load(join(k, 'm15'));
  run.m15Records = m15.allRecords().length;
  run.m15Current = m15.current()?.text;
}

/** 读录带里的插话行（被并进正在跑的那一轮的才有）。 */
export async function tapeInterjections(tapePath: string): Promise<number> {
  const text = await readFile(tapePath, 'utf8').catch((e: unknown) => {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw e;
  });
  return text.split('\n').filter((l) => l.startsWith('{"t":"interject"')).length;
}
