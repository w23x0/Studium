// 学习对话与检索子代理的沙盒（工单 W4 §5.4）：程序准备只读的资料与记录、可写的工作区，
// 模型在里面用通用读写与命令自己取。工作区建一次、从不清空；只读的渲染每轮前整份重写。
// 设计：会话/学习对话.md §2；记录/读写权限.md「执行方式」「权限表」。
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NumberedRecord } from '../shared/records.ts';
import type { Import, Learning } from '../shared/protocol-learned.ts';
import type { Hub } from './hub.ts';
import { NotFoundError } from './hub.ts';
import type { Learned } from './learned.ts';
import { BOOK_DIR, type Library } from './knowledge/library.ts';
import type { PedagogyStore } from './knowledge/pedagogy.ts';
import type { StateStore } from './knowledge/state.ts';
import type { Objections } from './knowledge/objections.ts';
import type { TeachingTools } from './teaching-tools.ts';
import type { SandboxSpec } from './model/port.ts';
import { renderTranscript } from './transcript.ts';

/** 只读区里教学工具那一项在记录里的虚拟路径前缀。 */
const TEACHING_TOOLS_DIR = '教学工具';

/** 只读条目是什么（开场里那句“是什么”）。 */
const WHAT: Record<string, string> = {
  教学工具: '教学工具（可选的做法参考，不常驻提示词）',
  学过的记录: '以往的学习（单子、判定、对话原文）',
  状态记录: '学习者的状态与条件',
  教法记录: '这个学习者的教法记录',
  '本次对话.md': '本次学习的对话原文，带行号（压缩后按行号读回）',
};

/** 开场里的沙盒说明：逐项列虚拟路径 → 实际路径 → 是什么、能否写（工单 W4 §5.5）。 */
export function describeSandbox(sb: SandboxSpec): string {
  const books = sb.readOnly.filter((e) => e.name.startsWith('资料/'));
  return [
    '沙盒（这次的执行环境；用通用的读写与命令自己取，只读区写不进去）：',
    `- 工作区（可写）：${sb.workdir} —— 你自己的草稿，想记才记`,
    ...sb.readOnly.map(
      (e) =>
        `- 只读/${e.name}（只读）→ ${e.path}${WHAT[e.name] !== undefined ? ` —— ${WHAT[e.name]}` : e.name.startsWith('资料/') ? ' —— 教材原文' : ''}`,
    ),
    // 缺料要写明，不中止（记录/读写权限.md「缺料与冲突」）
    ...(books.length === 0 ? ['（这次没有可用的资料：缺资料依据）'] : []),
  ].join('\n');
}

export interface SandboxDeps {
  hub: () => Hub;
  learned: Learned;
  library: Library;
  pedagogy: PedagogyStore;
  state: StateStore;
  objections: Objections;
  teaching: TeachingTools;
  /** 数据目录；沙盒在 <数据>/sandbox/<会话 id>/。 */
  dataDir: string;
  /** 项目选用的资料（没选 = 全库）；同 studium.scopeOf。 */
  scopeOf: (sessionId: string) => Promise<string[] | undefined>;
}

export class Sandboxes {
  constructor(private readonly o: SandboxDeps) {}

  /** 沙盒根：<数据>/sandbox/<会话 id>/。 */
  root(sessionId: string): string {
    return join(this.o.dataDir, 'sandbox', sessionId);
  }

  /** 学习对话的沙盒：工作区建一次，只读的渲染好；返回给模型接口的 spec。 */
  async forLoop(loopId: string): Promise<SandboxSpec> {
    const workdir = join(this.root(loopId), '工作区');
    await mkdir(workdir, { recursive: true });
    await this.refreshLoop(loopId);
    return {
      workdir,
      readOnly: [
        ...(await this.bookEntries(loopId)),
        ...this.dirEntries(loopId, [TEACHING_TOOLS_DIR, '学过的记录', '状态记录', '教法记录']),
        { name: '本次对话.md', path: join(this.root(loopId), '只读', '本次对话.md') },
      ],
      network: false,
    };
  }

  /** 每轮发给模型之前刷新只读的渲染（本次对话、学过的记录、状态记录、教法记录、教学工具）。 */
  async refreshLoop(loopId: string): Promise<void> {
    const readOnly = join(this.root(loopId), '只读');
    await writeDir(
      join(readOnly, TEACHING_TOOLS_DIR),
      (await this.o.teaching.loadAll()).tools.map((t) => ({ name: t.file, text: t.text })),
    );
    const records = await this.o.hub().records(loopId);
    await writeDir(join(readOnly, '学过的记录'), await this.learnedFiles(loopId));
    await mkdir(join(readOnly, '状态记录'), { recursive: true });
    await writeFile(join(readOnly, '状态记录', '状态.md'), this.stateText(), 'utf8');
    await mkdir(join(readOnly, '教法记录'), { recursive: true });
    await writeFile(join(readOnly, '教法记录', '教法记录.md'), this.strategyText(), 'utf8');
    await writeFile(join(readOnly, '本次对话.md'), renderTranscript(records), 'utf8');
  }

