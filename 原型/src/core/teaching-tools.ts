// 教学工具（教法记录里的通用策略知识层，`docs/设计/记录/教法记录与教学工具.md`）：一份 = 一个 Markdown 文件。
// 官方的在 原型/教学工具/（agent 起草），学习者自己的在 <数据>/teaching-tools/（可加，预留第三方）。
// 每次列出 / 取用时现读目录，学习者放进新文件不用重启。学习对话不挂工具：这些是沙盒里的只读文件
//（程序把 loadAll 的结果写进 只读/教学工具/）；读了哪几份由程序从沙盒动作里按路径标签取，不由模型自报。
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEACHING_TOOL_TAG, type NumberedRecord } from '../shared/records.ts';
import { isNotFound } from './log/session-log.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const OFFICIAL_TOOLS_DIR = join(here, '../../教学工具');

export type ToolOrigin = '官方' | '学习者自己';

export interface TeachingToolInfo {
  name: string;
  /** 适用条件，一句话。 */
  applies: string;
  origin: ToolOrigin;
  /** 来源（学习理论文件 / 审查单 / 学习者自己）。 */
  source: string;
  /** 如“agent 起草，未经产品负责人审”。 */
  status: string;
  /** 文件名（不含目录）。 */
  file: string;
}

export interface TeachingTool extends TeachingToolInfo {
  /** 文件全文。 */
  text: string;
}

export interface TeachingToolList {
  tools: TeachingToolInfo[];
  /** 装不上的文件与原因（格式不对、与官方同名）；不静默跳过。 */
  problems: string[];
}

const REQUIRED = ['适用条件', '来源', '状态'] as const;
const SECTIONS = ['做法', '怎么引出证据', '注意边界'] as const;

/** 解析一份教学工具；格式不对返回原因。 */
export function parseTeachingTool(
  file: string,
  origin: ToolOrigin,
  text: string,
): { tool: TeachingTool } | { problem: string } {
  const lines = text.split(/\r?\n/);
  const title = lines.find((l) => l.startsWith('# '));
  const name = title?.slice(2).trim();
  if (!name) return { problem: `${file}：缺一级标题（# 名字）` };
  const fields = new Map<string, string>();
  for (const l of lines) {
    const m = /^- (适用条件|来源|状态)[：:]\s*(.+)$/.exec(l);
    if (m?.[1] && m[2] && !fields.has(m[1])) fields.set(m[1], m[2].trim());
  }
  const missing = REQUIRED.filter((k) => !fields.has(k));
  if (missing.length > 0) return { problem: `${file}：缺「${missing.join('」「')}」` };
  const heads = lines.filter((l) => l.startsWith('## ')).map((l) => l.slice(3).trim());
  const noSection = SECTIONS.filter((k) => !heads.includes(k));
  if (noSection.length > 0) return { problem: `${file}：缺小节「${noSection.join('」「')}」` };
  return {
    tool: {
      name,
      applies: fields.get('适用条件') ?? '',
      origin,
      source: fields.get('来源') ?? '',
      status: fields.get('状态') ?? '',
      file,
      text,
    },
  };
}

export class TeachingTools {
  constructor(
    private readonly officialDir: string,
    private readonly ownDir: string,
  ) {}

  private async loadDir(
    dir: string,
    origin: ToolOrigin,
  ): Promise<TeachingToolList & { all: TeachingTool[] }> {
    let files: string[];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();
    } catch (err) {
      if (isNotFound(err)) return { tools: [], problems: [], all: [] };
      throw err;
    }
    const all: TeachingTool[] = [];
    const problems: string[] = [];
    for (const f of files) {
      const parsed = parseTeachingTool(f, origin, await readFile(join(dir, f), 'utf8'));
      if ('tool' in parsed) all.push(parsed.tool);
      else problems.push(parsed.problem);
    }
    return { tools: all, problems, all };
  }

  /** 全部：官方在前；学习者自己的与官方同名的不装载（名字是识别和比较的依据，须唯一）。 */
  async loadAll(): Promise<{ tools: TeachingTool[]; problems: string[] }> {
    const official = await this.loadDir(this.officialDir, '官方');
    const own = await this.loadDir(this.ownDir, '学习者自己');
    const tools = [...official.all];
    const problems = [...official.problems, ...own.problems];
    const seen = new Set(tools.map((t) => t.name));
    for (const t of own.all) {
      if (seen.has(t.name)) {
        problems.push(`${t.file}：名字「${t.name}」已被占用，未装载，请改名`);
        continue;
      }
      seen.add(t.name);
      tools.push(t);
    }
    return { tools, problems };
  }

  async list(): Promise<TeachingToolList> {
    const { tools, problems } = await this.loadAll();
    return {
      tools: tools.map((t) => ({
        name: t.name,
        applies: t.applies,
        origin: t.origin,
        source: t.source,
        status: t.status,
        file: t.file,
      })),
      problems,
    };
  }

  /** 按名字取一份；名字只是识别用的，界面里的“用过哪份”记的是文件名，两种都认。 */
  async get(nameOrFile: string): Promise<TeachingTool | undefined> {
    const all = (await this.loadAll()).tools;
    return all.find((t) => t.name === nameOrFile) ?? all.find((t) => t.file === nameOrFile);
  }
}

/**
 * 从一次学习的沙盒动作里读：读了哪几份教学工具、在哪一行（读失败的、Bash 里 cat 的都不算）。
 * 程序按路径打的标签，不是模型自报（记录/教法记录与教学工具.md「用了什么：程序照记」）。
 */
export function toolUsesOf(recs: NumberedRecord[]): { name: string; line: number }[] {
  return recs.flatMap((r) =>
    r.record.type === 'sandbox_action' &&
    r.record.ok &&
    r.record.tag?.startsWith(TEACHING_TOOL_TAG) === true
      ? [{ name: r.record.tag.slice(TEACHING_TOOL_TAG.length), line: r.line }]
      : [],
  );
}
