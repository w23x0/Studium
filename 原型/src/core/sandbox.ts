// 会话的沙盒（工单 W4 §5.4、W11）：程序准备只读的资料与记录、可写的工作区，模型在里面用通用读写与命令自己取。
// 学习对话：工作区建一次、从不清空；只读的渲染每轮前整份重写。导入会话：只读原件、工作区就是那份资料的正文。
// W12 §3.2 起主对话不再读本机（没有沙盒）。
// 设计：会话/学习对话.md §2；记录/读写权限.md「执行方式」「权限表」。
import { readdirSync, realpathSync } from 'node:fs';
import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NumberedRecord } from '../shared/records.ts';
import type { Import, Learning } from '../shared/protocol-learned.ts';
import type { Hub } from './hub.ts';
import { NotFoundError } from './hub.ts';
import type { Learned } from './learned.ts';
import type { Materials } from './knowledge/materials.ts';
import type { TeachingTools } from './teaching-tools.ts';
import type { SandboxSpec } from './model/port.ts';
import { renderTranscript } from './transcript.ts';
import { localMinute } from '../shared/time.ts';

/** 要在沙盒里跑代码的会话只挡这几处已知存密钥、登录信息的隐藏位置（主对话挡全部隐藏条目）。 */
const SECRET_DOTS = [
  '.ssh',
  '.gnupg',
  '.claude',
  '.claude.json',
  '.aws',
  '.netrc',
  '.git-credentials',
  '.docker',
  '.config/studium.env',
  '.config/gh',
  '.codex',
  '.gemini',
];

/** `书库处理/` 的密钥文件（MinerU 密钥）。 */
const TOOL_ENV = join(dirname(fileURLToPath(import.meta.url)), '../../../书库处理/.env');

/** 只读区里的资料目录（程序渲染）。 */
const MATERIAL_INDEX = '资料/目录.md';
const MATERIAL_INDEX_NAME: string = MATERIAL_INDEX;

/** 只读区里教学工具那一项在记录里的虚拟路径前缀。 */
const TEACHING_TOOLS_DIR = '教学工具';

/** 只读条目是什么（开场里那句“是什么”）。 */
const WHAT: Record<string, string> = {
  教学工具: '教学工具（可选的做法参考，不常驻提示词）',
  学过的记录:
    '以往的学习（每次一份对话原文 <学习 id>-对话.md，带日期；索引.md 列全部）与学习者在别处学过的（外部导入：笔记、对话记录）',
  '本次对话.md': '本次学习的对话原文，带行号（压缩后按行号读回）',
  '项目说明.md': '学习者写给这个项目的长期要求（项目说明）；与学习者当场说的冲突时以当场说的为准',
  '方向.md': '这个项目谈定的方向（学成后能做什么、每块为什么学），带日期',
  '跨次记录.md':
    '跨次记录：本项目各次学习学到哪、学习者说过的长期的话，带编号与出处（每轮刷新；和第一条消息末尾附的是同一份）',
  附图: '学习者在这次学习里附过的图片原件（消息里写了是哪张）',
  [MATERIAL_INDEX_NAME]:
    '本项目能读的资料的目录（本项目的 + 学习者的笔记等）：每份一行（id、标题、种类、归属、版本、日期、状态、说明）；引用写 资料id/文件:行号',
};

/** 开场里的沙盒说明：只列只读区有什么（虚拟路径 + 是什么）；资料一份份的看 资料/目录.md。 */
export function describeSandbox(sb: SandboxSpec): string {
  const materialDirs = sb.readOnly.filter(
    (e) => e.name.startsWith('资料/') && e.name !== MATERIAL_INDEX,
  );
  return [
    '只读区（当前目录是你的工作区，可写）：',
    ...sb.readOnly
      .filter((e) => WHAT[e.name] !== undefined)
      .map((e) => `- 只读/${e.name} —— ${WHAT[e.name] ?? ''}`),
    ...(materialDirs.length > 0
      ? [
          `- 只读/资料/<资料id>/ —— 本项目能读的资料正文（按原目录），共 ${String(materialDirs.length)} 份`,
        ]
      : []),
    // 缺料要写明，不中止（记录/读写权限.md「缺料与冲突」）
    ...(materialDirs.length === 0 ? ['（这次没有可用的资料：缺资料依据）'] : []),
  ].join('\n');
}

