// 验收：练习与守卫 / M09 的边界（M03:28,33-34）。只经 HTTP 验证，模型是假模型。
// - 交给守卫的闭环原文里没有练习反馈和错误类型（教学侧的判断），守卫读不到；
// - 表现证据只认学习者的原话行：反馈里的依据、作答都不能指到教学侧的话；
// - 练习做完 ≠ 掌握：完成练习不触发合上，不申请收口，也不生成守卫判定；
// - 学习者在练习里的作答原话照样是写 M09 的依据行（经 M09 核对仍只认学习者的行）。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { getJson, post, records } from '../helpers/http.ts';
import { confirmAndSettle, requestClose } from '../helpers/evidence-flow.ts';
import { formations } from '../helpers/longterm-flow.ts';
import {
  assignGenerated,
  feedbackStep,
  newPractice,
  openLoop,
  runTask,
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

describe('练习不替代守卫', () => {
  it('完成练习不触发收口：没有申请、没有守卫会话、闭环仍在进行', async () => {
    const { app, st, loopId } = await start();
    await runTask(app, st, loopId, '位移是 2 米');
    await runTask(app, st, loopId, '位移是 3 米');
    const types = (await records(app, loopId)).map((r) => r.record.type);
    expect(types).not.toContain('close_requested');
    expect(types).not.toContain('guard_verdict');
    expect(types).not.toContain('loop_ended');
    const sessions = await getJson<{ sessions: { kind: string }[] }>(app, '/sessions');
    expect(sessions.sessions.filter((s) => s.kind === 'guard')).toHaveLength(0);
  });

  it('守卫拿到的闭环原文里没有练习反馈、错误类型和提示记录', async () => {
    const { app, st, loopId, fake } = await start();
    await runTask(app, st, loopId, '位移是 7 米', [
      { label: '把位移当路程', detail: '教学侧的判断：来回都加了' },
    ]);
    await requestClose(app, loopId, 1);
    const guardInput =
      fake.inputs.filter((i) => i.spec.tools.some((t) => t.name === 'submit_verdict')).at(-1)
        ?.text ?? '';
    expect(guardInput).toContain('位移是 7 米'); // 学习者的作答是对话本身，守卫读得到
    expect(guardInput).not.toContain('把位移当路程');
    expect(guardInput).not.toContain('教学侧的判断');
    expect(guardInput).not.toContain('位移看起点和终点，不看路径'); // 反馈记录里的要点
    // 守卫也没有练习相关的工具
    const guard = fake.opened
      .filter((s) => s.tools.some((t) => t.name === 'submit_verdict'))
      .at(-1);
    expect(guard?.tools.some((t) => /practice|exercises/.test(t.name))).toBe(false);
  });

  it('依据只指学习者的话：反馈里的错误依据指到教学侧的行就拒绝', async () => {
    const { app, st, loopId } = await start();
    const id = await assignGenerated(app, st, loopId);
    await submitText(app, st, loopId, id, '位移是 7 米', { text: '收到。' });
    const teacherLine =
      (await records(app, loopId)).filter((r) => r.record.type === 'assistant_message').at(-1)
        ?.line ?? 0;
    const rows = await teach(
      app,
      st,
      loopId,
      feedbackStep(id, {
        errors: [{ label: '把位移当路程', detail: '加起来了', lines: [teacherLine] }],
      }),
      '嗯',
    );
    expect(rows[0]?.isError).toBe(true);
    expect(rows[0]?.result).toContain('不是学习者说的话');
    // 反馈没记下
    const t = await getJson<{ task: { feedbacks: unknown[] } }>(
      app,
      `/loops/${loopId}/practice/${id}`,
    );
    expect(t.task.feedbacks).toHaveLength(0);
  });

  it('接口提交作答只能是学习者的行：lines 指到教学侧的话被拒', async () => {
    const { app, st, loopId } = await start();
    const id = await assignGenerated(app, st, loopId);
    const teacherLine =
      (await records(app, loopId)).filter((r) => r.record.type === 'assistant_message').at(-1)
        ?.line ?? 0;
    const res = await post(app, `/loops/${loopId}/practice/${id}/submit`, { lines: [teacherLine] });
    expect(res.status).toBe(400);
    expect((await post(app, `/loops/${loopId}/practice/${id}/submit`, {})).status).toBe(400);
    expect(
      (await post(app, `/loops/${loopId}/practice/${id}/submit`, { text: '甲', lines: [1] }))
        .status,
    ).toBe(400);
  });

  it('合上之后写 M09：练习作答的学习者原话可以作依据行；闭环结束后不能再提交作答', async () => {
    const { app, st, loopId } = await start();
    const a = await runTask(app, st, loopId, '位移就是终点减起点，我今天有点累');
    await requestClose(app, loopId, 1);
    await confirmAndSettle(app, loopId);
    const f = await formations(app, loopId);
    expect(f).toHaveLength(1);
    // 作答那一行是学习者的行，M09 引它不会被拒
    expect(a.answerLine).toBeGreaterThan(0);
    expect(f[0]?.evidenceLines).toEqual([a.answerLine]);
    expect(f[0]?.quotes[0]?.text).toContain('终点减起点');
    const id = await assignGenerated(app, st, loopId).catch((e: unknown) => String(e));
    expect(id).toContain('布置失败'); // 闭环已结束，不能再布置
    expect(
      (await post(app, `/loops/${loopId}/practice/${a.taskId}/submit`, { text: '补一句' })).status,
    ).toBe(400);
  });
});
