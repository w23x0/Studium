// 验收：M14「来源与对象引用位置」——产出物正文里的教材出处标记和 M08 对象引用标记，核心能解析、核对、回查；
// 视图列出引用的原文与知识点，对不上的标出（不编）；每一版各有自己的引用，两版比较给出引用的增减。只经 HTTP 验证。
import { afterEach, describe, expect, it } from 'vitest';
import { formatCitation } from '../../src/shared/citation.ts';
import type { CompareResponse, OutputResponse } from '../../src/shared/m14.ts';
import { formatObjectRef, parseObjectRefs } from '../../src/shared/object-ref.ts';
import type { App } from '../../src/core/app.ts';
import { getJson } from '../helpers/http.ts';
import { BOOK, createOutput, saveVersion, startOutputsApp } from '../helpers/outputs.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const cite = formatCitation({ book: BOOK, file: 'ch01/sec-1.2.md', from: 3, to: 4 });
const point = formatObjectRef({ kind: 'point', id: 'p-displacement' });
const clause = formatObjectRef({ kind: 'clause', id: 'c-avgv-from-disp' });

describe('产出物引用', () => {
  it('对象引用标记的格式：点 / 子句，半角全角竖线都认', () => {
    expect(point).toBe('【知识点|p-displacement】');
    expect(clause).toBe('【子句|c-avgv-from-disp】');
    const found = parseObjectRefs(`甲${point}乙【子句｜c-x】丙【知识点|】【教材|a|b|L1】`);
    expect(found.map((f) => [f.kind, f.id])).toEqual([
      ['point', 'p-displacement'],
      ['clause', 'c-x'],
    ]);
    expect(`甲${point}乙`.slice(found[0]?.start, found[0]?.end)).toBe(point);
  });

  it('产出物视图：引用的教材原文和 M08 点 / 子句都回查到；对不上的标出，不编', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const text = [
      `平均速度是位移除以时间${cite}。`,
      `这里用到${point}，从它走到平均速度的那一步见${clause}。`,
      `教材里没有的一段【教材|${BOOK}|ch09/sec-9.9.md|L1】，M08 里没有的点【知识点|p-nope】和子句【子句|c-nope】。`,
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

    expect(refs?.objects).toHaveLength(4);
    expect(refs?.objects[0]).toMatchObject({
      kind: 'point',
      id: 'p-displacement',
      resolved: true,
      name: '位移',
      source: '书给的',
    });
    expect(refs?.objects[0]?.sentence).toContain('位置的变化量');
    expect(refs?.objects[1]).toMatchObject({
      kind: 'clause',
      id: 'c-avgv-from-disp',
      resolved: true,
    });
    expect(refs?.objects[1]?.name).toContain('位移');
    expect(refs?.objects[2]).toMatchObject({ id: 'p-nope', resolved: false });
    expect(refs?.objects[3]).toMatchObject({ id: 'c-nope', resolved: false });
    // 标记在正文里的位置能直接切出来
    for (const o of refs?.objects ?? []) expect(text.slice(o.start, o.end)).toBe(o.raw);
    expect(refs?.unresolved).toBe(3);
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
    expect(cmp.refsAdded).toEqual([clause]);
    expect(cmp.refsRemoved).toEqual([cite]);
  });
});
