// 书里的一段原文：公式用 KaTeX 画、标题行与粗体去掉 Markdown 记号；其余照原样（不改书里的字）。
// 个人笔记（noteBook 给了）里的图片引用画成图片，找不到的标出来。
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { noteImagePieces } from '../../scope-model.ts';
import { boldPieces, lineStyle, mathPieces } from '../../source-model.ts';
import { W } from '../../wording.ts';

export function BookText(props: { text: string; className?: string; noteBook?: string }) {
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
      {props.noteBook !== undefined ? (
        <NoteInline text={s.text} book={props.noteBook} />
      ) : (
        <Inline text={s.text} />
      )}
    </div>
  );
}

function NoteInline(props: { text: string; book: string }) {
  const pieces = useMemo(() => noteImagePieces(props.text), [props.text]);
  return (
    <>
      {pieces.map((p, i) =>
        'image' in p ? (
          <NoteImage key={i} book={props.book} ref_={p.image} alt={p.alt} />
        ) : (
          <Inline key={i} text={p.text} />
        ),
      )}
    </>
  );
}

function NoteImage(props: { book: string; ref_: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="rounded-sm bg-amber-100 px-1 font-sans text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
        {W.noteImageMissing(props.ref_)}
      </span>
    );
  }
  return (
    <img
      src={api.noteAssetUrl(props.book, props.ref_)}
      alt={props.alt}
      title={props.ref_}
      className="my-1 block max-h-96 max-w-full rounded-md border bg-white"
      onError={() => setFailed(true)}
    />
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
