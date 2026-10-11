// 一段学习里的练习（批 9）：依据面板里的练习列表（状态、提示用了几次、作答与反馈可跳回）、
// 学习对话底部的“帮我归纳一下”（不足 2 道做完的练习时灰掉并说明）、阶段验收对话顶部的说明。
import { useState } from 'react';
import { ClipboardCheckIcon, LayersIcon } from 'lucide-react';
import type { PracticeTaskView } from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { practiceApi } from '../../api-practice.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { answerLines, summarizeState } from '../../practice-model.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Loading, Section, Time } from '../evidence/parts.tsx';
import { STATUS_TONE, TaskSource } from './practice-card.tsx';
import { SummaryItem } from './practice-review.tsx';

const WP = W.practice;

/** 依据面板里：这次学习里的练习，以及据它们写的归纳。 */
export function LoopPractice(props: { loopId: string }) {
  const r = useLoad(`practice:${props.loopId}`, () => practiceApi.tasks(props.loopId));
  const s = useLoad(`practice-summaries:${props.loopId}`, () =>
    practiceApi.summaries(props.loopId),
  );
  const tasks = r.data?.tasks;
  const summaries = s.data?.summaries ?? [];
  return (
    <>
      <Section title={WP.listTitle} hint={WP.listHint}>
        <div data-testid="loop-practice" className="flex flex-col gap-2">
          {tasks === undefined ? (
            <Loading error={r.error} />
          ) : tasks.length === 0 ? (
            <div className="text-muted-foreground text-sm">{WP.listNone}</div>
          ) : (
            tasks.map((t) => <TaskRow key={t.id} task={t} />)
          )}
        </div>
      </Section>
      {summaries.length > 0 && (
        <Section title={WP.summaries}>
          {[...summaries].reverse().map((x) => (
            <SummaryItem key={x.id} summary={x} />
          ))}
        </Section>
      )}
    </>
  );
}

function TaskRow(props: { task: PracticeTaskView }) {
  const t = props.task;
  const panel = usePanel();
  const answers = answerLines(t);
  const lastFeedback = t.feedbacks.at(-1);
  return (
    <Card className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{t.focus}</span>
        {t.stageCheck && <Badge tone="warn">{WP.stageCheck}</Badge>}
        <span className="ms-auto">
          <Badge tone={STATUS_TONE[t.status]}>{WP.status[t.status]}</Badge>
        </span>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <TaskSource task={t} />
        <span>{WP.kind(t.function, t.difficulty)}</span>
        <span>{t.hintsAllowed ? WP.hintsCount(t.hintsUsed) : WP.hintsNotAllowed}</span>
        <Time at={t.at} />
      </div>
      {lastFeedback !== undefined && (
        <div className="bg-muted/60 rounded-lg px-2.5 py-1.5 text-sm">
          <span className="text-muted-foreground text-xs">{WP.feedback}：</span>
          {lastFeedback.text}
          {lastFeedback.errors.length > 0 && (
            <div className="mt-1 text-xs">
              <span className="text-muted-foreground">{WP.mistakes}：</span>
              {lastFeedback.errors.map((e) => e.label).join('；')}
            </div>
          )}
        </div>
      )}
      {t.done !== undefined && t.done.note.trim() !== '' && (
        <div className="text-muted-foreground text-xs">
          {WP.doneNote}：{t.done.note}
        </div>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={() => panel.jump(t.loopSessionId, [t.line])}
        >
          {WP.seeCard}
        </button>
        {answers.length > 0 && (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => panel.jump(t.loopSessionId, answers)}
          >
            {WP.seeAnswer}
          </button>
        )}
        {t.feedbacks.some((f) => f.errors.some((e) => e.lines.length > 0)) && (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() =>
              panel.jump(
                t.loopSessionId,
                t.feedbacks.flatMap((f) => f.errors.flatMap((e) => e.lines.map((l) => l.line))),
              )
            }
          >
            {WP.seeFeedback}
          </button>
        )}
      </div>
    </Card>
  );
}

/** 学习对话底部：“帮我归纳一下”。这段学习里没有练习就不显示；做完的不足 2 道时灰掉并写明。 */
export function SummarizeButton(props: { loopId: string; disabled?: boolean }) {
  const r = useLoad(`practice:${props.loopId}`, () => practiceApi.tasks(props.loopId));
  const [busy, setBusy] = useState(false);
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const tasks = r.data?.tasks;
  if (tasks === undefined) return null;
  const st = summarizeState(tasks);
  if (!st.show) return null;
  const why = st.can ? undefined : WP.summarizeNeed(st.completed);
  return (
    <span className="me-auto flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        data-testid="practice-summarize"
        disabled={!st.can || busy || props.disabled === true}
        {...(why !== undefined ? { title: why } : {})}
        onClick={() => {
          setBusy(true);
          setError(undefined);
          practiceApi
            .summarize(props.loopId)
            .then(() => setAsked(true))
            .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
            .finally(() => setBusy(false));
        }}
      >
        <LayersIcon />
        {busy ? WP.summarizing : WP.summarize}
      </Button>
      {(why !== undefined || asked || error !== undefined) && (
        <span
          className={
            error !== undefined ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'
          }
        >
          {error ?? (asked ? WP.summarizeAsked : why)}
        </span>
      )}
    </span>
  );
}

/** 阶段验收对话顶部的一行说明。 */
export function StageCheckBanner() {
  return (
    <div
      data-testid="stage-check-banner"
      className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-1.5 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
    >
      <ClipboardCheckIcon className="size-3.5 shrink-0" />
      {WP.stageCheckBanner}
    </div>
  );
}
