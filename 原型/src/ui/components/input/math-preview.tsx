// 输入框里正在写的公式的预览：文字原样，公式用 KaTeX 画（没写完的也画，写错的标红不报错）。
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
import { mathSegments } from '@/input-model';
import { cn } from '@/lib/utils';

export function MathPreview(props: { text: string; className?: string }) {
  const segs = useMemo(() => mathSegments(props.text), [props.text]);
  return (
    <div
      className={cn('text-sm leading-relaxed whitespace-pre-wrap wrap-break-word', props.className)}
    >
      {segs.map((s, i) =>
        s.kind === 'text' ? (
          <span key={i}>{s.text}</span>
        ) : (
          <TeX key={i} tex={s.tex} display={s.display} open={s.open} />
        ),
      )}
    </div>
  );
}

export function TeX(props: { tex: string; display: boolean; open?: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(props.tex, {
        displayMode: props.display,
        throwOnError: false,
        strict: false,
      }),
    [props.tex, props.display],
  );
  return (
    <span
      className={cn(props.display && 'block', props.open === true && 'opacity-70')}
      // KaTeX 输出的是它自己转义过的 HTML（throwOnError:false 时错处也只是标红的文字）
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
