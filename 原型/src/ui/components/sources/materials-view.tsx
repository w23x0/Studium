// 资料（右侧面板）：资料列表（标出本项目的）→ 文件清单 → 文件原文；全文检索（默认只搜本项目资料，
// 可切查全部项目的）；原件的一页。
import { useState } from 'react';
import { BookIcon, FileTextIcon, SearchIcon } from 'lucide-react';
import type { BBox, TocEntry } from '../../../shared/protocol.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { useProjectScope } from '../../hooks/use-project-scope.ts';
import { usePanel, useProject } from '../../panel.ts';
import { markTerms } from '../../source-model.ts';
import { W } from '../../wording.ts';
import { Badge, Loading, Section } from '../evidence/parts.tsx';
import { OriginalPage } from './original-page.tsx';
import { SourceNoteCard } from './source-note.tsx';

export function MaterialsView(props: { book?: string | undefined }) {
  return (
    <div className="flex flex-col gap-5" data-testid="materials-view">
      <SearchBox book={props.book} />
      {props.book === undefined ? <Books /> : <Toc book={props.book} />}
    </div>
  );
}

function SearchBox(props: {
  book?: string | undefined;
  q?: string;
  all?: boolean | undefined;
  replace?: boolean;
}) {
  const panel = usePanel();
  const scope = useProjectScope();
  const [q, setQ] = useState(props.q ?? '');
  const [inBook, setInBook] = useState(props.book !== undefined);
  const [all, setAll] = useState(props.all === true);
  const go = (wantAll: boolean) => {
    if (q.trim() === '') return;
    const t = {
      kind: 'search' as const,
      q: q.trim(),
      ...(inBook && props.book !== undefined ? { book: props.book } : {}),
      ...(wantAll && scope !== undefined ? { all: true } : {}),
    };
    if (props.replace === true) panel.replace(t);
    else panel.show(t);
  };
  const oneBook = inBook && props.book !== undefined;
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        go(all);
      }}
    >
      <div className="bg-card focus-within:border-foreground/30 flex items-center gap-2 rounded-lg border px-2.5 py-1.5">
        <SearchIcon className="text-muted-foreground size-4 shrink-0" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder={W.searchPlaceholder}
          aria-label={W.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" size="xs" variant="ghost" disabled={q.trim() === ''}>
          {W.searchGo}
        </Button>
      </div>
      {props.book !== undefined && (
        <label className="text-muted-foreground flex items-center gap-1.5 self-start text-xs">
          <input type="checkbox" checked={inBook} onChange={(e) => setInBook(e.target.checked)} />
          {W.searchInBook}
        </label>
      )}
      {!oneBook && (
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span data-testid="search-scope">
            {scope !== undefined && !all ? W.searchScopeProject(scope) : W.searchScopeAll}
          </span>
          {scope !== undefined && (
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={all}
                onChange={(e) => {
                  setAll(e.target.checked);
                  // 已经搜过（结果页里）：换范围就重搜
                  if (props.q !== undefined) go(e.target.checked);
                }}
              />
              {W.searchAll}
            </label>
          )}
        </div>
      )}
    </form>
  );
}

function Books() {
  const panel = usePanel();
  const project = useProject();
  const r = useLoad(`sources:books:${project ?? ''}`, () => api.books(project), false);
  if (!r.data) return <Loading error={r.error} />;
  const { books } = r.data;
  if (books.length === 0) {
    return (
      <Section title={W.books}>
        <div className="text-muted-foreground text-sm">{W.materialsEmpty}</div>
      </Section>
    );
  }
  return (
    <Section title={W.books}>
      {[...books]
        .sort((x, y) => x.title.localeCompare(y.title, 'zh-CN', { numeric: true }))
        .map((b) => (
          <button
            key={b.id}
            type="button"
            className="bg-card hover:bg-accent/40 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm shadow-xs"
            onClick={() => panel.show({ kind: 'materials', book: b.id })}
          >
            <BookIcon className="text-muted-foreground size-4 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium">{b.title}</span>
              <span className="text-muted-foreground text-xs">{W.bookSections(b.sections)}</span>
            </span>
            {b.selected === true && <Badge tone="accent">{W.inProject}</Badge>}
            {b.hasOriginal && <Badge>{W.hasOriginal}</Badge>}
          </button>
        ))}
    </Section>
  );
}

