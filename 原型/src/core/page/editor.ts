// 页面编辑员（`docs/设计/会话/页面编辑员.md`）：学习对话说改什么，它决定怎么写代码。
// 一次学习一个，第一次要改页面时开，保留自己的上下文到学习结束。框架把页面按块摊成文件放进它的沙盒
// （每块一个文件 + 一份目录），它用模型自带的读和替换改，改完调 submit_page 交一次；框架查版本、
// 查有没有改没读过的块、发新块编号，在学习者浏览器里试跑过才换上。结果作为程序事实回到学习对话。
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import type { PageBlockRef } from '../../shared/page.ts';
import type { Hub } from '../hub.ts';
import type { SandboxSpec, ToolResult, ToolSpec } from '../model/port.ts';
import { editResultHead, type EditorsView, type LivePages } from './live-page.ts';
import { fingerprint, MAX_BLOCK_BYTES, type PageStore } from './store.ts';

/** 编辑员沙盒里放页面的子目录、目录文件名。 */
const PAGE_DIR = '页面';
const CATALOG = '目录.md';
/** 读过目录这件事在“读过哪些”里的键。 */
const CATALOG_KEY = '目录';
/** 一件改动最多交几次（框架退回后改了再交）。 */
const MAX_SUBMITS = 4;
/** 编辑员最后那句话最多带多少字回学习对话。 */
const WORDS_MAX = 300;

export interface EditRequest {
  /** 学习对话依据的页面版本。 */
  version: number;
  /** 用教学的话说改什么、改完应该看到什么。 */
  change: string;
  /** 这次的问题有多开放、编辑员能动多少。 */
  latitude: string;
}

interface Task {
  loopId: string;
  base: number;
  lastBlock: number;
  /** 摊进沙盒时每块的样子（按编号）与目录原文。 */
  layout: Map<string, PageBlockRef & { text: string }>;
  catalog: string;
  /** 交给编辑员的那条程序事实在编辑员正本里的行（之后它说的最后一句带回去）。 */
  line: number;
  submits: number;
  published?: number;
  problem?: string;
}

export interface PageEditorsDeps {
  hub: () => Hub;
  pages: LivePages;
  store: PageStore;
  /** 数据目录；编辑员的沙盒在 <数据>/sandbox/<编辑员会话 id>/。 */
  dataDir: string;
  assertOpen: (loopId: string) => Promise<void>;
  /** 学习对话结束了没有（结束了就不再把结果推回去）。 */
  ended: (loopId: string) => Promise<boolean>;
  background: (what: string, fn: () => Promise<unknown>) => void;
}

export class PageEditors implements EditorsView {
  private readonly tasks = new Map<string, Task>();
  private readonly busyLoops = new Set<string>();
  /** 编辑员读过哪些块：编号（目录 = CATALOG_KEY）→ 读的时候那块的内容指纹。只在内存里，重启后要重读。 */
  private readonly reads = new Map<string, Map<string, string>>();

  constructor(private readonly o: PageEditorsDeps) {}

  /** 接上 Hub 后订阅编辑员的读动作（读过才能改，由框架从沙盒动作里知道）。 */
  attach(hub: Hub): void {
    hub.subscribe((e) => {
      if (e.type !== 'record' || e.record.type !== 'sandbox_action') return;
      const task = this.tasks.get(e.sessionId);
      const a = e.record;
      if (task === undefined || a.op !== 'read' || !a.ok || a.path === undefined) return;
      const key = keyOf(a.path);
      if (key === undefined) return;
      const hash = key === CATALOG_KEY ? fingerprint(task.catalog) : task.layout.get(key)?.hash;
      if (hash !== undefined) this.readsOf(e.sessionId).set(key, hash);
    });
  }

  private get hub(): Hub {
    return this.o.hub();
  }

  private readsOf(editorId: string): Map<string, string> {
    let m = this.reads.get(editorId);
    if (m === undefined) {
      m = new Map();
      this.reads.set(editorId, m);
    }
    return m;
  }

  editorOf(loopId: string): string | undefined {
    return this.hub.listSessions().find((s) => s.kind === 'editor' && s.parent === loopId)
      ?.sessionId;
  }

  busy(loopId: string): boolean {
    return this.busyLoops.has(loopId);
  }

  forgetReads(editorId: string): void {
    this.reads.delete(editorId);
  }

