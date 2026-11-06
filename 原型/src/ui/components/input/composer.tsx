// 输入框（照 Claude 的输入框）：打字；学习页选中页面上的一段，就在光标处多一个引用块，和文字排在一起，只显示开头（11-06）。
// 主对话能把文件拖进来上传。
import { ArrowUpIcon, LoaderCircleIcon, SquareIcon } from 'lucide-react';
import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import type { PickedFile } from '@/files';
import { cn } from '@/lib/utils';
import { W } from '@/wording';
import { WT } from '@/wording-tools';
import type { MessageQuote } from '../../../shared/records.ts';

export type SendInput = (text: string, quotes: MessageQuote[]) => Promise<void>;

/** 学习页往输入框里放引用块用。 */
export interface ComposerHandle {
  addQuote: (quote: MessageQuote) => void;
  focus: () => void;
}

const coarse = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export function InputComposer(props: {
  placeholder: string;
  onSend: SendInput;
  /** 模型在生成：没打字时发送键换成停止键（W12 §4.4）；打了字照常能发（排到这一轮之后）。 */
  running?: boolean;
  onStop?: () => Promise<void>;
  /** 拖进文件时（只有主对话给）：不进输入，交给项目的上传；回给学习者看的：一句话，或上传结果那一条（可点改，W11 §2）。 */
  onOtherFiles?: (files: PickedFile[]) => Promise<ReactNode>;
  /** 学习页：放引用块的入口。 */
  handle?: Ref<ComposerHandle>;
  /** 发送前先调一次（学习页：把还选着的那段收进来）。 */
  beforeSend?: () => void;
  /** 这个对话现在的上下文大小（最新一条 context_used，W14 §2）；还没回过话不给。 */
  contextTokens?: number;
  modelControls?: ReactNode;
}) {
  const [typed, setTyped] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [notice, setNotice] = useState<ReactNode>(undefined);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const area = useRef<HTMLDivElement>(null);
  const quotes = useRef(new Map<string, MessageQuote>());
  const nextQuote = useRef(0);
  /** 光标最后在输入框里的位置：选中页面文字时焦点在外面，引用块放回这里。 */
  const caret = useRef<Range | undefined>(undefined);

  const sync = () => {
    const el = area.current;
    if (el === null) return;
    const now = readInput(el, quotes.current);
    // 全删光时浏览器常留一个 <br>：清掉才显示占位字
    if (now.typed === '' && now.quotes.length === 0 && el.textContent.trim() === '') {
      el.replaceChildren();
    }
    setTyped(now.typed !== '');
    setEmpty(el.childNodes.length === 0);
  };

  useEffect(() => {
    area.current?.focus();
    const remember = () => {
      const el = area.current;
      const sel = window.getSelection();
      if (el === null || sel === null || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (el.contains(range.startContainer)) caret.current = range.cloneRange();
    };
    document.addEventListener('selectionchange', remember);
    return () => document.removeEventListener('selectionchange', remember);
  }, []);

  useImperativeHandle(
    props.handle,
    () => ({
      focus: () => area.current?.focus(),
      addQuote: (quote) => {
        const el = area.current;
        if (el === null) return;
        // 重复选的不再多放一块；已经删掉的块不算
        const shown = readInput(el, quotes.current).quotes;
        if (shown.some((q) => sameQuote(q, quote))) return;
        const key = String(nextQuote.current++);
        quotes.current.set(key, quote);
        const chip = quoteChip(key, quote);
        const space = document.createTextNode(' ');
        const range = caret.current;
        if (range !== undefined && el.contains(range.startContainer)) {
          range.deleteContents();
          range.insertNode(space);
          range.insertNode(chip);
        } else {
          el.append(chip, space);
        }
        // 光标放到引用块后面，接着打字
        el.focus();
        const after = document.createRange();
        after.setStartAfter(space);
        after.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(after);
        sync();
      },
    }),
    // sync 只读 ref 与 setState，换一个实例也一样
    [],
  );

  const canSend = !sending && typed;

  const send = async () => {
    props.beforeSend?.();
    const el = area.current;
    if (el === null || !canSend) return;
    setSending(true);
    try {
      const now = readInput(el, quotes.current);
      await props.onSend(now.text, now.quotes);
      el.replaceChildren();
      quotes.current.clear();
      caret.current = undefined;
      sync();
      setNotice(undefined);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const upload = props.onOtherFiles;
  const addFiles = (list: FileList) => {
    if (upload === undefined) return;
    const all = [...list];
    setNotice(W.filesUploading(all.length));
    upload(all.map((file) => ({ file, path: file.name })))
      .then(setNotice)
      .catch((e: unknown) => setNotice(e instanceof Error ? e.message : String(e)));
  };

  return (
    <div
      className="relative flex w-full flex-col"
      {...(upload !== undefined
        ? {
            onDragOver: (e: React.DragEvent) => {
              if (![...e.dataTransfer.types].includes('Files')) return;
              e.preventDefault();
              setDragging(true);
            },
            onDragLeave: (e: React.DragEvent) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
            },
            onDrop: (e: React.DragEvent) => {
              if (e.dataTransfer.files.length === 0) return;
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            },
          }
        : {})}
    >
      <div
        className={cn(
          'border-foreground/15 focus-within:border-foreground/30 bg-card flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-[border-color]',
          dragging && 'border-primary border-dashed',
        )}
      >
        {dragging && <p className="text-primary px-1.5 text-sm">{W.dropHere}</p>}
        {notice !== undefined &&
          (typeof notice !== 'string' ? (
            <div className="px-1.5 text-xs">{notice}</div>
          ) : (
            <p className="text-destructive px-1.5 text-xs">{notice}</p>
          ))}
        <div className="flex items-end gap-2">
          <div className="relative min-w-0 flex-1">
            {empty && (
              <span className="text-muted-foreground/70 pointer-events-none absolute inset-x-1.5 top-1 truncate text-base leading-6">
                {props.placeholder}
              </span>
            )}
            <div
              ref={area}
              role="textbox"
              aria-multiline="true"
              aria-label="输入"
              tabIndex={0}
              contentEditable
              suppressContentEditableWarning
              data-testid="composer-input"
              className="max-h-48 min-h-8 w-full overflow-y-auto px-1.5 py-1 text-base leading-6 break-words whitespace-pre-wrap outline-none"
              onInput={sync}
              onClick={(e) => {
                const button = (e.target as Element).closest('[data-quote-remove]');
                if (button === null) return;
                button.closest('[data-quote]')?.remove();
                sync();
                area.current?.focus();
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
                e.preventDefault();
                if (e.shiftKey || coarse()) {
                  // 换行要保住光标与撤销，contentEditable 目前只有这条路
                  // eslint-disable-next-line @typescript-eslint/no-deprecated
                  document.execCommand('insertLineBreak');
                  return;
                }
                void send();
              }}
              onPaste={(e) => {
                // 只收纯文字：别处复制来的样式不进输入框
                e.preventDefault();
                // eslint-disable-next-line @typescript-eslint/no-deprecated
                document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
              }}
            />
          </div>
          {props.running === true && props.onStop !== undefined && !typed ? (
            <TooltipIconButton
              tooltip={WT.stop}
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="size-8 shrink-0 rounded-lg"
              aria-label={WT.stop}
              data-testid="stop"
              onClick={() => {
                props.onStop?.().catch((e: unknown) => {
                  setNotice(e instanceof Error ? e.message : String(e));
                });
              }}
            >
              <SquareIcon className="size-3.5 fill-current" />
            </TooltipIconButton>
          ) : (
            <TooltipIconButton
              tooltip={W.send}
              side="bottom"
              type="button"
              variant="default"
              size="icon"
              className="size-8 shrink-0 rounded-lg"
              aria-label={W.send}
              disabled={!canSend}
              onClick={() => void send()}
            >
              {sending ? (
                <LoaderCircleIcon className="size-4 animate-spin" />
              ) : (
                <ArrowUpIcon className="size-4" />
              )}
            </TooltipIconButton>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">{props.modelControls}</div>
        {props.contextTokens !== undefined && (
          <p
            data-testid="context-size"
            className="text-muted-foreground shrink-0 px-2 pt-2 text-xs"
          >
            {W.usage.context(props.contextTokens)}
          </p>
        )}
      </div>
    </div>
  );
}

/** 输入框里的引用块：不可编辑的一小块，只显示开头，鼠标停住看全文。块是 DOM 节点，光标才能排在它前后。 */
function quoteChip(key: string, q: MessageQuote): HTMLElement {
  const chip = document.createElement('span');
  chip.contentEditable = 'false';
  chip.dataset.quote = key;
  chip.dataset.testid = 'learn-quote';
  chip.title = q.component !== undefined ? `组件「${q.component}」` : (q.text ?? '');
  chip.className =
    'bg-muted text-muted-foreground mx-0.5 inline-flex max-w-64 items-center gap-1 rounded-md px-1.5 align-text-bottom text-xs leading-5 select-none';
  const label = document.createElement('span');
  label.className = 'truncate';
  label.textContent =
    q.component !== undefined ? `组件「${q.component}」` : `❝ ${shortQuote(q.text ?? '', 24)}`;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.dataset.quoteRemove = '';
  remove.setAttribute('aria-label', '取消引用');
  remove.className = 'hover:text-foreground shrink-0 cursor-pointer';
  remove.textContent = '×';
  chip.append(label, remove);
  return chip;
}

function shortQuote(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/**
 * 输入框现在的内容：typed = 打的字；quotes = 按顺序的引用块；text = 发出去的那句。
 * 开头的引用块不进 text（消息头上已经写了选中了哪段）；夹在话中间的留一个简短的提法，读得出这句话在说哪段。
 */
function readInput(
  el: HTMLElement,
  known: ReadonlyMap<string, MessageQuote>,
): { text: string; typed: string; quotes: MessageQuote[] } {
  let text = '';
  let typed = '';
  const found: MessageQuote[] = [];
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const part = child.textContent ?? '';
        text += part;
        typed += part;
      } else if (child instanceof HTMLElement) {
        const key = child.dataset.quote;
        if (key !== undefined) {
          const q = known.get(key);
          if (q === undefined) continue;
          found.push(q);
          if (typed.trim() !== '') {
            text +=
              q.component !== undefined
                ? `组件「${q.component}」`
                : `「${shortQuote(q.text ?? '', 12)}」`;
          }
        } else if (child.tagName === 'BR') {
          text += '\n';
          typed += '\n';
        } else {
          // 浏览器有时把新行包一层块元素
          if (text !== '' && !text.endsWith('\n')) {
            text += '\n';
            typed += '\n';
          }
          walk(child);
        }
      }
    }
  };
  walk(el);
  return { text: text.trim(), typed: typed.trim(), quotes: found };
}

/** 同一处（同一行里同一段字、同一个组件）。 */
function sameQuote(a: MessageQuote, b: MessageQuote): boolean {
  return (
    a.component === b.component &&
    a.line === b.line &&
    a.text === b.text &&
    a.before === b.before &&
    a.after === b.after
  );
}
