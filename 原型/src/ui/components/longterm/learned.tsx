// “我学会的”：按学习列（记录/学过的记录.md「分层」）——每次学习一行（标题、状态、时间），最新的在前；
// 点开看上层（单子、没合上的结束原话与路线决定）与中层（守卫的收尾记录：理解逐条 + 证据强度 + 模型），
// 可跳到那次对话的原文；外部导入单列、标“未验证”。另有“没按推荐走的时候”（路线偏差）。
import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { modelInfoOf } from '../../../shared/protocol.ts';
import type { Learning } from '../../../shared/protocol-learned.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { useOpenSession } from '../../open-session.ts';
import {
  importRows,
  learnedDetail,
  learnedRows,
  type ImportRow,
  type JumpRef,
  type LearnedRow,
} from '../../learned-model.ts';
import { usePanel, useProject } from '../../panel.ts';
import { W } from '../../wording.ts';
import {
  Badge,
  Card,
  Field,
  Loading,
  ModelLine,
  Quote,
  Section,
  TicketRowList,
} from '../evidence/parts.tsx';
import { DeviationsSection } from './deviations.tsx';

export function LearnedView(props: { loopId?: string | undefined }) {
  const project = useProject();
  const r = useLoad(`learned:${project ?? ''}`, () => api.learned(project));
  const [open, setOpen] = useState<string | undefined>(props.loopId);
  const learnings = r.data?.learnings ?? [];
  const rows = learnedRows(learnings);
  const byId = new Map(learnings.map((l) => [l.loopId, l]));
  const imports = importRows(r.data?.imports ?? []);
  return (
    <div className="flex flex-col gap-5" data-testid="learned-view">
      <h2 className="font-serif text-lg">{W.learned}</h2>
      {!r.data ? (
        <Loading error={r.error} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {rows.length === 0 && (
              <div className="text-muted-foreground text-sm">{W.learnedEmpty}</div>
            )}
            {rows.map((row) => (
              <LearnedCard
                key={row.loopId}
                row={row}
                learning={byId.get(row.loopId)}
                projectId={project}
                open={open === row.loopId}
                onToggle={() => setOpen(open === row.loopId ? undefined : row.loopId)}
              />
            ))}
          </div>
          {imports.length > 0 && <ImportsSection rows={imports} />}
        </>
      )}
      <DeviationsSection projectId={project} />
    </div>
  );
}

function LearnedCard(props: {
  row: LearnedRow;
  learning: Learning | undefined;
  projectId: string | undefined;
  open: boolean;
  onToggle: () => void;
}) {
  const { row, learning } = props;
  return (
    <Card className="flex flex-col gap-2">
      <button
        type="button"
        className="flex flex-wrap items-center gap-2 text-left"
        onClick={props.onToggle}
      >
        {props.open ? (
          <ChevronDownIcon className="text-muted-foreground size-4" />
        ) : (
          <ChevronRightIcon className="text-muted-foreground size-4" />
        )}
        <span className="font-medium">{row.title}</span>
        <Badge tone={row.status === '合上' ? 'good' : row.status === '没合上' ? 'warn' : 'accent'}>
          {row.statusLabel}
        </Badge>
        {row.shelved && <Badge tone="warn">{W.shelvedBadge}</Badge>}
        <span className="text-muted-foreground ms-auto text-xs">{row.time}</span>
      </button>
      {props.open && learning !== undefined && (
        <LearnedDetailView learning={learning} projectId={props.projectId} />
      )}
    </Card>
  );
}

function LearnedDetailView(props: { learning: Learning; projectId: string | undefined }) {
  const d = learnedDetail(props.learning, props.projectId);
  return (
    <div className="flex flex-col gap-4 border-t pt-3">
      <Section title={W.learnedUpper}>
        <TicketRowList rows={d.upper.ticket} />
        {d.upper.endNote !== undefined && (
          <Field label={W.unclosedLine}>
            <span>{d.upper.endNote}</span>
          </Field>
        )}
        {d.upper.routeDecision !== undefined && (
          <Field label={W.routeDecision}>
            <span className="flex flex-col gap-1">
              <span>{d.upper.routeDecision.decision}</span>
              <span className="text-muted-foreground text-xs">{d.upper.routeDecision.reason}</span>
              {d.upper.routeDecision.jump !== undefined && (
                <JumpButton jump={d.upper.routeDecision.jump} label={W.jumpTo} />
              )}
            </span>
          </Field>
        )}
      </Section>
      {d.middle !== undefined && (
        <Section title={W.learnedMiddle} hint={W.understandingHint}>
          <Field label={W.whyJudged}>
            <span className="flex flex-col gap-1">
              <span>{d.middle.basis}</span>
              <JumpButton jump={d.middle.jump} label={W.jumpTo} />
            </span>
          </Field>
          {d.middle.rows.map((u, i) => (
            <div key={i} className="flex flex-col gap-1">
              <span>{u.text}</span>
              <Badge tone="accent">{u.strength}</Badge>
              {u.quotes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {u.quotes.map((q) => (
                    <Quote key={q.line} quote={q} sessionId={props.learning.loopId} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {d.middle.model !== undefined && <ModelLine model={modelInfoOf(d.middle.model)} />}
        </Section>
      )}
      <OpenTranscript sessionId={d.transcript.sessionId} />
    </div>
  );
}

function JumpButton(props: { jump: JumpRef; label: string }) {
  const panel = usePanel();
  return (
    <button
      type="button"
      className="text-primary self-start text-xs hover:underline"
      onClick={() => panel.jump(props.jump.sessionId, props.jump.lines)}
    >
      {props.label}
    </button>
  );
}

function OpenTranscript(props: { sessionId: string }) {
  const open = useOpenSession();
  return (
    <button
      type="button"
      className="text-primary self-start text-xs hover:underline"
      onClick={() => open(props.sessionId)}
    >
      {W.learnedTranscript}
    </button>
  );
}

function ImportsSection(props: { rows: ImportRow[] }) {
  return (
    <Section title={W.learnedImports} hint={W.learnedImportsHint}>
      <div className="flex flex-col gap-1.5">
        {props.rows.map((x) => (
          <Card key={x.id} className="flex flex-wrap items-center gap-2">
            <Badge tone="warn">{x.unverified}</Badge>
            <span>{x.channel}</span>
            {x.title !== undefined && (
              <span className="text-muted-foreground text-xs">{x.title}</span>
            )}
            <span className="text-muted-foreground ms-auto text-xs">{x.time}</span>
            {x.jump !== undefined && <JumpButton jump={x.jump} label={W.jumpTo} />}
          </Card>
        ))}
      </div>
    </Section>
  );
}