  private workdir(editorId: string): string {
    return join(this.o.dataDir, 'sandbox', editorId, '工作区');
  }

  /** 编辑员的沙盒：工作区里只有页面的文件；不给只读区、不联网、不给跑命令。 */
  async sandbox(editorId: string): Promise<SandboxSpec> {
    const workdir = this.workdir(editorId);
    await mkdir(join(workdir, PAGE_DIR), { recursive: true });
    return { workdir, readOnly: [], network: false, commands: false };
  }

  // ───────────── 学习对话 → 编辑员 ─────────────

  /** 学习对话的 edit_page：查版本，交给编辑员在后台改；结果作为程序事实回来。 */
  async request(loopId: string, req: EditRequest): Promise<ToolResult> {
    await this.o.assertOpen(loopId);
    if (this.busyLoops.has(loopId)) {
      return { text: '编辑员还在改上一件；等它交回再说下一件。', isError: true };
    }
    const now = await this.o.pages.version(loopId);
    if (req.version !== now) {
      return {
        text: `页面已经是第 ${String(now)} 版（你依据的是第 ${String(req.version)} 版）：${await this.o.pages.since(loopId, req.version)}。看一眼 只读/页面.md，按第 ${String(now)} 版重新说。`,
        isError: true,
      };
    }
    this.busyLoops.add(loopId);
    this.o.background('页面编辑员', async () => {
      try {
        await this.run(loopId, req);
      } finally {
        this.busyLoops.delete(loopId);
      }
    });
    return {
      text: `已交给页面编辑员（基于第 ${String(now)} 版）。改好或没改成都会作为程序事实回来；这期间学习者看到的还是第 ${String(now)} 版。`,
    };
  }

  private async run(loopId: string, req: EditRequest): Promise<void> {
    const editorId =
      this.editorOf(loopId) ??
      (await this.hub.createSession('editor', { title: '页面编辑员', parent: loopId })).sessionId;
    const cur = await this.o.pages.now(loopId);
    if ((cur?.version ?? 0) !== req.version) {
      await this.report(
        loopId,
        `${editResultHead(undefined)}交给编辑员之前页面又变了（现在第 ${String(cur?.version ?? 0)} 版），这件没改。`,
      );
      return;
    }
    const { layout, catalog } = await this.layout(editorId, loopId);
    // 编辑员记得的只算内容没变的块
    const reads = this.readsOf(editorId);
    for (const [k, h] of reads) {
      const now = k === CATALOG_KEY ? fingerprint(catalog) : layout.get(k)?.hash;
      if (now !== h) reads.delete(k);
    }
    const notes = await this.notesFor(loopId, editorId);
    // 先登记这件活，编辑员一开读就记得上
    const task: Task = {
      loopId,
      base: req.version,
      lastBlock: cur?.lastBlock ?? 0,
      layout,
      catalog,
      line: 0,
      submits: 0,
    };
    this.tasks.set(editorId, task);
    const { line } = await this.hub.send(editorId, {
      role: 'program',
      text: [
        `学习对话要改页面（基于第 ${String(req.version)} 版）。`,
        `改什么：${req.change}`,
        `留多大余地：${req.latitude}`,
        '',
        `页面文件在 ${PAGE_DIR}/：${CATALOG} + 每块一个文件。${reads.size > 0 ? `你读过、内容没变的：${[...reads.keys()].map((k) => (k === CATALOG_KEY ? CATALOG : `${k}.html`)).join('、')}；` : ''}别的改之前先读。`,
        ...notes,
        '改完调用 submit_page 交一次；交不过会告诉你哪里不对，改了再交。最后用一句话说结果。',
      ].join('\n'),
    });
    task.line = line;
    try {
      await this.hub.idle(editorId);
    } finally {
      this.tasks.delete(editorId);
      await this.finish(editorId, task);
    }
  }

  /** 编辑员这一件做完：一句结果作为程序事实回到学习对话（经收件箱追加，不回头改前面的）。 */
  private async finish(editorId: string, task: Task): Promise<void> {
    const words = (await this.hub.records(editorId))
      .filter((r) => r.line > task.line && r.record.type === 'assistant_message')
      .map((r) => (r.record.type === 'assistant_message' ? r.record.text : ''))
      .at(-1);
    const said = words !== undefined ? `\n编辑员说：${words.slice(0, WORDS_MAX)}` : '';
    if (task.published !== undefined) {
      await this.report(
        task.loopId,
        `${editResultHead(task.published)}改好了，学习者现在看到的是第 ${String(task.published)} 版。\n${await this.o.pages.catalog(task.loopId)}${said}`,
      );
      return;
    }
    await this.report(
      task.loopId,
      `${editResultHead(undefined)}${task.problem ?? '编辑员没有交改动'}；学习者看到的还是第 ${String(task.base)} 版。${said}`,
    );
  }

