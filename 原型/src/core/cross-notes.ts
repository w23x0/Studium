// 跨次记录（工单 W13，#83，试验中）：各对话当场记下的事实——学到哪、学习者说过的长期的话——开场给下一个对话。
// 条目记在写它的那个会话的正本里（`cross_note`）；这里只读正本现算、不另存。对学习者的判断（会了什么、接没接上、
// 下一段走哪）不在这里，读的一方按出处读原文。
import { CONVERSATION_KIND_LABELS, type SessionSummary } from '../shared/protocol.ts';
import type { CrossNote, LogRecord, NumberedRecord } from '../shared/records.ts';
import { localMinute } from '../shared/time.ts';
import type { Hub } from './hub.ts';
import type { Learned } from './learned.ts';

/** 一条只写一句：text、quote 的上限（字）；细节留在原文里，用出处指过去。 */
const TEXT_LIMIT = 200;
const QUOTE_LIMIT = 300;

/** 能作出处的行：对话原文里的话（学习者、模型最后写的、别的会话发来的）。 */
const SPEECH = new Set<LogRecord['type']>(['user_message', 'assistant_message', 'thread_message']);

export interface CrossNotesDeps {
  hub: () => Hub;
  learned: Learned;
  iso: () => string;
}

/** 模型调 note_down 时给的。 */
export interface NoteInput {
  kind: CrossNote['kind'];
  text: string;
  quote?: string;
  lines: number[];
  scope?: CrossNote['scope'];
  replaces?: string;
}

/** 一条还算数的条目：编号、记在哪个会话、那个会话属于哪个项目。 */
interface Placed {
  id: string;
  session: string;
  project: string | undefined;
  note: CrossNote;
}

export class CrossNotes {
  constructor(private readonly o: CrossNotesDeps) {}

  /** 这个项目现在看得到的条目（本项目的 + 学习者一层的），按时间升序；被替换、撤回的与撤回本身不列。 */
  async visible(project: string): Promise<Placed[]> {
    const hub = this.o.hub();
    const sessions = sessionMap(hub);
    const mine: Placed[] = [];
    for (const session of hub.sessionsWith('cross_note')) {
      const p = projectIn(sessions, session);
      for (const { line, record } of await hub.records(session)) {
        if (record.type !== 'cross_note') continue;
        if (p !== project && record.scope !== 'learner') continue;
        mine.push({ id: noteId(session, line), session, project: p, note: record });
      }
    }
    const gone = new Set(
      mine.flatMap((x) => (x.note.replaces !== undefined ? [x.note.replaces] : [])),
    );
    return mine
      .filter((x) => x.note.kind !== 'withdraw' && !gone.has(x.id))
      .sort((a, b) => a.note.at.localeCompare(b.note.at));
  }