export interface SandboxDeps {
  hub: () => Hub;
  learned: Learned;
  materials: Materials;
  /** 资料清单的行（同 studium.materialLines）。 */
  materialLines: (ids: string[]) => Promise<string[]>;
  teaching: TeachingTools;
  /** 数据目录；沙盒在 <数据>/sandbox/<会话 id>/。 */
  dataDir: string;
  /** 本项目能读的资料（按归属：本项目的 + 学习者的；没有 = 空）；同 studium.scopeOf。 */
  scopeOf: (sessionId: string) => Promise<string[]>;
  /** 所属项目的项目说明（没写 = 空串）；后台整理不经这里拿（工单 W9 §4.6）。 */
  instructionsOf: (sessionId: string) => Promise<string>;
  /** 方向（项目谈定的方向目标，没有 = 空串）。 */
  goalText: (sessionId: string) => Promise<string>;
  /** 跨次记录的清单（W13；不属于项目 = 空串）。 */
  notesOf: (sessionId: string) => Promise<string>;
  /** 附图原件所在的目录（W12 §5.6）。 */
  imagesDir: string;
  /** 会话所属的项目（主对话 id）；外部导入按它过滤（指向的资料本项目读得到才给，W11）。 */
  projectOf: (sessionId: string) => Promise<string | undefined>;
  /** 学习者删掉的讨论串（W12 §4.3）：学过的记录里不再包含。 */
  deleted: (sessionId: string) => boolean;
}

export class Sandboxes {
  constructor(private readonly o: SandboxDeps) {}

  /** 沙盒根：<数据>/sandbox/<会话 id>/。 */
  root(sessionId: string): string {
    return join(this.o.dataDir, 'sandbox', sessionId);
  }

  /** 学习对话的工作区（它自己的草稿）。 */
  workdir(loopId: string): string {
    return join(this.root(loopId), '工作区');
  }

  /**
   * 挡掉不让读的位置（W11 §5）：家目录下所有以点开头的顶层条目（`~/.ssh` `~/.config` `~/.claude` `~/.local`
   * `~/.git-credentials` 等存密钥、存登录信息的地方一网打尽）+ 数据目录（含口令、别的项目的东西）与它的备份 +
   * `书库处理/.env`。每处都给原路径与解开链接后的真实路径。每次开沙盒时现算（新出现的隐藏条目下次开时挡上）。
   * 主对话（读本机）按这一整套挡。学习对话、检索、导入会话（`allDots = false`）只挡已知存密钥的几处：它们要在
   * 命令行里跑代码，工具链常装在 `~/.local` `~/.cargo` 这类隐藏目录里（本机的 node 就在 `~/.local`）。
   * 工作区与只读区里本来就在数据目录下的条目照旧能读。
   */
  denyRead(allDots = true): string[] {
    const home = homedir();
    const dots = allDots
      ? readdirSync(home)
          .filter((n) => n.startsWith('.'))
          .map((n) => join(home, n))
      : SECRET_DOTS.map((n) => join(home, n));
    const all = [
      ...dots,
      TOOL_ENV,
      this.o.dataDir,
      `${this.o.dataDir.replace(/[/\\]+$/, '')}-备份`,
    ];
    return [...new Set(all.flatMap((p) => [p, realOrSelf(p)]))];
  }

  /**
   * 本机能拷进来的范围（主对话的 import_local；W12 起主对话不读本机，这只用来判路径）：家目录，挡掉 denyRead 的位置。
   */
  localScope(): SandboxSpec {
    return {
      workdir: join(this.o.dataDir, 'sandbox', '.本机'),
      readOnly: [{ name: '本机', path: homedir() }],
      network: false,
      commands: false,
      denyRead: this.denyRead(),
    };
  }

  /** 导入会话的沙盒（W11 §4）：工作区 = 这份资料的 正文/；只读 = 原件/；能跑命令、不联网。 */
  async forImport(material: string): Promise<SandboxSpec> {
    const workdir = await this.o.materials.bodyDir(material);
    await mkdir(workdir, { recursive: true });
    return {
      workdir,
      readOnly: [{ name: '原件', path: await this.o.materials.originalDir(material) }],
      network: false,
      commands: true,
      denyRead: this.denyRead(false),
    };
  }

