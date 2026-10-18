// 验收（W6）：依据面板读的视图（docs/设计/00-定位与原则.md §7 横切 5“产出可见”；会话/守卫.md §4–§5；
// 记录/单子与路线.md「单子」「路线决定与理由」「没合上那次的上层」）：选项与学习的单子按文字给、出处回查好；
// 卡带这次的路线决定与理由（依据回查、新决定出来后旧的标已被取代）；守卫判定带实际理解、证据强度、依据行原话与模型；
// 没合上那次带结束原话与导航当时的路线决定；旧的分叉 / 小卡 / 停车 / 强度字段不再出现。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { FakeModel } from '../../src/core/model/fake.ts';
import {
  AT_LINE,
  BOOK_LINE,
  MODEL_ADDED_CLAIM,
  ROUTE_DECISION,
  SAY,
  UNDERSTANDING,
  boot,
  cardAfterLoop,
  choose,
  closeAndConfirm,
  endUnclosed,
  getOk,
  newFlow,
  requestCard,
  rows,
  say,
  type Loose,
} from './共用/w6-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

interface SourceLoose {
  raw: string;
  kind: string;
  resolved: boolean;
}
interface RouteDecisionLoose {
  line: number;
  decision: string;
  reason: string;
  trigger: string;
  basis: SourceLoose[];
  superseded: boolean;
}
interface CardLoose {
  routeDecision?: RouteDecisionLoose;
  /** 单子平铺：Ticket 的字段（按改后的）+ refs（出处回查）+ edits（改动行）。 */
  options: { ticket: Loose & { refs: SourceLoose[]; edits: unknown[] } }[];
}

const END_NOTE = '今天先到这，想先看看别的';
const DIAGNOSIS = '学习者能用自己的话说位移，还没换过情境';

async function cardView(app: App, cardId: string): Promise<CardLoose> {
  return (await getOk<{ card: CardLoose }>(app, `/cards/${cardId}`)).card;
}

async function loopView(app: App, loopId: string): Promise<Loose> {
  return (await getOk<{ loop: Loose }>(app, `/loops/${loopId}/evidence`)).loop;
}

/** 主对话里同一导航会话写的那条路线决定的行号。 */
async function routeDecisionLine(app: App, mainId: string, cardId: string): Promise<number> {
  const main = await rows(app, mainId);
  const card = main.find((r) => r.record.type === 'choice_card' && r.record.cardId === cardId);
  const nav = card?.record.navSessionId ?? card?.record.m05SessionId;
  return (
    main.find((r) => r.record.type === 'route_decision' && r.record.navSessionId === nav)?.line ?? 0
  );
}

