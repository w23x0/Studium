// 行为评测（04「质量」P1）：模拟学生多轮、每个失败模式一个过 / 不过判定、看 k 次全过。
// 不进每次提交的门禁（npm run eval 单独跑）；模拟学生与判分都经模型接口（port.ts），现在只接假模型。
import type { GuardVerdict, NumberedRecord } from '../src/shared/records.ts';

/** 一次评测运行留下的东西：闭环对话与主对话的正本、最后一次守卫判定。 */
export interface EvalRun {
  loop: NumberedRecord[];
  main: NumberedRecord[];
  verdict: GuardVerdict | undefined;
}

export interface Verdict {
  pass: boolean;
  reason: string;
}

/** 程序判定：能机械检查的失败模式（内部词、证据行）。 */
export interface ProgramJudge {
  id: string;
  kind: 'program';
  check(run: EvalRun): Verdict;
}

/** 模型判定：要读原文才判得了的失败模式；经模型接口开一个判分会话。 */
export interface ModelJudge {
  id: string;
  kind: 'model';
  /** 判什么：一句话说清“出现什么就算不过”。 */
  rubric: string;
}

export type Judge = ProgramJudge | ModelJudge;

export interface EvalCase {
  id: string;
  /** 这条评测守的失败模式。 */
  failureMode: string;
  student: {
    /** 模拟学生的设定（系统提示）。 */
    persona: string;
    /** 学生说几轮。 */
    turns: number;
  };
  /** 学生说完之后：点“我觉得懂了”，或什么都不做。 */
  finish: 'request_close' | 'none';
  judges: Judge[];
}

export interface CaseResult {
  id: string;
  failureMode: string;
  /** k 次全过才算过。 */
  pass: boolean;
  runs: { judge: string; pass: boolean; reason: string }[][];
}
