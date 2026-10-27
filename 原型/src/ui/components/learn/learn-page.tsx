// 学习页（会话/学习对话.md §11）：一次学习只有一条上下文，学习者眼前是从这条线里取出的、此刻要看的一屏。
// 每一屏由主模型这一轮的输出定，框架摆好（核心存成一张块清单）；这里照清单摆块：主模型的文字直接显示，
// 组件放各自小窗，还没做好的先占位。可翻看以前任一屏（只看，不改屏幕也不改上下文）；一个总的回话处，每块下面也能回。
// 不放选择题、“我懂了”这类按钮（申请收口的“我觉得懂了”在底栏，01-流程 §4）。
// 旧版开的学习对话（没有 session_opened.screens）交回消息流只看（W10 §9 第 1、2 条）。
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronDownIcon, ChevronRightIcon, LoaderIcon, ReplyIcon, XIcon } from 'lucide-react';
import { PlainMarkdown } from '@/components/assistant-ui/markdown-text';
import { InputComposer } from '@/components/input/composer';
import { MathPreview } from '@/components/input/math-preview';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import type { NumberedRecord } from '../../../shared/records.ts';
import type { ResolvedBlock, ScreenResponse } from '../../../shared/screen.ts';
import { localMinute } from '../../../shared/time.ts';
import { api } from '../../api.ts';
import { CurrentSessionContext, usePanel } from '../../panel.ts';
import {
  closeLine,
  failedSinceScreen,
  justSaid,
  screenRefreshKey,
  screensOf,
} from '../../screen-model.ts';
import { loopSide, loopState } from '../../thread-model.ts';
import { W } from '../../wording.ts';
import { WP } from '../../wording-page.ts';
import { LongtermBanner } from '../longterm/loop-extras.tsx';
import { StageCheckBanner } from '../stage-check.tsx';
import { TopBar } from '../top-bar.tsx';
import { ComponentFrame } from './component-frame.tsx';
import { currentTicket, LoopBar, TicketStrip } from './loop-parts.tsx';

export function LearnPage(props: {
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
}) {
  const { sessionId, onError, titleOf } = props;
  const { records, draft, running, loaded } = useStream(sessionId, onError);
  const opened = records[0]?.record;
  const screens = useMemo(() => screensOf(records), [records]);
  const [viewing, setViewing] = useState<number | undefined>(undefined);
  const current = screens.at(-1);
  const shownN = viewing ?? current?.n;
  const state = useMemo(() => loopState(records), [records]);
  const ended = state.kind === 'ended';
  const live = viewing === undefined && !ended;
  const refresh = useMemo(() => screenRefreshKey(records), [records]);
  const [screen, setScreen] = useState<ScreenResponse | undefined>(undefined);
  const [replyTo, setReplyTo] = useState<{ key: string; pointer: string } | undefined>(undefined);
  const scroller = useRef<HTMLDivElement>(null);

  // 读要显示的那一屏：当前屏跟着新屏、组件换版、子代理开始 / 交回重读（占位换成组件）
  useEffect(() => {
    if (shownN === undefined) return;
    let alive = true;
    api
      .screen(sessionId, shownN)
      .then((s) => {
        if (alive) setScreen(s);
      })
      .catch(onError);
    return () => {
      alive = false;
    };
  }, [sessionId, shownN, refresh, onError]);

  // 换了一屏就回到顶上（一屏是一整个新的视野，不是往下接）
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [shownN]);

  const side = useMemo(() => loopSide(records), [records]);
  const ticket = useMemo(() => currentTicket(records), [records]);
  const said = useMemo(() => (viewing === undefined ? justSaid(records) : []), [records, viewing]);
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
        {viewing !== undefined && (
          <div className="bg-muted/60 flex shrink-0 flex-wrap items-center justify-center gap-2 px-3 py-2 text-xs">
            <span>{WP.viewingOld(viewing)}</span>
            <Button variant="outline" size="xs" onClick={() => setViewing(undefined)}>
              {WP.backToNow}
            </Button>
          </div>
        )}
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[52rem] flex-col gap-4 px-4 py-4">
            {screens.length > 1 && (
              <History
                screens={screens}
                shown={shownN}
                onPick={(n) => setViewing(n === current?.n ? undefined : n)}
              />
            )}
            {screen !== undefined && screen.n === shownN
              ? screen.rows.map((row, i) => (
                  <div
                    key={`${String(screen.n)}-${String(i)}`}
                    className={row.length > 1 ? 'grid gap-4 md:grid-cols-2' : 'flex flex-col'}
                  >
                    {row.map((b) => (
                      <Block
                        key={b.key}
                        b={b}
                        loopId={sessionId}
                        live={live}
                        onReply={reply}
                        onError={onError}
                      />
                    ))}
                  </div>
                ))
              : shownN === undefined &&
                draft === '' && <p className="text-muted-foreground">{WP.starting}</p>}
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
            {viewing === undefined && close?.kind === 'closing' && (
              <p
                className="text-muted-foreground flex items-center gap-2 text-sm"
                data-testid="closing-line"
              >
                <LoaderIcon className="size-3.5 animate-spin" />
                {WP.closing}
              </p>
            )}
            {viewing === undefined && close?.kind === 'done' && (
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
            {viewing === undefined && !running && failedSinceScreen(records) && (
              <p className="text-destructive text-sm" data-testid="learn-failed">
                {WP.failed}
              </p>
            )}
            {viewing === undefined && running && (
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
                  setViewing(undefined);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </CurrentSessionContext.Provider>
  );
}

/** 屏幕上的一块。当前屏、学习还开着时，每块下面能回话。 */
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

/** 以前的屏幕：可翻看任一屏（只看）。 */
function History(props: {
  screens: { n: number; at: string }[];
  shown: number | undefined;
  onPick: (n: number) => void;
}) {
  return (
    <Menu>
      <MenuTrigger
        data-testid="screen-history"
        className="text-muted-foreground hover:bg-muted flex items-center gap-1 self-end rounded-md px-2 py-1 text-xs"
      >
        {WP.history} <ChevronDownIcon className="size-3.5" />
      </MenuTrigger>
      <MenuContent align="end">
        {[...props.screens].reverse().map((s) => (
          <MenuItem key={s.n} onClick={() => props.onPick(s.n)}>
            <span className={s.n === props.shown ? 'font-medium' : ''}>
              {WP.screenAt(s.n, localMinute(s.at).slice(-5))}
            </span>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

/** 订阅这次学习的记录、正在写的字、在不在跑（同对话页的外壳，学习页自己一份）。 */
function useStream(
  sessionId: string,
  onError: (e: unknown) => void,
): { records: NumberedRecord[]; draft: string; running: boolean; loaded: boolean } {
  const [records, setRecords] = useState<NumberedRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
        // 一屏摆好了，正在写的那段就收起（它已经在屏幕上）
        if (e.record.type === 'screen') setDraft('');
        setRecords((rs) =>
          rs.some((r) => r.line === e.line) ? rs : [...rs, { line: e.line, record: e.record }],
        );
      }
    });
    api
      .records(sessionId)
      .then((r) => {
        if (!alive) return;
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
