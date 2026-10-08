// 链路评测的判定：程序能查的先由程序查，要读原文才判得了的交判分器（一个判定开一个判分会话，互不相通）。
// 每个不过都写归因：系统（程序 / 提示词 / 设计）、模拟学生、判分器、环境（登录 / 额度），拿不准写“不确定”。
import { join } from 'node:path';
import { z } from 'zod';
import { M08 } from '../../src/core/knowledge/m08.ts';
import { M09 } from '../../src/core/knowledge/m09.ts';
import type { ModelCapability } from '../../src/core/model/claude-agent-sdk.ts';
import type { ModelAdapter } from '../../src/core/model/port.ts';
import type { Profiles } from '../../src/core/model/profiles.ts';
import { learnerLines, renderTranscript } from '../../src/core/transcript.ts';
import type {
  ChoiceCard,
  ConversationKind,
  GuardVerdict,
  NumberedRecord,
  ToolCall,
} from '../../src/shared/records.ts';
import { toUiMessages } from '../../src/ui/thread-model.ts';
import { CASES } from '../cases.ts';
import { tapeInterjections, type ChainRun, type SessionSnapshot } from './driver.ts';

export type Outcome = '过' | '不过' | '观察' | '未判';
export type Attribution =
  | '系统·程序'
  | '系统·提示词'
  | '系统·设计'
  | '模拟学生'
  | '判分器'
  | '环境（登录/额度）'
  | '不确定';

export interface CheckResult {
  id: string;
  by: '程序' | '判分器';
  outcome: Outcome;
  detail: string;
  /** 相关行号（学习对话正本）。 */
  lines?: number[];
  attribution?: Attribution;
  why?: string;
}

/** 学习者看得到的文字里不该出现的内部词（任务清单 + 验收“界面文字”的口径）。 */
export const INTERNAL_WORDS = [
  '闭环',
  '选择卡',
  '守卫',
  '出发点',
  '子句',
  '新点',
  '单子',
  '方向目标',
  '程序事实',
  '收口',
  '诊断记录',
];
const INTERNAL_PATTERNS = [/M\d{2}/, /\b[pc]-[a-z][a-z0-9-]*/];

const ENV_ERROR =
  /401|403|429|login|log in|auth|rate.?limit|usage limit|credit|overloaded|登录|额度/i;

export interface ProbeResult {
  capabilities?: ModelCapability[];
  error?: string;
  profiles: Profiles;
  /** 全局默认模型（STUDIUM_CLAUDE_MODEL）；不设用 SDK 默认。 */
  globalModel?: string;
}

// ───────────── 取数 ─────────────

export function sessionsOf(run: ChainRun, kind: ConversationKind): SessionSnapshot[] {
  return run.sessions.filter((s) => s.kind === kind);
}

function session(run: ChainRun, id: string | undefined): SessionSnapshot | undefined {
  return id === undefined ? undefined : run.sessions.find((s) => s.sessionId === id);
}

function toolCalls(s: SessionSnapshot): ToolCall[] {
  return s.records.flatMap((r) => (r.record.type === 'tool_call' ? [r.record] : []));
}

export function verdicts(run: ChainRun): (GuardVerdict & { line: number })[] {
  return (session(run, run.loopId)?.records ?? []).flatMap((r) =>
    r.record.type === 'guard_verdict' ? [{ ...r.record, line: r.line }] : [],
  );
}

export function loopEnd(run: ChainRun): { closed: boolean; note: string } | undefined {
  const r = session(run, run.loopId)
    ?.records.map((x) => x.record)
    .find((x) => x.type === 'loop_ended');
  return r?.type === 'loop_ended' ? { closed: r.closed, note: r.note } : undefined;
}

export function cards(run: ChainRun): { first?: ChoiceCard; next?: ChoiceCard } {
  const main = session(run, run.mainId)?.records ?? [];
  const all = main.flatMap((r) => (r.record.type === 'choice_card' ? [r] : []));
  const madeLine = main.find((r) => r.record.type === 'choice_made')?.line;
  const first = all.find((r) => madeLine === undefined || r.line < madeLine);
  const next = madeLine === undefined ? undefined : all.filter((r) => r.line > madeLine).at(-1);
  return {
    ...(first?.record.type === 'choice_card' ? { first: first.record } : {}),
    ...(next?.record.type === 'choice_card' ? { next: next.record } : {}),
  };
}

