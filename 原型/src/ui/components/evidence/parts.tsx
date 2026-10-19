// 依据面板里反复用到的小块：小节、标签、模型、点的名字、原话、不同看法。
import { useState, type ReactNode } from 'react';
import { CornerDownRightIcon, MessageSquareQuoteIcon } from 'lucide-react';
import type {
  ModelInfo,
  ObjectionView,
  PointRef,
  QuoteView,
  TicketView,
} from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { segmentLines, shortTime, splitLineRefs } from '../../evidence-model.ts';
import { usePanel } from '../../panel.ts';
import { citationPieces } from '../../source-model.ts';
import { CitationChip, CitationsProvider } from '../sources/citation.tsx';
import { W } from '../../wording.ts';

export function Section(props: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-2', props.className)}>
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide">{props.title}</h3>
      {props.hint !== undefined && (
        <p className="text-muted-foreground -mt-1 text-xs leading-relaxed">{props.hint}</p>
      )}
      {props.children}
    </section>
  );
}

export function Card(props: {
  children: ReactNode;
  className?: string;
  id?: string;
  active?: boolean;
}) {
  return (
    <div
      id={props.id}
      className={cn(
        'bg-card rounded-xl border p-3 text-sm leading-relaxed shadow-xs',
        props.active === true && 'ring-primary/50 ring-2',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-muted-foreground text-xs">{props.label}</div>
      <div className="whitespace-pre-wrap">{props.children}</div>
    </div>
  );
}

type Tone = 'neutral' | 'good' | 'warn' | 'accent';
const TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  accent: 'bg-primary/10 text-primary',
};

export function Badge(props: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span
      title={props.title}
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[0.7rem] font-medium',
        TONES[props.tone ?? 'neutral'],
      )}
    >
      {props.children}
    </span>
  );
}

/** 模型名；取不到实际执行的模型时标“兜底”并写明。 */
export function ModelLine(props: { model: ModelInfo; label?: string }) {
  const { model } = props;
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
      <span>
        {props.label ?? W.modelLabel}：{model.name}
      </span>
      {!model.known && (
        <>
          <Badge tone="warn">{W.modelFallback}</Badge>
          {model.note !== undefined && <span className="w-full">{model.note}</span>}
        </>
      )}
    </div>
  );
}

/** 一个点的名字（不再查知识点库，就是它自己）。 */
export function PointLink(props: { point: PointRef }) {
  return <span>{props.point.name}</span>;
}

/** 一次学习开场时的安排：要学什么、预期理解、从哪出发、对资料核的结果。 */
export function TicketBlock(props: { ticket: TicketView }) {
  const { ticket } = props;
  return (
    <div className="flex flex-col gap-3">
      <Field label={W.newPoint}>
        <span>{ticket.newPoint}</span>
      </Field>
      <Field label={W.clause}>
        <span>{ticket.clause}</span>
      </Field>
      {ticket.startPoints.length > 0 && (
        <Field label={W.startPoints}>
          <ul className="flex flex-col gap-1">
            {ticket.startPoints.map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <CornerDownRightIcon className="text-muted-foreground size-3.5" />
                <span>{s.point}</span>
                <Badge>{W.startSource[s.source]}</Badge>
                {s.ref !== undefined && (
                  <span className="text-muted-foreground text-xs">{s.ref}</span>
                )}
              </li>
            ))}
          </ul>
        </Field>
      )}
      {ticket.sourceCheck.length > 0 && (
        <Field label={W.sourceCheck}>
          <ul className="flex flex-col gap-1">
            {ticket.sourceCheck.map((c, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span>{c.claim}</span>
                {c.at !== undefined && (
                  <span className="text-muted-foreground text-xs">{c.at}</span>
                )}
                {c.modelAdded === true && <Badge tone="warn">{W.modelAdded}</Badge>}
              </li>
            ))}
          </ul>
        </Field>
      )}
      {ticket.routeAction !== '' && <Field label={W.routeAction}>{ticket.routeAction}</Field>}
      {ticket.revisit !== undefined && (
        <div className="flex items-center gap-2 text-xs">
          <Badge tone="accent">{W.revisitKind[ticket.revisit.kind]}</Badge>
          <span className="text-muted-foreground">{W.revisitHint[ticket.revisit.kind]}</span>
        </div>
      )}
    </div>
  );
}

