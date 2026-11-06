// Studium：每种会话的系统提示与工具在这里给；写权限靠给什么工具来卡（`docs/设计/记录/读写权限.md`）。
// W12（一个对话一个模型）：主对话开讨论串、给它们发话；讨论串自己读记录、互相发话（照 Claude 项目的主对话与
// 讨论串）。W20 起新开的讨论串都是学习对话（方向在哪个对话里都能谈，不再单开谈方向；旧的谈方向、找资料只读）。
// 学习对话的结束 W19 起也照讨论串：一个 close_thread，见 `closeThread`。
import { randomBytes } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { formatCitation } from '../shared/citation.ts';
import { CONVERSATION_KIND_LABELS } from '../shared/protocol.ts';
import { THREAD_KINDS, threadEnded, threadGroup } from '../shared/threads.ts';
import type {
  AddMaterialRequest,
  MaterialOwner,
  MaterialSource,
  ProjectInstructionsResponse,
  ProjectMaterialsResponse,
  ProjectMaterialView,
  SourceNoteView,
} from '../shared/protocol.ts';
import {
  type ConversationKind,
  type ImageInput,
  type MessageQuote,
  type LogRecord,
  type NumberedRecord,
  type SessionOpened,
} from '../shared/records.ts';
import type { Crosslinks } from './crosslinks.ts';
import { CrossNotes } from './cross-notes.ts';
import { currentGoal, oldGoalBlock } from './goal.ts';
import { Learned } from './learned.ts';
import { NotFoundError, type Hub, type KindConfig } from './hub.ts';
import { MaterialError, Materials } from './knowledge/materials.ts';
import type { Sources } from './sources.ts';
import { canDescend, canRead } from './model/sandbox-paths.ts';
import type { ImageData, SandboxSpec, ToolResult, ToolSpec } from './model/port.ts';
import { describeSandbox, Sandboxes } from './sandbox.ts';
import { Screens } from './page/screens.ts';
import { PageStore } from './page/store.ts';
import { streamTools } from './page/stream-tools.ts';
import { renderTranscript } from './transcript.ts';
import { Uploads } from './uploads.ts';
import type { Inputs } from './inputs.ts';
import { localMinute } from '../shared/time.ts';

export class BadRequestError extends Error {}

/** 旧版开的学习对话（W12 前的区域图学习页与更早的）：只读看，要接着学另开一次。 */
const OLD_LOOP = '这次学习是旧版开的，只能看；要接着学，请回项目另开一次。';
/** 不再开的讨论串种类（谈方向 W20 起、找资料 11-04 起、写产出 W12 起）：只读，要接着谈另开一个。 */
const OLD_THREAD = '这是旧版的对话（谈方向、找资料等），只能读；要接着谈，开一个新的讨论串。';
/** 项目说明上限（字；参照 Claude，`docs/设计/记录/项目说明.md`）。 */
export const INSTRUCTIONS_LIMIT = 16000;
/** 导入会话多久没交回算超时（W11 §4；实现细节，先定 60 分钟：几百页的 PDF 交 MinerU 要几分钟到十几分钟）。 */
const IMPORT_TIMEOUT_MS = 60 * 60 * 1000;

export interface StudiumOptions {
  prompts: Record<ConversationKind, string>;
  /** 项目资料区（工单 W8）：读原文、建资料、正文目录。 */
  materials: Materials;
  /** 数据目录（学过的记录的导入存放处在其下）。 */
  dataDir: string;
  /** 原文与出处（资料检索、教材出处核对）。 */
  sources: Sources;
  /** 附图存放处（W12 §5.6：图片原样送给模型）。 */
  inputs: Inputs;
  /** 跨资料的重复线索 / 来源说明 / 跨领域核对（批 10b）。 */
  cross: Crosslinks;
  /** 学习对话提示词里“页面”那一段（loop-stream.md），接进 loop.md 的 {{页面}}。 */
  loopPage: string;
  now?: () => Date;
}

export class Studium {
  private hubRef: Hub | undefined;
  private readonly now: () => Date;
  /** 后台跑着的事（结束后告诉主对话、导入会话……），回放用来等它们跑完。 */
  private readonly tasks = new Set<Promise<unknown>>();
  /** 超时被停掉的导入会话（W11 §4）：之后它的工具一律不算数。 */
  private readonly stoppedImports = new Set<string>();

  /** 学过的记录（按层读每次学习）与外部导入存放处。 */
  readonly learned: Learned;

  /** 跨次记录（W13，试验中）：各对话当场记下的学到哪、学习者说过的长期的话。 */
  readonly notes: CrossNotes;

  /** 学习对话与导入会话的沙盒（只读的资料与记录、可写的工作区）。 */
  private readonly sandboxes: Sandboxes;

  /** 上传与分流（工单 W9）。 */
  private readonly uploads: Uploads;

  /** 学习页：学习者在组件上的操作、组件试跑、旧区域图学习的组件（会话/学习对话.md §11）。 */
  readonly screens: Screens;

  /** 组件的块（按指纹存）。 */
  private readonly screenStore: PageStore;

  constructor(private readonly o: StudiumOptions) {
    this.now = o.now ?? (() => new Date());
    this.learned = new Learned({
      hub: () => this.hub,
      dir: o.dataDir,
      materials: o.materials,
      newId: (prefix) => this.newId(prefix),
      iso: () => this.iso(),
    });
    this.notes = new CrossNotes({
      hub: () => this.hub,
      learned: this.learned,
      iso: () => this.iso(),
    });
    this.sandboxes = new Sandboxes({
      hub: () => this.hub,
      learned: this.learned,
      materials: o.materials,
      dataDir: o.dataDir,
      scopeOf: (id) => this.scopeOf(id),
      materialLines: (ids) => this.materialLines(ids),
      instructionsOf: async (id) => {
        const main = await this.projectOf(id);
        return main === undefined ? '' : (await this.instructions(main)).text;
      },
      oldGoal: async (id) => {
        const main = await this.projectOf(id);
        const goal = main === undefined ? undefined : currentGoal(await this.hub.records(main));
        return goal === undefined ? '' : oldGoalBlock(goal.goal);
      },
      notesOf: async (id) => {
        const main = await this.projectOf(id);
        return main === undefined ? '' : this.notes.render(main, id);
      },
      components: (loopId) => this.latestComponents(loopId),
      imagesDir: o.inputs.imagesDir,
      projectOf: (id) => this.projectOf(id),
      deleted: (id) => this.hub.isDeleted(id),
      now: () => this.now(),
    });
    // 组件按块按指纹存在 `<数据>/screens/`（旧活页面的 `pages/` 原样留着，不再写）
    const screenStore = new PageStore(join(o.dataDir, 'screens'));
    this.screenStore = screenStore;
    this.screens = new Screens({
      hub: () => this.hub,
      store: screenStore,
      iso: () => this.iso(),
      newId: (prefix) => this.newId(prefix),
      assertOpen: (id) => this.assertActiveLoop(id),
      badRequest: (m) => new BadRequestError(m),
    });
    this.uploads = new Uploads({
      root: join(o.dataDir, 'projects'),
      newId: (prefix) => this.newId(prefix),
      iso: () => this.iso(),
      addMaterial: async (mainId, req) => (await this.newMaterial(mainId, req)).id,
      relabel: async (mainId, id, learned, owner) => {
        if ((await this.o.materials.source(id))?.status === '处理中') {
          throw new BadRequestError('这份还在处理，等它跑完再改判');
        }
        await this.o.materials.setLearned(id, learned);
        await this.setMaterialOwner(
          mainId,
          id,
          owner.kind,
          owner.kind === 'project' ? owner.projects : undefined,
          'learner',
        );
        // 对话记录要转逐条 md、加开头那句：工作层按新的标记重做一遍
        try {
          await this.o.materials.retry(id);
        } catch (err) {
          if (err instanceof MaterialError) throw new BadRequestError(err.message);
          throw err;
        }
      },
      ownerNow: async (id) => {
        const src = await this.o.materials.source(id);
        return src === undefined ? undefined : src.owner.kind === 'learner' ? '学习者' : '项目';
      },
      importLearned: async (mainId, x) =>
        (await this.learned.importMaterial({ ...x, project: mainId })).id,
      removeImport: (id) => this.learned.removeImport(id),
      record: async (mainId, r) => {
        await this.hub.record(mainId, { type: 'upload_routed', at: this.iso(), ...r });
      },
      records: async (mainId) => (await this.hub.records(mainId)).map((r) => r.record),
    });
    // 原件里有不是纯文字的：交导入会话（W11 §4）
    o.materials.setImporter((id, files) => this.startImport(id, files));
  }

  private iso(): string {
    return this.now().toISOString();
  }

  private readonly idListeners = new Set<(prefix: string, id: string) => void>();

  /** 程序生成的编号（试跑、异议等）；录带按生成顺序给它们稳定记号。 */
  private newId(prefix: string): string {
    const id = `${prefix}-${randomBytes(4).toString('hex')}`;
    for (const fn of this.idListeners) fn(prefix, id);
    return id;
  }

  onNewId(fn: (prefix: string, id: string) => void): () => void {
    this.idListeners.add(fn);
    return () => this.idListeners.delete(fn);
  }

  /** 后台还有事在跑吗（录带记下学习者动作时系统是否空闲）。 */
  busy(): boolean {
    return this.tasks.size > 0 || this.hub.anyRunning();
  }

  /** 在后台跑一件事，不挡调用方；失败写进核心日志（不吞）。 */
  background(what: string, fn: () => Promise<unknown>): void {
    const p = fn()
      .catch((e: unknown) => {
        console.error(`${what}失败：`, e);
      })
      .finally(() => this.tasks.delete(p));
    this.tasks.add(p);
  }

  /** 等后台清单与所有会话都停下（回放、测试用）。 */
  async settled(): Promise<void> {
    for (;;) {
      await Promise.all([...this.tasks]);
      await this.hub.idleAll();
      if (this.tasks.size === 0 && !this.hub.anyRunning()) return;
    }
  }

  attach(hub: Hub): void {
    this.hubRef = hub;
  }

  private get hub(): Hub {
    if (!this.hubRef) throw new Error('Studium 还没接上 Hub');
    return this.hubRef;
  }

  // ───────────── 会话种类：系统提示 + 工具 ─────────────

