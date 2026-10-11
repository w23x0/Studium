// 验收：M08 候选区（M08:31，M04-02:18,29，M09:33）。三种来源的候选放在一起看——M14 产出物标的、M09 去个人化提的、
// 学习者在知识点上提的；每条标“候选、未审”，记来源、模型、时间；候选不进 M08、不给教学用；候选可被审，
// 审计只追加，晋升不实现。只经 HTTP 验证（假模型）。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { AuditResponse } from '../../src/shared/m08-review.ts';
import type { Points08Response } from '../../src/shared/protocol.ts';
import { getJson, post, records } from '../helpers/http.ts';
import { createOutput, saveVersion } from '../helpers/outputs.ts';
import {
  candidates,
  finishLoop,
  startReviewApp,
  suggestFix,
  type ExtraM09Calls,
} from '../helpers/m08-review-flow.ts';
import { SAY } from '../helpers/evidence-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

async function read(app: App, rel: string): Promise<string> {
  return readFile(join(app.dataDir.root, 'knowledge', rel), 'utf8').catch((e: unknown) => {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw e;
  });
}

const POINT_CANDIDATE: ExtraM09Calls = (line) => [
  {
    name: 'propose_general_candidate',
    args: {
      kind: 'point',
      point_name: '位移的符号约定',
      point_sentence: '位移的正负只表示方向：沿正方向为正，与走了多远无关。',
      reason: '去掉这位学习者的说法后，这个约定对所有人都成立，M08 的“位移”一句里没有单独说',
      evidence_lines: [line],
    },
  },
  {
    name: 'propose_general_candidate',
    args: {
      kind: 'clause',
      clause_from: ['p-position', 'p-displacement'],
      clause_to: 'p-avg-velocity',
      clause_text: '先把位置差理解成有方向的量，再除以时间，平均速度的正负就直接来自位移的方向。',
      reason: '同一条路线对别的学习者也成立',
      evidence_lines: [line],
    },
  },
];