describe('依据面板读的视图', () => {
  it('卡：单子是文字、出处回查好；带路线决定与理由；新决定出来后旧的标已被取代', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const cardId = await requestCard(app, mainId);
    let card = await cardView(app, cardId);
    const rdLine = await routeDecisionLine(app, mainId, cardId);
    expect(rdLine, '主对话里有这张卡的路线决定').toBeGreaterThan(0);
    expect(card.routeDecision, '卡带这次的路线决定与理由').toMatchObject({
      line: rdLine,
      decision: ROUTE_DECISION.decision,
      reason: ROUTE_DECISION.reason,
      superseded: false,
    });
    expect(typeof card.routeDecision?.trigger, '带触发原因').toBe('string');
    expect(card.routeDecision?.basis, '依据回查成书里那一行').toMatchObject([
      { raw: BOOK_LINE, kind: 'book_line', resolved: true },
    ]);

    const t = card.options[0]?.ticket;
    expect(t, '选项的单子是文字原样').toMatchObject({
      newPoint: 'p-displacement',
      clause: 'c-disp-from-pos',
      startPoints: [{ point: 'p-position', source: '假定' }],
      sourceCheck: [
        { claim: '书里把位置的变化量叫位移', at: AT_LINE },
        { claim: MODEL_ADDED_CLAIM, modelAdded: true },
      ],
    });
    expect(
      t?.refs.find((r) => r.raw === AT_LINE),
      '对资料核的出处回查好、可点开原文',
    ).toMatchObject({ kind: 'book_line', resolved: true });
    expect(t?.edits, '还没改过').toEqual([]);

    // 开一次学习、合上：之后导航出新卡、写新的路线决定 → 这张卡的路线决定标已被取代
    const loopId = await choose(app, cardId, 0);
    await say(app, loopId, flow);
    await closeAndConfirm(app, loopId);
    await cardAfterLoop(app, loopId);
    card = await cardView(app, cardId);
    expect(card.routeDecision?.superseded, '新决定出来后旧的标已被取代').toBe(true);
  });

  it('合上的学习：单子与出处、判定的实际理解 + 证据强度 + 原话 + 模型；旧字段不再出现', async () => {
    const flow = newFlow();
    flow.diagnosis = DIAGNOSIS;
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await choose(app, await requestCard(app, mainId), 0);
    const line = await say(app, loopId, flow);
    await closeAndConfirm(app, loopId);

    const ev = await loopView(app, loopId);
    const ticket = ev.ticket as (Loose & { refs?: SourceLoose[] }) | undefined;
    expect(ticket?.newPoint, '学习的单子是文字').toBe('p-displacement');
    expect(ticket?.refs?.find((r) => r.raw === AT_LINE)?.resolved, '单子里的出处回查好').toBe(true);

    const verdicts = ev.verdicts as Loose[];
    const v = verdicts.at(-1);
    expect(v?.model, '判定带实际执行的模型').toMatchObject({
      name: FakeModel.MODEL_NAME,
      known: true,
    });
    const u = (v?.understanding as Loose[] | undefined)?.[0];
    expect(u, '判定带学习者实际表现出的理解与证据强度').toMatchObject({
      text: UNDERSTANDING,
      lines: [line],
      independence: '独立',
      durability: '仅当场',
    });
    expect(u?.quotes, '每条理解带依据行的原话').toMatchObject([{ line, text: SAY }]);

    for (const k of ['fork', 'forks', 'signals', 'detours', 'parking', 'waitingFork']) {
      expect(Object.keys(ev), `依据视图里没有旧字段 ${k}`).not.toContain(k);
    }
    const diagnoses = ev.diagnoses as Loose[];
    expect(
      diagnoses.map((d) => d.text),
      '诊断来自工作区 诊断.md 的沙盒动作',
    ).toEqual([DIAGNOSIS]);
    for (const d of diagnoses) {
      expect(Object.keys(d).sort(), '诊断只有行号、时间、文字').toEqual(['at', 'line', 'text']);
    }
    expect(JSON.stringify(ev), '依据视图里没有知识点编号与分析层').not.toMatch(
      /m08_|m09_|intensity|regression|formation/,
    );
  });

  it('没合上的学习：带结束原话与导航当时的路线决定（依据回查）', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const loopId = await choose(app, await requestCard(app, mainId), 1);
    await say(app, loopId, flow);
    await endUnclosed(app, loopId, END_NOTE);
    const nextCard = await cardAfterLoop(app, loopId);
    const rdLine = await routeDecisionLine(app, mainId, nextCard);

    const ev = await loopView(app, loopId);
    expect(ev.status, '没合上').toBe('unclosed');
    expect(ev.endNote, '结束原话').toBe(END_NOTE);
    expect(ev.routeDecision, '导航当时的路线决定与理由').toMatchObject({
      line: rdLine,
      decision: ROUTE_DECISION.decision,
      reason: ROUTE_DECISION.reason,
      basis: [{ raw: BOOK_LINE, resolved: true }],
    });
    expect(String((ev.routeDecision as Loose).trigger), '触发是“没合上”').toMatch(/^没合上/);
    expect(ev.verdicts, '没合上没有判定').toEqual([]);
  });
});
