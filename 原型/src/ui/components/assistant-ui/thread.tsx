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
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CopyIcon } from 'lucide-react';
import type { FC, ReactNode } from 'react';

export const Thread: FC<{ welcome?: string; footer?: ReactNode; disabled?: boolean }> = ({
  welcome = '今天想学点什么？',
  footer,
  disabled = false,
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
            {!disabled && <Composer />}
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const Composer: FC = () => (
  <ComposerPrimitive.Root className="relative flex w-full flex-col">
    <div className="border-foreground/15 focus-within:border-foreground/30 bg-card flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] transition-[border-color]">
      <ComposerPrimitive.Input
        placeholder="回复…"
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

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root data-role="assistant" className="fade-in animate-in relative duration-150">
    <div
      data-testid="assistant-message"
      className="font-serif text-foreground px-1 text-[1.05rem] leading-relaxed wrap-break-word"
    >
      <MessagePrimitive.Parts>
        {({ part }) => (part.type === 'text' ? <MarkdownText /> : null)}
      </MessagePrimitive.Parts>
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

const UserMessage: FC = () => (
  <MessagePrimitive.Root
    data-role="user"
    className="fade-in animate-in flex justify-end px-1 duration-150"
  >
    <div
      data-testid="user-message"
      className="bg-muted text-foreground max-w-[85%] rounded-(--composer-radius) px-4 py-2.5 whitespace-pre-wrap wrap-break-word"
    >
      <MessagePrimitive.Parts />
    </div>
  </MessagePrimitive.Root>
);

/** 程序事实、守卫判定等：不是学习者也不是教学的话，小字显示，长的折起来。 */
const SystemMessage: FC = () => {
  const text = useAuiState((s) =>
    s.message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
  );
  const [first, ...rest] = text.split('\n');
  return (
    <MessagePrimitive.Root data-role="system" className="px-1">
      <div className="border-border text-muted-foreground border-l-2 py-0.5 ps-3 text-sm">
        {rest.length === 0 ? (
          first
        ) : (
          <details>
            <summary className="cursor-pointer">{first}</summary>
            <div className="mt-1 whitespace-pre-wrap">{rest.join('\n')}</div>
          </details>
        )}
      </div>
    </MessagePrimitive.Root>
  );
};
