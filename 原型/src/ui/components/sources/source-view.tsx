// 一个小节的原文（右侧面板）：引到的几行高亮、可翻上下节；每段可看原件上的位置、可报错；
// 原件页面上用位置框标出那一处。出处对不上时照样打开，先写明原因。
import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileImageIcon,
  FlagIcon,
  ListTreeIcon,
} from 'lucide-react';
import { SOURCE_REPORT_KINDS } from '../../../shared/records.ts';
import type {
  BBox,
  SectionResponse,
  SourceReport,
  SourceReportKind,
  TocEntry,
} from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api, withToken } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { cropBox, overlaps, paragraphs, reportsFor, type Paragraph } from '../../source-model.ts';
import { W } from '../../wording.ts';
import { Badge, Card, Loading, Time } from '../evidence/parts.tsx';
import { BookText } from './book-text.tsx';
import { OriginalPage } from './original-page.tsx';

type Span = { from: number; to: number };

export function SourceView(props: {
  book: string;
  file: string;
  from?: number | undefined;
  to?: number | undefined;
  page?: number | undefined;
  bbox?: BBox | undefined;
  problem?: string | undefined;
}) {
  const { book, file } = props;
  const panel = usePanel();
  const r = useLoad(`section:${book}:${file}`, () => api.section(book, file), false);
  const reports = useLoad(`reports:${book}:${file}`, () => api.reports(book, file), false);
  // 个人笔记：标明是学习者自己写的，图片引用画成图片
  const books = useLoad('library:books', () => api.books(), false);
  const isNote = books.data?.books.find((b) => b.id === book)?.kind === 'note';
  const cited: Span | undefined =
    props.from !== undefined ? { from: props.from, to: props.to ?? props.from } : undefined;
  /** 学习者点中的一段（看原件、报错都对它）；没点过就是引到的那几行。 */
  const [picked, setPicked] = useState<Span | undefined>();
  const [tab, setTab] = useState<'text' | 'original'>('text');
  const focus = picked ?? cited;
  const known =
    props.page !== undefined && props.bbox !== undefined && focus === cited
      ? { page: props.page, bbox: props.bbox }
      : undefined;

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
          {W.citationWritten}：{book} · {file}
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
      {isNote && (
        <div className="flex items-center gap-1.5 text-xs">
          <Badge tone="accent">{W.noteMine}</Badge>
          <span className="text-muted-foreground">{W.noteMineHint}</span>
        </div>
      )}
      <div className="bg-muted flex gap-1 self-start rounded-lg p-0.5 text-sm">
        <TabButton active={tab === 'text'} onClick={() => setTab('text')}>
          {W.bookText}
        </TabButton>
        <TabButton active={tab === 'original'} onClick={() => setTab('original')}>
          {W.original}
        </TabButton>
      </div>
      {tab === 'text' ? (
        <>
          {known !== undefined && (
            <SpotPreview
              book={s.book}
              page={known.page}
              bbox={known.bbox}
              onOpen={() => setTab('original')}
            />
          )}
          <TextBody
            section={s}
            cited={cited}
            picked={picked}
            reports={reports.data?.reports ?? []}
            onPick={setPicked}
            onShowOriginal={(p) => {
              setPicked(p);
              setTab('original');
            }}
            onReported={reports.reload}
            page={known?.page}
            noteBook={isNote ? s.book : undefined}
          />
        </>
      ) : (
        <OriginalSpot section={s} focus={focus} known={known} />
      )}
      <Neighbors
        prev={s.prev}
        next={s.next}
        go={(e) =>
          e.file !== undefined && panel.replace({ kind: 'source', book: s.book, file: e.file })
        }
      />
    </div>
  );
}

function Head(props: { section: SectionResponse; cited: Span | undefined }) {
  const panel = usePanel();
  const s = props.section;
  const e = s.entry;
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start text-xs"
        onClick={() => panel.show({ kind: 'library', book: s.book })}
      >
        <ListTreeIcon className="size-3.5" />
        {s.bookTitle} · {W.toc}
      </button>
      <h2 className="font-serif text-lg">
        {e !== undefined ? `${e.num} ${e.title}`.trim() : s.file}
      </h2>
      <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
        {e?.pages !== undefined && <span>{e.pages}</span>}
        {e?.pdfPages !== undefined && (
          <span>
            {W.original}：{W.pageOf(e.pdfPages.from)}
          </span>
        )}
        {props.cited !== undefined && (
          <span>
            {W.citation}：{W.lineSpan(props.cited.from, props.cited.to)}
          </span>
        )}
      </div>
    </div>
  );
}

function TabButton(props: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-md px-3 py-1',
        props.active ? 'bg-background shadow-xs' : 'text-muted-foreground hover:text-foreground',
      )}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

