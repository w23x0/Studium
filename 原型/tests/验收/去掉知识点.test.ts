// 测：知识点编号库（原 M08）整块删掉——各会话的工具里没有那几个查询 / 候选 / 跨资料工具；导航开场不再给知识点概要；
// /api/m08/*、候选区、产出物通用候选、跨资料线索与检索标签的接口都 404；数据目录不再拷样例知识点；来源说明照留、不带疑似转录错误数。
// 依据：docs/设计/00-定位与原则.md §9（不存通用的点和子句）；会话/导航.md「现场说出候选，当场对资料核」；记录/资料.md「资料库」；记录/知识产出.md 头部。
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';
import { call, getJson, post } from '../helpers/http.ts';
import {
  choose,
  navSessionIds,
  openingOf,
  requestCard,
  roleOf,
  routeDecision,
  settled,
  startApp,
  textOption,
} from './共用/w1-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const GONE_TOOLS = [
  'search_points',
  'm08_overview',
  'list_chapter_points',
  'get_point',
  'get_clause',
  'related_sections',
  'cross_candidates',
  'propose_general_candidate',
];

function responder(ctx: FakeContext, mainId: string): FakeStep | undefined {
  if (roleOf(ctx) !== 'nav') return undefined;
  return {
    calls: [
      {
        name: 'submit_choice_card',
        args: {
          options: [textOption(mainId), textOption(mainId, { title: '另一条' })],
          recommended: 0,
          route_decision: routeDecision(mainId),
        },
      },
    ],
  };
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

describe('去掉知识点编号库', () => {
  it('导航、学习对话、守卫、畅谈、写产出、主对话的工具里都没有知识点 / 候选 / 跨资料那几个工具', async () => {
    const { app, model, mainId } = await startApp(responder);
    apps.push(app);
    const card = await requestCard(app, mainId);
    const r = await choose(app, card.record.cardId as string, 0);
    await settled(app, r.loopSessionId ?? '');
    const navId = navSessionIds(model)[0] ?? '';
    for (const spec of model.opened) {
      const names = spec.tools.map((t) => t.name);
      for (const gone of GONE_TOOLS) {
        expect(names, `会话 ${spec.session?.id ?? '?'} 不该再有 ${gone}`).not.toContain(gone);
      }
    }
    for (const kind of ['main', 'talk', 'loop', 'guard', 'output'] as const) {
      const names = app.studium
        .kind(kind)
        .tools('x')
        .map((t) => t.name);
      for (const gone of GONE_TOOLS) {
        expect(names, `${kind} 会话不该再有 ${gone}`).not.toContain(gone);
      }
    }
    expect(openingOf(model, navId), '导航开场不再给知识点概要').not.toContain('M08');
  });

  it('知识点、候选区、产出物通用候选、跨资料线索与检索标签的接口都 404；来源说明照旧可读', async () => {
    const { app, mainId } = await startApp(responder);
    apps.push(app);
    const gets = [
      '/m08/overview',
      '/m08/points',
      '/m08/points/p-displacement',
      '/m08/clauses/c-disp-from-pos',
      '/m08/candidates',
      '/m08/corrections',
      '/m08/review?target=point:p-displacement',
      '/m14/candidates',
      '/library/links?book=力学入门样例&file=ch01/sec-1.1.md',
      '/library/clues',
      '/library/tagged-search?q=位移',
    ];
    for (const path of gets) {
      expect((await call(app, path)).status, `GET ${path} 应 404`).toBe(404);
    }
    expect((await post(app, '/m08/suggestions', { text: 'x' })).status, 'POST 候选建议应 404').toBe(
      404,
    );
    const created = await post(app, `/projects/${mainId}/outputs`, {
      title: '笔记',
      kind: '笔记整理',
      text: '位移是位置的变化量。',
    });
    expect(created.status).toBe(201);
    const outId = ((await created.json()) as { output: { id: string } }).output.id;
    expect((await call(app, `/outputs/${outId}/candidates`)).status, '产出物候选列表应 404').toBe(
      404,
    );
    expect(
      (await post(app, `/outputs/${outId}/candidates`, { text: '可作通用知识' })).status,
      '标通用候选应 404',
    ).toBe(404);
    const note = await call(app, '/library/source-notes?book=力学入门样例');
    expect(note.status, '来源说明照旧可读').toBe(200);
    const body = (await note.json()) as { note: { quality: Record<string, unknown> } };
    expect(body.note.quality, '来源说明不再带疑似转录错误数').not.toHaveProperty('suspected');
    expect(body.note.quality).not.toHaveProperty('suspectedFrom');
    expect(String(body.note.quality.text), '转写质量不再提知识点审核').not.toContain('审核');
    const all = await getJson<{ notes: unknown[] }>(app, '/library/source-notes');
    expect(Array.isArray(all.notes)).toBe(true);
  });

  it('数据目录里不再拷样例知识点', async () => {
    const { app } = await startApp(responder);
    apps.push(app);
    expect(await exists(join(app.dataDir.root, 'knowledge', 'm08')), '不该再有 knowledge/m08').toBe(
      false,
    );
    expect(await exists(join(app.dataDir.root, 'knowledge', 'm08-review')), '不该再有候选区').toBe(
      false,
    );
  });
});
