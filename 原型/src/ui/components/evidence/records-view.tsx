// 关于学习者的记录：我学会的、我的状态、教法记录。每条带依据原话与模型，可提不同看法。
import { useEffect, useState } from 'react';
import { CheckIcon, FileTextIcon, HistoryIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { modelInfoOf } from '../../../shared/protocol.ts';
import type {
  ExternalRecordView,
  FormationView,
  ObjectionView,
  QuoteView,
  StateRecordView,
  StrategyView,
} from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel, useProject } from '../../panel.ts';
import { levelText } from '../../longterm-model.ts';
import { DeviationsSection, PointHistoryView, PointViewList } from '../longterm/learned.tsx';
import { splitExternals } from '../../scope-model.ts';
import { afterTeachingText, toolCounts, trendLines, verdictText } from '../../teaching-model.ts';
import { W } from '../../wording.ts';
import {
  Badge,
  Card,
  Field,
  Loading,
  ModelLine,
  ObjectionForm,
  ObjectionList,
  PointLink,
  Quote,
  Section,
  Time,
} from './parts.tsx';
import { StateTimeline } from './state-timeline.tsx';
import { ToolChip } from './tools-view.tsx';

function Quotes(props: { quotes: QuoteView[]; sessionId: string }) {
  if (props.quotes.length === 0) return null;
  return (
    <Field label={W.quotedWords}>
      <div className="flex flex-col gap-1.5">
        {props.quotes.map((q) => (
          <Quote
            key={`${props.sessionId}:${String(q.line)}`}
            quote={q}
            sessionId={props.sessionId}
          />
        ))}
      </div>
    </Field>
  );
}

function Objections(props: {
  kind: 'm09' | 'm10' | 'm15';
  recordId: string;
  objections: ObjectionView[];
  onDone: () => void;
}) {
  return (
    <>
      <ObjectionList objections={props.objections} />
      <ObjectionForm
        label={W.objectRecord}
        submit={(text) =>
          api
            .objectToRecord({ kind: props.kind, recordId: props.recordId, text })
            .then((x) => x.objection)
        }
        onDone={props.onDone}
      />
    </>
  );
}

function OpenLoop(props: { sessionId: string }) {
  const panel = usePanel();
  return (
    <button
      type="button"
      className="text-primary self-start text-xs hover:underline"
      onClick={() => panel.show({ kind: 'loop', loopId: props.sessionId })}
    >
      {W.loopBasis}
    </button>
  );
}

// ───────────── 我学会的 ─────────────

/**
 * 以现在的样子为主（批 6）：每个知识点一行，点开看经过与每段学习的分析；
 * 还没核实的（自己说会的、笔记里看到的）单独一组在下，只作参考；最后是“没按推荐走的时候”。
 * 给了 recordId（别处点进来的一条记录）就直接看那条记录所在知识点的经过。
 */
