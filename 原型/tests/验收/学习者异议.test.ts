// 验收（W2 新版，取代旧版）：学习者可以对系统的判断提异议（docs/设计/会话/守卫.md §5“可见与更正”；
// 记录/学过的记录.md「时间与版本」学习者异议）。分析层取消后只剩三种目标：守卫判定、状态记录、教法记录。
// - 对还开着的学习里守卫的判定：作为学习者原话（带异议标记）追加进该学习，之后可再申请收口；
// - 对已结束学习的判定、对状态 / 教法记录：只追加一条异议记录，指向原记录，原记录不改；
// - 状态整理读得到对状态记录的异议。只经 HTTP，假模型。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { getJson, post, records } from '../helpers/http.ts';
import {
  boot,
  endUnclosed,
  learnAndClose,
  newFlow,
  openLoop,
  requestClose,
  say,
  settled,
  type Loose,
} from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const WORDS = '我其实已经懂了，刚才是没说清楚';

describe('学习者异议', () => {
  it('对开着的学习里的判定提异议：原话进学习、带标记；之后可再申请收口并合上', async () => {
    const flow = newFlow();
    flow.guard = 'open';
    const { app, mainId, fake } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await say(app, loopId, flow);
    const verdictLine = (await requestClose(app, loopId, 1)).line;

    const res = await post(app, `/sessions/${loopId}/objections`, {
      line: verdictLine,
      text: WORDS,
    });
    expect(res.status, '异议收下').toBe(201);
    const { objection } = (await res.json()) as { objection: Loose };
    expect(objection, '异议指向这一行判定、进了学习').toMatchObject({
      inLoop: true,
      text: WORDS,
      target: { kind: 'guard_verdict', loopSessionId: loopId, line: verdictLine },
    });
    await settled(app, loopId);
    const said = (await records(app, loopId)).find((r) => r.line === objection.line);
    expect(said?.record, '正本里是学习者原话，带异议标记').toMatchObject({
      type: 'user_message',
      text: WORDS,
      objection: { toLine: verdictLine },
    });

    // 再申请收口：守卫读得到这句话
    flow.guard = 'closed';
    await requestClose(app, loopId, 2);
    expect(
      fake.inputs.some(
        (i) => i.spec.tools.some((t) => t.name === 'submit_verdict') && i.text.includes(WORDS),
      ),
      '守卫的输入里有这句异议原话',
    ).toBe(true);
    expect((await post(app, `/sessions/${loopId}/confirm-close`)).status, '可以确认合上').toBe(202);
    await app.studium.settled();
  });

  it('提不了的异议：找不到判定、空话、不是一次学习', async () => {
    const flow = newFlow();
    flow.guard = 'open';
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await say(app, loopId, flow);
    const line = (await requestClose(app, loopId, 1)).line;
    const before = (await records(app, loopId)).length;
    const bad = [
      [loopId, { line: 1, text: WORDS }],
      [loopId, { line, text: '   ' }],
      [loopId, { text: WORDS }],
      [mainId, { line: 1, text: WORDS }],
    ] as const;
    for (const [id, body] of bad) {
      expect((await post(app, `/sessions/${id}/objections`, body)).status, '不合格的异议 400').toBe(
        400,
      );
    }
    expect((await records(app, loopId)).length, '学习的正本没多出行').toBe(before);
  });

  it('已结束学习的判定、状态记录、教法记录：只追加异议记录，原记录不改；m09 种类不收', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await learnAndClose(app, loopId, flow);

    const knowledge = (name: string) => join(app.dataDir.root, 'knowledge', name, 'records.jsonl');
    const snapshot = async () => ({
      m10: await readFile(knowledge('pedagogy'), 'utf8'),
      m15: await readFile(knowledge('state'), 'utf8'),
      loop: JSON.stringify(await records(app, loopId)),
    });
    const before = await snapshot();
    const st = (await getJson<{ records: { id: string }[] }>(app, '/state/records')).records[0];
    const sr = (await getJson<{ records: { id: string }[] }>(app, '/pedagogy/records')).records[0];
    expect(st?.id, '有一条状态记录').toBeTruthy();
    expect(sr?.id, '有一条教法记录').toBeTruthy();
    const verdictLine =
      (await records(app, loopId)).filter((r) => r.record.type === 'guard_verdict').at(-1)?.line ??
      0;

    const late = await post(app, `/sessions/${loopId}/objections`, {
      line: verdictLine,
      text: WORDS,
    });
    expect(late.status, '对已结束学习的判定提异议').toBe(201);
    expect(
      ((await late.json()) as { objection: Loose }).objection.inLoop,
      '记进异议存放处，不进学习正本',
    ).toBe(false);
    for (const [kind, recordId] of [
      ['pedagogy', sr?.id],
      ['state', st?.id],
    ] as const) {
      const r = await post(app, '/objections', { kind, recordId, text: `${kind}：${WORDS}` });
      expect(r.status, `${kind} 记录的异议收下`).toBe(201);
    }
    expect(await snapshot(), '原记录与学习正本一字不动').toEqual(before);
    const all = await getJson<{ objections: Loose[] }>(app, '/objections');
    expect(all.objections, '三条异议').toHaveLength(3);
    expect(
      (await post(app, '/objections', { kind: 'm09', recordId: 'f-1', text: WORDS })).status,
      'm09 种类不再认',
    ).toBe(400);
  });

  it('状态整理读得到对状态记录的异议（异议本身也算新记录）', async () => {
    const flow = newFlow();
    const { app, mainId, fake } = await boot(flow);
    apps.push(app);
    const first = await openLoop(app, mainId, flow);
    await learnAndClose(app, first, flow);
    const stateRuns = () =>
      fake.opened.filter((s) => s.tools.some((t) => t.name === 'write_state_record')).length;
    expect(stateRuns(), '合上后整理过一次状态').toBe(1);
    const st = (await getJson<{ records: { id: string }[] }>(app, '/state/records')).records[0];
    const NOTE = '我没说过累，是随口一说';
    await post(app, '/objections', { kind: 'state', recordId: st?.id, text: NOTE });

    // 再开一次学习，没说话就结束：只有异议是新的
    flow.loopId = '';
    const second = await openLoop(app, mainId, flow);
    flow.loopId = '';
    await endUnclosed(app, second, '先不学了');
    expect(stateRuns(), '异议触发了又一次状态整理').toBe(2);
    const opening = fake.inputs
      .filter((i) => i.spec.tools.some((t) => t.name === 'write_state_record'))
      .at(-1)?.text;
    expect(opening, '状态整理的输入里有这条异议').toContain(NOTE);
  });
});
