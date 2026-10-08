// M08：点 + 子句（M08 审查单「点与子句」）。只读：闭环内外的会话都只经查询工具读它。
// 生成（先生成后回扫）在资料线做（书库处理/studium/m08.py），不在这里；这里读 points.jsonl / clauses.jsonl。
// 样例只有 id / name / sentence / anchors / source 等基本字段；资料线产出多出的字段都是可选的。
import { join } from 'node:path';
import { latestById, readJsonl } from './jsonl.ts';

/** 原文锚点：书 + M07 文件 + 原文引文（TextQuoteSelector 的 exact）；资料线另给原件位置。 */
export interface Anchor {
  book: string;
  file: string;
  quote: string;
  /** 原件 PDF 页（1 起）。 */
  page?: number;
  /** 原件上的位置框（MinerU content_list 坐标，0–1000 归一）。 */
  bbox?: number[];
  /** 引文在 M07 文件里的行号：按引文重算的提示，转录修订后会变；以 page / bbox / quote 为准。 */
  line?: number;
}

/** 书给的 = 原文有支撑；模型补的 = 找不到支撑（候选）；未审 = 不在处理过的范围里，没对原文审过。 */
export type Source = '书给的' | '模型补的' | '未审';

export interface Point {
  id: string;
  /** 点的名字。 */
  name: string;
  /** 一句话：这个点是什么（按定义拆）。 */
  sentence: string;
  anchors: Anchor[];
  source: Source;
  threshold?: boolean;
  /** 程序粗筛用的检索词（中英文名、记号、公式）。 */
  keys?: string[];
  /** 范围内 = 本次处理范围里的点；前置 = 范围外、作出发点用的点。 */
  scope?: '范围内' | '前置';
  /** 书按另一种定义引入同一对象时拆出的点：指向清单里原来那个点。 */
  split_of?: string;
  /** 书里明写的“别混淆”，作锚点留在点上（不存成结构）。 */
  cautions?: { text: string; anchors: Anchor[] }[];
}

export interface Clause {
  id: string;
  /** 出发点。 */
  from: string[];
  /** 新点。 */
  to: string;
  /** 一两句：从哪出发、学出什么理解、用到出发点的哪一面。 */
  text: string;
  /** 书给的：支撑原文；模型补的：书里露出的零件（可空）。 */
  anchors: Anchor[];
  source: Source;
  /** 审核时写下的差别 / 缺了什么。 */
  notes?: string[];
}

function describeAnchor(a: Anchor): string {
  const where = [
    a.page !== undefined ? `PDF 第 ${String(a.page)} 页` : '',
    a.line !== undefined ? `文件第 ${String(a.line)} 行附近` : '',
  ].filter((s) => s !== '');
  return `  原文：${a.book} / ${a.file}${where.length > 0 ? `（${where.join('，')}）` : ''}：“${a.quote}”`;
}

export class M08 {
  private constructor(
    readonly points: Map<string, Point>,
    readonly clauses: Map<string, Clause>,
  ) {}

  static async load(dir: string): Promise<M08> {
    return new M08(
      latestById(await readJsonl<Point>(join(dir, 'points.jsonl'))),
      latestById(await readJsonl<Clause>(join(dir, 'clauses.jsonl'))),
    );
  }

  get empty(): boolean {
    return this.points.size === 0;
  }

  search(keyword: string): Point[] {
    const k = keyword.trim().toLowerCase();
    return [...this.points.values()].filter(
      (p) =>
        p.name.toLowerCase().includes(k) ||
        p.sentence.toLowerCase().includes(k) ||
        p.id === k ||
        (p.keys ?? []).some((x) => x.toLowerCase().includes(k)),
    );
  }

  clausesInto(pointId: string): Clause[] {
    return [...this.clauses.values()].filter((c) => c.to === pointId);
  }

  clausesFrom(pointId: string): Clause[] {
    return [...this.clauses.values()].filter((c) => c.from.includes(pointId));
  }

  name(pointId: string): string {
    return this.points.get(pointId)?.name ?? pointId;
  }

  describePoint(p: Point): string {
    const lines = [
      `${p.id}「${p.name}」${p.threshold === true ? '（阈值概念）' : ''}（${p.source}${p.scope === '前置' ? '，前置' : ''}）`,
      `  ${p.sentence}`,
      ...(p.split_of !== undefined
        ? [`  同一对象的另一种定义：${p.split_of}「${this.name(p.split_of)}」`]
        : []),
      ...p.anchors.map(describeAnchor),
      ...(p.cautions ?? []).flatMap((c) => [
        `  书里提醒：${c.text}`,
        ...c.anchors.map(describeAnchor),
      ]),
    ];
    return lines.join('\n');
  }

  describeClause(c: Clause): string {
    const from = c.from.map((f) => `${f}「${this.name(f)}」`).join(' + ');
    const lines = [
      `${c.id}：${from} → ${c.to}「${this.name(c.to)}」（${c.source}）`,
      `  ${c.text}`,
      ...(c.anchors.length > 0 && c.source !== '书给的' ? ['  书里只露出零件：'] : []),
      ...c.anchors.map(describeAnchor),
      ...(c.notes ?? []).map((n) => `  审核注：${n}`),
    ];
    return lines.join('\n');
  }

  /** 全部点与子句的提纲（给 M05 开场用；量大了换成按需查）。 */
  outline(): string {
    const tag = (s: Source): string => (s === '书给的' ? '' : `（${s}）`);
    const pts = [...this.points.values()].map(
      (p) => `- ${p.id}「${p.name}」${tag(p.source)}：${p.sentence}`,
    );
    const cls = [...this.clauses.values()].map(
      (c) =>
        `- ${c.id}：${c.from.map((f) => this.name(f)).join(' + ')} → ${this.name(c.to)}${tag(c.source)}`,
    );
    return `点（${String(pts.length)}；未标的是书给的）：\n${pts.join('\n')}\n\n子句（${String(cls.length)}；未标的是书给的）：\n${cls.join('\n')}`;
  }
}
