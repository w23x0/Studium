// 验收：M15 的“已确认”档与“出现在 X 之后”标注，以及 M10 的自查。
// - 学习者可对一条状态记录确认 / 否认（只追加，原记录不动）；确认过的记录来源档是“已确认”；
// - 教法强度明显变化的位置由程序算出交给 M15；M15 写记录时可标“出现在 X 之后”（程序核对 X 真有）；
// - M10 记录时开场列出带标注的状态记录，有的话必须写自查（structural，不靠提示词）。只经 HTTP 验证。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ConfirmationResponse,
  StateResponse,
  StrategiesResponse,
} from '../../src/shared/protocol.ts';
import type { NumberedRecord } from '../../src/shared/records.ts';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { settled } from '../helpers/evidence-flow.ts';
import { DISPLACEMENT_OPTION, learnerLine, roleOf } from '../helpers/roles.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const HIGH_HINT = { info: '中', hint: '高', challenge: '低', pace: '慢', lean: '输入' };
const LOW_HINT = { info: '中', hint: '低', challenge: '低', pace: '慢', lean: '输入' };

function responder(ctx: FakeContext): FakeStep | undefined {
  const t = ctx.input.text;
  switch (roleOf(ctx)) {
    case 'm05':
      return {
        calls: [
          { name: 'submit_choice_card', args: { options: [DISPLACEMENT_OPTION], recommended: 0 } },
        ],
      };
    case 'loop':
      if (t.includes('先给提示')) {
        return {
          calls: [{ name: 'write_diagnosis', args: { text: '卡住', ...HIGH_HINT } }],
          text: '提示：想想位置变了没有。',
        };
      }
      if (t.includes('我自己来')) {
        return {
          calls: [{ name: 'write_diagnosis', args: { text: '能自己做', ...LOW_HINT } }],
          text: '你来。',
        };
      }
      return { text: '我们开始。' };
    case 'm15': {
      if (ctx.input.role !== 'program') return { text: '好' };
      const loopId = /一段学习 (\S+)「/.exec(t)?.[1] ?? '';
      const line = learnerLine(t, '有点累');
      if (line === 0) return { text: '没有新的可记' };
      const change = /变化编号：(\S+)/.exec(t)?.[1];
      const base = {
        text: '学习者说有点累',
        source: '自述',
        output_type: '承载读数',
        time_range: '本次会话',
        refs: [{ session: loopId, lines: [line] }],
      };
      return {
        calls: [
          ...(change !== undefined
            ? [
                { name: 'write_state_record', args: { ...base, after_change: '不存在的编号' } },
                { name: 'write_state_record', args: { ...base, after_change: change } },
              ]
            : [{ name: 'write_state_record', args: base }]),
          {
            name: 'write_current_state',
            args: { text: '今天有点累（自述）', stage: '证据不足', basis_span: '本次会话' },
          },
        ],
      };
    }
    case 'm10': {
      if (ctx.input.role !== 'program') return { text: '好' };
      const base = {
        conditions: '状态见 M15',
        strategies: '先给提示后放手',
        followed_by: '待观察',
        evidence_lines: [1],
      };
      return t.includes('自查')
        ? {
            calls: [
              { name: 'write_strategy_record', args: base },
              {
                name: 'write_strategy_record',
                args: {
                  ...base,
                  self_check: '累是在提示降到低之后出现的，先怀疑是撤得太快，不当作他固有的状态',
                },
              },
            ],
          }
        : { calls: [{ name: 'write_strategy_record', args: base }] };
    }
    default:
      return undefined;
  }
}

async function openLoop(app: App, mainId: string, nth: number): Promise<string> {
  await post(app, '/cards/request', { projectId: mainId });
  const card = await waitFor('出了新选项', async () => {
    const cards = (await records(app, mainId)).flatMap((r) =>
      r.record.type === 'choice_card' ? [r.record.cardId] : [],
    );
    return cards.length >= nth ? cards.at(-1) : undefined;
  });
  const loopId = (
    (await (await post(app, `/cards/${card}/choose`, { option: 0 })).json()) as {
      loopSessionId: string;
    }
  ).loopSessionId;
  await settled(app, loopId);
  return loopId;
}

async function say(app: App, id: string, text: string): Promise<void> {
  await post(app, `/sessions/${id}/messages`, { text });
  await settled(app, id);
}

async function sessionOpening(app: App, kind: string, nth: number): Promise<string> {
  const s = await waitFor(
    `第 ${String(nth)} 个 ${kind} 会话`,
    async () =>
      (
        await getJson<{ sessions: { sessionId: string; kind: string; openedAt: string }[] }>(
          app,
          '/sessions',
        )
      ).sessions
        .filter((x) => x.kind === kind)
        .sort(
          (a, b) => a.openedAt.localeCompare(b.openedAt) || a.sessionId.localeCompare(b.sessionId),
        )[nth - 1],
  );
  const recs = await settled(app, s.sessionId);
  const open = recs.find((r: NumberedRecord) => r.record.type === 'program_fact');
  return open?.record.type === 'program_fact' ? open.record.text : '';
}

