// 评测目录：每个失败模式一条，判定过 / 不过。失败模式取自审查单与 03 里“必须每次成立”的规矩。
import { learnerLines } from '../src/core/transcript.ts';
import type { EvalCase, EvalRun, Verdict } from './types.ts';

/** 学习者看得到的话里不该出现的内部词（与验收“界面文字”同一口径）。 */
export const INTERNAL_WORDS = [
  '闭环',
  '选择卡',
  '守卫',
  '出发点',
  '子句',
  '新点',
  '单子',
  'M0',
  'M1',
];

function teachingTexts(run: EvalRun): string[] {
  return [...run.loop, ...run.main].flatMap((r) =>
    r.record.type === 'assistant_message' ? [r.record.text] : [],
  );
}

const PLAIN = '你是刚开始学物理的学生，回答简短，有时说“不知道”，不会主动讲很多。';

export const CASES: EvalCase[] = [
  {
    id: '不替学习者做那一步',
    failureMode:
      '教学替学习者做掉本该由学习者做的那一步（M02 / 03「教学工具怎么落」必须每次成立的规矩）',
    student: { persona: PLAIN, turns: 3 },
    finish: 'none',
    judges: [
      {
        id: '没替学习者做',
        kind: 'model',
        rubric:
          '读闭环对话原文：教学有没有替学习者做掉本该由学习者做的那一步（直接给出完整答案或推导结论，学习者只需点头）。有就不过，并指出行号。',
      },
    ],
  },
  {
    id: '一轮停在一个问题',
    failureMode: '一轮话没停在第一个需要学习者回答的地方（一轮抛多个问题，或问完又自己往下讲）',
    student: { persona: PLAIN, turns: 3 },
    finish: 'none',
    judges: [
      {
        id: '每轮停在第一个问题',
        kind: 'model',
        rubric:
          '读闭环对话原文：教学的每一轮话是否停在第一个需要学习者回答的地方。一轮里抛出多个要回答的问题、或问完又自己接着讲，就不过，并指出行号。',
      },
    ],
  },
  {
    id: '自述懂了不算合上',
    failureMode: '学习者只说“我懂了”、说不出所以然，闭环却被判合上（M04「不降门槛」）',
    student: { persona: '你很快就说“我懂了”，但被追问时说不出所以然。', turns: 2 },
    finish: 'request_close',
    judges: [
      {
        id: '守卫判未合上',
        kind: 'program',
        check: (run): Verdict =>
          run.verdict === undefined
            ? { pass: false, reason: '没有守卫判定' }
            : run.verdict.closed
              ? { pass: false, reason: `只凭自述就判了合上：${run.verdict.basis}` }
              : { pass: true, reason: '判未合上' },
      },
    ],
  },
  {
    id: '不露内部词',
    failureMode: '给学习者的话里露出内部词（闭环、选择卡、守卫、出发点、子句、模块名）',
    student: { persona: PLAIN, turns: 3 },
    finish: 'none',
    judges: [
      {
        id: '没有内部词',
        kind: 'program',
        check: (run): Verdict => {
          const leaks = teachingTexts(run).filter((t) => INTERNAL_WORDS.some((w) => t.includes(w)));
          return leaks.length === 0
            ? { pass: true, reason: '没有' }
            : { pass: false, reason: `露出：${leaks[0]?.slice(0, 60) ?? ''}` };
        },
      },
    ],
  },
  {
    id: '证据只认学习者的行',
    failureMode: '守卫拿教学讲解的行当证据（00 原则 7、8）',
    student: { persona: '你认真回答，能用自己的话说出“位移就是终点减起点”。', turns: 2 },
    finish: 'request_close',
    judges: [
      {
        id: '证据行都是学习者的',
        kind: 'program',
        check: (run): Verdict => {
          if (!run.verdict) return { pass: false, reason: '没有守卫判定' };
          const learner = learnerLines(run.loop);
          const bad = run.verdict.lines.filter((l) => !learner.has(l));
          if (bad.length > 0) return { pass: false, reason: `第 ${bad.join('、')} 行不是学习者的` };
          if (run.verdict.closed && run.verdict.lines.length === 0) {
            return { pass: false, reason: '判合上却没引证据行' };
          }
          return { pass: true, reason: '都是学习者的行' };
        },
      },
    ],
  },
];
