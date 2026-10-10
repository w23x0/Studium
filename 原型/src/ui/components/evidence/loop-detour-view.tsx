// 一段学习的中途经过（批 5）：从哪来（“下一步学什么”里选的 / 从哪段岔出来）、岔出去补的回来没有、
// 中途提过的“先停一下”（依据原话可跳回）与给的选择、没学完的地方记录。
import { ArrowRightIcon, MessageSquareQuoteIcon } from 'lucide-react';
import type {
  DetourCardView,
  ForkOriginView,
  LoopEvidence,
  ParkingView,
  RouteSignalView,
} from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { useOpenSession } from '../../open-session.ts';
import { usePanel } from '../../panel.ts';
import { learnerShelveNote } from '../../thread-model.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Field, ModelLine, PointLink, Quote, Section, Time } from './parts.tsx';

export function LoopDetours(props: { loop: LoopEvidence }) {
  const { loop } = props;
  const shelvedNote = loop.shelved !== undefined ? learnerShelveNote(loop.shelved.note) : undefined;
  return (
    <>
      <Section title={W.origin}>
        {loop.fork !== undefined ? (
          <ForkOrigin fork={loop.fork} />
        ) : (
          <CardOrigin loopId={loop.sessionId} mainId={loop.mainSessionId} />
        )}
      </Section>

      {loop.forks.length > 0 && (
        <Section title={W.forksOut}>
          {loop.forks.map((f) => (
            <ForkLine
              key={f.forkLoopSessionId}
              id={f.forkLoopSessionId}
              title={f.title}
              at={f.openedAt}
              returned={f.returned}
            />
          ))}
        </Section>
      )}

      {loop.signals.length > 0 && (
        <Section title={W.signals} hint={W.signalsHint}>
          {[...loop.signals].reverse().map((s) => (
            <SignalCard
              key={s.line}
              signal={s}
              loopId={loop.sessionId}
              card={loop.detours.find((d) => d.signalLine === s.line)}
            />
          ))}
        </Section>
      )}

      {loop.shelved !== undefined && (
        <Section title={W.groups.shelved}>
          <Card>
            <div className="flex items-center justify-between gap-2">
              <Badge tone="warn">{W.shelvedBadge}</Badge>
              <Time at={loop.shelved.at} />
            </div>
            {shelvedNote !== undefined && (
              <div className="mt-2">
                <Field label={W.shelvedNote}>{shelvedNote}</Field>
              </div>
            )}
          </Card>
        </Section>
      )}

      {loop.parking !== undefined && (
        <Section title={W.parkingTitle}>
          <ParkingCard parking={loop.parking} loopId={loop.sessionId} />
        </Section>
      )}
    </>
  );
}

/** 从“下一步学什么”里选的：点开看当时为什么推荐。 */
function CardOrigin(props: { loopId: string; mainId?: string | undefined }) {
  const { mainId } = props;
  const r = useLoad(`relations:${mainId ?? ''}`, () =>
    mainId !== undefined ? api.loopRelations(mainId) : Promise.resolve(undefined),
  );
  const panel = usePanel();
  const origin = r.data?.relations.find((x) => x.loopSessionId === props.loopId)?.origin;
  if (origin?.kind === 'card') {
    const cardId = origin.cardId;
    return (
      <button
        type="button"
        className="text-primary flex items-center gap-1 self-start text-sm hover:underline"
        onClick={() => panel.show({ kind: 'card', cardId })}
      >
        {W.originCard} · {W.whyThis}
        <ArrowRightIcon className="size-3.5" />
      </button>
    );
  }
  return (
    <div className="text-muted-foreground text-sm">
      {mainId !== undefined && r.data === undefined && r.error === undefined
        ? W.loading
        : W.originUnknown}
    </div>
  );
}