  kind = (kind: ConversationKind): KindConfig => ({
    systemPrompt: this.o.prompts[kind],
    // 主对话每轮只附时间类的事实（W12 §3.2：方向、讨论串、学过的不再每轮附，要用自己读）
    ...(kind === 'main'
      ? {
          preface: (sessionId: string, inputLine: number, fresh: boolean) =>
            this.mainPreface(sessionId, inputLine, fresh),
        }
      : {}),
    // 学习对话可联网搜索（W12 §2：沙盒照旧不联网；W20 起谈方向、搜前沿也在这里）
    ...(kind === 'loop' ? { webSearch: true } : {}),
    ...(kind === 'loop'
      ? {
          systemPromptFor: () =>
            Promise.resolve(this.o.prompts.loop.replace('{{页面}}', this.o.loopPage.trim())),
          sandbox: (sessionId: string) => this.sandboxes.forLoop(sessionId),
          beforeTurn: (sessionId: string) => this.sandboxes.refreshLoop(sessionId),
          // 上一轮之后攒着的（学习者在组件上的操作、组件报错），按时间接在这一轮前面
          preface: (sessionId: string) => this.screens.preface(sessionId),
          timeline: true,
        }
      : {}),
    // 导入会话（W11 §4，试验）：只读原件，工作区就是那份资料的正文
    ...(kind === 'import' ? { sandbox: (sessionId: string) => this.importSandbox(sessionId) } : {}),
    tools: async (sessionId) => {
      switch (kind) {
        case 'main':
          return [
            ...this.mainTools(sessionId),
            ...this.readTools(sessionId),
            this.importLocalTool(sessionId),
            this.setOwnerTool(sessionId),
            await this.askProjectTool(sessionId),
            this.noteTool(sessionId, 'main'),
            this.readNotesTool(sessionId),
          ];
        case 'loop':
          // 学习对话在沙盒里跑（只读资料与记录、可写工作区），自己读、自己定这次的边界（W12 §2）；
          // 跨次记录在沙盒里当只读文件读（W13）
          return [
            ...this.loopTools(sessionId),
            ...this.threadTools(sessionId),
            await this.askProjectTool(sessionId),
            this.noteTool(sessionId, 'loop'),
          ];
        case 'import':
          return this.importTools(sessionId);
        default:
          // 旧数据：守卫、导航、检索子代理、状态整理、教法记录整理、写产出、页面编辑员都不再开（W12 §1）；找资料 11-04 收起（docs/暂缓设计/找资料.md）；谈方向 W20 起不再开
          return [];
      }
    },
  });

  // ───────────── 导入会话（W11 §4，试验；记录/资料.md「怎么处理」） ─────────────

  /** 导入会话处理的是哪份资料。 */
  private async importMaterialOf(sessionId: string): Promise<MaterialSource> {
    const src = await this.o.materials.ofImportSession(sessionId);
    if (src === undefined) throw new Error(`导入会话 ${sessionId} 找不到它处理的资料`);
    return src;
  }

  private async importSandbox(sessionId: string): Promise<SandboxSpec> {
    return this.sandboxes.forImport((await this.importMaterialOf(sessionId)).id);
  }

  /**
   * 原件里有不是纯文字的文件：在后台开一个导入会话（parent = 发起导入的主对话；界面不显示），交给它处理；
   * 会话交回（finish_import）时改状态。会话失败、超时或没交回就停了 → “失败”写原因，不伪装可用。
   */
  private async startImport(id: string, files: string[]): Promise<void> {
    const src = await this.o.materials.source(id);
    if (src === undefined) return;
    const parent = src.importedFrom;
    const s = await this.hub.createSession('import', {
      title: `导入：${src.title}`,
      ...(parent !== undefined ? { parent } : {}),
    });
    await this.o.materials.addProcessedBy(id, s.sessionId);
    const body = await this.o.materials.bodyDir(id);
    const original = await this.o.materials.originalDir(id);
    this.background('导入会话', async () => {
      const { done } = await this.hub.send(s.sessionId, {
        role: 'program',
        text: [
          `这份资料：《${src.title}》（资料 id ${id}，${src.learned !== undefined ? `学习者的${src.learned.channel}` : '资料'}）。`,
          `原件（只读）：${original}`,
          `当前目录（就是这份资料给别的会话读的文字版）：${body}`,
          '纯文字的文件程序已经按原件里的相对路径放进当前目录了。原件里不是纯文字、要你处理的：',
          ...(files.length > 0 ? files.map((f) => `- ${f}`) : ['（没有）']),
          ...(src.classify !== undefined
            ? [
                `这份是学习者上传的，程序按扩展名先放成了「${src.learned !== undefined ? `学过的：${src.learned.channel}` : '资料'}」、归${src.owner.kind === 'learner' ? '学习者' : '本项目'}。先看内容判它归哪边、归谁，调 classify；判完再接着处理。`,
              ]
            : src.learned !== undefined
              ? [
                  `这份是学习者的${src.learned.channel}：处理完在当前目录写 说明.md（总结，见提示词）。`,
                ]
              : []),
        ].join('\n'),
      });
      let timer: NodeJS.Timeout | undefined;
      const timedOut = await Promise.race([
        done.then(() => false),
        new Promise<boolean>((r) => (timer = setTimeout(() => r(true), IMPORT_TIMEOUT_MS))),
      ]);
      clearTimeout(timer);
      if (timedOut) {
        // 真停掉：之后它不能再调 finish_import 把状态改回去
        this.stoppedImports.add(s.sessionId);
        await this.hub.stop(s.sessionId);
      }
      this.o.materials.refresh(id);
      const now = await this.o.materials.source(id);
      if (now?.status !== '处理中') return;
      const failed = (await this.hub.records(s.sessionId))
        .map((r) => r.record)
        .filter((r) => r.type === 'turn_failed')
        .at(-1);
      // 只为写总结开的（文字程序已放好）：没跑成也照样能读，只记没写成总结
      await this.o.materials.finishImport(id, files.length === 0 ? '可用' : '失败', [
        ...(files.length === 0 ? ['没写成总结（说明.md）'] : []),
        timedOut
          ? `导入会话 ${formatDuration(IMPORT_TIMEOUT_MS)} 没交回（${s.sessionId}）`
          : failed?.type === 'turn_failed'
            ? `导入会话没跑成（${s.sessionId}）：${failed.notice ?? failed.reason}`
            : `导入会话没交回就停了（${s.sessionId}）`,
      ]);
    });
  }

  /**
   * 这个导入会话还算数吗：没被超时停掉、它处理的那份还在“处理中”、它是最近一个处理这份的（重试会重开一个）。
   * 不算数回一句原因。
   */
  private async liveImport(
    sessionId: string,
  ): Promise<{ src: MaterialSource } | { problem: string }> {
    const src = await this.importMaterialOf(sessionId);
    if (
      this.stoppedImports.has(sessionId) ||
      src.status !== '处理中' ||
      src.processedBy?.at(-1) !== sessionId
    ) {
      return { problem: '这次导入已经结束（超时、服务重启或已重开），不能再改它；停下即可' };
    }
    return { src };
  }

  /** 导入会话自己的工具：classify（判归哪边、归谁，W12 §1.6）、mineru（PDF 交 MinerU 转）、finish_import（交回）。 */
  private importTools(sessionId: string): ToolSpec[] {
    return [
      {
        name: 'classify',
        description:
          '判这份上传归哪边、归谁（只在开场说要判时用，一次）：to = 资料（讲知识的原文：教材、讲义、文章、文档、代码、题集）/ 学过的（学习者自己学过的痕迹：他写的笔记，或他和别的 AI 的对话记录，channel 写是哪种）；owner = 学习者（跟着学习者，所有项目都能读；笔记、别处的学习记录多是）/ 项目（只给这个项目读；为这个项目拿来的书、仓库、课程材料）。reason 一句话。学习者事后可以改。',
        input: {
          to: z.enum(['资料', '学过的']),
          channel: z.enum(['笔记', '对话记录']).optional(),
          owner: z.enum(['学习者', '项目']),
          reason: z.string(),
        },
        run: async (a) => {
          const now = await this.liveImport(sessionId);
          if ('problem' in now) return err(now.problem);
          const src = now.src;
          const mainId = src.importedFrom;
          if (src.classify === undefined || mainId === undefined) return err('这份不用判');
          const to = a.to as '资料' | '学过的';
          const channel =
            to === '学过的'
              ? ((a.channel as '笔记' | '对话记录' | undefined) ?? '笔记')
              : undefined;
          const ownerWord = a.owner as '学习者' | '项目';
          const owner: MaterialOwner =
            ownerWord === '学习者' ? { kind: 'learner' } : { kind: 'project', projects: [mainId] };
          const was = src.classify;
          await this.o.materials.reclassify(
            src.id,
            channel !== undefined ? { channel } : undefined,
            owner,
          );
          // 外部导入的指针跟着改：判成学过的补一条，判成资料去掉
          const had = (await this.learned.imports()).find(
            (x) => 'material' in x.ref && x.ref.material === src.id,
          );
          let imp = had?.id;
          if (channel !== undefined && had === undefined) {
            imp = (
              await this.learned.importMaterial({
                material: src.id,
                channel,
                title: src.title,
                project: mainId,
              })
            ).id;
          } else if (channel === undefined && had !== undefined) {
            await this.learned.removeImport(had.id);
            imp = undefined;
          }
          await this.hub.record(mainId, {
            type: 'upload_routed',
            at: this.iso(),
            upload: was.upload,
            file: was.file,
            routedTo: to,
            by: 'model',
            owner: ownerWord,
            reason: (a.reason as string).trim().slice(0, 80) || '导入时看内容判的',
            material: src.id,
            ...(imp !== undefined ? { import: imp } : {}),
          });
          return ok(
            channel !== undefined
              ? `记下了：学过的（${channel}），归${ownerWord}。接着处理，处理完在当前目录写 说明.md（见提示词），再 finish_import。`
              : `记下了：资料，归${ownerWord}。接着处理（纯文字已在当前目录），处理完 finish_import。`,
          );
        },
      },
      {
        name: 'mineru',
        description:
          '把原件里的一个 PDF 交 MinerU 转成文字（含公式、表格；按页段各一份 md，放进当前目录）。一份几百页的要几分钟。转出来的 md 你可以再看、再改。',
        input: { file: z.string().describe('原件里的相对路径，如 讲义.pdf 或 第一章/习题.pdf') },
        run: async (a) => {
          const now = await this.liveImport(sessionId);
          if ('problem' in now) return err(now.problem);
          const r = await this.o.materials.mineru(now.src.id, a.file as string);
          if ('problem' in r) return err(r.problem);
          return ok(`转好了，写进当前目录：${r.files.join('、')}`);
        },
      },
      {
        name: 'finish_import',
        description:
          '都写好了再调用（一次，最后一步）：status 写 可用（都处理好了）/ 部分可用（有些没处理好）/ 失败（没法用）；note 写哪些没处理好、为什么（都好就写一句做了什么）。',
        input: {
          status: z.enum(['可用', '部分可用', '失败']),
          note: z.string(),
        },
        run: async (a) => {
          const now = await this.liveImport(sessionId);
          if ('problem' in now) return err(now.problem);
          const src = now.src;
          const status = a.status as '可用' | '部分可用' | '失败';
          const note = (a.note as string).trim();
          await this.o.materials.finishImport(
            src.id,
            status,
            status === '可用' || note === '' ? [] : [note],
          );
          return ok('已交回，这次导入结束。不用再写文件，也不用再说什么。');
        },
      },
    ];
  }

