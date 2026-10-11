// 练习里看到的（批 9）：“常犯的错”（同一类错在两段以上的学习里出现，哪几段、哪几句，可跳回）与
// “这类题怎么想”（据做完的练习写的归纳，先看头一句，点开看全文与依据）。依据面板与项目概览共用。
import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, LayersIcon, TriangleAlertIcon } from 'lucide-react';
import type { ErrorPatternView, PracticeSummaryView } from '../../../shared/protocol.ts';
import { cn } from '@/lib/utils';
import { practiceApi } from '../../api-practice.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { firstLine } from '../../practice-model.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Loading, Section, Time } from '../evidence/parts.tsx';

const WP = W.practice;

/** 依据面板里的一页：常犯的错 + 这类题怎么想。summary 给了就展开那一份。 */
export function PracticeReviewView(props: { summary?: string | undefined }) {
  const p = useLoad('practice:patterns', () => practiceApi.errorPatterns());
  const s = useLoad('practice:summaries', () => practiceApi.summaries());
  return (
    <div className="flex flex-col gap-6" data-testid="practice-review">
      <h2 className="font-serif text-lg">{WP.reviewTitle}</h2>
      <Section title={WP.patterns} hint={WP.patternsHint}>
        {p.data === undefined ? (
          <Loading error={p.error} />
        ) : (
          <Patterns patterns={p.data.patterns} others={p.data.others} />
        )}
      </Section>
      <Section title={WP.summaries} hint={WP.summariesHint}>
        {s.data === undefined ? (
          <Loading error={s.error} />
        ) : s.data.summaries.length === 0 ? (
          <div className="text-muted-foreground text-sm">{WP.summariesNone}</div>
        ) : (
          [...s.data.summaries]
            .reverse()
            .map((x) => <SummaryItem key={x.id} summary={x} open={x.id === props.summary} />)
        )}
      </Section>
    </div>
  );
}

/** 项目概览里的一节：有内容时才显示（两样都还没有就不占地方）。 */
export function PracticeOverview() {
  const p = useLoad('practice:patterns', () => practiceApi.errorPatterns());
  const s = useLoad('practice:summaries', () => practiceApi.summaries());
  const panel = usePanel();
  const patterns = p.data?.patterns ?? [];
  const summaries = s.data?.summaries ?? [];
  if (patterns.length === 0 && summaries.length === 0) return null;
  return (
    <section data-testid="practice-overview" className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2 [&_svg]:size-4 [&_svg]:self-center">
        <LayersIcon className="text-primary" />
        <h2 className="font-medium">{WP.reviewTitle}</h2>
        <button
          type="button"
          className="text-primary ms-auto text-xs hover:underline"
          onClick={() => panel.show({ kind: 'practice' })}
        >
          {WP.summaryOpen}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        <Section title={WP.patterns}>
          {patterns.length === 0 ? (
            <div className="text-muted-foreground text-sm">{WP.patternsNone}</div>
          ) : (
            patterns.map((x) => <PatternItem key={x.label} pattern={x} />)
          )}
        </Section>
        <Section title={WP.summaries}>
          {summaries.length === 0 ? (
            <div className="text-muted-foreground text-sm">{WP.summariesNone}</div>
          ) : (
            [...summaries].reverse().map((x) => <SummaryItem key={x.id} summary={x} />)
          )}
        </Section>
      </div>
    </section>
  );
}

function Patterns(props: { patterns: ErrorPatternView[]; others: ErrorPatternView[] }) {
  const [showOthers, setShowOthers] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {props.patterns.length === 0 ? (
        <div className="text-muted-foreground text-sm">{WP.patternsNone}</div>
      ) : (
        props.patterns.map((x) => <PatternItem key={x.label} pattern={x} />)
      )}
      {props.others.length > 0 && (
        <>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs"
            onClick={() => setShowOthers((v) => !v)}
          >
            {showOthers ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
            {WP.othersTitle} · {props.others.length}
          </button>
          {showOthers && props.others.map((x) => <PatternItem key={x.label} pattern={x} />)}
        </>
      )}
    </div>
  );
}

/** 一类错：叫什么、出现在几段学习里；每次出现在哪段（可跳回那几句）、当时怎么说的。 */
function PatternItem(props: { pattern: ErrorPatternView }) {
  const x = props.pattern;
  const panel = usePanel();
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TriangleAlertIcon className="size-3.5 shrink-0 text-amber-600" />
        <span className="font-medium">{x.label}</span>
        <span className="ms-auto">
          <Badge tone={x.loops >= 2 ? 'warn' : 'neutral'}>{WP.patternLoops(x.loops)}</Badge>
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {x.occurrences.map((o) => (
          <li key={`${o.feedbackId}:${o.detail}`} className="flex flex-col gap-0.5 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="decoration-primary/40 hover:decoration-primary text-left underline underline-offset-4"
                onClick={() =>
                  panel.jump(
                    o.loopSessionId,
                    o.lines.map((l) => l.line),
                  )
                }
              >
                《{o.loopTitle ?? WP.inThatPart}》
              </button>
              <Time at={o.at} />
            </span>
            {o.detail !== '' && <span className="text-muted-foreground">{o.detail}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** 一份“这类题怎么想”：先看头一句，点开看全文、据哪些练习、用到的原话（可跳回）。 */
export function SummaryItem(props: { summary: PracticeSummaryView; open?: boolean }) {
  const x = props.summary;
  const [open, setOpen] = useState(props.open === true);
  const panel = usePanel();
  const id = `summary-${x.id}`;
  useEffect(() => {
    if (props.open === true) {
      document.getElementById(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [props.open, id]);
  return (
    <Card id={id} active={props.open === true} className="flex flex-col gap-2">
      <button
        type="button"
        className="flex items-start gap-1.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <ChevronDownIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        ) : (
          <ChevronRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        )}
        <span className={cn('flex-1', !open && 'line-clamp-2')}>{firstLine(x.text)}</span>
      </button>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 ps-5 text-xs">
        <span>{WP.summaryBy[x.requestedBy]}</span>
        <Time at={x.at} />
      </div>
      {open && (
        <div className="flex flex-col gap-2 ps-5">
          <div className="font-serif leading-relaxed whitespace-pre-wrap">{x.text}</div>
          {x.tasks.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="text-muted-foreground text-xs">{WP.summaryFrom}</div>
              {x.tasks.map((t) => (
                <button
                  key={`${t.loopSessionId}:${t.taskId}`}
                  type="button"
                  className="text-primary self-start text-left text-sm hover:underline"
                  onClick={() => panel.show({ kind: 'loop', loopId: t.loopSessionId })}
                >
                  {t.focus}
                </button>
              ))}
            </div>
          )}
          {x.evidence.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-muted-foreground text-xs">{WP.summaryWords}</div>
              {x.evidence.map((e) => (
                <button
                  key={`${e.loopSessionId}:${String(e.line)}`}
                  type="button"
                  className="bg-muted/60 hover:bg-muted line-clamp-3 rounded-lg px-2.5 py-1.5 text-left text-sm whitespace-pre-wrap"
                  onClick={() => panel.jump(e.loopSessionId, [e.line])}
                >
                  {e.text}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground self-start text-xs"
            onClick={() => setOpen(false)}
          >
            {WP.collapse}
          </button>
        </div>
      )}
    </Card>
  );
}
