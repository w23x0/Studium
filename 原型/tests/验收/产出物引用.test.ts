// （W1 新版，取代旧的同名测试：【知识点|】【子句|】不再是引用。）
// 验收：产出物「来源引用位置」——正文里的教材出处标记核心能解析、核对、回查；视图列出引用的原文，对不上的标出（不编）；
// 每一版各有自己的引用，两版比较给出引用的增减。【知识点|…】【子句|…】不再是引用（W1 去知识点编号库）。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import { formatCitation } from '../../src/shared/citation.ts';
import type { CompareResponse, OutputResponse } from '../../src/shared/output.ts';
import type { App } from '../../src/core/app.ts';
import { getJson } from '../helpers/http.ts';
import { BOOK, createOutput, saveVersion, startOutputsApp } from '../helpers/outputs.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const cite = formatCitation({ book: BOOK, file: 'ch01/sec-1.2.md', from: 3, to: 4 });
const point = '【知识点|p-displacement】';
const clause = '【子句|c-avgv-from-disp】';

describe('产出物引用', () => {
  it('产出物视图：引用的教材原文回查到；对不上的标出，不编；知识点 / 子句标记不算引用', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const text = [
      `平均速度是位移除以时间${cite}。`,
      `这里用到${point}，从它走到平均速度的那一步见${clause}。`,
      `教材里没有的一段【教材|${BOOK}|ch09/sec-9.9.md|L1】，不再算引用的【知识点|p-nope】和【子句|c-nope】。`,
    ].join('\n');
    const out = await createOutput(app, mainId, { title: '速度笔记', kind: '笔记整理', text });
    const refs = out.current?.references;
    expect(refs?.sources).toHaveLength(2);
    expect(refs?.sources[0]).toMatchObject({
      resolved: true,
      raw: cite,
      section: '1.2 速度',
      from: 3,
      to: 4,
    });
    expect(refs?.sources[0]?.lines?.[0]?.text).toContain('位移告诉我们物体挪了多少');
    expect(refs?.sources[1]).toMatchObject({ resolved: false });
    expect(refs?.sources[1]?.problem).toBeTruthy();

    expect(refs, '不再有知识点对象引用').not.toHaveProperty('objects');
    expect(refs?.unresolved).toBe(1);
  });

  it('引用随版本保留：每一版各有自己的引用，两版比较给出引用的增减', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, {
      title: 't',
      kind: '推导',
      text: `第一版引了${cite}和${point}`,
    });
    await saveVersion(app, out.id, { text: `第二版只引${clause}和${point}`, note: '换了引用' });
    const detail = (await getJson<OutputResponse>(app, `/outputs/${out.id}`)).output;
    expect(detail.current?.references.sources).toHaveLength(0);
    const v1 = (
      await getJson<{ version: { references: { sources: unknown[] } } }>(
        app,
        `/outputs/${out.id}/versions/1`,
      )
    ).version;
    expect(v1.references.sources).toHaveLength(1);
    const cmp = (await getJson<CompareResponse>(app, `/outputs/${out.id}/compare?from=1&to=2`))
      .compare;
    expect(cmp.refsAdded).toEqual([]);
    expect(cmp.refsRemoved).toEqual([cite]);
  });
});