  // ───────────── 本机路径与归属（W11 §2；W12 §3.2 主对话不读本机） ─────────────

  /**
   * 学习者给的本机路径拷一份进来，和拖进来的一样分流（主对话的 import_local）：程序拷，模型不读本机；
   * 不是纯文字的、要判归哪边的交导入会话处理。
   */
  private importLocalTool(mainId: string): ToolSpec {
    return {
      name: 'import_local',
      description:
        '学习者给了本机的路径（文件或文件夹），要当以后的依据（学习者以前学过什么、要配着学的资料）时调用：程序拷一份进项目，和学习者拖进来的一样处理（判资料还是学过的、归谁，学习者可改）。你读不到本机；本机的文件不改。',
      input: {
        path: z.string().describe('本机的绝对路径（家目录下；~ 开头也行）'),
        title: z.string().optional().describe('只导入一份时的标题；不填用文件名'),
      },
      run: async (a) => {
        const raw = (a.path as string).trim();
        const home = homedir();
        const given = resolve(
          raw === '~' ? home : raw.startsWith('~/') ? join(home, raw.slice(2)) : raw,
        );
        let abs: string;
        try {
          abs = await realpath(given);
        } catch (e) {
          if ((e as { code?: string }).code === 'ENOENT') return err(`本机没有这个路径：${given}`);
          throw e;
        }
        // 在家目录内、不在挡掉的位置（存密钥的隐藏目录、数据目录）里、也不包着它们
        const sb = this.sandboxes.localScope();
        if (!canDescend(sb, abs)) {
          return err(
            abs !== home && !abs.startsWith(`${home}/`)
              ? '只能导入家目录下的文件'
              : canRead(sb, abs)
                ? `${abs} 里面包着不让读的位置（存密钥的隐藏目录、Studium 的数据目录），不能整个导入；给更具体的子目录`
                : `${abs} 在不让读的位置里（隐藏目录、Studium 的数据目录）`,
          );
        }
        let items;
        let skipped: string[];
        try {
          ({ items, skipped } = await this.uploads.saveFromPath(
            mainId,
            abs,
            (real) => canRead(sb, real),
            typeof a.title === 'string' && a.title.trim() !== '' ? a.title.trim() : undefined,
          ));
        } catch (e) {
          if (e instanceof BadRequestError) return err(e.message);
          throw e;
        }
        return ok(
          `已拷进来（${String(items.length)} 份）：\n${items
            .map(
              (x) =>
                `- ${x.file} → ${x.routedTo}${x.owner !== undefined ? `，归${x.owner}` : ''}${x.material !== undefined ? `，资料 id ${x.material}` : ''}${x.problem !== undefined ? `，没落下：${x.problem}` : ''}${x.reason !== undefined ? `（${x.reason}）` : ''}`,
            )
            .join(
              '\n',
            )}${skipped.length > 0 ? `\n没拷的链接：${skipped.join('、')}` : ''}\n处理在后台跑（PDF、图片、要判归哪边的要几分钟）；跟学习者说一句放到了哪、归谁，不对他可以改。`,
        );
      },
    };
  }

  /** 改一份资料归谁（学习者在对话里说“这本数学笔记物理项目也要用”时）。 */
  private setOwnerTool(mainId: string): ToolSpec {
    return {
      name: 'set_material_owner',
      description:
        '学习者要改一份资料归谁时调用（如“这本数学笔记物理项目也要用”）：learner = 跟着学习者，所有项目都能读；project = 只给几个项目读（projects 填主对话 id，不填 = 只给本项目）。改的是一个字段，文件不挪。',
      input: {
        material: z.string().describe('资料 id（materials_index 里有）'),
        owner: z.enum(['learner', 'project']),
        projects: z.array(z.string()).optional(),
      },
      run: async (a) => {
        try {
          const src = await this.setMaterialOwner(
            mainId,
            a.material as string,
            a.owner as 'learner' | 'project',
            a.projects as string[] | undefined,
            'model',
          );
          return await ok(
            `已改：《${src.title}》现在${src.owner.kind === 'learner' ? '归学习者，所有项目都能读' : `只给这几个项目读：${src.owner.projects.join('、')}`}。`,
          );
        } catch (e) {
          if (e instanceof BadRequestError) return await err(e.message);
          throw e;
        }
      },
    };
  }

  // ───────────── 问别的项目的主对话（W11 §6，试验） ─────────────

  /** 学习对话、主对话用：读不到别的项目的资料时，直接问那个项目的主对话。 */
  private async askProjectTool(sessionId: string): Promise<ToolSpec> {
    const own = await this.projectOf(sessionId);
    const others = (await this.listProjects()).filter((p) => p.mainSessionId !== own);
    return {
      name: 'ask_project',
      description: `本项目读不到、要用别的项目里的资料或学过的东西时调用：直接问那个项目的主对话一个问题，它按它那边能读的答、带出处。学习者看不到这一问。别的项目（主对话 id「名字」）：${others.map((p) => `${p.mainSessionId}「${p.title}」`).join('；') || '（没有别的项目）'}`,
      input: {
        project: z.string().describe('那个项目的主对话 id'),
        question: z.string().describe('要问的事：要什么、为什么要，写清楚'),
      },
      run: async (a) => {
        const target = (a.project as string).trim();
        const question = (a.question as string).trim();
        if (target === own) return err('这就是本项目，直接读本项目的资料');
        const opened = await this.hub.opened(target).catch((e: unknown) => {
          if (e instanceof NotFoundError) return undefined;
          throw e;
        });
        if (opened?.kind !== 'main') return err(`没有这个项目：${target}`);
        if (question === '') return err('问题是空的');
        const answer = await this.askProject(sessionId, target, question);
        const title = (await this.listProjects()).find((p) => p.mainSessionId === target)?.title;
        return ok(`项目「${title ?? target}」的主对话答：\n${answer}`);
      },
    };
  }

  /**
   * 问一个项目的主对话（W11 §6）：从它最近的续接凭据分叉（不写回它那条线、界面不显示），用主对话的系统提示与
   * 读工具答一次；还没跑过的开一个临时会话，附上它的当前事实。被问的一方正本里记 project_asked，不进它的上下文。
   */
  private async askProject(from: string, target: string, question: string): Promise<string> {
    const selected = this.hub.selectedModel(target, 'main');
    const adapter = selected.adapter.name;
    const token = (await this.hub.records(target))
      .map((r) => r.record)
      .filter((r) => r.type === 'model_session')
      .at(-1);
    const resume =
      token?.type === 'model_session' && token.adapter === adapter ? token.token : undefined;
    const conv = selected.adapter.open({
      ...(selected.model !== undefined ? { model: selected.model } : {}),
      ...(selected.effort !== undefined ? { effort: selected.effort } : {}),
      systemPrompt: this.o.prompts.main,
      tools: [
        ...this.readTools(target),
        this.listLearnedTool(target, true),
        this.readImportTool(target),
      ],
      session: { id: target, kind: 'main' },
      ephemeral: true,
      ...(resume !== undefined ? { resumeToken: resume, fork: true } : {}),
    });
    const ask = `这是别的会话（${from}）来问的，不是学习者在说话：只答问题，给出处（资料id/文件:行号 或 会话 id:行号）；你那边没有就直说没有；不对学习者说话，不调改东西的工具。\n问题：${question}`;
    const texts: string[] = [];
    try {
      for await (const e of conv.send({
        role: 'program',
        text: ask,
        ...(resume === undefined
          ? { preface: await this.mainPreface(target, Number.POSITIVE_INFINITY, true) }
          : {}),
      })) {
        if (e.kind === 'assistant_text') texts.push(e.text);
        if (e.kind === 'turn_error') throw new Error(e.notice ?? e.reason);
      }
    } finally {
      await conv.close();
    }
    const answer = texts.join('\n').trim() || '（没答出来）';
    await this.hub.record(target, {
      type: 'project_asked',
      at: this.iso(),
      from,
      question,
      answer,
    });
    return answer;
  }

  /** 会联网搜索的会话种类；外发披露只从这里取，不另写一份名单（工单 W5 §4.6）。 */
  webSearchKinds(): ConversationKind[] {
    return (Object.keys(CONVERSATION_KIND_LABELS) as ConversationKind[]).filter(
      (k) => this.kind(k).webSearch === true,
    );
  }

  // ───────────── 事件 ─────────────

  /** 开一个新项目（= 一条新的主对话）。 */
  async createProject(title?: string): Promise<string> {
    const n = this.hub.listSessions().filter((s) => s.kind === 'main').length + 1;
    const t = title?.trim() ? title.trim() : `项目 ${String(n)}`;
    return (await this.hub.createSession('main', { title: t })).sessionId;
  }

  /** 所有项目：主对话；项目名取最新一条 project_title（没有就用开项目时的名字）。 */
  async listProjects(): Promise<{ mainSessionId: string; title: string }[]> {
    const out: { mainSessionId: string; title: string }[] = [];
    for (const m of this.hub.listSessions().filter((s) => s.kind === 'main')) {
      const recs = (await this.hub.records(m.sessionId)).map((r) => r.record);
      const title = recs.filter((r) => r.type === 'project_title').at(-1);
      const opened = recs[0];
      out.push({
        mainSessionId: m.sessionId,
        title:
          title?.type === 'project_title'
            ? title.title
            : opened?.type === 'session_opened'
              ? opened.title
              : m.title,
      });
    }
    return out;
  }

  // ───────────── 项目资料（`docs/设计/记录/资料.md`）─────────────

  /** 会话所属的项目（主对话 id）：沿 parent 往上找到 main；不属于任何项目返回空。 */
  async projectOf(sessionId: string): Promise<string | undefined> {
    let cur = sessionId;
    for (let i = 0; i < 8; i++) {
      let opened;
      try {
        opened = await this.hub.opened(cur);
      } catch (e) {
        if (e instanceof NotFoundError) return undefined;
        throw e;
      }
      if (opened.kind === 'main') return opened.sessionId;
      if (opened.parent === undefined) return undefined;
      cur = opened.parent;
    }
    return undefined;
  }

  private async requireProject(mainId: string): Promise<LogRecord[]> {
    const opened = await this.hub.opened(mainId);
    if (opened.kind !== 'main') throw new BadRequestError('这不是一个项目。');
    return (await this.hub.records(mainId)).map((r) => r.record);
  }

