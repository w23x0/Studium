// 验收：重新掌握与降档（M04:18,49 · M09:32）。只经 HTTP 验证，模型是假模型。
// - 教学侧在闭环里发现“以前会的现在答不出”，在诊断里记结构化条目（哪个点、依据行、怀疑遗忘 / 提取失败 / 状态原因）；
// - 写 M09 的会话读得到这些结构化条目（不读诊断全文）；可追加“提取失败 / 降档”记录指向旧记录，旧记录不改；
// - 提取失败 / 降档只能来自这类条目、须写明排除了状态侧解释，教学侧怀疑是状态原因的不记；
// - 复检合上后可追加“重新掌握”（只在复检闭环里）；当前视图按时间折叠得出每个点现在的档次。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeModel, FakeStep } from '../../src/core/model/fake.ts';
import type {
  LoopEvidenceResponse,
  PointViewDetailResponse,
  TimelineResponse,
} from '../../src/shared/protocol.ts';
import { DIAGNOSIS, confirmAndSettle, requestClose, settled } from '../helpers/evidence-flow.ts';
import { openLoop } from '../helpers/detour-flow.ts';
import { getJson, post, records } from '../helpers/http.ts';
import { learnerLine } from '../helpers/roles.ts';
import {
  advanceDays,
  DISPLACEMENT_SRC,
  AVG_OPTION,
  formations,
  hasTool,
  learnAndClose,
  newLong,
  startLong,
  type LongState,
} from '../helpers/longterm-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const FORGOT = '位移我又忘了，终点减起点是什么来着';
const own = (text: string): number => Number(/^\[第 (\d+) 行\]/.exec(text)?.[1] ?? 0);
const STRENGTH = { time: '仅当场', independence: '独立' } as const;

interface Plan {
  /** 教学侧怀疑的原因。 */
  suspicion: '遗忘' | '提取失败' | '状态原因';
  /** 写 M09 的会话要提交的时间版本记录（按顺序）；targets 里的 'F1' 换成第一条形成记录 id。 */
  timeline: (ctx: FakeContext, f1: string) => Record<string, unknown>[];
  f1?: string;
  level?: string;
}

/** 叠在默认应答上：教学侧听到 FORGOT 就记结构化条目；写 M09 的会话按 plan 提交。 */
function planOverride(st: LongState, plan: Plan): void {
  st.override = (ctx): FakeStep | undefined => {
    if (hasTool(ctx, 'note_regression') && ctx.input.text.includes('又忘了')) {
      return {
        calls: [
          { name: 'write_diagnosis', args: { text: DIAGNOSIS } },
          {
            name: 'note_regression',
            args: {
              point: 'p-displacement',
              observed: '以前的记录说位移会了，现在说不出终点减起点',
              basis_lines: [own(ctx.input.text)],
              suspicion: plan.suspicion,
              against: plan.f1 !== undefined ? [plan.f1] : [],
            },
          },
        ],
        text: '先回忆一下位移。',
      };
    }
    if (hasTool(ctx, 'write_formation_record') && ctx.input.role === 'program') {
      const line = learnerLine(ctx.input.text, '终点减起点');
      const avg = ctx.input.text.includes('p-avg-velocity');
      const timeline = hasTool(ctx, 'write_timeline_record')
        ? plan.timeline(ctx, plan.f1 ?? '').map((t) => ({
            name: 'write_timeline_record',
            args: { evidence_lines: [line], ...t },
          }))
        : [];
      return {
        calls: [
          {
            name: 'write_formation_record',
            args: {
              new_point: avg ? 'p-avg-velocity' : 'p-displacement',
              clause: avg ? 'c-avgv-from-disp' : 'c-disp-from-pos',
              start_points: [avg ? 'p-displacement' : 'p-position'],
              understanding: avg ? '平均速度是位移除以时间' : '位移只看起点终点',
              process: '自己说',
              unmet: '',
              new_point_evidence: STRENGTH,
              start_point_evidence: [{ point: avg ? 'p-displacement' : 'p-position', ...STRENGTH }],
              evidence_lines: [line],
              level: plan.level ?? '结构',
              summary: avg ? '平均速度＝位移÷时间' : '位移是起点到终点的变化',
              keywords: avg ? ['平均速度'] : ['位移', '矢量'],
            },
          },
          ...timeline,
        ],
      };
    }
    return undefined;
  };
}

/** 学位移（闭环 A，合上）→ 过 10 天 → 学平均速度（闭环 B），学习者说 FORGOT；返回 B 的会话 id 与 f1。 */
async function setup(st: LongState, plan: Plan) {
  planOverride(st, plan);
  const s = await startLong(st);
  apps.push(s.app);
  const a = await openLoop(s.app, s.mainId, 0);
  await learnAndClose(s.app, a.loopId);
  const f1 = (await formations(s.app, a.loopId))[0];
  if (f1 === undefined) throw new Error('位移的形成记录没写成');
  plan.f1 = f1.id;
  advanceDays(st, 10);
  const b = await openLoop(s.app, s.mainId, 1);
  await post(s.app, `/sessions/${b.loopId}/messages`, { text: FORGOT });
  await settled(s.app, b.loopId);
  return { ...s, f1, loopA: a.loopId, loopB: b.loopId };
}