/** 每种会话用了哪些工具：名字 × 次数（报错次数）。 */
export function toolUsage(
  run: ChainRun,
): Map<ConversationKind, Map<string, { n: number; err: number }>> {
  const out = new Map<ConversationKind, Map<string, { n: number; err: number }>>();
  for (const s of run.sessions) {
    const m = out.get(s.kind) ?? new Map<string, { n: number; err: number }>();
    for (const t of toolCalls(s)) {
      const row = m.get(t.name) ?? { n: 0, err: 0 };
      row.n++;
      if (t.isError) row.err++;
      m.set(t.name, row);
    }
    out.set(s.kind, m);
  }
  return out;
}

function turnFailures(run: ChainRun): { kind: ConversationKind; line: number; reason: string }[] {
  return run.sessions.flatMap((s) =>
    s.records.flatMap((r) =>
      r.record.type === 'turn_failed'
        ? [{ kind: s.kind, line: r.line, reason: r.record.reason }]
        : [],
    ),
  );
}

// ───────────── 程序判定 ─────────────

function chainComplete(run: ChainRun): CheckResult {
  const stages: [string, boolean][] = [
    ['开畅谈', run.talkId !== undefined],
    [
      '畅谈谈定方向',
      session(run, run.talkId)?.records.some((r) => r.record.type === 'talk_ended') === true,
    ],
    ['出第一张选项卡', cards(run).first !== undefined],
    ['开学习对话', run.loopId !== undefined],
    ['学习对话结束', loopEnd(run) !== undefined],
    ['出下一张选项卡', cards(run).next !== undefined],
    ['M15 整理跑过', sessionsOf(run, 'm15').length > 0],
    ['M10 记录跑过', sessionsOf(run, 'm10').length > 0],
  ];
  if (loopEnd(run)?.closed === true) stages.push(['写 M09', run.m09.length > 0]);
  const missing = stages.filter(([, ok]) => !ok).map(([n]) => n);
  const fails = turnFailures(run);
  const afterFailed = (session(run, run.loopId)?.records ?? []).filter(
    (r) => r.record.type === 'after_loop_step' && r.record.step === 'failed',
  );
  const problems = [
    ...(run.error !== undefined ? [`驱动中断：${run.error}`] : []),
    ...missing.map((m) => `没走到：${m}`),
    ...fails.map((f) => `${f.kind} 第 ${String(f.line)} 行本轮失败：${f.reason.slice(0, 120)}`),
    ...afterFailed.map((r) => `结束后的清单失败（学习对话第 ${String(r.line)} 行）`),
    ...run.studentErrors.map((e) => `模拟学生本轮失败：${e.slice(0, 120)}`),
  ];
  if (problems.length === 0) {
    return { id: '整条链不崩', by: '程序', outcome: '过', detail: '各步都走到，没有失败的轮次' };
  }
  const all = problems.join('；');
  let attribution: Attribution = '系统·程序';
  let why = '程序或模型侧出错';
  if (ENV_ERROR.test(all)) {
    attribution = '环境（登录/额度）';
    why = '报错像是登录或额度问题';
  } else if (run.studentErrors.length > 0 && fails.length === 0) {
    attribution = '模拟学生';
    why = '只有模拟学生的会话出错';
  } else if (fails.length === 0 && run.error === undefined) {
    attribution = '系统·提示词';
    why = '没有报错，是模型没调该调的工具（见“该调的工具都调了”）';
  }
  return { id: '整条链不崩', by: '程序', outcome: '不过', detail: all, attribution, why };
}

function toolsCalled(run: ChainRun): CheckResult {
  const missing: string[] = [];
  const accepted = (s: SessionSnapshot, name: string) =>
    toolCalls(s).some((t) => t.name === name && !t.isError);
  const main = session(run, run.mainId);
  if (main && !accepted(main, 'open_goal_talk')) missing.push('主对话没调 open_goal_talk');
  const talk = session(run, run.talkId);
  if (talk && !accepted(talk, 'settle_goal')) missing.push('畅谈没调成 settle_goal');
  for (const s of sessionsOf(run, 'm05')) {
    if (!accepted(s, 'submit_choice_card')) missing.push(`M05 ${s.sessionId} 没交成选项卡`);
  }
  for (const s of sessionsOf(run, 'guard')) {
    if (!accepted(s, 'submit_verdict')) missing.push(`守卫 ${s.sessionId} 没交成判定`);
  }
  for (const s of sessionsOf(run, 'm09')) {
    if (!accepted(s, 'write_formation_record')) missing.push(`写 M09 ${s.sessionId} 没写成`);
  }
  for (const s of sessionsOf(run, 'm10')) {
    if (!accepted(s, 'write_strategy_record')) missing.push(`M10 ${s.sessionId} 没写成记录`);
  }
  for (const s of sessionsOf(run, 'm15')) {
    if (!accepted(s, 'write_current_state') && !accepted(s, 'write_state_record')) {
      missing.push(`M15 ${s.sessionId} 什么都没写`);
    }
  }
  const loop = session(run, run.loopId);
  const end = loopEnd(run);
  if (
    loop &&
    end &&
    !end.closed &&
    !end.note.includes('点了') &&
    !accepted(loop, 'end_loop_unclosed')
  ) {
    missing.push('学习对话没合上就结束、不是按钮结束的，却没调 end_loop_unclosed');
  }
  const errors = run.sessions.flatMap((s) =>
    toolCalls(s)
      .filter((t) => t.isError)
      .map((t) => `${s.kind}·${t.name}：${t.result.slice(0, 80)}`),
  );
  const errText =
    errors.length > 0 ? `；工具报错（模型已看到，可能重交）：${errors.join(' | ')}` : '';
  return missing.length === 0
    ? { id: '该调的工具都调了', by: '程序', outcome: '过', detail: `都调了${errText}` }
    : {
        id: '该调的工具都调了',
        by: '程序',
        outcome: '不过',
        detail: `${missing.join('；')}${errText}`,
        attribution: '系统·提示词',
        why: '模型没调；工具都给了',
      };
}

