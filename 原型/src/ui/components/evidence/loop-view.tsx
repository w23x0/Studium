// 一段学习的依据：开场安排、从哪来与中途经过（先停一下、没学完的地方）、老师的观察记录、
// 每次是否学会的判断（理由、原话、不同看法）、用到的教法。
import { useEffect, useRef } from 'react';
import type { GuardVerdictView, LoopEvidence } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { toolCounts } from '../../teaching-model.ts';
import { ToolChip } from './tools-view.tsx';
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
            <Time at={d.at} />
          </Card>
        ))}
      </Section>

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
