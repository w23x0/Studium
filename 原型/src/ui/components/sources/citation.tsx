// 回复里的书里出处（照 Claude 的引用）：标记画成小标签“书名 · 第几页”，悬停看引到的原文，点开在右侧面板看原文与原件。
// 对不上的（核对没过）画成灰色、带提示符号，悬停与点开都写明原因，不藏。
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BookOpenIcon, TriangleAlertIcon } from 'lucide-react';
import { parseCitations, type CitationMatch } from '../../../shared/citation.ts';
import type { CitationView } from '../../../shared/protocol.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { useSourceNoteSummaries } from '../../hooks/use-source-notes.ts';
import { usePanel } from '../../panel.ts';
import { citationLabel, citationTarget } from '../../source-model.ts';
import { W } from '../../wording.ts';

interface Citations {
  /** 界面自己从文字里认出的标记（核对结果回来前先用它显示书名）。 */
  marks: CitationMatch[];
  /** 核心核对过的结果，顺序与 marks 相同。 */
  views?: CitationView[] | undefined;
  error?: string | undefined;
}

const CitationContext = createContext<Citations>({ marks: [] });

/** 同一段文字只核对一次（消息重画、切回对话都不重查）。 */
const cache = new Map<string, Promise<CitationView[]>>();

function resolve(text: string): Promise<CitationView[]> {
  let p = cache.get(text);
  if (p === undefined) {
    p = api.citations(text).then((r) => r.citations);
    // 失败的不留在缓存里，下次再试
    void p.catch(() => cache.delete(text));
    cache.set(text, p);
  }
  return p;
}

/** 给一条回复包一层：认出里面的出处标记，回复写完后交核心核对。 */
export function CitationsProvider(props: { text: string; done: boolean; children: ReactNode }) {
  const { text, done } = props;
  const marks = useMemo(() => parseCitations(text), [text]);
  const [state, setState] = useState<{ text: string; views?: CitationView[]; error?: string }>({
    text: '',
  });
  const need = done && marks.length > 0;
  useEffect(() => {
    if (!need) return;
    let alive = true;
    resolve(text)
      .then((views) => {
        if (alive) setState({ text, views });
      })
      .catch((e: unknown) => {
        if (alive) setState({ text, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      alive = false;
    };
  }, [need, text]);
  const same = state.text === text;
  const value = useMemo<Citations>(
    () => ({
      marks,
      views: same ? state.views : undefined,
      error: same ? state.error : undefined,
    }),
    [marks, same, state],
  );
  return <CitationContext.Provider value={value}>{props.children}</CitationContext.Provider>;
}

/** 第 index 个出处的小标签（Markdown 链接组件认到出处链接时画它）。 */
export function CitationChip(props: { index: number }) {
  const { marks, views, error } = useContext(CitationContext);
  const panel = usePanel();
  const notes = useSourceNoteSummaries();
  const mark = marks[props.index];
  const view = views?.[props.index];
  if (mark === undefined) return null;
  const bad = view !== undefined && !view.resolved;
  const label = view !== undefined && view.resolved ? citationLabel(view) : mark.book;
  const tip: ReactNode =
    view === undefined ? (
      error !== undefined ? (
        `${W.citationCheckFailed}${error}`
      ) : (
        W.citationPending
      )
    ) : bad ? (
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{W.citationBad}</span>
        <span>{view.problem}</span>
      </span>
    ) : (
      <span className="flex flex-col gap-1">
        {view.section !== undefined && <span className="font-medium">{view.section}</span>}
        {view.lines !== undefined && view.lines.length > 0 && (
          <span className="line-clamp-4 opacity-90">{view.lines.map((l) => l.text).join(' ')}</span>
        )}
        {notes.get(view.book) !== undefined && (
          <span className="text-[0.7rem] opacity-70" data-testid="citation-note">
            {notes.get(view.book)}
          </span>
        )}
      </span>
    );
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              data-testid="citation"
              data-resolved={view === undefined ? 'pending' : String(view.resolved)}
              className={cn(
                'mx-0.5 inline-flex max-w-[16rem] translate-y-[-0.1em] items-center gap-1 rounded-md border px-1.5 py-px align-middle font-sans text-[0.72rem] leading-snug transition-colors',
                bad
                  ? 'border-dashed border-muted-foreground/40 text-muted-foreground bg-muted/60 hover:bg-muted'
                  : view === undefined
                    ? 'text-muted-foreground bg-muted/40'
                    : 'bg-primary/5 text-primary border-primary/25 hover:bg-primary/10',
              )}
              onClick={() => {
                const v = view;
                if (v !== undefined) {
                  panel.show(citationTarget(v));
                } else {
                  panel.show({
                    kind: 'source',
                    book: mark.book,
                    file: mark.file,
                    from: mark.from,
                    to: mark.to,
                  });
                }
              }}
            />
          }
        >
          {bad ? (
            <TriangleAlertIcon className="size-3 shrink-0" />
          ) : (
            <BookOpenIcon className="size-3 shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
