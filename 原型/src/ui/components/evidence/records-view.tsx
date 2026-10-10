// 关于学习者的记录：我学会的、我的状态、教法记录。每条带依据原话与模型，可提不同看法。
import { useEffect } from 'react';
import type {
  FormationView,
  ObjectionView,
  QuoteView,
  StateRecordView,
  StrategyView,
} from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
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

export function LearnedView(props: { recordId?: string | undefined }) {
  const r = useLoad('m09', () => api.formations());
  const ready = r.data !== undefined;
  useEffect(() => {
    if (!ready || props.recordId === undefined) return;
    document
      .getElementById(`m09-${props.recordId}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [ready, props.recordId]);
  if (!r.data) return <Loading error={r.error} />;
  const records = [...r.data.records].reverse();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-lg">{W.learned}</h2>
      {records.length === 0 && (
        <div className="text-muted-foreground text-sm">{W.learnedEmpty}</div>
      )}
      {records.map((f) => (
        <Formation key={f.id} record={f} active={f.id === props.recordId} onObjected={r.reload} />
      ))}
    </div>
  );
}

function Formation(props: { record: FormationView; active: boolean; onObjected: () => void }) {
  const f = props.record;
  return (
    <Card id={`m09-${f.id}`} active={props.active} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <PointLink point={f.newPoint} />
        <Time at={f.at} />
      </div>
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
  if (!r.data) return <Loading error={r.error} />;
  const { current, records } = r.data;
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-serif text-lg">{W.myState}</h2>
      {current === undefined && records.length === 0 && (
        <div className="text-muted-foreground text-sm">{W.myStateEmpty}</div>
      )}
      {current !== undefined && (
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
      {records.length > 0 && (
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
  const s = props.record;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={s.source === '推断' ? 'warn' : 'neutral'}>{W.stateSource[s.source]}</Badge>
        <Badge>{W.stateOutput[s.output]}</Badge>
        <span className="ms-auto">
          <Time at={s.at} />
        </span>
      </div>
      <div className="whitespace-pre-wrap">{s.text}</div>
      {s.timeRange !== '' && <Field label={W.timeRange}>{s.timeRange}</Field>}
      {s.refs.map((ref) => (
        <Quotes key={ref.sessionId} quotes={ref.quotes} sessionId={ref.sessionId} />
      ))}
      <ModelLine model={s.model} />
      <Objections kind="m15" recordId={s.id} objections={s.objections} onDone={props.onObjected} />
    </Card>
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
  const s = props.record;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Time at={s.at} />
      </div>
      <Field label={W.conditions}>{s.conditions}</Field>
      <Field label={W.strategies}>{s.strategies}</Field>
      {s.followedBy !== '' && <Field label={W.followedBy}>{s.followedBy}</Field>}
      {s.toolsUsed.length > 0 && <Field label={W.toolsUsed}>{s.toolsUsed.join('、')}</Field>}
      <Quotes quotes={s.quotes} sessionId={s.loopSessionId} />
      <OpenLoop sessionId={s.loopSessionId} />
      <ModelLine model={s.model} />
      <Objections kind="m10" recordId={s.id} objections={s.objections} onDone={props.onObjected} />
    </Card>
  );
}
