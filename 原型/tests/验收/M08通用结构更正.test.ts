// 验收：M08 通用结构的更正与版本（M08:32，M04-02:24）。对 M08 点 / 子句的更正只追加记在自己的更正层；
// 读侧把更正叠加显示（已更正，原文是……，可看历史），不改资料线产出文件；教学侧读到更正后的版本；更正要有依据。
// 只经 HTTP 验证（假模型）。
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { TargetReviewResponse } from '../../src/shared/m08-review.ts';
import type {
  Clause08Response,
  Point08Response,
  Points08Response,
} from '../../src/shared/protocol.ts';
import { getJson, post, records } from '../helpers/http.ts';
import {
  correct,
  correctionsOf,
  finishLoop,
  startReviewApp,
  suggestFix,
} from '../helpers/m08-review-flow.ts';

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

const POINT = { kind: 'point', id: 'p-displacement' } as const;
const NEW_SENTENCE =
  '一段时间内位置的变化量 Δx = x(t₂) − x(t₁)，是有方向的量（矢量），与路程不同。';

/** 提一条“该改”的建议并审计为建议采纳，返回候选 id。 */
async function reviewedFix(app: App, text = '位移该写成矢量'): Promise<string> {
  const c = await suggestFix(app, POINT, text, 'fix');
  const res = await post(app, `/m08/candidates/${c.id}/audits`, {
    opinion: '核对过书，对',
    verdict: '建议晋升',
  });
  expect(res.status).toBe(201);
  return c.id;
}

