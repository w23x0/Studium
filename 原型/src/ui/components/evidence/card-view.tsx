// 一组“接下来学哪个”的选项：卡头是这次的路线决定（决定、理由、依据可点开）；每项为什么推荐、
// 单子按文字逐行（出处可点开）、出处；每项可以“改一改再开始”。
import { useEffect, useState } from 'react';
import type { CardOptionView, RouteDecisionView, SourceView } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { sourceText } from '../../evidence-model.ts';
import { bookLineTarget } from '../../source-model.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { useOpenSession } from '../../open-session.ts';
import { usePanel } from '../../panel.ts';
import { ticketRows } from '../../ticket-model.ts';
import { W } from '../../wording.ts';
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
        <h2 className="font-serif text-lg">{W.pickOne}</h2>
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
        <OptionBlock
          key={o.index}
          cardId={cardId}
          option={o}
          active={o.index === option}
          chosenLoopId={card.chosen?.option === o.index ? card.chosen.loopSessionId : undefined}
        />
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
        <span className="text-muted-foreground text-xs">{d.reason}</span>
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

function OptionBlock(props: {
  cardId: string;
  option: CardOptionView;
  active: boolean;
  chosenLoopId: string | undefined;
}) {
  const o = props.option;
  const open = useOpenSession();
  const panel = usePanel();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  /** 先选定，再打开这次学习并把改单子的表单展开。 */
  const editFirst = () => {
    setBusy(true);
    setError(undefined);
    api
      .choose(props.cardId, o.index)
      .then((r) => {
        open(r.loopSessionId);
        panel.show({ kind: 'loop', loopId: r.loopSessionId, editTicket: true });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };
  return (
    <Card id={`option-${String(o.index)}`} active={props.active} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{o.title}</span>
        {o.recommended && <Badge tone="accent">{W.recommended}</Badge>}
        {o.chosen && <Badge tone="good">{W.chosen}</Badge>}
      </div>
      {o.reason !== '' && <div>{o.reason}</div>}
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
      {props.chosenLoopId === undefined && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="text-primary text-xs hover:underline disabled:opacity-60"
            onClick={editFirst}
          >
            {W.ticketEditOpen}
          </button>
          {error !== undefined && <span className="text-destructive text-xs">{error}</span>}
        </div>
      )}
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
