// 中间的对话页：主对话、谈方向、导航（只看）、学习对话、写产出、找资料共用一个外壳，
// 顶上面包屑（项目名去项目页）+ 各类对话自己的顶部说明与底栏（界面说明 §2.3–§2.6）。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon, EllipsisIcon } from 'lucide-react';
import { Thread } from '@/components/assistant-ui/thread';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { MathPreview } from '@/components/input/math-preview';
import type { SessionSummary } from '../../shared/protocol.ts';
import type { NumberedRecord, Ticket } from '../../shared/records.ts';
import { api } from '../api.ts';
import { useLoad } from '../hooks/use-load.ts';
import { useOpenSession } from '../open-session.ts';
import { CurrentSessionContext, HighlightContext, type Focus } from '../panel.ts';
import {
  loopSide,
  loopState,
  reviewWindow,
  talkEnded,
  toUiMessages,
  type LoopSide,
  type UiMessage,
} from '../thread-model.ts';
import { forLearner } from '../learner-text.ts';
import { W } from '../wording.ts';
import { LongtermBanner, ReviewBanner, UnclosedEndBar } from './longterm/loop-extras.tsx';
import { OutputTaskBar } from './outputs/outputs-section.tsx';
import type { PickedFile } from './project-materials.tsx';
import { StageCheckBanner } from './stage-check.tsx';
import { TopBar } from './top-bar.tsx';

