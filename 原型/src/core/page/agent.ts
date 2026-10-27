// 学习对话的子代理（`docs/设计/会话/页面子代理.md`）：只做要写代码的组件（函数图、动画、可拖动的演示、可交互的题）。
// 主模型用 Agent SDK 自带的派子代理派它，它在后台做、交回一句。框架只做外围：
// 组件按结构块摊成文件（`组件/<编号>/` 每块一个文件 + `目录.md`，`组件/目录.md` 列全部组件）、它能读写哪些文件、
// 交时检查（是不是最新的、改的块读过没有）、在学习者浏览器隐藏小窗试跑。编号只在程序里用。
// 学习者动了组件、要先回做它的一方时，SDK 做不到不经主模型给后台子代理送话（W10 4.0），
// 框架另开一次子代理：带上组件当前版、当初的交代、学习者这次的操作（W10 §9 第 4 条），主上下文不变。
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import type { NumberedRecord, SubagentStarted } from '../../shared/records.ts';
import type { ComponentManifest } from '../../shared/screen.ts';
import type { Hub } from '../hub.ts';
import type { SandboxSpec, SubagentSpec, ToolResult, ToolSpec } from '../model/port.ts';
import { SUBAGENT, type Screens } from './screens.ts';
import { fingerprint, MAX_BLOCK_BYTES, type PageStore } from './store.ts';

/** 工作区里放组件的子目录、目录文件名。 */
export const COMPONENT_DIR = '组件';
const CATALOG = '目录.md';
const COMPONENT_ID = /^c\d+$/;

export interface ComponentsDeps {
  hub: () => Hub;
  screens: Screens;
  store: PageStore;
  /** 学习对话的工作区（`组件/` 在它下面）。 */
  workdir: (loopId: string) => string;
  /** 学习对话的沙盒（取只读的资料与学习位置依据）。 */
  sandbox: (loopId: string) => Promise<SandboxSpec>;
  /** 学习对话还开着；不是就抛错。 */
  assertOpen: (loopId: string) => Promise<void>;
  /** 子代理的系统提示。 */
  prompt: string;
  iso: () => string;
}

/** 摊进目录时依据的那一版（交时比对：是不是最新的、改的块读过没有）。 */
interface Laid {
  manifest: string;
  m: ComponentManifest;
  /** 摊完时正本有多少行：之后的读才算“读过”。 */
  line: number;
}

export class Components {
  private readonly laid = new Map<string, Laid>();
  /** 派出去的活的交代（按 taskId；跟着正本走，重启后从正本补）。 */
  private readonly briefs = new Map<string, SubagentStarted>();

  constructor(private readonly o: ComponentsDeps) {}

  private get hub(): Hub {
    return this.o.hub();
  }

  /** 接上 Hub：记下每件活的交代（读写范围按活定：派它画学习位置图时才给位置依据）。 */
  attach(hub: Hub): void {
    hub.subscribe((e) => {
      if (e.type === 'record' && e.record.type === 'subagent_started') {
        this.briefs.set(e.record.taskId, e.record);
      }
    });
  }

  dir(loopId: string): string {
    return join(this.o.workdir(loopId), COMPONENT_DIR);
  }

