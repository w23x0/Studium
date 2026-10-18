// 测：产出物正文里的【知识点|…】【子句|…】不再被当作引用解析（只认教材出处标记），不算“对不上”，版本比较也不把它算进引用增减；
// 写产出对话的保存工具不再教模型写知识点引用。依据：docs/设计/记录/知识产出.md（冻结；只去知识点引用）；00-定位与原则.md §9。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { getJson, post } from '../helpers/http.ts';
import { startApp } from './共用/w1-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const CITE = '【教材|力学入门样例|ch01/sec-1.2.md|L3-4】';

interface Refs {
  sources: { raw: string; resolved: boolean }[];
  objects?: unknown[];
  unresolved: number;
}

describe('产出物引用只认教材出处', () => {
  it('正文里的知识点 / 子句标记不解析、不算对不上；教材出处照旧核对', async () => {
    const { app, mainId } = await startApp(() => undefined);
    apps.push(app);
    const res = await post(app, `/projects/${mainId}/outputs`, {
      title: '速度笔记',
      kind: '笔记整理',
      text: `平均速度是位移除以时间${CITE}。这里用到【知识点|p-displacement】和【子句｜c-nope】。`,
    });
    expect(res.status).toBe(201);
    const out = ((await res.json()) as { output: { id: string; current?: { references: Refs } } })
      .output;
    const refs = out.current?.references;
    expect(
      refs?.sources.map((s) => [s.raw, s.resolved]),
      '教材出处照旧核对',
    ).toEqual([[CITE, true]]);
    expect(refs?.objects ?? [], '知识点 / 子句标记不再被当作引用').toEqual([]);
    expect(refs?.unresolved, '知识点标记不算对不上').toBe(0);

    const v2 = await post(app, `/outputs/${out.id}/versions`, {
      text: `平均速度是位移除以时间${CITE}。这里用到【知识点|p-velocity】。`,
      note: '换了个说法',
    });
    expect(v2.status).toBe(201);
    const cmp = (
      await getJson<{ compare: { refsAdded: string[]; refsRemoved: string[] } }>(
        app,
        `/outputs/${out.id}/compare?from=1&to=2`,
      )
    ).compare;
    expect(cmp.refsAdded, '知识点标记不算引用增减').toEqual([]);
    expect(cmp.refsRemoved).toEqual([]);
  });

  it('写产出对话的保存工具说明里不再教写知识点 / 子句引用', async () => {
    const { app } = await startApp(() => undefined);
    apps.push(app);
    const save = app.studium
      .kind('output')
      .tools('x')
      .find((t) => t.name === 'save_output_version');
    expect(save, '保存工具还在').toBeDefined();
    expect(save?.description, '说明里不再提知识点引用').not.toContain('知识点');
  });
});
