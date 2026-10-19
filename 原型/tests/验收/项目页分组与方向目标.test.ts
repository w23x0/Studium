// 验收（W6）：项目页（照 Claude 项目 Overview）——学习按 进行中 · 合上 · 没合上（停车场 = 没合上那些的上层，
// 从 /api/learned 读）分组；方向目标显示结构（目标能力与每块理由、学习者确认的理由、顺序参考、“临时”），
// 只有一句话的旧记录照旧显示（docs/设计/记录/方向目标.md「内容」；记录/单子与路线.md「没合上那次的上层」）。
// 纯函数：src/ui/learned-model.ts 的 projectGroups、src/ui/goal-model.ts 的 goalRows（W6 新建）；接口：概览带 goalView。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { LogRecord } from '../../src/shared/records.ts';
import { goalRows } from '../../src/ui/goal-model.ts';
import { projectGroups } from '../../src/ui/learned-model.ts';
import { boot, getOk, newFlow, type Loose } from './共用/w6-flow.ts';

type LearningsArg = Parameters<typeof projectGroups>[0];
type GoalArg = Parameters<typeof goalRows>[0];

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const base = {
  ticket: { newPoint: 'x', clause: 'y', startPoints: [], routeAction: '继续主线', sourceCheck: [] },
};
const learnings = [
  {
    ...base,
    loopId: 'A',
    title: '位移',
    openedAt: '2026-10-10T08:00:00Z',
    endedAt: '2026-10-10T09:00:00Z',
    status: '合上',
  },
  {
    ...base,
    loopId: 'B',
    title: '平均速度',
    openedAt: '2026-10-11T08:00:00Z',
    endedAt: '2026-10-11T08:30:00Z',
    status: '没合上',
    endNote: '先到这',
    routeDecision: { line: 30, decision: '先补位移的正负', reason: '缺在出发点' },
  },
  { ...base, loopId: 'C', title: '瞬时速度', openedAt: '2026-10-12T08:00:00Z', status: '进行中' },
  { ...base, loopId: 'D', title: '加速度', openedAt: '2026-10-13T08:00:00Z', status: '进行中' },
  {
    ...base,
    loopId: 'E',
    title: '路程',
    openedAt: '2026-10-09T08:00:00Z',
    endedAt: '2026-10-09T08:10:00Z',
    status: '没合上',
    endNote: '想先学别的',
  },
] as unknown as LearningsArg;

const INTERNAL = ['闭环', '方向目标', '出发点', '子句', '新点', '单子', 'M0', 'M1'];

describe('项目页', () => {
  it('学习按 进行中 · 合上 · 没合上 分组；没合上那些带上层（结束原话、路线决定）；搁置的在进行中里标出', () => {
    const g = projectGroups(learnings, ['C']);
    expect(
      g.inProgress.map((r) => r.loopId),
      '进行中（新的在前）',
    ).toEqual(['D', 'C']);
    expect(g.inProgress.find((r) => r.loopId === 'C')?.shelved, '搁置着的标出来').toBe(true);
    expect(
      g.closed.map((r) => r.loopId),
      '合上',
    ).toEqual(['A']);
    expect(
      g.unclosed.map((r) => r.loopId),
      '没合上 = 停车场（新的在前）',
    ).toEqual(['B', 'E']);
    expect(g.unclosed[0]).toMatchObject({
      title: '平均速度',
      endNote: '先到这',
      routeDecision: { line: 30, decision: '先补位移的正负', reason: '缺在出发点' },
    });
    expect(g.unclosed[1]?.routeDecision, '还没出路线决定的就没有').toBeUndefined();
    expect(Object.keys(g).sort(), '只有这三组（等你选另从概览的卡来）').toEqual([
      'closed',
      'inProgress',
      'unclosed',
    ]);
  });

  it('方向目标：结构化的逐块显示能力与理由、确认理由、顺序参考、临时；旧记录只显示那句话', () => {
    const structured = {
      line: 9,
      at: '2026-10-10T08:00:00Z',
      text: '能推导匀变速运动；能看懂 x–t 图',
      title: '力学入门',
      abilities: [
        { ability: '能推导匀变速运动', reason: '期末要考', confirmedReason: '我想自己推一遍' },
        { ability: '能看懂 x–t 图', reason: '后面都要用' },
      ],
      orderHint: '先图像后推导',
      deadline: '2026-12-20',
      provisional: true,
    } as unknown as GoalArg;
    const rows = goalRows(structured);
    expect(
      rows.map((r) => r.kind),
      '行的顺序',
    ).toEqual(['title', 'ability', 'ability', 'orderHint', 'provisional']);
    expect(rows[1]).toMatchObject({
      text: '能推导匀变速运动',
      reason: '期末要考',
      confirmedReason: '我想自己推一遍',
    });
    expect(rows[2]?.confirmedReason, '学习者没说确认理由就不编').toBeUndefined();
    expect(rows[3]?.text).toBe('先图像后推导');
    expect(rows[4]?.text ?? '', '冷启动的临时版标“临时”').toContain('临时');

    const old = {
      line: 3,
      at: '2026-10-01T08:00:00Z',
      text: '学力学，能自己推导',
    } as unknown as GoalArg;
    expect(goalRows(old), '只有一句话的旧记录照旧显示').toMatchObject([
      { kind: 'text', text: '学力学，能自己推导' },
    ]);
    expect(goalRows(undefined), '还没有方向').toEqual([]);
    const shown = [...rows, ...goalRows(old)].flatMap((r) => [
      r.label,
      r.kind === 'provisional' ? r.text : '',
    ]);
    expect(
      shown.filter((t) => INTERNAL.some((w) => t.includes(w))),
      '栏名不露内部词',
    ).toEqual([]);
  });

  it('概览带当前方向目标的结构（最后一条为准），一句话照旧在 goal', async () => {
    const { app, mainId } = await boot(newFlow());
    apps.push(app);
    await app.hub.record(mainId, {
      type: 'project_goal',
      at: new Date().toISOString(),
      text: '学力学',
    } as unknown as LogRecord);
    let o = (await getOk<{ overview: Loose }>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.goalView, '旧形状：只有那句话').toMatchObject({ text: '学力学' });
    expect((o.goalView as Loose).abilities, '旧形状没有能力').toBeUndefined();

    const line = await app.hub.record(mainId, {
      type: 'project_goal',
      at: new Date().toISOString(),
      text: '能推导匀变速运动',
      title: '力学入门',
      abilities: [{ ability: '能推导匀变速运动', reason: '期末要考' }],
      orderHint: '先图像后推导',
      provisional: true,
    } as unknown as LogRecord);
    o = (await getOk<{ overview: Loose }>(app, `/projects/${mainId}/overview`)).overview;
    expect(o.goal, '一句话照旧').toBe('能推导匀变速运动');
    expect(o.goalView, '结构化的当前方向目标，带它在项目对话里的行号').toMatchObject({
      line,
      text: '能推导匀变速运动',
      title: '力学入门',
      abilities: [{ ability: '能推导匀变速运动', reason: '期末要考' }],
      orderHint: '先图像后推导',
      provisional: true,
    });
  });
});
