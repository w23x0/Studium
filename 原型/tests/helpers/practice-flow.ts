// 练习任务（批 9）的验收测试共用：教学侧下一步做什么由测试设定（st.next），
// M05 出的卡由测试设定（st.cardOptions），其余走闭环默认的假应答。
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeModel, FakeStep } from '../../src/core/model/fake.ts';
import type { PracticeTaskResponse, PracticeTasksResponse } from '../../src/shared/protocol.ts';
import { getJson, post, records } from './http.ts';
import { settled } from './evidence-flow.ts';
import { hasTool, newLong, startLong, type LongState } from './longterm-flow.ts';
import { openLoop } from './detour-flow.ts';
import { DISPLACEMENT_OPTION, navRoute } from './roles.ts';

export const AVG_VELOCITY_OPTION = {
  new_point: 'p-avg-velocity',
  clause: 'c-avgv-from-disp',
  start_points: [{ point: 'p-displacement', source: '学过的记录' }],
  route_action: '继续主线',
  title: '平均速度',
  reason: '位移会了，接着学平均速度',
  sources: ['p-avg-velocity'],
};

export const NEWTON2_OPTION = {
  new_point: 'p-newton2',
  clause: 'c-n2-from-fma',
  start_points: [
    { point: 'p-force', source: '假定' },
    { point: 'p-mass', source: '假定' },
    { point: 'p-acceleration', source: '假定' },
  ],
  route_action: '继续主线',
  title: '牛顿第二定律',
  reason: '三个量都见过了',
  sources: ['p-newton2'],
};

type Step = FakeStep | ((ctx: FakeContext) => FakeStep | undefined);

export interface PracticeState extends LongState {
  /** 闭环里教学侧下一次被叫到时做什么（用一次就清掉）。 */
  next?: Step | undefined;
  /** M05 出的卡的选项：不设 = 位移 · 平均速度 · 牛顿第二定律。 */
  cardOptions?: Record<string, unknown>[];
}

export function newPractice(): PracticeState {
  const st: PracticeState = newLong();
  st.override = (ctx) => {
    if (hasTool(ctx, 'submit_choice_card')) {
      return {
        calls: [
          {
            name: 'submit_choice_card',
            args: {
              options: st.cardOptions ?? [DISPLACEMENT_OPTION, AVG_VELOCITY_OPTION, NEWTON2_OPTION],
              recommended: 0,
              route_decision: navRoute(ctx),
            },
          },
        ],
      };
    }
    if (hasTool(ctx, 'assign_practice') && st.next !== undefined) {
      const s = st.next;
      st.next = undefined;
      return typeof s === 'function' ? s(ctx) : s;
    }
    return undefined;
  };
  return st;
}

export async function startPractice(
  st: PracticeState,
): Promise<{ app: App; mainId: string; fake: FakeModel; dataRoot: string }> {
  return startLong(st);
}

export interface ToolRow {
  name: string;
  args: Record<string, unknown>;
  result: string;
  isError: boolean;
}

/** 下一次教学侧被叫到时做 step；learner 给了就是学习者发这句话，没给由调用方自己触发（trigger）。返回这一轮的工具调用。 */
export async function teach(
  app: App,
  st: PracticeState,
  loopId: string,
  step: Step,
  say?: string,
  trigger?: () => Promise<unknown>,
): Promise<ToolRow[]> {
  const before = (await records(app, loopId)).at(-1)?.line ?? 0;
  st.next = step;
  if (say !== undefined) await post(app, `/sessions/${loopId}/messages`, { text: say });
  else if (trigger !== undefined) await trigger();
  await settled(app, loopId);
  st.next = undefined;
  const rs = await records(app, loopId);
  return rs
    .filter((r) => r.line > before && r.record.type === 'tool_call')
    .map((r) => {
      const c = r.record;
      if (c.type !== 'tool_call') throw new Error('不可能');
      return {
        name: c.name,
        args: c.args as Record<string, unknown>,
        result: c.result,
        isError: c.isError,
      };
    });
}

