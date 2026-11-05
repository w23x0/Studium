// 会话的沙盒（工单 W4 §5.4、W11）：程序准备只读的资料与记录、可写的工作区，模型在里面用通用读写与命令自己取。
// 学习对话：工作区建一次、从不清空；只读的渲染每轮前整份重写，物理摆法和模型看到的 只读/… 一样（W16：不做检索工具，
// 让进上下文的东西干净、规整，模型用通用工具自己查）。导入会话：只读原件、工作区就是那份资料的正文。
// W12 §3.2 起主对话不再读本机（没有沙盒）。
// 设计：会话/学习对话.md §2；记录/读写权限.md「执行方式」「权限表」。
import { readdirSync, realpathSync } from 'node:fs';
import { copyFile, lstat, mkdir, readdir, rm, symlink, writeFile } from 'node:fs/promises';
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

/** 只读区里各项的名字：物理上都在 `<沙盒>/只读/` 下，摆法和模型看到的虚拟路径一样（W16）。 */
const RO = {
  guide: '说明.md',
  self: '本次对话.md',
  learned: '学过的记录',
  main: '主对话.md',
  talks: '谈方向',
  notes: '跨次记录.md',
  instructions: '项目说明.md',
  goal: '方向.md',
  materials: '资料',
  images: '附图',
  tools: '教学工具',
} as const;

/** 资料目录在 只读/资料/ 下的文件名。 */
const MATERIAL_INDEX = '目录.md';

/** 对话原文的格式（renderTranscript 的写法），只读区说明里写一句事实（W16）。 */
const TRANSCRIPT_FORMAT =
  "对话原文（本次对话、以往的学习、主对话、谈方向）每条以 `L行号 谁（年-月-日 时:分）：` 开头，一条有多行时续行缩进 6 个空格；行号就是引用地址（引用写 会话id:L行号）。谁 = 学习者 / 教学 / 主对话 / 谈方向 / 程序 / 某某发来、回话。学习者自己说的、做的只在 `学习者（` 开头的行（例：只看他说过的话，grep '学习者（' 文件；多行的话只出第一行）；`整理（` 开头的是学习对话对他某一行话的整理，不是原话。";

/** 开场里的沙盒说明（同 只读/说明.md）：只读区每一项是什么、对话原文的格式。 */
export function describeSandbox(sb: SandboxSpec): string {
  const root = sb.readOnly.find((e) => e.name === '')?.path ?? '只读';
  const materials = sb.readOnly.filter((e) => e.name.startsWith(`${RO.materials}/`)).length;
  return guideText(root, materials);
}

function guideText(root: string, materials: number): string {
  return [
    `只读区：程序准备的，每轮刷新，写不进去。当前目录是你的工作区（可写，你自己的草稿）；只读区在工作区里就是 只读/（完整路径 ${root}），下面的路径都从 只读/ 起。`,
    `- 只读/${RO.guide} —— 这份说明`,
    `- 只读/${RO.self} —— 本次学习的对话原文（上下文压缩后按行号读回）`,
    `- 只读/${RO.learned}/ —— 以往的学习，按项目分目录，一次学习一个文件 <学习 id>-<标题>.md：头上是项目、状态、开始与最后活动时间、收尾那一句，下面是整份对话原文；那次用过的组件最新一版在同目录的 <学习 id>-组件/（原文里写作 [[组件:名字]]）。索引.md 按项目列全部（本项目在最后），带最后活动时间、距今多久。外部导入.md 与 外部导入/ 是学习者在别处学过的（笔记、和别的 AI 的对话），未验证`,
    `- 只读/${RO.main} —— 本项目主对话的原文`,
    `- 只读/${RO.talks}/ —— 本项目谈方向的对话原文，一次一个文件（学习者想拿这个做什么、要学到什么程度）`,
    `- 只读/${RO.notes} —— 本项目各次学习学到哪、学习者说过的长期的话，带编号与出处（和第一条消息末尾附的是同一份）`,
    `- 只读/${RO.instructions} —— 学习者写给这个项目的长期要求；与当场说的冲突时以当场说的为准`,
    `- 只读/${RO.goal} —— 这个项目谈定的方向（学成后能做什么、每块为什么学），带日期`,
    materials > 0
      ? `- 只读/${RO.materials}/ —— 本项目能读的资料，共 ${String(materials)} 份：${MATERIAL_INDEX} 每份一行；正文在 只读/${RO.materials}/<资料id>/，按原目录`
      : `- 只读/${RO.materials}/ —— 这次没有可用的资料（缺资料依据）`,
    `- 只读/${RO.images}/ —— 学习者在这次学习里附过的图片原件（消息里写了是哪张）`,
    `- 只读/${RO.tools}/ —— 教学工具：可选的做法参考，某个情形下用得上才拿来用`,
    '',
    TRANSCRIPT_FORMAT,
  ].join('\n');
}