  /**
   * 项目资料的视图（记录/资料.md「浏览」）：本项目能读的全部（本项目的 + 学习者的），每份带种类 / 归属 / 版本 /
   * 日期 / 处理状态。
   */
  /** 设置里的 MinerU 密钥入口（临时）。 */
  mineruTokenSet(): Promise<boolean> {
    return this.o.materials.mineruTokenSet();
  }

  setMineruToken(token: string): Promise<void> {
    return this.o.materials.setMineruToken(token);
  }

  async materials(mainId: string): Promise<ProjectMaterialsResponse> {
    await this.requireProject(mainId);
    const views: ProjectMaterialView[] = (await this.o.materials.ofProject(mainId)).map((src) => ({
      material: src.id,
      title: src.title,
      kind: src.kind,
      addedAt: src.fetchedAt,
      origin: src.origin,
      ...(src.version !== '' ? { version: src.version } : {}),
      fetchedAt: src.fetchedAt,
      status: src.status,
      owner: src.owner,
      ...(src.learned !== undefined ? { learned: src.learned } : {}),
      ...(src.problems !== undefined ? { problems: src.problems } : {}),
    }));
    return { mainSessionId: mainId, materials: views, restricted: true };
  }

  /**
   * 加一份资料（工单 W8 §4.2；入口归 W9）：建好、记 project_material，处理在后台跑，状态随处理更新。
   */
  async addMaterial(
    mainId: string,
    req: Partial<AddMaterialRequest>,
  ): Promise<ProjectMaterialsResponse> {
    if (typeof req.kind !== 'string' || typeof req.origin !== 'string') {
      throw new BadRequestError('kind 与 origin 要是字符串');
    }
    await this.newMaterial(mainId, {
      kind: req.kind,
      origin: req.origin,
      ...(typeof req.title === 'string' ? { title: req.title } : {}),
      ...(typeof req.commit === 'string' ? { commit: req.commit } : {}),
    });
    return this.materials(mainId);
  }

  /** 建一份资料（不给归属 = 只归本项目）、在主对话里记 project_material；返回建好时的 source.json。 */
  private async newMaterial(mainId: string, req: AddMaterialRequest): Promise<MaterialSource> {
    await this.requireProject(mainId);
    let src: MaterialSource;
    try {
      src = await this.o.materials.add(mainId, req);
    } catch (err) {
      if (err instanceof MaterialError) throw new BadRequestError(err.message);
      throw err;
    }
    await this.hub.record(mainId, {
      type: 'project_material',
      at: this.iso(),
      op: 'add',
      material: src.id,
    });
    return src;
  }

  /** 本项目读不读得到这份（按归属）；读不到报错。 */
  private async requireReadable(mainId: string, id: string): Promise<MaterialSource> {
    await this.requireProject(mainId);
    const src = await this.o.materials.source(id);
    if (src === undefined || !Materials.readableBy(src, mainId)) {
      throw new BadRequestError(`本项目读不到这份资料：${id}`);
    }
    return src;
  }

  /**
   * 删掉一份资料（工单 W9 §4.4）：资料存在一处，删了各项目都读不到；只在 source.json 标上、主对话追加
   * remove，文件留着，已有引用照旧能定位，依据面板标“资料已删”。
   */
  async removeMaterial(mainId: string, id: string): Promise<void> {
    await this.requireReadable(mainId, id);
    await this.o.materials.remove(id);
    await this.hub.record(mainId, {
      type: 'project_material',
      at: this.iso(),
      op: 'remove',
      material: id,
    });
  }

  /** 重试一份失败 / 有问题的资料（原件里有不是纯文字的，重开导入会话）。 */
  async retryMaterial(mainId: string, id: string): Promise<ProjectMaterialsResponse> {
    await this.requireReadable(mainId, id);
    try {
      await this.o.materials.retry(id);
    } catch (err) {
      if (err instanceof MaterialError) throw new BadRequestError(err.message);
      throw err;
    }
    return this.materials(mainId);
  }

  /**
   * 改一份资料的归属（W11 §2；记录/资料.md「跨项目要用」）：学习者 = 所有项目都能读；项目 = 只给这几个项目
   * （不给 = 只给本项目）。改的是一个字段，文件不挪；在本项目主对话追加 material_owner。
   */
  async setMaterialOwner(
    mainId: string,
    id: string,
    to: 'learner' | 'project',
    projects: string[] | undefined,
    by: 'model' | 'learner',
  ): Promise<MaterialSource> {
    await this.requireReadable(mainId, id);
    let owner: MaterialOwner;
    if (to === 'learner') owner = { kind: 'learner' };
    else {
      const list = [
        ...new Set(projects !== undefined && projects.length > 0 ? projects : [mainId]),
      ];
      for (const p of list) {
        const opened = await this.hub.opened(p).catch((e: unknown) => {
          if (e instanceof NotFoundError) return undefined;
          throw e;
        });
        if (opened?.kind !== 'main') throw new BadRequestError(`没有这个项目：${p}`);
      }
      owner = { kind: 'project', projects: list };
    }
    const src = await this.o.materials.setOwner(id, owner);
    await this.hub.record(mainId, {
      type: 'material_owner',
      at: this.iso(),
      material: id,
      owner,
      by,
    });
    return src;
  }

  // ───────────── 上传与分流（工单 W9 §4.1 §4.2） ─────────────

  /** 收下一批上传的文件，一份份分到资料或学过的。 */
  async upload(mainId: string, files: { path: string; data: Buffer }[]) {
    await this.requireProject(mainId);
    return this.uploads.save(mainId, files);
  }

  /** 本项目上传过的每一份现在分在哪（新的在前）。 */
  async uploadsOf(mainId: string) {
    await this.requireProject(mainId);
    return this.uploads.list(mainId);
  }

  /** 学习者改判一份上传。 */
  async reroute(mainId: string, upload: string, file: string, to: '资料' | '学过的') {
    await this.requireProject(mainId);
    return this.uploads.reroute(mainId, upload, file, to);
  }

  // ───────────── 项目说明（`docs/设计/记录/项目说明.md`；工单 W9 §4.6） ─────────────

  /** 项目说明：当前值（最后一条）+ 全部历史。 */
  async instructions(mainId: string): Promise<ProjectInstructionsResponse> {
    await this.requireProject(mainId);
    const history: ProjectInstructionsResponse['history'] = [];
    for (const { line, record } of await this.hub.records(mainId)) {
      if (record.type === 'project_instructions') {
        history.push({ at: record.at, by: record.by, text: record.text, line });
      }
    }
    return { text: history.at(-1)?.text ?? '', history, limit: INSTRUCTIONS_LIMIT };
  }

  /** 改项目说明（学习者在项目页改，或主对话代写）：存一版，从下一个开场起生效。 */
  async setInstructions(
    mainId: string,
    text: string,
    by: 'learner' | 'main' = 'learner',
    forLine?: number,
  ): Promise<ProjectInstructionsResponse> {
    await this.requireProject(mainId);
    const t = text.trim();
    if (t.length > INSTRUCTIONS_LIMIT) {
      throw new BadRequestError(
        `项目说明最多 ${String(INSTRUCTIONS_LIMIT)} 字，现在是 ${String(t.length)} 字；删掉一些再存`,
      );
    }
    if (t === (await this.instructions(mainId)).text) return this.instructions(mainId);
    await this.hub.record(mainId, {
      type: 'project_instructions',
      at: this.iso(),
      text: t,
      by,
      ...(forLine !== undefined ? { forLine } : {}),
    });
    return this.instructions(mainId);
  }

  /**
   * 学习对话开场附的上一次（W14 §1.1）：本项目、不含本次、没删的学习里最后活动最新的那次，状态不限；整份原文，
   * 与只读区 学过的记录/<项目>/<id>-<标题>.md 下半截同一份（W16）。一次都没有 = 空串（不附）。
   */
  private async lastLearningBlock(mainId: string, self: string): Promise<string> {
    const last = this.hub
      .listSessions()
      .filter(
        (s) =>
          s.kind === 'loop' &&
          s.parent === mainId &&
          s.sessionId !== self &&
          !this.hub.isDeleted(s.sessionId),
      )
      .map((s) => ({ s, at: s.lastAt ?? s.openedAt }))
      .sort((a, b) => b.at.localeCompare(a.at))[0]?.s;
    if (last === undefined) return '';
    const text = await this.sandboxes.transcriptText(last.sessionId);
    const file = await this.sandboxes.learningFile(last.sessionId);
    return `# 本项目最近一次学习的整份原文：${last.sessionId}「${last.title}」（最后活动 ${localMinute(last.lastAt ?? last.openedAt)}，现在 ${localMinute(this.iso())}，隔了 ${gap(Date.now() - Date.parse(last.lastAt ?? last.openedAt))}；${file !== undefined ? `和只读区 ${file} 下半截同一份，` : ''}引用写 ${last.sessionId}:L行号）\n\n${text !== '' ? text : '（这次还没有对话）'}`;
  }

  /**
   * 一次学习里每个组件的最新一版（W16：放进以后学习对话的只读区，学习者要上次那张图不用重画）。
   * 存放处缺了块（旧数据被手动清过）就跳过那个组件。
   */
  private async latestComponents(loopId: string): Promise<{ name: string; html: string }[]> {
    const last = new Map<string, string>();
    for (const { record: r } of await this.hub.records(loopId)) {
      if (r.type === 'component_version') last.set(r.component, r.manifest);
    }
    const out: { name: string; html: string }[] = [];
    for (const [name, manifest] of last) {
      try {
        const blocks = await this.screens.componentBlocks(loopId, manifest);
        out.push({ name, html: blocks.map((b) => b.html).join('\n') });
      } catch (e) {
        if ((e as { code?: string }).code !== 'ENOENT') throw e;
        // 块文件不在了：这个组件不放，别的照放
      }
    }
    return out;
  }

  /** 去掉资料（一次几份）：本项目读不到的名字跳过。 */
  async changeMaterials(
    mainId: string,
    change: { remove?: string[] },
  ): Promise<ProjectMaterialsResponse> {
    const have = (await this.o.materials.ofProject(mainId)).map((m) => m.id);
    for (const name of change.remove ?? []) {
      const id = have.find((b) => b === name || b.trim() === name.trim());
      if (id !== undefined) await this.removeMaterial(mainId, id);
    }
    return this.materials(mainId);
  }

  /**
   * 这个会话能读的资料（处理好了的）：按归属算，所属项目的 + 学习者级的（记录/资料.md「存在一处、按归属读」）；
   * 不属于项目的会话没有。别的项目的不在范围里。
   */
  async scopeOf(sessionId: string): Promise<string[]> {
    const main = await this.projectOf(sessionId);
    if (main === undefined) return [];
    return (await this.o.materials.ofProject(main))
      .filter((s) => s.status === '可用' || s.status === '部分可用')
      .map((s) => s.id);
  }

