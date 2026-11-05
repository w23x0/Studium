// 竖流学习页（W12 起唯一的学习页）：学习对话一个人管页面。页面从正本放一遍算出来（shared/stream-page.ts），
// 从上往下一列：学习对话每轮最后写的话、学习者的话、学习对话写的组件。组件可以嵌在文字中间（`[[组件:名字]]`，W12 §5.1）；
// 改过的文字原地标出改了什么（11-04：删掉的划线、新加的接在后面并在左边标一道，`text-changes.ts`），换过版的组件一直标着“第 N 版”，都能点开看以前的样子（§4.7）。鼠标移到一块上左下角显示时间（§4.2）。
// 学习者选中页面上的几段文字（或点组件上方的名字）再说话：每选一处，输入框里多一块（能删），光标回到输入框，发送时一起带上
// （11-05 #92 起可多处；改过的文字里大段删除先折起来）。生成中途能停，停下后能改刚发的
// 那句（§4.4）；在做什么由程序从工具调用得出一行（§4.5）。学习结束后照样能说话，说了就重开（§2）。
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  HistoryIcon,
  LoaderIcon,
  PencilIcon,
  QuoteIcon,
  XIcon,
} from 'lucide-react';
import { PlainMarkdown } from '@/components/assistant-ui/markdown-text';
import { InputComposer } from '@/components/input/composer';
import { MathPreview } from '@/components/input/math-preview';
import type { MessageQuote, NumberedRecord } from '../../../shared/records.ts';
import { inlineParts, replayStream, type StreamBlock } from '../../../shared/stream-page.ts';
import { localMinute } from '../../../shared/time.ts';
import { latestContext } from '../../../shared/usage.ts';
import { api } from '../../api.ts';
import { CurrentSessionContext } from '../../panel.ts';
import { closeLine } from '../../screen-model.ts';
import { lastEditable, loopSide, loopState } from '../../thread-model.ts';
import { textChanges } from '../../text-changes.ts';
import { W } from '../../wording.ts';
import { WP } from '../../wording-page.ts';
import { WT } from '../../wording-tools.ts';
import { TopBar } from '../top-bar.tsx';
import { ComponentFrame } from './component-frame.tsx';
import type { LearnPageProps, LearnStream } from './learn-page.tsx';
import { CloseLineView, LoopBar } from './loop-parts.tsx';

