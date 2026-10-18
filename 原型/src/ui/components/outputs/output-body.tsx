// 产出物正文（Markdown + 公式）：书里的出处画成已有的出处小标签；对不上的灰显，悬停写明原因。
// 核对结果由核心随版本给（存了才核对）。
import { useMemo, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';
import { prepareMath } from '../../lib/math.ts';
import { citationIndex } from '../../source-model.ts';
import { linkOutputText } from '../../output-model.ts';
import { CitationChip, CitationsProvider } from '../sources/citation.tsx';

/** 一段产出物文字。 */
export function OutputText(props: { text: string; compact?: boolean; className?: string }) {
  const { text } = props;
  const md = useMemo(() => prepareMath(linkOutputText(text), false), [text]);
  return (
    <>
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
    </>
  );
}

function Link(p: { href?: string | undefined; children?: ReactNode }) {
  const cite = citationIndex(p.href);
  if (cite !== undefined) return <CitationChip index={cite} />;
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