  /** 学习者给项目改名（左栏“重命名”）：主对话里追加一条 project_title，开头那行不改。 */
  async renameProject(mainId: string, title: string): Promise<void> {
    await this.requireProject(mainId);
    const t = title.trim();
    if (t === '') throw new BadRequestError('新名字不能为空');
    await this.hub.record(mainId, {
      type: 'project_title',
      at: this.iso(),
      title: t,
      source: 'learner',
    });
  }

  /**
   * 学习者在某个对话里发话。隔了一阵回来：每条都带时间，模型自己看得出离开多久，不设门槛、不另推
   * （`docs/设计/01-流程.md`「暂停」）。
   * images = 附图的来历（批 4，文字已并进 text）。
   */
  async learnerSays(
    sessionId: string,
    text: string,
    images?: ImageInput[],
    replyTo?: { key: string; pointer: string },
    quotes?: MessageQuote[],
  ): Promise<void> {
    const opened = await this.hub.opened(sessionId);
    if (opened.kind === 'loop' && opened.page !== 'stream') throw new BadRequestError(OLD_LOOP);
    // 旧数据只读：谈方向（W20 起不再开）、找资料、写产出、导航等
    if (!['main', 'loop'].includes(opened.kind)) {
      throw new BadRequestError('这段对话只能看，不能再说话。');
    }
    const meta = {
      ...(images !== undefined && images.length > 0 ? { images } : {}),
      ...(replyTo !== undefined && opened.kind === 'loop' ? { replyTo } : {}),
      ...(quotes !== undefined && quotes.length > 0 && opened.page === 'stream' ? { quotes } : {}),
    };
    // 结束的讨论串只是收起来：学习者再说话就重开（照 Claude 项目的讨论串；W12 §2 学习对话也一样）
    if (opened.kind !== 'main') await this.reopenIfEnded(opened, 'learner', '学习者又说话了');
    // 附图原样送给模型（W12 §5.6）；在沙盒里跑的会话还能在只读区打开原图
    const attach =
      images !== undefined && images.length > 0
        ? await this.imagesForModel(sessionId, images)
        : undefined;
    await this.hub.send(
      sessionId,
      { role: 'learner', text },
      { ...meta, ...(attach !== undefined ? { attach } : {}) },
    );
  }

  /** 附图交给模型：字节，加一句图在沙盒哪里（只有带沙盒的会话有这一句）。 */
  private async imagesForModel(
    sessionId: string,
    images: ImageInput[],
  ): Promise<{ data: ImageData[]; note?: string }> {
    const got = await Promise.all(images.map((r) => this.o.inputs.forModel(r)));
    const kind = (await this.hub.opened(sessionId)).kind;
    const inSandbox = kind === 'loop';
    return {
      data: got.map(({ mime, data }) => ({ mime, data })),
      ...(inSandbox
        ? { note: `（附图 ${got.map((g) => `只读/附图/${g.file}`).join('、')}）` }
        : {}),
    };
  }

  // ───────────── 一次学习结束之后 ─────────────

  /**
   * 讨论串不是主对话结束的（它自己、学习者点的）：告诉主对话一句“结束了”。只说这一句，不转述内容——
   * 这次做了什么、停在哪就是那边最后说的话，主对话要看就读那边原文（照 Claude 项目，W19）。不自动开下一次。
   */
  private async tellMainEnded(t: SessionOpened, by: 'self' | 'learner'): Promise<void> {
    const mainId = t.parent;
    // 讨论串总挂在项目的主对话下；没有就是坏数据，不替它新建项目
    if (mainId === undefined) throw new Error(`讨论串 ${t.sessionId} 没有挂在项目下`);
    const title = this.hub.labelOf(t.sessionId);
    await this.hub.send(mainId, {
      role: 'program',
      text: `「${title}」（${t.sessionId}）${by === 'learner' ? '学习者点了结束' : '结束了'}。`,
    });
  }

  // ───────────── 删除、停止与编辑（W12 §4.3 §4.4） ─────────────

  /**
   * 学习者删一个讨论串：正在跑的先停；主对话正本追加 thread_deleted（主对话下一轮前面接一句“学习者删了「…」”）。
   * 之后界面不显示、别的会话读不到、学过的记录与沙盒里不再包含。找资料存下的资料、谈方向定下的方向不跟着删。不做撤销。
   */
  async deleteThread(threadId: string): Promise<void> {
    const opened = await this.hub.opened(threadId);
    const mainId = opened.parent;
    if (mainId === undefined || !THREAD_KINDS.has(opened.kind)) {
      throw new BadRequestError('只能删项目里的讨论串');
    }
    if (this.hub.isDeleted(threadId)) throw new BadRequestError('已经删了');
    const title = this.hub.labelOf(threadId);
    await this.hub.stop(threadId);
    await this.hub.record(mainId, {
      type: 'thread_deleted',
      at: this.iso(),
      session: threadId,
      title: title.replace(/^「(.*)」.*$/, '$1'),
    });
  }

  /** 学习者点了停止：断开正在跑的这一轮（下一轮前面接“学习者停止了生成”）。 */
  async stopTurn(sessionId: string): Promise<void> {
    await this.hub.opened(sessionId);
    if (!(await this.hub.interrupt(sessionId))) throw new BadRequestError('这会儿没在生成');
  }

  /**
   * 学习者停下后改自己刚发的那句、重新生成：记 message_edited（原来那行不动），交给模型“学习者把上一句改成：……”；
   * 界面只显示改后的。只能改最后一句、而且得在停下之后（没在跑）。
   */
  async editLast(sessionId: string, text: string): Promise<void> {
    const t = text.trim();
    if (t === '') throw new BadRequestError('改后的话不能是空的');
    if (this.hub.isRunning(sessionId)) throw new BadRequestError('还在生成，先点停止再改');
    const recs = await this.hub.records(sessionId);
    const last = recs.filter((r) => r.record.type === 'user_message').at(-1);
    if (last === undefined) throw new BadRequestError('还没有说过话');
    const said = recs.some(
      (r) =>
        r.line > last.line &&
        r.record.type === 'assistant_message' &&
        r.record.interim !== true &&
        !recs.some((s) => s.line > r.line && s.record.type === 'turn_stopped'),
    );
    if (said) throw new BadRequestError('上一句已经有完整的回答了，直接接着说就好');
    const line = await this.hub.record(sessionId, {
      type: 'message_edited',
      at: this.iso(),
      line: last.line,
      text: t,
      by: 'learner',
    });
    await this.hub.send(
      sessionId,
      { role: 'learner', text: `学习者把上一句（第 ${String(last.line)} 行）改成：${t}` },
      { recorded: line },
    );
  }

  /** 学习者给一本书 / 笔记补一句来源说明（只追加）。 */
  async addSourceNote(material: string, field: string, text: string): Promise<SourceNoteView> {
    await this.o.cross.addNote({ material, field, text, by: '学习者' });
    return this.o.cross.sourceNote(material);
  }

  /**
   * 读一条外部导入（笔记 / 别处 AI 对话记录）的正文，带行号；主对话没有沙盒，被别的项目问到（ask_project）时
   * 看学习者已储备什么要靠它。给 query 只列含它的行。
   */
  private readImportTool(sessionId: string): ToolSpec {
    const page = 400;
    return {
      name: 'read_import',
      description: `读一条外部导入（学习者的笔记、在别处跟 AI 学的对话记录）的正文，带行号；一次最多 ${String(page)} 行，用 from_line 往下翻；给 query 只列含它的行。内容是学习者自述的经历，未验证、不算学会。`,
      input: {
        id: z.string().describe('导入 id（list_learned 里有，形如 imp-…）'),
        from_line: z.number().int().optional(),
        query: z.string().optional(),
      },
      run: async (a) => {
        const project = await this.projectOf(sessionId);
        // 按归属：指向的那份资料本项目读不到就当没有（W11）
        const one = (await this.learned.imports(project ?? '')).find((x) => x.id === a.id);
        if (one === undefined) return err(`本项目读不到这条导入：${a.id as string}`);
        const text = await this.learned.importText(one);
        if (text === undefined)
          return err('这条导入没有正文（旧数据：以前谈方向时说的，用 read_thread 读那一行）');
        const lines = text.split('\n');
        const numbered = lines.map((l, i) => `${String(i + 1)}\t${l}`);
        const q = a.query as string | undefined;
        if (q !== undefined && q !== '') {
          const hits = numbered.filter((_, i) => lines[i]?.includes(q) === true);
          return ok(
            `共 ${String(hits.length)} 行含“${q}”（全文 ${String(lines.length)} 行）：\n${hits.slice(0, 80).join('\n')}`,
          );
        }
        const from = Math.max(1, (a.from_line as number | undefined) ?? 1);
        const slice = numbered.slice(from - 1, from - 1 + page);
        const end = from - 1 + slice.length;
        return ok(
          `《${one.title ?? one.id}》第 ${String(from)}–${String(end)} 行，共 ${String(lines.length)} 行${end < lines.length ? `；往下读 from_line=${String(end + 1)}` : ''}：\n${slice.join('\n')}`,
        );
      },
    };
  }

  // ───────────── 主对话 ─────────────

  /**
   * 主对话的只读工具（工单 W5 §4.5）：学过的记录每次一行（上层单子 + 中层判定里的实际理解），外部导入单列标未验证；
   * 以前单开谈方向定下的方向（旧数据，W20 起不再写）有才列。被别的项目问到时（ask_project）也用它。
   */
  private listLearnedTool(sessionId: string, importText = false): ToolSpec {
    return {
      name: 'list_learned',
      description:
        '列出这个项目里学过的记录：每次学习一行（状态与时间；旧学习另带标着“旧数据”的收尾那一句、结束原话、单子、路线决定——都只是指针，学习者会什么以那次原文为准），以及外部导入（未验证）；以前单开谈方向时定下的方向（旧记录）有就列在最前。',
      input: {},
      run: async () => {
        const mainId = await this.projectOf(sessionId);
        if (mainId === undefined) return err('找不到这个对话所属的项目');
        const goal = currentGoal(await this.hub.records(mainId));
        const body = await this.learned.list(mainId);
        const rows = body.learnings.map((l) => `- ${this.learned.line(l)}`);
        const imports = body.imports.map(
          (x) =>
            `- ${this.learned.importLine(x)}（未验证，不算学会${importText && 'material' in x.ref ? '；正文用 read_import 读' : ''}）`,
        );
        return ok(
          [
            ...(goal !== undefined ? [oldGoalBlock(goal.goal), ''] : []),
            `学过的记录（每次学习一行）：\n${rows.join('\n') || '（还没有）'}`,
            ...(imports.length > 0
              ? ['', `外部导入（学习者自述 / 笔记，未验证，不算学会）：\n${imports.join('\n')}`]
              : []),
          ].join('\n'),
        );
      },
    };
  }