export function Conversation(props: {
  sessionId: string;
  kind: SessionSummary['kind'];
  /** 开出这个对话的那个对话（谈方向、导航 → 主对话）。 */
  parent: string | undefined;
  title: string;
  projectId: string;
  projectTitle: string;
  /** 项目谈定方向没有（主对话的“下一步学什么”只在有方向后出现）。 */
  hasGoal: boolean;
  titleOf: (id: string) => string | undefined;
  isReview: (id: string) => boolean;
  focus: Focus | undefined;
  headerExtra: ReactNode;
  onError: (e: unknown) => void;
  /** 回项目对话。 */
  onBackToMain: () => void;
  /** 回项目页。 */
  onProject: () => void;
}) {
  const { sessionId, kind, onError, titleOf, isReview, focus } = props;
  const isMain = kind === 'main';
  const [records, setRecords] = useState<NumberedRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let alive = true;
    const stop = api.events((e) => {
      if (e.sessionId !== sessionId) return;
      if (e.type === 'delta') setDraft((d) => d + e.text);
      if (e.type === 'running') {
        setRunning(e.running);
        if (!e.running) setDraft('');
      }
      if (e.type === 'record') {
        if (e.record.type === 'assistant_message') setDraft('');
        setRecords((rs) =>
          rs.some((r) => r.line === e.line) ? rs : [...rs, { line: e.line, record: e.record }],
        );
      }
    });
    api
      .records(sessionId)
      .then((r) => {
        if (!alive) return;
        // 与 SSE 先到的记录合并，按行号去重
        setRecords((rs) => {
          const byLine = new Map(r.records.map((x) => [x.line, x]));
          for (const x of rs) byLine.set(x.line, x);
          return [...byLine.values()].sort((a, b) => a.line - b.line);
        });
        setRunning(r.running);
      })
      .catch(onError);
    return () => {
      alive = false;
      stop();
    };
  }, [sessionId, onError]);

  const messages = useMemo(
    () => toUiMessages(records, draft, { running, titleOf, isReview }),
    [records, draft, running, titleOf, isReview],
  );

  // 从依据面板跳过来：滚到被引用的那句（记录还没读回来时等读回来再滚）
  const scrolled = useRef(0);
  useEffect(() => {
    if (focus?.scroll !== true || scrolled.current === focus.seq) return;
    const first = focus.lines[0];
    if (first === undefined) return;
    const el = document.querySelector(`[data-lines~="${String(first)}"]`);
    if (!el) return;
    scrolled.current = focus.seq;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focus, messages.length]);

  const runtime = useExternalStoreRuntime<UiMessage>({
    messages,
    // 不把“模型在答”告诉输入框：答到一半也能接着说（中途插话），“正在答”由最后一条占位显示
    isRunning: false,
    convertMessage: (m): ThreadMessageLike => ({
      id: m.id,
      role: m.role,
      content: m.text,
      metadata: {
        custom: {
          line: m.line,
          ...(m.lines ? { lines: m.lines } : {}),
          ...(m.link ? { link: m.link } : {}),
          ...(m.verdict ? { verdict: m.verdict } : {}),
          ...(m.objection ? { objection: m.objection } : {}),
          ...(m.images ? { images: m.images } : {}),
          ...(m.candidates ? { candidates: m.candidates } : {}),
          ...(m.tools ? { tools: m.tools } : {}),
          ...(m.pending ? { pending: m.pending } : {}),
        },
      },
      ...(m.role === 'assistant'
        ? {
            status:
              m.id === 'draft'
                ? { type: 'running' as const }
                : m.failed === true
                  ? { type: 'incomplete' as const, reason: 'error' as const }
                  : { type: 'complete' as const, reason: 'stop' as const },
          }
        : {}),
    }),
    onNew: async (m: AppendMessage) => {
      const text = m.content.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('');
      await api.send(sessionId, text);
    },
  });

  const side = useMemo(() => (kind === 'loop' ? loopSide(records) : undefined), [kind, records]);
  const ticket = useMemo(
    () => (kind === 'loop' ? currentTicket(records) : undefined),
    [kind, records],
  );
  const review = kind === 'talk' ? reviewWindow(records) : undefined;
  const ended =
    kind === 'loop' ? loopState(records).kind === 'ended' : kind === 'talk' && talkEnded(records);
  // 导航会话只给学习者看它怎么想的，不交互（会话/导航.md「会话形态」）
  const watchOnly = kind === 'nav';
  const footer = watchOnly ? undefined : kind === 'main' ? (
    props.hasGoal ? (
      <MainBar projectId={props.projectId} running={running} onError={onError} />
    ) : undefined
  ) : kind === 'output' ? (
    <OutputTaskBar sessionId={sessionId} projectId={props.projectId} />
  ) : kind === 'find' ? undefined : kind === 'talk' ? (
    ended ? (
      <EndedBar
        text={review !== undefined ? W.reviewEnded : W.talkDone}
        onBack={props.onBackToMain}
      />
    ) : undefined
  ) : (
    <LoopBar
      sessionId={sessionId}
      records={records}
      side={side ?? NO_SIDE}
      running={running}
      onError={onError}
      onBack={props.onBackToMain}
      projectId={props.projectId}
      projectTitle={props.projectTitle}
    />
  );
  const header = (
    <div className="shrink-0">
      <TopBar
        crumbs={[
          {
            label: props.projectTitle || W.projectHome,
            onClick: props.onProject,
            testId: 'crumb-project',
          },
          { label: isMain ? W.projectChat : props.title, testId: 'crumb-current' },
        ]}
        right={props.headerExtra}
      />
      {kind === 'loop' && (
        <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-1.5 px-4 pb-2 text-sm empty:hidden">
          {ticket !== undefined && <TicketStrip ticket={ticket} />}
          {side !== undefined && (
            <LongtermBanner
              side={side}
              loopId={sessionId}
              projectId={props.projectId}
              titleOf={titleOf}
            />
          )}
          {side?.stageCheck === true && <StageCheckBanner />}
        </div>
      )}
      {kind === 'talk' && review === undefined && (
        <TalkIntro parent={props.parent} sessionId={sessionId} />
      )}
      {kind === 'nav' && <NavIntro parent={props.parent} navId={sessionId} />}
      {review !== undefined && <ReviewBanner window={review} />}
    </div>
  );

  return (
    <CurrentSessionContext.Provider value={sessionId}>
      <HighlightContext.Provider value={focus?.lines ?? NO_LINES}>
        <AssistantRuntimeProvider runtime={runtime}>
          <Thread
            header={header}
            welcome={
              isMain
                ? W.mainWelcome
                : kind === 'talk'
                  ? review !== undefined
                    ? W.reviewWelcome
                    : '我们聊聊你想学什么。'
                  : kind === 'output'
                    ? W.outputChatWelcome
                    : kind === 'find'
                      ? W.findWelcome
                      : '马上开始…'
            }
            footer={footer}
            disabled={ended || watchOnly}
            placeholder={
              side?.shelved !== undefined
                ? W.shelvedPlaceholder
                : running
                  ? '可以随时插话…'
                  : '回复…'
            }
            onSend={async (text, images) => {
              await api.send(sessionId, text, images);
            }}
            // 主对话的输入框拖入非图片文件：不进输入，走项目的上传（工单 W9 §4.1）
            {...(isMain
              ? {
                  onFiles: async (files: PickedFile[]) => {
                    const r = await api.upload(props.projectId, files);
                    return W.filesSent(r.items.length);
                  },
                }
              : {})}
          />
        </AssistantRuntimeProvider>
      </HighlightContext.Provider>
    </CurrentSessionContext.Provider>
  );
}

