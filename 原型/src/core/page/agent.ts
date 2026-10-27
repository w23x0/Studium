// 页面子代理（`docs/设计/会话/页面子代理.md`）：主模型用 Agent SDK 自带的派子代理派它，它在后台改页面、
// 交回一句做了什么。框架只做外围：它能写哪些文件（学习对话工作区里的 `页面/`）、交时检查、在学习者
// 浏览器里试跑。页面按块摊成文件：每块一个 `<编号>.html` + 一份 `目录.md`；每上一版就照新的一版重摊。
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import type { PageManifest } from '../../shared/page.ts';
import type { Hub } from '../hub.ts';
import type { SubagentSpec, ToolResult, ToolSpec } from '../model/port.ts';
import { openTasks, PAGE_AGENT, type LivePages } from './live-page.ts';
import { fingerprint, MAX_BLOCK_BYTES, type PageStore } from './store.ts';

/** 工作区里放页面的子目录、目录文件名。 */
export const PAGE_DIR = '页面';
const CATALOG = '目录.md';

export interface PageAgentDeps {
  hub: () => Hub;
  pages: LivePages;
  store: PageStore;
  /** 学习对话的工作区（页面目录在它下面）。 */
  workdir: (loopId: string) => string;
  /** 学习对话还开着；不是就抛错。 */
  assertOpen: (loopId: string) => Promise<void>;
  /** 子代理的系统提示。 */
  prompt: string;
}

export class PageAgent {
  /** 每次学习摊进目录时依据的那张清单（重启后按正本重摊）。 */
  private readonly base = new Map<string, PageManifest>();
  /** 子代理还在做的（派出去、没交回）：在内存里跟着正本走。 */
  private readonly running = new Set<string>();

  constructor(private readonly o: PageAgentDeps) {}

  /** 接上 Hub 后跟着正本知道子代理在不在做（拦第二个同时派出的）。 */
  attach(hub: Hub): void {
    hub.subscribe((e) => {
      if (e.type !== 'record') return;
      const r = e.record;
      if (r.type === 'subagent_started' && r.agent === PAGE_AGENT) this.running.add(e.sessionId);
      if (r.type === 'subagent_result' && r.agent === PAGE_AGENT) this.running.delete(e.sessionId);
    });
  }

  dir(loopId: string): string {
    return join(this.o.workdir(loopId), PAGE_DIR);
  }

  /** 开学习对话时：把现在这一版摊进目录，返回派子代理的规格。 */
  async spec(loopId: string): Promise<SubagentSpec> {
    // 上次没交回就断了的（服务重启，后台子代理跟着没了）：记一笔交回，不然一直算“在改”
    // （社区踩过的坑：完成通知绑在进程上，重启后没人收尾，`docs/调研/子代理与沙盒-社区.md` §1）
    const records = await this.o.hub().records(loopId);
    for (const t of openTasks(records)) {
      await this.o.hub().record(loopId, {
        type: 'subagent_result',
        at: new Date().toISOString(),
        agent: PAGE_AGENT,
        taskId: t,
        status: 'interrupted',
        text: '没做完就断了（服务重启），页面没改',
      });
    }
    this.running.delete(loopId);
    await this.layout(loopId);
    return {
      name: PAGE_AGENT,
      description:
        '改活页面：页面上的文字你写好交给它，它定放哪、长什么样、怎么交互（函数图、可拖的演示、代码等也由它做）。它在后台改，改完交回一句做了什么。',
      // 子代理不一定知道工作区在哪：页面目录给完整路径
      prompt: `${this.o.prompt}\n\n这次页面的目录（完整路径）：${this.dir(loopId)}`,
      builtins: ['Read', 'Edit', 'Write', 'Glob'],
      ownTools: ['submit_page'],
      writable: this.dir(loopId),
      busy: () => this.running.has(loopId),
    };
  }