  /**
   * 主对话每轮附上的事实（W12 §3.2，照 Claude 的 wake）：只有时间类的（现在几点；每条输入前已带距学习者上次说话多久），
   * 方向、讨论串清单、学过的记录要用自己读。只有新开模型对话（没有可续接的）时才从记录补上最近的消息。
   */
  private async mainPreface(mainId: string, inputLine: number, fresh: boolean): Promise<string> {
    if (!fresh) return '';
    const records = await this.hub.records(mainId);
    return [
      `现在：${localMinute(this.iso())}`,
      '── 前面说过的（这次是新接上的对话，从记录补上最近的；讨论串清单用 list_threads 读）──',
      this.recentMessages(records, inputLine, 30, 300) || '（还没有）',
    ].join('\n');
  }

  /** 主对话里 inputLine 之前的学习者 / 主对话 / 程序 / 讨论串发来的话，取最后 n 条。 */
  private recentMessages(
    records: NumberedRecord[],
    inputLine: number,
    n: number,
    cut: number,
  ): string {
    const messages: string[] = [];
    for (const { line, record } of records) {
      if (line >= inputLine) continue;
      const who =
        record.type === 'user_message'
          ? '学习者'
          : record.type === 'assistant_message' && record.interim !== true
            ? '主对话'
            : record.type === 'program_fact'
              ? '程序'
              : record.type === 'thread_message' && !this.hub.isDeleted(record.from)
                ? `${this.hub.labelOf(record.from)}发来`
                : undefined;
      if (who === undefined || !('text' in record)) continue;
      const text = record.text.length > cut ? `${record.text.slice(0, cut)}…` : record.text;
      messages.push(`L${String(line)} ${who}：${text}`);
    }
    return messages.slice(-n).join('\n');
  }

  /**
   * 主对话的工具（W12 §3.2，照 Claude 项目的协调者）：开讨论串、发话、读 / 列讨论串、改名、结束 / 重开、改自己上一条、
   * 回表情；学过的记录、项目说明。主对话不带删除工具（删只在界面上）。
   */
  private mainTools(mainId: string): ToolSpec[] {
    return [
      {
        name: 'start_thread',
        description:
          '开一个讨论串（学习对话），把一件事交给它：讲解、练习、读资料一起学，也聊学这个能做什么、往哪走；能联网查。instructions 是给它的交代：只写它需要、自己读不到的项目背景；学习者的话有两种读法时写一句你的理解；不替它定学什么、不加学习者没要求的要求。学习者的原话用 learner_lines 指行号，程序照抄附上。',
        input: {
          title: z.string().describe('几个字，动词开头，学习者在列表里凭它找回来'),
          instructions: z.string(),
          learner_lines: z
            .array(z.number().int())
            .min(1)
            .describe('学习者在主对话里那几句话的行号'),
        },
        run: async (a) => {
          const title = (a.title as string).trim();
          if (title === '') return err('title 不能是空的');
          const cited = await this.citeMain(mainId, a.learner_lines as number[]);
          if (typeof cited === 'string') return err(cited);
          // W20 起新开的讨论串都是学习对话（谈方向不再单开）
          const s = await this.hub.createSession('loop', {
            title,
            parent: mainId,
            anchorLine: cited.at(-1)?.line ?? 0,
            screens: true,
            page: 'stream',
          });
          await this.hub.record(mainId, {
            type: 'task_opened',
            at: this.iso(),
            sessionId: s.sessionId,
            kind: 'loop',
            title,
            anchorLine: cited.at(-1)?.line ?? 0,
          });
          // 程序附上它自己一开始就该知道的：只读区有什么、跨次记录（W13）、本项目最近一次学习的整份原文（W14 §1）；
          // 都放 attached，不进这次的对话原文（W14 §1.2）
          const attached = [
            describeSandbox(await this.sandboxes.forLoop(s.sessionId)),
            await this.notes.render(mainId, s.sessionId),
            await this.lastLearningBlock(mainId, s.sessionId),
          ]
            .filter((x) => x !== '')
            .join('\n\n');
          await this.hub.message(s.sessionId, {
            from: mainId,
            text: (a.instructions as string).trim(),
            cited,
            reply: true,
            attached,
          });
          return ok(
            `已开：${s.sessionId}「${title}」，入口卡片在主对话里。跟学习者说一句就好；那边做完或有事会自己说，要看进展用 read_thread。`,
          );
        },
      },
      {
        name: 'message_thread',
        description:
          '给一个已有的讨论串发话：学习者在主对话里说的是那边的事（接着那边谈、补一句要求），或那边的事你有项目背景要补。发出去马上返回；那边正在跑就等它这一轮跑完再收到，它回的话会作为一条消息送回这里。学习者的原话用 learner_lines 指行号，程序照抄附上；text 只写你要补的，不加学习者没要求的要求。已结束的会重新打开。',
        input: {
          thread: z.string().describe('讨论串的会话 id'),
          text: z.string(),
          learner_lines: z.array(z.number().int()).optional(),
        },
        run: async (a) => {
          const t = await this.threadOf(mainId, a.thread as string, true);
          if (typeof t === 'string') return err(t);
          const cited = await this.citeMain(
            mainId,
            (a.learner_lines as number[] | undefined) ?? [],
          );
          if (typeof cited === 'string') return err(cited);
          await this.reopenIfEnded(t, 'main', '主对话发话');
          await this.hub.message(t.sessionId, {
            from: mainId,
            text: (a.text as string).trim(),
            cited,
          });
          return ok('已发出。');
        },
      },
      this.readThreadTool(mainId),
      this.listThreadsTool(mainId),
      {
        name: 'rename_thread',
        description: '给一个讨论串改名（几个字，动词开头）。',
        input: { thread: z.string(), title: z.string() },
        run: async (a) => {
          const t = await this.threadOf(mainId, a.thread as string);
          if (typeof t === 'string') return err(t);
          return this.setTitle(t.sessionId, a.title as string);
        },
      },
      {
        name: 'close_thread',
        description:
          '结束一个讨论串（只是收起，学习者再说话或你调 reopen_thread 就重开）：学习者说那件事不用再做了时用。',
        input: {
          thread: z.string(),
          reason: z.string().describe('学习者怎么说的（主对话行号 + 一句）'),
        },
        run: async (a) => {
          const t = await this.threadOf(mainId, a.thread as string);
          if (typeof t === 'string') return err(t);
          return this.closeThread(t, 'main', a.reason as string);
        },
      },
      {
        name: 'reopen_thread',
        description: '重开一个已结束的学习对话。',
        input: {
          thread: z.string(),
          reason: z.string().describe('学习者怎么说的（主对话行号 + 一句）'),
        },
        run: async (a) => {
          const t = await this.threadOf(mainId, a.thread as string, true);
          if (typeof t === 'string') return err(t);
          if (!(await this.reopenIfEnded(t, 'main', a.reason as string))) return err('它还开着。');
          return ok('已重新打开。');
        },
      },
      {
        name: 'edit_message',
        description:
          '改你在主对话里上一条说的话（发现理解错了时直接改，不追加更正）：学习者看到的是改后的。',
        input: { text: z.string().describe('改后的全文') },
        run: async (a) => {
          const recs = await this.hub.records(mainId);
          const last = recs
            .filter((r) => r.record.type === 'assistant_message' && r.record.interim !== true)
            .at(-1);
          if (last === undefined) return err('你还没有说过话');
          const text = (a.text as string).trim();
          if (text === '') return err('改后的话不能是空的');
          await this.hub.record(mainId, {
            type: 'message_edited',
            at: this.iso(),
            line: last.line,
            text,
            by: 'model',
          });
          return ok('已改。');
        },
      },
      {
        name: 'react',
        description: '对学习者的一句话回一个表情、不说话（打招呼、致谢、知会一声时）。',
        input: {
          line: z.number().int().describe('学习者那句话的行号'),
          emoji: z.string().describe('一个表情'),
        },
        run: async (a) => {
          const recs = await this.hub.records(mainId);
          if (recs.find((r) => r.line === a.line)?.record.type !== 'user_message') {
            return err('那一行不是学习者的话');
          }
          await this.hub.record(mainId, {
            type: 'message_reaction',
            at: this.iso(),
            line: a.line as number,
            emoji: (a.emoji as string).trim().slice(0, 8),
          });
          return ok('已回。这一轮不用再说话。');
        },
      },
      this.listLearnedTool(mainId),
      {
        name: 'remember',
        description:
          '学习者明确要你记住一件长期的事（“记住我用 Linux”“以后别先给答案”）时调用：给出改后的项目说明全文（在现有的上面增删改，其余照留）。',
        input: { text: z.string().describe('改后的项目说明全文') },
        run: async (a) => {
          const recs = await this.hub.records(mainId);
          const asked = recs.filter((r) => r.record.type === 'user_message').at(-1);
          try {
            const now = await this.setInstructions(mainId, a.text as string, 'main', asked?.line);
            return await ok(`已存。现在的项目说明：\n${now.text || '（空）'}`);
          } catch (e) {
            if (e instanceof BadRequestError) return await err(e.message);
            throw e;
          }
        },
      },
    ];
  }

  // ───────────── 讨论串之间（W12 §3.3，照 Claude 讨论串的工具） ─────────────

  /**
   * 讨论串（学习对话）的工具：读别的讨论串 / 列讨论串、给主对话或别的讨论串发话、结束自己（W19）。主对话原文在
   * 沙盒只读区（只读/主对话.md，每轮刷新，W16）；改名在 loopTools 的 set_title。
   */
  private threadTools(sessionId: string): ToolSpec[] {
    return [
      this.readThreadTool(sessionId),
      this.listThreadsTool(sessionId),
      {
        name: 'message_coordinator',
        description:
          '给主对话发话（学习者看不到）：学习者要做的是另一件事、要另开一个讨论串时用（如学到一半要先补别的），附学习者原话的行号；这边照样开着。发完跟学习者说一句。不用来报进度：你在这里说的话主对话读得到。',
        input: {
          text: z.string(),
          learner_lines: z
            .array(z.number().int())
            .optional()
            .describe('学习者在这个对话里那几句话的行号'),
        },
        run: async (a) => {
          const mainId = await this.projectOf(sessionId);
          if (mainId === undefined) return err('找不到这个对话所属的项目');
          const cited = await this.citeLearner(
            sessionId,
            (a.learner_lines as number[] | undefined) ?? [],
          );
          if (typeof cited === 'string') return err(cited);
          await this.hub.message(mainId, {
            from: sessionId,
            text: (a.text as string).trim(),
            cited,
          });
          return ok('已发给主对话。');
        },
      },
      {
        name: 'message_thread',
        description:
          '给本项目另一个讨论串发话（学习者看不到）：只在两边的活互相依赖时用。要转学习者的话，附他原话的行号，不转述。它回的话会作为一条消息送回这里。',
        input: {
          thread: z.string(),
          text: z.string(),
          learner_lines: z.array(z.number().int()).optional(),
        },
        run: async (a) => {
          const mainId = await this.projectOf(sessionId);
          if (mainId === undefined) return err('找不到这个对话所属的项目');
          const t = await this.threadOf(mainId, a.thread as string, true);
          if (typeof t === 'string') return err(t);
          if (t.sessionId === sessionId) return err('这就是你自己');
          const cited = await this.citeLearner(
            sessionId,
            (a.learner_lines as number[] | undefined) ?? [],
          );
          if (typeof cited === 'string') return err(cited);
          await this.reopenIfEnded(t, 'main', `${sessionId} 发话`);
          await this.hub.message(t.sessionId, {
            from: sessionId,
            text: (a.text as string).trim(),
            cited,
          });
          return ok('已发出。');
        },
      },
      {
        name: 'close_thread',
        description:
          '这件事做完了、学习者也认可时结束这个对话（只是收起，学习者再说话就重开）。交了东西还在等学习者看、学习者还有话说的不结束。',
        input: { reason: z.string().describe('一句：为什么结束（学习者怎么说的，带行号）') },
        run: async (a: Record<string, unknown>) => {
          const opened = await this.hub.opened(sessionId);
          return this.closeThread(opened, 'self', a.reason as string);
        },
      },
    ];
  }

