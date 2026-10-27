// 由 assistant-ui 模板 0.0.121（MIT）的 thread.aui.tsx 删减而来：
// 去掉编辑、分支、重新生成、建议；文字改中文；版式往 Claude 桌面版靠。
// 输入框换成自己的（components/input/composer.tsx）：图片 / 拍照经转写、语音、公式（批 4）。
import { MarkdownText } from '@/components/assistant-ui/markdown-text';
import { TooltipIconButton } from '@/components/assistant-ui/tooltip-icon-button';
import { cn } from '@/lib/utils';
import {
  ActionBarPrimitive,
  AuiIf,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react';
import {
  ArrowDownIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  LoaderIcon,
} from 'lucide-react';
import { api } from '@/api';
import { CitationsProvider } from '@/components/sources/citation';
import { InputComposer, type SendInput } from '@/components/input/composer';
import type { PickedFile } from '@/components/project-materials';
import { CandidateList } from '@/components/find-candidates';
import type { CandidatesView, ToolGroup } from '@/thread-model';
import { ImageViewer } from '@/components/input/modal';
import { coversAny } from '@/evidence-model';
import { useOpenSession } from '@/open-session';
import { useCurrentSession, useHighlight, usePanel } from '@/panel';
import { W } from '@/wording';
import { WT } from '@/wording-tools';
import { useEffect, useRef, useState, type FC, type ReactNode } from 'react';

/** 消息带的附加信息（由 App 的 convertMessage 放进 metadata.custom）。 */
interface MessageMeta {
  line?: number;
  lines?: number[];
  link?: UiLink;
  verdict?: { closed: boolean };
  objection?: { toLine: number; label: string };
  images?: string[];
  candidates?: CandidatesView;
  tools?: ToolGroup;
  pending?: true;
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
  /** 发一条消息（文字 + 附图）。 */
  onSend: SendInput;
  /** 拖进非图片文件时（只有主对话给）：走项目的上传，回一句给学习者看的话。 */
  onFiles?: (files: PickedFile[]) => Promise<string>;
}> = ({
  welcome = '今天想学点什么？',
  header,
  footer,
  disabled = false,
  placeholder = '回复…',
  onSend,
  onFiles,
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
            {!disabled && (
              <InputComposer
                placeholder={placeholder}
                onSend={onSend}
                {...(onFiles !== undefined ? { onOtherFiles: onFiles } : {})}
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
        {text.trim() === '' && !done ? (
          // 还没出字：只放一行“在想…”（不再叠 Markdown 自带的跳动点）
          <span
            data-testid="thinking"
            className="text-muted-foreground flex items-center gap-1.5 font-sans text-sm"
          >
            <LoaderIcon className="size-3.5 animate-spin" />
            {WT.thinking}
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
      {done && (
        <ActionBarPrimitive.Root
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
      )}
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
      {meta.images !== undefined && <SentImages ids={meta.images} />}
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

/** 学习者随消息附的图：缩略图，点开看原图。 */
const SentImages: FC<{ ids: string[] }> = ({ ids }) => {
  const [open, setOpen] = useState<number | undefined>(undefined);
  const shown = open !== undefined ? ids[open] : undefined;
  return (
    <div className="flex max-w-[85%] flex-wrap justify-end gap-1.5" data-testid="message-images">
      {ids.map((id, i) => (
        <button
          key={id}
          type="button"
          aria-label={W.viewImage}
          className="overflow-hidden rounded-xl border"
          onClick={() => setOpen(i)}
        >
          <img src={api.imageUrl(id)} alt={W.imageAlt(i + 1)} className="size-20 object-cover" />
        </button>
      ))}
      {shown !== undefined && (
        <ImageViewer
          src={api.imageUrl(shown)}
          alt={W.imageAlt((open ?? 0) + 1)}
          onClose={() => setOpen(undefined)}
        />
      )}
    </div>
  );
};

/** 程序给的一句结果（整理好了、学完了、记下方向）或去别的对话的入口：小字显示，不是谁说的话。 */
const SystemMessage: FC = () => {
  const text = useAuiState((s) =>
    s.message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(''),
  );
  const { link, verdict, line, candidates, tools, pending } = useMeta();
  const open = useOpenSession();
  const panel = usePanel();
  const sessionId = useCurrentSession();
  return (
    <MessagePrimitive.Root data-role="system" className="px-1">
      {tools !== undefined ? (
        <ToolLine tools={tools} />
      ) : pending === true ? (
        <div
          data-testid="pending-line"
          className="text-muted-foreground flex items-center gap-2 text-sm"
        >
          <LoaderIcon className="size-3.5 animate-spin" />
          {text}
        </div>
      ) : candidates !== undefined && sessionId !== undefined ? (
        <CandidateList view={candidates} sessionId={sessionId} />
      ) : verdict !== undefined && sessionId !== undefined && line !== undefined ? (
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

/** 工具行：一行摘要（用了什么、做了什么），点开看每一步与模型当时说的话（界面说明 §1.2）。 */
const ToolLine: FC<{ tools: ToolGroup }> = ({ tools }) => {
  const [open, setOpen] = useState(false);
  // 只有结果另有显示的工具、也没说什么话：这一行不必出现
  if (tools.labels.length === 0 && tools.narration.length === 0) return null;
  return (
    <div data-testid="tool-line" className="text-muted-foreground flex flex-col gap-1 text-xs">
      <button
        type="button"
        aria-expanded={open}
        className="hover:text-foreground flex items-center gap-1 self-start"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDownIcon className="size-3.5" />
        ) : (
          <ChevronRightIcon className="size-3.5" />
        )}
        {WT.summary(tools.labels)}
      </button>
      {open && (
        <div className="border-border ms-1.5 flex flex-col gap-1 border-s ps-3">
          {tools.narration.map((n, i) => (
            <span key={`n${String(i)}`} className="italic">
              {WT.narration}：{n}
            </span>
          ))}
          {tools.labels.map((l, i) => (
            <span key={`l${String(i)}`}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 自己发了消息就滚到底；看历史时（离底部远）来了新内容不打扰。
 * assistant-ui 的自动滚动认“正在运行”，而我们不把运行状态告诉它（为了能中途插话），所以这里补一手。
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
