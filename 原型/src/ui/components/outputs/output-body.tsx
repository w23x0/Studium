// 产出物正文（Markdown + 公式）：书里的出处画成已有的出处小标签；知识点 / 一步连接的引用画成知识点小标签，
// 点开在面板里看那个知识点；对不上的灰显，悬停写明原因。核对结果由核心随版本给（存了才核对）。
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ListTreeIcon, TriangleAlertIcon } from 'lucide-react';
import type { ObjectRefView } from '../../../shared/m14.ts';
import type { M08Source } from '../../../shared/protocol.ts';
import type { ObjectRef } from '../../../shared/object-ref.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { prepareMath } from '../../lib/math.ts';
import { linkOutputText, objectRefOf, refKey, refMap } from '../../output-model.ts';
import { usePanel } from '../../panel.ts';
import { citationIndex } from '../../source-model.ts';
import { W } from '../../wording.ts';
import { SourceBadge } from '../evidence/parts.tsx';
import { CitationChip, CitationsProvider } from '../sources/citation.tsx';

/** 核心核对过的知识点引用；没有（还没存的稿子）时小标签标“存了以后才核对”。 */
const RefsContext = createContext<Map<string, ObjectRefView> | undefined>(undefined);

/** 一段产出物文字。refs = 这一版核对过的知识点引用（同一版里的方法比较各格子也用它）。 */
export function OutputText(props: {
  text: string;
  refs?: readonly ObjectRefView[] | undefined;
  compact?: boolean;
  className?: string;
}) {
  const { text, refs } = props;
  const map = useMemo(() => (refs !== undefined ? refMap(refs) : undefined), [refs]);
  const md = useMemo(() => prepareMath(linkOutputText(text), false), [text]);
  return (
    <RefsContext.Provider value={map}>
      <CitationsProvider text={text} done>
        <div
          className={cn(
            props.compact === true ? 'text-sm leading-relaxed' : 'text-[0.95rem] leading-7',
            props.className,
          )}
        >
          <Markdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={props.compact === true ? COMPACT : FULL}
          >
            {md}
          </Markdown>
        </div>
      </CitationsProvider>
    </RefsContext.Provider>
  );
}

function Link(p: { href?: string | undefined; children?: ReactNode }) {
  const cite = citationIndex(p.href);
  if (cite !== undefined) return <CitationChip index={cite} />;
  const ref = objectRefOf(p.href);
  if (ref !== undefined) return <ObjectRefChip refOf={ref} />;
  return (
    <a className="text-primary underline" href={p.href} target="_blank" rel="noreferrer">
      {p.children}
    </a>
  );
}

const FULL: Components = {
  h1: (p) => <h2 className="mt-6 mb-2 font-serif text-xl first:mt-0">{p.children}</h2>,
  h2: (p) => <h3 className="mt-5 mb-2 font-serif text-lg first:mt-0">{p.children}</h3>,
  h3: (p) => <h4 className="mt-4 mb-1.5 font-semibold first:mt-0">{p.children}</h4>,
  p: (p) => <p className="my-3 first:mt-0 last:mb-0">{p.children}</p>,
  ul: (p) => (
    <ul className="marker:text-muted-foreground my-3 ms-5 list-disc space-y-1">{p.children}</ul>
  ),
  ol: (p) => (
    <ol className="marker:text-muted-foreground my-3 ms-5 list-decimal space-y-1">{p.children}</ol>
  ),
  blockquote: (p) => (
    <blockquote className="border-muted-foreground/30 text-muted-foreground my-3 border-s-2 ps-4">
      {p.children}
    </blockquote>
  ),
  code: (p) => <code className="bg-muted rounded px-1 py-0.5 text-[0.85em]">{p.children}</code>,
  pre: (p) => (
    <pre className="bg-muted/40 my-3 overflow-x-auto rounded-lg p-3 text-xs">{p.children}</pre>
  ),
  table: (p) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{p.children}</table>
    </div>
  ),
  th: (p) => <th className="bg-muted border px-2 py-1 text-left font-medium">{p.children}</th>,
  td: (p) => <td className="border px-2 py-1 align-top">{p.children}</td>,
  hr: () => <hr className="border-muted-foreground/20 my-4" />,
  a: Link,
};

const COMPACT: Components = {
  ...FULL,
  p: (p) => <p className="my-1 first:mt-0 last:mb-0">{p.children}</p>,
  ul: (p) => <ul className="my-1 ms-4 list-disc">{p.children}</ul>,
  ol: (p) => <ol className="my-1 ms-4 list-decimal">{p.children}</ol>,
};

/** 正文里引的一个知识点 / 一步连接：小标签写它的名字，悬停看一句话说明，点开在面板里看。 */
export function ObjectRefChip(props: { refOf: ObjectRef }) {
  const map = useContext(RefsContext);
  const panel = usePanel();
  const { kind, id } = props.refOf;
  const view = map?.get(refKey(props.refOf));
  const bad = view !== undefined && !view.resolved;
  const pending = view === undefined;
  const label = view?.resolved === true && view.name !== undefined ? view.name : W.refKind[kind];
  const tip: ReactNode = pending ? (
    <span className="flex flex-col gap-0.5">
      <span>{W.refUnchecked}</span>
      <span className="opacity-80">
        {W.refWritten}：{id}
      </span>
    </span>
  ) : bad ? (
    <span className="flex flex-col gap-0.5">
      <span className="font-medium">{W.refBad}</span>
      <span>
        {W.refWritten}：{id}
      </span>
    </span>
  ) : (
    <span className="flex flex-col gap-1">
      <span className="font-medium">
        {W.refKind[kind]} · {view.name}
      </span>
      {view.sentence !== undefined && <span className="opacity-90">{view.sentence}</span>}
    </span>
  );
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              data-testid="object-ref"
              data-resolved={pending ? 'pending' : String(!bad)}
              className={cn(
                'mx-0.5 inline-flex max-w-[16rem] translate-y-[-0.1em] items-center gap-1 rounded-md border px-1.5 py-px align-middle font-sans text-[0.72rem] leading-snug transition-colors',
                bad
                  ? 'border-dashed border-muted-foreground/40 text-muted-foreground bg-muted/60 hover:bg-muted'
                  : pending
                    ? 'text-muted-foreground bg-muted/40'
                    : 'border-emerald-600/25 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200',
              )}
              onClick={() => {
                if (!bad) panel.show({ kind, id });
              }}
            />
          }
        >
          {bad ? (
            <TriangleAlertIcon className="size-3 shrink-0" />
          ) : (
            <ListTreeIcon className="size-3 shrink-0" />
          )}
          <span className="truncate">{label}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm">
          {tip}
          {view?.resolved === true && view.source !== undefined && isM08Source(view.source) && (
            <span className="mt-1 block">
              <SourceBadge source={view.source} />
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function isM08Source(s: string): s is M08Source {
  return s === '书给的' || s === '模型补的' || s === '未审';
}