  /** 检索子代理的沙盒：只读的学过的记录与导航所属项目范围内的资料；不写。 */
  async forRetrieve(sessionId: string, navId: string): Promise<SandboxSpec> {
    const root = this.root(sessionId);
    const workdir = join(root, '工作区');
    await mkdir(workdir, { recursive: true });
    await writeDir(join(root, '只读', '学过的记录'), await this.learnedFiles(undefined));
    return {
      workdir,
      readOnly: [
        ...(await this.bookEntries(navId)),
        { name: '学过的记录', path: join(root, '只读', '学过的记录') },
      ],
      network: false,
    };
  }

  // ───────────── 只读区的内容 ─────────────

  /** 每本可用的书一项：`资料/<书 id>` → 这本书的切分目录。 */
  private async bookEntries(sessionId: string): Promise<{ name: string; path: string }[]> {
    const scope = await this.o.scopeOf(sessionId);
    const books = scope ?? (await this.o.library.books());
    return Promise.all(
      books.map(async (b) => ({
        name: `资料/${b}`,
        path: join(await this.o.library.bookDir(b), BOOK_DIR),
      })),
    );
  }

  private dirEntries(sessionId: string, names: string[]): { name: string; path: string }[] {
    return names.map((name) => ({ name, path: join(this.root(sessionId), '只读', name) }));
  }

  /**
   * 只读/学过的记录/：每次以往的学习两个文件（上层 + 中层 / 下层对话）+ 索引 + 外部导入。
   * `exclude` = 本次（本次学习不进“学过的记录”）。
   */
  private async learnedFiles(
    exclude: string | undefined,
  ): Promise<{ name: string; text: string }[]> {
    const all = (await this.o.learned.all()).filter((l) => l.loopId !== exclude);
    const files: { name: string; text: string }[] = [];
    for (const l of all) {
      files.push({ name: `${l.loopId}.md`, text: await this.learningText(l) });
      files.push({ name: `${l.loopId}-对话.md`, text: await this.transcriptText(l.loopId) });
    }
    files.push({
      name: '索引.md',
      text: [
        '# 以往的学习（一次一行）',
        '',
        ...(all.length > 0
          ? all.map(
              (l) =>
                `- ${l.loopId}「${l.title}」${l.status}，开始 ${l.openedAt.slice(0, 16).replace('T', ' ')}`,
            )
          : ['（还没有）']),
      ].join('\n'),
    });
    files.push({ name: '外部导入.md', text: await this.importsText() });
    return files;
  }

  /** 一次学习的上层 + 中层，每项带 `会话 id:行号`。 */
  private async learningText(l: Learning): Promise<string> {
    const lines = [
      `# 一次学习 ${l.loopId}「${l.title}」`,
      '',
      `- 状态：${l.status}；开始 ${l.openedAt.slice(0, 16).replace('T', ' ')}${l.endedAt !== undefined ? `；结束 ${l.endedAt.slice(0, 16).replace('T', ' ')}` : ''}`,
      `- 单子：新点 ${l.ticket.newPoint}；预期理解 ${l.ticket.clause}；出发点 ${
        l.ticket.startPoints
          .map(
            (s) => `${s.point}（来源：${s.source}${s.ref !== undefined ? `，依据 ${s.ref}` : ''}）`,
          )
          .join('；') || '（无）'
      }；路线动作：${l.ticket.routeAction}`,
    ];
    if (l.endNote !== undefined) {
      const endLine = await this.lineOf(l.loopId, 'loop_ended');
      lines.push(
        `- 结束原话${endLine !== undefined ? `（${l.loopId}:L${String(endLine)}）` : ''}：${l.endNote}`,
      );
    }
    if (l.routeDecision !== undefined) {
      const main = (await this.o.hub().opened(l.loopId)).parent ?? '项目主对话';
      lines.push(
        `- 当时的路线决定（${main}:L${String(l.routeDecision.line)}）：${l.routeDecision.decision}（理由：${l.routeDecision.reason}）`,
      );
    }
    if (l.verdict !== undefined) {
      const u = l.verdict.understanding
        .map(
          (x) =>
            `${x.text}（${x.independence}、${x.durability}${x.lines.length > 0 ? `，L${x.lines.join('、')}` : ''}）`,
        )
        .join('；');
      lines.push(
        `- 通过的守卫判定（${l.loopId}:L${String(l.verdict.line)}）：${l.verdict.basis}${l.verdict.model !== undefined ? `（判定的模型：${l.verdict.model}）` : ''}`,
      );
      if (u !== '') lines.push(`- 学习者实际表现出的理解：${u}`);
    }
    return lines.join('\n');
  }