/** 引到的那一处在原件上的局部截图；点了看整页。渲染不了时不显示。 */
function SpotPreview(props: { book: string; page: number; bbox: BBox; onOpen: () => void }) {
  const r = useLoad(
    `page:${props.book}:${String(props.page)}`,
    () => api.page(props.book, props.page),
    false,
  );
  const [failed, setFailed] = useState(false);
  const url = r.data?.imageUrl;
  if (url === undefined || failed) return null;
  return (
    <button
      type="button"
      className="bg-card hover:border-foreground/30 flex flex-col gap-1 overflow-hidden rounded-lg border p-1 text-left shadow-xs"
      onClick={props.onOpen}
    >
      <img
        src={withToken(`${url}&bbox=${cropBox(props.bbox).join(',')}`)}
        alt={W.thisSpot}
        className="block w-full bg-white"
        onError={() => setFailed(true)}
      />
      <span className="text-muted-foreground flex items-center gap-1 px-1 text-xs">
        <FileImageIcon className="size-3.5" />
        {W.thisSpot} · {W.pageOf(props.page)}
      </span>
    </button>
  );
}

function TextBody(props: {
  section: SectionResponse;
  cited: Span | undefined;
  picked: Span | undefined;
  reports: SourceReport[];
  onPick: (p: Span) => void;
  onShowOriginal: (p: Span) => void;
  onReported: () => void;
  page: number | undefined;
  noteBook: string | undefined;
}) {
  const { section, cited, picked } = props;
  const paras = paragraphs(section.lines);
  const [reporting, setReporting] = useState<Paragraph | undefined>();
  // 打开时滚到引到的那一段
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => {
    first.current?.scrollIntoView({ block: 'center' });
  }, []);
  const firstLit = cited !== undefined ? paras.find((p) => overlaps(p, cited)) : undefined;
  return (
    <div className="flex flex-col gap-0.5">
      {paras.map((p) => {
        const lit = cited !== undefined && overlaps(p, cited);
        const chosen = picked !== undefined && picked.from === p.from && picked.to === p.to;
        const mine = reportsFor(props.reports, p);
        return (
          <div
            key={p.from}
            ref={p === firstLit ? first : undefined}
            data-from={p.from}
            className={cn(
              'group relative -mx-2 rounded-lg px-2 py-1.5',
              lit && 'bg-amber-100/70 dark:bg-amber-900/25',
              chosen && 'ring-primary/40 ring-1',
            )}
            onClick={() => props.onPick(p)}
          >
            <div className="flex gap-2">
              <span
                className="text-muted-foreground/60 w-7 shrink-0 pt-1 text-right font-mono text-[0.65rem]"
                title={W.lineSpan(p.from, p.to)}
              >
                {p.from}
              </span>
              <BookText
                text={p.text}
                className="min-w-0 flex-1 text-[0.95rem]"
                {...(props.noteBook !== undefined ? { noteBook: props.noteBook } : {})}
              />
            </div>
            <div
              className={cn(
                'bg-card absolute -top-3 right-1 z-10 gap-0.5 rounded-md border p-0.5 shadow-sm',
                chosen ? 'flex' : 'hidden group-hover:flex',
              )}
            >
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onShowOriginal(p);
                }}
              >
                <FileImageIcon />
                {W.showOnOriginal}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onPick(p);
                  setReporting(p);
                }}
              >
                <FlagIcon />
                {W.reportIssue}
              </Button>
            </div>
            {mine.length > 0 && <ReportNotes reports={mine} />}
            {reporting === p && (
              <ReportForm
                book={section.book}
                file={section.file}
                span={p}
                page={lit ? props.page : undefined}
                onClose={() => setReporting(undefined)}
                onSent={props.onReported}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReportNotes(props: { reports: SourceReport[] }) {
  return (
    <div className="ms-9 mt-1 flex flex-col gap-1">
      {props.reports.map((r) => (
        <div
          key={r.id}
          className="flex flex-col gap-0.5 rounded-md border border-amber-300/70 bg-amber-50 px-2 py-1 text-xs dark:bg-amber-950/30"
        >
          <span className="flex flex-wrap items-center gap-1.5">
            <FlagIcon className="size-3 text-amber-600" />
            <span className="font-medium">{W.reported}</span>
            <Badge tone="warn">{W.reportKinds[r.kind]}</Badge>
            <Time at={r.at} />
          </span>
          <span className="whitespace-pre-wrap">{r.text}</span>
        </div>
      ))}
    </div>
  );
}

function ReportForm(props: {
  book: string;
  file: string;
  span: Span;
  page: number | undefined;
  onClose: () => void;
  onSent: () => void;
}) {
  const [kind, setKind] = useState<SourceReportKind>('转录错');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  if (done) return <div className="text-muted-foreground ms-9 mt-1 text-xs">{W.reportSent}</div>;
  return (
    // 表单里的点击不算点中段落
    <div
      className="ms-9 mt-2 flex flex-col gap-2"
      onClick={(e) => e.stopPropagation()}
      data-testid="report-form"
    >
      <div className="flex flex-wrap gap-1">
        {SOURCE_REPORT_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs',
              k === kind
                ? 'bg-primary text-primary-foreground border-transparent'
                : 'hover:bg-accent/60',
            )}
            onClick={() => setKind(k)}
          >
            {W.reportKinds[k]}
          </button>
        ))}
      </div>
      <textarea
        className="bg-background focus:border-foreground/30 min-h-16 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none"
        placeholder={W.reportPlaceholder}
        aria-label={W.reportIssue}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
      />
      {error !== undefined && <div className="text-destructive text-xs">{error}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={props.onClose}>
          {W.objectCancel}
        </Button>
        <Button
          size="sm"
          disabled={busy || text.trim() === ''}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            api
              .report({
                book: props.book,
                file: props.file,
                from: props.span.from,
                to: props.span.to,
                kind,
                text: text.trim(),
                ...(props.page !== undefined ? { page: props.page } : {}),
              })
              .then(() => {
                setDone(true);
                props.onSent();
              })
              .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              .finally(() => setBusy(false));
          }}
        >
          {W.objectSubmit}
        </Button>
      </div>
    </div>
  );
}