  /** 读一个讨论串的原文（不是摘要）：主对话与各讨论串共用；删掉的读不到。 */
  private readThreadTool(selfId: string): ToolSpec {
    return {
      name: 'read_thread',
      description:
        '读本项目某个讨论串的原文（学习者与那边的话、别的对话发去的话，带行号与时间），不是摘要；会话 id 用 list_threads 查。',
      input: {
        thread: z.string(),
        from_line: z.number().int().optional(),
        to_line: z.number().int().optional(),
      },
      run: async (a) => {
        const mainId = await this.projectOf(selfId);
        if (mainId === undefined) return err('找不到这个对话所属的项目');
        const t = await this.threadOf(mainId, a.thread as string);
        if (typeof t === 'string') return err(t);
        return ok(
          await this.transcriptOf(
            t.sessionId,
            a.from_line as number | undefined,
            a.to_line as number | undefined,
          ),
        );
      },
    };
  }

  /** 列本项目的讨论串：会话 id、种类、标题、状态、最后活动（删掉的不列）。 */
  private listThreadsTool(selfId: string): ToolSpec {
    return {
      name: 'list_threads',
      description: '列出本项目的讨论串：会话 id、种类、标题、状态（开着 / 已结束）、最后活动时间。',
      input: {},
      run: async () => {
        const mainId = await this.projectOf(selfId);
        if (mainId === undefined) return err('找不到这个对话所属的项目');
        const label = { open: '开着', ended: '已结束' };
        const rows = this.hub
          .listSessions()
          .filter((s) => s.parent === mainId && THREAD_KINDS.has(s.kind))
          .sort((x, y) => (y.lastAt ?? y.openedAt).localeCompare(x.lastAt ?? x.openedAt))
          .map(
            (s) =>
              `- ${s.sessionId}（${CONVERSATION_KIND_LABELS[s.kind]}）「${s.title}」${label[threadGroup(s)]} · 最后活动 ${localMinute(s.lastAt ?? s.openedAt)}${s.sessionId === selfId ? '（就是你）' : ''}`,
          );
        return ok(rows.join('\n') || '还没有讨论串');
      },
    };
  }

  /** 一个会话的对话原文：学习者、模型最后写的话（不含中途碎话）、别的会话发来的话；带行号与时间。 */
  private async transcriptOf(
    sessionId: string,
    from = 1,
    to = Number.MAX_SAFE_INTEGER,
  ): Promise<string> {
    const recs = (await this.hub.records(sessionId)).filter(
      (r) =>
        r.line >= from &&
        r.line <= to &&
        (r.record.type === 'user_message' ||
          // 删掉的讨论串发来的话读不到（W12 §4.3）
          (r.record.type === 'thread_message' && !this.hub.isDeleted(r.record.from)) ||
          (r.record.type === 'assistant_message' && r.record.interim !== true)),
    );
    const kind = this.hub.listSessions().find((s) => s.sessionId === sessionId)?.kind;
    const self = kind === 'main' ? '主对话' : kind === 'talk' ? '谈方向' : '教学';
    return renderTranscript(recs, (id) => this.hub.labelOf(id), self) || '（这一段没有对话）';
  }

  /**
   * 本项目里的一个讨论串；不是就回一句原因。live = 要给它发话、重开它：只有学习对话能（旧版开的学习对话只能读、
   * 改名、结束；谈方向、找资料等不再开的种类只能读、改名）。
   */
  private async threadOf(
    mainId: string,
    id: string,
    live = false,
  ): Promise<SessionOpened | string> {
    const opened = await this.hub.opened(id.trim()).catch((e: unknown) => {
      if (e instanceof NotFoundError) return undefined;
      throw e;
    });
    if (opened?.parent !== mainId || !THREAD_KINDS.has(opened.kind) || this.hub.isDeleted(id)) {
      return `本项目里没有这个讨论串：${id}`;
    }
    if (live && opened.kind !== 'loop') return OLD_THREAD;
    if (live && opened.page !== 'stream') return OLD_LOOP;
    return opened;
  }

  /** 主对话里学习者那几行原话（程序照抄）；有一行不是学习者的话就回原因。 */
  private async citeMain(
    mainId: string,
    lines: number[],
  ): Promise<{ session: string; line: number; at: string; text: string }[] | string> {
    return this.citeLearner(mainId, lines);
  }

  private async citeLearner(
    sessionId: string,
    lines: number[],
  ): Promise<{ session: string; line: number; at: string; text: string }[] | string> {
    const recs = await this.hub.records(sessionId);
    const out: { session: string; line: number; at: string; text: string }[] = [];
    for (const line of lines) {
      const r = recs.find((x) => x.line === line)?.record;
      if (r?.type !== 'user_message') return `第 ${String(line)} 行不是学习者的话`;
      out.push({ session: sessionId, line, at: r.at, text: r.text });
    }
    return out;
  }

  /** 结束着的学习对话重开（结束后也能重开，W12 §2）；重开了返回真。别的种类不再开（threadOf 已挡）。 */
  private async reopenIfEnded(
    t: SessionOpened,
    by: 'learner' | 'main',
    reason: string,
  ): Promise<boolean> {
    if (t.kind !== 'loop') return false;
    if (!threadEnded(await this.hub.records(t.sessionId))) return false;
    await this.hub.record(t.sessionId, { type: 'thread_reopened', at: this.iso(), by, reason });
    return true;
  }

  /**
   * 结束一个学习对话（只是收起，再说话就重开；W19 照 Claude 项目的 set_thread_resolved）。不是主对话结束的，告诉主对话
   * 一句“结束了”。不再开的种类（谈方向等）只读，在讨论串里已算结束。
   */
  private async closeThread(
    t: SessionOpened,
    by: 'main' | 'self' | 'learner',
    reason: string,
  ): Promise<ToolResult> {
    if (t.kind !== 'loop') return err(OLD_THREAD);
    if (threadEnded(await this.hub.records(t.sessionId))) return err('它已经结束了。');
    await this.hub.record(t.sessionId, { type: 'thread_closed', at: this.iso(), by, reason });
    if (by !== 'main') {
      this.background('讨论串结束后告诉主对话', () => this.tellMainEnded(t, by));
    }
    return ok('已结束。');
  }

  /** 学习者在讨论串栏“⋯”里点结束（W19）：学习对话能结束；旧数据里只读的（谈方向、找资料等）不用结束。 */
  async endThread(threadId: string): Promise<void> {
    const opened = await this.hub.opened(threadId);
    if (opened.parent === undefined || opened.kind !== 'loop') {
      throw new BadRequestError('只能结束项目里的学习对话');
    }
    if (this.hub.isDeleted(threadId)) throw new BadRequestError('已经删了');
    await this.hub.stop(threadId);
    const r = await this.closeThread(opened, 'learner', '学习者在讨论串栏点了结束');
    if (r.isError === true) throw new BadRequestError(r.text);
  }

  private async setTitle(sessionId: string, raw: string): Promise<ToolResult> {
    const title = raw.trim();
    if (title === '') return err('标题不能是空的');
    if (title.length > 30) return err('标题太长，几个字就好');
    await this.hub.record(sessionId, { type: 'thread_title', at: this.iso(), title });
    return ok('标题已改。');
  }

  // ───────────── 学习对话 ─────────────

  /** 这次学习用竖流学习页（W12 起新开的都是；更早的旧数据只读）。 */
  async isStream(loopId: string): Promise<boolean> {
    return (await this.hub.opened(loopId)).page === 'stream';
  }

  /**
   * 学习对话的工具（W12 §2）：改自己的标题 + 竖流学习页的页面工具；结束用讨论串工具里的 close_thread（W19）；资料、
   * 学过的记录、方向、项目说明都在沙盒里当只读文件读；中途要先学别的，用 message_coordinator 请主对话另开。
   */
  private loopTools(loopId: string): ToolSpec[] {
    return [
      {
        name: 'tidy_message',
        description:
          '整理学习者的一句话（W17）：改转写错的词、把混在一起的几件事分开写、说到一半改口的写改后的；只写他说了什么，不写他懂没懂、水平怎样。写法按这段话的内容定。原话不动、照旧是证据；整理版另存，接在对话原文里（以“整理（”开头），学习者在页面上能点开看。同一行再整理，以后写的为准。',
        input: {
          line: z.number().int().describe('学习者那句话在本对话里的行号'),
          text: z.string().describe('整理后的样子'),
        },
        run: async (a) => {
          const line = a.line as number;
          const text = (a.text as string).trim();
          if (text === '') return err('text 不能是空的');
          const rec = (await this.hub.records(loopId)).find((r) => r.line === line);
          if (rec?.record.type !== 'user_message') {
            return err(`第 ${String(line)} 行不是学习者在这里说的话`);
          }
          await this.hub.record(loopId, { type: 'message_tidied', at: this.iso(), line, text });
          return ok('已记下。');
        },
      },
      this.threadTitleTool(loopId),
      ...streamTools(
        {
          hub: () => this.hub,
          screens: this.screens,
          store: this.screenStore,
          iso: () => this.iso(),
          assertOpen: (id) => this.assertActiveLoop(id),
          readableLoop: (id) =>
            !this.hub.isDeleted(id) &&
            this.hub.listSessions().some((x) => x.sessionId === id && x.kind === 'loop'),
          componentsOf: (id) => this.latestComponents(id),
        },
        loopId,
      ),
    ];
  }

