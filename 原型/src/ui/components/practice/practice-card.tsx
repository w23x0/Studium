// 对话里的练习卡（批 9）：题面（书里的带出处标签，老师出的标“老师出的”）、要交什么、能不能要提示、怎样算做完、状态；
// 卡上可交作答（写一段，或勾选刚才说的几句）、要个提示（这道题不给提示时灰掉并说明）、先不做了；
// 作答、提示、反馈、做完按时间列在卡下。卡的内容现读接口（状态由核心按记录折叠），相关记录写进来时自动重读。
import { useState, type ReactNode } from 'react';
import {
  CircleCheckIcon,
  LightbulbIcon,
  MessageSquareQuoteIcon,
  NotebookPenIcon,
  PencilLineIcon,
  SparklesIcon,
  UndoIcon,
} from 'lucide-react';
import type {
  LearnerLineView,
  PracticeStatus,
  PracticeTaskView,
} from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { practiceApi } from '../../api-practice.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { taskOpen, taskTimeline, type TimelineItem } from '../../practice-model.ts';
import { W } from '../../wording.ts';
import { Badge, Time } from '../evidence/parts.tsx';
import { BookText } from '../sources/book-text.tsx';
import { CitationChip, CitationsProvider } from '../sources/citation.tsx';

const WP = W.practice;

export const STATUS_TONE: Record<PracticeStatus, 'neutral' | 'good' | 'warn' | 'accent'> = {
  assigned: 'accent',
  submitted: 'neutral',
  feedback: 'accent',
  completed: 'good',
  abandoned: 'warn',
};

export function PracticeCard(props: {
  loopId: string;
  taskId: string;
  /** 卡在对话里的行（跳到这张卡用）。 */
  line: number;
  loopOpen: boolean;
  candidates: LearnerLineView[];
}) {
  const { loopId, taskId } = props;
  const r = useLoad(`practice:${loopId}:${taskId}`, () => practiceApi.task(loopId, taskId));
  const task = r.data?.task;
  return (
    <div
      data-testid="practice-card"
      data-lines={String(props.line)}
      className="bg-card max-w-(--thread-max-width) scroll-mt-16 rounded-2xl border shadow-sm"
    >
      {task === undefined ? (
        <div className="text-muted-foreground p-3 text-sm">
          {r.error !== undefined ? `${W.loadFailed}${r.error}` : W.loading}
        </div>
      ) : (
        <>
          <TaskHead task={task} />
          <TaskBody task={task} />
          <Timeline task={task} loopId={loopId} />
          {taskOpen(task, props.loopOpen) ? (
            <Actions
              task={task}
              loopId={loopId}
              candidates={props.candidates}
              onChanged={r.reload}
            />
          ) : (
            !props.loopOpen &&
            task.done === undefined && (
              <div className="text-muted-foreground border-t px-3 py-2 text-xs">{WP.loopOver}</div>
            )
          )}
        </>
      )}
    </div>
  );
}

function TaskHead(props: { task: PracticeTaskView }) {
  const t = props.task;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm">
      <NotebookPenIcon className="text-primary size-4 shrink-0" />
      <span className="font-medium">
        {WP.card} · {t.focus}
      </span>
      {t.stageCheck && (
        <Badge tone="warn" title={WP.stageCheckHint}>
          {WP.stageCheck}
        </Badge>
      )}
      <span className="ms-auto">
        <Badge tone={STATUS_TONE[t.status]}>{WP.status[t.status]}</Badge>
      </span>
    </div>
  );
}

/** 题从哪来：书里的题画成出处标签（点开看原文），老师出的标一句。 */
export function TaskSource(props: { task: PracticeTaskView }) {
  const s = props.task.source;
  if (s.kind === 'generated') {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
        <SparklesIcon className="size-3" />
        {WP.generated}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
      {WP.fromBook}
      <CitationsProvider text={s.citation} done>
        <CitationChip index={0} />
      </CitationsProvider>
    </span>
  );
}

function TaskBody(props: { task: PracticeTaskView }) {
  const t = props.task;
  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <TaskSource task={t} />
        <span className="text-muted-foreground text-xs">{WP.kind(t.function, t.difficulty)}</span>
        {t.follows !== undefined && (
          <span className="text-muted-foreground text-xs">{WP.followsLine}</span>
        )}
      </div>
      <BookText text={t.prompt} className="text-[1.02rem]" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <Row label={WP.deliverable}>{t.deliverable}</Row>
        <Row label={WP.doneWhen}>{t.doneWhen}</Row>
      </dl>
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-1">
          <LightbulbIcon className="size-3" />
          {t.hintsAllowed ? WP.hintsAllowed : WP.hintsNotAllowed}
        </span>
        {t.hintsAllowed && <span>{WP.hintsCount(t.hintsUsed)}</span>}
      </div>
    </div>
  );
}

