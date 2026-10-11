// 书里的知识点与“这一步怎么连上的”：标书给的 / 模型补的，带书名与页。
import type { ClauseView, PointView } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Anchors, Badge, Card, Loading, Section, SourceBadge } from './parts.tsx';
import { CorrectionNote, ReviewMarks, TargetReview } from './review-view.tsx';

export function PointPanel(props: { id: string }) {
  const r = useLoad(`point:${props.id}`, () => api.point(props.id), false);
  const panel = usePanel();
  if (!r.data) return <Loading error={r.error} />;
  const { point, into, from } = r.data;
  return (
    <div className="flex flex-col gap-5">
      <PointHead point={point} />
      <CorrectionNote mark={point.correction} />
      {point.splitOf !== undefined && (
        <div className="text-sm">
          {W.splitOf}
          <button
            type="button"
            className="ms-1 underline underline-offset-4"
            onClick={() => point.splitOf && panel.show({ kind: 'point', id: point.splitOf.id })}
          >
            {point.splitOf.name}
          </button>
        </div>
      )}
      {point.anchors.length > 0 && (
        <Section title={W.anchors}>
          <Anchors anchors={point.anchors} />
        </Section>
      )}
      {point.cautions.length > 0 && (
        <Section title={W.cautions}>
          {point.cautions.map((c, i) => (
            <Card key={i} className="flex flex-col gap-2">
              <div>{c.text}</div>
              <Anchors anchors={c.anchors} />
            </Card>
          ))}
        </Section>
      )}
      <ClauseList title={W.pointFrom} clauses={into} />
      <ClauseList title={W.pointTo} clauses={from} />
      <TargetReview
        target={{ kind: 'point', id: point.id }}
        current={{
          kind: 'point',
          name: point.name,
          sentence: point.sentence,
          threshold: point.threshold === true,
        }}
        onChanged={r.reload}
      />
    </div>
  );
}

function PointHead(props: { point: PointView }) {
  const p = props.point;
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground text-xs">{W.point}</div>
      <h2 className="font-serif text-lg">{p.name}</h2>
      <div className="flex flex-wrap items-center gap-1.5">
        <SourceBadge source={p.source} note={p.sourceNote} />
        {p.threshold === true && <Badge tone="accent">{W.threshold}</Badge>}
        {p.scope !== undefined && <Badge>{W.scope[p.scope]}</Badge>}
        <ReviewMarks correction={p.correction} candidates={p.candidates} />
      </div>
      <div className="text-muted-foreground text-xs">{p.sourceNote}</div>
      <p className="font-serif leading-relaxed">{p.sentence}</p>
    </div>
  );
}

function ClauseList(props: { title: string; clauses: ClauseView[] }) {
  const panel = usePanel();
  if (props.clauses.length === 0) return null;
  return (
    <Section title={props.title}>
      {props.clauses.map((c) => (
        <button
          key={c.id}
          type="button"
          className="bg-card hover:bg-accent/40 flex flex-col gap-1 rounded-xl border p-3 text-left text-sm shadow-xs"
          onClick={() => panel.show({ kind: 'clause', id: c.id })}
        >
          <span className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            {c.from.map((f) => f.name).join(' + ')} → {c.to.name}
            <SourceBadge source={c.source} note={c.sourceNote} />
            <ReviewMarks correction={c.correction} candidates={c.candidates} />
          </span>
          <span className="line-clamp-3">{c.text}</span>
        </button>
      ))}
    </Section>
  );
}

export function ClausePanel(props: { id: string }) {
  const r = useLoad(`clause:${props.id}`, () => api.clause(props.id), false);
  const panel = usePanel();
  if (!r.data) return <Loading error={r.error} />;
  const c = r.data.clause;
  const link = (p: { id: string; name: string }) => (
    <button
      key={p.id}
      type="button"
      className="underline underline-offset-4"
      onClick={() => panel.show({ kind: 'point', id: p.id })}
    >
      {p.name}
    </button>
  );
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground text-xs">{W.clause}</div>
        <h2 className="flex flex-wrap items-center gap-1.5 font-serif text-lg">
          {c.from.map((f, i) => (
            <span key={f.id}>
              {i > 0 && ' + '}
              {link(f)}
            </span>
          ))}
          <span>→</span>
          {link(c.to)}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceBadge source={c.source} note={c.sourceNote} />
          <ReviewMarks correction={c.correction} candidates={c.candidates} />
          <span className="text-muted-foreground text-xs">{c.sourceNote}</span>
        </div>
        <p className="font-serif leading-relaxed whitespace-pre-wrap">{c.text}</p>
      </div>
      <CorrectionNote mark={c.correction} />
      {c.anchors.length > 0 && (
        <Section title={W.anchors}>
          <Anchors anchors={c.anchors} />
        </Section>
      )}
      {c.notes.length > 0 && (
        <Section title={W.extraNotes}>
          <ul className="flex list-disc flex-col gap-1 ps-5 text-sm">
            {c.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Section>
      )}
      <TargetReview
        target={{ kind: 'clause', id: c.id }}
        current={{ kind: 'clause', text: c.text }}
        onChanged={r.reload}
      />
    </div>
  );
}