export const GENERATED = {
  focus: '用位移的定义算一次位移',
  generated_prompt: '一只蚂蚁从 x = 2 m 走到 x = 7 m，再走回 x = 4 m，求它的位移。',
  deliverable: '位移的数值和一句理由',
  done_when: '位移算对，并说清为什么不是路程',
  function: '巩固',
  difficulty: '低',
};

/** 布置一道生成题，返回任务编号（取自接口）。 */
export async function assignGenerated(
  app: App,
  st: PracticeState,
  loopId: string,
  extra: Record<string, unknown> = {},
  say = '我们来练一道',
): Promise<string> {
  const rows = await teach(
    app,
    st,
    loopId,
    {
      calls: [{ name: 'assign_practice', args: { ...GENERATED, ...extra } }],
      text: '这道题你来试试。',
    },
    say,
  );
  const r = rows.find((x) => x.name === 'assign_practice');
  if (r === undefined || r.isError) throw new Error(`布置失败：${r?.result ?? '没有调用'}`);
  const tasks = await practiceTasks(app, loopId);
  const t = tasks.at(-1);
  if (t === undefined) throw new Error('没有任务');
  return t.id;
}

export async function practiceTasks(app: App, loopId: string) {
  return (await getJson<PracticeTasksResponse>(app, `/loops/${loopId}/practice`)).tasks;
}

export async function practiceTask(app: App, loopId: string, taskId: string) {
  return (await getJson<PracticeTaskResponse>(app, `/loops/${loopId}/practice/${taskId}`)).task;
}

/** 学习者经接口提交作答（新的一句话），等教学侧这一轮（按 step）做完。 */
export async function submitText(
  app: App,
  st: PracticeState,
  loopId: string,
  taskId: string,
  text: string,
  step: Step,
): Promise<ToolRow[]> {
  return teach(app, st, loopId, step, undefined, async () => {
    const res = await post(app, `/loops/${loopId}/practice/${taskId}/submit`, { text });
    if (res.status !== 201) throw new Error(`提交失败 ${String(res.status)}：${await res.text()}`);
  });
}

export function feedbackStep(taskId: string, extra: Record<string, unknown> = {}): FakeStep {
  return {
    calls: [
      {
        name: 'give_practice_feedback',
        args: { task_id: taskId, text: '位移看起点和终点，不看路径。', ...extra },
      },
    ],
    text: '这里要注意：位移只看起点和终点。',
  };
}

export function finishStep(taskId: string, outcome = 'completed'): FakeStep {
  return {
    calls: [
      {
        name: 'finish_practice',
        args: { task_id: taskId, outcome, note: '算对了位移，也说清了和路程的差别' },
      },
    ],
  };
}

/** 一道题走完：布置 → 作答（经接口）→ 反馈（可带错误）→ 完成。返回任务编号与学习者作答的行号。 */
export async function runTask(
  app: App,
  st: PracticeState,
  loopId: string,
  answer: string,
  errors?: { label: string; detail: string; lineOffset?: number }[],
  extra: Record<string, unknown> = {},
): Promise<{ taskId: string; answerLine: number }> {
  const taskId = await assignGenerated(app, st, loopId, extra);
  await submitText(app, st, loopId, taskId, answer, { text: '收到。' });
  const answerLine =
    (await practiceTask(app, loopId, taskId)).submissions.at(-1)?.lines[0]?.line ?? 0;
  await teach(
    app,
    st,
    loopId,
    feedbackStep(taskId, {
      errors: (errors ?? []).map((e) => ({
        label: e.label,
        detail: e.detail,
        lines: [answerLine],
      })),
    }),
    '我再想想',
  );
  await teach(app, st, loopId, finishStep(taskId), '好了');
  return { taskId, answerLine };
}

export { openLoop };