  /** 开学习对话时：把每个组件的当前版摊进目录，返回派子代理的规格。 */
  async spec(loopId: string): Promise<SubagentSpec> {
    // 上次没交回就断了的（服务重启，后台子代理跟着没了）：记一笔交回，不然一直占位
    // （社区踩过的坑：完成通知绑在进程上，重启后没人收尾，`docs/调研/子代理与沙盒-社区.md` §1）
    const records = await this.hub.records(loopId);
    for (const r of records) {
      if (r.record.type === 'subagent_started') this.briefs.set(r.record.taskId, r.record);
    }
    for (const t of openTasks(records)) {
      await this.hub.record(loopId, {
        type: 'subagent_result',
        at: this.o.iso(),
        agent: SUBAGENT,
        taskId: t,
        status: 'interrupted',
        text: '没做完就断了（服务重启），组件没做成',
      });
    }
    await this.layoutAll(loopId);
    const sb = await this.o.sandbox(loopId);
    return {
      name: SUBAGENT,
      description:
        '做要写代码的组件（函数图、动画、可拖动的演示、可交互的题）：你把要什么、留多大余地、学习者动它要不要观测、观测什么、报给谁、等不等回应、能不能直接改说清；它在后台做，做好交回一句。教学文字你自己写，不交给它。',
      prompt: `${this.o.prompt}\n\n组件目录（完整路径）：${this.dir(loopId)}`,
      builtins: ['Read', 'Edit', 'Write', 'Glob'],
      ownTools: ['submit_component'],
      writable: this.dir(loopId),
      readable: materialPaths(sb),
      readableFor: (task) => (this.wantsPosition(task) ? positionPaths(sb) : []),
    };
  }

  /** 这件活是不是派它画学习位置图（交代里提到“位置”）：是才给位置依据（W10 §9 第 7 条）。 */
  private wantsPosition(task: string | undefined): boolean {
    if (task === undefined) return false;
    const s = this.briefs.get(task);
    return /位置/.test(`${s?.description ?? ''}${s?.brief ?? ''}`);
  }

  // ───────────── 摊文件 ─────────────

  private async layoutAll(loopId: string): Promise<void> {
    const dir = this.dir(loopId);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const latest = latestVersions(await this.hub.records(loopId));
    for (const id of latest.keys()) await this.layout(loopId, id);
    await this.writeIndex(loopId);
  }

  /** 把一个组件的当前版摊进 `组件/<编号>/`：清空，每块一个文件，加一份目录。 */
  private async layout(loopId: string, component: string): Promise<void> {
    const records = await this.hub.records(loopId);
    const v = latestVersions(records).get(component);
    const dir = join(this.dir(loopId), component);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    if (v === undefined) return;
    const blocks = await this.o.screens.componentBlocks(loopId, v.manifest);
    for (const b of blocks) await writeFile(join(dir, `${b.id}.html`), b.html, 'utf8');
    await writeFile(
      join(dir, CATALOG),
      [
        `# 组件 ${component}：${v.pointer}`,
        '',
        '每行一块，顺序就是组件里的顺序：`文件 | 一句话`。',
        '加一块：新建一个文件（名字随意，如 `新-推导.html`），在这里按位置加一行。去掉一块：把那行删掉。',
        '',
        ...blocks.map((b) => `${b.id}.html | ${b.summary}`),
        '',
      ].join('\n'),
      'utf8',
    );
    this.laid.set(`${loopId}/${component}`, {
      manifest: v.manifest,
      m: await this.o.store.manifest<ComponentManifest>(loopId, v.manifest),
      line: records.length,
    });
  }

  private async writeIndex(loopId: string): Promise<void> {
    const latest = latestVersions(await this.hub.records(loopId));
    await writeFile(
      join(this.dir(loopId), CATALOG),
      [
        '# 组件目录',
        '',
        '每行一个已有组件：`文件夹 | 一句话`。新做一个就新建一个文件夹（名字随意）。',
        '',
        ...(latest.size > 0
          ? [...latest].map(([id, v]) => `${id}/ | ${v.pointer}`)
          : ['（还没有组件）']),
        '',
      ].join('\n'),
      'utf8',
    );
  }

  // ───────────── 交 ─────────────

  /** 子代理交组件的工具（只给子代理；主模型调会被拦下）。task = 框架另开的那次的编号（SDK 派的不填，按写入记录认）。 */
  submitTool(loopId: string, task?: string): ToolSpec {
    return {
      name: 'submit_component',
      description:
        '做完或改完一个组件交一次：框架按那个文件夹里 目录.md 的顺序把各块拼成组件的新一版，查过、在学习者浏览器里试跑过再换上。交不过会说哪里不对，改了再交。',
      input: { folder: z.string().describe('组件的文件夹名（`组件/` 下面那一层）') },
      run: (a) => this.submit(loopId, String(a.folder), task),
    };
  }