  private async report(loopId: string, text: string): Promise<void> {
    if (await this.o.ended(loopId)) return;
    await this.hub.send(loopId, { role: 'program', text });
  }

  /** 上次交给编辑员之后的退回教训与学习者碰到的报错：都要带给编辑员。 */
  private async notesFor(loopId: string, editorId: string): Promise<string[]> {
    const last = (await this.hub.records(editorId))
      .filter((r) => r.record.type === 'program_fact')
      .at(-1)?.record.at;
    const loopRecs = (await this.hub.records(loopId)).filter(
      (r) => last === undefined || r.record.at > last,
    );
    return loopRecs.flatMap(({ record: r }) =>
      r.type === 'page_lesson'
        ? [`（页面被学习者退回过，教训：${r.text}）`]
        : r.type === 'page_error'
          ? [`（学习者那边第 ${String(r.version)} 版运行时报错：${r.message.slice(0, 500)}）`]
          : [],
    );
  }

  /** 把现在这一版摊进沙盒：清空 页面/，每块一个文件，加一份目录。 */
  private async layout(
    editorId: string,
    loopId: string,
  ): Promise<{ layout: Map<string, PageBlockRef & { text: string }>; catalog: string }> {
    const dir = join(this.workdir(editorId), PAGE_DIR);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const cur = await this.o.pages.now(loopId);
    const blocks = cur === undefined ? [] : await this.o.pages.content(loopId, cur.version);
    const layout = new Map<string, PageBlockRef & { text: string }>();
    for (const b of blocks) {
      const ref = cur?.m.blocks.find((x) => x.id === b.id);
      if (ref === undefined) continue;
      layout.set(b.id, { ...ref, text: b.html });
      await writeFile(join(dir, `${b.id}.html`), b.html, 'utf8');
    }
    const catalog = [
      `# 页面目录（第 ${String(cur?.version ?? 0)} 版）`,
      '',
      '每行一块，顺序就是页面上的顺序：`文件 | 一句话`（学习对话看的目录就是这一句）。',
      '加一块：新建一个文件（名字随意，如 `新-推导.html`），在这里按位置加一行；新块的编号由框架发。',
      '去掉一块：把那行从这里删掉。',
      '',
      ...blocks.map((b) => `${b.id}.html | ${b.summary}`),
      '',
    ].join('\n');
    await writeFile(join(dir, CATALOG), catalog, 'utf8');
    return { layout, catalog };
  }

  // ───────────── 编辑员交 ─────────────

  submitTool(editorId: string): ToolSpec {
    return {
      name: 'submit_page',
      description:
        '改完交一次：框架按 页面/目录.md 的顺序把各块拼成新的一版，查版本、查有没有改没读过的块，在学习者浏览器里试跑过再换上。交不过会说哪里不对，改了再交。',
      input: { note: z.string().optional().describe('可不填') },
      run: () => this.submit(editorId),
    };
  }

