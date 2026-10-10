// “我学会的”以现在的样子为主（批 6）：每个知识点一行（现在的程度、状态、最近一次证据与强度、多久没碰、一句摘要），
// 可搜、可按状态筛、可按最久没碰排；点开看这个知识点的经过（学会 → 一时没想起来 / 退了一档 → 又掌握了，各指回那段学习）
// 与每段学习的几版分析（可用现在的模型重做，最新的标出）。另有“没按推荐走的时候”，只读，给学习者自己看。
import { useState, type ReactNode } from 'react';
import { ArrowDownUpIcon, MessageSquareQuoteIcon, RefreshCwIcon, SearchIcon } from 'lucide-react';
import type { FormationView, PointViewEntry, ViewStatus } from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { shortTime } from '../../evidence-model.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { useSessions } from '../../hooks/use-sessions.ts';
import {
  analysisGroups,
  deviationLine,
  entrySummary,
  filterView,
  levelText,
  pointHistory,
  statusCounts,
  type AnalysisGroup,
  type HistoryEvent,
  type ViewSort,
} from '../../longterm-model.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Field, Loading, Section, Time } from '../evidence/parts.tsx';

const STATUS_TONE: Record<ViewStatus, 'good' | 'warn' | 'accent' | 'neutral'> = {
  闭环证据: 'good',
  提取失败: 'warn',
  降档: 'warn',
  重新掌握: 'accent',
  仅外部导入: 'neutral',
};

const STATUS_ORDER: ViewStatus[] = ['闭环证据', '重新掌握', '提取失败', '降档', '仅外部导入'];

export function StatusBadge(props: { status: ViewStatus }) {
  return <Badge tone={STATUS_TONE[props.status]}>{W.viewStatus[props.status]}</Badge>;
}

