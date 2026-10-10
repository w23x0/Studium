// 书里的一段原文：公式用 KaTeX 画、标题行与粗体去掉 Markdown 记号；其余照原样（不改书里的字）。
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { boldPieces, lineStyle, mathPieces } from '../../source-model.ts';

export function BookText(props: { text: string; className?: string }) {
  // 标题自成一段（原文按空行分段）：段首是 # 就按标题显示
  const s = lineStyle(props.text);
  return (
    <div
      className={cn(
        'font-serif leading-relaxed whitespace-pre-wrap',
        s.heading && 'font-semibold',
        props.className,
      )}
    >
      <Inline text={s.text} />
    </div>
  );
}

function Inline(props: { text: string }) {
  const pieces = useMemo(() => mathPieces(props.text), [props.text]);
  return (
    <>
      {pieces.map((p, i) =>
        'math' in p ? (
          <Formula key={i} tex={p.math} display={p.display} />
        ) : (
          boldPieces(p.text).map((b, j) =>
            b.strong ? (
              <strong key={`${String(i)}-${String(j)}`}>{b.text}</strong>
            ) : (
              <span key={`${String(i)}-${String(j)}`}>{b.text}</span>
            ),
          )
        ),
      )}
    </>
  );
}

function Formula(props: { tex: string; display: boolean }) {
  // KaTeX 出的是它自己转义过的标记；写错的公式（throwOnError: false）显示成红字原文，不报错
  const html = useMemo(
    () =>
      katex.renderToString(props.tex, {
        displayMode: props.display,
        throwOnError: false,
        output: 'html',
      }),
    [props.tex, props.display],
  );
  return props.display ? (
    <span className="my-1 block overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}