  private async submit(loopId: string, rawFolder: string, task?: string): Promise<ToolResult> {
    await this.o.assertOpen(loopId);
    const folder = rawFolder.replace(/^组件\//, '').replace(/\/+$/, '');
    if (folder === '' || folder.includes('/') || folder === '..' || folder === '.') {
      return err('folder 只写 `组件/` 下面那一层的文件夹名。');
    }
    const dir = join(this.dir(loopId), folder);
    let catalogText: string;
    try {
      catalogText = await readFile(join(dir, CATALOG), 'utf8');
    } catch {
      return err(
        `${COMPONENT_DIR}/${folder}/${CATALOG} 不存在；文件夹里要有一份目录（每行 \`文件 | 一句话\`）。`,
      );
    }
    const existing = COMPONENT_ID.test(folder) ? this.laid.get(`${loopId}/${folder}`) : undefined;
    const stale = await this.staleProblem(loopId, folder, existing);
    if (stale !== undefined) return err(stale);

    const entries = parseCatalog(catalogText);
    const onDisk = new Set((await readdir(dir)).filter((f) => f.endsWith('.html')));
    const problems: string[] = [];
    const seen = new Set<string>();
    const texts = new Map<string, string>();
    for (const e of entries) {
      if (seen.has(e.file)) problems.push(`${e.file} 在目录里出现了两次`);
      seen.add(e.file);
      if (!onDisk.has(e.file)) {
        problems.push(`目录里有 ${e.file}，但没有这个文件`);
        continue;
      }
      const text = await readFile(join(dir, e.file), 'utf8');
      if (text.trim() === '') problems.push(`${e.file} 是空的`);
      if (Buffer.byteLength(text, 'utf8') > MAX_BLOCK_BYTES) {
        problems.push(`${e.file} 太大（一块最多 ${String(MAX_BLOCK_BYTES / 1024)} KB）`);
      }
      if (e.summary === '') problems.push(`${e.file} 在目录里缺一句话`);
      texts.set(e.file, text);
    }
    if (entries.length === 0) problems.push('目录里一块都没有');
    if (problems.length > 0) return err(`没交上：${problems.join('；')}。改了再交。`);

    const records = await this.hub.records(loopId);
    // 没看过不许改（页面子代理.md「怎么改」）：改了或去掉的旧块，摊好之后得读过
    if (existing !== undefined) {
      const old = new Map(existing.m.blocks.map((b) => [b.id, b.hash]));
      const touched = [
        ...entries.flatMap((e) => {
          const id = e.file.slice(0, -'.html'.length);
          const h = old.get(id);
          return h !== undefined && h !== fingerprint(texts.get(e.file) ?? '') ? [e.file] : [];
        }),
        ...existing.m.blocks
          .filter((b) => !entries.some((e) => e.file === `${b.id}.html`))
          .map((b) => `${b.id}.html`),
      ];
      const read = readAfter(records, existing.line);
      const unread = touched.filter((f) => !read.some((p) => p.endsWith(`${folder}/${f}`)));
      if (unread.length > 0) {
        await this.layout(loopId, folder);
        return err(
          `改了没读过的块：${unread.join('、')}。这次改动不上；${COMPONENT_DIR}/${folder}/ 已按现在的样子重摊，先读要改的块再改。`,
        );
      }
    }

    // 编号由框架发：组件 c1、c2……，块 b1、b2……（接着这个组件用过的最大号往下）
    const latest = latestVersions(records);
    const component =
      existing !== undefined ? folder : `c${String(nextNumber([...latest.keys()]))}`;
    const known = new Set(existing?.m.blocks.map((b) => b.id));
    let lastBlock = nextNumber(existing?.m.blocks.map((b) => b.id) ?? []) - 1;
    const blocks = entries.map((e) => {
      const text = texts.get(e.file) ?? '';
      const own = e.file.slice(0, -'.html'.length);
      let id = own;
      if (!known.has(own)) {
        lastBlock += 1;
        id = `b${String(lastBlock)}`;
      }
      return { id, hash: fingerprint(text), summary: e.summary, text };
    });
    const m: ComponentManifest = {
      blocks: blocks.map(({ id, hash, summary }) => ({ id, hash, summary })),
    };
    if (existing !== undefined && JSON.stringify(m) === JSON.stringify(existing.m)) {
      return err('组件没有变化；要改就改了再交，不改就用一句话交回。');
    }

    // 试跑：学习者浏览器里一个看不见的小窗；报错就退给子代理，学习者看到的一直是上一版
    const trial = await this.o.screens.trial(
      loopId,
      blocks.map((b) => ({ id: b.id, html: b.text })),
    );
    if (trial !== undefined && !trial.ok) {
      return err(
        `试跑报错：${trial.error ?? '（没说是什么错）'}。学习者看到的还是上一版；改了再交。`,
      );
    }
    const staleNow = await this.staleProblem(loopId, folder, existing);
    if (staleNow !== undefined) return err(staleNow);
    for (const b of blocks) await this.o.store.putBlock(loopId, b.text);
    const manifest = await this.o.store.putManifest(loopId, m);
    const who = task ?? writerOf(await this.hub.records(loopId), folder);
    const prev = latest.get(component);
    await this.hub.record(loopId, {
      type: 'component_version',
      at: this.o.iso(),
      component,
      version: (prev?.version ?? 0) + 1,
      manifest,
      pointer: prev?.pointer ?? this.pointerFor(who, entries[0]?.summary),
      ...(who !== undefined ? { task: who } : {}),
      trialed: trial !== undefined,
    });
    // 照新的一版重摊（新组件换成框架发的编号）
    if (folder !== component) await rm(dir, { recursive: true, force: true });
    await this.layout(loopId, component);
    await this.writeIndex(loopId);
    return {
      text: `成了，已经换上${trial === undefined ? '（学习者这会儿没开着学习页，没试跑）' : ''}。这个组件现在在 ${COMPONENT_DIR}/${component}/。用一句话交回做成了什么就停下（不提文件名）。`,
    };
  }

  /** 新组件的一句话：取派这件活时主模型的说明；没有就用第一块的一句话。 */
  private pointerFor(task: string | undefined, first: string | undefined): string {
    const d = task !== undefined ? this.briefs.get(task)?.description : undefined;
    return d ?? first ?? '一个组件';
  }

  /** 摊进目录之后这个组件又换了一版：这次改动不上，重摊。 */
  private async staleProblem(
    loopId: string,
    folder: string,
    existing: Laid | undefined,
  ): Promise<string | undefined> {
    if (existing === undefined) return undefined;
    const now = latestVersions(await this.hub.records(loopId)).get(folder);
    if (now?.manifest === existing.manifest) return undefined;
    await this.layout(loopId, folder);
    return `你改的时候这个组件被改过了，这次改动不上；${COMPONENT_DIR}/${folder}/ 已按现在的样子重摊，要改就重读了再改。`;
  }

  // ───────────── 学习者动了组件：框架另开一次子代理 ─────────────

  /**
   * 回报先回做这个组件的一方（会话/学习对话.md §11.3「观测与回报」）：另开一次子代理，带上组件当前版
   * （摊在 `组件/`）、当初的交代、学习者这次的操作。它按交代自己处理（改了就交）或往上报（report_to_main）；
   * 改了组件没往上报的，改完报一句，跟学习者下次说话一起带上。
   */
  async onAction(loopId: string, component: string, text: string, awaited: boolean): Promise<void> {
    const records = await this.hub.records(loopId);
    const v = latestVersions(records).get(component);
    if (v === undefined) return;
    // 服务重启后主对话还没开时，交代只在正本里：先补进来
    for (const r of records) {
      if (r.record.type === 'subagent_started') this.briefs.set(r.record.taskId, r.record);
    }
    const made = records.find(
      (r) => r.record.type === 'component_version' && r.record.component === component,
    )?.record;
    const origin =
      made?.type === 'component_version' && made.task !== undefined
        ? this.briefs.get(made.task)
        : undefined;
    await this.layout(loopId, component);
    await this.writeIndex(loopId);
    const task = `maker-${randomBytes(4).toString('hex')}`;
    const sb = await this.o.sandbox(loopId);
    const said = { up: false };
    const report: ToolSpec = {
      name: 'report_to_main',
      description: '往上报给主对话一句话（按交代要报的才报）。',
      input: {
        text: z.string().describe('一句看得懂的话，说学习者做了什么、你怎么处理的'),
        awaited: z.boolean().optional().describe('要主对话马上回应时为 true'),
      },
      run: async (a) => {
        said.up = true;
        const wait = a.awaited === true || (awaited && a.awaited !== false);
        await this.reportUp(loopId, component, task, String(a.text), wait, false);
        return { text: '报上去了。' };
      },
    };
    const conv = this.hub.adapter.open({
      systemPrompt: `${this.o.prompt}\n\n组件目录（完整路径）：${this.dir(loopId)}\n\n这一次是框架叫你：学习者动了你做的组件。按当初的交代处理——要改组件就改了用 submit_component 交；交代说要报给主对话的，调 report_to_main 报一句；交代里没说要处理的就什么都不做。最后用一句话说你做了什么。`,
      tools: [this.submitTool(loopId, task), report],
      sandbox: {
        // 工作区就是 `组件/`：它只写得到组件（记录/读写权限.md 页面子代理行）
        workdir: this.dir(loopId),
        readOnly: [
          ...sb.readOnly.filter((e) => materialPaths(sb).includes(e.path)),
          ...(this.wantsPosition(made?.type === 'component_version' ? made.task : undefined)
            ? sb.readOnly.filter((e) => positionPaths(sb).includes(e.path))
            : []),
        ],
        network: false,
        commands: false,
      },
      session: { id: loopId, kind: 'loop' },
      profile: 'subagent',
      ephemeral: true,
    });
    let last = '';
    try {
      for await (const e of conv.send({
        role: 'program',
        plain: true,
        text: [
          `学习者动了你做的组件「${v.pointer}」（在 ${COMPONENT_DIR}/${component}/）：${text}`,
          awaited ? '（这个操作在等回应。）' : '（这个操作不等回应。）',
          '',
          '当初主对话交代你的：',
          origin?.brief ?? origin?.description ?? '（没找到当初的交代）',
        ].join('\n'),
      })) {
        if (e.kind === 'assistant_text') last = e.text;
        if (e.kind === 'sandbox_action') {
          await this.hub.record(loopId, {
            type: 'sandbox_action',
            at: this.o.iso(),
            actor: 'model',
            agent: SUBAGENT,
            task,
            op: e.action.op,
            // 它的工作区是 `组件/`：路径补成学习对话工作区里的样子，和 SDK 派的子代理一致
            ...(e.action.path !== undefined
              ? {
                  path: /^(只读\/|\/)/.test(e.action.path)
                    ? e.action.path
                    : `${COMPONENT_DIR}/${e.action.path}`,
                }
              : {}),
            summary: e.action.summary,
            ok: e.action.ok,
            ...(e.action.content !== undefined ? { content: e.action.content } : {}),
          });
        }
        if (e.kind === 'turn_error') throw new Error(e.reason);
      }
    } finally {
      await conv.close();
    }
    const changed = (await this.hub.records(loopId)).some(
      (r) => r.record.type === 'component_version' && r.record.task === task,
    );
    // 自己改了组件、没往上报的：改完报一句，跟学习者下次说话一起带上（§11.3「子代理自己改了组件」）
    if (changed && !said.up) {
      await this.reportUp(
        loopId,
        component,
        task,
        last !== '' ? last : '改了这个组件',
        false,
        true,
      );
    }
  }

  private async reportUp(
    loopId: string,
    component: string,
    task: string,
    text: string,
    awaited: boolean,
    changed: boolean,
  ): Promise<void> {
    const line = await this.hub.record(loopId, {
      type: 'component_report',
      at: this.o.iso(),
      component,
      task,
      text,
      awaited,
      changed,
    });
    if (awaited) {
      // 等回应的当场交给主模型：普通的子代理交回（会话/学习对话.md §3 身份）
      const pointer = await this.o.screens.pointerOf(loopId, component);
      await this.hub.send(
        loopId,
        { role: 'program', text: `子代理交回（「${pointer}」）：${text}` },
        { recorded: line },
      );
    }
  }
}

// ───────────── 纯函数 ─────────────

/** 每个组件的最新一版。 */
export function latestVersions(
  records: NumberedRecord[],
): Map<string, { manifest: string; version: number; pointer: string }> {
  const out = new Map<string, { manifest: string; version: number; pointer: string }>();
  for (const { record: r } of records) {
    if (r.type === 'component_version') out.set(r.component, r);
  }
  return out;
}

/** 派出去还没交回的子代理（taskId）。 */
export function openTasks(records: NumberedRecord[]): string[] {
  const open = new Set<string>();
  for (const { record: r } of records) {
    if (r.type === 'subagent_started' && r.agent === SUBAGENT) open.add(r.taskId);
    if (r.type === 'subagent_result') open.delete(r.taskId);
  }
  return [...open];
}

/** 摊好之后子代理读过的文件（虚拟路径）。 */
function readAfter(records: NumberedRecord[], line: number): string[] {
  return records.flatMap(({ line: l, record: r }) =>
    l > line &&
    r.type === 'sandbox_action' &&
    r.agent !== undefined &&
    r.op === 'read' &&
    r.ok &&
    r.path !== undefined
      ? [r.path]
      : [],
  );
}

/** 最后往这个文件夹里写东西的那件活（SDK 派的子代理，写入记录带 task）。 */
function writerOf(records: NumberedRecord[], folder: string): string | undefined {
  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i]?.record;
    if (
      r?.type === 'sandbox_action' &&
      r.op === 'write' &&
      r.task !== undefined &&
      (r.path ?? '').includes(`${COMPONENT_DIR}/${folder}/`)
    ) {
      return r.task;
    }
  }
  return undefined;
}

function nextNumber(ids: string[]): number {
  return Math.max(0, ...ids.map((x) => Number(/\d+$/.exec(x)?.[0] ?? 0))) + 1;
}

/** 学习对话沙盒里的资料（子代理一直能读，只读）。 */
function materialPaths(sb: SandboxSpec): string[] {
  return sb.readOnly.filter((e) => e.name.startsWith('资料')).map((e) => e.path);
}

/** 学习位置的依据（只在派它画学习位置图时给）。 */
function positionPaths(sb: SandboxSpec): string[] {
  return sb.readOnly.filter((e) => e.name === '学习位置.md').map((e) => e.path);
}

/** 目录里的一行：`文件.html | 一句话`。 */
export function parseCatalog(text: string): { file: string; summary: string }[] {
  return text.split('\n').flatMap((raw) => {
    const m = /^\s*[-*]?\s*`?([^|`\s][^|`]*?\.html)`?\s*\|\s*(.*?)\s*$/.exec(raw);
    if (m === null) return [];
    const [, file = '', summary = ''] = m;
    if (file.includes('/')) return [];
    return [{ file: file.trim(), summary: summary.trim() }];
  });
}

function err(text: string): ToolResult {
  return { text, isError: true };
}
