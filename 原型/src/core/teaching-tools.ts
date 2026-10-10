// 教学工具（M10「通用策略知识层」，03「教学工具怎么落」）：一份 = 一个 Markdown 文件。
// 官方的在 原型/教学工具/（agent 起草），学习者自己的在 <数据>/teaching-tools/（可加，预留第三方）。
// 每次列出 / 取用时现读目录，学习者放进新文件不用重启。闭环里两个工具：列出、按名取全文；
// 取用了哪几份由程序从工具调用记录里读（studium.ts），不由模型自报。
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import type { NumberedRecord } from '../shared/records.ts';
import { isNotFound } from './log/session-log.ts';
import type { ToolSpec } from './model/port.ts';

const here = dirname(fileURLToPath(import.meta.url));
export const OFFICIAL_TOOLS_DIR = join(here, '../../教学工具');

export const READ_TEACHING_TOOL = 'read_teaching_tool';

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

  async get(name: string): Promise<TeachingTool | undefined> {
    return (await this.loadAll()).tools.find((t) => t.name === name);
  }
}

function nameArg(args: unknown): string {
  const name = (args as { name?: unknown } | null)?.name;
  return typeof name === 'string' ? name : '';
}

/** 从闭环正本的工具调用记录里读：取用了哪几份、在哪一行（报错的不算）。程序记的，不是模型报的。 */
export function toolUsesOf(recs: NumberedRecord[]): { name: string; line: number }[] {
  return recs.flatMap((r) =>
    r.record.type === 'tool_call' && r.record.name === READ_TEACHING_TOOL && !r.record.isError
      ? [{ name: nameArg(r.record.args), line: r.line }]
      : [],
  );
}

/** 闭环对话里的两个教学工具：列出可用的、按名取一份全文。 */
export function teachingToolSpecs(teaching: TeachingTools): ToolSpec[] {
  return [
    {
      name: 'list_teaching_tools',
      description:
        '列出可用的教学工具（名字 + 一句适用条件）。教学工具是可选的做法参考，由你按情形选用；不用也行。',
      input: {},
      run: async () => {
        const { tools, problems } = await teaching.list();
        const rows = tools.map((t) => `- ${t.name}｜适用：${t.applies}｜${t.origin}`);
        return {
          text: [
            rows.length > 0 ? rows.join('\n') : '（还没有教学工具）',
            ...(problems.length > 0
              ? ['', '装不上的文件：', ...problems.map((p) => `- ${p}`)]
              : []),
          ].join('\n'),
        };
      },
    },
    {
      name: READ_TEACHING_TOOL,
      description:
        '按名字取一份教学工具的全文（做法、怎么引出证据、注意边界）。取用会被程序记下，供事后比较教法。',
      input: { name: z.string().describe('list_teaching_tools 里的名字') },
      run: async (a) => {
        const name = nameArg(a);
        const t = await teaching.get(name);
        if (!t)
          return {
            text: `没有叫「${name}」的教学工具；先用 list_teaching_tools 看名字。`,
            isError: true,
          };
        return { text: `教学工具「${t.name}」（${t.origin}；${t.status}）\n\n${t.text}` };
      },
    },
  ];
}
