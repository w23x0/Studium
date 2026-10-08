// 评测运行器：每条评测跑 k 次，每次在新的临时数据目录里起一个核心，模拟学生经模型接口多轮对话，
// 然后按判定判过 / 不过；k 次全过才算这条过。
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { createApp } from '../src/core/app.ts';
import type { ModelAdapter } from '../src/core/model/port.ts';
import { renderTranscript } from '../src/core/transcript.ts';
import type { CaseResult, EvalCase, EvalRun, ModelJudge, Verdict } from './types.ts';

export interface EvalModels {
  /** 被评的系统用的模型（每次运行新开一个）。 */
  system: () => ModelAdapter;
  /** 模拟学生。 */
  student: ModelAdapter;
  /** 模型判定。 */
  judge: ModelAdapter;
}

const JUDGE_PROMPT = `你是 Studium 行为评测的判分者。给你一个失败模式的判法和一段闭环对话原文（带行号），判这段对话过还是不过。
只按给的判法判，不加别的标准。用 submit_judgement 交回：过不过、一句理由、相关行号。只交一次。`;

export async function runEvals(opts: {
  cases: EvalCase[];
  k: number;
  models: EvalModels;
}): Promise<CaseResult[]> {
  const out: CaseResult[] = [];
  for (const c of opts.cases) {
    const runs: CaseResult['runs'] = [];
    for (let i = 0; i < opts.k; i++) {
      const run = await runOnce(c, opts.models);
      const verdicts: CaseResult['runs'][number] = [];
      for (const j of c.judges) {
        const v =
          j.kind === 'program' ? j.check(run) : await judgeWithModel(opts.models.judge, j, run);
        verdicts.push({ judge: j.id, ...v });
      }
      runs.push(verdicts);
    }
    out.push({
      id: c.id,
      failureMode: c.failureMode,
      pass: runs.every((r) => r.every((v) => v.pass)),
      runs,
    });
  }
  return out;
}

async function runOnce(c: EvalCase, models: EvalModels): Promise<EvalRun> {
  const dir = await mkdtemp(join(tmpdir(), 'studium-eval-'));
  const app = await createApp({
    dataRoot: dir,
    model: models.system(),
    token: randomBytes(16).toString('hex'),
    port: 0,
  });
  try {
    const { studium, hub } = app;
    const mainId = await studium.ensureMain();
    const card = await studium.requestCard('评测：学习者要下一步', mainId);
    const loopId = await studium.choose(card.cardId, card.recommended);
    await studium.settled();
    const student = models.student.open({ systemPrompt: c.student.persona, tools: [] });
    try {
      for (let t = 0; t < c.student.turns; t++) {
        const teaching = (await hub.records(loopId)).flatMap((r) =>
          r.record.type === 'assistant_message' ? [r.record.text] : [],
        );
        let reply = '';
        for await (const ev of student.send({ role: 'learner', text: teaching.at(-1) ?? '' })) {
          if (ev.kind === 'assistant_text') reply += ev.text;
        }
        if (reply.trim() === '') break;
        await studium.learnerSays(loopId, reply);
        await studium.settled();
      }
    } finally {
      await student.close();
    }
    if (c.finish === 'request_close') {
      await studium.requestClose(loopId, 'learner', '评测：学习者点了“我觉得懂了”');
      await studium.settled();
    }
    const loop = await hub.records(loopId);
    const verdict = loop
      .map((r) => r.record)
      .filter((r) => r.type === 'guard_verdict')
      .at(-1);
    return {
      loop,
      main: await hub.records(mainId),
      verdict: verdict?.type === 'guard_verdict' ? verdict : undefined,
    };
  } finally {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
}

async function judgeWithModel(
  model: ModelAdapter,
  judge: ModelJudge,
  run: EvalRun,
): Promise<Verdict> {
  let verdict: Verdict | undefined;
  const conv = model.open({
    systemPrompt: JUDGE_PROMPT,
    tools: [
      {
        name: 'submit_judgement',
        description: '交回判定：过不过、一句理由、相关行号。',
        input: { pass: z.boolean(), reason: z.string(), lines: z.array(z.number().int()) },
        run: (a) => {
          const lines = a.lines as number[];
          verdict = {
            pass: a.pass as boolean,
            reason: `${a.reason as string}${lines.length > 0 ? `（行 ${lines.join('、')}）` : ''}`,
          };
          return Promise.resolve({ text: '收到' });
        },
      },
    ],
  });
  try {
    const text = [
      `判法：${judge.rubric}`,
      '',
      '闭环对话原文（L 后是行号）：',
      renderTranscript(run.loop),
    ].join('\n');
    for await (const ev of conv.send({ role: 'program', text })) {
      if (ev.kind === 'turn_error') return { pass: false, reason: `判分会话失败：${ev.reason}` };
    }
  } finally {
    await conv.close();
  }
  return verdict ?? { pass: false, reason: '判分会话没交判定' };
}
