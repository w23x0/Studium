// 一个文件的原文（右侧面板）：引到的几行高亮，打开时滚到那里。出处对不上时照样打开，先写明原因。
import { useEffect, useRef } from 'react';
import { AlertTriangleIcon, ListTreeIcon } from 'lucide-react';
import type { SectionResponse } from '../../../shared/protocol.ts';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { overlaps, paragraphs } from '../../source-model.ts';
import { W } from '../../wording.ts';
import { Card, Loading } from '../evidence/parts.tsx';
import { MaterialText } from './material-text.tsx';

type Span = { from: number; to: number };

/** 核心一次最多给 5000 行：引到很后面的，从它前面一点读起。 */
const LATE_LINE = 4000;

export function SourceView(props: {
  material: string;
  file: string;
  from?: number | undefined;
  to?: number | undefined;
  problem?: string | undefined;
}) {
  const { material, file } = props;
  const start = props.from !== undefined && props.from > LATE_LINE ? props.from - 200 : undefined;
  const r = useLoad(
    `section:${material}:${file}:${String(start)}`,
    () => api.section(material, file, start),
    false,
  );
  const cited: Span | undefined =
    props.from !== undefined ? { from: props.from, to: props.to ?? props.from } : undefined;

  const problem =
    props.problem !== undefined ? (
      <Card className="flex flex-col gap-1.5 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex items-center gap-1.5 font-medium">
          <AlertTriangleIcon className="size-4 text-amber-600" />
          {W.citationBad}
        </div>
        <div className="text-muted-foreground text-xs">{W.citationBadHint}</div>
        <div>{props.problem}</div>
        <div className="text-muted-foreground text-xs">
          {W.citationWritten}：{material} · {file}
          {cited !== undefined && ` · ${W.lineSpan(cited.from, cited.to)}`}
        </div>
      </Card>
    ) : null;

  if (!r.data) {
    return (
      <div className="flex flex-col gap-4">
        {problem}
        {/* 对不上的出处多半读不到原文：原因上面已写明，不再重复报错 */}
        {(props.problem === undefined || r.error === undefined) && <Loading error={r.error} />}
      </div>
    );
  }
  const s = r.data;
  return (
    <div className="flex flex-col gap-4" data-testid="source-view">
      {problem}
      <Head section={s} cited={cited} />
      <TextBody section={s} cited={cited} />
    </div>
  );
}

function Head(props: { section: SectionResponse; cited: Span | undefined }) {
  const panel = usePanel();
  const s = props.section;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs"
        onClick={() => panel.show({ kind: 'materials', material: s.material })}
      >
        <ListTreeIcon className="size-3.5" />
        {s.materialTitle} · {W.toc}
      </button>
      <h2 className="font-serif text-lg">{s.file}</h2>
      {props.cited !== undefined && (
        <div className="text-muted-foreground text-xs">
          {W.citation}：{W.lineSpan(props.cited.from, props.cited.to)}
        </div>
      )}
    </div>
  );
}

function TextBody(props: { section: SectionResponse; cited: Span | undefined }) {
  const { section, cited } = props;
  const paras = paragraphs(section.lines);
  // 打开时滚到引到的那一段
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => {
    first.current?.scrollIntoView({ block: 'center' });
  }, []);
  const firstLit = cited !== undefined ? paras.find((p) => overlaps(p, cited)) : undefined;
  return (
    <div className="flex flex-col gap-0.5">
      {paras.map((p) => (
        <div
          key={p.from}
          ref={p === firstLit ? first : undefined}
          data-from={p.from}
          className={cn(
            '-mx-2 rounded-lg px-2 py-1.5',
            cited !== undefined && overlaps(p, cited) && 'bg-amber-100/70 dark:bg-amber-900/25',
          )}
        >
          <div className="flex gap-2">
            <span
              className="text-muted-foreground/60 w-7 shrink-0 pt-1 text-right font-mono text-[0.65rem]"
              title={W.lineSpan(p.from, p.to)}
            >
              {p.from}
            </span>
            <MaterialText text={p.text} className="min-w-0 flex-1 text-[0.95rem]" />
          </div>
        </div>
      ))}
    </div>
  );
}
