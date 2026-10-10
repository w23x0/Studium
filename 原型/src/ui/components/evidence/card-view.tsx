// 一组“接下来学哪个”的选项：每项为什么推荐、这一步的安排、出处（可点开知识点、之前的对话）。
import { useEffect } from 'react';
import type { CardOptionView, SourceView } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { sourceText } from '../../evidence-model.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Field, Loading, ModelLine, Section, TicketBlock, Time } from './parts.tsx';

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
        <ModelLine model={card.model} />
      </div>
      {card.options.map((o) => (
        <OptionBlock key={o.index} option={o} active={o.index === option} />
      ))}
    </div>
  );
}

function OptionBlock(props: { option: CardOptionView; active: boolean }) {
  const o = props.option;
  return (
    <Card id={`option-${String(o.index)}`} active={props.active} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{o.title}</span>
        {o.recommended && <Badge tone="accent">{W.recommended}</Badge>}
        {o.chosen && <Badge tone="good">{W.chosen}</Badge>}
      </div>
      {o.reason !== '' && <div>{o.reason}</div>}
      <TicketBlock ticket={o.ticket} />
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
  const open: (() => void) | undefined =
    s.kind === 'm08_point' && s.resolved
      ? () => panel.show({ kind: 'point', id: s.raw.trim() })
      : s.kind === 'm08_clause' && s.resolved
        ? () => panel.show({ kind: 'clause', id: s.raw.trim() })
        : s.kind === 'm09_record' && s.resolved
          ? () => panel.show({ kind: 'learned', recordId: s.raw.trim() })
          : s.kind === 'loop_line' && s.sessionId !== undefined && s.line !== undefined
            ? () =>
                s.sessionId !== undefined &&
                s.line !== undefined &&
                panel.jump(s.sessionId, [s.line])
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
