// 链路评测报告：人读的 Markdown。每个学生一节：结论、判定项、关键对话摘录（带正本行号）、模型实际用了哪些工具。
import { join, relative } from 'node:path';
import type { ConversationKind, NumberedRecord } from '../../src/shared/records.ts';
import {
  cards,
  loopEnd,
  toolUsage,
  verdicts,
  type CheckResult,
  type ProbeResult,
} from './checks.ts';
import type { ChainRun } from './driver.ts';

export interface StudentResult {
  run: ChainRun;
  checks: CheckResult[];
}

export interface ReportInput {
  runId: string;
  command: string;
  startedAt: string;
  endedAt: string;
  /** 跑之前的调用量估算（文字）。 */
  estimate: string;
  probe: ProbeResult;
  studentModel: string;
  judgeModel: string;
  /** 这次运行的录带目录（相对 原型/）。 */
  tapesDir: string;
  /** 原型/ 的绝对路径：报告里的路径都写成相对它的。 */
  root: string;
  results: StudentResult[];
}

const KIND_LABEL: Record<ConversationKind, string> = {
  main: '主对话',
  talk: '畅谈',
  loop: '学习对话',
  guard: '守卫',
  m09: '写 M09',
  m05: 'M05 出卡',
  m15: 'M15 整理',
  m10: 'M10 记录',
};

function cell(s: string): string {
  return s.replace(/\|/g, '｜').replace(/\s*\n\s*/g, ' ');
}

