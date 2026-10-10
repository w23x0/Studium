// 验收：M14 把可去个人化的结果整理为 M08 候选——候选通道还没有，这里只在 M14 自己的存放处记一条
// “可作通用知识候选”的说明（标“候选、未审”），不写 M08、不写 M09。只经 HTTP 验证。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  CandidateResponse,
  CandidatesResponse,
  OutputResponse,
} from '../../src/shared/m14.ts';
import type { App } from '../../src/core/app.ts';
import { getJson, post } from '../helpers/http.ts';
import { createOutput, saveVersion, startOutputsApp } from '../helpers/outputs.ts';

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

describe('产出物通用候选', () => {
  it('标一条说明：默认标在最新版，状态“候选、未审”；产出物视图和候选清单里都看得到', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, {
      title: '位移笔记',
      kind: '笔记整理',
      text: 'v1',
    });
    await saveVersion(app, out.id, { text: 'v2' });
    const res = await post(app, `/outputs/${out.id}/candidates`, {
      text: '“位移与路程的区别”这一节去掉我的例子后可以作通用解释',
    });
    expect(res.status).toBe(201);
    const c = ((await res.json()) as CandidateResponse).candidate;
    expect(c).toMatchObject({ output: out.id, version: 2, status: '候选、未审' });
    const onOld = await post(app, `/outputs/${out.id}/candidates`, {
      text: '第一版里的定义',
      version: 1,
    });
    expect(((await onOld.json()) as CandidateResponse).candidate.version).toBe(1);

    const detail = (await getJson<OutputResponse>(app, `/outputs/${out.id}`)).output;
    expect(detail.candidates.map((x) => x.version)).toEqual([2, 1]);
    const all = (await getJson<CandidatesResponse>(app, '/m14/candidates')).candidates;
    expect(all).toHaveLength(2);
    expect(
      (await getJson<CandidatesResponse>(app, `/outputs/${out.id}/candidates`)).candidates,
    ).toHaveLength(2);
  });

  it('只记在 M14 自己的存放处：M08 和 M09 的文件一字不动', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const out = await createOutput(app, mainId, { title: 't', kind: '推导', text: 'x' });
    const before = [
      await read(app, 'm08/points.jsonl'),
      await read(app, 'm08/clauses.jsonl'),
      await read(app, 'm09/records.jsonl'),
    ];
    await post(app, `/outputs/${out.id}/candidates`, { text: '可作通用推导' });
    const after = [
      await read(app, 'm08/points.jsonl'),
      await read(app, 'm08/clauses.jsonl'),
      await read(app, 'm09/records.jsonl'),
    ];
    expect(after).toEqual(before);
    expect(await read(app, 'm14/candidates.jsonl')).toContain('候选、未审');
  });

  it('拒绝：没有说明、还没有版本、版本不存在、产出物不存在', async () => {
    const { app, mainId } = await startOutputsApp();
    apps.push(app);
    const empty = await createOutput(app, mainId, { title: 'e', kind: '推导' });
    expect((await post(app, `/outputs/${empty.id}/candidates`, { text: 'x' })).status).toBe(400);
    const out = await createOutput(app, mainId, { title: 't', kind: '推导', text: 'x' });
    expect((await post(app, `/outputs/${out.id}/candidates`, { text: ' ' })).status).toBe(400);
    expect(
      (await post(app, `/outputs/${out.id}/candidates`, { text: 'x', version: 7 })).status,
    ).toBe(404);
    expect((await post(app, `/outputs/nope/candidates`, { text: 'x' })).status).toBe(404);
  });
});
