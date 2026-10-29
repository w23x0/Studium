// 学习页（会话/学习对话.md §11）：一次学习只有一条上下文，学习者眼前是一份一直在的页面。核心照主模型的布局指令
// 改布局（区域图），这里照着摆块：宽屏按区域图，窄屏按阅读顺序排成一列；主模型的文字直接显示，组件放各自小窗，
// 还没做好的先占位。不翻页、不看以前的版本；页面改了就滚到新放上来的那块。一个总的回话处，每块下面也能回。
// 不放选择题、“我懂了”这类按钮（申请收口的“我觉得懂了”在底栏，01-流程 §4）。
// 旧版开的学习对话（没有 session_opened.screens）交回消息流只看（W10 §9 第 1、2 条）。
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ChevronRightIcon, LoaderIcon, ReplyIcon, XIcon } from 'lucide-react';
import { PlainMarkdown } from '@/components/assistant-ui/markdown-text';
import { InputComposer } from '@/components/input/composer';
import { MathPreview } from '@/components/input/math-preview';
import type { NumberedRecord } from '../../../shared/records.ts';
import type { LearnPageResponse, ResolvedBlock } from '../../../shared/screen.ts';
import { api } from '../../api.ts';
import { CurrentSessionContext, usePanel } from '../../panel.ts';
import { closeLine, failedSinceScreen, justSaid, screenRefreshKey } from '../../screen-model.ts';
import { loopSide, loopState } from '../../thread-model.ts';
import { W } from '../../wording.ts';
import { WP } from '../../wording-page.ts';
import { LongtermBanner } from '../longterm/loop-extras.tsx';
import { StageCheckBanner } from '../stage-check.tsx';
import { TopBar } from '../top-bar.tsx';
import { ComponentFrame } from './component-frame.tsx';
import { useLoad } from '../../hooks/use-load.ts';
import { VerdictBody } from '../evidence/loop-view.tsx';
import { Loading } from '../evidence/parts.tsx';
import { currentTicket, LoopBar, TicketDetails, TicketStrip } from './loop-parts.tsx';
import { StreamPage } from './stream-page.tsx';

export interface LearnPageProps {
  sessionId: string;
  title: string;
  projectId: string;
  projectTitle: string;
  titleOf: (id: string) => string | undefined;
  headerExtra: ReactNode;
  onError: (e: unknown) => void;
  onBackToMain: () => void;
  onProject: () => void;
  /** 旧版开的学习对话：交回消息流只看。 */
  oldLoop: ReactNode;
}

/** 订阅到的这次学习：记录、正在写的字、在不在跑、读完没有。 */
export interface LearnStream {
  records: NumberedRecord[];
  draft: string;
  running: boolean;
  loaded: boolean;
}

/** 按这次学习开时定的学习页种类分：竖流（10-29 #74 试验，stream-page.tsx）或区域图（下面的 GridPage）。 */
export function LearnPage(props: LearnPageProps) {
  const stream = useStream(props.sessionId, props.onError);
  const opened = stream.records[0]?.record;
  if (opened?.type === 'session_opened' && opened.page === 'stream') {
    return <StreamPage {...props} stream={stream} />;
  }
  return <GridPage {...props} stream={stream} />;
}