/** 原件上的那一处：已知位置直接用；否则按选中的行去比对；比不出来就看本节第一页。 */
function OriginalSpot(props: {
  section: SectionResponse;
  focus: Span | undefined;
  known: { page: number; bbox: BBox } | undefined;
}) {
  const { section, focus, known } = props;
  const key =
    known === undefined && focus !== undefined
      ? `locate:${section.book}:${section.file}:${String(focus.from)}-${String(focus.to)}`
      : 'locate:none';
  const loc = useLoad(
    key,
    () =>
      known === undefined && focus !== undefined
        ? api.locate(section.book, section.file, focus.from, focus.to)
        : Promise.resolve({ book: section.book, file: section.file, locations: [] }),
    false,
  );
  if (known !== undefined) {
    return (
      <OriginalPage
        key={`${String(known.page)}:${known.bbox.join(',')}`}
        book={section.book}
        page={known.page}
        boxes={[known.bbox]}
      />
    );
  }
  if (!loc.data) return <Loading error={loc.error} />;
  const first = loc.data.locations[0];
  if (first !== undefined) {
    const boxes = loc.data.locations.filter((l) => l.page === first.page).map((l) => l.bbox);
    return (
      <OriginalPage
        key={`${String(first.page)}:${boxes.map((b) => b.join(',')).join(';')}`}
        book={section.book}
        page={first.page}
        boxes={boxes}
      />
    );
  }
  const start = section.entry?.pdfPages?.from;
  if (start === undefined) {
    return (
      <div className="text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 text-sm">
        {W.noOriginal}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {focus !== undefined && <div className="text-muted-foreground text-xs">{W.notLocated}</div>}
      <OriginalPage key={`start:${String(start)}`} book={section.book} page={start} />
    </div>
  );
}

function Neighbors(props: {
  prev: TocEntry | undefined;
  next: TocEntry | undefined;
  go: (e: TocEntry) => void;
}) {
  const { prev, next } = props;
  if (prev === undefined && next === undefined) return null;
  return (
    <div className="flex items-stretch gap-2 border-t pt-3 text-sm">
      {prev !== undefined && (
        <button
          type="button"
          className="hover:bg-accent/60 flex flex-1 items-center gap-1 rounded-lg border px-2 py-1.5 text-left"
          onClick={() => props.go(prev)}
        >
          <ChevronLeftIcon className="text-muted-foreground size-4 shrink-0" />
          <span className="flex min-w-0 flex-col">
            <span className="text-muted-foreground text-xs">{W.prevSection}</span>
            <span className="truncate">{`${prev.num} ${prev.title}`.trim()}</span>
          </span>
        </button>
      )}
      {next !== undefined && (
        <button
          type="button"
          className="hover:bg-accent/60 ms-auto flex flex-1 items-center justify-end gap-1 rounded-lg border px-2 py-1.5 text-right"
          onClick={() => props.go(next)}
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-muted-foreground text-xs">{W.nextSection}</span>
            <span className="truncate">{`${next.num} ${next.title}`.trim()}</span>
          </span>
          <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
        </button>
      )}
    </div>
  );
}