/** 一句原话，可跳回对话里那一句。 */
export function Quote(props: { quote: QuoteView; sessionId: string }) {
  const panel = usePanel();
  const { quote } = props;
  return (
    <div className="bg-muted/60 flex flex-col gap-1 rounded-lg px-3 py-2">
      <div className="text-[0.92rem] whitespace-pre-wrap">
        {quote.text !== undefined ? <QuoteText text={quote.text} /> : W.notAvailable}
      </div>
      <button
        type="button"
        className="text-primary flex items-center gap-1 self-start text-xs hover:underline"
        onClick={() => panel.jump(props.sessionId, [quote.line])}
      >
        <MessageSquareQuoteIcon className="size-3.5" />
        {W.jumpTo}
      </button>
    </div>
  );
}

/** 引用的原话：里面的教材出处标记画成出处小标签（代码里的不换），别的照原样。 */
function QuoteText(props: { text: string }) {
  const pieces = citationPieces(props.text);
  if (pieces.every((p) => 'text' in p)) return <>{props.text}</>;
  return (
    <CitationsProvider text={props.text} done>
      {pieces.map((p, i) =>
        'cite' in p ? <CitationChip key={i} index={p.cite} /> : <span key={i}>{p.text}</span>,
      )}
    </CitationsProvider>
  );
}

/** 理由文字：里面引用的行号做成可跳转的。 */
export function ReasonText(props: { text: string; sessionId: string }) {
  const panel = usePanel();
  return (
    <span className="whitespace-pre-wrap">
      {splitLineRefs(props.text).map((s, i) =>
        'line' in s ? (
          <button
            key={i}
            type="button"
            className="text-primary mx-0.5 hover:underline"
            onClick={() => panel.jump(props.sessionId, segmentLines(s))}
          >
            {s.text}
          </button>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}

export function ObjectionList(props: { objections: ObjectionView[] }) {
  if (props.objections.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-muted-foreground text-xs">{W.objections}</div>
      {props.objections.map((o) => (
        <div
          key={o.id}
          className="border-primary/30 bg-primary/5 rounded-lg border px-3 py-2 text-[0.9rem]"
        >
          <div className="whitespace-pre-wrap">{o.text}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">{shortTime(o.at)}</div>
        </div>
      ))}
    </div>
  );
}

/** “我觉得不对” → 写理由 → 提交。 */
export function ObjectionForm(props: {
  label: string;
  submit: (text: string) => Promise<{ inLoop: boolean }>;
  onDone?: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(props.defaultOpen === true);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  if (done !== undefined) {
    return <div className="text-muted-foreground text-xs">{done}</div>;
  }
  if (!open) {
    return (
      <Button variant="ghost" size="xs" className="self-start" onClick={() => setOpen(true)}>
        {props.label}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="bg-background focus:border-foreground/30 min-h-20 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
        placeholder={W.objectPlaceholder}
        aria-label={props.label}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
      />
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {W.objectCancel}
        </Button>
        <Button
          size="sm"
          disabled={busy || text.trim() === ''}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            props
              .submit(text.trim())
              .then((r) => {
                setDone(r.inLoop ? W.objectSentInLoop : W.objectSent);
                props.onDone?.();
              })
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {W.objectSubmit}
        </Button>
      </div>
    </div>
  );
}

export function Loading(props: { error?: string | undefined }) {
  return (
    <div className="text-muted-foreground p-1 text-sm">
      {props.error !== undefined ? `${W.loadFailed}${props.error}` : W.loading}
    </div>
  );
}

export function Time(props: { at: string }) {
  return <span className="text-muted-foreground text-xs">{shortTime(props.at)}</span>;
}