function diagnosisEveryTurn(run: ChainRun): CheckResult {
  const loop = session(run, run.loopId);
  if (!loop) return { id: '每轮先记诊断', by: '程序', outcome: '未判', detail: '没有学习对话' };
  let turns = 0;
  let withDiag = 0;
  let diagFirst = 0;
  const missing: number[] = [];
  let seg: NumberedRecord[] = [];
  const flush = () => {
    const firstMsg = seg.findIndex((r) => r.record.type === 'assistant_message');
    if (firstMsg >= 0) {
      turns++;
      const diag = seg.findIndex(
        (r) => r.record.type === 'tool_call' && r.record.name === 'write_diagnosis',
      );
      if (diag >= 0) withDiag++;
      else missing.push(seg[0]?.line ?? 0);
      if (diag >= 0 && diag < firstMsg) diagFirst++;
    }
    seg = [];
  };
  for (const r of loop.records) {
    if (r.record.type === 'user_message' || r.record.type === 'program_fact') flush();
    seg.push(r);
  }
  flush();
  const detail = `${String(withDiag)}/${String(turns)} 轮记了诊断，其中 ${String(diagFirst)} 轮先记诊断再说话${missing.length > 0 ? `；没记诊断的轮从第 ${missing.join('、')} 行起` : ''}`;
  return withDiag === turns
    ? { id: '每轮先记诊断', by: '程序', outcome: '过', detail }
    : {
        id: '每轮先记诊断',
        by: '程序',
        outcome: '不过',
        detail,
        lines: missing,
        attribution: '系统·提示词',
        why: '“每轮先记诊断”只写在提示词里，没有程序保证',
      };
}

/** 学习者看得到的文字：主对话、畅谈、学习对话按界面规则转出来的 + 选项卡标题理由 + 项目名、对话名。 */
export function visibleTexts(
  run: ChainRun,
): { where: string; line: number; text: string; by: '模型' | '程序' }[] {
  const out: { where: string; line: number; text: string; by: '模型' | '程序' }[] = [];
  for (const s of run.sessions) {
    if (s.kind !== 'main' && s.kind !== 'talk' && s.kind !== 'loop') continue;
    const label = s.kind === 'main' ? '主对话' : s.kind === 'talk' ? '畅谈' : '学习对话';
    for (const m of toUiMessages(s.records, '')) {
      if (m.role === 'user') continue;
      out.push({
        where: label,
        line: m.line,
        text: m.text,
        by: m.role === 'assistant' ? '模型' : '程序',
      });
    }
    if (s.kind === 'loop') out.push({ where: '学习对话名', line: 1, text: s.title, by: '模型' });
    for (const r of s.records) {
      if (r.record.type === 'choice_card') {
        for (const o of r.record.options) {
          out.push({ where: '选项卡', line: r.line, text: `${o.title}：${o.reason}`, by: '模型' });
        }
      }
      if (r.record.type === 'project_title') {
        out.push({ where: '项目名', line: r.line, text: r.record.title, by: '模型' });
      }
    }
  }
  return out;
}

export function internalWordHits(text: string): string[] {
  const hits = INTERNAL_WORDS.filter((w) => text.includes(w));
  for (const p of INTERNAL_PATTERNS) {
    const m = p.exec(text);
    if (m) hits.push(m[0]);
  }
  return hits;
}

