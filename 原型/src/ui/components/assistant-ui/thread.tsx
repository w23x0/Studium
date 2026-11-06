// 由 assistant-ui 模板 0.0.121（MIT）的 thread.aui.tsx 删减而来：
// 去掉分支、建议；文字改中文；版式往 Claude 桌面版靠。
// 输入框换成自己的（components/input/composer.tsx）；生成中途能停（W12 §4.4）。
// 鼠标移到消息上左下角显示时间（W12 §4.2）；停下后能改自己刚发的那句（W12 §4.4）；讨论串一张卡片带状态（§4.1）。
import { MarkdownText } from '@/components/assistant-ui/markdown-text';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import {
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react';
import { ArrowDownIcon, ArrowRightIcon, LoaderIcon, PencilIcon } from 'lucide-react';
import { CitationsProvider } from '@/components/sources/citation';
import { InputComposer, type SendInput } from '@/components/input/composer';
import type { PickedFile } from '@/files';
import { coversAny } from '@/evidence-model';
import { useOpenSession } from '@/open-session';
import { useHighlight } from '@/panel';
import { W } from '@/wording';
import { WT } from '@/wording-tools';
import type { ThreadGroup } from '../../../shared/threads.ts';
import { localMinute } from '../../../shared/time.ts';
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';

/** 消息带的附加信息（由 App 的 convertMessage 放进 metadata.custom）。 */
interface MessageMeta {
  line?: number;
  lines?: number[];
  link?: UiLink;
  at?: string;
  edited?: true;
  reaction?: string;
  editable?: true;
  card?: { sessionId: string; title: string; group?: ThreadGroup };
  /** 正在写的那条：模型这会儿在做什么（W12 §4.5）。 */
  activity?: string;
}

/** 消息左下角的时间：鼠标移上去才显示（W12 §4.2）；改过的标“改过”。 */
const Stamp: FC<{ at?: string; edited?: true; align?: 'start' | 'end' }> = ({
  at,
  edited,
  align,
}) =>
  at === undefined ? null : (
    <span
      data-testid="message-time"
      className={cn(
        'text-muted-foreground pointer-events-none text-[0.7rem] opacity-0 transition-opacity group-hover/message:opacity-100',
        align === 'end' && 'self-start',
      )}
    >
      {localMinute(at)}
      {edited === true ? ` · ${WT.edited}` : ''}
    </span>
  );

function useMeta(): MessageMeta {
  return useAuiState((s) => s.message.metadata.custom as MessageMeta);
}

/** 这条消息覆盖的行号（data-lines 用空格隔开，好用 [data-lines~="12"] 找）与是否高亮。 */
function useLines(): { attr: string; lit: boolean } {
  const meta = useMeta();
  const lines = meta.lines ?? (meta.line !== undefined ? [meta.line] : []);
  const wanted = useHighlight();
  return { attr: lines.join(' '), lit: coversAny(lines, wanted) };
}

export const Thread: FC<{
  welcome?: string;
  header?: ReactNode;
  footer?: ReactNode;
  disabled?: boolean;
  placeholder?: string;
  /** 模型在生成：输入框换成停止键（W12 §4.4）。 */
  running?: boolean;
  onStop?: () => Promise<void>;
  /** 停下后改自己刚发的那句、重新生成。 */
  onEditLast?: (text: string) => Promise<void>;
  /** 发一条消息。 */
  onSend: SendInput;
  /** 拖进文件时（只有主对话给）：走项目的上传，回给学习者看的（上传结果那一条，可点改）。 */
  onFiles?: (files: PickedFile[]) => Promise<ReactNode>;
  /** 这个对话现在的上下文大小（W14 §2），输入框下方靠右显示。 */
  contextTokens?: number | undefined;
  modelControls?: ReactNode;
}> = ({
  welcome = '今天想学点什么？',
  header,
  footer,
  disabled = false,
  placeholder = '回复…',
  running = false,
  onStop,
  onEditLast,
  onSend,
  onFiles,
  contextTokens,
  modelControls,
}) => {
  const isEmpty = useAuiState((s) => s.thread.messages.length === 0);
  const viewport = useStickToBottom();
  return (
    <ThreadPrimitive.Root
      className="aui-root bg-background @container flex h-full flex-col"
      style={{
        ['--thread-max-width' as string]: '46rem',
        ['--composer-radius' as string]: '1.25rem',
      }}
    >
      {header}
      <ThreadPrimitive.Viewport
        ref={viewport}
        turnAnchor="bottom"
        autoScroll
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div
          className={cn(
            'mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-8',
            isEmpty && 'justify-center',
          )}
        >
          {isEmpty && (
            <p className="font-serif text-foreground/90 mb-8 text-center text-2xl text-balance">
              {welcome}
            </p>
          )}
          <div className="mb-14 flex flex-col gap-y-6 empty:hidden">
            <ThreadPrimitive.Messages>
              {({ message }) =>
                message.role === 'user' ? (
                  <UserMessage onEditLast={onEditLast} />
                ) : message.role === 'system' ? (
                  <SystemMessage />
                ) : (
                  <AssistantMessage />
                )
              }
            </ThreadPrimitive.Messages>
          </div>
          <ThreadPrimitive.ViewportFooter
            className={cn(
              'bg-background flex flex-col gap-4 overflow-visible pb-4 md:pb-6',
              !isEmpty && 'sticky bottom-0 mt-auto',
            )}
          >
            <ThreadPrimitive.ScrollToBottom asChild>
              <TooltipIconButton
                tooltip="回到底部"
                variant="outline"
                className="absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
              >
                <ArrowDownIcon />
              </TooltipIconButton>
            </ThreadPrimitive.ScrollToBottom>
            {footer}
            {!disabled && (
              <InputComposer
                modelControls={modelControls}
                placeholder={placeholder}
                onSend={onSend}
                running={running}
                {...(onStop !== undefined ? { onStop } : {})}
                {...(onFiles !== undefined ? { onOtherFiles: onFiles } : {})}
                {...(contextTokens !== undefined ? { contextTokens } : {})}
              />
            )}
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  const { attr, lit } = useLines();
  const meta = useMeta();
  const text = useAuiState((s) =>
    s.message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
  );
  const done = useAuiState((s) => s.message.status?.type !== 'running');
  return (
    <MessagePrimitive.Root
      data-role="assistant"
      data-lines={attr}
      className={cn(
        'group/message fade-in animate-in relative flex scroll-mt-16 flex-col gap-1 duration-150',
        lit && 'bg-primary/5 ring-primary/40 -mx-2 rounded-xl px-2 py-1 ring-2',
      )}
    >
      <div
        data-testid="assistant-message"
        className="font-serif text-foreground px-1 text-[1.05rem] leading-relaxed wrap-break-word"
      >
        {text.trim() === '' && !done ? (
          // 还没出字：一行“正在做什么”（程序从工具调用得出，W12 §4.5），没调工具时写“在写…”
          <span
            data-testid="thinking"
            className="text-muted-foreground flex items-center gap-1.5 font-sans text-sm"
          >
            <LoaderIcon className="size-3.5 animate-spin" />
            {meta.activity ?? WT.writing}
          </span>
        ) : (
          <CitationsProvider text={text} done={done}>
            <MessagePrimitive.Parts>
              {({ part }) => (part.type === 'text' ? <MarkdownText /> : null)}
            </MessagePrimitive.Parts>
          </CitationsProvider>
        )}
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="border-destructive bg-destructive/10 text-destructive mt-2 rounded-md border p-3 text-sm">
            <ErrorPrimitive.Message className="line-clamp-2" />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <Stamp
        {...(meta.at !== undefined ? { at: meta.at } : {})}
        {...(meta.edited ? { edited: meta.edited } : {})}
      />
    </MessagePrimitive.Root>
  );
};

const UserMessage: FC<{ onEditLast: ((text: string) => Promise<void>) | undefined }> = ({
  onEditLast,
}) => {
  const { attr, lit } = useLines();
  const meta = useMeta();
  const text = useAuiState((s) =>
    s.message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
  );
  const [editing, setEditing] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState<string | undefined>(undefined);
  return (
    <MessagePrimitive.Root
      data-role="user"
      data-lines={attr}
      className="group/message fade-in animate-in flex scroll-mt-16 flex-col items-end gap-1 px-1 duration-150"
    >
      {editing !== undefined ? (
        <div className="flex w-full max-w-[85%] flex-col gap-1.5" data-testid="edit-last">
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
              disabled={busy || editing.trim() === ''}
              className="text-primary disabled:opacity-50"
              onClick={() => {
                if (onEditLast === undefined) return;
                setBusy(true);
                setEditError(undefined);
                onEditLast(editing)
                  .then(() => setEditing(undefined))
                  .catch((e: unknown) => {
                    setEditError(e instanceof Error ? e.message : String(e));
                  })
                  .finally(() => setBusy(false));
              }}
            >
              {WT.editSave}
            </button>
          </div>
          {editError !== undefined && <p className="text-destructive text-xs">{editError}</p>}
        </div>
      ) : (
        <div
          data-testid="user-message"
          className={cn(
            'bg-muted text-foreground relative max-w-[85%] rounded-(--composer-radius) px-4 py-2.5 whitespace-pre-wrap wrap-break-word transition-shadow',
            lit && 'bg-primary/10 ring-primary/50 ring-2',
          )}
        >
          <MessagePrimitive.Parts />
          {meta.reaction !== undefined && (
            <span
              data-testid="reaction"
              className="bg-card absolute -bottom-3 left-2 rounded-full border px-1.5 text-sm shadow-xs"
            >
              {meta.reaction}
            </span>
          )}
        </div>
      )}
      <div className="flex w-full max-w-[85%] items-center gap-2">
        <Stamp
          {...(meta.at !== undefined ? { at: meta.at } : {})}
          {...(meta.edited ? { edited: meta.edited } : {})}
        />
        {meta.editable === true && onEditLast !== undefined && editing === undefined && (
          <button
            type="button"
            data-testid="edit-last-open"
            className="text-muted-foreground hover:text-foreground ms-auto flex items-center gap-1 text-xs"
            onClick={() => setEditing(text)}
          >
            <PencilIcon className="size-3" />
            {WT.edit}
          </button>
        )}
      </div>
    </MessagePrimitive.Root>
  );
};

/** 程序给的一句结果（记下方向、停止了）或去别的对话的入口（讨论串卡片）：小字显示，不是谁说的话。 */
const SystemMessage: FC = () => {
  const text = useAuiState((s) =>
    s.message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
  );
  const { link, card } = useMeta();
  const open = useOpenSession();
  return (
    <MessagePrimitive.Root data-role="system" className="px-1">
      {card !== undefined ? (
        <button
          type="button"
          data-testid="thread-card"
          className="bg-card hover:bg-accent/60 text-foreground inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-1.5 text-sm shadow-xs transition-colors"
          onClick={() => open(card.sessionId)}
        >
          <span className="min-w-0 truncate">{card.title}</span>
          {card.group !== undefined && (
            <span
              data-testid="thread-card-status"
              className="bg-muted text-muted-foreground shrink-0 rounded-full px-1.5 text-[0.7rem]"
            >
              {W.threads[card.group]}
            </span>
          )}
          <ArrowRightIcon className="text-muted-foreground size-3.5 shrink-0" />
        </button>
      ) : link ? (
        <button
          type="button"
          data-testid="conversation-link"
          className="bg-card hover:bg-accent/60 text-foreground inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm shadow-xs transition-colors"
          onClick={() => open(link.sessionId)}
        >
          {link.label}
          <ArrowRightIcon className="text-muted-foreground size-3.5" />
        </button>
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span className="bg-border h-px w-4" />
          {text}
        </div>
      )}
    </MessagePrimitive.Root>
  );
};

interface UiLink {
  sessionId: string;
  label: string;
}

/**
 * 自己发了消息就滚到底；看历史时（离底部远）来了新内容不打扰。
 * assistant-ui 的自动滚动认“正在运行”，而我们不把运行状态告诉它（生成中途也能接着打字），所以这里补一手。
 */
function useStickToBottom() {
  const ref = useRef<HTMLDivElement>(null);
  const count = useAuiState((s) => s.thread.messages.length);
  const lastRole = useAuiState((s) => s.thread.messages.at(-1)?.role);
  const lastLen = useAuiState((s) => {
    const m = s.thread.messages.at(-1);
    return m?.content.reduce((n, p) => n + (p.type === 'text' ? p.text.length : 0), 0) ?? 0;
  });
  const near = useRef(true);
  const prevCount = useRef(count);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      near.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const grew = count > prevCount.current;
    prevCount.current = count;
    // 新出现的一条是学习者自己发的：一定滚；否则只在本来就贴着底部时跟着走
    const mine = grew && lastRole === 'user';
    if (mine || near.current)
      el.scrollTo({ top: el.scrollHeight, behavior: mine ? 'smooth' : 'auto' });
  }, [count, lastRole, lastLen]);
  return ref;
}