async function closeB(app: App, loopId: string): Promise<void> {
  await requestClose(app, loopId, 1);
  await confirmAndSettle(app, loopId);
}

/** 写 M09 的会话里，开场里含这句学习者的话的那一份。 */
const m09Opening = (fake: FakeModel, said: string): string =>
  fake.inputs.find(
    (i) => i.spec.tools.some((t) => t.name === 'write_formation_record') && i.text.includes(said),
  )?.text ?? '';

describe('降档', () => {
  it('结构化条目进诊断；写 M09 的会话读到条目（不读诊断全文）并追加降档记录，旧记录不改', async () => {
    const st = newLong();
    const plan: Plan = {
      suspicion: '提取失败',
      timeline: (_c, f1) => [
        {
          kind: '降档',
          point: 'p-displacement',
          targets: [f1],
          reason: '十天后说不出终点减起点',
          level: '复现',
          state_ruled_out: '学习者没提疲劳，M15 没有相关状态记录',
        },
      ],
    };
    const { app, fake, f1, loopB } = await setup(st, plan);
    const before = JSON.stringify((await formations(app)).filter((r) => r.id === f1.id));

    // 诊断里有结构化条目：哪个点、依据行（学习者原话）、怀疑
    const ev = await getJson<LoopEvidenceResponse>(app, `/loops/${loopB}/evidence`);
    const reg = ev.loop.diagnoses.find((d) => d.regression !== undefined)?.regression;
    expect(reg).toMatchObject({
      point: { id: 'p-displacement', name: '位移' },
      suspicion: '提取失败',
      against: [f1.id],
    });
    const said = (await records(app, loopB)).find(
      (r) => r.record.type === 'user_message' && r.record.text === FORGOT,
    );
    expect(reg?.basisLines).toEqual([said?.line]);

    await closeB(app, loopB);

    // 写 M09 的会话读到结构化条目，读不到诊断全文
    const opening = m09Opening(fake, FORGOT);
    expect(opening).toContain('结构化条目');
    expect(opening).toContain('怀疑：提取失败');
    expect(opening).toContain(`针对旧记录：${f1.id}`);
    expect(opening).toContain(FORGOT);
    expect(opening).not.toContain(DIAGNOSIS);

    // 追加的降档记录指向旧记录，旧记录一字未改
    const tl = (await getJson<TimelineResponse>(app, '/m09/timeline')).records;
    expect(tl).toHaveLength(1);
    expect(tl[0]).toMatchObject({
      kind: '降档',
      point: { id: 'p-displacement' },
      loopSessionId: loopB,
      targets: [f1.id],
      level: '复现',
    });
    expect(tl[0]?.stateRuledOut).toContain('没有相关状态记录');
    const after = await formations(app);
    expect(JSON.stringify(after.filter((r) => r.id === f1.id))).toBe(before);

    // 当前视图按时间折叠：位移降到“复现”，状态降档
    const view = await getJson<PointViewDetailResponse>(app, '/m09/view/p-displacement');
    expect(view.entry).toMatchObject({ level: '复现', status: '降档' });
    expect(view.entry.timeline.map((t) => t.kind)).toEqual(['降档']);
    expect(view.timeline).toHaveLength(1);
  });

  it('教学侧怀疑是状态原因、没有写明排除状态解释、进行中没发现过的点，都不能记提取失败 / 降档', async () => {
    const st = newLong();
    const plan: Plan = {
      suspicion: '状态原因',
      timeline: (_c, f1) => [
        {
          kind: '降档',
          point: 'p-displacement',
          targets: [f1],
          reason: '说不出',
          level: '复现',
          state_ruled_out: '没排除',
        },
        { kind: '提取失败', point: 'p-displacement', targets: [f1], reason: '说不出' },
        {
          kind: '提取失败',
          point: 'p-position',
          targets: [f1],
          reason: '没人报过',
          state_ruled_out: '无',
        },
      ],
    };
    const { app, loopB } = await setup(st, plan);
    await closeB(app, loopB);
    expect((await getJson<TimelineResponse>(app, '/m09/timeline')).records).toHaveLength(0);
    const m09 = (
      await getJson<{ sessions: { sessionId: string; kind: string; parent?: string }[] }>(
        app,
        '/sessions',
      )
    ).sessions.find((s) => s.kind === 'm09' && s.parent === loopB);
    const results = (await records(app, m09?.sessionId ?? ''))
      .flatMap((r) => (r.record.type === 'tool_call' ? [r.record] : []))
      .filter((c) => c.name === 'write_timeline_record');
    expect(results).toHaveLength(3);
    expect(results.every((c) => c.isError)).toBe(true);
    expect(results[0]?.result).toContain('状态原因');
    expect(results[1]?.result).toContain('state_ruled_out');
    expect(results[2]?.result).toContain('没有记过点 p-position');
  });

  it('M09 里没有记录的点不算“以前会的”：记结构化条目被退回，改用前置缺口', async () => {
    const st = newLong();
    const s = await startLong(st);
    apps.push(s.app);
    st.override = (ctx) =>
      hasTool(ctx, 'note_regression') && ctx.input.text.includes('又忘了')
        ? {
            calls: [
              {
                name: 'note_regression',
                args: {
                  point: 'p-displacement',
                  observed: 'x',
                  basis_lines: [own(ctx.input.text)],
                  suspicion: '遗忘',
                },
              },
            ],
          }
        : undefined;
    const { loopId } = await openLoop(s.app, s.mainId, 0);
    await post(s.app, `/sessions/${loopId}/messages`, { text: FORGOT });
    await settled(s.app, loopId);
    const call = (await records(s.app, loopId))
      .flatMap((r) => (r.record.type === 'tool_call' ? [r.record] : []))
      .find((c) => c.name === 'note_regression');
    expect(call?.isError).toBe(true);
    expect(call?.result).toContain('request_detour');
    expect((await records(s.app, loopId)).some((r) => r.record.type === 'loop_note')).toBe(false);
  });
});

