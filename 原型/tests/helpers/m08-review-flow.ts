// M08 候选区与更正的验收测试共用：起核心（假模型，样例书库 / 样例 M08），能让写 M09 的会话顺带提候选；
// 走完“开卡 → 学 → 收口 → 确认”让 M09 候选落地。
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, TOKEN } from './http.ts';
import { confirmAndSettle, newState, requestClose, responder, startLoop } from './evidence-flow.ts';
import { learnerLine, roleOf } from './roles.ts';
import { tempDir } from './tmp.ts';
import type {
  CandidateView,
  CorrectionView,
  ReviewCandidatesResponse,
  ReviewCandidateResponse,
  CorrectionResponse,
  CorrectionsResponse,
} from '../../src/shared/m08-review.ts';

/** 写 M09 的会话在写完形成记录后追加的工具调用（给 learnerLine 的行号，测试自己决定提什么）。 */
export type ExtraM09Calls = (learner: number) => { name: string; args: Record<string, unknown> }[];

export async function startReviewApp(
  opts: { dataRoot?: string; extra?: ExtraM09Calls } = {},
): Promise<{ app: App; mainId: string; dataRoot: string }> {
  const dataRoot = opts.dataRoot ?? (await tempDir());
  const base = responder(newState());
  const model = new FakeModel({
    responder: (ctx: FakeContext): FakeStep | undefined => {
      const step = base(ctx);
      if (roleOf(ctx) !== 'm09' || opts.extra === undefined || step?.calls === undefined) {
        return step;
      }
      const line = learnerLine(ctx.input.text, '终点减起点');
      return { ...step, calls: [...step.calls, ...opts.extra(line)] };
    },
  });
  const app = await createApp({ dataRoot, model, token: TOKEN, port: 0 });
  return { app, mainId: await app.studium.ensureMain(), dataRoot };
}

/** 学一个闭环到合上并确认，等写 M09 等后台跑完；返回闭环 id。 */
export async function finishLoop(app: App, mainId: string): Promise<string> {
  const { loopId } = await startLoop(app, mainId);
  await requestClose(app, loopId, 1);
  await confirmAndSettle(app, loopId);
  return loopId;
}

export async function candidates(app: App, query = ''): Promise<CandidateView[]> {
  return (await getJson<ReviewCandidatesResponse>(app, `/m08/candidates${query}`)).candidates;
}

export async function suggestFix(
  app: App,
  target: { kind: 'point' | 'clause'; id: string },
  text: string,
  kind: 'supplement' | 'fix' = 'fix',
): Promise<CandidateView> {
  const res = await post(app, '/m08/suggestions', { target, kind, text });
  if (res.status !== 201) throw new Error(`提建议失败：${String(res.status)}`);
  return ((await res.json()) as ReviewCandidateResponse).candidate;
}

export async function correctionsOf(app: App, query = ''): Promise<CorrectionView[]> {
  return (await getJson<CorrectionsResponse>(app, `/m08/corrections${query}`)).corrections;
}

export async function correct(app: App, body: object): Promise<CorrectionView> {
  const res = await post(app, '/m08/corrections', body);
  if (res.status !== 201) throw new Error(`更正失败：${String(res.status)} ${await res.text()}`);
  return ((await res.json()) as CorrectionResponse).correction;
}