  /** 学习对话的沙盒：工作区建一次，只读的渲染好；返回给模型接口的 spec。 */
  async forLoop(loopId: string): Promise<SandboxSpec> {
    const workdir = this.workdir(loopId);
    await mkdir(workdir, { recursive: true });
    await this.refreshLoop(loopId);
    return {
      workdir,
      readOnly: [
        ...(await this.materialEntries(loopId)),
        ...this.dirEntries(loopId, [TEACHING_TOOLS_DIR, '学过的记录']),
        { name: '本次对话.md', path: join(this.root(loopId), '只读', '本次对话.md') },
        { name: '项目说明.md', path: join(this.root(loopId), '只读', '项目说明.md') },
        { name: '方向.md', path: join(this.root(loopId), '只读', '方向.md') },
        { name: '跨次记录.md', path: join(this.root(loopId), '只读', '跨次记录.md') },
        { name: '附图', path: join(this.root(loopId), '只读', '附图') },
      ],
      network: false,
      denyRead: this.denyRead(false),
    };
  }

  /** 每轮发给模型之前刷新只读的渲染（本次对话、学过的记录、方向、项目说明、跨次记录、教学工具）。 */
  async refreshLoop(loopId: string): Promise<void> {
    const readOnly = join(this.root(loopId), '只读');
    await writeDir(
      join(readOnly, TEACHING_TOOLS_DIR),
      (await this.o.teaching.loadAll()).tools.map((t) => ({ name: t.file, text: t.text })),
    );
    const records = await this.o.hub().records(loopId);
    await writeDir(
      join(readOnly, '学过的记录'),
      await this.learnedFiles(loopId, await this.o.projectOf(loopId)),
    );
    await this.copyImages(join(readOnly, '附图'), records);
    await writeFile(
      join(readOnly, '本次对话.md'),
      renderTranscript(records.filter((r) => this.visible(r))),
      'utf8',
    );
    const goal = await this.o.goalText(loopId);
    await writeFile(
      join(readOnly, '方向.md'),
      `# 方向\n\n${goal !== '' ? goal : '（还没谈定）'}\n`,
      'utf8',
    );
    const instructions = await this.o.instructionsOf(loopId);
    await writeFile(
      join(readOnly, '项目说明.md'),
      `# 项目说明（学习者明确的长期要求；与当场说的冲突以当场为准）\n\n${instructions !== '' ? instructions : '（学习者还没写）'}\n`,
      'utf8',
    );
    const notes = await this.o.notesOf(loopId);
    await writeFile(
      join(readOnly, '跨次记录.md'),
      `${notes !== '' ? notes : '# 跨次记录\n\n（这个对话不属于项目）'}\n`,
      'utf8',
    );
  }

  // ───────────── 只读区的内容 ─────────────

  /**
   * 本项目能读的每份能用的资料一项（按归属：学习者的 + 本项目的；学过的笔记也在这里按原目录挂）：
   * `资料/<资料 id>` → 它的正文目录；外加程序渲染的 `资料/目录.md`。
   */
  private async materialEntries(sessionId: string): Promise<{ name: string; path: string }[]> {
    const ids = await this.o.scopeOf(sessionId);
    const index = join(this.root(sessionId), '只读', '资料目录.md');
    await mkdir(dirname(index), { recursive: true });
    await writeFile(
      index,
      ids.length > 0
        ? `# 本项目能读的资料\n\n每份：id｜标题｜种类｜归属｜版本｜日期｜状态｜大小｜说明。正文在 只读/资料/<id>/（按原目录；有 说明.md 的先看它）；引用写 资料id/文件:行号。归“学习者”的是跟着学习者走的（笔记、别处的学习记录等），标“学过的”的是学习者自己写的 / 学过的痕迹，不是讲知识的原文。代码仓库在这里只读，要跑就把需要的部分拷进工作区再跑。\n\n${(await this.o.materialLines(ids)).join('\n')}\n`
        : '# 本项目能读的资料\n\n还没有能用的资料（缺资料依据）。\n',
      'utf8',
    );
    const entries = await Promise.all(
      ids.map(async (b) => ({ name: `资料/${b}`, path: await this.o.materials.bodyDir(b) })),
    );
    if (entries.length > 0) {
      // 读文件的工具要完整路径：每份正文目录的完整路径也列上（只读/资料/<id>/ 是同一个目录）
      await writeFile(
        index,
        `\n每份正文目录的完整路径：\n${entries.map((e) => `- ${e.name.slice('资料/'.length)}：${e.path}`).join('\n')}\n`,
        { encoding: 'utf8', flag: 'a' },
      );
    }
    return [{ name: MATERIAL_INDEX, path: index }, ...entries];
  }

