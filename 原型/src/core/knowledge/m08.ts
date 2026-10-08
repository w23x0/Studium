// M08：点 + 子句（M08 审查单「点与子句」）。只读：闭环内外的会话都只经查询工具读它。
// 生成（先生成后回扫）在资料线做，不在这里；这里读 points.jsonl / clauses.jsonl。
import { join } from 'node:path';
import { latestById, readJsonl } from './jsonl.ts';

/** 原文锚点：书 + M07 文件 + 原文引文（TextQuoteSelector 的 exact）。 */
export interface Anchor {
  book: string;
  file: string;
  quote: string;
}

export interface Point {
  id: string;
  /** 点的名字。 */
  name: string;
  /** 一句话：这个点是什么（按定义拆）。 */
  sentence: string;
  anchors: Anchor[];
  source: '书给的' | '模型补的';
  threshold?: boolean;
}

export interface Clause {
  id: string;
  /** 出发点。 */
  from: string[];
  /** 新点。 */
  to: string;
  /** 一两句：从哪出发、学出什么理解、用到出发点的哪一面。 */
  text: string;
  anchors: Anchor[];
  source: '书给的' | '模型补的';
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
      (p) => p.name.toLowerCase().includes(k) || p.sentence.toLowerCase().includes(k) || p.id === k,
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
    const anchors = p.anchors.map((a) => `  原文：${a.book} / ${a.file}：“${a.quote}”`).join('\n');
    return `${p.id}「${p.name}」${p.threshold === true ? '（阈值概念）' : ''}（${p.source}）\n  ${p.sentence}${anchors ? '\n' + anchors : ''}`;
  }

  describeClause(c: Clause): string {
    const from = c.from.map((f) => `${f}「${this.name(f)}」`).join(' + ');
    const anchors = c.anchors.map((a) => `  原文：${a.book} / ${a.file}：“${a.quote}”`).join('\n');
    return `${c.id}：${from} → ${c.to}「${this.name(c.to)}」（${c.source}）\n  ${c.text}${anchors ? '\n' + anchors : ''}`;
  }

  /** 全部点与子句的提纲（给 M05 开场用；量大了换成按需查）。 */
  outline(): string {
    const pts = [...this.points.values()].map((p) => `- ${p.id}「${p.name}」：${p.sentence}`);
    const cls = [...this.clauses.values()].map(
      (c) => `- ${c.id}：${c.from.map((f) => this.name(f)).join(' + ')} → ${this.name(c.to)}`,
    );
    return `点（${String(pts.length)}）：\n${pts.join('\n')}\n\n子句（${String(cls.length)}）：\n${cls.join('\n')}`;
  }
}
