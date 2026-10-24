// 导航定下的下一次学习：头上是这次的路线决定（决定、理由、依据可点开）；下面是为什么是它、
// 单子按文字逐行（出处可点开）、出处。单子要改在那次学习里改。
import { useEffect } from 'react';
import type { CardOptionView, RouteDecisionView, SourceView } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { sourceText } from '../../evidence-model.ts';
import { bookLineTarget } from '../../source-model.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { ticketRows } from '../../ticket-model.ts';
import { W } from '../../wording.ts';
import { forLearner } from '../../learner-text.ts';
import { Badge, Card, Field, Loading, ModelLine, Section, TicketRowList, Time } from './parts.tsx';

export function CardEvidence(props: { cardId: string; option?: number | undefined }) {
  const { cardId, option } = props;
  const r = useLoad(`card:${cardId}`, () => api.card(cardId));
  const card = r.data?.card;
  const ready = card !== undefined;
  useEffect(() => {
    if (!ready || option === undefined) return;
    document
      .getElementById(`option-${String(option)}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [ready, option]);
  if (!card) return <Loading error={r.error} />;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-lg">{W.whyNext}</h2>
        <Time at={card.at} />
        {card.trigger !== '' && (
          <Field label={W.cardTrigger}>
            <span className="text-sm">{card.trigger}</span>
          </Field>
        )}
        {card.routeDecision !== undefined && <RouteDecision view={card.routeDecision} />}
        <ModelLine model={card.model} />
      </div>
      {card.options.map((o) => (
        <OptionBlock key={o.index} option={o} active={o.index === option} />
      ))}
    </div>
  );
}

/** 这次的路线决定：怎么定的、为什么、依据（可点开）；被后来的决定取代时标出来。 */
function RouteDecision(props: { view: RouteDecisionView }) {
  const d = props.view;
  return (
    <Field label={W.routeDecision}>
      <span className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span>{d.decision}</span>
          {d.superseded && <Badge tone="warn">{W.routeDecisionSuperseded}</Badge>}
        </span>
        <span className="text-muted-foreground text-xs">{forLearner(d.reason)}</span>
        {d.basis.length > 0 && (
          <span className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs">{W.routeDecisionBasis}</span>
            <ul className="flex flex-col gap-1.5">
              {d.basis.map((s, i) => (
                <SourceItem key={i} source={s} />
              ))}
            </ul>
          </span>
        )}
      </span>
    </Field>
  );
}

function OptionBlock(props: { option: CardOptionView; active: boolean }) {
  const o = props.option;
  return (
    <Card id={`option-${String(o.index)}`} active={props.active} className="flex flex-col gap-3">
      <div className="font-medium">{o.title}</div>
      {o.reason !== '' && <div>{forLearner(o.reason)}</div>}
      <TicketRowList rows={ticketRows(o.ticket, o.ticket.refs)} />
      <Section title={W.sources}>
        {o.sources === undefined || o.sources.length === 0 ? (
          <div className="text-muted-foreground text-sm">{W.noSources}</div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {o.sources.map((s, i) => (
              <SourceItem key={i} source={s} />
            ))}
          </ul>
        )}
      </Section>
    </Card>
  );
}

function SourceItem(props: { source: SourceView }) {
  const panel = usePanel();
  const s = props.source;
  const t = sourceText(s);
  const book = bookLineTarget(s);
  const open: (() => void) | undefined =
    book !== undefined
      ? () => panel.show(book)
      : s.kind === 'loop_line' && s.sessionId !== undefined && s.line !== undefined
        ? () =>
            s.sessionId !== undefined && s.line !== undefined && panel.jump(s.sessionId, [s.line])
        : undefined;
  const body = (
    <>
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <Badge>{t.kind}</Badge>
        <span className="text-foreground font-medium">{t.title}</span>
      </span>
      {t.detail !== undefined && (
        <span className="text-muted-foreground line-clamp-3 text-[0.85rem]">{t.detail}</span>
      )}
    </>
  );
  return (
    <li>
      {open ? (
        <button
          type="button"
          className="hover:bg-accent/60 -mx-1 flex w-full flex-col gap-1 rounded-md px-1 py-1 text-left"
          onClick={open}
        >
          {body}
        </button>
      ) : (
        <div className="flex flex-col gap-1 py-1">{body}</div>
      )}
    </li>
  );
}