export function StreamPage(props: LearnPageProps & { stream: LearnStream }) {
  const { sessionId, onError } = props;
  const { records, draft, running, activity } = props.stream;
  const state = useMemo(() => loopState(records), [records]);
  const context = useMemo(() => latestContext(records), [records]);
  const ended = state.kind === 'ended';
  const page = useMemo(() => replayStream(records), [records]);
  const atOf = useMemo(() => new Map(records.map((r) => [r.line, r.record.at])), [records]);
  const components = useMemo(
    () =>
      new Map(
        [...page.on, ...page.off]
          .filter((b) => b.kind === 'component' && b.name !== undefined)
          .map((b) => [b.name ?? '', b]),
      ),
    [page],
  );
  const failed = useMemo(() => failedSinceText(records), [records]);
  const side = useMemo(() => loopSide(records), [records]);
  const close = useMemo(() => closeLine(records), [records]);
  const editable = useMemo(() => lastEditable(records, running), [records, running]);
  // 选中的几处：quotes = 已收进输入框的；pending = 正在选着的那段（选区没了、松开鼠标时收进来）。
  // 两个都另存一份 ref：事件里和发送时读的是最新的
  const [quotes, setQuotesState] = useState<MessageQuote[]>([]);
  const [pending, setPendingState] = useState<MessageQuote | undefined>(undefined);
  const quotesRef = useRef<MessageQuote[]>([]);
  const pendingRef = useRef<MessageQuote | undefined>(undefined);
  const scroller = useRef<HTMLDivElement>(null);

  // 学习对话动了页面：滚到这次动过的那块（新内容可能在中间，也可能在最下面）
  const lastTouched = page.on.reduce<StreamBlock | undefined>(
    (m, b) => (m === undefined || b.touched.line > m.touched.line ? b : m),
    undefined,
  );
  const touchKey =
    lastTouched !== undefined ? `${lastTouched.id}@${String(lastTouched.touched.line)}` : '';
  useEffect(() => {
    if (touchKey === '') return;
    const id = touchKey.slice(0, touchKey.lastIndexOf('@'));
    scroller.current
      ?.querySelector(`[data-block="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [touchKey]);

  const setQuotes = (next: MessageQuote[]) => {
    quotesRef.current = next;
    setQuotesState(next);
  };
  const setPending = (q: MessageQuote | undefined) => {
    pendingRef.current = q;
    setPendingState(q);
  };
  const focusComposer = () =>
    document.querySelector<HTMLTextAreaElement>('[data-testid="learn-composer"] textarea')?.focus();

  // 选中页面上一段文字：记成“第几行里的这段”加前后几个字（出自哪块由块上的 data-line 认）。选着的时候先挂着；
  // 选区没了（点进输入框、点别处、开始选下一段）或电脑上松开鼠标，就收进输入框；松开鼠标时光标回到输入框。
  // 手机上长按选字不出 mouseup，靠选区没了时收
  useEffect(() => {
    const keep = () => {
      const p = pendingRef.current;
      if (p === undefined) return;
      pendingRef.current = undefined;
      setPendingState(undefined);
      if (!quotesRef.current.some((x) => sameQuote(x, p))) {
        quotesRef.current = [...quotesRef.current, p];
        setQuotesState(quotesRef.current);
      }
    };
    const onSelect = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (sel === null || text === '' || sel.rangeCount === 0) {
        keep();
        return;
      }
      const q = quoteOfSelection(sel, text, scroller.current);
      if (q === undefined) return;
      pendingRef.current = q;
      setPendingState(q);
    };
    const onUp = (e: MouseEvent) => {
      if (pendingRef.current === undefined) return;
      if (!(e.target instanceof Node) || !scroller.current?.contains(e.target)) return;
      keep();
      document
        .querySelector<HTMLTextAreaElement>('[data-testid="learn-composer"] textarea')
        ?.focus();
    };
    document.addEventListener('selectionchange', onSelect);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('selectionchange', onSelect);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);
  const pick = (name: string) => {
    const q: MessageQuote = { component: name };
    if (!quotesRef.current.some((x) => sameQuote(x, q))) setQuotes([...quotesRef.current, q]);
    focusComposer();
  };
  const shownQuotes = pending !== undefined ? [...quotes, pending] : quotes;
  const removeQuote = (i: number) => {
    if (i < quotes.length) {
      setQuotes(quotesRef.current.filter((_, k) => k !== i));
      return;
    }
    setPending(undefined);
    window.getSelection()?.removeAllRanges();
  };

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
        </div>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <div
            className="mx-auto flex w-full max-w-[52rem] flex-col gap-4 px-4 py-4"
            data-testid="learn-stream"
          >
            {page.on.length === 0 && draft === '' && !running && (
              <p className="text-muted-foreground">{WP.starting}</p>
            )}
            {page.on
              .filter((b) => b.inline !== true)
              .map((b) => (
                <StreamBlockView
                  key={b.id}
                  b={b}
                  at={atOf.get(b.line)}
                  components={components}
                  loopId={sessionId}
                  live={!ended}
                  editable={b.kind === 'learner' && editable === b.line}
                  onPickComponent={pick}
                  onEdit={(text) => api.editLast(sessionId, text)}
                  onError={onError}
                />
              ))}
            <CloseLineView sessionId={sessionId} close={close} />
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
                  <span
                    className="text-muted-foreground flex items-center gap-2 text-sm"
                    data-testid="learn-activity"
                  >
                    <LoaderIcon className="size-4 animate-spin" />
                    {activity ?? WT.writing}
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
          <div data-testid="learn-composer" className="flex flex-col gap-1">
            <InputComposer
              attached={
                shownQuotes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5" data-testid="learn-quotes">
                    {shownQuotes.map((q, i) => (
                      <span
                        key={`${String(i)}:${q.component ?? q.text ?? ''}`}
                        data-testid="learn-quote"
                        className={`bg-muted text-muted-foreground flex max-w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                          i >= quotes.length ? 'border-foreground/20 border border-dashed' : ''
                        }`}
                      >
                        <QuoteIcon className="size-3 shrink-0" />
                        <span className="min-w-0 truncate">
                          {q.component !== undefined
                            ? WP.quotingComponent(q.component)
                            : WP.quoting(short(q.text ?? ''))}
                        </span>
                        <button
                          type="button"
                          aria-label={WP.cancel}
                          className="hover:text-foreground shrink-0"
                          onClick={() => removeQuote(i)}
                        >
                          <XIcon className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : undefined
              }
              placeholder={
                ended
                  ? WP.reopenPlaceholder
                  : side.shelved !== undefined
                    ? W.shelvedPlaceholder
                    : running
                      ? '可以接着说（这一轮说完再交给它）…'
                      : '回复…（可先选中页面上的几段）'
              }
              running={running}
              onStop={async () => {
                await api.stop(sessionId);
              }}
              onSend={async (text, images) => {
                const p = pendingRef.current;
                const all = p !== undefined ? [...quotesRef.current, p] : quotesRef.current;
                await api.send(sessionId, text, images, undefined, all);
                setQuotes([]);
                setPending(undefined);
                window.getSelection()?.removeAllRanges();
              }}
              {...(context !== undefined ? { contextTokens: context } : {})}
            />
          </div>
        </div>
      </div>
    </CurrentSessionContext.Provider>
  );
}

/** 页面上的一块；data-line = 它出自正本哪一行（选中文字时认块用）。 */
function StreamBlockView(props: {
  b: StreamBlock;
  at: string | undefined;
  components: Map<string, StreamBlock>;
  loopId: string;
  live: boolean;
  editable: boolean;
  onPickComponent: (name: string) => void;
  onEdit: (text: string) => Promise<unknown>;
  onError: (e: unknown) => void;
}) {
  const { b } = props;
  const [old, setOld] = useState<number | undefined>(undefined);
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const history = b.history ?? [];
  const shown = old !== undefined ? (history[old] ?? b.text) : b.text;
  let body: ReactNode;
  switch (b.kind) {
    case 'text': {
      const parts = (text: string, gone: boolean) =>
        inlineParts(text).map((p, i) =>
          p.kind === 'text' ? (
            <PlainMarkdown key={i} text={p.text} />
          ) : gone ? (
            <p key={i}>{WP.componentName(p.name)}</p>
          ) : (
            <InlineComponent
              key={i}
              name={p.name}
              block={props.components.get(p.name)}
              loopId={props.loopId}
              live={props.live}
              onPick={props.onPickComponent}
              onError={props.onError}
            />
          ),
        );
      // 改过的文字：从第一版到现在，删掉的划线、新加的接在后面并在左边标一道（看以前的版本时照原样显示）
      const first = history[0];
      body = (
        <div className="flex flex-col gap-3">
          {old === undefined && first !== undefined
            ? textChanges(first, b.text).map((c, i) =>
                c.kind === 'same' ? (
                  <Fragment key={i}>{parts(c.text, false)}</Fragment>
                ) : c.kind === 'del' ? (
                  <Removed key={i} text={c.text}>
                    {parts(c.text, true)}
                  </Removed>
                ) : (
                  <div
                    key={i}
                    data-testid="text-added"
                    className="border-primary/40 flex flex-col gap-3 border-s-2 ps-3"
                  >
                    {parts(c.text, false)}
                  </div>
                ),
              )
            : parts(shown, false)}
        </div>
      );
      break;
    }
    case 'learner':
      body =
        editing !== undefined ? (
          <div className="ms-auto flex w-full max-w-[85%] flex-col gap-1.5" data-testid="edit-last">
            <textarea
              value={editing}
              rows={Math.min(8, Math.max(2, editing.split('\n').length))}
              className="bg-card focus:border-foreground/30 w-full rounded-xl border px-3 py-2 outline-none"
              onChange={(e) => setEditing(e.target.value)}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(undefined)}
              >
                {WT.editCancel}
              </button>
              <button
                type="button"
                className="text-primary disabled:opacity-50"
                disabled={editing.trim() === ''}
                onClick={() => {
                  props
                    .onEdit(editing)
                    .then(() => setEditing(undefined))
                    .catch(props.onError);
                }}
              >
                {WT.editSave}
              </button>
            </div>
          </div>
        ) : (
          <div className="ms-auto flex max-w-[85%] flex-col items-end gap-1">
            <div className="bg-muted flex flex-col gap-1 rounded-2xl px-4 py-2.5">
              {b.op !== undefined && (
                <span className="text-muted-foreground text-xs">{WP.onComponent(b.op)}</span>
              )}
              {(b.quotes ?? []).map((q, i) => (
                <span key={i} className="text-muted-foreground border-s-2 ps-2 text-xs">
                  {q.component !== undefined
                    ? WP.componentName(q.component)
                    : WP.quotedLine(short(q.text ?? ''))}
                </span>
              ))}
              <MathPreview text={b.text} />
            </div>
            {b.tidied !== undefined && <Tidied text={b.tidied} />}
            {props.editable && (
              <button
                type="button"
                data-testid="edit-last-open"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                onClick={() => setEditing(b.text)}
              >
                <PencilIcon className="size-3" />
                {WT.edit}
              </button>
            )}
          </div>
        );
      break;
    case 'component':
      body = (
        <InlineComponent
          name={b.name ?? ''}
          block={b}
          loopId={props.loopId}
          live={props.live}
          onPick={props.onPickComponent}
          onError={props.onError}
        />
      );
      break;
  }
  return (
    <div
      data-block={b.id}
      data-line={b.kind === 'component' ? undefined : b.line}
      className="group/block relative flex min-w-0 scroll-mt-4 flex-col gap-1"
    >
      {body}
      <div className="flex items-center gap-2 text-[0.7rem]">
        {props.at !== undefined && (
          <span
            data-testid="block-time"
            className="text-muted-foreground opacity-0 transition-opacity group-hover/block:opacity-100"
          >
            {localMinute(props.at)}
            {b.edited === true ? ` · ${WT.edited}` : ''}
          </span>
        )}
        {b.kind === 'text' && history.length > 0 && (
          <Versions
            label={WP.editedMark}
            count={history.length + 1}
            shown={old === undefined ? history.length : old}
            onShow={(i) => setOld(i === history.length ? undefined : i)}
          />
        )}
      </div>
    </div>
  );
}

/** 组件（单独一块，或嵌在文字里）：上方名字（点一下 = 就这个组件说话）与“第 N 版”，能点开看旧版（W12 §4.7）。 */
function InlineComponent(props: {
  name: string;
  block: StreamBlock | undefined;
  loopId: string;
  live: boolean;
  onPick: (name: string) => void;
  onError: (e: unknown) => void;
}) {
  const [old, setOld] = useState<number | undefined>(undefined);
  const b = props.block;
  if (b === undefined) {
    return <p className="text-muted-foreground text-xs">{WP.componentMissing(props.name)}</p>;
  }
  const history = b.history ?? [];
  const version = old !== undefined ? old + 1 : (b.version ?? 1);
  const html = old !== undefined ? (history[old] ?? b.text) : b.text;
  return (
    <div className="flex flex-col gap-1" data-testid="stream-component">
      <div className="flex items-center gap-2 text-xs">
        <button
          type="button"
          title={WP.pickComponent}
          disabled={!props.live}
          className="text-muted-foreground hover:text-foreground disabled:hover:text-inherit"
          onClick={() => props.onPick(props.name)}
        >
          {WP.componentName(props.name)}
        </button>
        {history.length > 0 && (
          <Versions
            label={WP.versionMark(b.version ?? 1)}
            count={history.length + 1}
            shown={old === undefined ? history.length : old}
            onShow={(i) => setOld(i === history.length ? undefined : i)}
          />
        )}
      </div>
      <ComponentFrame
        loopId={props.loopId}
        component={props.name}
        version={version}
        blocks={[{ id: 'b1', html }]}
        live={props.live && old === undefined}
        title={props.name}
        onError={props.onError}
      />
    </div>
  );
}

/** 改动标记（常驻，W12 §4.7）：点开列出各版，点哪版看哪版；最后一版是现在的。 */
function Versions(props: {
  label: string;
  count: number;
  shown: number;
  onShow: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1" data-testid="version-mark">
      <button
        type="button"
        className="text-primary/80 hover:text-primary flex items-center gap-1"
        onClick={() => setOpen((x) => !x)}
      >
        <HistoryIcon className="size-3" />
        {props.label}
      </button>
      {open && (
        <span className="flex items-center gap-1">
          {Array.from({ length: props.count }, (_, i) => (
            <button
              key={i}
              type="button"
              data-testid="version-pick"
              className={
                i === props.shown
                  ? 'bg-primary/10 text-primary rounded px-1'
                  : 'text-muted-foreground hover:text-foreground rounded px-1'
              }
              onClick={() => props.onShow(i)}
            >
              {i === props.count - 1 ? WP.versionNow : WP.versionN(i + 1)}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function short(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 60 ? `${t.slice(0, 40)}……${t.slice(-12)}` : t;
}

/** 学习对话最后一次写话之后没跑成的那一轮（界面上说一句，不进页面）。 */
function failedSinceText(records: NumberedRecord[]): { notice?: string } | undefined {
  let last = 0;
  for (const { line, record: r } of records) {
    if (r.type === 'assistant_message' && r.interim !== true) last = line;
  }
  const f = records
    .flatMap(({ line, record: r }) => (line > last && r.type === 'turn_failed' ? [r] : []))
    .at(-1);
  if (f === undefined) return undefined;
  return f.notice !== undefined ? { notice: f.notice } : {};
}

/** 大段删除（字数或行数过这条线）先折起来（11-05 #92）：学习对话改大段文字时，划掉的旧文不占满一屏。 */
const LONG_REMOVAL_CHARS = 200;
const LONG_REMOVAL_LINES = 4;

/** 改过的文字里删掉的一段：短的直接划线；长的先折成一行，点开再看划掉的原文。 */
function Removed(props: { text: string; children: ReactNode }) {
  const long =
    props.text.length > LONG_REMOVAL_CHARS || props.text.split('\n').length > LONG_REMOVAL_LINES;
  const [open, setOpen] = useState(false);
  const struck = (
    <div
      data-testid="text-removed"
      className="text-muted-foreground flex flex-col gap-3 line-through"
    >
      {props.children}
    </div>
  );
  if (!long) return struck;
  return (
    <div className="flex flex-col gap-2" data-testid="text-removed-long">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-sm"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        {open ? WP.removedFold : WP.removedFolded(props.text.replace(/\s+/g, '').length)}
      </button>
      {open && struck}
    </div>
  );
}

/** 学习者那句话下面：学习对话整理过的样子（W17），默认收着，点开看。 */
function Tidied(props: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-col items-end gap-1" data-testid="learner-tidied">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDownIcon className="size-3" /> : <ChevronRightIcon className="size-3" />}
        {open ? WP.tidiedHide : WP.tidiedShow}
      </button>
      {open && (
        <div className="text-muted-foreground border-s-2 ps-3 text-sm">
          <MathPreview text={props.text} />
        </div>
      )}
    </div>
  );
}

/** 同一处（同一行里同一段字、同一个组件）：重复选的不再多放一块。 */
function sameQuote(a: MessageQuote, b: MessageQuote): boolean {
  return (
    a.component === b.component &&
    a.line === b.line &&
    a.text === b.text &&
    a.before === b.before &&
    a.after === b.after
  );
}

/**
 * 当前选区 → 选中的一处：出自哪块按选区开头所在块的 data-line 认（只认学习页里的块）；
 * 加上选区前后各十来个字，同一块里同样的字出现几次时靠它认是哪一处。
 */
function quoteOfSelection(
  sel: Selection,
  text: string,
  root: HTMLElement | null,
): MessageQuote | undefined {
  const range = sel.getRangeAt(0);
  const start = range.startContainer;
  const el = start instanceof Element ? start : start.parentElement;
  const host = el?.closest<HTMLElement>('[data-line]');
  if (host === null || host === undefined || root === null || !root.contains(host)) {
    return undefined;
  }
  const q: MessageQuote = { line: Number(host.dataset.line), text: text.slice(0, 2000) };
  // 前后几个字按 DOM 原文算（Range.toString 与 textContent 同一口径；公式渲染出来的字可能夹着源码，只作认位置的线索）
  const head = document.createRange();
  head.setStart(host, 0);
  head.setEnd(range.startContainer, range.startOffset);
  const all = host.textContent;
  const from = head.toString().length;
  const to = from + range.toString().length;
  const before = all.slice(Math.max(0, from - 12), from).trim();
  const after = all.slice(to, to + 12).trim();
  return {
    ...q,
    ...(before !== '' ? { before } : {}),
    ...(after !== '' ? { after } : {}),
  };
}