  private dirEntries(sessionId: string, names: string[]): { name: string; path: string }[] {
    return names.map((name) => ({ name, path: join(this.root(sessionId), '只读', name) }));
  }

  /**
   * 只读/学过的记录/：每次以往的学习两个文件（上层 + 中层 / 下层对话）+ 索引 + 外部导入
   * （外部导入.md 列条目；笔记与对话记录的 md 放 外部导入/<导入 id>.md）。
   * `exclude` = 本次（本次学习不进“学过的记录”）；`project` = 外部导入只给这个项目读得到的（不给 = 不列外部导入）。
   */
  private async learnedFiles(
    exclude: string | undefined,
    project: string | undefined,
  ): Promise<{ name: string; text: string }[]> {
    const all = (await this.o.learned.all()).filter(
      (l) => l.loopId !== exclude && !this.o.deleted(l.loopId),
    );
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
              (l) => `- ${l.loopId}「${l.title}」${l.status}，开始 ${localMinute(l.openedAt)}`,
            )
          : ['（还没有）']),
      ].join('\n'),
    });
    const imports = project !== undefined ? await this.o.learned.imports(project) : [];
    files.push({ name: '外部导入.md', text: await this.importsText(imports) });
    for (const x of imports) {
      const text = await this.o.learned.importText(x);
      if (text !== undefined) files.push({ name: `外部导入/${x.id}.md`, text });
    }
    return files;
  }

  /** 一次学习的上层 + 中层，每项带 `会话 id:行号`。 */
  private async learningText(l: Learning): Promise<string> {
    const lines = [
      `# 一次学习 ${l.loopId}「${l.title}」`,
      '',
      `- 状态：${l.status}；开始 ${localMinute(l.openedAt)}${l.endedAt !== undefined ? `；结束 ${localMinute(l.endedAt)}` : ''}`,
      // 旧数据才有单子（W12 起新开的学习没有）
      ...(l.ticket.newPoint !== ''
        ? [
            `- 单子（旧数据）：新点 ${l.ticket.newPoint}；预期理解 ${l.ticket.clause}；出发点 ${
              l.ticket.startPoints
                .map(
                  (s) =>
                    `${s.point}（来源：${s.source}${s.ref !== undefined ? `，依据 ${s.ref}` : ''}）`,
                )
                .join('；') || '（无）'
            }；路线动作：${l.ticket.routeAction}`,
          ]
        : []),
    ];
    if (l.endNote !== undefined) {
      // 旧数据：没合上就结束时的原话（loop_ended）
      const endLine = await this.lineOf(l.loopId, 'loop_ended');
      lines.push(
        `- 结束原话${endLine !== undefined ? `（${l.loopId}:L${String(endLine)}）` : ''}：${l.endNote}`,
      );
    }
    if (l.routeDecision !== undefined) {
      const main = (await this.o.hub().opened(l.loopId)).parent ?? '项目主对话';
      lines.push(
        `- 旧数据·当时的路线决定（${main}:L${String(l.routeDecision.line)}）：${l.routeDecision.decision}（理由：${l.routeDecision.reason}）`,
      );
    }
    if (l.closing !== undefined) {
      lines.push(
        `- 旧数据·收尾那一句（${l.loopId}:L${String(l.closing.line)}，学习对话写的，只是指针；学习者会什么以对话原文里他自己说的、做的为准）：${l.closing.summary}`,
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
        `- 旧数据·通过的守卫判定（${l.loopId}:L${String(l.verdict.line)}）：${l.verdict.basis}${l.verdict.model !== undefined ? `（判定的模型：${l.verdict.model}）` : ''}`,
      );
      if (u !== '') lines.push(`- 学习者实际表现出的理解：${u}`);
    }
    return lines.join('\n');
  }

  /** 一次学习的下层：对话原文（按行号排；与 只读/学过的记录/<id>-对话.md 同一份，W14 开场也附它）。 */
  async transcriptText(loopId: string): Promise<string> {
    const records = (await this.o.hub().records(loopId)).filter((r) => this.visible(r));
    const rows = records.flatMap((r) => {
      const one = lowerLine(r);
      return one === undefined ? [] : [{ line: r.line, text: one }];
    });
    return rows
      .sort((a, b) => a.line - b.line)
      .map((r) => r.text)
      .join('\n');
  }

  private async importsText(imports: Import[]): Promise<string> {
    if (imports.length === 0) return '# 外部导入\n\n（暂无）';
    const rows = await Promise.all(imports.map((x) => this.importText(x)));
    return [
      '# 外部导入（学习者在系统之外学到的：畅谈里说的 / 笔记里写的 / 别处跟 AI 学的对话）',
      '',
      '未验证，可信度低于学习记录：学习里的证据永远优先，可以怀疑，不算“已合上过”。笔记与对话记录的全文接成一份在 外部导入/<id>.md（每个文件前标 <!-- 文件：相对路径 -->），按原目录读在 只读/资料/<资料 id>/（引用写 资料id/文件:行号）；对话记录里只有学习者说的、做的算证据，AI 讲的不算学习者会。',
      '',
      ...rows,
    ].join('\n');
  }

  private async importText(x: Import): Promise<string> {
    const at = `${x.id}（${localMinute(x.at)}，${x.channel}）`;
    if (!('session' in x.ref))
      return `- ${at}：《${x.title ?? x.id}》→ 外部导入/${x.id}.md，原目录 只读/资料/${x.ref.material}/（未验证）`;
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

  /** 这次学习里学习者附过的图（原图与送给模型的副本）拷进只读区（只拷还没有的；别的对话的图不给）。 */
  private async copyImages(dir: string, records: NumberedRecord[]): Promise<void> {
    await mkdir(dir, { recursive: true });
    const ids = new Set(
      records.flatMap(({ record: r }) =>
        r.type === 'user_message'
          ? (r.images ?? []).flatMap((i) => [
              i.attachmentId,
              ...(i.sentAs !== undefined ? [i.sentAs] : []),
            ])
          : [],
      ),
    );
    if (ids.size === 0) return;
    const have = new Set(await readdir(dir));
    for (const name of await readdir(this.o.imagesDir)) {
      const id = name.slice(0, name.lastIndexOf('.'));
      if (ids.has(id) && !have.has(name))
        await copyFile(join(this.o.imagesDir, name), join(dir, name));
    }
  }

  /** 删掉的讨论串发来的话不进沙盒（W12 §4.3）。 */
  private visible(r: NumberedRecord): boolean {
    return !(r.record.type === 'thread_message' && this.o.deleted(r.record.from));
  }

  private async lineOf(sessionId: string, type: 'loop_ended'): Promise<number | undefined> {
    // 最后一次（结束后能重开，W12 §2）
    return (await this.o.hub().records(sessionId)).filter((r) => r.record.type === type).at(-1)
      ?.line;
  }
}

/** 下层一行：对话本身。 */
function lowerLine(r: NumberedRecord): string | undefined {
  if (
    r.record.type === 'user_message' ||
    r.record.type === 'assistant_message' ||
    r.record.type === 'program_fact' ||
    r.record.type === 'thread_message'
  ) {
    const one = renderTranscript([r]);
    return one === '' ? undefined : one;
  }
  return undefined;
}

/** 解开链接后的真实路径；路径还不存在（如还没有备份目录）就用原路径。 */
function realOrSelf(p: string): string {
  try {
    return realpathSync(p);
  } catch (err) {
    if ((err as { code?: string }).code === 'ENOENT') return p;
    throw err;
  }
}

/** 整份重写一个只读目录（每轮前调用，模型写不进去）。 */
async function writeDir(dir: string, files: { name: string; text: string }[]): Promise<void> {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const written = new Set<string>();
  for (const f of files) {
    if (written.has(f.name)) continue; // 同名以先写的为准（官方的教学工具在前）
    written.add(f.name);
    await mkdir(dirname(join(dir, f.name)), { recursive: true });
    await writeFile(join(dir, f.name), f.text, 'utf8');
  }
}
