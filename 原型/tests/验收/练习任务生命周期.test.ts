// 验收：练习任务的生命周期（M03:15,16,19,21）。只经 HTTP 验证，模型是假模型。
// - 教学侧布置一道练习：练什么、题目来源（生成的标“生成”）、交什么、能否提示、何时算完、功能、难度；
// - 学习者提交（经接口提交的一句话是学习者原话行；或教学侧认对话里的原话行）→ 教学侧反馈 → 完成 / 放弃；
// - 状态由记录折叠得出；提示用了几次记在任务上；只追加。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { post, records } from '../helpers/http.ts';
import {
  assignGenerated,
  feedbackStep,
  finishStep,
  newPractice,
  openLoop,
  practiceTask,
  practiceTasks,
  startPractice,
  submitText,
  teach,
} from '../helpers/practice-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function start() {
  const st = newPractice();
  const s = await startPractice(st);
  apps.push(s.app);
  const { loopId } = await openLoop(s.app, s.mainId, 0);
  return { st, ...s, loopId };
}

describe('练习任务生命周期', () => {
  it('布置：任务带全练什么 / 来源 / 交什么 / 能否提示 / 何时算完 / 功能 / 难度，生成题标“生成”', async () => {
    const { app, st, loopId } = await start();
    const id = await assignGenerated(app, st, loopId, { hints_allowed: true });
    const t = await practiceTask(app, loopId, id);
    expect(t).toMatchObject({
      id,
      loopSessionId: loopId,
      status: 'assigned',
      focus: '用位移的定义算一次位移',
      source: { kind: 'generated' },
      deliverable: '位移的数值和一句理由',
      hintsAllowed: true,
      doneWhen: '位移算对，并说清为什么不是路程',
      function: '巩固',
      difficulty: '低',
      stageCheck: false,
      hintsUsed: 0,
      hintsAsked: 0,
      submissions: [],
      feedbacks: [],
    });
    expect(t.prompt).toContain('蚂蚁');
    // 没指定点 / 子句：按本闭环的单子记
    expect(t.points.map((p) => p.id)).toEqual(['p-displacement']);
    expect(t.clauseId).toBe('c-disp-from-pos');
    // 记录挂在该闭环的正本里
    expect((await records(app, loopId)).some((r) => r.record.type === 'practice_assigned')).toBe(
      true,
    );
  });

  it('布置前的检查：来源二选一、点和子句得在 M08 里、follows 得在本闭环', async () => {
    const { app, st, loopId } = await start();
    const bad = async (args: Record<string, unknown>, say: string) => {
      const rows = await teach(
        app,
        st,
        loopId,
        { calls: [{ name: 'assign_practice', args }] },
        say,
      );
      const r = rows.find((x) => x.name === 'assign_practice');
      expect(r?.isError).toBe(true);
      return r?.result ?? '';
    };
    const base = {
      focus: '练位移',
      deliverable: '答案',
      done_when: '算对',
      function: '巩固',
      difficulty: '低',
    };
    expect(await bad(base, '一')).toContain('二选一');
    expect(await bad({ ...base, generated_prompt: '题', points: ['p-不存在'] }, '二')).toContain(
      'p-不存在',
    );
    expect(await bad({ ...base, generated_prompt: '题', follows: 'pr-00000000' }, '三')).toContain(
      'pr-00000000',
    );
    expect(await practiceTasks(app, loopId)).toHaveLength(0);
  });

  it('作答：经接口提交的一句话是学习者原话行，任务变“已作答”；反馈后“已反馈”；完成后“已完成”', async () => {
    const { app, st, loopId } = await start();
    const id = await assignGenerated(app, st, loopId);
    await submitText(app, st, loopId, id, '位移是 2 米，因为是 4 减 2', { text: '收到。' });
    let t = await practiceTask(app, loopId, id);
    expect(t.status).toBe('submitted');
    const sub = t.submissions[0];
    expect(sub?.via).toBe('interface');
    expect(sub?.lines[0]?.text).toBe('位移是 2 米，因为是 4 减 2');
    // 这一行在正本里就是学习者的 user_message，且标着是对这道题的作答
    const rec = (await records(app, loopId)).find((r) => r.line === sub?.lines[0]?.line);
    expect(rec?.record).toMatchObject({ type: 'user_message', practice: { taskId: id } });

    await teach(app, st, loopId, feedbackStep(id), '好的');
    t = await practiceTask(app, loopId, id);
    expect(t.status).toBe('feedback');
    expect(t.feedbacks[0]?.text).toContain('位移看起点');

    await teach(app, st, loopId, finishStep(id), '嗯');
    t = await practiceTask(app, loopId, id);
    expect(t.status).toBe('completed');
    expect(t.done).toMatchObject({ outcome: 'completed', by: 'teacher' });
  });

  it('没作答不能给反馈或标完成；最近一次作答没反馈不能标完成；完成后不能再作答', async () => {
    const { app, st, loopId } = await start();
    const id = await assignGenerated(app, st, loopId);
    const early = await teach(app, st, loopId, feedbackStep(id), '还没做');
    expect(early.find((r) => r.name === 'give_practice_feedback')?.isError).toBe(true);
    const early2 = await teach(app, st, loopId, finishStep(id), '嗯');
    expect(early2.find((r) => r.name === 'finish_practice')?.isError).toBe(true);

    await submitText(app, st, loopId, id, '2 米', { text: '收到。' });
    const noFeedback = await teach(app, st, loopId, finishStep(id), '嗯');
    expect(noFeedback.find((r) => r.name === 'finish_practice')?.result).toContain('反馈');
    await teach(app, st, loopId, feedbackStep(id), '嗯');
    await teach(app, st, loopId, finishStep(id), '嗯');
    const res = await post(app, `/loops/${loopId}/practice/${id}/submit`, { text: '再答一次' });
    expect(res.status).toBe(400);
  });

  it('对话里答的：教学侧认学习者的原话行；不是学习者的行、在布置之前的行都不认', async () => {
    const { app, st, loopId } = await start();
    await post(app, `/sessions/${loopId}/messages`, { text: '先问个别的：什么是参考系？' });
    const before =
      (await records(app, loopId)).filter((r) => r.record.type === 'user_message').at(-1)?.line ??
      0;
    const id = await assignGenerated(app, st, loopId);
    const assistantLine =
      (await records(app, loopId)).filter((r) => r.record.type === 'assistant_message').at(-1)
        ?.line ?? 0;
    const mark = (lines: number[], say: string) =>
      teach(
        app,
        st,
        loopId,
        { calls: [{ name: 'mark_practice_submission', args: { task_id: id, lines } }] },
        say,
      );
    expect((await mark([assistantLine], '一'))[0]?.isError).toBe(true);
    expect((await mark([before], '二'))[0]?.result).toContain('布置之前');
    // 学习者在布置之后的一句话
    const rows = await mark([0], '位移是 2 米');
    expect(rows[0]?.isError).toBe(true); // 0 号行不存在
    const mine =
      (await records(app, loopId)).filter((r) => r.record.type === 'user_message').at(-1)?.line ??
      0;
    const ok = await teach(
      app,
      st,
      loopId,
      { calls: [{ name: 'mark_practice_submission', args: { task_id: id, lines: [mine] } }] },
      '就这样吧',
    );
    // 这一轮的 say 是新的一行；认上一行
    expect(ok[0]?.isError).toBe(false);
    const t = await practiceTask(app, loopId, id);
    expect(t.status).toBe('submitted');
    expect(t.submissions[0]?.via).toBe('conversation');
    expect(t.submissions[0]?.lines[0]?.text).toBe('位移是 2 米');
  });

  it('提示：设定不给提示的题拒绝要提示；可给的记“要了几次”和“用了几次”', async () => {
    const { app, st, loopId } = await start();
    const noHint = await assignGenerated(app, st, loopId, { hints_allowed: false });
    expect((await post(app, `/loops/${loopId}/practice/${noHint}/hint`)).status).toBe(400);
    expect((await practiceTask(app, loopId, noHint)).hintsAsked).toBe(0);
    const refuse = await teach(
      app,
      st,
      loopId,
      { calls: [{ name: 'give_practice_hint', args: { task_id: noHint } }] },
      '给点提示吧',
    );
    expect(refuse[0]?.isError).toBe(true);

    const id = await assignGenerated(app, st, loopId, { hints_allowed: true });
    // 学习者要提示：记一次“要了”，教学侧被告知，给了就记一次“用了”
    const rows = await teach(
      app,
      st,
      loopId,
      {
        calls: [{ name: 'give_practice_hint', args: { task_id: id, note: '想想起点和终点' } }],
        text: '先看起点和终点。',
      },
      undefined,
      async () => {
        const res = await post(app, `/loops/${loopId}/practice/${id}/hint`);
        expect(res.status).toBe(201);
      },
    );
    expect(rows[0]?.isError).toBe(false);
    const t = await practiceTask(app, loopId, id);
    expect(t).toMatchObject({ hintsAsked: 1, hintsUsed: 1 });
    expect(t.hints.map((h) => h.by)).toEqual(['learner', 'teacher']);
    // 完成时，教学侧能看到这道题提示用了几次，据此安排下一道（递进）
    await submitText(app, st, loopId, id, '2 米', { text: '收到。' });
    await teach(app, st, loopId, feedbackStep(id), '嗯');
    const fin = await teach(app, st, loopId, finishStep(id), '嗯');
    expect(fin[0]?.result).toContain('提示用了 1 次');
    const next = await assignGenerated(app, st, loopId, {
      follows: id,
      hints_allowed: false,
      function: '变式',
    });
    const nt = await practiceTask(app, loopId, next);
    expect(nt).toMatchObject({ follows: id, function: '变式', hintsAllowed: false });
    const list = await teach(
      app,
      st,
      loopId,
      { calls: [{ name: 'list_practice', args: {} }] },
      '看看',
    );
    expect(list[0]?.result).toContain('提示用了 1 次');
  });

  it('学习者可以放弃；放弃后不能再提交；教学侧也能标放弃', async () => {
    const { app, st, loopId } = await start();
    const a = await assignGenerated(app, st, loopId);
    const res = await post(app, `/loops/${loopId}/practice/${a}/abandon`, { note: '这题太绕了' });
    expect(res.status).toBe(200);
    await app.studium.settled();
    const t = await practiceTask(app, loopId, a);
    expect(t.status).toBe('abandoned');
    expect(t.done).toMatchObject({ outcome: 'abandoned', by: 'learner', note: '这题太绕了' });
    expect(
      (await post(app, `/loops/${loopId}/practice/${a}/submit`, { text: '算了试试' })).status,
    ).toBe(400);

    const b = await assignGenerated(app, st, loopId);
    await teach(app, st, loopId, finishStep(b, 'abandoned'), '换一道');
    expect((await practiceTask(app, loopId, b)).done).toMatchObject({
      outcome: 'abandoned',
      by: 'teacher',
    });
  });

  it('记录只追加：任务状态变了，布置那一行原样还在', async () => {
    const { app, st, loopId } = await start();
    const id = await assignGenerated(app, st, loopId);
    const before = (await records(app, loopId)).find((r) => r.record.type === 'practice_assigned');
    await submitText(app, st, loopId, id, '2 米', { text: '收到。' });
    await teach(app, st, loopId, feedbackStep(id), '嗯');
    await teach(app, st, loopId, finishStep(id), '嗯');
    const after = (await records(app, loopId)).find((r) => r.record.type === 'practice_assigned');
    expect(after).toEqual(before);
    const types = (await records(app, loopId)).map((r) => r.record.type);
    expect(types.filter((t) => t === 'practice_assigned')).toHaveLength(1);
    expect(types).toContain('practice_feedback');
    expect(types).toContain('practice_done');
  });
});
