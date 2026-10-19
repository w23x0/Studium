// （W1 新版，取代旧的同名测试：【知识点|】不再是引用。）
// 验收：M14「方法比较与适用边界」——方法 × 维度表、各方法的适用边界与出处、暂时论证，是产出物的一种结构化类型；
// 每次保存同样是新版本，正文由程序按结构渲染（引用照样能核对）；不合格式的拒绝。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import { formatCitation } from '../../src/shared/citation.ts';
import type { MethodComparison, OutputResponse } from '../../src/shared/output.ts';
import type { App } from '../../src/core/app.ts';
import { getJson, post } from '../helpers/http.ts';
import { BOOK, createOutput, saveVersion, startOutputsApp } from '../helpers/outputs.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const cite = formatCitation({ book: BOOK, file: 'ch01/sec-1.2.md', from: 3 });

function comparison(): MethodComparison {
  return {
    dimensions: ['假设', '局限'],
    methods: [
      {
        name: '图像法',
        boundary: '适合一维、变化平缓的运动',
        values: { 假设: '位置—时间曲线光滑', 局限: '精度受作图限制' },
        evidence: [`教材里的斜率解释${cite}`, '【知识点|p-avg-velocity】'],
      },
      {
        name: '解析法',
        boundary: '位置函数已知时都能用',
        values: { 假设: '位置函数可求导' },
        evidence: [],
      },
    ],
    tentative: '两种方法在光滑运动里应当一致，尚未验证非光滑的情形。',
  };
}

describe('产出物方法比较', () => {
  it('建方法比较：结构保存、正文按结构渲染、引用可核对；每次保存是新版本', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, {
      title: '求速度的两种方法',
      kind: '方法比较',
      comparison: comparison(),
      note: '初稿',
    });
    expect(out.current?.comparison).toEqual(comparison());
    const text = out.current?.text ?? '';
    expect(text).toContain('比较的维度：假设、局限');
    expect(text).toContain('## 图像法');
    expect(text).toContain('适用边界：适合一维、变化平缓的运动');
    expect(text).toContain('## 暂时论证（尚未定论）');
    // 渲染出的正文里的出处能核对；【知识点|…】不再算引用（W1）
    expect(out.current?.references.sources[0]).toMatchObject({ resolved: true, raw: cite });
    expect(out.current?.references.unresolved).toBe(0);

    const next = comparison();
    next.methods.push({
      name: '数值差分',
      boundary: '只有离散测量数据时用',
      values: { 局限: '步长影响误差' },
      evidence: [],
    });
    const v2 = await saveVersion(app, out.id, { comparison: next, note: '加了数值差分' });
    expect(v2.n).toBe(2);
    expect(v2.comparison?.methods).toHaveLength(3);
    const cmp = (
      await getJson<{ compare: { added: number } }>(app, `/outputs/${out.id}/compare?from=1&to=2`)
    ).compare;
    expect(cmp.added).toBeGreaterThan(0);
    const detail = (await getJson<OutputResponse>(app, `/outputs/${out.id}`)).output;
    expect(detail.history).toHaveLength(2);
  });

  it('不合格式的拒绝：缺边界、重名、维度对不上、少于两个方法、类型对不上', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, { title: 't', kind: '方法比较' });
    expect(out).toMatchObject({ latest: 0, versions: 0 });
    const bad = async (c: object | undefined, text?: string): Promise<number> =>
      (
        await post(app, `/outputs/${out.id}/versions`, {
          ...(c !== undefined ? { comparison: c } : {}),
          ...(text !== undefined ? { text } : {}),
        })
      ).status;
    const base = comparison();
    expect(await bad(undefined, '只给正文')).toBe(400);
    expect(await bad({ ...base, methods: [base.methods[0]] })).toBe(400);
    expect(
      await bad({ ...base, methods: [base.methods[0], { ...base.methods[1], name: '图像法' }] }),
    ).toBe(400);
    expect(
      await bad({ ...base, methods: [base.methods[0], { ...base.methods[1], boundary: ' ' }] }),
    ).toBe(400);
    expect(
      await bad({
        ...base,
        methods: [base.methods[0], { ...base.methods[1], values: { 没有的维度: 'x' } }],
      }),
    ).toBe(400);
    expect(await bad({ ...base, dimensions: [] })).toBe(400);
    expect(await bad(base)).toBe(201);
    // 别的类型的产出物不带 comparison
    const note = await createOutput(app, mainId, { title: 'n', kind: '笔记整理', text: 'x' });
    expect(
      (await post(app, `/outputs/${note.id}/versions`, { text: 'y', comparison: base })).status,
    ).toBe(400);
  });
});
