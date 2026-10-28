// 中间的对话页：主对话、谈方向、导航（只看）、写产出、找资料共用一个外壳，
// 顶上面包屑（项目名去项目页）+ 各类对话自己的顶部说明与底栏（界面说明 §2.3–§2.6）。
// 学习对话（W10 起按屏幕跑）走 learn/learn-page.tsx；旧版开的学习对话还在这里，按消息流只看（W10 §9 第 1、2 条）。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { ArrowRightIcon } from 'lucide-react';
import { Thread } from '@/components/assistant-ui/thread';
import { Button } from '@/components/ui/button';
import type { SessionSummary } from '../../shared/protocol.ts';
import type { NumberedRecord } from '../../shared/records.ts';
import { api } from '../api.ts';
import { useLoad } from '../hooks/use-load.ts';
import { useOpenSession } from '../open-session.ts';
import { CurrentSessionContext, HighlightContext, type Focus } from '../panel.ts';
import {
  loopState,
  reviewWindow,
  talkEnded,
  toUiMessages,
  type UiMessage,
} from '../thread-model.ts';
import { forLearner } from '../learner-text.ts';
import { W } from '../wording.ts';
import { ReviewBanner } from './longterm/loop-extras.tsx';
import { currentTicket, EndedBar, OldLoopBar, TicketStrip } from './learn/loop-parts.tsx';
import { OutputTaskBar } from './outputs/outputs-section.tsx';
import type { PickedFile } from './project-materials.tsx';
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

  const ticket = useMemo(
    () => (kind === 'loop' ? currentTicket(records) : undefined),
    [kind, records],
  );
  const review = kind === 'talk' ? reviewWindow(records) : undefined;
  const ended =
    kind === 'loop' ? loopState(records).kind === 'ended' : kind === 'talk' && talkEnded(records);
  // 导航会话只给学习者看它怎么想的，不交互（会话/导航.md「会话形态」）；页面编辑员也只看
  const watchOnly = kind === 'nav' || kind === 'editor';
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
    // 旧版开的学习对话：只看，留“搁着”（W10 §9 第 1 条）
    <OldLoopBar
      sessionId={sessionId}
      records={records}
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
        </div>
      )}
      {kind === 'talk' && review === undefined && (
        <TalkIntro parent={props.parent} sessionId={sessionId} />
      )}
      {kind === 'nav' && <NavIntro parent={props.parent} navId={sessionId} />}
      {review !== undefined && <ReviewBanner window={review} />}
    </div>
  );

  const thread = (
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
      // 谈方向谈定只是收起：输入框留着，学习者再说话就重开（10-28）
      disabled={(ended && kind !== 'talk') || watchOnly || kind === 'loop'}
      placeholder={running ? '可以随时插话…' : '回复…'}
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
  );
  return (
    <CurrentSessionContext.Provider value={sessionId}>
      <HighlightContext.Provider value={focus?.lines ?? NO_LINES}>
        <AssistantRuntimeProvider runtime={runtime}>{thread}</AssistantRuntimeProvider>
      </HighlightContext.Provider>
    </CurrentSessionContext.Provider>
  );
}

const NO_LINES: readonly number[] = [];

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
