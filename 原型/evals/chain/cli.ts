// npm run eval:real -- [--k 1] [--students 全懂,半懂,...] [--parallel 2]：链路评测，用真模型（会花订阅额度）。
// 被测系统：Agent SDK 走本机 claude 登录，按会话类的模型与强度用默认配置（src/core/model/profiles.ts，STUDIUM_PROFILES 可覆盖）；
// 模拟学生与判分：Claude Sonnet 5.5（--student-model / --judge-model 可换）。每个学生一个新核心、独立数据目录、
// 随机端口（不碰 4317 与 原型/var/），录带存 evals/tapes/<这次>/<学生>/；报告写 evals/reports/<这次>.md。
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ClaudeAgentSdkModel,
  listModelCapabilities,
} from '../../src/core/model/claude-agent-sdk.ts';
import { mergeProfiles } from '../../src/core/model/profiles.ts';
import type { ProbeResult } from './checks.ts';
import { renderReport } from './report.ts';
import { estimate, runChain } from './run.ts';
import { STUDENTS } from './students.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const k = Number(flag('--k') ?? 1);
const parallel = Number(flag('--parallel') ?? 2);
const studentModel = flag('--student-model') ?? 'claude-sonnet-5-5';
const judgeModel = flag('--judge-model') ?? 'claude-sonnet-5-5';
const wanted = flag('--students')
  ?.split(/[,，]/)
  .map((x) => x.trim().replace(/型$/, ''));
const students = wanted === undefined ? STUDENTS : STUDENTS.filter((s) => wanted.includes(s.id));
if (students.length === 0 || (wanted !== undefined && students.length !== wanted.length)) {
  console.error(`学生类型写错了。有：${STUDENTS.map((s) => s.id).join('、')}`);
  process.exit(2);
}
if (!Number.isInteger(k) || k < 1 || !Number.isInteger(parallel) || parallel < 1) {
  console.error('--k 与 --parallel 要是正整数');
  process.exit(2);
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
const runId = `${stamp}-k${String(k)}`;
const outDir = join(root, 'evals', 'tapes', runId);
await mkdir(outDir, { recursive: true });
const est = estimate(students, k);
console.log(
  `链路评测 ${runId}：${students.map((s) => s.name).join('、')} 各 ${String(k)} 次，同时跑 ${String(parallel)} 个`,
);
console.log(`估算：${est}`);

const rawProfiles = process.env.STUDIUM_PROFILES;
const profiles = mergeProfiles(
  rawProfiles === undefined ? undefined : (JSON.parse(rawProfiles) as unknown),
);
const globalModel = process.env.STUDIUM_CLAUDE_MODEL;
const probe: ProbeResult = { profiles, ...(globalModel !== undefined ? { globalModel } : {}) };
try {
  probe.capabilities = await listModelCapabilities(outDir);
} catch (err) {
  probe.error = err instanceof Error ? err.message : String(err);
  console.error(`查模型能力失败（多半是没登录）：${probe.error}`);
}

const startedAt = new Date().toISOString();
const results = await runChain({
  students,
  k,
  parallel,
  outDir,
  probe,
  models: {
    system: (dataRoot) =>
      new ClaudeAgentSdkModel({
        cwd: dataRoot,
        profiles,
        ...(globalModel !== undefined ? { model: globalModel } : {}),
      }),
    student: (cwd) => new ClaudeAgentSdkModel({ cwd, model: studentModel, effort: 'medium' }),
    judge: (cwd) => new ClaudeAgentSdkModel({ cwd, model: judgeModel, effort: 'high' }),
  },
  log: (line) => {
    console.log(`${new Date().toISOString().slice(11, 19)} ${line}`);
  },
});

const report = renderReport({
  runId,
  command: `npm run eval:real -- ${args.join(' ')}`.trim(),
  startedAt,
  endedAt: new Date().toISOString(),
  estimate: est,
  probe,
  studentModel: `${studentModel}（强度 medium）`,
  judgeModel: `${judgeModel}（强度 high）`,
  tapesDir: relative(root, outDir),
  root,
  results,
});
const reportPath = join(root, 'evals', 'reports', `${runId}.md`);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, report, 'utf8');
await writeFile(
  join(outDir, 'checks.json'),
  JSON.stringify(
    results.map((r) => ({
      student: r.run.student.id,
      loopId: r.run.loopId,
      error: r.run.error,
      checks: r.checks,
    })),
    null,
    2,
  ),
  'utf8',
);
console.log(`\n报告：${relative(root, reportPath)}`);
const systemFails = results.flatMap((r) =>
  r.checks.filter((c) => c.outcome === '不过' && (c.attribution ?? '').startsWith('系统')),
);
console.log(`归给系统的不过项：${String(systemFails.length)}`);
process.exit(systemFails.length > 0 ? 1 : 0);