describe('M08 候选区', () => {
  it('三种来源放在一起：M14 标的、M09 去个人化提的、学习者提的；各记来源、模型、时间，都标“候选、未审”', async () => {
    const { app, mainId } = await startReviewApp({ extra: POINT_CANDIDATE });
    apps.push(app);
    expect(await candidates(app)).toEqual([]);

    // 来源一：M14 产出物上标的
    const out = await createOutput(app, mainId, {
      title: '位移笔记',
      kind: '笔记整理',
      text: 'v1',
    });
    await saveVersion(app, out.id, { text: 'v2' });
    await post(app, `/outputs/${out.id}/candidates`, {
      text: '“位移与路程”这节去掉例子后可作通用解释',
    });
    // 来源三：学习者在知识点上提
    await suggestFix(
      app,
      { kind: 'point', id: 'p-displacement' },
      '这里应该补上位移是矢量',
      'supplement',
    );
    // 来源二：写 M09 的会话提的
    const loopId = await finishLoop(app, mainId);

    const all = await candidates(app);
    expect(all.map((c) => c.source).sort()).toEqual(['learner', 'm09', 'm09', 'm14']);
    for (const c of all) {
      expect(c.status).toBe('候选、未审');
      expect(c.at).toMatch(/^\d{4}-\d\d-\d\dT/);
      expect(c.audits).toEqual([]);
      expect(c.correctedBy).toEqual([]);
    }

    const m14 = all.find((c) => c.source === 'm14');
    expect(m14).toMatchObject({
      kind: 'general_note',
      m14: { output: out.id, title: '位移笔记', version: 2 },
    });
    expect(m14?.model).toBeUndefined();

    const learner = all.find((c) => c.source === 'learner');
    expect(learner).toMatchObject({
      kind: 'supplement',
      text: '这里应该补上位移是矢量',
      target: { kind: 'point', id: 'p-displacement', name: '位移', found: true },
    });
    expect(learner?.model).toBeUndefined();

    const fromM09 = all.filter((c) => c.source === 'm09');
    const point = fromM09.find((c) => c.kind === 'new_point');
    expect(point).toMatchObject({
      model: 'fake-model-1',
      draft: { point: { name: '位移的符号约定' } },
      origin: { loopSessionId: loopId },
    });
    // 指回闭环里学习者的原话
    expect(point?.origin?.quotes.map((q) => q.text)).toEqual([SAY]);
    const clause = fromM09.find((c) => c.kind === 'new_clause');
    expect(clause?.draft?.clause).toMatchObject({ to: 'p-avg-velocity' });

    // 按来源、按对着的点筛
    expect((await candidates(app, '?source=learner')).map((c) => c.id)).toEqual([learner?.id]);
    expect((await candidates(app, '?target=point:p-displacement')).map((c) => c.source)).toEqual([
      'learner',
      'm09',
    ]);
    // 单条
    const one = await getJson<{ candidate: { id: string } }>(app, `/m08/candidates/${learner?.id}`);
    expect(one.candidate.id).toBe(learner?.id);
    expect((await post(app, '/m08/candidates/nope/audits', { verdict: '待定' })).status).toBe(404);
  });

  it('M09 去个人化候选：只存草稿、理由、指回闭环的行与模型，没有学习者个人信息字段；证据只能是学习者的行', async () => {
    const { app, mainId } = await startReviewApp({ extra: POINT_CANDIDATE });
    apps.push(app);
    const loopId = await finishLoop(app, mainId);

    const rows = (await read(app, 'm08-review/candidates.jsonl'))
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(Object.keys(r).sort()).toEqual(
        ['at', 'draft', 'id', 'kind', 'model', 'origin', 'source', 'status', 'text'].sort(),
      );
      expect(r.origin).toMatchObject({ loopSessionId: loopId });
    }
    // 工具那一侧的拒绝：写 M09 的会话里那次调用成功了，错误输入在核心里被拒（见下一个用例）
    const m09Sessions = (
      await getJson<{ sessions: { sessionId: string; kind: string }[] }>(app, '/sessions')
    ).sessions.filter((s) => s.kind === 'm09');
    const recs = await records(app, m09Sessions[0]?.sessionId ?? '');
    const calls = recs.filter(
      (r) => r.record.type === 'tool_call' && r.record.name === 'propose_general_candidate',
    );
    expect(calls).toHaveLength(2);
  });

  it('M09 提候选时的不合格输入被工具拒绝：证据不是学习者的行 / 子句的点 M08 里没有 / 草稿缺字段', async () => {
    const bad: ExtraM09Calls = (line) => [
      {
        name: 'propose_general_candidate',
        args: {
          kind: 'point',
          point_name: 'a',
          point_sentence: 'b',
          reason: 'r',
          evidence_lines: [1],
        },
      },
      {
        name: 'propose_general_candidate',
        args: {
          kind: 'clause',
          clause_from: ['p-不存在'],
          clause_to: 'p-displacement',
          clause_text: 't',
          reason: 'r',
          evidence_lines: [line],
        },
      },
      {
        name: 'propose_general_candidate',
        args: { kind: 'point', point_name: 'a', reason: 'r', evidence_lines: [line] },
      },
    ];
    const { app, mainId } = await startReviewApp({ extra: bad });
    apps.push(app);
    await finishLoop(app, mainId);
    expect(await candidates(app)).toEqual([]);
    const m09 = (
      await getJson<{ sessions: { sessionId: string; kind: string }[] }>(app, '/sessions')
    ).sessions.find((s) => s.kind === 'm09');
    const calls = (await records(app, m09?.sessionId ?? '')).flatMap((r) =>
      r.record.type === 'tool_call' && r.record.name === 'propose_general_candidate'
        ? [r.record]
        : [],
    );
    expect(calls.map((c) => c.isError)).toEqual([true, true, true]);
    expect(calls[0]?.result).toContain('不是学习者说的话');
    expect(calls[1]?.result).toContain('p-不存在');
  });

  it('候选不进 M08、不给教学用：M08 的点与子句不变，候选的名字搜不到，M08 文件一字不动', async () => {
    const { app, mainId } = await startReviewApp({ extra: POINT_CANDIDATE });
    apps.push(app);
    const before = [await read(app, 'm08/points.jsonl'), await read(app, 'm08/clauses.jsonl')];
    const pointsBefore = (await getJson<Points08Response>(app, '/m08/points')).points.length;
    await suggestFix(
      app,
      { kind: 'point', id: 'p-position' },
      '补一句坐标原点怎么选',
      'supplement',
    );
    await finishLoop(app, mainId);
    expect((await candidates(app)).length).toBeGreaterThan(0);

    const pts = (await getJson<Points08Response>(app, '/m08/points')).points;
    expect(pts).toHaveLength(pointsBefore);
    expect((await getJson<Points08Response>(app, '/m08/points?q=符号约定')).points).toEqual([]);
    expect([await read(app, 'm08/points.jsonl'), await read(app, 'm08/clauses.jsonl')]).toEqual(
      before,
    );
    // 教学会话（学习、守卫、M05、M10……）拿到的工具里没有候选区的东西
    for (const kind of ['loop', 'guard', 'm05', 'm10', 'main', 'talk', 'output'] as const) {
      const names = app.studium
        .kind(kind)
        .tools('x')
        .map((t) => t.name);
      expect(names).not.toContain('propose_general_candidate');
    }
    // 只有写 M09 的会话能提候选（而且只是提，不能写 M08）
    expect(
      app.studium
        .kind('m09')
        .tools('x')
        .map((t) => t.name),
    ).toContain('propose_general_candidate');
  });

  it('审计：学习者或模型审计记“看过、意见、建议晋升 / 不晋升 / 待定”，只追加；候选状态不变，没有晋升', async () => {
    const { app } = await startReviewApp();
    apps.push(app);
    const c = await suggestFix(
      app,
      { kind: 'point', id: 'p-displacement' },
      '定义里该写矢量',
      'fix',
    );

    const r1 = await post(app, `/m08/candidates/${c.id}/audits`, {
      opinion: '书里第 1 章确实把位移叫矢量',
      verdict: '建议晋升',
    });
    expect(r1.status).toBe(201);
    const a1 = ((await r1.json()) as AuditResponse).audit;
    expect(a1).toMatchObject({ candidate: c.id, by: '学习者', verdict: '建议晋升' });
    expect(a1.model).toBeUndefined();
    const raw1 = await read(app, 'm08-review/audits.jsonl');

    const r2 = await post(app, `/m08/candidates/${c.id}/audits`, {
      by: '模型审计',
      model: 'claude-test-1',
      opinion: '证据不够',
      verdict: '待定',
    });
    expect(r2.status).toBe(201);
    expect(((await r2.json()) as AuditResponse).audit).toMatchObject({
      by: '模型审计',
      model: 'claude-test-1',
    });
    // 旧行原样在前，新行追加在后
    const raw2 = await read(app, 'm08-review/audits.jsonl');
    expect(raw2.startsWith(raw1)).toBe(true);
    expect(raw2.trim().split('\n')).toHaveLength(2);

    const [after] = await candidates(app, `?source=learner`);
    expect(after?.audits.map((a) => a.verdict)).toEqual(['建议晋升', '待定']);
    expect(after?.verdict).toBe('待定'); // 最近一次的建议
    expect(after?.status).toBe('候选、未审'); // 审计不改状态：晋升规则还没定
    // M14 的候选一样可以审
    const { mainId } = { mainId: await app.studium.ensureMain() };
    const out = await createOutput(app, mainId, { title: 't', kind: '推导', text: 'x' });
    await post(app, `/outputs/${out.id}/candidates`, { text: '可作通用' });
    const m14 = (await candidates(app, '?source=m14'))[0];
    expect(
      (await post(app, `/m08/candidates/${m14?.id}/audits`, { verdict: '不晋升' })).status,
    ).toBe(201);
    expect((await candidates(app, '?source=m14'))[0]?.verdict).toBe('不晋升');
  });

  it('不合格的建议和审计被拒', async () => {
    const { app } = await startReviewApp();
    apps.push(app);
    const code = async (path: string, body: object): Promise<number> =>
      (await post(app, path, body)).status;
    const t = { kind: 'point' as const, id: 'p-displacement' };
    expect(await code('/m08/suggestions', { target: t, kind: 'fix', text: ' ' })).toBe(400);
    expect(await code('/m08/suggestions', { target: t, kind: 'other', text: 'x' })).toBe(400);
    expect(
      await code('/m08/suggestions', {
        target: { kind: 'point', id: 'p-没有' },
        kind: 'fix',
        text: 'x',
      }),
    ).toBe(404);
    expect(
      await code('/m08/suggestions', { target: { kind: 'zzz', id: 'x' }, kind: 'fix', text: 'x' }),
    ).toBe(400);
    const c = await suggestFix(app, t, '写错了');
    expect(await code(`/m08/candidates/${c.id}/audits`, { opinion: 'x' })).toBe(400);
    expect(await code(`/m08/candidates/${c.id}/audits`, { verdict: '晋升' })).toBe(400);
    expect(await code(`/m08/candidates/${c.id}/audits`, { by: '模型审计', verdict: '待定' })).toBe(
      400,
    );
    expect(await code(`/m08/candidates/${c.id}/audits`, { by: '机器人', verdict: '待定' })).toBe(
      400,
    );
    expect((await candidates(app))[0]?.audits).toEqual([]);
  });

  it('只追加，重启后候选和审计还在', async () => {
    const first = await startReviewApp();
    const c = await suggestFix(
      first.app,
      { kind: 'clause', id: 'c-disp-from-pos' },
      '子句里该补出发点',
    );
    await post(first.app, `/m08/candidates/${c.id}/audits`, { verdict: '待定', opinion: '再看看' });
    await first.app.close();

    const again = await startReviewApp({ dataRoot: first.dataRoot });
    apps.push(again.app);
    const list = await candidates(again.app);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: c.id, target: { kind: 'clause', id: 'c-disp-from-pos' } });
    expect(list[0]?.audits.map((a) => a.opinion)).toEqual(['再看看']);
  });
});
