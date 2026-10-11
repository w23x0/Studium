// 验收：题型 / 方法归纳（M03:18，第二梯队）。只经 HTTP 验证，模型是假模型。
// - 学习者做完若干（>= 2）练习后，教学侧在闭环里写一段“这类题怎么想”，指回练习和学习者的原话；只追加；
// - 学习者也可以单独请求一次归纳（告诉闭环里的教学侧写）；
// - 只能据已完成的练习；依据行只认学习者的话；
// - 界面能列出归纳。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { PracticeSummariesResponse } from '../../src/shared/protocol.ts';
import { getJson, post, records } from '../helpers/http.ts';
import {
  newPractice,
  openLoop,
  runTask,
  assignGenerated,
  startPractice,
  teach,
  type PracticeState,
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

const summarize = (
  app: App,
  st: PracticeState,
  loopId: string,
  args: Record<string, unknown>,
  say: string,
) =>
  teach(
    app,
    st,
    loopId,
    { calls: [{ name: 'write_practice_summary', args }], text: '我把要点说一下。' },
    say,
  );

describe('题型 / 方法归纳', () => {
  it('据两道已完成的练习写归纳，指回练习和学习者的原话；列表里能看到', async () => {
    const { app, st, loopId } = await start();
    const a = await runTask(app, st, loopId, '位移是 2 米');
    const b = await runTask(app, st, loopId, '位移是 3 米');
    const rows = await summarize(
      app,
      st,
      loopId,
      {
        task_ids: [a.taskId, b.taskId],
        text: '这类题先找起点和终点，位移 = 终点 - 起点；来回走的路程不进位移。',
        evidence: [
          { task_id: a.taskId, line: a.answerLine },
          { task_id: b.taskId, line: b.answerLine },
        ],
      },
      '总结一下吧',
    );
    expect(rows[0]?.isError).toBe(false);
    const r = await getJson<PracticeSummariesResponse>(app, '/practice/summaries');
    expect(r.summaries).toHaveLength(1);
    expect(r.summaries[0]).toMatchObject({
      loopSessionId: loopId,
      requestedBy: 'teacher',
    });
    expect(r.summaries[0]?.text).toContain('位移 = 终点 - 起点');
    expect(r.summaries[0]?.tasks.map((t) => t.taskId)).toEqual([a.taskId, b.taskId]);
    expect(r.summaries[0]?.tasks[0]?.focus).toBe('用位移的定义算一次位移');
    expect(r.summaries[0]?.evidence).toEqual([
      { loopSessionId: loopId, line: a.answerLine, text: '位移是 2 米' },
      { loopSessionId: loopId, line: b.answerLine, text: '位移是 3 米' },
    ]);
    // 按闭环筛
    expect(
      (await getJson<PracticeSummariesResponse>(app, `/practice/summaries?loop=${loopId}`))
        .summaries,
    ).toHaveLength(1);
    // 只追加：记录在闭环正本里
    expect((await records(app, loopId)).some((x) => x.record.type === 'practice_summary')).toBe(
      true,
    );
  });

  it('不足两道、没完成的、依据不是学习者的话，都不写', async () => {
    const { app, st, loopId } = await start();
    const a = await runTask(app, st, loopId, '位移是 2 米');
    const open = await assignGenerated(app, st, loopId);
    const assistantLine =
      (await records(app, loopId)).filter((x) => x.record.type === 'assistant_message').at(-1)
        ?.line ?? 0;
    const ev = [{ task_id: a.taskId, line: a.answerLine }];
    const one = await summarize(
      app,
      st,
      loopId,
      { task_ids: [a.taskId], text: '归纳', evidence: ev },
      '一',
    );
    expect(one[0]?.isError).toBe(true);
    const notDone = await summarize(
      app,
      st,
      loopId,
      { task_ids: [a.taskId, open], text: '归纳', evidence: ev },
      '二',
    );
    expect(notDone[0]?.result).toContain('还没完成');
    const b = await runTask(app, st, loopId, '位移是 3 米');
    const notLearner = await summarize(
      app,
      st,
      loopId,
      {
        task_ids: [a.taskId, b.taskId],
        text: '归纳',
        evidence: [{ task_id: a.taskId, line: assistantLine }],
      },
      '三',
    );
    expect(notLearner[0]?.result).toContain('不是学习者说的话');
    const stranger = await summarize(
      app,
      st,
      loopId,
      {
        task_ids: [a.taskId, b.taskId],
        text: '归纳',
        evidence: [{ task_id: 'pr-00000000', line: 3 }],
      },
      '四',
    );
    expect(stranger[0]?.isError).toBe(true);
    expect(
      (await getJson<PracticeSummariesResponse>(app, '/practice/summaries')).summaries,
    ).toHaveLength(0);
  });

  it('学习者单独请求一次归纳：教学侧收到事实后写，记为学习者请求的', async () => {
    const { app, st, loopId } = await start();
    const a = await runTask(app, st, loopId, '位移是 2 米');
    // 只有一道完成的：请求被拒
    expect((await post(app, `/loops/${loopId}/practice/summarize`, {})).status).toBe(400);
    const b = await runTask(app, st, loopId, '位移是 3 米');
    const rows = await teach(
      app,
      st,
      loopId,
      (ctx) => {
        expect(ctx.input.text).toContain('学习者请求把已完成的练习归纳一次');
        expect(ctx.input.text).toContain(a.taskId);
        return {
          calls: [
            {
              name: 'write_practice_summary',
              args: {
                task_ids: [a.taskId, b.taskId],
                text: '先定起点终点再相减。',
                evidence: [{ task_id: b.taskId, line: b.answerLine }],
                requested_by_learner: true,
              },
            },
          ],
        };
      },
      undefined,
      async () => {
        const res = await post(app, `/loops/${loopId}/practice/summarize`, {});
        expect(res.status).toBe(202);
        expect(((await res.json()) as { taskIds: string[] }).taskIds).toEqual([a.taskId, b.taskId]);
      },
    );
    expect(rows[0]?.isError).toBe(false);
    const r = await getJson<PracticeSummariesResponse>(app, '/practice/summaries');
    expect(r.summaries[0]).toMatchObject({ requestedBy: 'learner', text: '先定起点终点再相减。' });
    // 请求里点名的练习没完成：拒绝
    const open = await assignGenerated(app, st, loopId);
    expect(
      (await post(app, `/loops/${loopId}/practice/summarize`, { tasks: [a.taskId, open] })).status,
    ).toBe(400);
  });

  it('可以引用别的学习任务里已完成的同类练习（list_practice 的 related 列出）', async () => {
    const { app, st, mainId, loopId } = await start();
    const a = await runTask(app, st, loopId, '位移是 2 米');
    const second = await openLoop(app, mainId, 0);
    const b = await runTask(app, st, second.loopId, '位移是 3 米');
    const listed = await teach(
      app,
      st,
      second.loopId,
      { calls: [{ name: 'list_practice', args: { related: true } }] },
      '看看以前的',
    );
    expect(listed[0]?.result).toContain(`会话 ${loopId}`);
    expect(listed[0]?.result).toContain(a.taskId);
    const rows = await summarize(
      app,
      st,
      second.loopId,
      {
        task_ids: [a.taskId, b.taskId],
        text: '两次都是起点终点相减。',
        evidence: [
          { task_id: a.taskId, line: a.answerLine },
          { task_id: b.taskId, line: b.answerLine },
        ],
      },
      '总结',
    );
    expect(rows[0]?.isError).toBe(false);
    const s = (
      await getJson<PracticeSummariesResponse>(app, `/practice/summaries?loop=${second.loopId}`)
    ).summaries[0];
    expect(s?.evidence.map((e) => e.loopSessionId)).toEqual([loopId, second.loopId]);
  });
});
