// 一段学习的依据：开场安排、从哪来与中途经过（岔开、先停一下、没学完的地方）、老师的观察记录、
// 每次是否学会的判断（理由、原话、不同看法）；每轮的教法强度与走势、用到的教法（批 7）。
import { useEffect, useRef } from 'react';
import type { GuardVerdictView, LoopEvidence } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { loopTrend, toolCounts } from '../../teaching-model.ts';
import { IntensityLine, TrendChart } from './intensity-view.tsx';
import { LoopDetours } from './loop-detour-view.tsx';
import { ToolChip } from './tools-view.tsx';
import { LoopPractice } from '../practice/loop-practice.tsx';
import {
  Badge,
  Card,
  Field,
  Loading,
  ModelLine,
  ObjectionForm,
  ObjectionList,
  Quote,
  ReasonText,
  Section,
  TicketBlock,
  Time,
} from './parts.tsx';

export function LoopView(props: {
  loopId: string;
  verdictLine?: number | undefined;
  noteLine?: number | undefined;
}) {
  const { loopId, verdictLine, noteLine } = props;
  const r = useLoad(`loop:${loopId}`, () => api.loopEvidence(loopId));
  const panel = usePanel();
  const loop = r.data?.loop;
  const focused = loop?.verdicts.find((v) => v.line === verdictLine);
  const focusLines = focused?.quotes.map((q) => q.line).join(',');
  const jump = panel.jump;
  const done = useRef('');

  // 从对话里那句提示点进来：把这次判断依据的原话在对话里标出来，面板里滚到这次判断
  useEffect(() => {
    if (verdictLine === undefined || focusLines === undefined) return;
    // 每次点进来只标一次（jump 会让外层重绘，不能因此反复触发）
    const key = `${loopId}:${String(verdictLine)}:${focusLines}`;
    if (done.current === key) return;
    done.current = key;
    if (focusLines !== '') jump(loopId, focusLines.split(',').map(Number), false);
    document
      .getElementById(`verdict-${String(verdictLine)}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [loopId, verdictLine, focusLines, jump]);

  // 从“出现在教法变化之后”点进来：滚到那一轮的观察
  const ready = loop !== undefined;
  useEffect(() => {
    if (!ready || noteLine === undefined) return;
    scrollToNote(noteLine);
  }, [ready, noteLine]);

  if (!loop) return <Loading error={r.error} />;
  const trend = loopTrend(loop.diagnoses);
  const tools = toolCounts(loop.teachingToolsUsed);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg">{loop.title}</h2>
          <Badge
            tone={
              loop.status === 'closed' ? 'good' : loop.status === 'unclosed' ? 'warn' : 'accent'
            }
          >
            {W.status[loop.status]}
          </Badge>
          {loop.shelved !== undefined && <Badge tone="warn">{W.shelvedBadge}</Badge>}
          {loop.waitingFork !== undefined && <Badge tone="accent">{W.waitingBadge}</Badge>}
          {loop.fork !== undefined && <Badge>{W.forkBadge}</Badge>}
          {loop.ticket?.revisit !== undefined && (
            <Badge tone="accent" title={W.revisitHint[loop.ticket.revisit.kind]}>
              {W.revisitKind[loop.ticket.revisit.kind]}
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground text-xs">
          <Time at={loop.openedAt} />
          {loop.endedAt !== undefined && (
            <>
              {' → '}
              <Time at={loop.endedAt} />
            </>
          )}
        </div>
        <ModelLine model={loop.model} />
      </div>

      {loop.ticket !== undefined && (
        <Section title={W.plan}>
          <Card>
            <TicketBlock ticket={loop.ticket} />
          </Card>
        </Section>
      )}

      <LoopDetours loop={loop} />

      <Regressions loop={loop} />

      <LoopPractice loopId={loop.sessionId} />

      <Section title={W.judgements}>
        {loop.verdicts.length === 0 && (
          <div className="text-muted-foreground text-sm">{W.noJudgements}</div>
        )}
        {[...loop.verdicts].reverse().map((v) => (
          <Verdict
            key={v.line}
            loop={loop}
            verdict={v}
            active={v.line === verdictLine}
            onObjected={r.reload}
          />
        ))}
      </Section>

      <Section title={W.notes} hint={W.notesHint}>
        {loop.diagnoses.length === 0 && (
          <div className="text-muted-foreground text-sm">{W.noNotes}</div>
        )}
        {loop.diagnoses.map((d) => (
          <Card
            key={d.line}
            id={`note-${String(d.line)}`}
            active={d.line === noteLine}
            className="flex flex-col gap-2"
          >
            <div className="whitespace-pre-wrap">{d.text}</div>
            {d.intensity !== undefined && (
              <IntensityLine intensity={d.intensity} sessionId={loop.sessionId} />
            )}
            <Time at={d.at} />
          </Card>
        ))}
      </Section>

      {trend !== undefined && (
        <Section title={W.intensityTrend} hint={W.intensityTrendHint}>
          <Card>
            <TrendChart trend={trend} onTurn={scrollToNote} />
          </Card>
        </Section>
      )}

      <Section title={W.toolsUsedHere} {...(tools.length > 0 ? { hint: W.toolsUsedHint } : {})}>
        {tools.length === 0 ? (
          <div className="text-muted-foreground text-sm">{W.toolsUsedNone}</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tools.map((t) => (
              <ToolChip key={t.name} name={t.name} count={t.count} />
            ))}
          </div>
        )}
      </Section>

      {loop.endNote !== undefined && (
        <Section title={W.ended}>
          <div className="text-sm">{loop.endNote}</div>
        </Section>
      )}
    </div>
  );
}

/** 老师记下的“以前会的、这次没答出来”：哪个知识点、老师觉得是什么原因、依据的原话、以前的记录。 */
function Regressions(props: { loop: LoopEvidence }) {
  const { loop } = props;
  const panel = usePanel();
  const items = loop.diagnoses.flatMap((d) => (d.regression !== undefined ? [d.regression] : []));
  if (items.length === 0) return null;
  return (
    <Section title={W.regressions} hint={W.regressionsHint}>
      <div data-testid="regressions" className="flex flex-col gap-2">
        {items.map((g) => (
          <Card key={g.line} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <span>{W.regressionLine(g.point.name)}</span>
              <Time at={g.at} />
            </div>
            <Badge tone={g.suspicion === '状态原因' ? 'neutral' : 'warn'}>
              {W.suspicion[g.suspicion]}
            </Badge>
            <span className="flex flex-wrap gap-3 text-xs">
              {g.basisLines.length > 0 && (
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => panel.jump(loop.sessionId, g.basisLines)}
                >
                  {W.jumpTo}
                </button>
              )}
              {g.against.map((id, i) => (
                <button
                  key={id}
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => panel.show({ kind: 'learned', recordId: id })}
                >
                  {W.regressionAgainst}
                  {g.against.length > 1 ? ` ${String(i + 1)}` : ''}
                </button>
              ))}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => panel.show({ kind: 'learned', point: g.point.id })}
              >
                {W.pointHistory}
              </button>
            </span>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function scrollToNote(line: number) {
  document
    .getElementById(`note-${String(line)}`)
    ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function Verdict(props: {
  loop: LoopEvidence;
  verdict: GuardVerdictView;
  active: boolean;
  onObjected: () => void;
}) {
  const { loop, verdict: v } = props;
  const yes = v.closed && v.problem === undefined;
  return (
    <Card id={`verdict-${String(v.line)}`} active={props.active} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={yes ? 'good' : 'neutral'}>{yes ? W.judgedYes : W.judgedNo}</Badge>
        <Time at={v.at} />
      </div>
      {v.request !== undefined && (
        <div className="text-muted-foreground text-xs">{W.askedBy(v.request.by)}</div>
      )}
      <Field label={W.reason}>
        <ReasonText text={v.basis} sessionId={loop.sessionId} />
      </Field>
      {v.problem !== undefined && <Field label={W.problem}>{v.problem}</Field>}
      {v.quotes.length > 0 && (
        <Field label={W.quotedWords}>
          <div className="flex flex-col gap-1.5">
            {v.quotes.map((q) => (
              <Quote key={q.line} quote={q} sessionId={loop.sessionId} />
            ))}
          </div>
        </Field>
      )}
      <ModelLine model={v.model} />
      <ObjectionList objections={v.objections} />
      <ObjectionForm
        label={W.objectJudgement}
        submit={(text) =>
          api.objectToVerdict(loop.sessionId, v.line, text).then((x) => x.objection)
        }
        onDone={props.onObjected}
      />
    </Card>
  );
}
