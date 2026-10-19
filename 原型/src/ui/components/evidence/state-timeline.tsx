// 状态回看（批 10b）：状态记录按时间排成时间轴，点的颜色按阶段或按来源档；每条带依据原话，可补“我的解释”（只追加）。
import { useState } from 'react';
import type { StateTimelineEntry } from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { dayGroups, dotClass, legend, stageSteps, type ColorMode } from '../../cross-model.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { W } from '../../wording.ts';
import { Badge, Field, Loading, Quote, Section, Time } from './parts.tsx';

export function StateTimeline() {
  const r = useLoad('state:timeline', () => api.stateTimeline());
  const [mode, setMode] = useState<ColorMode>('stage');
  if (!r.data) return <Loading error={r.error} />;
  const { entries, stages } = r.data;
  if (entries.length === 0) {
    return <div className="text-muted-foreground text-sm">{W.stateTimelineEmpty}</div>;
  }
  const steps = stageSteps(stages);
  return (
    <div className="flex flex-col gap-4" data-testid="state-timeline">
      <p className="text-muted-foreground text-xs leading-relaxed">{W.stateTimelineHint}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">{W.colorBy}</span>
        {(['stage', 'source'] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            className={cn(
              'rounded-full border px-2 py-0.5',
              mode === m ? 'bg-primary/10 text-primary border-primary/40' : 'hover:bg-accent/60',
            )}
            onClick={() => setMode(m)}
          >
            {m === 'stage' ? W.colorStage : W.colorSource}
          </button>
        ))}
        <span className="flex flex-wrap items-center gap-2">
          {legend(entries, mode).map((l) => (
            <span key={l.key} className="text-muted-foreground flex items-center gap-1">
              <span className={cn('size-2 rounded-full', l.dot)} />
              {mode === 'stage'
                ? l.key === ''
                  ? W.stageNone
                  : l.key
                : W.sourceLevel[l.key as keyof typeof W.sourceLevel]}
            </span>
          ))}
        </span>
      </div>
      {steps.length > 0 && (
        <Section title={W.stageSteps}>
          <ul className="flex flex-col gap-0.5 text-sm">
            {steps.map((s) => (
              <li key={s.at}>
                <Time at={s.at} />{' '}
                {s.from === undefined ? W.stageStart(s.to) : W.stageChange(s.from, s.to)}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <ol className="border-border flex flex-col gap-4 border-s ps-4">
        {dayGroups(entries).map((g) => (
          <li key={g.day} className="flex flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium">{g.day}</div>
            {g.entries.map((e) => (
              <TimelineItem key={e.record.id} entry={e} mode={mode} onChanged={r.reload} />
            ))}
          </li>
        ))}
      </ol>
    </div>
  );
}

function TimelineItem(props: {
  entry: StateTimelineEntry;
  mode: ColorMode;
  onChanged: () => void;
}) {
  const { record: s, stage, explanations } = props.entry;
  return (
    <div
      className="bg-card relative flex flex-col gap-2 rounded-xl border p-3 text-sm shadow-xs"
      data-testid="timeline-item"
    >
      <span
        className={cn(
          'ring-background absolute -start-[1.4rem] top-4 size-2.5 rounded-full ring-4',
          dotClass(props.entry, props.mode),
        )}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          tone={s.sourceLevel === '已确认' ? 'good' : s.sourceLevel === '推断' ? 'warn' : 'neutral'}
        >
          {W.sourceLevel[s.sourceLevel]}
        </Badge>
        <Badge>{stage ?? W.stageNone}</Badge>
        <span className="ms-auto">
          <Time at={s.at} />
        </span>
      </div>
      <div className="whitespace-pre-wrap">{s.text}</div>
      {s.timeRange !== '' && <Field label={W.timeRange}>{s.timeRange}</Field>}
      {s.refs.flatMap((ref) =>
        ref.quotes.map((q) => (
          <Quote key={`${ref.sessionId}:${String(q.line)}`} quote={q} sessionId={ref.sessionId} />
        )),
      )}
      {explanations.map((x) => (
        <div key={x.id} className="bg-primary/5 rounded-lg px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {W.myExplain} · {W.explainSelf}：
          </span>
          {x.text}
        </div>
      ))}
      <AddExplanation recordId={s.id} onDone={props.onChanged} />
    </div>
  );
}

function AddExplanation(props: { recordId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  if (!open) {
    return (
      <Button variant="ghost" size="xs" className="self-start" onClick={() => setOpen(true)}>
        {W.explainAdd}
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <textarea
        className="bg-background focus:border-foreground/30 min-h-16 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
        placeholder={W.explainPlaceholder}
        aria-label={W.explainAdd}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
      />
      <div className="text-muted-foreground text-xs">{W.explainHint}</div>
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
            api
              .addExplanation(props.recordId, text.trim())
              .then(() => {
                setText('');
                setOpen(false);
                props.onDone();
              })
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {W.explainSave}
        </Button>
      </div>
    </div>
  );
}
