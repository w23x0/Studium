// 竖流学习页（10-29 #74 试验，与区域图并存）：主模型一个人管页面。页面从正本放一遍算出来（shared/stream-page.ts），
// 从上往下一列：开场、主模型的话、学习者的话、主模型写的组件。学习者上次说话之后主模型新放、改过、挪过、拿回的块标出来。
// 学习者选中页面上一段文字（或点组件上方的名字）再说话，输入框上方出现引用条，发送时带上；块下面不挂回话处。
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronRightIcon, LoaderIcon, QuoteIcon, XIcon } from 'lucide-react';
import { PlainMarkdown } from '@/components/assistant-ui/markdown-text';
import { InputComposer } from '@/components/input/composer';
import { MathPreview } from '@/components/input/math-preview';
import type { MessageQuote, NumberedRecord } from '../../../shared/records.ts';
import {
  freshMark,
  replayStream,
  type StreamBlock,
  type StreamMark,
} from '../../../shared/stream-page.ts';
import { api } from '../../api.ts';
import { CurrentSessionContext, usePanel } from '../../panel.ts';
import { closeLine } from '../../screen-model.ts';
import { loopSide, loopState } from '../../thread-model.ts';
import { W } from '../../wording.ts';
import { WP } from '../../wording-page.ts';
import { LongtermBanner } from '../longterm/loop-extras.tsx';
import { StageCheckBanner } from '../stage-check.tsx';
import { TopBar } from '../top-bar.tsx';
import { ComponentFrame } from './component-frame.tsx';
import type { LearnPageProps, LearnStream } from './learn-page.tsx';
import { currentTicket, LoopBar, TicketDetails, TicketStrip } from './loop-parts.tsx';

