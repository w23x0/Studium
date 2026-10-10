// 书里的知识点（右侧面板）：按书、按章数点；点开一章列出那一章的点，再点进知识点面板。
// 项目选了资料时默认只列项目资料里的书，可切“看全部”。
import { ChevronRightIcon, ListTreeIcon } from 'lucide-react';
import type { M08OverviewResponse } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { useProjectScope } from '../../hooks/use-project-scope.ts';
import { usePanel, useProject } from '../../panel.ts';
import { chapterNumber, chapterTitles, NO_ANCHOR } from '../../scope-model.ts';
import { W } from '../../wording.ts';
import { Badge, Loading, Section, SourceBadge } from '../evidence/parts.tsx';

export function PointsBrowse(props: {
  book?: string | undefined;
  chapter?: string | undefined;
  all?: boolean | undefined;
}) {
  if (props.book !== undefined && props.chapter !== undefined)
    return <ChapterPoints book={props.book} chapter={props.chapter} />;
  return <Overview all={props.all === true} book={props.book} />;
}

function Overview(props: { all: boolean; book?: string | undefined }) {
  const project = useProject();
  const scope = useProjectScope();
  const panel = usePanel();
  // 看某一本书的点时不按项目资料筛
  const all = props.all || props.book !== undefined;
  const r = useLoad(
    `m08:overview:${project ?? ''}:${String(all)}`,
    () => api.m08Overview(project, all),
    false,
  );
  if (!r.data) return <Loading error={r.error} />;
  const o = r.data;
  const books = props.book !== undefined ? o.books.filter((b) => b.book === props.book) : o.books;
  // 项目选了资料才有“只看项目资料 / 看全部”之分
  const canToggle = scope !== undefined && props.book === undefined;
  return (
    <div className="flex flex-col gap-4" data-testid="points-browse">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-lg">{W.pointsBrowse}</h2>
        <p className="text-muted-foreground text-xs">{W.pointsBrowseHint}</p>
      </div>
      {canToggle && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>{o.restricted ? W.pointsScopeProject : W.pointsScopeAll}</span>
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() =>
              panel.replace({ kind: 'points', ...(o.restricted ? { all: true } : {}) })
            }
          >
            {o.restricted ? W.pointsShowAll : W.pointsShowProject}
          </button>
        </div>
      )}
      {books.length === 0 ? (
        <div className="text-muted-foreground text-sm">{W.emptyLibrary}</div>
      ) : (
        books.map((b) => <BookBlock key={b.book} book={b} />)
      )}
    </div>
  );
}

function BookBlock(props: { book: M08OverviewResponse['books'][number] }) {
  const panel = usePanel();
  const b = props.book;
  const noAnchor = b.book === NO_ANCHOR;
  // 章名从这本书的目录里取；读不到目录（书不在书库里）就只写章号
  const toc = useLoad(`library:toc:${b.book}`, () => tocOf(b.book), false);
  const titles = toc.data ? chapterTitles(toc.data.entries) : new Map<string, string>();
  const label = (ch: string) =>
    ch === NO_ANCHOR
      ? W.noAnchor
      : (titles.get(ch) ??
        (chapterNumber(ch) !== undefined ? W.chapterOf(chapterNumber(ch) ?? 0) : ch));
  return (
    <Section title={noAnchor ? W.noAnchor : (b.bookTitle ?? b.book)}>
      <div className="text-muted-foreground -mt-1 text-xs">{W.pointsCount(b.points)}</div>
      <ul className="flex flex-col">
        {b.chapters.map((c) => (
          <li key={c.chapter}>
            <button
              type="button"
              className="hover:bg-accent/60 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm"
              onClick={() => panel.show({ kind: 'points', book: b.book, chapter: c.chapter })}
            >
              <ListTreeIcon className="text-muted-foreground size-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{label(c.chapter)}</span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {W.pointsCount(c.points)}
              </span>
              <ChevronRightIcon className="text-muted-foreground size-3.5 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function ChapterPoints(props: { book: string; chapter: string }) {
  const panel = usePanel();
  const { book, chapter } = props;
  const r = useLoad(`m08:points:${book}:${chapter}`, () => api.pointsIn(book, chapter), false);
  const toc = useLoad(`library:toc:${book}`, () => tocOf(book), false);
  const n = chapterNumber(chapter);
  const title =
    chapter === NO_ANCHOR
      ? W.noAnchor
      : ((toc.data !== undefined ? chapterTitles(toc.data.entries).get(chapter) : undefined) ??
        (n !== undefined ? W.chapterOf(n) : chapter));
  const bookTitle = book === NO_ANCHOR ? W.noAnchor : (toc.data?.title ?? book);
  return (
    <div className="flex flex-col gap-4" data-testid="chapter-points">
      <div className="flex flex-col gap-1">
        <div className="text-muted-foreground text-xs">{bookTitle}</div>
        <h2 className="font-serif text-lg">{title}</h2>
      </div>
      {!r.data ? (
        <Loading error={r.error} />
      ) : r.data.points.length === 0 ? (
        <div className="text-muted-foreground text-sm">{W.pointsNone}</div>
      ) : (
        <>
          <div className="text-muted-foreground text-xs">{W.pointsCount(r.data.points.length)}</div>
          <ul className="flex flex-col gap-1.5">
            {r.data.points.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="bg-card hover:bg-accent/40 flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left text-sm shadow-xs"
                  onClick={() => panel.show({ kind: 'point', id: p.id })}
                >
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{p.name}</span>
                    <SourceBadge source={p.source} note={p.sourceNote} />
                    {p.threshold === true && <Badge tone="accent">{W.threshold}</Badge>}
                  </span>
                  <span className="text-muted-foreground line-clamp-2">{p.sentence}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** 书的目录；“没标位置的”那一组不是书，不读。 */
function tocOf(book: string) {
  return book === NO_ANCHOR ? Promise.resolve(undefined) : api.toc(book);
}