function noInternalWords(run: ChainRun): CheckResult {
  const leaks = visibleTexts(run).flatMap((v) => {
    const hits = internalWordHits(v.text);
    return hits.length > 0 ? [{ ...v, hits }] : [];
  });
  if (leaks.length === 0) {
    return { id: '学习者看不到内部词', by: '程序', outcome: '过', detail: '没有' };
  }
  const byProgram = leaks.some((l) => l.by === '程序');
  return {
    id: '学习者看不到内部词',
    by: '程序',
    outcome: '不过',
    detail: leaks
      .map(
        (l) =>
          `${l.where} 第 ${String(l.line)} 行（${l.by}写的）露出「${l.hits.join('、')}」：${l.text.replace(/\s+/g, ' ').slice(0, 70)}`,
      )
      .join('；'),
    attribution: byProgram ? '系统·程序' : '系统·提示词',
    why: byProgram
      ? '程序写给学习者的文字里有内部词'
      : '模型写给学习者的话里有内部词；提示词里有禁用说明',
  };
}

function guardExpectation(run: ChainRun): CheckResult {
  const vs = verdicts(run);
  const exp = run.student.guard;
  const summary =
    vs.length === 0
      ? '没申请过收口'
      : vs
          .map(
            (v) =>
              `第 ${String(v.line)} 行${v.closed ? '合上' : '未合上'}${v.problem !== undefined ? `（${v.problem}）` : ''}`,
          )
          .join('、');
  if (exp === 'observe') {
    return {
      id: '守卫判定符合预期',
      by: '程序',
      outcome: '观察',
      detail: `本类只记录：${summary}`,
    };
  }
  if (vs.length === 0) {
    return {
      id: '守卫判定符合预期',
      by: '程序',
      outcome: '未判',
      detail: `${summary}，守卫没机会判`,
      attribution: '模拟学生',
      why: '学生没点“我觉得懂了”，教学也没申请',
    };
  }
  const anyClosed = vs.some((v) => v.closed);
  const ok = exp === 'close' ? anyClosed : !anyClosed;
  return {
    id: '守卫判定符合预期',
    by: '程序',
    outcome: ok ? '过' : '不过',
    detail: `期望${exp === 'close' ? '判合上' : '不判合上'}；实际 ${summary}`,
    lines: vs.map((v) => v.line),
  };
}

function guardLines(run: ChainRun): CheckResult {
  const loop = session(run, run.loopId);
  const vs = verdicts(run);
  if (!loop || vs.length === 0) {
    return {
      id: '守卫引用的行都是学习者的话',
      by: '程序',
      outcome: '未判',
      detail: '没有守卫判定',
    };
  }
  const learner = learnerLines(loop.records);
  const bad = vs.flatMap((v) => v.lines.filter((l) => !learner.has(l)));
  const closedNoLines = vs.filter((v) => v.closed && v.lines.length === 0);
  const rejected = sessionsOf(run, 'guard').flatMap((g) =>
    toolCalls(g)
      .filter((t) => t.name === 'submit_verdict' && t.isError)
      .map((t) => t.result.slice(0, 60)),
  );
  const note =
    rejected.length > 0
      ? `；守卫交判定被程序退回 ${String(rejected.length)} 次：${rejected.join(' | ')}`
      : '';
  const cited = vs
    .map((v) => `第 ${String(v.line)} 行判定引 ${v.lines.join('、') || '无'}`)
    .join('；');
  if (bad.length === 0 && closedNoLines.length === 0) {
    return {
      id: '守卫引用的行都是学习者的话',
      by: '程序',
      outcome: '过',
      detail: `${cited}${note}`,
    };
  }
  return {
    id: '守卫引用的行都是学习者的话',
    by: '程序',
    outcome: '不过',
    detail: `${bad.length > 0 ? `第 ${bad.join('、')} 行不是学习者的话；` : ''}${closedNoLines.length > 0 ? '判合上却没引证据行；' : ''}${cited}${note}`,
    lines: bad,
    attribution: '系统·程序',
    why: '程序本该在收判定时核对并退回',
  };
}

