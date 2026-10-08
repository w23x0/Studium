// 链路评测的运行器：每类学生跑 k 次（各自一个新核心、新数据目录、一份录带），可并行几个；
// 跑完先做程序判定，再开判分会话，最后合起来定归因。
import { join } from 'node:path';
import {
  attribute,
  modelChecks,
  programChecks,
  type CheckResult,
  type ProbeResult,
} from './checks.ts';
import { runStudent, type ChainModels } from './driver.ts';
import type { StudentResult } from './report.ts';
import type { Student } from './students.ts';

export interface ChainOptions {
  students: Student[];
  k: number;
  /** 同时跑几个学生。 */
  parallel: number;
  /** 这次运行的目录：每个学生一个子目录（录带、数据、学生与判分的工作目录）。 */
  outDir: string;
  models: ChainModels;
  probe: ProbeResult;
  settleMs?: number;
  interjectWaitMs?: number;
  log?: (line: string) => void;
}

/** 跑之前估算调用量（上限口径：学生每段都说满）。 */
export function estimate(students: Student[], k: number): string {
  let system = 0;
  let student = 0;
  let judge = 0;
  for (const s of students) {
    // 主对话 ~4 · 畅谈 说满+1 · M05 两次 · 学习对话 说满+开场+插话+守卫事实 · 守卫 ~3 · M09 · M10 · M15 ~2
    system += 4 + (s.maxTalkTurns + 1) + 2 + (s.maxLoopTurns + 3) + 3 + 1 + 1 + 2;
    student += 3 + s.maxTalkTurns + 2 + 2 + s.maxLoopTurns;
    judge += 6 + (s.observeFocus !== undefined ? 1 : 0) + 1;
  }
  system *= k;
  student *= k;
  judge *= k;
  const lo = system * 2 + student + judge;
  const hi = system * 5 + Math.round(student * 1.5) + judge * 2;
  return `上限约 ${String(system + student + judge)} 轮会话（被测系统 ${String(system)}、模拟学生 ${String(student)}、判分 ${String(judge)}）；被测系统每轮按 2–5 次模型请求（工具来回）算，合计约 ${String(lo)}–${String(hi)} 次模型请求`;
}

export async function runChain(opts: ChainOptions): Promise<StudentResult[]> {
  const jobs = opts.students.flatMap((s) =>
    Array.from({ length: opts.k }, (_, i) => ({
      s,
      dir: join(opts.outDir, opts.k > 1 ? `${s.id}-${String(i + 1)}` : s.id),
    })),
  );
  const results: StudentResult[] = new Array<StudentResult>(jobs.length);
  let next = 0;
  const worker = async () => {
    for (let i = next++; i < jobs.length; i = next++) {
      const job = jobs[i];
      if (!job) continue;
      opts.log?.(`[${job.s.id}] 开始（${job.dir}）`);
      const run = await runStudent(job.s, opts.models, {
        dir: job.dir,
        ...(opts.settleMs !== undefined ? { settleMs: opts.settleMs } : {}),
        ...(opts.interjectWaitMs !== undefined ? { interjectWaitMs: opts.interjectWaitMs } : {}),
        ...(opts.log !== undefined ? { log: opts.log } : {}),
      });
      opts.log?.(`[${job.s.id}] 链路${run.error === undefined ? '走完' : '中断'}，开始判定`);
      const judge = run.usage.wrap(opts.models.judge(join(job.dir, 'judge-cwd')), () => '判分');
      let judged: CheckResult[];
      try {
        judged = await modelChecks(run, judge);
      } catch (err) {
        judged = [
          {
            id: '判分器',
            by: '判分器',
            outcome: '未判',
            detail: `判分中断：${err instanceof Error ? err.message : String(err)}`,
            attribution: '判分器',
          },
        ];
      }
      results[i] = {
        run,
        checks: attribute([...(await programChecks(run, opts.probe)), ...judged]),
      };
      opts.log?.(`[${job.s.id}] 完成`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.parallel) }, worker));
  return results;
}