describe('重新掌握', () => {
  it('降档之后复检合上，追加“重新掌握”；只能来自复检闭环；视图按时间折叠', async () => {
    const st = newLong();
    const plan: Plan = {
      suspicion: '提取失败',
      timeline: (ctx, f1) => {
        // 第一次（闭环 B）：降档；之后复检闭环：重新掌握，指向开场里的降档记录
        const tl = /\btl-[0-9a-f]{8}\b/.exec(ctx.input.text)?.[0];
        return tl === undefined
          ? [
              {
                kind: '降档',
                point: 'p-displacement',
                targets: [f1],
                reason: '说不出',
                level: '复现',
                state_ruled_out: '无状态记录',
              },
            ]
          : [
              {
                kind: '重新掌握',
                point: 'p-displacement',
                targets: [tl],
                reason: '复检里独立说清了',
                level: '结构',
              },
            ];
      },
    };
    const { app, mainId, f1, loopB } = await setup(st, plan);
    await closeB(app, loopB);
    const down = (await getJson<TimelineResponse>(app, '/m09/timeline')).records[0];
    expect(down?.kind).toBe('降档');

    // M05 回头复检位移（指向 f1）
    advanceDays(st, 15);
    const prior = st.override;
    st.override = (ctx) => {
      if (hasTool(ctx, 'submit_choice_card')) {
        return {
          calls: [
            {
              name: 'submit_choice_card',
              args: {
                options: [
                  { ...DISPLACEMENT_SRC, revisit: { kind: '复检', formation_ids: [f1.id] } },
                  AVG_OPTION,
                ],
                recommended: 0,
              },
            },
          ],
        };
      }
      return prior?.(ctx);
    };
    const c = await openLoop(app, mainId, 0);
    await learnAndClose(app, c.loopId);

    const tl = (await getJson<TimelineResponse>(app, '/m09/timeline')).records;
    expect(tl.map((t) => t.kind)).toEqual(['降档', '重新掌握']);
    expect(tl[1]).toMatchObject({ loopSessionId: c.loopId, targets: [down?.id], level: '结构' });
    const view = await getJson<PointViewDetailResponse>(app, '/m09/view/p-displacement');
    expect(view.entry).toMatchObject({ level: '结构', status: '重新掌握' });
    expect(view.entry.lastEvidence).toMatchObject({ loopSessionId: c.loopId, revisit: '复检' });

    // 不是复检闭环的，记“重新掌握”被退回（再学一遍平均速度，试图记位移的重新掌握）
    st.override = (ctx) => {
      const step = prior?.(ctx);
      if (!hasTool(ctx, 'write_timeline_record') || ctx.input.role !== 'program') return step;
      return {
        calls: [
          ...(step?.calls ?? []),
          {
            name: 'write_timeline_record',
            args: {
              kind: '重新掌握',
              point: 'p-displacement',
              targets: [down?.id],
              reason: '不该记',
              evidence_lines: [learnerLine(ctx.input.text, '终点减起点')],
            },
          },
        ],
      };
    };
    const d = await openLoop(app, mainId, 1);
    await learnAndClose(app, d.loopId);
    expect((await getJson<TimelineResponse>(app, '/m09/timeline')).records).toHaveLength(2);
  });
});