describe('M08 通用结构更正', () => {
  it('经复核的建议可据此更正：读侧显示更正后的，标“已更正”和原文，能看历史；资料线文件一字不动', async () => {
    const { app } = await startReviewApp();
    apps.push(app);
    const beforeFiles = [await read(app, 'm08/points.jsonl'), await read(app, 'm08/clauses.jsonl')];
    const original = (await getJson<Point08Response>(app, `/m08/points/${POINT.id}`)).point;
    expect(original.correction).toBeUndefined();

    const candidate = await reviewedFix(app);
    const made = await correct(app, {
      target: POINT,
      fields: { sentence: NEW_SENTENCE },
      reason: '书里位移是矢量，原来这句漏了',
      basis: { kind: 'candidate', id: candidate },
    });
    expect(made).toMatchObject({
      target: POINT,
      targetName: '位移',
      fields: { sentence: NEW_SENTENCE },
      before: { sentence: original.sentence },
      basis: { kind: 'candidate', id: candidate },
      stale: false,
    });
    expect(made.id).toMatch(/^m8x-/);

    // 读侧：点本身是更正后的，带更正标记，原文留着
    const view = (await getJson<Point08Response>(app, `/m08/points/${POINT.id}`)).point;
    expect(view.sentence).toBe(NEW_SENTENCE);
    expect(view.name).toBe('位移');
    expect(view.correction).toMatchObject({ count: 1, original: { sentence: original.sentence } });
    const listed = (await getJson<Points08Response>(app, '/m08/points')).points.find(
      (p) => p.id === POINT.id,
    );
    expect(listed?.sentence).toBe(NEW_SENTENCE);
    expect(listed?.correction?.count).toBe(1);
    // 别的点没被动
    expect(
      (await getJson<Point08Response>(app, '/m08/points/p-position')).point.correction,
    ).toBeUndefined();

    // 候选被当依据后，在候选视图里能看到据它做过的更正
    const cand = (
      await getJson<{ candidate: { correctedBy: string[] } }>(app, `/m08/candidates/${candidate}`)
    ).candidate;
    expect(cand.correctedBy).toEqual([made.id]);

    // 历史：再更正一次，两条都在，原文仍是资料里最初的那句
    const again = await correct(app, {
      target: POINT,
      fields: { sentence: `${NEW_SENTENCE}（符号表示方向）`, name: '位移（矢量）' },
      reason: '再补一句',
      basis: { kind: 'candidate', id: candidate },
    });
    expect(again.before).toMatchObject({ sentence: NEW_SENTENCE, name: '位移' });
    const history = await correctionsOf(app, `?target=point:${POINT.id}`);
    expect(history.map((c) => c.id)).toEqual([made.id, again.id]);
    const v2 = (await getJson<Point08Response>(app, `/m08/points/${POINT.id}`)).point;
    expect(v2.name).toBe('位移（矢量）');
    expect(v2.correction).toMatchObject({
      count: 2,
      original: { sentence: original.sentence, name: '位移' },
    });
    expect(await correctionsOf(app, '?target=point:p-position')).toEqual([]);
    expect((await correctionsOf(app)).length).toBe(2);

    // 知识点面板用的一次读：候选 + 更正历史
    const review = await getJson<TargetReviewResponse>(app, `/m08/review?target=point:${POINT.id}`);
    expect(review.corrections).toHaveLength(2);
    expect(review.candidates.map((c) => c.id)).toEqual([candidate]);

    // 资料线产出文件不动；更正只追加记在自己的层里
    expect([await read(app, 'm08/points.jsonl'), await read(app, 'm08/clauses.jsonl')]).toEqual(
      beforeFiles,
    );
    expect((await read(app, 'm08-review/corrections.jsonl')).trim().split('\n')).toHaveLength(2);
  });

  it('子句也能更正：改文字或出发点；被更正的子句标了更正', async () => {
    const { app } = await startReviewApp();
    apps.push(app);
    const c = await suggestFix(
      app,
      { kind: 'clause', id: 'c-avgv-from-disp' },
      '子句漏了位置',
      'fix',
    );
    await post(app, `/m08/candidates/${c.id}/audits`, { verdict: '建议晋升' });
    const clause = (await getJson<Clause08Response>(app, '/m08/clauses/c-avgv-from-disp')).clause;
    await correct(app, {
      target: { kind: 'clause', id: 'c-avgv-from-disp' },
      fields: {
        text: '用位移（有方向）除以时间得到平均速度。',
        from: ['p-displacement', 'p-position'],
      },
      reason: '补出发点',
      basis: { kind: 'candidate', id: c.id },
    });
    const after = (await getJson<Clause08Response>(app, '/m08/clauses/c-avgv-from-disp')).clause;
    expect(after.text).toBe('用位移（有方向）除以时间得到平均速度。');
    expect(after.from.map((f) => f.id)).toEqual(['p-displacement', 'p-position']);
    expect(after.correction).toMatchObject({
      count: 1,
      original: { text: clause.text, from: ['p-displacement'] },
    });
    // 进入 / 离开子句的关系跟着走：位置现在也是平均速度子句的出发点
    const pos = await getJson<Point08Response>(app, '/m08/points/p-position');
    expect(pos.from.map((x) => x.id)).toContain('c-avgv-from-disp');
  });

  it('没有依据不能更正：没审的建议 / 审计不建议采纳 / 建议不是对这个对象提的 / 资料报错没碰到锚点', async () => {
    const { app } = await startReviewApp();
    apps.push(app);
    const fix = { fields: { sentence: NEW_SENTENCE }, reason: '改', target: POINT };
    const status = async (basis: object): Promise<number> =>
      (await post(app, '/m08/corrections', { ...fix, basis })).status;

    const raw = await suggestFix(app, POINT, '该改', 'fix');
    expect(await status({ kind: 'candidate', id: raw.id })).toBe(400); // 没审过
    await post(app, `/m08/candidates/${raw.id}/audits`, { verdict: '不晋升' });
    expect(await status({ kind: 'candidate', id: raw.id })).toBe(400); // 审了不建议
    const sup = await suggestFix(app, POINT, '该补', 'supplement');
    await post(app, `/m08/candidates/${sup.id}/audits`, { verdict: '建议晋升' });
    expect(await status({ kind: 'candidate', id: sup.id })).toBe(400); // “该补”不是“该改”
    const other = await suggestFix(app, { kind: 'point', id: 'p-position' }, '改位置', 'fix');
    await post(app, `/m08/candidates/${other.id}/audits`, { verdict: '建议晋升' });
    expect(await status({ kind: 'candidate', id: other.id })).toBe(400); // 对别的点提的
    expect(await status({ kind: 'candidate', id: 'nope' })).toBe(400);
    expect(await status({})).toBe(400);
    expect(await status({ kind: 'source_report', id: 'nope' })).toBe(404);

    // 资料报错：别的小节 / 行段没盖到锚点
    const miss = await post(app, '/library/reports', {
      book: '力学入门样例',
      file: 'ch01/sec-1.2.md',
      from: 1,
      text: '别处的错',
    });
    const missId = ((await miss.json()) as { report: { id: string } }).report.id;
    expect(await status({ kind: 'source_report', id: missId })).toBe(400);
    expect(await correctionsOf(app)).toEqual([]);
    expect(
      (await getJson<Point08Response>(app, `/m08/points/${POINT.id}`)).point.correction,
    ).toBeUndefined();
  });

  it('资料报错涉及锚点也是依据；知识点面板的一次读里列出涉及它原文的资料报错', async () => {
    const { app } = await startReviewApp();
    apps.push(app);
    // “位移”的锚点在 ch01/sec-1.1.md 第 5 行
    const res = await post(app, '/library/reports', {
      book: '力学入门样例',
      file: 'ch01/sec-1.1.md',
      from: 5,
      to: 5,
      kind: '转录错',
      text: '这一行“位移”的说法转录错了',
    });
    const report = ((await res.json()) as { report: { id: string } }).report;
    const review = await getJson<TargetReviewResponse>(app, `/m08/review?target=point:${POINT.id}`);
    expect(review.reports.map((r) => r.id)).toEqual([report.id]);
    expect(
      (await getJson<TargetReviewResponse>(app, '/m08/review?target=point:p-position')).reports.map(
        (r) => r.id,
      ),
    ).toEqual([]);

    const made = await correct(app, {
      target: POINT,
      fields: { sentence: NEW_SENTENCE },
      reason: '资料这一行转录错，句子跟着错',
      basis: { kind: 'source_report', id: report.id },
    });
    expect(made.basis).toEqual({ kind: 'source_report', id: report.id });
  });

  it('不合格的更正被拒：字段不认识（来源、锚点不由更正改）/ 没改 / 空 / 出发点或新点 M08 里没有 / 目标不存在', async () => {
    const { app } = await startReviewApp();
    apps.push(app);
    const id = await reviewedFix(app);
    const basis = { kind: 'candidate', id };
    const code = async (body: object): Promise<number> =>
      (await post(app, '/m08/corrections', { reason: '改', basis, target: POINT, ...body })).status;
    expect(await code({ fields: { source: '书给的' } })).toBe(400);
    expect(await code({ fields: { anchors: [] } })).toBe(400);
    expect(await code({ fields: { text: '子句才有' } })).toBe(400); // 点没有 text 字段
    const current = (await getJson<Point08Response>(app, `/m08/points/${POINT.id}`)).point.sentence;
    expect(await code({ fields: { sentence: current } })).toBe(400); // 和现在一样
    expect(await code({ fields: {} })).toBe(400);
    expect(await code({ fields: { sentence: '  ' } })).toBe(400);
    expect(await code({ fields: { sentence: 'x' }, reason: ' ' })).toBe(400);
    expect(await code({ fields: { threshold: 'yes' } })).toBe(400);
    expect(await code({ fields: { sentence: 'x' }, target: { kind: 'point', id: 'p-没有' } })).toBe(
      404,
    );
    const cid = (await suggestFix(app, { kind: 'clause', id: 'c-disp-from-pos' }, '子句', 'fix'))
      .id;
    await post(app, `/m08/candidates/${cid}/audits`, { verdict: '建议晋升' });
    const cbody = (fields: object) => ({
      target: { kind: 'clause', id: 'c-disp-from-pos' },
      basis: { kind: 'candidate', id: cid },
      fields,
    });
    expect(await code(cbody({ from: ['p-没有'] }))).toBe(400);
    expect(await code(cbody({ to: 'p-没有' }))).toBe(400);
    expect(await code(cbody({ from: [] }))).toBe(400);
    expect(await correctionsOf(app)).toEqual([]);
  });

  it('教学侧读到更正后的版本：闭环开场里的新点是更正后的，并说明学习者更正过', async () => {
    const { app, mainId } = await startReviewApp();
    apps.push(app);
    const id = await reviewedFix(app);
    await correct(app, {
      target: POINT,
      fields: { sentence: NEW_SENTENCE },
      reason: '漏了矢量',
      basis: { kind: 'candidate', id },
    });
    const loopId = await finishLoop(app, mainId);
    const opening = (await records(app, loopId))
      .map((r) => r.record)
      .flatMap((r) => ('text' in r ? [r.text] : []))
      .join('\n');
    expect(opening).toContain(NEW_SENTENCE);
    expect(opening).toContain('学习者更正过');
    expect(opening).not.toContain('只看起点终点，有正负表示方向');
  });

  it('只追加，重启后更正还在；资料线后来改了同一个点，旧更正标“可能过时”', async () => {
    const first = await startReviewApp();
    const id = await reviewedFix(first.app);
    const made = await correct(first.app, {
      target: POINT,
      fields: { sentence: NEW_SENTENCE },
      reason: '漏了矢量',
      basis: { kind: 'candidate', id },
    });
    await first.app.close();

    const again = await startReviewApp({ dataRoot: first.dataRoot });
    const v = (await getJson<Point08Response>(again.app, `/m08/points/${POINT.id}`)).point;
    expect(v.sentence).toBe(NEW_SENTENCE);
    expect(v.correction?.count).toBe(1);
    expect((await correctionsOf(again.app))[0]).toMatchObject({ id: made.id, stale: false });
    await again.app.close();

    // 资料线重新生成：同 id 后写取代先写（读侧已支持）。更正是按旧版写的，要提示
    await appendFile(
      join(first.dataRoot, 'knowledge', 'm08', 'points.jsonl'),
      JSON.stringify({
        id: POINT.id,
        name: '位移',
        sentence: '资料线重新生成后的新句子。',
        anchors: [],
        source: '书给的',
      }) + '\n',
    );
    const third = await startReviewApp({ dataRoot: first.dataRoot });
    apps.push(third.app);
    const v3 = (await getJson<Point08Response>(third.app, `/m08/points/${POINT.id}`)).point;
    expect(v3.sentence).toBe(NEW_SENTENCE); // 更正仍叠上（不静默丢掉学习者的更正）
    expect(v3.correction?.original.sentence).toBe('资料线重新生成后的新句子。');
    expect((await correctionsOf(third.app))[0]?.stale).toBe(true);
  });
});