  // ───────────── 跨次记录（W13，#83，试验中） ─────────────

  /** 记一条跨次记录：主对话、学习对话都有；学到哪只有学习对话能记（`cross-notes.ts` 核对）。 */
  private noteTool(sessionId: string, kind: 'main' | 'loop'): ToolSpec {
    return {
      name: 'note_down',
      description: `记一条跨次记录（以后的对话开场都看得到）。kind：${
        kind === 'loop'
          ? 'progress = 学到哪（这次从哪出发、学了什么、停在哪，学习者说下次再说的）；'
          : ''
      }learner = 学习者说过的长期的话（想拿它做什么、要学到什么程度、怎么讲他听得懂、他的条件、对你的抱怨和要求；quote 照抄他原话里的一段，text 只写当时在说什么，不写你打算怎么做）；withdraw = 学习者说某条不对或要忘掉（replaces 指那条，text 写他怎么说的）。只记事实，不记你对学习者的判断。lines = 这件事在本对话里的行号。学习者改了主意：新记一条，replaces 指旧的。`,
      input: {
        kind: z.enum(['progress', 'learner', 'withdraw']),
        text: z.string().describe('一句话（200 字以内）'),
        quote: z.string().optional().describe('kind = learner 时必填：学习者原话里的一段，照抄'),
        lines: z.array(z.number().int()).min(1).describe('出处：本对话里的行号'),
        scope: z
          .enum(['project', 'learner'])
          .optional()
          .describe('learner = 学习者明说以后都这样、学什么都适用；不填就是本项目'),
        replaces: z
          .string()
          .optional()
          .describe('被替换或撤回的那条的编号（跨次记录里那条末尾的编号）'),
      },
      run: async (a) => {
        const r = await this.notes.write(sessionId, {
          kind: a.kind as 'progress' | 'learner' | 'withdraw',
          text: a.text as string,
          lines: a.lines as number[],
          ...(typeof a.quote === 'string' ? { quote: a.quote } : {}),
          ...(a.scope === 'project' || a.scope === 'learner' ? { scope: a.scope } : {}),
          ...(typeof a.replaces === 'string' ? { replaces: a.replaces } : {}),
        });
        return typeof r === 'string' ? err(r) : ok(`已记：${r.id}`);
      },
    };
  }

  /** 读本项目的跨次记录（主对话；学习对话在沙盒里读 只读/跨次记录.md）。 */
  private readNotesTool(sessionId: string): ToolSpec {
    return {
      name: 'read_notes',
      description: '读本项目的跨次记录：各次学习学到哪、学习者说过的长期的话，每条带编号与出处。',
      input: {},
      run: async () => {
        const mainId = await this.projectOf(sessionId);
        if (mainId === undefined) return err('找不到这个对话所属的项目');
        return ok(await this.notes.render(mainId, sessionId));
      },
    };
  }

  /** 讨论串自己起的标题（照 Claude 项目的讨论串标题）：开头起一个，做的事变了再改。 */
  private threadTitleTool(sessionId: string): ToolSpec {
    return {
      name: 'set_title',
      description:
        '给这个对话起标题：几个字、动词开头，说清这里在做什么（学习者在列表里只凭它找回这里）；做的事变了再改。不用跟学习者提。',
      input: { title: z.string().describe('几个字，用学习者的说法') },
      run: (a) => this.setTitle(sessionId, a.title as string),
    };
  }

  // ───────────── 共用 ─────────────

  /** 这次学习还开着、且是竖流学习页开的（页面工具、组件操作要它）。 */
  private async assertActiveLoop(loopId: string): Promise<void> {
    const opened = await this.hub.opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    // 结束后能重开（W12 §2）：看最后一次结束之后有没有重开过
    if (threadEnded(await this.hub.records(loopId))) {
      throw new BadRequestError('这部分已经结束了。');
    }
    // 旧版开的学习对话（开场时提示词与工具已定死）只看，不再跑（W10 §9 第 1 条）
    if (opened.screens !== true) throw new BadRequestError(OLD_LOOP);
  }

  /** 资料范围的说明，接在工具结果后面。 */
  private scopeHint(scope: string[]): string {
    return `\n（只在本项目能读的 ${String(scope.length)} 份资料里查）`;
  }

  /** 资料清单：每份一行（id、标题、种类、归属、版本、日期、状态、大小、说明），给工具与沙盒目录共用。 */
  async materialLines(ids: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const id of ids) {
      const s = await this.o.materials.source(id);
      if (s === undefined) continue;
      const owner = s.owner.kind === 'learner' ? '学习者' : '项目';
      const kb = Math.max(1, Math.round((await this.o.materials.bodyBytes(id)) / 1024));
      const guide = (await this.o.materials.guide(id))?.replace(/\s+/g, ' ').trim();
      out.push(
        `- ${id}｜${s.title}｜${s.kind}｜${owner}${s.learned === undefined ? '' : s.learned.channel === '对话记录' ? '·学过的（对话记录：了解学习者用，AI 讲的不作讲解依据）' : `·学过的（${s.learned.channel}）`}｜版本 ${s.version || '—'}｜${s.fetchedAt.slice(0, 10)}｜${s.status}${s.problems !== undefined ? `｜有问题：${s.problems.join('；')}` : ''}｜${String(kb)} KB${guide !== undefined && guide !== '' ? `｜说明：${guide.length > 300 ? `${guide.slice(0, 300)}…` : guide}` : ''}`,
      );
    }
    return out;
  }

  /**
   * 只读查询工具：本项目能读的资料（按归属：本项目的 + 学习者的笔记等）的原文与出处（记录/读写权限.md
   * 「读资料的范围」）；别的项目的读不到，由程序挡。
   */
  private readTools(sessionId: string): ToolSpec[] {
    const inScope = async (material: string): Promise<string | undefined> => {
      const scope = await this.scopeOf(sessionId);
      return scope.includes(material)
        ? undefined
        : `本项目读不到这份资料：${material}（只读本项目的与学习者的；别的项目的要用，请学习者把归属改成学习者或加上本项目）`;
    };
    const tools: ToolSpec[] = [];
    tools.push(
      {
        name: 'materials_index',
        description:
          '不给资料 id：列出本项目能读的资料（本项目导入的 PDF、网页、代码仓库、文档等，加上学习者的笔记、别处的学习记录；每份一行：id、标题、种类、归属、版本、日期、状态、说明）；给资料 id：读这份资料的文件清单（有 说明.md 的排第一）。',
        input: { material: z.string().optional().describe('资料 id') },
        run: async (a) => {
          const material = a.material as string | undefined;
          if (material === undefined || material === '') {
            const scope = await this.scopeOf(sessionId);
            if (scope.length === 0) return ok('本项目还没有能用的资料（缺资料依据）');
            return ok((await this.materialLines(scope)).join('\n'));
          }
          const bad = await inScope(material);
          if (bad !== undefined) return err(bad);
          return ok(
            (await this.o.materials.index(material)) + (await this.o.cross.noteLines([material])),
          );
        },
      },
      {
        name: 'read_material',
        description:
          '读资料里一个文件的原文，每行前印行号；可只读一段。末尾给出引用这段时要附的出处标记。',
        input: {
          material: z.string().describe('资料 id'),
          file: z
            .string()
            .describe('文件清单里的路径，如 p1-200.md、笔记/第一章.md 或 src/main.py'),
          from_line: z.number().int().optional(),
          to_line: z.number().int().optional(),
        },
        run: async (a) => {
          const material = a.material as string;
          const file = a.file as string;
          const bad = await inScope(material);
          if (bad !== undefined) return err(bad);
          const r = await this.o.materials.lines(
            material,
            file,
            (a.from_line as number | undefined) ?? 1,
            (a.to_line as number | undefined) ?? Number.MAX_SAFE_INTEGER,
          );
          const body = r.lines.map((l) => `${String(l.n)}\t${l.text}`).join('\n');
          return ok(
            (r.lines.length === 0
              ? `（这个文件共 ${String(r.total)} 行，没有第 ${String((a.from_line as number | undefined) ?? 1)} 行起的内容）`
              : `${body}\n\n（引用上面的话时，在那句话后附：${formatCitation({ material, file, from: r.from, to: r.to })}；依据串写 ${material}/${file}:${String(r.from)}，行段按你实际引用的缩小）`) +
              (await this.o.cross.noteLines([material])),
          );
        },
      },
      {
        name: 'search_materials',
        description:
          '在本项目能读的资料（含学习者的笔记）的原文里全文检索（词用空白隔开，要同时出现在同一段里）。返回资料、文件、行号、片段和可直接用的出处标记。想引用原文、核对资料怎么说时用；搜不到就是资料里没有。',
        input: {
          query: z.string(),
          material: z.string().optional().describe('只搜这一份（资料 id）'),
          limit: z.number().int().optional().describe('最多几条，默认 10'),
        },
        run: async (a) => {
          const material = (a.material as string | undefined) || undefined;
          if (material !== undefined) {
            const bad = await inScope(material);
            if (bad !== undefined) return err(bad);
          }
          const scope = await this.scopeOf(sessionId);
          if (scope.length === 0) return ok('本项目还没有能用的资料（缺资料依据）');
          const r = await this.o.sources.search(
            a.query as string,
            material,
            (a.limit as number | undefined) ?? 10,
            scope,
          );
          if (r.hits.length === 0) {
            return ok(`没找到（原文里没有同时含这些词的一段）${this.scopeHint(scope)}`);
          }
          const rows = r.hits.map(
            (h) =>
              `《${h.materialTitle || h.material}》${h.num} ${h.title}｜${h.file} 第 ${String(h.line)} 行\n  ${h.snippet}\n  出处标记：${formatCitation({ material: h.material, file: h.file, from: h.line })}`,
          );
          return ok(
            `共 ${String(r.total)} 段命中，列出前 ${String(r.hits.length)}：\n${rows.join('\n')}${this.scopeHint(scope)}${await this.o.cross.noteLines(r.hits.map((h) => h.material))}`,
          );
        },
      },
    );
    return tools;
  }
}

function ok(text: string): Promise<ToolResult> {
  return Promise.resolve({ text });
}

function err(text: string): Promise<ToolResult> {
  return Promise.resolve({ text, isError: true });
}

function formatDuration(ms: number): string {
  const h = ms / 3_600_000;
  if (h < 1) return `${String(Math.round(ms / 60_000))} 分钟`;
  if (h < 48) return `${String(Math.round(h))} 小时`;
  return `${String(Math.round(h / 24))} 天`;
}

/** 开场写“隔了多久”：上次学习到现在。 */
function gap(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${String(m)} 分钟`;
  const h = Math.round(ms / 3_600_000);
  return h < 48 ? `${String(h)} 小时` : `${String(Math.round(h / 24))} 天`;
}