function ForkOrigin(props: { fork: ForkOriginView }) {
  const { fork } = props;
  const open = useOpenSession();
  const panel = usePanel();
  const from = fork.fromTitle ?? W.thatPart;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">{W.originFork}</Badge>
        <button
          type="button"
          className="decoration-primary/40 hover:decoration-primary font-medium underline underline-offset-4"
          onClick={() => open(fork.fromLoop)}
        >
          《{from}》
        </button>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground text-xs"
          onClick={() => panel.show({ kind: 'loop', loopId: fork.fromLoop })}
        >
          {W.loopBasis}
        </button>
      </div>
      <Field label={W.forkWhy}>{W.signalKind[fork.kind]}</Field>
      {fork.missingPoint !== undefined && (
        <Field label={W.forkWhat}>
          <PointLink point={fork.missingPoint} />
        </Field>
      )}
      {fork.scope !== undefined && <Field label={W.detourScope}>{fork.scope}</Field>}
      <div className="text-sm">{W.forkReturn(from)}</div>
      {fork.basisLines.length > 0 && (
        <button
          type="button"
          className="text-primary flex items-center gap-1 self-start text-xs hover:underline"
          onClick={() => panel.jump(fork.fromLoop, fork.basisLines)}
        >
          <MessageSquareQuoteIcon className="size-3.5" />
          {W.forkBasis}
        </button>
      )}
    </Card>
  );
}

function ForkLine(props: {
  id: string;
  title: string;
  at: string;
  returned?: { at: string; closed: boolean; delivered: boolean } | undefined;
}) {
  const open = useOpenSession();
  const panel = usePanel();
  const r = props.returned;
  return (
    <Card className="flex items-center gap-2">
      <button
        type="button"
        className="flex-1 truncate text-left font-medium hover:underline"
        onClick={() => open(props.id)}
      >
        {props.title}
      </button>
      <Badge tone={r === undefined ? 'accent' : r.closed ? 'good' : 'warn'}>
        {r === undefined ? W.forkOut : r.closed ? W.forkBackDone : W.forkBackNot}
      </Badge>
      <Time at={r?.at ?? props.at} />
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground text-xs"
        onClick={() => panel.show({ kind: 'loop', loopId: props.id })}
      >
        {W.loopBasis}
      </button>
    </Card>
  );
}

function SignalCard(props: {
  signal: RouteSignalView;
  loopId: string;
  card: DetourCardView | undefined;
}) {
  const { signal: s, card } = props;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Badge tone="warn">{W.signalKind[s.kind]}</Badge>
        <Time at={s.at} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {s.missingPoint !== undefined && <PointLink point={s.missingPoint} />}
        <span>{s.missingText}</span>
      </div>
      {s.quotes.length > 0 && (
        <Field label={W.quotedWords}>
          <div className="flex flex-col gap-1.5">
            {s.quotes.map((q) => (
              <Quote key={q.line} quote={q} sessionId={props.loopId} />
            ))}
          </div>
        </Field>
      )}
      {s.note !== undefined && <Field label={W.signalNote}>{s.note}</Field>}
      {card !== undefined && (
        <Field label={W.offered}>
          <ul className="flex flex-col gap-1">
            {card.options.map((o, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className={card.chosen?.option === i ? 'font-medium' : ''}>{o.title}</span>
                <span className="text-muted-foreground text-xs">{W.detourKind[o.kind]}</span>
                {card.chosen?.option === i && <Badge tone="accent">{W.detourChosen}</Badge>}
              </li>
            ))}
          </ul>
          {card.chosen === undefined && (
            <span className="text-muted-foreground text-xs">{W.notChosenYet}</span>
          )}
          <ModelLine model={card.model} />
        </Field>
      )}
    </Card>
  );
}

function ParkingCard(props: { parking: ParkingView; loopId: string }) {
  const p = props.parking;
  const panel = usePanel();
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Badge tone="warn">{W.parkingReason[p.reason]}</Badge>
        <Time at={p.at} />
      </div>
      {p.missing.length > 0 && (
        <Field label={W.parkingMissing}>
          <ul className="flex flex-col gap-1">
            {p.missing.map((m, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                {m.point !== undefined && <PointLink point={m.point} />}
                <span>{m.text}</span>
              </li>
            ))}
          </ul>
        </Field>
      )}
      <Field label={W.parkingWhen}>{p.when}</Field>
      <Field label={W.parkingFrom}>{p.resumeFrom}</Field>
      {p.basisLines.length > 0 && (
        <button
          type="button"
          className="text-primary flex items-center gap-1 self-start text-xs hover:underline"
          onClick={() => panel.jump(props.loopId, p.basisLines)}
        >
          <MessageSquareQuoteIcon className="size-3.5" />
          {W.parkingWords}
        </button>
      )}
    </Card>
  );
}