function m09Rule(run: ChainRun): CheckResult {
  const end = loopEnd(run);
  const mine = run.m09.filter((r) => r.loopSessionId === run.loopId);
  if (!end) return { id: '没合上不写 M09', by: '程序', outcome: '未判', detail: '学习对话没结束' };
  if (!end.closed) {
    return mine.length === 0
      ? {
          id: '没合上不写 M09',
          by: '程序',
          outcome: '过',
          detail: '没合上就结束，M09 里没有这段的记录',
        }
      : {
          id: '没合上不写 M09',
          by: '程序',
          outcome: '不过',
          detail: `没合上却写了 ${String(mine.length)} 条 M09`,
          attribution: '系统·程序',
          why: '没合上的清单不该开写 M09 的会话',
        };
  }
  const loop = session(run, run.loopId);
  const learner = learnerLines(loop?.records ?? []);
  const bad = mine.flatMap((r) => r.evidenceLines.filter((l) => !learner.has(l)));
  if (mine.length === 1 && bad.length === 0) {
    const r = mine[0];
    return {
      id: '没合上不写 M09',
      by: '程序',
      outcome: '过',
      detail: `合上了，写了 1 条 M09（证据行 ${r?.evidenceLines.join('、') ?? ''}；证据强度：${r?.evidenceStrength ?? ''}）`,
    };
  }
  return {
    id: '没合上不写 M09',
    by: '程序',
    outcome: '不过',
    detail: `合上后 M09 有 ${String(mine.length)} 条${bad.length > 0 ? `，证据行 ${bad.join('、')} 不是学习者的话` : ''}`,
    attribution: '系统·程序',
  };
}

function nextCardNotLearned(run: ChainRun): CheckResult {
  const { next } = cards(run);
  if (!next) {
    return {
      id: '下一张卡不推已学会的',
      by: '程序',
      outcome: '不过',
      detail: '没有下一张选项卡',
      attribution: run.error !== undefined ? '不确定' : '系统·程序',
    };
  }
  const known = new Set(run.m09.map((r) => r.newPoint));
  const bad = next.options.filter((o) => known.has(o.ticket.newPoint));
  const list = next.options
    .map((o, i) => `${String(i)}.${o.ticket.newPoint}${i === next.recommended ? '（推荐）' : ''}`)
    .join(' ');
  return bad.length === 0
    ? {
        id: '下一张卡不推已学会的',
        by: '程序',
        outcome: '过',
        detail: `已学会：${[...known].join('、') || '无'}；下一张：${list}`,
      }
    : {
        id: '下一张卡不推已学会的',
        by: '程序',
        outcome: '不过',
        detail: `把已学会的 ${bad.map((o) => o.ticket.newPoint).join('、')} 又当新内容推；下一张：${list}`,
        attribution: '系统·提示词',
        why: 'M05 提示词写了“已会的只作出发点”；程序没卡',
      };
}

function effortAccepted(run: ChainRun, probe: ProbeResult): CheckResult {
  const rows: string[] = [];
  const bad: string[] = [];
  for (const [kind, p] of Object.entries(probe.profiles)) {
    const label = `系统·${kind}`;
    const used = run.usage.rows.get(label);
    const actual = used ? [...used.models].join('、') : '';
    const model = p.model ?? probe.globalModel ?? 'default';
    let support = '没查到';
    if (p.effort !== undefined && probe.capabilities) {
      const cap = probe.capabilities.find((c) => c.value === model || c.resolved === model);
      if (!cap) {
        support = `能力表里没有 ${model}`;
        bad.push(`${kind}：${support}`);
      } else if (cap.efforts.includes(p.effort)) {
        support = `${cap.resolved ?? cap.value} 支持`;
      } else {
        support = `${cap.resolved ?? cap.value} 不支持（会被悄悄降级）`;
        bad.push(`${kind}：${support}`);
      }
    }
    const errs = used?.turnErrors.filter((e) => /effort|强度/i.test(e)) ?? [];
    if (errs.length > 0) bad.push(`${kind}：${errs.join('；')}`);
    rows.push(
      `${kind} 配 ${p.effort ?? '默认'}→${support}；实际模型 ${actual || '（没跑）'}；思考块 ${String(used?.thinkingBlocks ?? 0)}／请求 ${String(used?.requests ?? 0)}`,
    );
  }
  if (!probe.capabilities) {
    return {
      id: '思考强度参数被接受',
      by: '程序',
      outcome: '未判',
      detail: `查模型能力失败：${probe.error ?? '没查'}；${rows.join('；')}`,
      attribution: '环境（登录/额度）',
    };
  }
  return bad.length === 0
    ? { id: '思考强度参数被接受', by: '程序', outcome: '过', detail: rows.join('；') }
    : {
        id: '思考强度参数被接受',
        by: '程序',
        outcome: '不过',
        detail: `${bad.join('；')}｜${rows.join('；')}`,
        attribution: '系统·程序',
      };
}