function Toc(props: { book: string }) {
  const panel = usePanel();
  const r = useLoad(`sources:toc:${props.book}`, () => api.toc(props.book), false);
  if (!r.data) return <Loading error={r.error} />;
  const { title, entries, book } = r.data;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-lg">{title}</h2>
      <SourceNoteCard book={book} />
      <Section title={W.toc}>
        <ul className="flex flex-col">
          {entries.map((e, i) => (
            <li key={i} className="group relative">
              <TocRow
                entry={e}
                onOpen={
                  e.file !== undefined && e.file !== ''
                    ? () => e.file && panel.show({ kind: 'source', book, file: e.file })
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function TocRow(props: { entry: TocEntry; onOpen: (() => void) | undefined }) {
  const e = props.entry;
  const body = (
    <>
      <span className="text-muted-foreground w-10 shrink-0 text-xs tabular-nums">{e.num}</span>
      <span className="min-w-0 flex-1">
        {e.title}
        {props.onOpen === undefined && (
          <span className="text-muted-foreground ms-1 text-xs">{W.noText}</span>
        )}
      </span>
    </>
  );
  const cls = 'flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-sm';
  return props.onOpen !== undefined ? (
    <button type="button" className={cn(cls, 'hover:bg-accent/60')} onClick={props.onOpen}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function SearchView(props: {
  q: string;
  book?: string | undefined;
  all?: boolean | undefined;
}) {
  const panel = usePanel();
  const project = useProject();
  const r = useLoad(
    `sources:search:${props.book ?? ''}:${props.q}:${project ?? ''}:${String(props.all)}`,
    () => api.search(props.q, props.book, 50, project, props.all),
    false,
  );
  return (
    <div className="flex flex-col gap-4" data-testid="search-view">
      <SearchBox book={props.book} q={props.q} all={props.all} replace />
      {!r.data ? (
        <Loading error={r.error} />
      ) : r.data.hits.length === 0 ? (
        <div className="text-muted-foreground text-sm">{W.searchNone}</div>
      ) : (
        <>
          <div className="text-muted-foreground text-xs">
            {W.searchFound(r.data.total)}
            {r.data.total > r.data.hits.length && W.searchShown(r.data.hits.length)}
          </div>
          <ul className="flex flex-col gap-1.5">
            {r.data.hits.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="bg-card hover:bg-accent/40 flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left text-sm shadow-xs"
                  onClick={() =>
                    panel.show({
                      kind: 'source',
                      book: h.book,
                      file: h.file,
                      from: h.line,
                      to: h.line,
                    })
                  }
                >
                  <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                    <FileTextIcon className="size-3.5" />
                    <span>{h.bookTitle}</span>
                    <span className="text-foreground font-medium">
                      {`${h.num} ${h.title}`.trim()}
                    </span>
                    {h.pdfPage !== undefined && <span>{W.pageOf(h.pdfPage)}</span>}
                  </span>
                  <span className="line-clamp-3 font-serif">
                    {markTerms(h.snippet, props.q).map((s, j) =>
                      s.hit ? (
                        <mark
                          key={j}
                          className="rounded-sm bg-amber-200/70 px-0.5 dark:bg-amber-700/50"
                        >
                          {s.text}
                        </mark>
                      ) : (
                        <span key={j}>{s.text}</span>
                      ),
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** 原件的一页（从出处点过来）：书里的原句 + 页面图上的位置框。 */
export function PageView(props: {
  book: string;
  page: number;
  bbox?: BBox | undefined;
  quote?: string | undefined;
  file?: string | undefined;
  line?: number | undefined;
}) {
  const panel = usePanel();
  const { book, file, line } = props;
  // 标题用资料名；列表还没取到（或已经没有这份）时先用 id
  const books = useLoad('sources:books', () => api.books(), false);
  const title = books.data?.books.find((b) => b.id === book)?.title ?? book;
  return (
    <div className="flex flex-col gap-4" data-testid="page-view">
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground self-start text-xs"
          onClick={() => panel.show({ kind: 'materials', book })}
        >
          {title} · {W.toc}
        </button>
        <h2 className="font-serif text-lg">{W.page(title, props.page)}</h2>
      </div>
      {props.quote !== undefined && props.quote !== '' && (
        <Section title={W.quoteOnPage}>
          <blockquote className="border-primary/40 border-s-2 ps-3 font-serif">
            {props.quote}
          </blockquote>
        </Section>
      )}
      {file !== undefined && file !== '' && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() =>
            panel.show({
              kind: 'source',
              book,
              file,
              ...(line !== undefined ? { from: line, to: line } : {}),
            })
          }
        >
          <FileTextIcon />
          {W.readText}
        </Button>
      )}
      <OriginalPage
        key={`${String(props.page)}:${props.bbox?.join(',') ?? ''}`}
        book={book}
        page={props.page}
        {...(props.bbox !== undefined ? { boxes: [props.bbox] } : {})}
      />
    </div>
  );
}