export function LearnedView(props: { recordId?: string | undefined; point?: string | undefined }) {
  const r = useLoad('m09', () => api.formations());
  const ext = useLoad('m09:external', () => api.externals());
  const project = useProject();
  const { recordId } = props;
  const record = r.data?.records.find((f) => f.id === recordId);
  const point = props.point ?? record?.newPoint.id;
  const external = ext.data?.records.some((x) => x.id === recordId) === true;
  useEffect(() => {
    if (!external || recordId === undefined) return;
    document
      .getElementById(`m09-${recordId}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [external, recordId]);
  if (point !== undefined) {
    return (
      <PointHistoryView
        point={point}
        focusRecord={recordId}
        renderFormation={(f, active, onObjected) => (
          <Formation record={f} active={active} onObjected={onObjected} />
        )}
      />
    );
  }
  // 点进来的是一条形成记录，还没读回来
  if (recordId !== undefined && !r.data && !external) return <Loading error={r.error} />;
  const { self, notes } = splitExternals(ext.data?.records ?? []);
  const unverified = self.length + notes.length;
  return (
    <div className="flex flex-col gap-5" data-testid="learned-view">
      <h2 className="font-serif text-lg">{W.learned}</h2>
      <PointViewList />
      {ext.error !== undefined && <Loading error={ext.error} />}
      {unverified > 0 && (
        <Section title={W.learnedUnverified} hint={W.learnedUnverifiedHint}>
          <div data-testid="learned-unverified" className="flex flex-col gap-4">
            {self.length > 0 && <ExternalGroup title={W.learnedSelf} records={self} />}
            {notes.length > 0 && <ExternalGroup title={W.learnedFromNotes} records={notes} />}
          </div>
        </Section>
      )}
      <DeviationsSection projectId={project} />
    </div>
  );
}

function ExternalGroup(props: { title: string; records: ExternalRecordView[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-medium">{props.title}</span>
        <span className="text-muted-foreground text-xs">{props.records.length}</span>
      </div>
      {props.records.map((x) => (
        <External key={x.id} record={x} />
      ))}
    </div>
  );
}

function External(props: { record: ExternalRecordView }) {
  const panel = usePanel();
  const x = props.record;
  const note = x.note;
  return (
    <Card id={`m09-${x.id}`} className="flex flex-col gap-3 border-dashed">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="warn">{W.unverified}</Badge>
        <Badge>{x.source === '自述' ? W.learnedSelf : W.learnedFromNotes}</Badge>
        <span className="ms-auto">
          <Time at={x.at} />
        </span>
      </div>
      <div className="font-serif">{x.claim}</div>
      {x.point !== undefined && <Field label={W.point}>{x.point.name}</Field>}
      {x.grade !== undefined && x.grade !== '' && <Field label={W.grade}>{x.grade}</Field>}
      {x.basis !== '' && <Field label={W.whyGraded}>{x.basis}</Field>}
      {x.talk !== undefined && (
        <Quotes
          quotes={x.talk.lines.map((line, i) => ({
            line,
            at: x.at,
            ...(x.talk?.quotes[i] !== undefined ? { text: x.talk.quotes[i] } : {}),
          }))}
          sessionId={x.talk.sessionId}
        />
      )}
      {note !== undefined && (
        <button
          type="button"
          className="text-primary flex items-center gap-1 self-start text-xs hover:underline"
          onClick={() =>
            panel.show({
              kind: 'source',
              book: note.book,
              file: note.file,
              from: note.from,
              to: note.to,
            })
          }
        >
          <FileTextIcon className="size-3.5" />
          {W.noteSpot}
        </button>
      )}
      <ModelLine model={modelInfoOf(x.model)} />
    </Card>
  );
}

export function Formation(props: {
  record: FormationView;
  active: boolean;
  onObjected: () => void;
}) {
  const f = props.record;
  return (
    <Card id={`m09-${f.id}`} active={props.active} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <PointLink point={f.newPoint} />
        {f.revisit !== undefined && (
          <Badge tone="accent" title={W.revisitHint[f.revisit.kind]}>
            {W.revisitKind[f.revisit.kind]}
          </Badge>
        )}
        <span className="text-muted-foreground text-xs">
          {W.versionN(f.version)}
          {f.latest ? ` · ${W.latestBadge}` : ''}
        </span>
        <span className="ms-auto">
          <Time at={f.at} />
        </span>
      </div>
      {f.summary !== undefined && f.summary !== '' && <div className="font-serif">{f.summary}</div>}
      {levelText(f.level) !== undefined && <Field label={W.levelLabel}>{levelText(f.level)}</Field>}
      <Field label={W.understanding}>{f.understanding}</Field>
      {f.process !== '' && <Field label={W.process}>{f.process}</Field>}
      {f.unmet !== '' && <Field label={W.unmet}>{f.unmet}</Field>}
      {f.startPoints.length > 0 && (
        <Field label={W.startPoints}>
          <span className="flex flex-wrap gap-x-3 gap-y-1">
            {f.startPoints.map((p) => (
              <PointLink key={p.id} point={p} />
            ))}
          </span>
        </Field>
      )}
      <Field label={W.strength}>
        {f.evidenceStrength}
        {f.evidence !== undefined && (
          <span className="text-muted-foreground mt-1 block text-xs">
            {f.newPoint.name}：{f.evidence.newPoint.time} · {f.evidence.newPoint.independence}
            {f.evidence.startPoints.map((s) => (
              <span key={s.point} className="block">
                {f.startPoints.find((p) => p.id === s.point)?.name ?? s.point}：{s.time} ·{' '}
                {s.independence}
              </span>
            ))}
          </span>
        )}
      </Field>
      <Quotes quotes={f.quotes} sessionId={f.loopSessionId} />
      <OpenLoop sessionId={f.loopSessionId} />
      <ModelLine model={f.model} />
      <Objections kind="m09" recordId={f.id} objections={f.objections} onDone={props.onObjected} />
    </Card>
  );
}

// ───────────── 我的状态 ─────────────

export function StateView() {
  const r = useLoad('m15', () => api.state());
  const [view, setView] = useState<'list' | 'timeline'>('list');
  if (!r.data) return <Loading error={r.error} />;
  const { current, records } = r.data;
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-lg">{W.myState}</h2>
      {records.length > 0 && (
        <div className="bg-muted flex gap-1 self-start rounded-lg p-0.5 text-sm">
          {(['list', 'timeline'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              className={
                view === v
                  ? 'bg-background rounded-md px-3 py-1 shadow-xs'
                  : 'text-muted-foreground rounded-md px-3 py-1'
              }
              onClick={() => setView(v)}
            >
              {v === 'list' ? W.stateList : W.stateTimeline}
            </button>
          ))}
        </div>
      )}
      {view === 'timeline' && records.length > 0 && <StateTimeline />}
      {view === 'list' && current === undefined && records.length === 0 && (
        <div className="text-muted-foreground text-sm">{W.myStateEmpty}</div>
      )}
      {view === 'list' && current !== undefined && (
        <Section title={W.currentState}>
          <Card className="flex flex-col gap-3">
            <div className="font-serif whitespace-pre-wrap">{current.text}</div>
            {current.stage !== '' && <Field label={W.stage}>{current.stage}</Field>}
            {current.basisSpan !== '' && <Field label={W.basisSpan}>{current.basisSpan}</Field>}
            <Time at={current.at} />
            <ModelLine model={current.model} />
          </Card>
        </Section>
      )}
      {view === 'list' && records.length > 0 && (
        <Section title={W.stateRecords}>
          {[...records].reverse().map((s) => (
            <StateRecord key={s.id} record={s} onObjected={r.reload} />
          ))}
        </Section>
      )}
    </div>
  );
}

function StateRecord(props: { record: StateRecordView; onObjected: () => void }) {
  const panel = usePanel();
  const s = props.record;
  const after = s.afterTeaching;
  return (
    <Card id={`m15-${s.id}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          tone={s.sourceLevel === '已确认' ? 'good' : s.sourceLevel === '推断' ? 'warn' : 'neutral'}
        >
          {W.sourceLevel[s.sourceLevel]}
        </Badge>
        {s.sourceLevel === '已确认' && (
          <span className="text-muted-foreground text-xs">
            {W.sourceWas(W.sourceLevel[s.source])}
          </span>
        )}
        <Badge>{W.stateOutput[s.output]}</Badge>
        <span className="ms-auto">
          <Time at={s.at} />
        </span>
      </div>
      <div className="whitespace-pre-wrap">{s.text}</div>
      {after !== undefined && (
        <div className="bg-primary/5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3 py-2 text-xs">
          <HistoryIcon className="text-primary size-3.5" />
          <span>{afterTeachingText(after)}</span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() =>
              panel.show({ kind: 'loop', loopId: after.loopSessionId, noteLine: after.line })
            }
          >
            {W.afterTeachingGo}
          </button>
        </div>
      )}
      {s.timeRange !== '' && <Field label={W.timeRange}>{s.timeRange}</Field>}
      {s.refs.map((ref) => (
        <Quotes key={ref.sessionId} quotes={ref.quotes} sessionId={ref.sessionId} />
      ))}
      <ModelLine model={s.model} />
      <StateVerdict record={s} onDone={props.onObjected} />
      <Objections kind="m15" recordId={s.id} objections={s.objections} onDone={props.onObjected} />
    </Card>
  );
}

/** “对，是这样” / “不对”（可写一句）；表过态的显示最近一次，可以改。 */
function StateVerdict(props: { record: StateRecordView; onDone: () => void }) {
  const s = props.record;
  const said = verdictText(s);
  const [editing, setEditing] = useState(false);
  const [denying, setDenying] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const submit = (verdict: 'confirm' | 'deny') => {
    setBusy(true);
    setError(undefined);
    api
      .confirmState(s.id, verdict, verdict === 'deny' ? note : undefined)
      .then(() => {
        setEditing(false);
        setDenying(false);
        setNote('');
        setSent(verdict === 'deny' ? W.stateDeniedSent : undefined);
        props.onDone();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };
  if (said !== undefined && !editing) {
    return (
      <div className="flex flex-col gap-1" data-testid="state-verdict">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={s.learnerVerdict === '确认' ? 'text-emerald-700 dark:text-emerald-300' : ''}
          >
            {said.text}
          </span>
          {said.note !== undefined && <span className="text-muted-foreground">“{said.note}”</span>}
          <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
            {W.stateChange}
          </Button>
        </div>
        {sent !== undefined && <div className="text-muted-foreground text-xs">{sent}</div>}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2" data-testid="state-verdict">
      {!denying ? (
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="xs" disabled={busy} onClick={() => submit('confirm')}>
            <CheckIcon />
            {W.stateConfirm}
          </Button>
          <Button variant="outline" size="xs" disabled={busy} onClick={() => setDenying(true)}>
            <XIcon />
            {W.stateDeny}
          </Button>
          {editing && (
            <Button variant="ghost" size="xs" onClick={() => setEditing(false)}>
              {W.objectCancel}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            className="bg-background focus:border-foreground/30 min-h-16 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
            placeholder={W.stateDenyPlaceholder}
            aria-label={W.stateDenyPlaceholder}
            value={note}
            autoFocus
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDenying(false)}>
              {W.objectCancel}
            </Button>
            <Button size="sm" disabled={busy} onClick={() => submit('deny')}>
              {W.stateDenySend}
            </Button>
          </div>
        </div>
      )}
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
    </div>
  );
}

// ───────────── 教法记录 ─────────────

export function TeachingView() {
  const r = useLoad('m10', () => api.strategies());
  if (!r.data) return <Loading error={r.error} />;
  const records = [...r.data.records].reverse();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-lg">{W.teaching}</h2>
      {records.length === 0 && (
        <div className="text-muted-foreground text-sm">{W.teachingEmpty}</div>
      )}
      {records.map((s) => (
        <Strategy key={s.id} record={s} onObjected={r.reload} />
      ))}
    </div>
  );
}

function Strategy(props: { record: StrategyView; onObjected: () => void }) {
  const panel = usePanel();
  const s = props.record;
  // 旧记录没有每次取用的位置，只有名字
  const tools =
    s.toolUses !== undefined
      ? toolCounts(s.toolUses)
      : s.toolsUsed.map((name) => ({ name, count: 1 }));
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Time at={s.at} />
      </div>
      <Field label={W.conditions}>{s.conditions}</Field>
      <Field label={W.strategies}>{s.strategies}</Field>
      {s.followedBy !== '' && <Field label={W.followedBy}>{s.followedBy}</Field>}
      {tools.length > 0 && (
        <Field label={W.toolsUsed}>
          <span className="flex flex-wrap gap-1.5">
            {tools.map((t) => (
              <ToolChip key={t.name} name={t.name} count={t.count} />
            ))}
          </span>
        </Field>
      )}
      {s.intensityTrend !== undefined && (
        <Field label={W.trendSummary}>
          <span className="flex flex-col gap-0.5 text-xs">
            {trendLines(s.intensityTrend.summary).map((l) => (
              <span key={l}>{l}</span>
            ))}
            {s.intensityTrend.unannotated > 0 && (
              <span className="text-muted-foreground">
                {W.intensityUnmarked(s.intensityTrend.unannotated)}
              </span>
            )}
          </span>
        </Field>
      )}
      {s.selfCheck !== undefined && (
        <Field label={W.selfCheck}>
          <span className="flex flex-col gap-1">
            <span>{s.selfCheck.note}</span>
            {s.selfCheck.stateIds.length > 0 && (
              <button
                type="button"
                className="text-primary self-start text-xs hover:underline"
                onClick={() => panel.show({ kind: 'state' })}
              >
                {W.selfCheckStates(s.selfCheck.stateIds.length)}
              </button>
            )}
          </span>
        </Field>
      )}
      <Quotes quotes={s.quotes} sessionId={s.loopSessionId} />
      <OpenLoop sessionId={s.loopSessionId} />
      <ModelLine model={s.model} />
      <Objections kind="m10" recordId={s.id} objections={s.objections} onDone={props.onObjected} />
    </Card>
  );
}
