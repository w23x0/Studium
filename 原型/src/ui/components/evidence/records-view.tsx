// 关于学习者的记录：我的状态、教法记录。每条带依据原话与模型，可提不同看法。
import { useState } from 'react';
import { CheckIcon, HistoryIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  ObjectionView,
  QuoteView,
  StateRecordView,
  StrategyView,
} from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { toolCounts, verdictText } from '../../teaching-model.ts';
import { W } from '../../wording.ts';
import {
  Badge,
  Card,
  Field,
  Loading,
  ModelLine,
  ObjectionForm,
  ObjectionList,
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
  kind: 'pedagogy' | 'state';
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

// ───────────── 我的状态 ─────────────

export function StateView() {
  const r = useLoad('state', () => api.state());
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
    <Card id={`state-${s.id}`} className="flex flex-col gap-3">
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
          <span>{after.text}</span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => panel.jump(after.loopSessionId, [after.line])}
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
      <Objections
        kind="state"
        recordId={s.id}
        objections={s.objections}
        onDone={props.onObjected}
      />
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
  const r = useLoad('pedagogy', () => api.strategies());
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
      <Objections
        kind="pedagogy"
        recordId={s.id}
        objections={s.objections}
        onDone={props.onObjected}
      />
    </Card>
  );
}
