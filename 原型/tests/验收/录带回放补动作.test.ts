// 验收：录带记下批 3a / 5 / 6 / 8 的学习者动作（改项目资料、改期限、小卡上的选择、搁置、恢复、接着学、
// 提醒增删、复盘、建产出物、存版本、登记文献），空目录里只凭录带回放能重做它们：问题清单为空，
// 各会话的记录、提醒、产出物与录的那次一致（会话 id、时间、随机编号除外）。
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ListSessionsResponse, RemindersResponse } from '../../src/shared/protocol.ts';
import type { ListOutputsResponse } from '../../src/shared/m14.ts';
import { createApp, SAMPLE_DIR, type App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { ACTIONS } from '../../src/core/tape/recorder.ts';
import { normalizeForCompare } from '../../src/core/tape/ids.ts';
import { replayTape } from '../../src/core/tape/replay.ts';
import { getJson, post, records, TOKEN } from '../helpers/http.ts';
import { settled } from '../helpers/evidence-flow.ts';
import {
  detourResponder,
  newDetourState,
  openLoop,
  troubleAndCard,
} from '../helpers/detour-flow.ts';
import { tempDir } from '../helpers/tmp.ts';
import { readFile } from 'node:fs/promises';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const LIBRARY = join(SAMPLE_DIR, '书库');

/** 各会话的内容指纹，加上提醒与产出物：会话 id、时间、随机编号都抹掉。 */
async function fingerprint(app: App, mainId: string): Promise<Record<string, string[]>> {
  const sessions = (await getJson<ListSessionsResponse>(app, '/sessions')).sessions;
  const out: Record<string, string[]> = {};
  for (const s of sessions) {
    const rs = await records(app, s.sessionId);
    const body = rs
      .map(({ record: r }) => {
        if ('text' in r) return `${r.type}|${normalizeForCompare(r.text)}`;
        if (r.type === 'tool_call') {
          return `tool|${r.name}|${String(r.isError)}|${normalizeForCompare(r.result)}`;
        }
        return r.type;
      })
      .join('\n');
    (out[s.kind] ??= []).push(body);
  }
  for (const k of Object.keys(out)) out[k]?.sort();
  const reminders = (await getJson<RemindersResponse>(app, `/projects/${mainId}/reminders`))
    .reminders;
  out.reminders = reminders.map((r) => `${r.due}|${r.text}|${r.closed?.outcome ?? '开着'}`).sort();
  const outputs = (await getJson<ListOutputsResponse>(app, `/projects/${mainId}/outputs`)).outputs;
  out.outputs = outputs.map((o) => `${o.title}|${o.kind}|${String(o.versions)}`).sort();
  return out;
}

describe('录带记下更多学习者动作', () => {
  it('批 3a / 5 / 6 / 8 的动作进录带，空目录回放重做出同样的结果', async () => {
    const root = await tempDir();
    const tape = join(await tempDir(), 'run.tape.jsonl');
    const a = await createApp({
      dataRoot: root,
      model: new FakeModel({ responder: detourResponder(newDetourState()) }),
      token: TOKEN,
      port: 0,
      library: LIBRARY,
      tape,
    });
    apps.push(a);
    const mainId = await a.studium.ensureMain();

    // 批 3a：项目资料、期限
    expect((await post(a, `/projects/${mainId}/materials`, { add: ['力学入门样例'] })).status).toBe(
      200,
    );
    expect(
      (await post(a, `/projects/${mainId}/deadline`, { deadline: '2026-12-31', note: '期末' }))
        .status,
    ).toBe(200);

    // 批 5：小卡上选“先不管”、搁置、恢复
    const { loopId } = await openLoop(a, mainId, 1);
    const { cardId } = await troubleAndCard(a, loopId);
    expect((await post(a, `/sessions/${loopId}/detour`, { cardId, option: 1 })).status).toBe(201);
    await a.studium.settled();
    await post(a, `/sessions/${loopId}/shelve`, { note: '今天有点累' });
    await a.studium.settled();
    await post(a, `/sessions/${loopId}/resume`);
    await a.studium.settled();
    await post(a, `/sessions/${loopId}/end`, { note: '先到这' });
    await a.studium.settled();

    // 批 6：接着学、提醒增删、复盘
    const cont = await post(a, `/sessions/${loopId}/continue`);
    expect(cont.status).toBe(201);
    await a.studium.settled();
    const added = await post(a, `/projects/${mainId}/reminders`, {
      text: '回头看看位移',
      due: '2030-01-01',
    });
    const { reminder } = (await added.json()) as { reminder: { id: string } };
    await post(a, `/projects/${mainId}/reminders`, { text: '期末前过一遍', due: '2030-02-01' });
    expect(
      (await post(a, `/projects/${mainId}/reminders/${reminder.id}`, { outcome: 'dismissed' }))
        .status,
    ).toBe(200);
    expect((await post(a, `/projects/${mainId}/review`, {})).status).toBe(201);
    await a.studium.settled();

    // 批 8：建产出物、存新版本、登记文献
    const created = await post(a, `/projects/${mainId}/outputs`, {
      title: '位移小结',
      kind: '笔记整理',
      text: '位移只看起点终点。',
    });
    expect(created.status).toBe(201);
    const { output } = (await created.json()) as { output: { id: string } };
    expect(
      (await post(a, `/outputs/${output.id}/versions`, { text: '位移 = 终点 − 起点。', base: 1 }))
        .status,
    ).toBe(201);
    expect(
      (
        await post(a, `/outputs/${output.id}/literature`, {
          title: '某本参考书',
          relation: '换个讲法对照',
        })
      ).status,
    ).toBe(201);
    await a.studium.settled();

    const before = await fingerprint(a, mainId);
    await a.close();
    apps.splice(0);

    // 这些动作都进了录带
    const names = (await readFile(tape, 'utf8'))
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { t: string; name?: string })
      .filter((l) => l.t === 'action')
      .map((l) => l.name);
    for (const n of [
      'changeMaterials',
      'setDeadline',
      'chooseDetour',
      'shelveLoop',
      'resumeLoop',
      'longterm.continueLoop',
      'longterm.addReminder',
      'longterm.closeReminder',
      'longterm.startReview',
      'outputs.create',
      'outputs.save',
      'outputs.addLiterature',
    ]) {
      expect(ACTIONS as readonly string[]).toContain(n);
      expect(names).toContain(n);
    }

    const replayRoot = await tempDir();
    const report = await replayTape(tape, { dataRoot: replayRoot, library: LIBRARY });
    expect(report.problems).toEqual([]);

    const b = await createApp({
      dataRoot: replayRoot,
      model: new FakeModel(),
      token: TOKEN,
      port: 0,
      library: LIBRARY,
    });
    apps.push(b);
    const replayMain = await b.studium.ensureMain();
    expect(await fingerprint(b, replayMain)).toEqual(before);
    await settled(b, replayMain);
  });
});