function backgroundModules(run: ChainRun): CheckResult {
  const problems: string[] = [];
  const m15 = sessionsOf(run, 'm15');
  if (m15.length === 0) problems.push('M15 没整理');
  const notes = (session(run, run.loopId)?.records ?? []).flatMap((r) =>
    r.record.type === 'loop_note' ? [r.record.text] : [],
  );
  for (const s of m15) {
    const opening = s.records.flatMap((r) =>
      r.record.type === 'program_fact' ? [r.record.text] : [],
    );
    const leaked = notes.filter(
      (n) => n.length > 12 && opening.some((o) => o.includes(n.slice(0, 40))),
    );
    if (leaked.length > 0) problems.push(`M15 开场里出现了诊断记录（${String(leaked.length)} 条）`);
    if (opening.some((o) => o.includes('守卫判定'))) problems.push('M15 开场里出现了守卫判定');
  }
  if (run.loopId !== undefined && !run.m10.some((r) => r.loopSessionId === run.loopId)) {
    problems.push('M10 没记这段学习');
  }
  const detail = `M15 整理 ${String(m15.length)} 次、状态记录 ${String(run.m15Records)} 条、当前状态页${run.m15Current !== undefined ? '有' : '无'}；M10 记录 ${String(run.m10.length)} 条`;
  return problems.length === 0
    ? { id: 'M15 / M10 后台跑了且隔离', by: '程序', outcome: '过', detail }
    : {
        id: 'M15 / M10 后台跑了且隔离',
        by: '程序',
        outcome: '不过',
        detail: `${problems.join('；')}｜${detail}`,
        attribution: problems.some((p) => p.includes('开场')) ? '系统·程序' : '系统·提示词',
      };
}

async function interjection(run: ChainRun): Promise<CheckResult> {
  const obs = run.interjection;
  if (!obs) {
    return {
      id: '中途插话（只记录）',
      by: '程序',
      outcome: '未判',
      detail: '没插成话（学习对话没到第 3 轮或学生没打字）',
    };
  }
  const merged = await tapeInterjections(run.tapePath);
  const loop = session(run, run.loopId)?.records ?? [];
  const after = loop.filter((r) => obs.line !== undefined && r.line > obs.line);
  const nextText = after.find((r) => r.record.type === 'assistant_message');
  const before = loop.filter(
    (r) => obs.line !== undefined && r.line < obs.line && r.record.type === 'assistant_message',
  );
  const lastBefore = before.at(-1);
  return {
    id: '中途插话（只记录）',
    by: '程序',
    outcome: '观察',
    detail: `等到「${obs.trigger}」后插话，插话时${obs.whileRunning ? '模型还在答' : '这一轮已答完'}；${merged > 0 ? '并进了正在跑的那一轮（录带有 interject 行）' : '没并进那一轮，排成了新一轮'}；插话在第 ${String(obs.line ?? '?')} 行，前一条教学在第 ${String(lastBefore?.line ?? '?')} 行，之后第一条教学在第 ${String(nextText?.line ?? '?')} 行`,
    ...(obs.line !== undefined ? { lines: [obs.line] } : {}),
  };
}

export async function programChecks(run: ChainRun, probe: ProbeResult): Promise<CheckResult[]> {
  return [
    chainComplete(run),
    toolsCalled(run),
    diagnosisEveryTurn(run),
    noInternalWords(run),
    guardExpectation(run),
    guardLines(run),
    m09Rule(run),
    nextCardNotLearned(run),
    effortAccepted(run, probe),
    backgroundModules(run),
    await interjection(run),
  ];
}

// ───────────── 判分器 ─────────────

const JUDGE_PROMPT = `你是 Studium 链路评测的判分者。给你一个判法和材料（对话原文带行号，L 后是正本行号），按判法判。
只按给的判法判，不加别的标准；判断以对话原文为准，引用写行号。材料里“程序”行是系统追加给教学模型的事实，学习者看不到。
用 submit_judgement 交回：过不过、一段理由、相关行号。只交一次。`;

const OBSERVE_PROMPT = `你是 Studium 链路评测的观察者。给你一个观察要点和材料（对话原文带行号，L 后是正本行号），如实描述看到了什么，不评好坏以外的东西，不推测看不到的内部过程。
用 submit_observation 交回：几句描述、相关行号。只交一次。`;

interface JudgeOut {
  pass?: boolean;
  text: string;
  lines: number[];
  error?: string;
}