/** 每个知识点一行：可搜、可筛、可排；点开看经过。 */
export function PointViewList() {
  const r = useLoad('m09:view', () => api.pointView());
  const panel = usePanel();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ViewStatus | ''>('');
  const [sort, setSort] = useState<ViewSort>('recent');
  if (!r.data) return <Loading error={r.error} />;
  const all = r.data.entries;
  if (all.length === 0)
    return <div className="text-muted-foreground text-sm">{W.learnedEmpty}</div>;
  const counts = statusCounts(all);
  const shown = filterView(all, { q, status, sort });
  return (
    <div data-testid="point-view" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="bg-background focus-within:border-foreground/30 flex flex-1 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
          <SearchIcon className="text-muted-foreground size-3.5" />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder={W.viewSearch}
            aria-label={W.viewSearch}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <Button
          variant="ghost"
          size="xs"
          title={W.viewSort[sort === 'recent' ? 'oldest' : 'recent']}
          onClick={() => setSort((s) => (s === 'recent' ? 'oldest' : 'recent'))}
        >
          <ArrowDownUpIcon />
          {W.viewSort[sort]}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={status === ''} onClick={() => setStatus('')}>
          {W.viewAll} {all.length}
        </Chip>
        {STATUS_ORDER.filter((s) => counts.has(s)).map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
            {W.viewStatus[s]} {counts.get(s)}
          </Chip>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="text-muted-foreground text-sm">{W.viewNone}</div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {shown.map((e) => (
            <li key={e.point.id}>
              <button
                type="button"
                className="bg-card hover:border-foreground/20 flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left text-sm shadow-xs"
                onClick={() => panel.show({ kind: 'learned', point: e.point.id })}
              >
                <EntryHead entry={e} />
                {entrySummary(e) !== '' && <span className="font-serif">{entrySummary(e)}</span>}
                <EntryFacts entry={e} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip(props: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs',
        props.active ? 'bg-foreground text-background border-foreground' : 'hover:bg-accent/60',
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function EntryHead(props: { entry: PointViewEntry }) {
  const e = props.entry;
  const level = levelText(e.level);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="font-medium">{e.point.name}</span>
      {level !== undefined && <Badge>{level}</Badge>}
      <StatusBadge status={e.status} />
    </span>
  );
}

function EntryFacts(props: { entry: PointViewEntry }) {
  const e = props.entry;
  const ev = e.lastEvidence;
  return (
    <span className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
      {ev !== undefined && (
        <span>
          {W.lastEvidence}：{shortTime(ev.at)} · {ev.strength}
          {ev.revisit !== undefined && ` · ${W.revisitKind[ev.revisit]}`}
          {ev.role === '出发点' && ` · ${W.asBase}`}
        </span>
      )}
      <span>{W.daysSince(e.daysSince)}</span>
    </span>
  );
}

/** 一个知识点的经过与每段学习的分析。renderFormation 由“我学会的”给（显示一条分析的样子）。 */
export function PointHistoryView(props: {
  point: string;
  focusRecord?: string | undefined;
  renderFormation: (f: FormationView, active: boolean, onObjected: () => void) => ReactNode;
}) {
  const { point } = props;
  const d = useLoad(`m09:view:${point}`, () => api.pointDetail(point));
  const f = useLoad('m09', () => api.formations());
  const panel = usePanel();
  if (!d.data || !f.data) return <Loading error={d.error ?? f.error} />;
  const { entry, timeline } = d.data;
  const history = pointHistory(point, f.data.records, timeline);
  const groups = analysisGroups(point, f.data.records);
  const level = levelText(entry.level);
  return (
    <div data-testid="point-history" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="decoration-primary/40 hover:decoration-primary self-start text-left font-serif text-lg underline underline-offset-4"
          onClick={() => panel.show({ kind: 'point', id: point })}
        >
          {entry.point.name}
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={entry.status} />
          {level !== undefined && (
            <span className="text-muted-foreground text-xs">
              {W.levelLabel}：{level}
            </span>
          )}
          <span className="text-muted-foreground ms-auto text-xs">
            {W.daysSince(entry.daysSince)}
          </span>
        </div>
        {entrySummary(entry) !== '' && <div className="font-serif">{entrySummary(entry)}</div>}
        {entry.keywords.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {entry.keywords
              .filter((k) => k !== entry.point.name)
              .map((k) => (
                <Badge key={k}>{k}</Badge>
              ))}
          </div>
        )}
        {entry.sources.external > 0 && (
          <button
            type="button"
            className="text-primary self-start text-xs hover:underline"
            onClick={() => panel.show({ kind: 'learned' })}
          >
            {W.externalCount(entry.sources.external)}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <Section title={W.pointHistory} hint={W.pointHistoryHint}>
          <ol className="border-border ms-1.5 flex flex-col gap-3 border-s ps-4">
            {history.map((h, i) => (
              <HistoryStep key={`${h.at}:${String(i)}`} step={h} />
            ))}
          </ol>
        </Section>
      )}

      {groups.length > 0 && (
        <Section title={W.analyses} hint={W.analysesHint}>
          {groups.map((g) => (
            <Analysis
              key={g.loopSessionId}
              group={g}
              focusRecord={props.focusRecord}
              renderFormation={props.renderFormation}
              onChanged={f.reload}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function HistoryStep(props: { step: HistoryEvent }) {
  const panel = usePanel();
  const h = props.step;
  const t = h.timeline;
  const tone =
    h.kind === '提取失败' || h.kind === '降档' ? 'warn' : h.kind === 'base' ? 'neutral' : 'good';
  const after = levelText(t?.level);
  return (
    <li className="relative flex flex-col gap-1 text-sm">
      <span
        className={cn(
          'absolute top-1.5 -left-[1.3rem] size-2 rounded-full',
          tone === 'warn'
            ? 'bg-amber-500'
            : tone === 'good'
              ? 'bg-emerald-500'
              : 'bg-muted-foreground/50',
        )}
      />
      <span className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{W.historyEvent[h.kind]}</Badge>
        <Time at={h.at} />
        {h.strength !== undefined && (
          <span className="text-muted-foreground text-xs">{h.strength}</span>
        )}
      </span>
      {t !== undefined && (
        <>
          {t.reason !== '' && <div className="whitespace-pre-wrap">{t.reason}</div>}
          {t.stateRuledOut !== undefined && t.stateRuledOut !== '' && (
            <Field label={W.stateRuledOut}>{t.stateRuledOut}</Field>
          )}
          {after !== undefined && (
            <span className="text-muted-foreground text-xs">
              {W.levelAfter}：{after}
            </span>
          )}
        </>
      )}
      <span className="flex flex-wrap gap-3 text-xs">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => panel.show({ kind: 'loop', loopId: h.loopSessionId })}
        >
          {W.seeThatLearning}
        </button>
        {t !== undefined && t.evidenceLines.length > 0 && (
          <button
            type="button"
            className="text-primary flex items-center gap-1 hover:underline"
            onClick={() => panel.jump(h.loopSessionId, t.evidenceLines)}
          >
            <MessageSquareQuoteIcon className="size-3.5" />
            {W.jumpTo}
          </button>
        )}
      </span>
    </li>
  );
}

/** 一段学习的几版分析：可切换查看，最新的标出；可用现在的模型再做一版。 */
function Analysis(props: {
  group: AnalysisGroup;
  focusRecord?: string | undefined;
  renderFormation: (f: FormationView, active: boolean, onObjected: () => void) => ReactNode;
  onChanged: () => void;
}) {
  const { group: g } = props;
  const focused = g.versions.find((v) => v.id === props.focusRecord);
  const [picked, setPicked] = useState<string | undefined>(focused?.id);
  // 重做发出去时有几版：多出一版就不再显示“在重新分析”
  const [pendingFrom, setPendingFrom] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const shown = g.versions.find((v) => v.id === picked) ?? g.latest;
  const pending = pendingFrom !== undefined && g.versions.length <= pendingFrom;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {g.versions.length > 1 &&
          g.versions.map((v) => (
            <Chip key={v.id} active={v.id === shown.id} onClick={() => setPicked(v.id)}>
              {W.versionN(v.version)}
              {v.latest && ` · ${W.latestBadge}`}
            </Chip>
          ))}
        <Button
          variant="ghost"
          size="xs"
          className="ms-auto"
          disabled={pending}
          onClick={() => {
            setError(undefined);
            setPendingFrom(g.versions.length);
            api.reanalyze(g.loopSessionId).then(
              () => {
                setPicked(undefined);
              },
              (e: unknown) => {
                setPendingFrom(undefined);
                setError(e instanceof Error ? e.message : String(e));
              },
            );
          }}
        >
          <RefreshCwIcon className={pending ? 'animate-spin' : ''} />
          {W.reanalyze}
        </Button>
      </div>
      {pending && <div className="text-muted-foreground text-xs">{W.reanalyzing}</div>}
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
      {props.renderFormation(shown, shown.id === props.focusRecord, props.onChanged)}
    </div>
  );
}

/** 没按推荐走的时候：只读列出，日常话。 */
export function DeviationsSection(props: { projectId?: string | undefined }) {
  const r = useLoad(`deviations:${props.projectId ?? ''}`, () => api.deviations(props.projectId));
  const sessions = useSessions();
  const panel = usePanel();
  const titleOf = (id: string) => sessions.find((s) => s.sessionId === id)?.title;
  const records = [...(r.data?.records ?? [])].reverse();
  return (
    <Section title={W.deviations} hint={W.deviationsHint}>
      <div data-testid="deviations" className="flex flex-col gap-1.5">
        {!r.data ? (
          <Loading error={r.error} />
        ) : records.length === 0 ? (
          <div className="text-muted-foreground text-sm">{W.deviationsNone}</div>
        ) : (
          records.map((d) => (
            <Card key={d.id} className="flex flex-col gap-1">
              <span>{deviationLine(d, titleOf)}</span>
              <span className="flex flex-wrap items-center gap-3">
                <Time at={d.at} />
                {d.loopSessionId !== undefined && (
                  <button
                    type="button"
                    className="text-primary text-xs hover:underline"
                    onClick={() =>
                      d.loopSessionId !== undefined &&
                      panel.show({ kind: 'loop', loopId: d.loopSessionId })
                    }
                  >
                    {W.seeThatLearning}
                  </button>
                )}
              </span>
            </Card>
          ))
        )}
      </div>
    </Section>
  );
}