  /** 记一条（工具 note_down）：核对出处、原话、要替换的那条；返回编号，或一句原因。 */
  async write(session: string, input: NoteInput): Promise<{ id: string } | string> {
    const hub = this.o.hub();
    const sessions = sessionMap(hub);
    const self = sessions.get(session);
    const project = projectIn(sessions, session);
    if (self === undefined || project === undefined) return '找不到这个对话所属的项目';
    if (input.kind === 'progress' && self.kind !== 'loop') return '学到哪只在学习对话里记';
    const text = input.text.trim();
    if (text === '') return 'text 不能是空的';
    if (text.length > TEXT_LIMIT) {
      return `text 有 ${String(text.length)} 字：一条只写一句（${String(TEXT_LIMIT)} 字以内），细节留在原文里，用 lines 指过去`;
    }
    const lines = [...new Set(input.lines)];
    if (lines.length === 0) return 'lines 至少给一行：这件事在本对话里的行号';
    const recs = await hub.records(session);
    for (const l of lines) {
      const r = recs.find((x) => x.line === l)?.record;
      if (r === undefined || !SPEECH.has(r.type)) {
        return `第 ${String(l)} 行不是本对话里的一句话（学习者的话、你写的话、别的对话发来的话才能作出处）`;
      }
    }
    let quote: string | undefined;
    if (input.kind === 'learner') {
      quote = stripQuotes(input.quote ?? '');
      if (quote === '') return '学习者的话要用 quote 照抄他原话里的一段';
      if (quote.length > QUOTE_LIMIT) {
        return `quote 有 ${String(quote.length)} 字：只抄说到这件事的那一段（${String(QUOTE_LIMIT)} 字以内）`;
      }
      if (!saidIn(recs, lines, quote)) {
        return 'quote 在 lines 指的那几行学习者的话里找不到：照抄原话里的一段，不改写、不概括（lines 要指到学习者说这话的那一行）';
      }
    }
    if (input.kind === 'withdraw' && !saidIn(recs, lines, '')) {
      return '撤回要有学习者的话作出处：lines 指到学习者说这条不对、要忘掉的那一行';
    }
    let scope: CrossNote['scope'] =
      input.kind === 'progress' ? 'project' : (input.scope ?? 'project');
    let replaces: string | undefined;
    if (input.replaces !== undefined && input.replaces.trim() !== '') {
      const id = canonical(input.replaces);
      const target = (await this.visible(project)).find((x) => x.id === id);
      if (target === undefined) {
        return `跨次记录里现在没有这一条：${input.replaces.trim()}（写跨次记录里那条末尾的编号，形如 会话id:L行号）`;
      }
      // 撤回跟着被撤回的那条走：学习者一层的撤回了，所有项目都不再列
      if (input.kind === 'withdraw') scope = target.note.scope;
      replaces = id;
    } else if (input.kind === 'withdraw') {
      return '撤回要用 replaces 指要撤回的那条（跨次记录里那条末尾的编号）';
    }
    const line = await hub.record(session, {
      type: 'cross_note',
      at: this.o.iso(),
      kind: input.kind,
      text,
      ...(quote !== undefined ? { quote } : {}),
      lines,
      scope,
      ...(replaces !== undefined ? { replaces } : {}),
    });
    return { id: noteId(session, line) };
  }

  /**
   * 给模型看的清单（学习对话、谈方向开场附上；学习对话沙盒里的 跨次记录.md；read_notes）。
   * 本项目每次学习（程序从正本列：状态、时间、收尾那一句或结束原话，加学习对话记的学到哪）+ 学习者说过的长期的话。
   * self = 正在读的这个对话（列到它自己时标出来）。
   */
  async render(project: string, self?: string): Promise<string> {
    const hub = this.o.hub();
    const sessions = sessionMap(hub);
    const notes = await this.visible(project);
    const learnings = (await this.o.learned.list(project)).learnings;
    const out = [
      '# 跨次记录',
      '',
      '各对话当时记下的事实和学习者原话，程序从记录里现列（只追加；被替换、撤回的不列）。这里没有对学习者的判断：他会了什么、接没接上、下一段走哪，按出处读原文再定。每条末尾是编号（改主意、撤回时 replaces 写它）和出处（记它的那个对话里的行号）。',
      '',
      '## 本项目的学习（旧的在前）',
      '',
    ];
    if (learnings.length === 0) out.push('（还没有）');
    for (const l of learnings) {
      const lastAt = sessions.get(l.loopId)?.lastAt;
      out.push(
        `- 「${l.title}」${l.loopId}${l.loopId === self ? '（就是这次）' : ''} · ${l.status} · 开始 ${localMinute(l.openedAt)}${
          l.endedAt !== undefined ? ` · 结束 ${localMinute(l.endedAt)}` : ''
        }${lastAt !== undefined ? ` · 最后活动 ${localMinute(lastAt)}` : ''}`,
      );
      for (const n of notes) {
        if (n.session !== l.loopId || n.note.kind !== 'progress') continue;
        out.push(`  - ${localMinute(n.note.at)} 学到哪：${n.note.text}${ref(n)}`);
      }
      if (l.closing !== undefined) {
        out.push(
          `  - 收尾那一句：${l.closing.summary}〔出处 ${l.loopId}:L${String(l.closing.line)}〕`,
        );
      }
      if (l.endNote !== undefined) out.push(`  - 没合上，结束时：${l.endNote}`);
    }
    const words = notes.filter((x) => x.note.kind === 'learner');
    const here = words.filter((x) => x.note.scope === 'project');
    const everywhere = words.filter((x) => x.note.scope === 'learner');
    out.push('', '## 学习者说过的长期的话', '');
    out.push(
      ...(here.length > 0 ? here.map((n) => wordLine(n, sessions, project)) : ['（还没有）']),
    );
    out.push('', '## 所有项目都适用（学习者明说以后都这样）', '');
    out.push(
      ...(everywhere.length > 0
        ? everywhere.map((n) => wordLine(n, sessions, project))
        : ['（还没有）']),
    );
    return out.join('\n');
  }
}

