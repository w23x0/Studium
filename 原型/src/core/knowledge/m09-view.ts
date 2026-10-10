// M09 当前视图与索引摘要（M09:30）：每个点一行——当前档次、最近一次证据、一句话摘要、检索词。
// 派生层：只读 M09 的记录（形成记录、外部导入、时间版本记录）按时间折叠得出，随时可以从记录重算，
// 不存盘、不拥有权威性、不替代底层记录和证据。不用数值评分、固定公式或阈值。
import type { PointViewEntry, ViewEvidence, ViewStatus } from '../../shared/protocol-longterm.ts';
import {
  describeStrength,
  type ExternalRecord,
  type FormationRecord,
  type M09,
  type TimelineRecord,
} from './m09.ts';

type Event =
  | {
      at: string;
      rank: 0;
      seq: number;
      kind: 'formation';
      rec: FormationRecord;
      role: '新点' | '出发点';
    }
  | { at: string; rank: 1; seq: number; kind: 'timeline'; rec: TimelineRecord };

/** 这条形成记录里某个点的证据强度文字。 */
export function strengthOf(rec: FormationRecord, point: string): string {
  if (rec.evidence === undefined) return rec.evidenceStrength;
  if (rec.newPoint === point) return describeStrength(rec.evidence.newPoint);
  const s = rec.evidence.startPoints.find((x) => x.point === point);
  return s !== undefined ? describeStrength(s) : rec.evidenceStrength;
}

/** 一个闭环第一次写下分析的时间（重做分析不改变“这个闭环是什么时候合上的”）。 */
function closedAt(m09: M09, rec: FormationRecord): string {
  return m09.forLoop(rec.loopSessionId)[0]?.at ?? rec.at;
}

function firstSentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  const cut = t.search(/[。！？!?；;]/);
  const s = cut >= 0 ? t.slice(0, cut + 1) : t;
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

export function buildPointView(
  m09: M09,
  nameOf: (id: string) => string,
  now: Date,
): PointViewEntry[] {
  const events = new Map<string, Event[]>();
  const push = (point: string, e: Event): void => {
    const list = events.get(point) ?? [];
    list.push(e);
    events.set(point, list);
  };
  let seq = 0;
  for (const rec of m09.current()) {
    const at = closedAt(m09, rec);
    push(rec.newPoint, { at, rank: 0, seq: seq++, kind: 'formation', rec, role: '新点' });
    for (const s of new Set(rec.startPoints)) {
      if (s !== rec.newPoint)
        push(s, { at, rank: 0, seq: seq++, kind: 'formation', rec, role: '出发点' });
    }
  }
  for (const rec of m09.timelines())
    push(rec.point, { at: rec.at, rank: 1, seq: seq++, kind: 'timeline', rec });
  const externals = new Map<string, ExternalRecord[]>();
  for (const x of m09.externals()) {
    if (x.point === undefined) continue;
    externals.set(x.point, [...(externals.get(x.point) ?? []), x]);
  }

  const out: PointViewEntry[] = [];
  const points = new Set([...events.keys(), ...externals.keys()]);
  for (const point of points) {
    const evs = (events.get(point) ?? []).sort(
      (a, b) => a.at.localeCompare(b.at) || a.rank - b.rank || a.seq - b.seq,
    );
    const ext = externals.get(point) ?? [];
    let level: string | undefined;
    let status: ViewStatus = evs.length === 0 ? '仅外部导入' : '闭环证据';
    let lastEvidence: ViewEvidence | undefined;
    let summary: string | undefined;
    let versions = 1;
    const keywords = new Set<string>([nameOf(point)]);
    const loops = new Set<string>();
    const timeline: PointViewEntry['timeline'] = [];
    for (const e of evs) {
      if (e.kind === 'timeline') {
        const t = e.rec;
        timeline.push({ id: t.id, at: t.at, kind: t.kind });
        if (t.kind === '提取失败') {
          status = '提取失败';
          if (t.level !== undefined) level = t.level;
        } else {
          status = t.kind;
          if (t.level !== undefined) level = t.level;
        }
        continue;
      }
      const r = e.rec;
      loops.add(r.loopSessionId);
      lastEvidence = {
        recordId: r.id,
        at: e.at,
        loopSessionId: r.loopSessionId,
        role: e.role,
        strength: strengthOf(r, point),
        ...(r.revisit !== undefined ? { revisit: r.revisit.kind } : {}),
      };
      if (e.role === '新点') {
        status = '闭环证据';
        if (r.level !== undefined) level = r.level;
        summary = r.summary?.trim() || firstSentence(r.understanding);
        versions = r.version ?? 1;
        for (const k of r.keywords ?? []) keywords.add(k);
      }
    }
    if (summary === undefined) {
      const lastExt = ext.at(-1);
      summary =
        evs.length > 0
          ? '（在别的闭环里作为出发点用过）'
          : lastExt !== undefined
            ? `${lastExt.claim}（${lastExt.source}，未验证）`
            : '';
    }
    const touched = [
      ...evs.map((e) => e.at),
      ...(evs.length === 0 ? ext.map((x) => x.at) : []),
    ].sort();
    const lastTouchedAt = touched.at(-1) ?? '';
    out.push({
      point: { id: point, name: nameOf(point) },
      ...(level !== undefined ? { level } : {}),
      status,
      ...(lastEvidence !== undefined ? { lastEvidence } : {}),
      lastTouchedAt,
      daysSince: Math.max(0, Math.floor((now.getTime() - Date.parse(lastTouchedAt)) / 86_400_000)),
      summary,
      keywords: [...keywords],
      versions,
      sources: { loops: loops.size, external: ext.length },
      timeline,
    });
  }
  return out.sort((a, b) => b.lastTouchedAt.localeCompare(a.lastTouchedAt));
}