const NO_LINES: readonly number[] = [];
const NO_SIDE: LoopSide = {};

/** 这次学习现在的单子：开场那张，改过就用最后改成的。 */
function currentTicket(records: NumberedRecord[]): Ticket | undefined {
  let t: Ticket | undefined;
  for (const { record: r } of records) {
    if (r.type === 'session_opened' && r.ticket !== undefined) t = r.ticket;
    if (r.type === 'ticket_edited') t = r.after;
  }
  return t;
}

/** 学习对话顶部：这次学什么（一行），点开见学完应该能、从哪出发、先假定你会的（界面说明 §2.6）。 */
function TicketStrip(props: { ticket: Ticket }) {
  const [open, setOpen] = useState(false);
  const t = props.ticket;
  const known = t.startPoints.filter((p) => p.source !== '假定');
  const assumed = t.startPoints.filter((p) => p.source === '假定');
  return (
    <div data-testid="ticket-strip" className="bg-muted/50 rounded-lg px-3 py-1.5">
      <button
        type="button"
        aria-expanded={open}
        className="flex w-full items-start gap-1.5 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDownIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        ) : (
          <ChevronRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        )}
        <span className="text-muted-foreground shrink-0">{W.loopTopic}</span>
        <MathPreview text={t.newPoint} className={open ? '' : 'line-clamp-1'} />
      </button>
      {open && (
        <dl className="mt-1.5 flex flex-col gap-1.5 ps-5.5 text-sm">
          <TicketItem label={W.clause} text={t.clause} />
          {known.length > 0 && (
            <TicketItem label={W.startPoints} text={known.map((p) => p.point).join('；')} />
          )}
          {assumed.length > 0 && (
            <TicketItem label={W.startSource.假定} text={assumed.map((p) => p.point).join('；')} />
          )}
        </dl>
      )}
    </div>
  );
}

function TicketItem(props: { label: string; text: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground text-xs">{props.label}</dt>
      <dd>
        <MathPreview text={props.text} />
      </dd>
    </div>
  );
}

/** 开出这个对话的那个对话的记录（谈方向、导航要回看主对话里的东西）。 */
function useParentRecords(parent: string | undefined) {
  return useLoad(`records:${parent ?? ''}`, () =>
    parent !== undefined ? api.records(parent) : Promise.resolve({ records: [], running: false }),
  );
}

/** 谈方向顶部：这一页做什么 + 从你在项目对话里说的哪句开始（界面说明 §2.4）。 */
function TalkIntro(props: { parent: string | undefined; sessionId: string }) {
  const r = useParentRecords(props.parent);
  const opened = r.data?.records.find(
    (x) => x.record.type === 'task_opened' && x.record.sessionId === props.sessionId,
  )?.record;
  const anchor = opened?.type === 'task_opened' ? opened.anchorLine : undefined;
  const said = r.data?.records.find((x) => x.line === anchor)?.record;
  return (
    <div
      data-testid="talk-intro"
      className="text-muted-foreground mx-auto flex w-full max-w-[46rem] flex-col gap-0.5 px-4 pb-2 text-sm"
    >
      <span>{W.talkIntro}</span>
      {said?.type === 'user_message' && (
        <span className="line-clamp-2">
          {W.talkFrom}
          <span className="text-foreground">“{said.text}”</span>
        </span>
      )}
    </div>
  );
}

