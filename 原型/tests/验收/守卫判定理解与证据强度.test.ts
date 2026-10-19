// 验收（W2）：守卫判定 v2（docs/设计/会话/守卫.md §3–§4；记录/学过的记录.md「守卫判定」）。
// 判合上必须带“学习者实际表现出的理解”understanding[]（每条指回学习者的行 + 独立程度 + 仅当场 / 含变式 / 含延迟），
// 行号由程序核对（同证据行，只认学习者的行）；判定记录存 understanding 与守卫这一轮实际执行的模型。只经 HTTP，假模型。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import { records } from '../helpers/http.ts';
import {
  UNDERSTANDING,
  boot,
  newFlow,
  openLoop,
  requestClose,
  say,
  type Loose,
} from './共用/w2-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

/** 守卫会话里被退回的那几次 submit_verdict（工具调用记录）。 */
async function rejectedCalls(app: App, guardId: string): Promise<Loose[]> {
  return (await records(app, guardId))
    .map((r) => r.record as unknown as Loose)
    .filter((r) => r.type === 'tool_call' && r.name === 'submit_verdict' && r.isError === true);
}

const good = (line: number): Loose => ({
  closed: true,
  basis: `学习者换了情境自己说清（L${String(line)}）`,
  evidence_lines: [line],
  understanding: [
    { text: UNDERSTANDING, lines: [line], independence: '提示后', durability: '含变式' },
  ],
});

describe('守卫判定：实际理解与证据强度', () => {
  it('判合上却不带 understanding：被退回，这次不算合上', async () => {
    const flow = newFlow();
    flow.guard = (line) => [{ closed: true, basis: `见 L${String(line)}`, evidence_lines: [line] }];
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await say(app, loopId, flow);
    const v = (await requestClose(app, loopId)).record as unknown as Loose;
    expect(v.closed, '没写实际理解的“合上”不能算合上').toBe(false);
    expect(
      (await rejectedCalls(app, String(v.guardSessionId))).length,
      '守卫那次提交被工具退回（isError）',
    ).toBe(1);
  });

  it('理解指到不是学习者的行（教学的行 / 不存在的行）：被退回；改对后重交才收', async () => {
    const flow = newFlow();
    let teachLine = 0;
    flow.guard = (line) => [
      {
        ...good(line),
        understanding: [
          { text: UNDERSTANDING, lines: [teachLine], independence: '独立', durability: '仅当场' },
        ],
      },
      {
        ...good(line),
        understanding: [
          { text: UNDERSTANDING, lines: [line, 9999], independence: '独立', durability: '仅当场' },
        ],
      },
      good(line),
    ];
    const { app, mainId, fake } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await say(app, loopId, flow);
    teachLine =
      (await records(app, loopId)).find((r) => r.record.type === 'assistant_message')?.line ?? 0;
    expect(teachLine, '学习对话里有一行教学的话').toBeGreaterThan(0);

    const vr = await requestClose(app, loopId);
    const v = vr.record as unknown as Loose;
    expect(
      (await rejectedCalls(app, String(v.guardSessionId))).length,
      '前两次（指到教学行、指到不存在的行）都被退回',
    ).toBe(2);
    expect(v.closed, '第三次合格，判定收下').toBe(true);
    expect(v.understanding, '判定记录里存着学习者实际表现出的理解与证据强度').toEqual([
      {
        text: UNDERSTANDING,
        lines: [flow.evidenceLine],
        independence: '提示后',
        durability: '含变式',
      },
    ]);
    expect(v.lines, '证据行照旧存').toEqual([flow.evidenceLine]);
    expect(v.model, '判定记下守卫这一轮实际执行的模型（不是适配器名）').toBe(FakeModel.MODEL_NAME);
    expect(
      fake.opened.some((s) => s.tools.some((t) => t.name === 'submit_verdict')),
      '守卫照常开',
    ).toBe(true);
  });

  it('独立程度 / 持久程度不在规定的几档里：被退回', async () => {
    const flow = newFlow();
    flow.guard = (line) => [
      {
        ...good(line),
        understanding: [
          { text: UNDERSTANDING, lines: [line], independence: '很独立', durability: '仅当场' },
        ],
      },
      {
        ...good(line),
        understanding: [
          { text: UNDERSTANDING, lines: [line], independence: '独立', durability: '永久' },
        ],
      },
      {
        ...good(line),
        understanding: [{ text: '  ', lines: [line], independence: '独立', durability: '仅当场' }],
      },
    ];
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await say(app, loopId, flow);
    const v = (await requestClose(app, loopId)).record as unknown as Loose;
    expect(
      (await rejectedCalls(app, String(v.guardSessionId))).length,
      '三次都不合格，都被退回',
    ).toBe(3);
    expect(v.closed, '没有合格的提交，不算合上').toBe(false);
  });

  it('判没合上可以不写理解；写了也照样核对行号并存下', async () => {
    const flow = newFlow();
    flow.guard = (line) => [
      {
        closed: false,
        basis: '只复述了讲过的，还没换情境',
        evidence_lines: [],
        understanding: [
          { text: '能复述定义', lines: [line], independence: '答案暴露后', durability: '仅当场' },
        ],
      },
    ];
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await openLoop(app, mainId, flow);
    await say(app, loopId, flow);
    const v = (await requestClose(app, loopId)).record as unknown as Loose;
    expect(v.closed, '判了没合上').toBe(false);
    expect(v.problem, '这份是守卫正常交的，不是程序兜底').toBeUndefined();
    expect(v.understanding, '没合上时写的理解也存下').toEqual([
      {
        text: '能复述定义',
        lines: [flow.evidenceLine],
        independence: '答案暴露后',
        durability: '仅当场',
      },
    ]);
    expect(v.model, '判定记下实际执行的模型').toBe(FakeModel.MODEL_NAME);
  });
});
