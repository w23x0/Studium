// 关于学习者的记录：我学会的、我的状态、教法记录。每条带依据原话与模型，可提不同看法。
import { useEffect } from 'react';
import { FileTextIcon } from 'lucide-react';
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
import { usePanel } from '../../panel.ts';
import { splitExternals } from '../../scope-model.ts';
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

/**
 * 分档：学完验证过的（学习里形成的记录）在上；还没核实的（自己说会的、笔记里看到的）单独一组在下，
 * 只作参考，不和验证过的混在一起。
 */
export function LearnedView(props: { recordId?: string | undefined }) {
  const r = useLoad('m09', () => api.formations());
  const ext = useLoad('m09:external', () => api.externals());
  const ready = r.data !== undefined;
  useEffect(() => {
    if (!ready || props.recordId === undefined) return;
    document
      .getElementById(`m09-${props.recordId}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [ready, props.recordId]);
  if (!r.data) return <Loading error={r.error} />;
  const records = [...r.data.records].reverse();
  const { self, notes } = splitExternals(ext.data?.records ?? []);
  const unverified = self.length + notes.length;
  return (
    <div className="flex flex-col gap-5" data-testid="learned-view">
      <h2 className="font-serif text-lg">{W.learned}</h2>
      {records.length === 0 && unverified === 0 ? (
        <div className="text-muted-foreground text-sm">{W.learnedEmpty}</div>
      ) : (
        <Section title={W.learnedVerified} hint={W.learnedVerifiedHint}>
          {records.length === 0 && (
            <div className="text-muted-foreground text-sm">{W.learnedVerifiedNone}</div>
          )}
          {records.map((f) => (
            <Formation
              key={f.id}
              record={f}
              active={f.id === props.recordId}
              onObjected={r.reload}
            />
          ))}
        </Section>
      )}
      {ext.error !== undefined && <Loading error={ext.error} />}
      {unverified > 0 && (
        <Section title={W.learnedUnverified} hint={W.learnedUnverifiedHint}>
          <div data-testid="learned-unverified" className="flex flex-col gap-4">
            {self.length > 0 && <ExternalGroup title={W.learnedSelf} records={self} />}
            {notes.length > 0 && <ExternalGroup title={W.learnedFromNotes} records={notes} />}
          </div>
        </Section>
      )}
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
    <Card className="flex flex-col gap-3 border-dashed">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="warn">{W.unverified}</Badge>
        <Badge>{x.source === '自述' ? W.learnedSelf : W.learnedFromNotes}</Badge>
        <span className="ms-auto">
          <Time at={x.at} />
        </span>
      </div>
      <div className="font-serif">{x.claim}</div>
      {x.point !== undefined && (
        <Field label={W.point}>
          <PointLink point={x.point} />
        </Field>
      )}
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
