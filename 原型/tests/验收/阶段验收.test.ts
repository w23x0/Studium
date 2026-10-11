// 验收：阶段性练习体验——日常练习与阶段验收分开（M03:20，第二梯队）。只经 HTTP 验证，模型是假模型。
// - M05 可以出“阶段验收”类选项（单子上标 stageCheck），选后开一个验收闭环；
// - 验收闭环里布置的练习都标阶段验收、默认不给提示；日常闭环里默认可以给提示；
// - 守卫照常判合上：做完验收题不等于合上。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type {
  CardResponse,
  LoopEvidenceResponse,
  ProjectOverviewResponse,
} from '../../src/shared/protocol.ts';
import { getJson, post } from '../helpers/http.ts';
import { requestClose } from '../helpers/evidence-flow.ts';
import {
  assignGenerated,
  AVG_VELOCITY_OPTION,
  newPractice,
  openLoop,
  practiceTask,
  runTask,
  startPractice,
} from '../helpers/practice-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const STAGE_OPTION = {
  ...AVG_VELOCITY_OPTION,
  stage_check: true,
  title: '阶段验收：平均速度',
  reason: '前面学了位移和速度，做一次验收',
};

async function start() {
  const st = newPractice();
  st.cardOptions = [AVG_VELOCITY_OPTION, STAGE_OPTION];
  const s = await startPractice(st);
  apps.push(s.app);
  return { st, ...s };
}

describe('阶段验收', () => {
  it('M05 出阶段验收选项：卡上、项目页和依据里都标着，开场说明这是验收', async () => {
    const { app, mainId, fake } = await start();
    const day = await openLoop(app, mainId, 0);
    const stage = await openLoop(app, mainId, 1);
    const card = (await getJson<CardResponse>(app, `/cards/${stage.cardId}`)).card;
    expect(card.options.map((o) => o.ticket.stageCheck === true)).toEqual([false, true]);

    const opening = fake.inputs.filter((i) => i.text.includes('本闭环的单子')).at(-1)?.text ?? '';
    expect(opening).toContain('阶段验收闭环');
    expect(opening).toContain('默认不给提示');
    const dayOpening =
      fake.inputs.filter((i) => i.text.includes('本闭环的单子')).at(-2)?.text ?? '';
    expect(dayOpening).not.toContain('阶段验收闭环');

    const ov = (await getJson<ProjectOverviewResponse>(app, `/projects/${mainId}/overview`))
      .overview;
    const briefs = Object.fromEntries(
      ov.groups.inProgress.map((b) => [b.sessionId, b.stageCheck === true]),
    );
    expect(briefs).toEqual({ [day.loopId]: false, [stage.loopId]: true });
    const ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${stage.loopId}/evidence`)).loop;
    expect(ev.ticket?.stageCheck).toBe(true);
  });

  it('验收闭环里布置的练习自动标阶段验收、默认不给提示；日常闭环默认可以给提示', async () => {
    const { st, app, mainId } = await start();
    const day = await openLoop(app, mainId, 0);
    const stage = await openLoop(app, mainId, 1);
    const d = await practiceTask(app, day.loopId, await assignGenerated(app, st, day.loopId));
    expect(d).toMatchObject({ stageCheck: false, hintsAllowed: true });
    const s = await practiceTask(app, stage.loopId, await assignGenerated(app, st, stage.loopId));
    expect(s).toMatchObject({ stageCheck: true, hintsAllowed: false });
    expect((await post(app, `/loops/${stage.loopId}/practice/${s.id}/hint`)).status).toBe(400);
    // 日常闭环里教学侧可以把某道题标成阶段验收（stage_check），同样默认不给提示
    const marked = await practiceTask(
      app,
      day.loopId,
      await assignGenerated(app, st, day.loopId, { stage_check: true }),
    );
    expect(marked).toMatchObject({ stageCheck: true, hintsAllowed: false });
  });

  it('守卫照常判：验收题做完不会合上闭环，要合上仍须学习者申请、守卫判', async () => {
    const { st, app, mainId } = await start();
    st.detour.flow.guardClosed = false;
    const stage = await openLoop(app, mainId, 1);
    await runTask(app, st, stage.loopId, '位移是 2 米');
    await runTask(app, st, stage.loopId, '位移是 3 米');
    let ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${stage.loopId}/evidence`)).loop;
    expect(ev.verdicts).toHaveLength(0);
    expect(ev.status).toBe('in_progress');
    await requestClose(app, stage.loopId, 1);
    ev = (await getJson<LoopEvidenceResponse>(app, `/loops/${stage.loopId}/evidence`)).loop;
    expect(ev.verdicts).toHaveLength(1);
    expect(ev.verdicts[0]?.closed).toBe(false);
    expect(ev.status).toBe('in_progress');
  });
});