  /** 一次学习的下层：对话原文（按行号排）。 */
  private async transcriptText(loopId: string): Promise<string> {
    const records = await this.o.hub().records(loopId);
    const rows = records.flatMap((r) => {
      const one = lowerLine(r);
      return one === undefined ? [] : [{ line: r.line, text: one }];
    });
    return rows
      .sort((a, b) => a.line - b.line)
      .map((r) => r.text)
      .join('\n');
  }

  private async importsText(): Promise<string> {
    const imports = await this.o.learned.imports();
    if (imports.length === 0) return '# 外部导入\n\n（暂无）';
    const rows = await Promise.all(imports.map((x) => this.importText(x)));
    return [
      '# 外部导入（学习者在系统之外学到的：畅谈里说的 / 笔记里写的）',
      '',
      '未验证，可信度低于学习记录：学习里的证据永远优先，可以怀疑，不算“已合上过”。',
      '',
      ...rows,
    ].join('\n');
  }

  private async importText(x: Import): Promise<string> {
    const at = `${x.id}（${x.at.slice(0, 16).replace('T', ' ')}，${x.channel}）`;
    if (!('session' in x.ref)) return `- ${at}：笔记 ${x.ref.note}（未验证）`;
    const { session, lines } = x.ref;
    const recs = await this.o
      .hub()
      .records(session)
      .catch((e: unknown) => {
        if (e instanceof NotFoundError) return [];
        throw e;
      });
    const said = recs
      .filter((r) => lines.includes(r.line) && r.record.type === 'user_message')
      .map((r) => (r.record.type === 'user_message' ? r.record.text : ''))
      .join(' / ');
    return `- ${at}：${session} 第 ${lines.join('、')} 行${said !== '' ? `（原话：${said}）` : ''}（未验证）`;
  }

  /** 只读/状态记录/状态.md：当前状态页 + 全部状态记录 + 异议。 */
  private stateText(): string {
    const state = this.o.state;
    const rows = state.allRecords();
    return [
      '# 学习者的非知识状态与条件',
      '',
      state.describeCurrent(),
      '',
      '## 状态记录（底层，只追加）',
      rows.length > 0
        ? rows.map((r) => state.describeRecord(r) + this.objectionNotes('state', r.id)).join('\n')
        : '（暂无）',
      '',
      '解释候选须你和知识证据一起掂量后才能当依据；承载读数可直接用。',
    ].join('\n');
  }

  /** 只读/教法记录/教法记录.md：这个学习者的教法记录（后台整理写的）。 */
  private strategyText(): string {
    const rows = this.o.pedagogy.all();
    if (rows.length === 0) return '# 教法记录\n\n（还没有）';
    return [
      '# 教法记录（这个学习者在什么条件下用过什么教法、之后怎样；单条不证明因果）',
      '',
      ...rows.map((r) => this.o.pedagogy.describe(r) + this.objectionNotes('pedagogy', r.id)),
    ].join('\n');
  }

  private objectionNotes(kind: 'pedagogy' | 'state', recordId: string): string {
    return this.o.objections
      .forRecord(kind, recordId)
      .map((o) => `\n  学习者异议（自述，原记录没改）：${o.text}`)
      .join('');
  }

  private async lineOf(sessionId: string, type: 'loop_ended'): Promise<number | undefined> {
    return (await this.o.hub().records(sessionId)).find((r) => r.record.type === type)?.line;
  }
}

/** 下层一行：对话本身。 */
function lowerLine(r: NumberedRecord): string | undefined {
  if (
    r.record.type === 'user_message' ||
    r.record.type === 'assistant_message' ||
    r.record.type === 'program_fact'
  ) {
    const one = renderTranscript([r]);
    return one === '' ? undefined : one;
  }
  return undefined;
}

/** 整份重写一个只读目录（每轮前调用，模型写不进去）。 */
async function writeDir(dir: string, files: { name: string; text: string }[]): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const written = new Set<string>();
  for (const f of files) {
    if (written.has(f.name)) continue; // 同名以先写的为准（官方的教学工具在前）
    written.add(f.name);
    await writeFile(join(dir, f.name), f.text, 'utf8');
  }
}