function cut(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function conclusion(run: ChainRun): string {
  const parts: string[] = [];
  parts.push(run.error === undefined ? '链路走完' : `链路中断（${cut(run.error, 60)}）`);
  const loop = run.sessions.find((s) => s.sessionId === run.loopId);
  if (loop) parts.push(`学「${loop.title}」`);
  const vs = verdicts(run);
  parts.push(
    vs.length === 0
      ? '没申请收口'
      : `守卫 ${String(vs.length)} 次（${vs.map((v) => (v.closed ? '合上' : '未合上')).join('、')}）`,
  );
  const end = loopEnd(run);
  if (end) parts.push(end.closed ? '学完、写了 M09' : '没合上就结束、没写 M09');
  const next = cards(run).next;
  const rec = next?.options[next.recommended];
  if (rec) parts.push(`下一张卡推「${rec.title}」`);
  return parts.join(' · ');
}

function count(checks: CheckResult[], by: CheckResult['by']): string {
  const mine = checks.filter((c) => c.by === by);
  const pass = mine.filter((c) => c.outcome === '过').length;
  const fail = mine.filter((c) => c.outcome === '不过').length;
  return `${String(pass)} 过 / ${String(fail)} 不过`;
}

function compressed(records: NumberedRecord[], width: number, marks: Set<number>): string[] {
  const out: string[] = [];
  for (const { line, record: r } of records) {
    const who =
      r.type === 'user_message'
        ? '学习者'
        : r.type === 'assistant_message'
          ? '教学'
          : r.type === 'program_fact'
            ? '程序'
            : r.type === 'guard_verdict'
              ? '守卫判定'
              : r.type === 'loop_ended'
                ? '结束'
                : undefined;
    if (who === undefined) continue;
    const text =
      r.type === 'guard_verdict'
        ? `${r.closed ? '合上' : '未合上'}；${r.basis}（证据行 ${r.lines.join('、') || '无'}）`
        : r.type === 'loop_ended'
          ? `${r.closed ? '合上' : '没合上'}；${r.note}`
          : 'text' in r
            ? r.text
            : '';
    out.push(
      `${marks.has(line) ? '★' : ' '}L${String(line)} ${who}：${cut(text, who === '学习者' ? width * 2 : width)}`,
    );
  }
  return out;
}

function studentSection(r: StudentResult, root: string): string {
  const { run, checks } = r;
  const s = run.student;
  const out: string[] = [];
  out.push(`## ${s.name}（${s.id}）`, '');
  out.push(`**结论**：${conclusion(run)}`, '');
  out.push(
    `人设要点：${cut(s.knowledge, 120)}；期望收尾：${s.expectedEnding}`,
    '',
    `录带 \`${relative(root, run.tapePath)}\`；正本 \`${relative(root, join(run.dataRoot, 'sessions'))}/\`；学习对话 \`${run.loopId ?? '（无）'}\``,
    '',
  );
  out.push('| 判定项 | 谁判 | 结果 | 说明 | 归因 |', '| --- | --- | --- | --- | --- |');
  for (const c of checks) {
    const lines = c.lines && c.lines.length > 0 ? `（行 ${c.lines.join('、')}）` : '';
    const attr =
      c.attribution !== undefined
        ? `${c.attribution}${c.why !== undefined ? `：${c.why}` : ''}`
        : '';
    out.push(
      `| ${c.id} | ${c.by} | ${c.outcome} | ${cell(cut(c.detail, 600))}${lines} | ${cell(attr)} |`,
    );
  }
  out.push('');

  const marks = new Set<number>(checks.flatMap((c) => c.lines ?? []));
  const talk = run.sessions.find((x) => x.sessionId === run.talkId);
  const main = run.sessions.find((x) => x.sessionId === run.mainId);
  const loop = run.sessions.find((x) => x.sessionId === run.loopId);
  out.push('**关键对话摘录**（L 后是该会话正本行号；★ = 判定里引到的行；教学行截到 160 字）', '');
  if (main) {
    out.push('主对话：', '```', ...compressed(main.records, 100, new Set()), '```');
  }
  if (talk) {
    out.push('畅谈：', '```', ...compressed(talk.records, 100, new Set()), '```');
  }
  if (loop) {
    out.push(`学习对话「${loop.title}」：`, '```', ...compressed(loop.records, 160, marks), '```');
  }
  const driverSteps = run.steps.filter((x) => x.by === '驱动');
  if (driverSteps.length > 0) {
    out.push('', `驱动做的事：${driverSteps.map((x) => `${x.where}·${x.what}`).join('；')}`);
  }
  out.push('');

  out.push(
    '**模型实际用了哪些工具**（程序从正本的工具调用记录数的；括号里是被退回 / 报错的次数）',
    '',
  );
  out.push('| 会话 | 工具 |', '| --- | --- |');
  for (const [kind, tools] of toolUsage(run)) {
    const list = [...tools].map(
      ([n, v]) => `${n} ×${String(v.n)}${v.err > 0 ? `（错 ${String(v.err)}）` : ''}`,
    );
    out.push(`| ${KIND_LABEL[kind]} | ${list.join('、') || '（没调）'} |`);
  }
  out.push('');
  const u = run.usage;
  const sys = u.total((l) => l.startsWith('系统'));
  const stu = u.total((l) => l === '学生');
  const jud = u.total((l) => l === '判分');
  out.push(
    `调用量：被测系统 ${String(sys.turns)} 轮 / ${String(sys.requests)} 次模型请求 / 输出 ${String(sys.outputTokens)} token；模拟学生 ${String(stu.turns)} 轮 / ${String(stu.requests)} 次；判分 ${String(jud.turns)} 轮 / ${String(jud.requests)} 次。用时 ${minutes(run.startedAt, run.endedAt)} 分钟。`,
    '',
  );
  return out.join('\n');
}

function minutes(a: string, b: string): string {
  return ((Date.parse(b) - Date.parse(a)) / 60000).toFixed(1);
}

export function renderReport(input: ReportInput): string {
  const out: string[] = [];
  out.push(`# 链路评测报告 ${input.runId}`, '');
  out.push(
    `> 状态：自动生成（\`${input.command}\`）。不作产品结论；判分器的判断是模型读原文给的，拿来定位问题，不当裁决。`,
    '',
  );
  out.push(
    `- 时间：${input.startedAt} → ${input.endedAt}（${minutes(input.startedAt, input.endedAt)} 分钟）`,
  );
  out.push(`- 模拟学生模型：${input.studentModel}；判分模型：${input.judgeModel}`);
  const profiles = Object.entries(input.probe.profiles)
    .map(
      ([k, p]) => `${k}=${p.model ?? input.probe.globalModel ?? '默认'}/${p.effort ?? '默认强度'}`,
    )
    .join('，');
  out.push(`- 被测系统按会话类配置：${profiles}（没列的会话类用 SDK 默认）`);
  out.push(`- 跑之前的估算：${input.estimate}`);
  const all = input.results.map((r) => r.run.usage);
  const sum = (f: (l: string) => boolean) =>
    all.reduce(
      (a, u) => {
        const t = u.total(f);
        return {
          turns: a.turns + t.turns,
          requests: a.requests + t.requests,
          out: a.out + t.outputTokens,
          inp: a.inp + t.inputTokens,
        };
      },
      { turns: 0, requests: 0, out: 0, inp: 0 },
    );
  const sys = sum((l) => l.startsWith('系统'));
  const stu = sum((l) => l === '学生');
  const jud = sum((l) => l === '判分');
  out.push(
    `- 实际调用量：被测系统 ${String(sys.turns)} 轮 / ${String(sys.requests)} 次模型请求（输入约 ${String(sys.inp)}、输出 ${String(sys.out)} token）；模拟学生 ${String(stu.turns)} 轮 / ${String(stu.requests)} 次；判分 ${String(jud.turns)} 轮 / ${String(jud.requests)} 次；合计 ${String(sys.requests + stu.requests + jud.requests)} 次模型请求`,
  );
  out.push(
    `- 离线回放（不调模型）：\`npm run replay -- ${input.tapesDir}/<学生>/tape.jsonl\`，在临时空目录里重放并列出与录带不一致之处；原始正本在 \`${input.tapesDir}/<学生>/data/sessions/\``,
    '',
  );

  out.push(
    '## 总览',
    '',
    '| 学生 | 结论 | 程序判定 | 判分器 | 不过的项 |',
    '| --- | --- | --- | --- | --- |',
  );
  for (const r of input.results) {
    const fails = r.checks
      .filter((c) => c.outcome === '不过')
      .map((c) => `${c.id}（${c.attribution ?? '?'}）`);
    out.push(
      `| ${r.run.student.name} | ${cell(conclusion(r.run))} | ${count(r.checks, '程序')} | ${count(r.checks, '判分器')} | ${cell(fails.join('；') || '无')} |`,
    );
  }
  out.push('');

  const systemFails = input.results.flatMap((r) =>
    r.checks
      .filter((c) => c.outcome === '不过' && (c.attribution ?? '').startsWith('系统'))
      .map((c) => ({ student: r.run.student.name, c })),
  );
  out.push('## 归给系统的不过项', '');
  if (systemFails.length === 0) out.push('无。', '');
  for (const { student, c } of systemFails) {
    out.push(
      `- **${c.id}**（${student}，${c.attribution ?? ''}）：${cut(c.detail, 300)}${c.lines && c.lines.length > 0 ? `（行 ${c.lines.join('、')}）` : ''}`,
    );
  }
  out.push('');
  for (const r of input.results) out.push(studentSection(r, input.root));
  return out.join('\n');
}
