// 一段学习的依据：收尾那一句（学习对话写的）、读过的做法参考（教学工具）；没合上的另带结束原话。
// 旧数据：单子（按文字逐行，只读）与改过的几行、守卫写的收尾记录（理解逐条带证据强度、理由、原话、不同看法）、当时的路线决定。
import { useEffect, useRef } from 'react';
import type {
  ClosingView,
  GuardVerdictView,
  LoopEvidence,
  SourceView,
  TicketEditView,
  TicketView,
} from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { editedFields, refLink, ticketRowsOf } from '../../ticket-model.ts';
import { understandingRows } from '../../verdict-model.ts';
import { W } from '../../wording.ts';
import { forLearner } from '../../learner-text.ts';
import { toolCounts } from '../../teaching-model.ts';
import { ToolChip } from './tool-chip.tsx';
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
  TicketRowList,
  Time,
} from './parts.tsx';

export function LoopView(props: { loopId: string; focusLine?: number | undefined }) {
  const { loopId, focusLine } = props;
  const r = useLoad(`loop:${loopId}`, () => api.loopEvidence(loopId));
  const panel = usePanel();
  const loop = r.data?.loop;
  // 点进来的是收尾那一句：只在面板里滚到它；旧数据的守卫判定另把依据的原话在对话里标出来
  const focusedVerdict = loop?.verdicts.find((v) => v.line === focusLine);
  const focusedClosing = loop?.closings.find((c) => c.line === focusLine);
  const focusLines =
    focusedVerdict !== undefined
      ? focusedVerdict.quotes.map((q) => q.line).join(',')
      : focusedClosing !== undefined
        ? ''
        : undefined;
  const jump = panel.jump;
  const done = useRef('');

  // 从对话里那句提示点进来：面板里滚到这次收尾（旧数据另把依据的原话在对话里标出来）
  useEffect(() => {
    if (focusLine === undefined || focusLines === undefined) return;
    // 每次点进来只标一次（jump 会让外层重绘，不能因此反复触发）
    const key = `${loopId}:${String(focusLine)}:${focusLines}`;
    if (done.current === key) return;
    done.current = key;
    if (focusLines !== '') jump(loopId, focusLines.split(',').map(Number), false);
    document
      .getElementById(`close-${String(focusLine)}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [loopId, focusLine, focusLines, jump]);

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

      {loop.ticket !== undefined && <TicketSection loopId={loopId} ticket={loop.ticket} />}

      <Section title={W.judgements}>
        {loop.closings.length === 0 && loop.verdicts.length === 0 && (
          <div className="text-muted-foreground text-sm">{W.noJudgements}</div>
        )}
        {[...loop.closings].reverse().map((c) => (
          <ClosingCard key={c.line} loopId={loopId} closing={c} active={c.line === focusLine} />
        ))}
        {[...loop.verdicts].reverse().map((v) => (
          <Verdict
            key={v.line}
            loop={loop}
            verdict={v}
            active={v.line === focusLine}
            onObjected={r.reload}
          />
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

      {loop.routeDecision !== undefined && (
        <Section title={W.routeDecision}>
          <Card className="flex flex-col gap-2">
            <span className="flex flex-wrap items-center gap-2">
              <span>{loop.routeDecision.decision}</span>
              {loop.routeDecision.superseded && (
                <Badge tone="warn">{W.routeDecisionSuperseded}</Badge>
              )}
            </span>
            <span className="text-muted-foreground text-xs">
              {forLearner(loop.routeDecision.reason)}
            </span>
            <SourceList sources={loop.routeDecision.basis} />
          </Card>
        </Section>
      )}
    </div>
  );
}

/** 旧数据：单子逐行显示、改过的几行（W12 撤掉单子，只读看）。 */
function TicketSection(props: { loopId: string; ticket: TicketView }) {
  return (
    <Section title={W.plan}>
      <Card className="flex flex-col gap-3">
        <TicketRowList rows={ticketRowsOf(props.ticket)} />
        {props.ticket.edits.length > 0 && (
          <Edits loopId={props.loopId} edits={props.ticket.edits} />
        )}
      </Card>
    </Section>
  );
}

/** 改过的几行：每条能跳到正本里那一行。 */
function Edits(props: { loopId: string; edits: TicketEditView[] }) {
  return (
    <Field label={W.ticketEdits}>
      <span className="flex flex-col gap-1">
        {props.edits.map((e) => (
          <span key={e.line} className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {W.ticketEditedFields(editedFields(e.before, e.after).join('、'))}
            </span>
            <Time at={e.at} />
            <JumpLine loopId={props.loopId} line={e.line} label={W.ticketEditSee} />
          </span>
        ))}
      </span>
    </Field>
  );
}

function JumpLine(props: { loopId: string; line: number; label: string }) {
  const panel = usePanel();
  return (
    <button
      type="button"
      className="text-primary text-xs hover:underline"
      onClick={() => panel.jump(props.loopId, [props.line])}
    >
      {props.label}
    </button>
  );
}

function SourceList(props: { sources: SourceView[] }) {
  const panel = usePanel();
  return (
    <span className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs">{W.routeDecisionBasis}</span>
      {props.sources.map((s, i) => {
        const link = refLink(s);
        const body = (
          <span className="text-xs">
            <Badge>{W.sourceKind[s.kind]}</Badge> {s.label}
          </span>
        );
        return link === undefined ? (
          <span key={i} className="text-muted-foreground">
            {body}
          </span>
        ) : (
          <button
            key={i}
            type="button"
            className="text-left hover:underline"
            onClick={() =>
              link.kind === 'panel'
                ? panel.show(link.target)
                : panel.jump(link.sessionId, link.lines)
            }
          >
            {body}
          </button>
        );
      })}
    </span>
  );
}

/** 收尾那一句（10-31 起学习对话写的）：原样一句，可跳回对话里那一行；没有判定，也就没有对判定的异议。 */
function ClosingCard(props: { loopId: string; closing: ClosingView; active: boolean }) {
  const c = props.closing;
  return (
    <Card id={`close-${String(c.line)}`} active={props.active} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Badge tone="good">{W.closingByModel}</Badge>
        <Time at={c.at} />
      </div>
      {c.learnerAsked !== undefined && (
        <div className="text-muted-foreground text-xs">{W.closingAsked}</div>
      )}
      <div className="text-sm whitespace-pre-wrap">{c.summary}</div>
      {c.reason !== undefined && <Field label={W.closingWhy}>{c.reason}</Field>}
      <span>
        <JumpLine loopId={props.loopId} line={c.line} label={W.jumpTo} />
      </span>
    </Card>
  );
}

/** 旧数据：守卫写的收尾记录（10-31 起不再产生）；对它的异议只在这里提。 */
function Verdict(props: {
  loop: LoopEvidence;
  verdict: GuardVerdictView;
  active: boolean;
  onObjected: () => void;
}) {
  const { loop, verdict: v } = props;
  // 守卫 10-23 起不把关：只分整理成了没有（10-23 前判“没合上”的旧记录也算整理成了）
  const yes = v.problem === undefined;
  return (
    <Card id={`close-${String(v.line)}`} active={props.active} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <Badge tone={yes ? 'good' : 'neutral'}>{yes ? W.judgedYes : W.judgedNo}</Badge>
          <Badge tone="neutral">{W.oldRecord}</Badge>
        </span>
        <Time at={v.at} />
      </div>
      {v.request !== undefined && (
        <div className="text-muted-foreground text-xs">{W.askedBy(v.request.by)}</div>
      )}
      <VerdictBody sessionId={loop.sessionId} verdict={v} />
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

/**
 * 整理的内容（理由、没整理成的原因、学到的逐条带原话）：面板里的这张卡与学习页上点名拿回的收尾记录共用
 * （会话/学习对话.md §11.3「程序推来的块上屏」）。
 */
export function VerdictBody(props: { sessionId: string; verdict: GuardVerdictView }) {
  const v = props.verdict;
  return (
    <>
      <Field label={W.reason}>
        <ReasonText text={v.basis} sessionId={props.sessionId} />
      </Field>
      {v.problem !== undefined && <Field label={W.problem}>{v.problem}</Field>}
      {v.understanding.length > 0 && (
        <Field label={W.understanding}>
          <span className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs">{W.understandingHint}</span>
            {understandingRows(v).map((u, i) => (
              <span key={i} className="flex flex-col gap-1">
                <span>{u.text}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{u.strength}</Badge>
                  {u.lines.length > 0 && (
                    <JumpLine loopId={props.sessionId} line={u.lines[0] ?? 0} label={W.jumpTo} />
                  )}
                </span>
                <span className="flex flex-col gap-1.5">
                  {u.quotes.map((q) => (
                    <Quote key={q.line} quote={q} sessionId={props.sessionId} />
                  ))}
                </span>
              </span>
            ))}
          </span>
        </Field>
      )}
    </>
  );
}