export function StreamPage(props: LearnPageProps & { stream: LearnStream }) {
  const { sessionId, onError, titleOf } = props;
  const { records, draft, running } = props.stream;
  const state = useMemo(() => loopState(records), [records]);
  const ended = state.kind === 'ended';
  const live = !ended;
  const page = useMemo(() => replayStream(records), [records]);
  const marks = useMemo(
    () => new Map(page.on.map((b) => [b.id, freshMark(records, b)] as const)),
    [page, records],
  );
  const failed = useMemo(() => failedSinceText(records), [records]);
  const side = useMemo(() => loopSide(records), [records]);
  const ticket = useMemo(() => currentTicket(records), [records]);
  const close = useMemo(() => closeLine(records), [records]);
  const panel = usePanel();
  const [quote, setQuote] = useState<MessageQuote | undefined>(undefined);
  const scroller = useRef<HTMLDivElement>(null);

  // 主模型动了页面：滚到这次动过的第一块（新内容可能在中间，也可能在最下面）
  const firstMarked = page.on.find((b) => marks.get(b.id) !== undefined);
  const markKey =
    firstMarked !== undefined ? `${firstMarked.id}@${String(firstMarked.touched.line)}` : '';
  useEffect(() => {
    if (markKey === '') return;
    const id = markKey.slice(0, markKey.lastIndexOf('@'));
    scroller.current
      ?.querySelector(`[data-block="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [markKey]);

  // 选中页面上一段文字：记成“第几行里的这段”（出自哪块由块上的 data-line 认）。听选区变化而不是松开鼠标：
  // 手机上长按选字不出 mouseup。点进输入框、发送后清掉选区时选区是空的，引用条照旧留着（有 × 可去掉）
  useEffect(() => {
    if (!live) return;
    const onSelect = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (sel === null || text === '' || sel.anchorNode === null) return;
      const el = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode.parentElement;
      const host = el?.closest<HTMLElement>('[data-line]');
      if (host === null || host === undefined || !scroller.current?.contains(host)) return;
      setQuote({ line: Number(host.dataset.line), text: text.slice(0, 2000) });
    };
    document.addEventListener('selectionchange', onSelect);
    return () => document.removeEventListener('selectionchange', onSelect);
  }, [live]);
  const focusComposer = () =>
    document.querySelector<HTMLTextAreaElement>('[data-testid="learn-composer"] textarea')?.focus();

  return (
    <CurrentSessionContext.Provider value={sessionId}>
      <div className="flex h-full min-h-0 flex-col" data-testid="learn-page" data-page="stream">
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
            className="mx-auto flex w-full max-w-[52rem] flex-col gap-4 px-4 py-4"
            data-testid="learn-stream"
          >
            {page.on.length === 0 && draft === '' && (
              <p className="text-muted-foreground">{WP.starting}</p>
            )}
            {page.on.map((b) => (
              <StreamBlockView
                key={b.id}
                b={b}
                mark={marks.get(b.id)}
                loopId={sessionId}
                live={live}
                onPickComponent={(name) => {
                  setQuote({ component: name });
                  focusComposer();
                }}
                onError={onError}
              />
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
              {quote !== undefined && (
                <div
                  className="text-muted-foreground flex items-center gap-2 px-1 text-xs"
                  data-testid="learn-quote"
                >
                  <QuoteIcon className="size-3.5 shrink-0" />
                  <span className="min-w-0 truncate">
                    {quote.component !== undefined
                      ? WP.quotingComponent(quote.component)
                      : WP.quoting(short(quote.text ?? ''))}
                  </span>
                  <button
                    type="button"
                    aria-label={WP.cancel}
                    className="hover:text-foreground"
                    onClick={() => setQuote(undefined)}
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
                      : '回复…（可先选中页面上一段）'
                }
                onSend={async (text, images) => {
                  await api.send(sessionId, text, images, undefined, quote);
                  setQuote(undefined);
                  window.getSelection()?.removeAllRanges();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </CurrentSessionContext.Provider>
  );
}

/** 页面上的一块；data-line = 它出自正本哪一行（选中文字时认块用）。 */
function StreamBlockView(props: {
  b: StreamBlock;
  mark: StreamMark | undefined;
  loopId: string;
  live: boolean;
  onPickComponent: (name: string) => void;
  onError: (e: unknown) => void;
}) {
  const { b, mark } = props;
  let body: ReactNode;
  switch (b.kind) {
    case 'text':
      body = <PlainMarkdown text={b.text} />;
      break;
    case 'learner':
      body = (
        <div className="bg-muted ms-auto flex max-w-[85%] flex-col gap-1 rounded-2xl px-4 py-2.5">
          {b.op !== undefined && (
            <span className="text-muted-foreground text-xs">{WP.onComponent(b.op)}</span>
          )}
          {b.quote !== undefined && (
            <span className="text-muted-foreground border-s-2 ps-2 text-xs">
              {b.quote.component !== undefined
                ? WP.componentName(b.quote.component)
                : WP.quotedLine(short(b.quote.text ?? ''))}
            </span>
          )}
          <MathPreview text={b.text} />
        </div>
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
    case 'component':
      body = (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            title={WP.pickComponent}
            disabled={!props.live}
            className="text-muted-foreground hover:text-foreground self-start text-xs disabled:hover:text-inherit"
            onClick={() => props.onPickComponent(b.name ?? '')}
          >
            {WP.componentName(b.name ?? '')}
          </button>
          <ComponentFrame
            loopId={props.loopId}
            component={b.name ?? ''}
            version={b.version ?? 1}
            blocks={[{ id: 'b1', html: b.text }]}
            live={props.live}
            title={b.name ?? ''}
            onError={props.onError}
          />
        </div>
      );
      break;
  }
  return (
    <div
      data-block={b.id}
      data-line={b.kind === 'component' ? undefined : b.line}
      data-mark={mark}
      className={`relative min-w-0 scroll-mt-4 transition-colors ${
        mark !== undefined ? 'border-primary/50 -ms-3 border-s-2 ps-[10px]' : ''
      }`}
    >
      {mark !== undefined && (
        <span className="text-primary/80 absolute -top-3.5 end-0 text-[10px]">
          {WP.marks[mark]}
        </span>
      )}
      {body}
    </div>
  );
}

function short(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 60 ? `${t.slice(0, 40)}……${t.slice(-12)}` : t;
}

/** 主模型最后一次写话之后没跑成的那一轮（界面上说一句，不进页面）。 */
function failedSinceText(records: NumberedRecord[]): { notice?: string } | undefined {
  let last = 0;
  for (const { line, record: r } of records) if (r.type === 'assistant_message') last = line;
  const f = records
    .flatMap(({ line, record: r }) => (line > last && r.type === 'turn_failed' ? [r] : []))
    .at(-1);
  if (f === undefined) return undefined;
  return f.notice !== undefined ? { notice: f.notice } : {};
}
