// 一段学习的依据：单子（按文字逐行，可改）、改过的几行、每次是否学会的判断（实际理解逐条带证据强度、
// 理由、原话、不同看法）、老师的观察记录、用到的教法；没合上的另带结束原话与当时的路线决定。
import { useEffect, useRef, useState } from 'react';
import type {
  GuardVerdictView,
  LoopEvidence,
  SourceView,
  TicketEditView,
  TicketView,
} from '../../../shared/protocol.ts';
import { START_SOURCES } from '../../../shared/records.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { editedFields, refLink, ticketRowsOf } from '../../ticket-model.ts';
import { understandingRows } from '../../verdict-model.ts';
import { W } from '../../wording.ts';
import { forLearner } from '../../learner-text.ts';
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
  TicketRowList,
  Time,
} from './parts.tsx';

export function LoopView(props: {
  loopId: string;
  verdictLine?: number | undefined;
  editTicket?: boolean | undefined;
}) {
  const { loopId, verdictLine } = props;
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
        <TicketSection
          loopId={loopId}
          ticket={loop.ticket}
          ended={loop.status !== 'in_progress'}
          startOpen={props.editTicket === true}
          onSaved={r.reload}
        />
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

/** 单子：逐行显示、改过的几行、可改（学习结束后隐藏表单）。 */
function TicketSection(props: {
  loopId: string;
  ticket: TicketView;
  ended: boolean;
  startOpen: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(props.startOpen && !props.ended);
  return (
    <Section title={W.plan}>
      <Card className="flex flex-col gap-3">
        <TicketRowList rows={ticketRowsOf(props.ticket)} />
        {props.ticket.edits.length > 0 && (
          <Edits loopId={props.loopId} edits={props.ticket.edits} />
        )}
        {!props.ended && (
          <div className="border-t pt-2">
            {editing ? (
              <EditForm
                loopId={props.loopId}
                ticket={props.ticket}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  props.onSaved();
                }}
              />
            ) : (
              <button
                type="button"
                className="text-primary text-xs hover:underline"
                onClick={() => setEditing(true)}
              >
                {W.ticketEdit}
              </button>
            )}
          </div>
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

/** 改这次要学的：要学的、学完应该能、从这些已有的出发。 */
function EditForm(props: {
  loopId: string;
  ticket: TicketView;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [newPoint, setNewPoint] = useState(props.ticket.newPoint);
  const [clause, setClause] = useState(props.ticket.clause);
  const [starts, setStarts] = useState(
    props.ticket.startPoints.map((s) => ({
      point: s.point,
      source: s.source,
      ...(s.ref !== undefined ? { ref: s.ref } : {}),
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const save = () => {
    setBusy(true);
    setError(undefined);
    api
      .editTicket(props.loopId, {
        newPoint,
        clause,
        startPoints: starts.filter((s) => s.point.trim() !== ''),
      })
      .then(props.onSaved)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="text-muted-foreground text-xs">{W.ticketEditTitle}</div>
      <Field label={W.newPoint}>
        <input className={INPUT} value={newPoint} onChange={(e) => setNewPoint(e.target.value)} />
      </Field>
      <Field label={W.clause}>
        <input className={INPUT} value={clause} onChange={(e) => setClause(e.target.value)} />
      </Field>
      <Field label={W.startPoints}>
        <span className="flex flex-col gap-2">
          {starts.map((s, i) => (
            <span key={i} className="flex flex-wrap items-center gap-2">
              <input
                className={INPUT}
                value={s.point}
                onChange={(e) =>
                  setStarts(starts.map((x, j) => (i === j ? { ...x, point: e.target.value } : x)))
                }
              />
              <select
                className={INPUT}
                value={s.source}
                onChange={(e) =>
                  setStarts(
                    starts.map((x, j) =>
                      i === j
                        ? { ...x, source: e.target.value as (typeof START_SOURCES)[number] }
                        : x,
                    ),
                  )
                }
              >
                {START_SOURCES.map((k) => (
                  <option key={k} value={k}>
                    {W.startSource[k]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="text-muted-foreground text-xs hover:underline"
                onClick={() => setStarts(starts.filter((_, j) => j !== i))}
              >
                {W.ticketEditRemoveStart}
              </button>
            </span>
          ))}
          <button
            type="button"
            className="text-primary self-start text-xs hover:underline"
            onClick={() => setStarts([...starts, { point: '', source: '自述' }])}
          >
            {W.ticketEditAddStart}
          </button>
        </span>
      </Field>
      <div className="text-muted-foreground text-xs">{W.ticketEditHint}</div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          className="bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs disabled:opacity-60"
          onClick={save}
        >
          {W.ticketEditSave}
        </button>
        <button
          type="button"
          className="text-muted-foreground text-xs hover:underline"
          onClick={props.onCancel}
        >
          {W.ticketEditCancel}
        </button>
        {error !== undefined && <span className="text-destructive text-xs">{error}</span>}
      </div>
    </div>
  );
}

const INPUT =
  'rounded-md border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring';

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
    <Card id={`verdict-${String(v.line)}`} active={props.active} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Badge tone={yes ? 'good' : 'neutral'}>{yes ? W.judgedYes : W.judgedNo}</Badge>
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