function Row(props: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground text-xs leading-6 whitespace-nowrap">{props.label}</dt>
      <dd className="whitespace-pre-wrap">{props.children}</dd>
    </>
  );
}

/** 卡下的经过：作答、提示、反馈、做完，按时间。 */
function Timeline(props: { task: PracticeTaskView; loopId: string }) {
  const items = taskTimeline(props.task);
  if (items.length === 0) return null;
  return (
    <ol data-testid="practice-timeline" className="flex flex-col gap-2 border-t px-3 py-3">
      {items.map((it, i) => (
        <li key={i} className="flex flex-col gap-1">
          <TimelineEntry item={it} loopId={props.loopId} />
        </li>
      ))}
    </ol>
  );
}

function TimelineEntry(props: { item: TimelineItem; loopId: string }) {
  const { item, loopId } = props;
  switch (item.kind) {
    case 'submission':
      return (
        <>
          <EntryHead
            icon={<PencilLineIcon />}
            label={item.via === 'interface' ? WP.answeredByMe : WP.answeredInChat}
            at={item.at}
          />
          <Lines lines={item.lines} loopId={loopId} />
        </>
      );
    case 'hint':
      return (
        <>
          <EntryHead
            icon={<LightbulbIcon />}
            label={item.by === 'learner' ? WP.hintByLearner : WP.hintByTeacher}
            at={item.at}
          />
          {item.note !== undefined && <div className="ps-5 text-sm">{item.note}</div>}
        </>
      );
    case 'feedback':
      return (
        <>
          <EntryHead icon={<MessageSquareQuoteIcon />} label={WP.feedback} at={item.at} />
          <div className="ps-5 text-sm whitespace-pre-wrap">{item.text}</div>
          {item.errors.length > 0 && (
            <div className="flex flex-col gap-1 ps-5">
              {item.errors.map((e, i) => (
                <div
                  key={i}
                  data-testid="practice-mistake"
                  className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm dark:bg-amber-900/20"
                >
                  <span className="text-muted-foreground text-xs">{WP.mistakes}：</span>
                  <span className="font-medium">{e.label}</span>
                  {e.detail !== '' && <span className="text-muted-foreground"> — {e.detail}</span>}
                  {e.lines.length > 0 && (
                    <JumpLink loopId={loopId} lines={e.lines.map((l) => l.line)} />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      );
    case 'done':
      return (
        <>
          <EntryHead
            icon={item.outcome === 'completed' ? <CircleCheckIcon /> : <UndoIcon />}
            label={`${item.outcome === 'completed' ? WP.doneCompleted : WP.doneAbandoned}${
              item.by === 'learner' && item.outcome === 'abandoned' ? WP.doneByLearner : ''
            }`}
            at={item.at}
          />
          {item.note.trim() !== '' && <div className="ps-5 text-sm">{item.note}</div>}
        </>
      );
  }
}

function EntryHead(props: { icon: ReactNode; label: string; at: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs [&_svg]:size-3.5">
      {props.icon}
      <span className="text-foreground/80 font-medium">{props.label}</span>
      <Time at={props.at} />
    </div>
  );
}

/** 作答的原话：点了在对话里高亮那几句。 */
function Lines(props: { lines: LearnerLineView[]; loopId: string }) {
  const panel = usePanel();
  return (
    <div className="flex flex-col gap-1 ps-5">
      {props.lines.map((l) => (
        <button
          key={l.line}
          type="button"
          className="bg-muted/60 hover:bg-muted line-clamp-3 rounded-lg px-2.5 py-1.5 text-left text-sm whitespace-pre-wrap"
          onClick={() => panel.jump(props.loopId, [l.line])}
        >
          {l.text}
        </button>
      ))}
    </div>
  );
}

function JumpLink(props: { loopId: string; lines: number[] }) {
  const panel = usePanel();
  return (
    <button
      type="button"
      className="text-primary ms-2 text-xs hover:underline"
      onClick={() => panel.jump(props.loopId, props.lines)}
    >
      {W.jumpTo}
    </button>
  );
}

type Mode = 'idle' | 'write' | 'pick' | 'abandon';

function Actions(props: {
  task: PracticeTaskView;
  loopId: string;
  candidates: LearnerLineView[];
  onChanged: () => void;
}) {
  const { task, loopId } = props;
  const [mode, setMode] = useState<Mode>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [asked, setAsked] = useState(false);
  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setBusy(true);
    setError(undefined);
    fn()
      .then(() => {
        setMode('idle');
        after?.();
        props.onChanged();
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };
  return (
    <div className="flex flex-col gap-2 border-t px-3 py-2.5">
      {mode === 'idle' && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" data-testid="practice-answer" onClick={() => setMode('write')}>
            <PencilLineIcon />
            {WP.answer}
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="practice-hint"
            disabled={!task.hintsAllowed || busy}
            title={task.hintsAllowed ? undefined : WP.askHintNo}
            onClick={() =>
              run(
                () => practiceApi.hint(loopId, task.id),
                () => setAsked(true),
              )
            }
          >
            <LightbulbIcon />
            {WP.askHint}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-testid="practice-abandon"
            onClick={() => setMode('abandon')}
          >
            {WP.abandon}
          </Button>
          {!task.hintsAllowed && (
            <span className="text-muted-foreground text-xs">{WP.askHintNo}</span>
          )}
          {asked && task.hintsAllowed && (
            <span className="text-muted-foreground text-xs">{WP.askedHint}</span>
          )}
        </div>
      )}
      {(mode === 'write' || mode === 'pick') && (
        <AnswerForm
          mode={mode}
          candidates={props.candidates}
          busy={busy}
          onMode={setMode}
          onCancel={() => setMode('idle')}
          onText={(text) => run(() => practiceApi.submitText(loopId, task.id, text))}
          onLines={(lines) => run(() => practiceApi.submitLines(loopId, task.id, lines))}
        />
      )}
      {mode === 'abandon' && (
        <AbandonForm
          busy={busy}
          onCancel={() => setMode('idle')}
          onGo={(note) => run(() => practiceApi.abandon(loopId, task.id, note))}
        />
      )}
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
    </div>
  );
}

const INPUT =
  'bg-background focus:border-foreground/30 w-full rounded-lg border px-3 py-2 text-sm outline-none';

function AnswerForm(props: {
  mode: 'write' | 'pick';
  candidates: LearnerLineView[];
  busy: boolean;
  onMode: (m: 'write' | 'pick') => void;
  onCancel: () => void;
  onText: (text: string) => void;
  onLines: (lines: number[]) => void;
}) {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const tab = (m: 'write' | 'pick', label: string) => (
    <button
      type="button"
      className={cn(
        'rounded-md px-2 py-0.5 text-xs',
        props.mode === m ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60',
      )}
      onClick={() => props.onMode(m)}
    >
      {label}
    </button>
  );
  const ready = props.mode === 'write' ? text.trim() !== '' : picked.length > 0;
  return (
    <div className="flex flex-col gap-2" data-testid="practice-answer-form">
      <div className="flex gap-1">
        {tab('write', WP.answerWrite)}
        {tab('pick', WP.answerPick)}
      </div>
      {props.mode === 'write' ? (
        <textarea
          className={cn(INPUT, 'min-h-24 resize-y')}
          placeholder={WP.answerPlaceholder}
          aria-label={WP.answerWrite}
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
      ) : props.candidates.length === 0 ? (
        <div className="text-muted-foreground text-sm">{WP.answerPickNone}</div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="text-muted-foreground text-xs">{WP.answerPickHint}</div>
          {props.candidates.map((c) => (
            <label
              key={c.line}
              className="hover:bg-accent/40 flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1 text-sm"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={picked.includes(c.line)}
                onChange={(e) =>
                  setPicked((p) =>
                    e.target.checked
                      ? [...p, c.line].sort((a, b) => a - b)
                      : p.filter((x) => x !== c.line),
                  )
                }
              />
              <span className="line-clamp-3 whitespace-pre-wrap">{c.text}</span>
            </label>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>
          {WP.answerCancel}
        </Button>
        <Button
          size="sm"
          data-testid="practice-answer-send"
          disabled={!ready || props.busy}
          onClick={() =>
            props.mode === 'write' ? props.onText(text.trim()) : props.onLines(picked)
          }
        >
          {props.busy ? WP.sending : WP.answerSend}
        </Button>
      </div>
    </div>
  );
}

function AbandonForm(props: { busy: boolean; onCancel: () => void; onGo: (note: string) => void }) {
  const [note, setNote] = useState('');
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground text-xs">{WP.abandonHint}</div>
      <input
        className={INPUT}
        placeholder={WP.abandonPlaceholder}
        aria-label={WP.abandonPlaceholder}
        value={note}
        autoFocus
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onCancel}>
          {WP.answerCancel}
        </Button>
        <Button size="sm" variant="outline" disabled={props.busy} onClick={() => props.onGo(note)}>
          {WP.abandonGo}
        </Button>
      </div>
    </div>
  );
}
