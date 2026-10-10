// 验收：学习者可以对系统的判断提异议（M04:24 M15:40 总览「横切原则」5：可见不等于可裁决，异议按自述记录、不覆盖）。
// - 对还开着的闭环里守卫的判定：作为学习者原话（带异议标记）追加进该闭环，之后可再申请收口；
// - 对已结束闭环的判定、对 M09 / M10 / M15 的记录：只追加一条异议记录，指向原记录，原记录不改；
// - M15 整理、M05 出选项、查询工具读得到这些异议。只经 HTTP 验证。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  FormationsResponse,
  LoopEvidenceResponse,
  ObjectionResponse,
  ObjectionsResponse,
  StateResponse,
} from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { call, getJson, post, records, waitFor } from '../helpers/http.ts';
import {
  confirmAndSettle,
  newState,
  requestClose,
  settled,
  startApp,
  startLoop,
} from '../helpers/evidence-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const WORDS = '我其实已经懂了，刚才是没说清楚';

describe('学习者异议', () => {
  it('对开着的闭环里的判定提异议：原话进闭环、带标记，之后可再申请收口', async () => {
    const state = newState();
    const { app, mainId, fake } = await startApp(state);
    apps.push(app);
    const { loopId } = await startLoop(app, mainId);
    state.guardClosed = false;
    await requestClose(app, loopId, 1);
    const verdictLine = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop
      .verdicts[0]?.line;
    expect(verdictLine).toBeGreaterThan(0);

    const res = await post(app, `/sessions/${loopId}/objections`, {
      line: verdictLine,
      text: WORDS,
    });
    expect(res.status).toBe(201);
    const { objection } = (await res.json()) as ObjectionResponse;
    expect(objection).toMatchObject({
      inLoop: true,
      text: WORDS,
      target: { kind: 'guard_verdict', loopSessionId: loopId, line: verdictLine },
    });
    await settled(app, loopId);

    // 正本里是学习者原话，带异议标记
    const recs = await records(app, loopId);
    const said = recs.find((r) => r.line === objection.line);
    expect(said?.record).toMatchObject({
      type: 'user_message',
      text: WORDS,
      objection: { toLine: verdictLine },
    });
    // 教学侧看到的消息写明是对哪一行判定的异议
    expect(
      fake.inputs.some(
        (i) =>
          i.text.includes(`第 ${String(verdictLine)} 行的守卫判定提出异议`) &&
          i.text.includes(WORDS),
      ),
    ).toBe(true);
    // 依据里这次判定下挂着这条异议
    const ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop;
    expect(ev.verdicts[0]?.objections.map((o) => o.text)).toEqual([WORDS]);
    expect(ev.objections).toHaveLength(1);

    // 再申请收口：守卫读得到这句话，可以引它作证据
    state.guardClosed = true;
    await requestClose(app, loopId, 2);
    expect(fake.inputs.some((i) => i.text.includes('闭环对话原文') && i.text.includes(WORDS))).toBe(
      true,
    );
    await confirmAndSettle(app, loopId);
    const ended = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop;
    expect(ended.status).toBe('closed');
  });

  it('提不了的异议：找不到判定、空话、不是闭环', async () => {
    const state = newState();
    const { app, mainId } = await startApp(state);
    apps.push(app);
    const { loopId } = await startLoop(app, mainId);
    await requestClose(app, loopId, 1);
    const line = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop
      .verdicts[0]?.line;
    const before = (await records(app, loopId)).length;
    expect(
      (await post(app, `/sessions/${loopId}/objections`, { line: 1, text: WORDS })).status,
    ).toBe(400);
    expect((await post(app, `/sessions/${loopId}/objections`, { line, text: '   ' })).status).toBe(
      400,
    );
    expect((await post(app, `/sessions/${loopId}/objections`, { text: WORDS })).status).toBe(400);
    expect(
      (await post(app, `/sessions/${mainId}/objections`, { line: 1, text: WORDS })).status,
    ).toBe(400);
    expect((await records(app, loopId)).length).toBe(before);
  });

  it('已结束闭环的判定、M09 / M10 / M15 记录：只追加异议记录，原记录不改', async () => {
    const state = newState();
    const { app, mainId } = await startApp(state);
    apps.push(app);
    const { loopId } = await startLoop(app, mainId);
    await requestClose(app, loopId, 1);
    await confirmAndSettle(app, loopId);

    const knowledge = (name: string) => join(app.dataDir.root, 'knowledge', name, 'records.jsonl');
    const snapshot = async () => ({
      m09: await readFile(knowledge('m09'), 'utf8'),
      m10: await readFile(knowledge('m10'), 'utf8'),
      m15: await readFile(knowledge('m15'), 'utf8'),
      loop: JSON.stringify(await records(app, loopId)),
    });
    const before = await snapshot();
    const m09 = (await getJson<FormationsResponse>(app, '/m09/records')).records[0];
    const st = (await getJson<StateResponse>(app, '/m15/state')).records[0];
    const sr = (await getJson<{ records: { id: string }[] }>(app, '/m10/records')).records[0];
    const verdictLine = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop
      .verdicts[0]?.line;

    // 已结束闭环的判定：记进异议存放处，闭环正本不动
    const late = await post(app, `/sessions/${loopId}/objections`, {
      line: verdictLine,
      text: WORDS,
    });
    expect(late.status).toBe(201);
    expect(((await late.json()) as ObjectionResponse).objection.inLoop).toBe(false);
    // 三种记录
    for (const [kind, recordId] of [
      ['m09', m09?.id],
      ['m10', sr?.id],
      ['m15', st?.id],
    ]) {
      const r = await post(app, '/objections', { kind, recordId, text: `${kind}：${WORDS}` });
      expect(r.status).toBe(201);
      const { objection } = (await r.json()) as ObjectionResponse;
      expect(objection).toMatchObject({ target: { kind, recordId }, text: `${kind}：${WORDS}` });
    }
    expect(await snapshot()).toEqual(before);

    // 记录视图下挂着异议；其余字段与提异议前一样
    const m09After = (await getJson<FormationsResponse>(app, '/m09/records')).records[0];
    expect(m09After?.objections.map((o) => o.text)).toEqual([`m09：${WORDS}`]);
    expect({ ...m09After, objections: [] }).toEqual({ ...m09, objections: [] });
    const stAfter = (await getJson<StateResponse>(app, '/m15/state')).records[0];
    expect(stAfter?.objections.map((o) => o.text)).toEqual([`m15：${WORDS}`]);
    const ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopId}/evidence`)).loop;
    expect(ev.verdicts[0]?.objections.map((o) => o.text)).toEqual([WORDS]);
    expect((await getJson<ObjectionsResponse>(app, '/objections')).objections).toHaveLength(4);
    expect(
      (await getJson<ObjectionsResponse>(app, `/objections?kind=m09&record=${m09?.id}`)).objections,
    ).toHaveLength(1);

    // 不合格的请求
    expect(
      (await post(app, '/objections', { kind: 'm09', recordId: 'f-nope', text: WORDS })).status,
    ).toBe(400);
    expect(
      (await post(app, '/objections', { kind: 'x', recordId: m09?.id, text: WORDS })).status,
    ).toBe(400);
    expect(
      (await post(app, '/objections', { kind: 'm09', recordId: m09?.id, text: ' ' })).status,
    ).toBe(400);
    expect((await call(app, '/objections?kind=m09')).status).toBe(200);
  });

  it('M15 整理、M05 出选项、查询工具读得到异议；异议本身也算新记录触发整理', async () => {
    const state = newState();
    const { app, mainId, fake } = await startApp(state);
    apps.push(app);
    const first = await startLoop(app, mainId);
    await requestClose(app, first.loopId, 1);
    await confirmAndSettle(app, first.loopId);
    const m15Count = () =>
      fake.opened.filter((s) => s.tools.some((t) => t.name === 'write_current_state')).length;
    expect(m15Count()).toBe(1);

    const m09 = (await getJson<FormationsResponse>(app, '/m09/records')).records[0];
    const st = (await getJson<StateResponse>(app, '/m15/state')).records[0];
    const NOTE_M15 = '我没说过累，是随口一说';
    const NOTE_M09 = '这条记录把我学得太好了';
    await post(app, '/objections', { kind: 'm15', recordId: st?.id, text: NOTE_M15 });
    await post(app, '/objections', { kind: 'm09', recordId: m09?.id, text: NOTE_M09 });

    // 下一张选项（自动出的那张还没选）：先选掉它，再没学就结束；这时没有新的学习者的话，只有异议是新的
    const card = await latestCard(app, mainId);
    const second = (await (await post(app, `/cards/${card}/choose`, { option: 0 })).json()) as {
      loopSessionId: string;
    };
    await settled(app, second.loopSessionId);
    const mark = (await records(app, mainId)).at(-1)?.line ?? 0;
    expect((await post(app, `/sessions/${second.loopSessionId}/end`)).status).toBe(202);
    await app.studium.settled();

    // M15 又整了一次，开场里有异议
    expect(m15Count()).toBe(2);
    const opening = fake.inputs.filter(
      (i) => i.text.includes('触发原因') && i.text.includes('当前状态'),
    );
    expect(opening.at(-1)?.text).toContain(NOTE_M15);
    expect(opening.at(-1)?.text).toContain('异议');
    // M05 出的新选项，开场里有两条异议
    await waitFor('出了新的选项', async () =>
      (await records(app, mainId)).some((r) => r.record.type === 'choice_card' && r.line > mark),
    );
    const m05Opening = fake.inputs.filter(
      (i) => i.text.includes('触发原因') && i.text.includes('方向目标'),
    );
    expect(m05Opening.at(-1)?.text).toContain(NOTE_M09);
    expect(m05Opening.at(-1)?.text).toContain(NOTE_M15);

    // 查询工具：查 M09、查状态时，记录后面附着学习者的异议
    const run = async (tool: string, args: Record<string, unknown>) => {
      for (const spec of [...fake.opened].reverse()) {
        const t = spec.tools.find((x) => x.name === tool);
        if (t) return (await t.run(args)).text;
      }
      throw new Error(`没有开过带 ${tool} 的会话`);
    };
    expect(await run('query_m09', {})).toContain(NOTE_M09);
    expect(await run('query_state', { detail: true })).toContain(NOTE_M15);
    expect(await run('read_state_records', {})).toContain(NOTE_M15);
  });

  it('没有异议也没有新话时，M15 不整理', async () => {
    const state = newState();
    const { app, mainId, fake } = await startApp(state);
    apps.push(app);
    const first = await startLoop(app, mainId);
    await requestClose(app, first.loopId, 1);
    await confirmAndSettle(app, first.loopId);
    const card = await latestCard(app, mainId);
    const second = (await (await post(app, `/cards/${card}/choose`, { option: 0 })).json()) as {
      loopSessionId: string;
    };
    await settled(app, second.loopSessionId);
    await post(app, `/sessions/${second.loopSessionId}/end`);
    await app.studium.settled();
    expect(
      fake.opened.filter((s) => s.tools.some((t) => t.name === 'write_current_state')),
    ).toHaveLength(1);
  });
});

/** 主对话里最近贴出的一张选项（合上后自动出的那张）。 */
async function latestCard(app: App, mainId: string): Promise<string> {
  const card = (await records(app, mainId)).filter((r) => r.record.type === 'choice_card').at(-1);
  if (card?.record.type !== 'choice_card') throw new Error('主对话里没有选项');
  return card.record.cardId;
}