function sessionMap(hub: Hub): Map<string, SessionSummary> {
  return new Map(hub.listSessions().map((s) => [s.sessionId, s]));
}

/** 会话所属的项目（主对话 id）：沿 parent 往上找到 main；收掉、删掉的会话不在表里，算不属于任何项目。 */
function projectIn(sessions: Map<string, SessionSummary>, id: string): string | undefined {
  let cur = sessions.get(id);
  for (let i = 0; i < 8 && cur !== undefined; i++) {
    if (cur.kind === 'main') return cur.sessionId;
    cur = cur.parent === undefined ? undefined : sessions.get(cur.parent);
  }
  return undefined;
}

function noteId(session: string, line: number): string {
  return `${session}:L${String(line)}`;
}

/** 模型写的编号：`会话id:L行号`，也认不带 L 的。 */
function canonical(raw: string): string {
  const m = /^\s*(.+?):L?(\d+)\s*$/.exec(raw);
  return m?.[1] === undefined || m[2] === undefined ? raw.trim() : noteId(m[1], Number(m[2]));
}

function stripQuotes(s: string): string {
  return s
    .trim()
    .replace(/^[“"'‘「『]+|[”"'’」』]+$/g, '')
    .trim();
}

/**
 * lines 里有学习者的话，且 quote（去掉空白后）出现在其中一句里：学习者自己发的、他改过的那句、
 * 别的对话照抄附上的学习者原话都算。quote 为空 = 只看有没有学习者的话。
 */
function saidIn(recs: readonly NumberedRecord[], lines: number[], quote: string): boolean {
  const texts: string[] = [];
  for (const { line, record } of recs) {
    if (record.type === 'user_message' && lines.includes(line)) texts.push(record.text);
    if (
      record.type === 'message_edited' &&
      record.by === 'learner' &&
      lines.includes(record.line)
    ) {
      texts.push(record.text);
    }
    if (record.type === 'thread_message' && lines.includes(line)) {
      texts.push(...(record.cited ?? []).map((c) => c.text));
    }
  }
  const q = quote.replace(/\s+/g, '');
  return texts.some((t) => t.replace(/\s+/g, '').includes(q));
}

function ref(n: Placed): string {
  return `〔编号 ${n.id}；出处同一对话 ${n.note.lines.map((l) => `L${String(l)}`).join('、')}〕`;
}

function wordLine(n: Placed, sessions: Map<string, SessionSummary>, project: string): string {
  const s = sessions.get(n.session);
  const who = s === undefined ? n.session : `${CONVERSATION_KIND_LABELS[s.kind]}「${s.title}」`;
  const where = n.project !== project ? '，在别的项目里' : '';
  return `- ${localMinute(n.note.at)} “${n.note.quote ?? ''}”——${n.note.text}（${who}记${where}${
    n.note.replaces !== undefined ? '，替换了先前那条' : ''
  }）${ref(n)}`;
}