function GridPage(props: LearnPageProps & { stream: LearnStream }) {
  const { sessionId, onError, titleOf } = props;
  const { records, draft, running, loaded } = props.stream;
  const opened = records[0]?.record;
  const state = useMemo(() => loopState(records), [records]);
  const ended = state.kind === 'ended';
  const live = !ended;
  const refresh = useMemo(() => screenRefreshKey(records), [records]);
  const failed = useMemo(() => failedSinceScreen(records), [records]);
  const [page, setPage] = useState<LearnPageResponse | undefined>(undefined);
  const [replyTo, setReplyTo] = useState<{ key: string; pointer: string } | undefined>(undefined);
  const scroller = useRef<HTMLDivElement>(null);

  // 读现在的页面：跟着布局换版、组件换版、子代理开始 / 交回重读（占位换成组件）
  useEffect(() => {
    let alive = true;
    api
      .learnPage(sessionId)
      .then((p) => {
        if (alive) setPage(p);
      })
      .catch(onError);
    return () => {
      alive = false;
    };
  }, [sessionId, refresh, onError]);

  // 页面改了一版：滚到新放上来的第一块（页面一直在，新内容可能在中间，也可能在最下面）
  // 布局不止一列时页面放宽（一列时保持读文字的宽度）
  const wide = (page?.columns.trim().split(/\s+/).length ?? 1) > 1;
  const shownV = page?.v;
  const firstFresh = page?.fresh.find((n) => page.blocks[n] !== undefined);
  useEffect(() => {
    if (shownV === undefined || firstFresh === undefined) return;
    scroller.current
      ?.querySelector(`[data-area="${firstFresh}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [shownV, firstFresh]);

  const side = useMemo(() => loopSide(records), [records]);
  const ticket = useMemo(() => currentTicket(records), [records]);
  const said = useMemo(() => justSaid(records), [records]);
  const close = useMemo(() => closeLine(records), [records]);
  const panel = usePanel();
  const reply = useCallback((b: { key: string; pointer: string }) => {
    setReplyTo(b);
    document.querySelector<HTMLTextAreaElement>('[data-testid="learn-composer"] textarea')?.focus();
  }, []);

  if (loaded && opened?.type === 'session_opened' && opened.screens !== true) {
    return <>{props.oldLoop}</>;
  }

  return (
    <CurrentSessionContext.Provider value={sessionId}>
      <div className="flex h-full min-h-0 flex-col" data-testid="learn-page">
        <div className="shrink-0">
          <TopBar
            crumbs={[
              {
                label: props.projectTitle || W.projectHome,
                onClick: props.onProject,
                testId: 'crumb-project',
              },
              { label: props.title, testId: 'crumb-current' },
            ]}
            right={props.headerExtra}
          />
          <div className="mx-auto flex w-full max-w-[52rem] flex-col gap-1.5 px-4 pb-2 text-sm empty:hidden">
            {ticket !== undefined && <TicketStrip ticket={ticket} />}
            <LongtermBanner
              side={side}
              loopId={sessionId}
              projectId={props.projectId}
              titleOf={titleOf}
            />
            {side.stageCheck === true && <StageCheckBanner />}
          </div>
        </div>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <div
            className={`mx-auto flex w-full flex-col gap-4 px-4 py-4 ${wide ? 'max-w-[76rem]' : 'max-w-[52rem]'}`}
          >
            {page !== undefined && Object.keys(page.blocks).length > 0 ? (
              <PageGrid
                page={page}
                loopId={sessionId}
                live={live}
                onReply={reply}
                onError={onError}
              />
            ) : (
              page !== undefined &&
              draft === '' && <p className="text-muted-foreground">{WP.starting}</p>
            )}
            {said.map((m) => (
              <div key={m.line} className="flex flex-col items-end gap-1" data-testid="just-said">
                <span className="text-muted-foreground text-xs">{WP.youSaid}</span>
                <div className="bg-muted max-w-[85%] rounded-2xl px-4 py-2.5">
                  {m.replyTo !== undefined && (
                    <div className="text-muted-foreground mb-1 text-xs">
                      {WP.replyingTo(m.replyTo)}
                    </div>
                  )}
                  <MathPreview text={m.text} />
                </div>
              </div>
            ))}
            {close?.kind === 'closing' && (
              <p
                className="text-muted-foreground flex items-center gap-2 text-sm"
                data-testid="closing-line"
              >
                <LoaderIcon className="size-3.5 animate-spin" />
                {WP.closing}
              </p>
            )}
            {close?.kind === 'done' && (
              <button
                type="button"
                data-testid="judgement"
                className="text-muted-foreground hover:text-foreground group flex items-center gap-2 self-start text-sm"
                onClick={() =>
                  panel.show({ kind: 'loop', loopId: sessionId, verdictLine: close.verdictLine })
                }
              >
                <span className="bg-border h-px w-4" />
                {WP.closed}
                <span className="text-primary flex items-center text-xs opacity-80 group-hover:opacity-100">
                  {WP.seeClosed}
                  <ChevronRightIcon className="size-3.5" />
                </span>
              </button>
            )}
            {!running && failed !== undefined && (
              <p className="text-destructive text-sm" data-testid="learn-failed">
                {WP.failed(failed.notice)}
              </p>
            )}
            {running && (
              <div className="border-primary/30 border-s-2 ps-4" data-testid="learn-draft">
                {draft !== '' ? (
                  <PlainMarkdown text={draft} streaming />
                ) : (
                  <span className="text-muted-foreground flex items-center gap-2 text-sm">
                    <LoaderIcon className="size-4 animate-spin" />
                    {WP.writing}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[52rem] shrink-0 flex-col gap-2 px-4 pb-4">
          <LoopBar
            sessionId={sessionId}
            records={records}
            side={side}
            running={running}
            onError={onError}
            onBack={props.onBackToMain}
            projectId={props.projectId}
            projectTitle={props.projectTitle}
          />
          {!ended && (
            <div data-testid="learn-composer" className="flex flex-col gap-1">
              {replyTo !== undefined && (
                <div className="text-muted-foreground flex items-center gap-2 px-1 text-xs">
                  <ReplyIcon className="size-3.5" />
                  <span className="min-w-0 truncate">{WP.replyingTo(replyTo.pointer)}</span>
                  <button
                    type="button"
                    aria-label={WP.cancel}
                    className="hover:text-foreground"
                    onClick={() => setReplyTo(undefined)}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              )}
              <InputComposer
                placeholder={
                  side.shelved !== undefined
                    ? W.shelvedPlaceholder
                    : running
                      ? '可以随时插话…'
                      : '回复…'
                }
                onSend={async (text, images) => {
                  await api.send(sessionId, text, images, replyTo);
                  setReplyTo(undefined);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </CurrentSessionContext.Provider>
  );
}

/**
 * 照布局摆块：元素按区域图的阅读顺序输出（窄屏就是一列），宽屏由 styles.css 的 .learn-grid 按区域图摆。
 */
function PageGrid(props: {
  page: LearnPageResponse;
  loopId: string;
  live: boolean;
  onReply: (b: { key: string; pointer: string }) => void;
  onError: (e: unknown) => void;
}) {
  const { page } = props;
  const style = {
    '--learn-cols': page.columns,
    '--learn-areas': page.areas.map((r) => `"${r}"`).join(' '),
  } as CSSProperties;
  return (
    <div className="learn-grid" style={style} data-testid="learn-grid">
      {Object.entries(page.blocks).map(([name, b]) => (
        <div
          key={name}
          data-area={name}
          className="min-w-0 scroll-mt-4"
          style={{ '--learn-area': name } as CSSProperties}
        >
          <Block
            b={b}
            loopId={props.loopId}
            live={props.live}
            onReply={props.onReply}
            onError={props.onError}
          />
        </div>
      ))}
    </div>
  );
}

/** 页面上的一块。学习还开着时，每块下面能回话。 */
function Block(props: {
  b: ResolvedBlock;
  loopId: string;
  live: boolean;
  onReply: (b: { key: string; pointer: string }) => void;
  onError: (e: unknown) => void;
}) {
  const { b } = props;
  let body: ReactNode;
  switch (b.kind) {
    case 'text':
      body = <PlainMarkdown text={b.text} />;
      break;
    case 'learner':
      body = (
        <div className="bg-muted ms-auto max-w-[85%] rounded-2xl px-4 py-2.5">
          <MathPreview text={b.text} />
        </div>
      );
      break;
    case 'subagent':
      body = <p className="text-muted-foreground border-s-2 ps-3 text-sm">{b.text}</p>;
      break;
    case 'component':
      body = (
        <ComponentFrame
          loopId={props.loopId}
          component={b.component}
          version={b.version}
          blocks={b.blocks}
          live={props.live}
          title={b.pointer}
          onError={props.onError}
        />
      );
      break;
    case 'opening':
      body = (
        <div className="bg-muted/50 flex flex-col gap-1.5 rounded-lg px-3 py-2">
          <div className="text-muted-foreground text-xs">{WP.openingBlock}</div>
          {b.ticket !== undefined && <TicketDetails ticket={b.ticket} opening />}
        </div>
      );
      break;
    case 'closing':
      body = <ClosingBlock loopId={props.loopId} verdictLine={b.verdictLine} />;
      break;
    case 'pending':
      body = (
        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm">
          <LoaderIcon className="size-4 shrink-0 animate-spin" />
          <span>
            {WP.making}
            {b.pointer}
          </span>
        </div>
      );
      break;
  }
  return (
    <div className="group flex min-w-0 flex-col gap-1" data-block={b.key}>
      {body}
      {props.live && b.kind !== 'pending' && (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs opacity-60 group-hover:opacity-100"
          onClick={() => props.onReply({ key: b.key, pointer: b.pointer })}
        >
          <ReplyIcon className="size-3" />
          {WP.replyHere}
        </button>
      )}
    </div>
  );
}

/** 点名拿回的收尾记录：整理的内容，同“看整理的内容”点开那份（依据面板的判定卡里那几项）。 */
function ClosingBlock(props: { loopId: string; verdictLine: number }) {
  const r = useLoad(`loop:${props.loopId}`, () => api.loopEvidence(props.loopId));
  const v = r.data?.loop.verdicts.find((x) => x.line === props.verdictLine);
  return (
    <div className="bg-muted/50 flex flex-col gap-3 rounded-lg px-3 py-2 text-sm">
      <div className="text-muted-foreground text-xs">{WP.closingBlock}</div>
      {v !== undefined ? (
        <VerdictBody sessionId={props.loopId} verdict={v} />
      ) : (
        <Loading error={r.error} />
      )}
    </div>
  );
}

/** 订阅这次学习的记录、正在写的字、在不在跑（同对话页的外壳，学习页自己一份）。 */
function useStream(sessionId: string, onError: (e: unknown) => void): LearnStream {
  const [records, setRecords] = useState<NumberedRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // 竖流学习页：主模型的一条话记下就已经在页面上了，正在写的那段随之收起
  const streamPage = useRef(false);
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
        // 页面改好了，正在写的那段就收起（它已经在页面上）
        if (e.record.type === 'layout' || e.record.type === 'screen') setDraft('');
        if (e.record.type === 'assistant_message' && streamPage.current) setDraft('');
        setRecords((rs) =>
          rs.some((r) => r.line === e.line) ? rs : [...rs, { line: e.line, record: e.record }],
        );
      }
    });
    api
      .records(sessionId)
      .then((r) => {
        if (!alive) return;
        const first = r.records[0]?.record;
        streamPage.current = first?.type === 'session_opened' && first.page === 'stream';
        setRecords((rs) => {
          const byLine = new Map(r.records.map((x) => [x.line, x]));
          for (const x of rs) byLine.set(x.line, x);
          return [...byLine.values()].sort((a, b) => a.line - b.line);
        });
        setRunning(r.running);
        setLoaded(true);
      })
      .catch(onError);
    return () => {
      alive = false;
      stop();
    };
  }, [sessionId, onError]);
  return { records, draft, running, loaded };
}