/** 导航顶部：只看不聊；定好了就把结果放最上面，可直接去学（界面说明 §2.5）。 */
function NavIntro(props: { parent: string | undefined; navId: string }) {
  const r = useParentRecords(props.parent);
  const open = useOpenSession();
  const recs = r.data?.records ?? [];
  const card = recs.find(
    (x) => x.record.type === 'choice_card' && x.record.navSessionId === props.navId,
  )?.record;
  const made =
    card?.type === 'choice_card'
      ? recs.find((x) => x.record.type === 'choice_made' && x.record.cardId === card.cardId)?.record
      : undefined;
  const option =
    card?.type === 'choice_card' && made?.type === 'choice_made'
      ? card.options[made.option]
      : undefined;
  return (
    <div className="mx-auto flex w-full max-w-[46rem] flex-col gap-1.5 px-4 pb-2 text-sm">
      <span className="text-muted-foreground">{W.navIntro}</span>
      {made?.type === 'choice_made' && option !== undefined && (
        <button
          type="button"
          data-testid="nav-result"
          className="bg-card hover:bg-accent/40 flex flex-col gap-1 rounded-xl border px-3 py-2 text-left"
          onClick={() => open(made.loopSessionId)}
        >
          <span className="flex w-full items-center gap-2">
            <span className="text-muted-foreground shrink-0">{W.navResult}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{option.title}</span>
            <span className="text-primary flex shrink-0 items-center gap-1 text-xs">
              {W.navStart}
              <ArrowRightIcon className="size-3.5" />
            </span>
          </span>
          {option.reason !== '' && (
            <span className="text-muted-foreground line-clamp-2 text-xs">
              {W.navWhy}
              {forLearner(option.reason)}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function EndedBar(props: { text: string; onBack: () => void }) {
  return (
    <div
      data-testid="ended-bar"
      className="text-muted-foreground flex flex-wrap items-center justify-center gap-3 text-sm"
    >
      {props.text}
      <Button size="sm" onClick={props.onBack}>
        {W.backToMain}
      </Button>
    </div>
  );
}

/** 主对话输入框上方的建议：下一步学什么（有方向后常驻，界面说明 §2.3）。 */
function MainBar(props: { projectId: string; running: boolean; onError: (e: unknown) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        data-testid="next-step"
        disabled={busy || props.running}
        onClick={() => {
          setBusy(true);
          api
            .send(props.projectId, W.askNext)
            .catch(props.onError)
            .finally(() => setBusy(false));
        }}
      >
        <ArrowRightIcon />
        {W.nextStep}
      </Button>
    </div>
  );
}

/** 学习对话底栏：主按钮“我觉得懂了”；“…”里是“搁着，以后再学”（界面说明 §2.6、§3）。 */
function LoopBar(props: {
  sessionId: string;
  records: NumberedRecord[];
  side: LoopSide;
  running: boolean;
  onError: (e: unknown) => void;
  onBack: () => void;
  projectId: string;
  projectTitle: string;
}) {
  const { side } = props;
  const state = loopState(props.records);
  const act = (fn: () => Promise<unknown>) => {
    fn().catch(props.onError);
  };
  if (state.kind === 'ended') {
    if (!state.closed) {
      return (
        <UnclosedEndBar
          loopId={props.sessionId}
          projectId={props.projectId}
          projectTitle={props.projectTitle}
          onBack={props.onBack}
          onError={props.onError}
        />
      );
    }
    return <EndedBar text={W.loopDone} onBack={props.onBack} />;
  }
  const endLater = (
    <Menu>
      <MenuTrigger
        aria-label={W.moreActions}
        data-testid="loop-more"
        disabled={props.running}
        className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md disabled:opacity-50"
      >
        <EllipsisIcon className="size-4" />
      </MenuTrigger>
      <MenuContent side="top" align="end" className="max-w-72">
        <MenuItem
          data-testid="end-unclosed"
          onClick={() => act(() => api.endUnclosed(props.sessionId))}
        >
          <span className="flex flex-col gap-0.5">
            <span>{W.endLater}</span>
            <span className="text-muted-foreground text-xs">{W.endLaterHint}</span>
          </span>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
  if (side.shelved !== undefined) {
    // 以前点过“先放一放”的（旧数据）：接着学，或搁着
    return (
      <div
        data-testid="shelved-bar"
        className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-sm"
      >
        <span>
          {W.shelvedBar}
          {side.shelved.note !== undefined && (
            <span className="text-muted-foreground ms-2">
              {W.shelvedNote}：{side.shelved.note}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            disabled={props.running}
            onClick={() => act(() => api.resume(props.sessionId))}
          >
            {W.resume}
          </Button>
          {endLater}
        </div>
      </div>
    );
  }
  if (state.kind === 'awaiting_confirm') {
    return (
      <div
        data-testid="confirm-bar"
        className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-sm"
      >
        <span>{W.confirmBar}</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // 再补一句：回到输入框接着说
              document.querySelector<HTMLTextAreaElement>('main textarea')?.focus();
            }}
          >
            {W.confirmMore}
          </Button>
          <Button size="sm" onClick={() => act(() => api.confirmClose(props.sessionId))}>
            {W.confirmGo}
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="sm"
        data-testid="request-close"
        disabled={props.running || state.closeRequested}
        onClick={() => act(() => api.requestClose(props.sessionId))}
      >
        {state.closeRequested ? W.closingShort : W.understood}
      </Button>
      {endLater}
    </div>
  );
}
