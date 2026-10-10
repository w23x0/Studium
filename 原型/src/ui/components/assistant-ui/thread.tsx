// 由 assistant-ui 模板 0.0.121（MIT）的 thread.aui.tsx 删减而来：
// 去掉附件、编辑、分支、重新生成、语音、建议；文字改中文；版式往 Claude 桌面版靠。
import { MarkdownText } from '@/components/assistant-ui/markdown-text';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import {
  ActionBarPrimitive,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react';
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
} from 'lucide-react';
import { CitationsProvider } from '@/components/sources/citation';
import { coversAny } from '@/evidence-model';
import { useOpenSession } from '@/open-session';
import { useCurrentSession, useHighlight, usePanel } from '@/panel';
import { W } from '@/wording';
import type { FC, ReactNode } from 'react';

/** 消息带的附加信息（由 App 的 convertMessage 放进 metadata.custom）。 */
interface MessageMeta {
  line?: number;
  lines?: number[];
  link?: UiLink;
  verdict?: { closed: boolean };
  objection?: { toLine: number; label: string };
}

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
}> = ({
  welcome = '今天想学点什么？',
  header,
  footer,
  disabled = false,
  placeholder = '回复…',
}) => {
  const isEmpty = useAuiState((s) => s.thread.messages.length === 0);
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
        turnAnchor="top"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div
          className={cn(
            'mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-8',
            isEmpty && 'justify-center',
          )}
        >
          {isEmpty && (
            <p className="font-serif mb-8 text-center text-3xl text-foreground/90">{welcome}</p>
          )}
          <div className="mb-14 flex flex-col gap-y-6 empty:hidden">
            <ThreadPrimitive.Messages>
              {({ message }) =>
                message.role === 'user' ? (
                  <UserMessage />
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
            {!disabled && <Composer placeholder={placeholder} />}
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const Composer: FC<{ placeholder: string }> = ({ placeholder }) => (
  <ComposerPrimitive.Root className="relative flex w-full flex-col">
    <div className="border-foreground/15 focus-within:border-foreground/30 bg-card flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-[border-color]">
      <ComposerPrimitive.Input
        placeholder={placeholder}
        className="placeholder:text-muted-foreground/70 max-h-48 min-h-10 w-full resize-none bg-transparent px-1.5 py-1 text-base leading-6 outline-none"
        rows={1}
        autoFocus
        aria-label="输入"
      />
      <div className="flex items-center justify-end">
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="发送"
            side="bottom"
            type="button"
            variant="default"
            size="icon"
            className="size-8 rounded-lg"
            aria-label="发送"
          >
            <ArrowUpIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </div>
    </div>
  </ComposerPrimitive.Root>
);

const AssistantMessage: FC = () => {
  const { attr, lit } = useLines();
  const text = useAuiState((s) =>
    s.message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
  );
  const done = useAuiState((s) => s.message.status?.type !== 'running');
  return (
    <MessagePrimitive.Root
      data-role="assistant"
      data-lines={attr}
      className={cn(
        'fade-in animate-in relative scroll-mt-16 duration-150',
        lit && 'bg-primary/5 ring-primary/40 -mx-2 rounded-xl px-2 py-1 ring-2',
      )}
    >
      <div
        data-testid="assistant-message"
        className="font-serif text-foreground px-1 text-[1.05rem] leading-relaxed wrap-break-word"
      >
        <CitationsProvider text={text} done={done}>
          <MessagePrimitive.Parts>
            {({ part }) => (part.type === 'text' ? <MarkdownText /> : null)}
          </MessagePrimitive.Parts>
        </CitationsProvider>
        <AuiIf
          condition={(s) => s.message.status?.type === 'running' && s.message.parts.length === 0}
        >
          <span className="animate-pulse font-sans" aria-label="正在回答">
            ●
          </span>
        </AuiIf>
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="border-destructive bg-destructive/10 text-destructive mt-2 rounded-md border p-3 text-sm">
            <ErrorPrimitive.Message className="line-clamp-2" />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        className="text-muted-foreground ms-0 mt-1 flex gap-1"
      >
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip="复制">
            <AuiIf condition={(s) => s.message.isCopied}>
              <CheckIcon />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <CopyIcon />
            </AuiIf>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
      </ActionBarPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const UserMessage: FC = () => {
  const { attr, lit } = useLines();
  const meta = useMeta();
  return (
    <MessagePrimitive.Root
      data-role="user"
      data-lines={attr}
      className="fade-in animate-in flex scroll-mt-16 flex-col items-end gap-1 px-1 duration-150"
    >
      {meta.objection !== undefined && (
        <span className="text-muted-foreground text-xs">{meta.objection.label}</span>
      )}
      <div
        data-testid="user-message"
        className={cn(
          'bg-muted text-foreground max-w-[85%] rounded-(--composer-radius) px-4 py-2.5 whitespace-pre-wrap wrap-break-word transition-shadow',
          meta.objection !== undefined && 'border-primary/40 border',
          lit && 'bg-primary/10 ring-primary/50 ring-2',
        )}
      >
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
};

/** 程序给的一句结果（掌握了、学完了、记下方向）或去别的对话的入口：小字显示，不是谁说的话。 */
const SystemMessage: FC = () => {
  const text = useAuiState((s) =>
    s.message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
  );
  const { link, verdict, line } = useMeta();
  const open = useOpenSession();
  const panel = usePanel();
  const sessionId = useCurrentSession();
  return (
    <MessagePrimitive.Root data-role="system" className="px-1">
      {verdict !== undefined && sessionId !== undefined && line !== undefined ? (
        <button
          type="button"
          data-testid="judgement"
          className="text-muted-foreground hover:text-foreground group flex items-center gap-2 text-sm"
          onClick={() => panel.show({ kind: 'loop', loopId: sessionId, verdictLine: line })}
        >
          <span className="bg-border h-px w-4" />
          {text}
          <span className="text-primary flex items-center text-xs opacity-80 group-hover:opacity-100">
            {W.whyJudged}
            <ChevronRightIcon className="size-3.5" />
          </span>
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