async function askModel(
  model: ModelAdapter,
  mode: 'judge' | 'observe',
  rubric: string,
  material: string,
): Promise<JudgeOut> {
  let out: JudgeOut | undefined;
  const conv = model.open({
    systemPrompt: mode === 'judge' ? JUDGE_PROMPT : OBSERVE_PROMPT,
    tools: [
      mode === 'judge'
        ? {
            name: 'submit_judgement',
            description: '交回判定：过不过、一段理由、相关行号。',
            input: { pass: z.boolean(), reason: z.string(), lines: z.array(z.number().int()) },
            run: (a) => {
              out ??= {
                pass: a.pass as boolean,
                text: a.reason as string,
                lines: a.lines as number[],
              };
              return Promise.resolve({ text: '收到' });
            },
          }
        : {
            name: 'submit_observation',
            description: '交回观察：几句描述、相关行号。',
            input: { summary: z.string(), lines: z.array(z.number().int()) },
            run: (a) => {
              out ??= { text: a.summary as string, lines: a.lines as number[] };
              return Promise.resolve({ text: '收到' });
            },
          },
    ],
  });
  try {
    for await (const ev of conv.send({
      role: 'program',
      text: `${mode === 'judge' ? '判法' : '观察要点'}：${rubric}\n\n${material}`,
    })) {
      if (ev.kind === 'turn_error') return { text: '', lines: [], error: ev.reason };
    }
  } finally {
    await conv.close();
  }
  return out ?? { text: '', lines: [], error: '判分会话没交结果' };
}

function rubricOf(caseId: string): string {
  const j = CASES.find((c) => c.id === caseId)?.judges.find((x) => x.kind === 'model');
  if (j?.kind !== 'model') throw new Error(`评测目录里没有 ${caseId} 的模型判法`);
  return j.rubric;
}

function personaText(run: ChainRun): string {
  const s = run.student;
  return `模拟学习者（${s.name}）的设定——教学与守卫都看不到：\n人设：${s.persona}\n真实知识状态：${s.knowledge}\n按人设该怎么收尾：${s.expectedEnding}`;
}

async function cardMaterial(run: ChainRun): Promise<string | undefined> {
  const { first, next } = cards(run);
  if (!next) return undefined;
  const m08 = await M08.load(join(run.dataRoot, 'knowledge', 'm08'));
  const m09 = await M09.load(join(run.dataRoot, 'knowledge', 'm09'));
  const goal = session(run, run.mainId)
    ?.records.map((r) => r.record)
    .filter((r) => r.type === 'project_goal')
    .at(-1);
  const describe = (c: ChoiceCard) =>
    c.options
      .map(
        (o, i) =>
          `${String(i)}. ${o.title}${i === c.recommended ? '（推荐）' : ''}——理由：${o.reason}\n   新点 ${o.ticket.newPoint}「${m08.name(o.ticket.newPoint)}」；子句 ${o.ticket.clause}；出发点 ${o.ticket.startPoints.map((p) => `${m08.name(p.point)}（${p.source}）`).join('、')}；路线动作 ${o.ticket.routeAction}`,
      )
      .join('\n');
  const end = loopEnd(run);
  const vs = verdicts(run);
  return [
    `学习者谈定的方向：${goal?.type === 'project_goal' ? goal.text : '（没谈定）'}`,
    '',
    `知识结构（点与子句）：\n${m08.outline()}`,
    '',
    `第一张选项卡：\n${first ? describe(first) : '（无）'}`,
    `刚学的那段：${run.ticketText ?? '（无）'}`,
    `结果：${end ? (end.closed ? '合上（学习者确认）' : `没合上就结束（${end.note}）`) : '没结束'}`,
    `守卫判定：${vs.map((v) => `${v.closed ? '合上' : '未合上'}：${v.basis}`).join('｜') || '（无）'}`,
    `已学会（形成记录）：\n${
      m09
        .all()
        .map((r) => m09.describe(r))
        .join('\n') || '（无）'
    }`,
    '',
    `下一张选项卡（要判的）：\n${describe(next)}`,
  ].join('\n');
}

