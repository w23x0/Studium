// 验收：重复错误升级为模式（M03:17），跨闭环。只经 HTTP 验证，模型是假模型。
// - 练习反馈里可记错误类型（短名 + 一句话 + 指回学习者的原话行）；
// - 同一类错误出现在 >= 2 个闭环里才算模式；同一个闭环里重复不算；
// - 下一个相关闭环（单子里的点和那些错误涉及的点有交）开场给“以前出现过的错误模式”，只给事实与出处；
// - 错误的依据行只能是学习者的话。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { ErrorPatternsResponse } from '../../src/shared/protocol.ts';
import { getJson } from '../helpers/http.ts';
import { startLong } from '../helpers/longterm-flow.ts';
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

const MIX = '把位移当成路程';

async function start() {
  const st = newPractice();
  const s = await startPractice(st);
  apps.push(s.app);
  return { st, ...s };
}

const patterns = (app: App, q = '') =>
  getJson<ErrorPatternsResponse>(app, `/practice/error-patterns${q}`);

describe('重复错误成模式', () => {
  it('反馈里记的错误：指回学习者的原话行；依据不是学习者的行就拒绝', async () => {
    const { app, st, mainId } = await start();
    const { loopId } = await openLoop(app, mainId, 0);
    const id = await assignGenerated(app, st, loopId);
    await submitText(app, st, loopId, id, '位移是 7 米', { text: '收到。' });
    const bad = await teach(
      app,
      st,
      loopId,
      feedbackStep(id, { errors: [{ label: MIX, detail: '加起来了', lines: [1] }] }),
      '嗯',
    );
    expect(bad[0]?.isError).toBe(true);
    expect((await patterns(app)).others).toHaveLength(0);
  });

  it('同一个闭环里重复不算模式；跨两个闭环出现才是模式，原话与出处都带上', async () => {
    const { app, st, mainId } = await start();
    const a = await openLoop(app, mainId, 0);
    const first = await runTask(app, st, a.loopId, '位移是 7 米', [
      { label: MIX, detail: '把来回都加了' },
    ]);
    await runTask(app, st, a.loopId, '路程 7 米就是位移', [
      { label: MIX, detail: '又把路程当位移' },
    ]);
    let p = await patterns(app);
    expect(p.patterns).toHaveLength(0);
    expect(p.others).toHaveLength(1);
    expect(p.others[0]).toMatchObject({ label: MIX, loops: 1 });
    expect(p.others[0]?.occurrences).toHaveLength(2);

    const b = await openLoop(app, mainId, 0);
    const second = await runTask(app, st, b.loopId, '7 米', [
      { label: ` ${MIX} `, detail: '这次也是加起来' },
    ]);
    p = await patterns(app);
    expect(p.patterns).toHaveLength(1);
    const pat = p.patterns[0];
    expect(pat).toMatchObject({ label: MIX, loops: 2 });
    expect(pat?.occurrences).toHaveLength(3);
    const lastOcc = pat?.occurrences.at(-1);
    expect(lastOcc).toMatchObject({ loopSessionId: b.loopId, detail: '这次也是加起来' });
    expect(lastOcc?.lines).toEqual([{ line: second.answerLine, text: '7 米' }]);
    expect(pat?.occurrences[0]?.lines[0]).toMatchObject({
      line: first.answerLine,
      text: '位移是 7 米',
    });
    expect(lastOcc?.points.map((x) => x.id)).toContain('p-displacement');
    // 按点筛
    expect((await patterns(app, '?point=p-displacement')).patterns).toHaveLength(1);
    expect((await patterns(app, '?point=p-newton2')).patterns).toHaveLength(0);
  });

  it('下一个相关闭环开场给错误模式（事实与出处，不下结论）；无关的闭环、还不是模式的不给', async () => {
    const { app, st, mainId, fake } = await start();
    const a = await openLoop(app, mainId, 0);
    await runTask(app, st, a.loopId, '位移是 7 米', [{ label: MIX, detail: '把来回都加了' }]);
    // 只出现在一个闭环里：还不是模式，相关闭环的开场不提
    const b0 = await openLoop(app, mainId, 1);
    let opening = fake.inputs.filter((i) => i.text.includes('本闭环的单子')).at(-1)?.text ?? '';
    expect(opening).not.toContain('错误模式');
    // 第二个闭环里又出现 → 成模式
    const b = await openLoop(app, mainId, 0);
    await runTask(app, st, b.loopId, '7 米', [{ label: MIX, detail: '又是加起来' }]);
    expect(b0.loopId).not.toBe(b.loopId);

    // 相关：平均速度的出发点是位移
    const c = await openLoop(app, mainId, 1);
    opening = fake.inputs.filter((i) => i.text.includes('本闭环的单子')).at(-1)?.text ?? '';
    expect(opening).toContain('以前练习的反馈里记过的错误模式');
    expect(opening).toContain(`「${MIX}」在 2 个学习任务里出现过`);
    expect(opening).toContain(`会话 ${a.loopId}`);
    expect(opening).toContain(`会话 ${b.loopId}`);
    expect(opening).toContain('不是对学习者的结论');
    expect(c.loopId).toBeTruthy();
    // 无关：牛顿第二定律（力 / 质量 / 加速度）和位移没有交
    await openLoop(app, mainId, 2);
    opening = fake.inputs.filter((i) => i.text.includes('本闭环的单子')).at(-1)?.text ?? '';
    expect(opening).not.toContain('错误模式');
  });

  it('错误类型名的格式差（空白、标点、大小写）合并；教学侧反馈后能看到已有的名字，沿用同一个', async () => {
    const { app, st, mainId } = await start();
    const a = await openLoop(app, mainId, 0);
    await runTask(app, st, a.loopId, '位移是 7 米', [{ label: 'Mix-up 路程/位移', detail: '一' }]);
    const b = await openLoop(app, mainId, 0);
    const id = await assignGenerated(app, st, b.loopId);
    await submitText(app, st, b.loopId, id, '7 米', { text: '收到。' });
    const line =
      (
        await getJson<{ task: { submissions: { lines: { line: number }[] }[] } }>(
          app,
          `/loops/${b.loopId}/practice/${id}`,
        )
      ).task.submissions[0]?.lines[0]?.line ?? 0;
    const rows = await teach(
      app,
      st,
      b.loopId,
      {
        calls: [
          {
            name: 'give_practice_feedback',
            args: {
              task_id: id,
              text: '路程和位移要分开。',
              errors: [{ label: 'mixup 路程 位移', detail: '二', lines: [line] }],
            },
          },
        ],
      },
      '嗯',
    );
    expect(rows[0]?.result).toContain('已有错误类型名');
    expect(rows[0]?.result).toContain('「Mix-up 路程/位移」');
    const p = await patterns(app);
    expect(p.patterns).toHaveLength(1);
    expect(p.patterns[0]?.loops).toBe(2);
  });

  it('错误模式随记录存活：重启后从正本重建，相关闭环的开场照样给', async () => {
    const { app, st, mainId, dataRoot } = await start();
    const a = await openLoop(app, mainId, 0);
    await runTask(app, st, a.loopId, '位移是 7 米', [{ label: MIX, detail: '一' }]);
    const b = await openLoop(app, mainId, 0);
    await runTask(app, st, b.loopId, '7 米', [{ label: MIX, detail: '二' }]);
    await app.close();
    apps.splice(apps.indexOf(app), 1);

    const again = await startLong(st, dataRoot);
    apps.push(again.app);
    expect((await patterns(again.app)).patterns).toHaveLength(1);
    await openLoop(again.app, again.mainId, 1);
    const opening =
      again.fake.inputs.filter((i) => i.text.includes('本闭环的单子')).at(-1)?.text ?? '';
    expect(opening).toContain(`「${MIX}」在 2 个学习任务里出现过`);
  });
});