  private async submit(editorId: string): Promise<ToolResult> {
    const task = this.tasks.get(editorId);
    if (task === undefined) return err('现在没有要交的改动。');
    if (task.published !== undefined) return err('这次已经交过了；用一句话交回结果就停下。');
    task.submits += 1;
    if (task.submits > MAX_SUBMITS) {
      task.problem ??= `交了 ${String(MAX_SUBMITS)} 次都没过`;
      return err(`已经交了 ${String(MAX_SUBMITS)} 次都没过；停下，用一句话说哪里没改成。`);
    }
    const stale = await this.staleProblem(task);
    if (stale !== undefined) return err(stale);
    const dir = join(this.workdir(editorId), PAGE_DIR);
    let catalogText: string;
    try {
      catalogText = await readFile(join(dir, CATALOG), 'utf8');
    } catch {
      return err(`${PAGE_DIR}/${CATALOG} 不见了；按原来的格式重写一份再交。`);
    }
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

    // 没读过不许改（会话/页面编辑员.md「怎么改」）
    const reads = this.readsOf(editorId);
    const unread: string[] = [];
    if (catalogText !== task.catalog && reads.get(CATALOG_KEY) !== fingerprint(task.catalog)) {
      unread.push(CATALOG);
    }
    for (const e of entries) {
      const id = e.file.slice(0, -'.html'.length);
      const old = task.layout.get(id);
      if (old !== undefined && texts.get(e.file) !== old.text && reads.get(id) !== old.hash) {
        unread.push(e.file);
      }
    }
    if (unread.length > 0) {
      return err(
        `没读过就改了：${unread.join('、')}。先用读工具读一遍（你的改动还在文件里），确认后再交。`,
      );
    }

    let lastBlock = task.lastBlock;
    const renamed: string[] = [];
    const blocks = entries.map((e) => {
      const text = texts.get(e.file) ?? '';
      const own = e.file.slice(0, -'.html'.length);
      let id = own;
      if (!task.layout.has(own)) {
        lastBlock += 1;
        id = `b${String(lastBlock)}`;
        renamed.push(`${e.file} → ${id}`);
      }
      return { id, hash: fingerprint(text), summary: e.summary, text };
    });
    const cur = await this.o.pages.now(task.loopId);
    const same =
      cur !== undefined &&
      cur.m.blocks.length === blocks.length &&
      cur.m.blocks.every(
        (b, i) =>
          b.id === blocks[i]?.id && b.hash === blocks[i].hash && b.summary === blocks[i].summary,
      );
    if (same) return err('页面没有变化；要改就改了再交，不改就用一句话交回。');

    // 试跑：学习者浏览器里一个看不见的小窗；报错就退回给编辑员，学习者看到的一直是上一版
    const trial = await this.o.pages.trial(
      task.loopId,
      blocks.map((b) => ({ id: b.id, html: b.text })),
    );
    if (trial !== undefined && !trial.ok) {
      task.problem = `试跑报错：${trial.error ?? '（没说是什么错）'}`;
      return err(
        `试跑报错：${trial.error ?? '（没说是什么错）'}。学习者看到的还是第 ${String(task.base)} 版；改了再交。`,
      );
    }
    const staleNow = await this.staleProblem(task);
    if (staleNow !== undefined) return err(staleNow);
    for (const b of blocks) await this.o.store.putBlock(task.loopId, b.text);
    const version = await this.o.pages.publish(task.loopId, {
      m: { blocks: blocks.map(({ id, hash, summary }) => ({ id, hash, summary })) },
      by: 'editor',
      trialed: trial !== undefined,
      lastBlock,
    });
    task.published = version;
    delete task.problem;
    // 编辑员自己写的块它知道是什么样；没动、没读过的照旧算没读过
    for (const b of blocks) {
      const old = task.layout.get(b.id);
      if (old === undefined || old.hash !== b.hash) reads.set(b.id, b.hash);
    }
    reads.delete(CATALOG_KEY);
    return {
      text: `成了：第 ${String(version)} 版已经上了页面${renamed.length > 0 ? `（新块编号：${renamed.join('，')}）` : ''}${trial === undefined ? '（学习者这会儿没开着页面，没试跑；以后碰到报错会告诉你）' : ''}。用一句话交回结果就停下。`,
    };
  }

  /** 编辑员改的时候页面变了（学习者动了、退回了）：这次改动一律不上。 */
  private async staleProblem(task: Task): Promise<string | undefined> {
    const now = await this.o.pages.version(task.loopId);
    if (now === task.base) return undefined;
    task.problem = `编辑员改的时候页面变了（现在第 ${String(now)} 版：${await this.o.pages.since(task.loopId, task.base)}），这次改动没上`;
    return `你改的时候页面变了（现在第 ${String(now)} 版），这次改动不上；停下，用一句话交回。`;
  }
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

/** 沙盒动作的路径 → 读的是哪块（`页面/b3.html` → b3；`页面/目录.md` → 目录）。 */
function keyOf(path: string): string | undefined {
  const p = path.replace(/^\.\//, '');
  if (p === `${PAGE_DIR}/${CATALOG}`) return CATALOG_KEY;
  const m = new RegExp(`^${PAGE_DIR}/(b\\d+)\\.html$`).exec(p);
  return m?.[1];
}

function err(text: string): ToolResult {
  return { text, isError: true };
}