/** 以往学习在 学过的记录/ 里的位置（W16：按项目分目录，一次学习一个文件）。 */
interface LearnedEntry {
  l: Learning;
  project: string | undefined;
  /** 项目目录名（学过的记录/ 下）。 */
  dir: string;
  /** 文件名去掉 .md。 */
  base: string;
  lastAt: string;
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
  /** 一次学习里每个组件的最新一版（W16；名字 = 原文里 [[组件:名字]] 的名字）。 */
  components: (loopId: string) => Promise<{ name: string; html: string }[]>;
  /** 附图原件所在的目录（W12 §5.6）。 */
  imagesDir: string;
  /** 会话所属的项目（主对话 id）；外部导入按它过滤（指向的资料本项目读得到才给，W11）。 */
  projectOf: (sessionId: string) => Promise<string | undefined>;
  /** 学习者删掉的讨论串（W12 §4.3）：学过的记录里不再包含。 */
  deleted: (sessionId: string) => boolean;
  /** 现在（索引里的“距今多久”）。 */
  now: () => Date;
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

  /** 学习对话的只读区：物理目录的摆法 = 模型看到的 只读/…（W16）。 */
  private readOnlyRoot(loopId: string): string {
    return join(this.root(loopId), '只读');
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

  /**
   * 学习对话的沙盒：工作区建一次，只读区渲染好；返回给模型接口的 spec。只读区整个是一项（name 空串），
   * 资料正文另各一项（只读/资料/<id> 是指向正文目录的链接，读写判断按解开链接后的真实路径）。
   */
  async forLoop(loopId: string): Promise<SandboxSpec> {
    const workdir = this.workdir(loopId);
    await mkdir(workdir, { recursive: true });
    await this.refreshLoop(loopId);
    const ids = await this.o.scopeOf(loopId);
    return {
      workdir,
      readOnly: [
        { name: '', path: this.readOnlyRoot(loopId) },
        ...(await Promise.all(
          ids.map(async (b) => ({
            name: `${RO.materials}/${b}`,
            path: await this.o.materials.bodyDir(b),
          })),
        )),
      ],
      network: false,
      denyRead: this.denyRead(false),
    };
  }

  /**
   * 每轮发给模型之前重写只读区（说明、本次对话、学过的记录、主对话、谈方向、方向、项目说明、跨次记录、资料目录、
   * 教学工具、附图）。
   */
  async refreshLoop(loopId: string): Promise<void> {
    const ro = this.readOnlyRoot(loopId);
    await mkdir(ro, { recursive: true });
    // 工作区里的 只读 链接（模型删了下一轮补回来）
    await mkdir(this.workdir(loopId), { recursive: true });
    await linkReadOnly(this.workdir(loopId));
    // W16 前的摆法留下的：资料目录曾在 只读/资料目录.md
    await rm(join(ro, '资料目录.md'), { force: true });
    await writeDir(
      join(ro, RO.tools),
      (await this.o.teaching.loadAll()).tools.map((t) => ({ name: t.file, text: t.text })),
    );
    const project = await this.o.projectOf(loopId);
    await writeDir(join(ro, RO.learned), await this.learnedFiles(loopId, project));
    const records = await this.o.hub().records(loopId);
    await this.copyImages(join(ro, RO.images), records);
    await writeFile(join(ro, RO.self), this.render(records, '教学'), 'utf8');
    await writeFile(join(ro, RO.main), await this.mainChatText(project), 'utf8');
    await writeDir(join(ro, RO.talks), await this.talkFiles(project));
    const goal = await this.o.goalText(loopId);
    await writeFile(
      join(ro, RO.goal),
      `# 方向\n\n${goal !== '' ? goal : '（还没谈定）'}\n`,
      'utf8',
    );
    const instructions = await this.o.instructionsOf(loopId);
    await writeFile(
      join(ro, RO.instructions),
      `# 项目说明（学习者明确的长期要求；与当场说的冲突以当场为准）\n\n${instructions !== '' ? instructions : '（学习者还没写）'}\n`,
      'utf8',
    );
    const notes = await this.o.notesOf(loopId);
    await writeFile(
      join(ro, RO.notes),
      `${notes !== '' ? notes : '# 跨次记录\n\n（这个对话不属于项目）'}\n`,
      'utf8',
    );
    const materials = await this.writeMaterials(loopId, join(ro, RO.materials));
    await writeFile(join(ro, RO.guide), `${guideText(ro, materials)}\n`, 'utf8');
  }

  /** 一次学习在只读区里的文件（`学过的记录/<项目>/<学习 id>-<标题>.md`）；删了的、不是学习的给 undefined。 */
  async learningFile(loopId: string): Promise<string | undefined> {
    const e = (await this.learnedLayout()).find((x) => x.l.loopId === loopId);
    return e === undefined ? undefined : `${RO.learned}/${e.dir}/${e.base}.md`;
  }

  /** 一次学习的对话原文（与它在 学过的记录/ 里那份文件下半截同一份，W14 开场也附它）。 */
  async transcriptText(loopId: string): Promise<string> {
    return this.render(await this.o.hub().records(loopId), '教学');
  }

  // ───────────── 只读区的内容 ─────────────

  /** 对话原文（删掉的讨论串发来的话不放）；self = 这个会话自己的模型叫什么。 */
  private render(records: NumberedRecord[], self: string): string {
    return renderTranscript(
      records.filter((r) => this.visible(r)),
      (id) => this.o.hub().labelOf(id),
      self,
    );
  }

  /**
   * 只读/资料/：`目录.md`（本项目能读的每份一行）+ 每份一个指向正文目录的链接（按归属：学习者的 + 本项目的；
   * 学过的笔记也在这里按原目录挂）。返回几份。
   */
  private async writeMaterials(sessionId: string, dir: string): Promise<number> {
    const ids = await this.o.scopeOf(sessionId);
    // 只删链接本身，不跟进链接（fs.rm 不跟随符号链接）
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, MATERIAL_INDEX),
      ids.length > 0
        ? `# 本项目能读的资料\n\n每份：id｜标题｜种类｜归属｜版本｜日期｜状态｜大小｜说明。正文在 只读/资料/<id>/（按原目录；有 说明.md 的先看它）；引用写 资料id/文件:行号。归“学习者”的是跟着学习者走的（笔记、别处的学习记录等），标“学过的”的是学习者自己写的 / 学过的痕迹，不是讲知识的原文。代码仓库在这里只读，要跑就把需要的部分拷进工作区再跑。\n\n${(await this.o.materialLines(ids)).join('\n')}\n`
        : '# 本项目能读的资料\n\n还没有能用的资料（缺资料依据）。\n',
      'utf8',
    );
    for (const id of ids) await symlink(await this.o.materials.bodyDir(id), join(dir, id), 'dir');
    return ids.length;
  }

  /**
   * 以往的学习各在哪（W16）：按项目分目录（目录名 = 项目名，重名的接主对话 id 末几位；不属于项目的单放一处），
   * 一次学习一个文件 `<学习 id>-<标题>`（id 留着：跨次记录的出处按 id 找）。删掉的不算；按开始时间排。
   */
  private async learnedLayout(): Promise<LearnedEntry[]> {
    const sessions = new Map(
      this.o
        .hub()
        .listSessions()
        .map((s) => [s.sessionId, s]),
    );
    const all = (await this.o.learned.all()).filter((l) => !this.o.deleted(l.loopId));
    const projects = await Promise.all(all.map((l) => this.o.projectOf(l.loopId)));
    const dirs = new Map<string | undefined, string>();
    const taken = new Set<string>();
    for (const p of projects) {
      if (dirs.has(p)) continue;
      let name = p === undefined ? '（不属于项目）' : safeName(sessions.get(p)?.title ?? '') || p;
      if (taken.has(name) && p !== undefined) name = `${name}-${p.slice(-6)}`;
      taken.add(name);
      dirs.set(p, name);
    }
    return all
      .map((l, i) => {
        const project = projects[i];
        const title = safeName(l.title);
        return {
          l,
          project,
          dir: dirs.get(project) ?? '（不属于项目）',
          base: title !== '' ? `${l.loopId}-${title}` : l.loopId,
          lastAt: sessions.get(l.loopId)?.lastAt ?? l.endedAt ?? l.openedAt,
        };
      })
      .sort((a, b) => a.l.openedAt.localeCompare(b.l.openedAt));
  }

  /**
   * 只读/学过的记录/：按项目分目录，一次学习一个文件（头 + 整份原文）与它的组件；索引.md 按项目分组（本项目在最后）；
   * 外部导入.md 列条目，笔记与对话记录的 md 放 外部导入/<导入 id>.md。
   * `exclude` = 本次（本次学习不进“学过的记录”）；`project` = 本项目（外部导入只给它读得到的；不给 = 不列外部导入）。
   */
  private async learnedFiles(
    exclude: string,
    project: string | undefined,
  ): Promise<{ name: string; text: string }[]> {
    const entries = (await this.learnedLayout()).filter((e) => e.l.loopId !== exclude);
    const files: { name: string; text: string }[] = [];
    for (const e of entries) {
      const components = await this.o.components(e.l.loopId);
      const compDir = `${e.l.loopId}-组件`;
      const used = new Set<string>();
      const comps = components.map((c) => {
        let file = `${safeName(c.name) || 'component'}.html`;
        while (used.has(file)) file = `_${file}`;
        used.add(file);
        return { ...c, file };
      });
      files.push({
        name: `${e.dir}/${e.base}.md`,
        text: await this.learningText(
          e,
          comps.map((c) => ({ name: c.name, path: `${compDir}/${c.file}` })),
        ),
      });
      for (const c of comps) files.push({ name: `${e.dir}/${compDir}/${c.file}`, text: c.html });
    }
    files.push({ name: '索引.md', text: this.indexText(entries, project) });
    const imports = project !== undefined ? await this.o.learned.imports(project) : [];
    files.push({ name: '外部导入.md', text: await this.importsText(imports) });
    for (const x of imports) {
      const text = await this.o.learned.importText(x);
      if (text !== undefined) files.push({ name: `外部导入/${x.id}.md`, text });
    }
    return files;
  }

  /** 索引：按项目分组（别的项目在前，本项目在最后），组内旧的在上；每行带最后活动时间与距今多久、收尾那一句。 */
  private indexText(entries: LearnedEntry[], project: string | undefined): string {
    const now = this.o.now().getTime();
    const groups = new Map<string, LearnedEntry[]>();
    for (const e of entries) groups.set(e.dir, [...(groups.get(e.dir) ?? []), e]);
    const own = entries.find((e) => e.project === project && project !== undefined)?.dir;
    const order = [...groups.keys()].sort(
      (a, b) =>
        Number(a === own) - Number(b === own) ||
        (groups.get(a)?.at(-1)?.lastAt ?? '').localeCompare(groups.get(b)?.at(-1)?.lastAt ?? ''),
    );
    const lines = [
      '# 以往的学习',
      '',
      `现在 ${localMinute(this.o.now().toISOString())}。按项目分组，本项目在最后；组内按开始时间，旧的在上。每行：文件 · 状态 · 开始 · 最后活动（距今多久）；有收尾那一句的接在下一行。`,
    ];
    if (entries.length === 0) lines.push('', '（还没有）');
    for (const dir of order) {
      lines.push('', `## ${dir === own ? '本项目' : '别的项目'}：${dir}/`, '');
      for (const e of groups.get(dir) ?? []) {
        lines.push(
          `- ${e.dir}/${e.base}.md · ${e.l.status} · 开始 ${localMinute(e.l.openedAt)} · 最后活动 ${localMinute(e.lastAt)}（${ago(now, e.lastAt)}）`,
        );
        if (e.l.closing !== undefined) lines.push(`  收尾：${e.l.closing.summary}`);
      }
    }
    return lines.join('\n');
  }

  /** 一次学习一个文件：头（项目、状态、时间、收尾那一句、组件在哪；旧数据另带单子、路线决定、判定）+ 整份原文。 */
  private async learningText(
    e: LearnedEntry,
    components: { name: string; path: string }[],
  ): Promise<string> {
    const l = e.l;
    const projectTitle =
      e.project === undefined
        ? '（不属于项目）'
        : (this.o
            .hub()
            .listSessions()
            .find((s) => s.sessionId === e.project)?.title ?? e.project);
    const lines = [
      `# 一次学习 ${l.loopId}「${l.title}」`,
      '',
      `- 项目：${projectTitle}`,
      `- 状态：${l.status}；开始 ${localMinute(l.openedAt)}；最后活动 ${localMinute(e.lastAt)}${l.endedAt !== undefined ? `；结束 ${localMinute(l.endedAt)}` : ''}`,
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
      const endLine = await this.lineOf(l.loopId, 'loop_ended');
      lines.push(
        `- 结束原话${endLine !== undefined ? `（L${String(endLine)}）` : ''}：${l.endNote}`,
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
        `- 收尾那一句（L${String(l.closing.line)}，学习对话写的，只是指针；学习者会什么以原文里他自己说的、做的为准）：${l.closing.summary}`,
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
        `- 旧数据·通过的守卫判定（L${String(l.verdict.line)}）：${l.verdict.basis}${l.verdict.model !== undefined ? `（判定的模型：${l.verdict.model}）` : ''}`,
      );
      if (u !== '') lines.push(`- 学习者实际表现出的理解：${u}`);
    }
    if (components.length > 0) {
      lines.push(
        `- 组件最新一版：${components.map((c) => `[[组件:${c.name}]] → ${c.path}`).join('；')}`,
      );
    }
    const text = await this.transcriptText(l.loopId);
    lines.push(
      '',
      `## 对话原文（引用写 ${l.loopId}:L行号）`,
      '',
      text !== '' ? text : '（还没有对话）',
    );
    return lines.join('\n');
  }

  /** 只读/主对话.md：本项目主对话的原文。 */
  private async mainChatText(project: string | undefined): Promise<string> {
    if (project === undefined) return '# 主对话\n\n（这个对话不属于项目）\n';
    const title = this.o
      .hub()
      .listSessions()
      .find((s) => s.sessionId === project)?.title;
    const text = this.render(await this.o.hub().records(project), '主对话');
    return `# 主对话「${title ?? ''}」${project}\n\n## 对话原文（引用写 ${project}:L行号）\n\n${text !== '' ? text : '（还没有对话）'}\n`;
  }

  /** 只读/谈方向/：本项目每次谈方向一个文件（头 + 原文）。 */
  private async talkFiles(project: string | undefined): Promise<{ name: string; text: string }[]> {
    if (project === undefined) return [];
    const talks = this.o
      .hub()
      .listSessions()
      .filter((s) => s.kind === 'talk' && s.parent === project && !this.o.deleted(s.sessionId))
      .sort((a, b) => a.openedAt.localeCompare(b.openedAt));
    return Promise.all(
      talks.map(async (s) => {
        const title = safeName(s.title);
        const text = this.render(await this.o.hub().records(s.sessionId), '谈方向');
        return {
          name: `${title !== '' ? `${s.sessionId}-${title}` : s.sessionId}.md`,
          text: `# 谈方向 ${s.sessionId}「${s.title}」\n\n- 开始 ${localMinute(s.openedAt)}；最后活动 ${localMinute(s.lastAt ?? s.openedAt)}\n\n## 对话原文（引用写 ${s.sessionId}:L行号）\n\n${text !== '' ? text : '（还没有对话）'}\n`,
        };
      }),
    );
  }

  private async importsText(imports: Import[]): Promise<string> {
    if (imports.length === 0) return '# 外部导入\n\n（暂无）';
    const rows = await Promise.all(imports.map((x) => this.importText(x)));
    return [
      '# 外部导入（学习者在别处学过的：畅谈里说的、笔记、和别的 AI 的对话）',
      '',
      '未验证：可以怀疑，学习里的证据优先，不算“已合上过”。笔记与对话记录的全文接成一份在 外部导入/<id>.md（每个文件前标 <!-- 文件：相对路径 -->），原目录在 只读/资料/<资料 id>/；对话记录里只有学习者说的、做的算他的，AI 讲的未经核对。',
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

/** 工作区里放一个 `只读` 链接指向只读区，模型在当前目录下就能用 只读/… （和说明里的路径一样）；已有同名的不动。 */
async function linkReadOnly(workdir: string): Promise<void> {
  try {
    await lstat(join(workdir, '只读'));
  } catch (err) {
    if ((err as { code?: string }).code !== 'ENOENT') throw err;
    await symlink(join('..', '只读'), join(workdir, '只读'), 'dir');
  }
}

/** 文件名里用得的样子：去掉路径符号与换行，空白换成下划线，最长 40 字。 */
function safeName(s: string): string {
  return s
    .replace(/[/\\:*?"<>|\r\n\t]/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40);
}

/** 距今多久：几分钟前 / 几小时前 / 几天前。 */
function ago(now: number, iso: string): string {
  const ms = now - Date.parse(iso);
  if (!(ms >= 0)) return '时间不明';
  const h = ms / 3_600_000;
  if (h < 1) return `${String(Math.max(1, Math.round(ms / 60_000)))} 分钟前`;
  if (h < 24) return `${String(Math.round(h))} 小时前`;
  return `${String(Math.floor(h / 24))} 天前`;
}
