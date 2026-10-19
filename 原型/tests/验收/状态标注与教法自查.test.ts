// 验收（W4，取代“状态确认与教法标注”）：教法强度四项删了以后，状态记录的“出现在教法某处之后”标注改为指回学习对话里的
// 一句教学（程序核对它确是教学行）；学习者确认 / 否认只追加；教法记录整理看到带标注的状态必须写自查。
// 设计：记录/状态记录.md「边界」策略造成的状态；会话/后台整理.md「教法记录整理」先查自身；工单 W4 §5.11。
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { StateResponse } from '../../src/shared/protocol.ts';
import { getJson, post } from '../helpers/http.ts';
import {
  cardStep,
  learnerLine,
  openLearning,
  programInputs,
  roleOf,
  say,
  settled,
  start,
  teachingLine,
} from './共用/w4-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

interface AfterTeachingLoose {
  loopSessionId: string;
  line: number;
  text: string;
}

describe('状态标注与教法自查', () => {
  it('标注指回教学行才收；确认 / 否认只追加；教法记录整理见到标注必须自查', async () => {
    const { app, fake, dataRoot, world } = await start((ctx, w) => {
      const t = ctx.input.text;
      switch (roleOf(ctx.spec)) {
        case 'nav':
          return cardStep(w);
        case 'loop':
          if (t.includes('先给提示')) return { text: '提示：想想位置变了没有。' };
          return { text: '我们开始。' };
        case 'state': {
          if (ctx.input.role !== 'program') return { text: '好' };
          const loopId = /一段学习 (\S+)「/.exec(t)?.[1] ?? '';
          const tired = learnerLine(t, '有点累');
          if (tired === 0) return { text: '没有新的可记' };
          const base = {
            text: '学习者说有点累',
            source: '自述',
            output_type: '承载读数',
            time_range: '本次会话',
            refs: [{ session: loopId, lines: [tired] }],
          };
          const hint = teachingLine(t, '提示：想想');
          return {
            calls: [
              ...(hint > 0
                ? [
                    {
                      // 指到学习者的行：不是教学行，退回
                      name: 'write_state_record',
                      args: {
                        ...base,
                        after_teaching: {
                          session: loopId,
                          line: learnerLine(t, '先给提示'),
                          note: '逐步给提示之后',
                        },
                      },
                    },
                    {
                      name: 'write_state_record',
                      args: {
                        ...base,
                        after_teaching: { session: loopId, line: hint, note: '逐步给提示之后' },
                      },
                    },
                  ]
                : [{ name: 'write_state_record', args: base }]),
              {
                name: 'write_current_state',
                args: { text: '今天有点累（自述）', stage: '证据不足', basis_span: '本次会话' },
              },
            ],
          };
        }
        case 'pedagogy': {
          if (ctx.input.role !== 'program') return { text: '好' };
          const base = {
            conditions: '状态见状态记录',
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
                    args: { ...base, self_check: '累出现在逐步给提示之后，先怀疑提示给得太碎' },
                  },
                ],
              }
            : { calls: [{ name: 'write_strategy_record', args: base }] };
        }
        default:
          return { text: '好。' };
      }
    });
    apps.push(app);

    // 第一次学习：先要提示（模型给了一句教学），再说累；没合上就结束
    const loop1 = await openLearning(app, world.mainId);
    await say(app, loop1, '先给提示');
    const recs1 = await say(app, loop1, '我今天有点累');
    const hintLine =
      recs1.find((r) => r.record.type === 'assistant_message' && r.record.text.includes('提示：'))
        ?.line ?? 0;
    expect((await post(app, `/sessions/${loop1}/end`)).status).toBe(202);
    await app.studium.settled();

    // 状态整理的开场：不再有“教法强度变化”段
    const stateOpening = programInputs(fake, 'write_state_record')[0] ?? '';
    expect(stateOpening, '开场不再给强度变化编号').not.toContain('变化编号');

    // 指到学习者行的标注被退回；指到教学行的收下
    const state = await getJson<StateResponse>(app, '/state/records');
    expect(state.records, '只记下一条（指错的那次被退回）').toHaveLength(1);
    const rec = state.records[0];
    const after = (rec as unknown as { afterTeaching?: AfterTeachingLoose } | undefined)
      ?.afterTeaching;
    expect(after?.loopSessionId, '标注指回那段学习').toBe(loop1);
    expect(after?.line, '标注指回那句教学').toBe(hintLine);
    expect(after?.text, '标注的说明').toContain('逐步给提示之后');
    const id = rec?.id ?? '';

    // 确认：只追加，原记录不动；来源档“已确认”
    const file = join(dataRoot, 'knowledge', 'state', 'records.jsonl');
    const before = await readFile(file, 'utf8');
    expect(
      (await post(app, '/state/confirmations', { recordId: id, verdict: 'confirm' })).status,
    ).toBe(201);
    expect(await readFile(file, 'utf8'), '确认不改原记录').toBe(before);
    let now = (await getJson<StateResponse>(app, '/state/records')).records[0];
    expect(now?.sourceLevel).toBe('已确认');
    await post(app, '/state/confirmations', { recordId: id, verdict: 'deny', note: '其实不累' });
    now = (await getJson<StateResponse>(app, '/state/records')).records[0];
    expect(
      now?.confirmations.map((c) => c.verdict),
      '确认 / 否认都留着',
    ).toEqual(['确认', '否认']);
    expect(now?.sourceLevel).toBe('自述');

    // 第二次学习结束后：教法记录整理的开场列出带标注的状态，必须写自查
    const loop2 = await openLearning(app, world.mainId);
    await say(app, loop2, '我今天有点累');
    expect((await post(app, `/sessions/${loop2}/end`)).status).toBe(202);
    await app.studium.settled();
    const openings = programInputs(fake, 'write_strategy_record');
    const second = openings.find((o) => o.includes(loop2)) ?? '';
    expect(second, '开场列出带标注的状态').toContain(id);
    expect(second, '开场要求自查').toContain('自查');
    const pedagogy2 = [...fake.opened]
      .reverse()
      .find((s) => s.tools.some((t) => t.name === 'write_strategy_record'));
    const writes = (await settled(app, pedagogy2?.session?.id ?? '')).flatMap((r) =>
      r.record.type === 'tool_call' && r.record.name === 'write_strategy_record'
        ? [r.record.isError]
        : [],
    );
    expect(writes, '没写自查的被退回，写了的收下').toEqual([true, false]);
  });
});