  /** 把现在这一版摊进 `页面/`：清空，每块一个文件，加一份目录。 */
  private async layout(loopId: string): Promise<void> {
    const dir = this.dir(loopId);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const cur = await this.o.pages.now(loopId);
    const blocks = cur === undefined ? [] : await this.o.pages.content(loopId, cur.version);
    for (const b of blocks) await writeFile(join(dir, `${b.id}.html`), b.html, 'utf8');
    await writeFile(
      join(dir, CATALOG),
      [
        '# 页面目录',
        '',
        '每行一块，顺序就是页面上的顺序：`文件 | 一句话`。',
        '加一块：新建一个文件（名字随意，如 `新-推导.html`），在这里按位置加一行。去掉一块：把那行删掉。',
        '',
        ...(blocks.length > 0
          ? blocks.map((b) => `${b.id}.html | ${b.summary}`)
          : ['（页面还是空的）']),
        '',
      ].join('\n'),
      'utf8',
    );
    this.base.set(loopId, cur?.m ?? { blocks: [] });
  }

  /** 子代理交改动的工具（只给子代理；主模型调会被拦下）。 */
  submitTool(loopId: string): ToolSpec {
    return {
      name: 'submit_page',
      description:
        '改完交一次：框架按 页面/目录.md 的顺序把各块拼成新的一版，在学习者浏览器里试跑过再换上。交不过会说哪里不对，改了再交。',
      input: { note: z.string().optional().describe('可不填') },
      run: () => this.submit(loopId),
    };
  }

  private async submit(loopId: string): Promise<ToolResult> {
    await this.o.assertOpen(loopId);
    const stale = await this.staleProblem(loopId);
    if (stale !== undefined) return err(stale);
    const dir = this.dir(loopId);
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

    // 新块的编号由框架发：接着这次学习用过的最大编号往下
    const cur = await this.o.pages.now(loopId);
    const known = new Set(this.base.get(loopId)?.blocks.map((b) => b.id));
    let lastBlock = cur?.lastBlock ?? 0;
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
    const same =
      cur !== undefined &&
      cur.m.blocks.length === blocks.length &&
      cur.m.blocks.every(
        (b, i) =>
          b.id === blocks[i]?.id && b.hash === blocks[i].hash && b.summary === blocks[i].summary,
      );
    if (same) return err('页面没有变化；要改就改了再交，不改就用一句话交回。');

    // 试跑：学习者浏览器里一个看不见的小窗；报错就退给子代理，学习者看到的一直是上一版
    const trial = await this.o.pages.trial(
      loopId,
      blocks.map((b) => ({ id: b.id, html: b.text })),
    );
    if (trial !== undefined && !trial.ok) {
      return err(
        `试跑报错：${trial.error ?? '（没说是什么错）'}。学习者看到的还是上一版；改了再交。`,
      );
    }
    const staleNow = await this.staleProblem(loopId);
    if (staleNow !== undefined) return err(staleNow);
    for (const b of blocks) await this.o.store.putBlock(loopId, b.text);
    await this.o.pages.publish(loopId, {
      m: { blocks: blocks.map(({ id, hash, summary }) => ({ id, hash, summary })) },
      by: 'editor',
      trialed: trial !== undefined,
      lastBlock,
    });
    // 照新的一版重摊（新块换成框架发的编号）
    await this.layout(loopId);
    return {
      text: `成了，已经上了页面${trial === undefined ? '（学习者这会儿没开着页面，没试跑）' : ''}。用一句话交回做了什么就停下（不提文件名）。`,
    };
  }

  /**
   * 摊进目录之后页面内容变了（别处上了新的一版）：这次改动不上。只比内容——学习者展开、折起也算一版，
   * 但内容没变，不影响子代理手上的改动。
   */
  private async staleProblem(loopId: string): Promise<string | undefined> {
    const base = this.base.get(loopId);
    const cur = (await this.o.pages.now(loopId))?.m ?? { blocks: [] };
    if (base !== undefined && sameContent(base, cur)) return undefined;
    await this.layout(loopId);
    return `你改的时候页面被改过了，这次改动不上；${PAGE_DIR}/ 已按现在的样子重摊，要改就重读了再改。`;
  }
}

function sameContent(a: PageManifest, b: PageManifest): boolean {
  return (
    a.blocks.length === b.blocks.length &&
    a.blocks.every(
      (x, i) =>
        x.id === b.blocks[i]?.id &&
        x.hash === b.blocks[i].hash &&
        x.summary === b.blocks[i].summary,
    )
  );
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
