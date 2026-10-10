// 验收：选项与学习依据里的安排带“复习 / 复检”标记（界面据此在选项、项目概览、学习依据里标出）。
// 只经 HTTP：选择卡视图、项目页“等你选”、闭环依据的开场单子都带 revisit；学新点的不带。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type {
  CardResponse,
  LoopEvidenceResponse,
  ProjectOverviewResponse,
} from '../../src/shared/protocol.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import { openLoop } from '../helpers/detour-flow.ts';
import {
  advanceDays,
  AVG_OPTION,
  DISPLACEMENT_SRC,
  firstFormationId,
  formations,
  hasTool,
  learnAndClose,
  newLong,
  startLong,
} from '../helpers/longterm-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('选项标出复习 / 复检', () => {
  it('选择卡视图、项目页等你选、学习依据的安排都带复检标记；学新点的选项不带', async () => {
    const st = newLong();
    const s = await startLong(st);
    apps.push(s.app);
    const { app, mainId } = s;
    const first = await openLoop(app, mainId, 0);
    await learnAndClose(app, first.loopId);
    const old = (await formations(app, first.loopId))[0];
    advanceDays(st, 20);
    st.override = (ctx) => {
      if (!hasTool(ctx, 'submit_choice_card')) return undefined;
      const id = firstFormationId(ctx.input.text);
      return {
        calls: [
          {
            name: 'submit_choice_card',
            args: {
              options: [
                {
                  ...DISPLACEMENT_SRC,
                  revisit: { kind: '复检', formation_ids: id !== undefined ? [id] : [] },
                },
                AVG_OPTION,
              ],
              recommended: 0,
            },
          },
        ],
      };
    };
    const before = (await records(app, mainId)).at(-1)?.line ?? 0;
    await post(app, '/cards/request', { projectId: mainId });
    const cardId = await waitFor('出了卡', async () => {
      const r = (await records(app, mainId)).find(
        (x) => x.record.type === 'choice_card' && x.line > before,
      );
      return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
    });
    await app.studium.settled();

    const card = (await getJson<CardResponse>(app, `/cards/${cardId}`)).card;
    expect(card.options[0]?.ticket.revisit).toEqual({ kind: '复检', formationIds: [old?.id] });
    expect(card.options[1]?.ticket.revisit).toBeUndefined();

    const o = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`))
      .overview;
    const waiting = o.groups.awaitingChoice.find((c) => c.cardId === cardId);
    expect(waiting?.options[0]?.ticket.revisit?.kind).toBe('复检');

    const res = await post(app, `/cards/${cardId}/choose`, { option: 0 });
    const { loopSessionId } = (await res.json()) as { loopSessionId: string };
    await app.studium.settled();
    const loop = (await getJson<LoopEvidenceResponse>(app, `/loops/${loopSessionId}/evidence`))
      .loop;
    expect(loop.ticket?.revisit).toEqual({ kind: '复检', formationIds: [old?.id] });
    const firstLoop = (await getJson<LoopEvidenceResponse>(app, `/loops/${first.loopId}/evidence`))
      .loop;
    expect(firstLoop.ticket?.revisit).toBeUndefined();
  });
});