describe('M15 已确认 · 出现在 X 之后 · M10 自查', () => {
  it('确认 / 否认只追加；教法强度明显变化后的状态带标注；M10 看到标注必须自查', async () => {
    const dataRoot = await tempDir();
    const app = await createApp({
      dataRoot,
      model: new FakeModel({ responder }),
      token: TOKEN,
      port: 0,
    });
    apps.push(app);
    const mainId = await app.studium.ensureMain();

    // 闭环 1：提示强度从高放到低（两档），学习者说累
    const loop1 = await openLoop(app, mainId, 1);
    await say(app, loop1, '先给提示');
    await say(app, loop1, '我自己来');
    await say(app, loop1, '我今天有点累');
    expect((await post(app, `/sessions/${loop1}/end`)).status).toBe(202);
    await app.studium.settled();

    // M15 开场有程序算出的变化位置，不含诊断文字
    const m15Opening = await sessionOpening(app, 'm15', 1);
    expect(m15Opening).toContain('变化编号');
    expect(m15Opening).toContain('提示强度');
    expect(m15Opening).not.toContain('卡住');
    expect(m15Opening).not.toContain('能自己做');

    // 记录：编号不对的写不进去；对的带标注
    const state = await getJson<StateResponse>(app, '/m15/state');
    expect(state.records).toHaveLength(1);
    const rec = state.records[0];
    expect(rec?.afterTeaching?.loopSessionId).toBe(loop1);
    expect(rec?.afterTeaching?.text).toContain('提示强度');
    expect(rec?.afterTeaching?.text).toContain('高');
    expect(rec?.sourceLevel).toBe('自述');
    const id = rec?.id ?? '';

    // 确认：只追加，原记录不动，来源档变“已确认”，原来源还在
    const file = join(dataRoot, 'knowledge', 'm15', 'records.jsonl');
    const before = await readFile(file, 'utf8');
    const ok = await post(app, '/m15/confirmations', { recordId: id, verdict: 'confirm' });
    expect(ok.status).toBe(201);
    expect(((await ok.json()) as ConfirmationResponse).confirmation.verdict).toBe('确认');
    expect(await readFile(file, 'utf8')).toBe(before);
    let now = (await getJson<StateResponse>(app, '/m15/state')).records[0];
    expect(now?.sourceLevel).toBe('已确认');
    expect(now?.source).toBe('自述');
    expect(now?.learnerVerdict).toBe('确认');

    // 否认：再追加一条，最新的算数；来源档回到原来源
    await post(app, '/m15/confirmations', { recordId: id, verdict: 'deny', note: '其实不累' });
    now = (await getJson<StateResponse>(app, '/m15/state')).records[0];
    expect(now?.confirmations.map((c) => c.verdict)).toEqual(['确认', '否认']);
    expect(now?.learnerVerdict).toBe('否认');
    expect(now?.sourceLevel).toBe('自述');
    await post(app, '/m15/confirmations', { recordId: id, verdict: 'confirm' });

    // 不合规的请求
    expect(
      (await post(app, '/m15/confirmations', { recordId: 'st-不存在', verdict: 'confirm' })).status,
    ).toBe(400);
    expect((await post(app, '/m15/confirmations', { recordId: id, verdict: '随便' })).status).toBe(
      400,
    );

    // 闭环 2：另一段学习里查得到“已确认”，M10 看到标注必须自查
    const loop2 = await openLoop(app, mainId, 2);
    await say(app, loop2, '我今天有点累');
    expect((await post(app, `/sessions/${loop2}/end`)).status).toBe(202);
    await app.studium.settled();

    // 第二次整理的开场带上了学习者的确认
    const m15Opening2 = await sessionOpening(app, 'm15', 2);
    expect(m15Opening2).toContain('确认');
    expect(m15Opening2).toContain(id);

    const m10Opening2 = await sessionOpening(app, 'm10', 2);
    expect(m10Opening2).toContain('出现在');
    expect(m10Opening2).toContain('自查');
    expect(m10Opening2).toContain(id);
    const m10 = await getJson<StrategiesResponse>(app, `/m10/records?loop=${loop2}`);
    expect(m10.records).toHaveLength(1);
    expect(m10.records[0]?.selfCheck?.stateIds).toContain(id);
    expect(m10.records[0]?.selfCheck?.note).toContain('撤得太快');

    // 没有带标注的状态时（闭环 1 的 M10 开场在 M15 写之前）不要求自查
    const none = await getJson<StrategiesResponse>(app, `/m10/records?loop=${loop1}`);
    expect(none.records).toHaveLength(1);
  });
});