export async function modelChecks(run: ChainRun, judge: ModelAdapter): Promise<CheckResult[]> {
  const loop = session(run, run.loopId);
  if (!loop) return [];
  const transcript = `学习对话原文：\n${renderTranscript(loop.records)}`;
  const ticket = `这段学习的单子：\n${run.ticketText ?? '（缺）'}`;
  const out: CheckResult[] = [];
  const add = async (
    id: string,
    mode: 'judge' | 'observe',
    rubric: string,
    material: string,
    failAttr: Attribution = '系统·提示词',
  ) => {
    const r = await askModel(judge, mode, rubric, material);
    if (r.error !== undefined) {
      out.push({
        id,
        by: '判分器',
        outcome: '未判',
        detail: r.error,
        attribution: ENV_ERROR.test(r.error) ? '环境（登录/额度）' : '判分器',
      });
      return;
    }
    const outcome: Outcome = mode === 'observe' ? '观察' : r.pass === true ? '过' : '不过';
    out.push({
      id,
      by: '判分器',
      outcome,
      detail: r.text,
      lines: r.lines,
      ...(outcome === '不过' ? { attribution: failAttr } : {}),
    });
  };

  await add('不替学习者做那一步', 'judge', rubricOf('不替学习者做那一步'), transcript);
  await add('一轮停在一个问题', 'judge', rubricOf('一轮停在一个问题'), transcript);
  const vs = verdicts(run);
  if (vs.length > 0) {
    await add(
      '守卫判得对',
      'judge',
      '逐个看下面列出的守卫判定：按这个标准判得对不对。标准：合上 = 学习者靠单子里的出发点、沿选中的子句，把新点接进了已有的认识；证据只认学习者自己说的、做的；跟着复述讲过的内容不算，短答只说明那一点答对，学习者说“我懂了”、单次表现都不能单独让它合上；证据不足就该判未合上。每个判定都对就过；有一个判错（该合上判了未合上，或不该合上判了合上）就不过，写清哪个判定错在哪。只看对话里学习者实际的表现。',
      `${ticket}\n\n守卫判定：\n${vs.map((v) => `第 ${String(v.line)} 行：${v.closed ? '合上' : '未合上'}；依据：${v.basis}；证据行：${v.lines.join('、') || '无'}`).join('\n')}\n\n${transcript}`,
    );
  }
  await add(
    '教学诊断与处理',
    'judge',
    `下面给出这位模拟学习者的设定（教学侧看不到，只能从对话里诊断）。读学习对话原文判断：${run.student.teachingFocus} 做到了就过；明显没做到就不过，写清缺在哪。`,
    `${personaText(run)}\n\n${ticket}\n\n${transcript}`,
  );
  const talk = session(run, run.talkId);
  await add(
    '模拟学生守住人设',
    'judge',
    '下面是模拟学生的人设与真实知识状态。读对话里学习者的行，判断学生是否按人设表演：答题水平、误解、行为（该糊弄就糊弄、该跑题就跑题、该放弃就放弃、该点按钮就点）与设定一致，没有突然比设定更懂，也没有因为对方讲一遍就立刻全会。基本一致就过；明显走样就不过，指出行号。',
    `${personaText(run)}\n\n${talk ? `畅谈原文：\n${renderTranscript(talk.records)}\n\n` : ''}${transcript}`,
    '模拟学生',
  );
  const material = await cardMaterial(run);
  if (material !== undefined) {
    await add(
      '下一张卡合理',
      'judge',
      '判断“下一张选项卡”合理不合理：① 不把已经学会（合上）的内容当新内容推；② 已会的只作出发点；③ 刚学的那段没合上时，看缺在哪个前置，决定接着学还是先补前置；④ 选项与学习者谈定的方向有关；⑤ 推荐的那项一步不太大（新旧知识比例合适）；⑥ 标题和理由是日常话。有明显违反就不过，写清是哪一条。',
      material,
    );
  }
  if (run.interjection?.line !== undefined) {
    await add(
      '中途插话（只记录）',
      'observe',
      `学习者在第 ${String(run.interjection.line)} 行插了一句话（当时教学模型${run.interjection.whileRunning ? '正在回答上一句' : '刚答完上一句'}）。读插话前后的原文，描述教学模型怎么处理：有没有回应插话、怎么回应（先答插话再接着原来的、合在一起答、忽略、答非所问），原来那一轮的回答有没有被打断、重复或断掉。`,
      transcript,
    );
  }
  if (run.student.observeFocus !== undefined) {
    await add(
      `${run.student.name}的处理（只记录）`,
      'observe',
      run.student.observeFocus,
      transcript,
    );
  }
  return out;
}

/** 合起来定归因：守卫期望不符时，看“守卫判得对”与“模拟学生守住人设”两个判分。 */
export function attribute(checks: CheckResult[]): CheckResult[] {
  const get = (id: string) => checks.find((c) => c.id === id);
  const guardRight = get('守卫判得对');
  const fidelity = get('模拟学生守住人设');
  return checks.map((c) => {
    if (c.id === '守卫判定符合预期' && c.outcome === '不过') {
      if (guardRight?.outcome === '不过') {
        return { ...c, attribution: '系统·提示词', why: '判分器认为守卫按对话原文就判错了' };
      }
      if (fidelity?.outcome === '不过') {
        return { ...c, attribution: '模拟学生', why: '学生没按人设演，守卫按原文判是对的' };
      }
      return {
        ...c,
        attribution: '不确定',
        why: '守卫按原文判得对、学生也基本守住人设——可能是期望本身对这段对话不成立，要人看原文',
      };
    }
    if (c.id === '教学诊断与处理' && c.outcome === '不过' && fidelity?.outcome === '不过') {
      return {
        ...c,
        attribution: '不确定',
        why: '学生没守住人设，教学没诊断出“设定里的”状态不一定是系统的错',
      };
    }
    return c;
  });
}
