// 书里的习题（批 9）：某本书（某一章）的习题文件，列出前面几行（带行号），点一行或“看原文”在面板里打开原文。
import { BookOpenIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { practiceApi } from '../../api-practice.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Loading, Section } from '../evidence/parts.tsx';
import { BookText } from '../sources/book-text.tsx';

const WP = W.practice;

export function ExercisesView(props: { book: string; chapter?: string | undefined }) {
  const { book, chapter } = props;
  const panel = usePanel();
  const r = useLoad(
    `exercises:${book}:${chapter ?? ''}`,
    () => practiceApi.exercises({ book, ...(chapter !== undefined ? { chapter } : {}) }),
    false,
  );
  if (!r.data) return <Loading error={r.error} />;
  const found = r.data.books.find((b) => b.book === book);
  const sections = found?.sections ?? [];
  return (
    <div className="flex flex-col gap-5" data-testid="exercises-view">
      <h2 className="font-serif text-lg">
        {chapter !== undefined ? WP.exercises : WP.exercisesBook}
        {found !== undefined && (
          <span className="text-muted-foreground ms-2 text-sm">{found.bookTitle}</span>
        )}
      </h2>
      {sections.length === 0 && (
        <div className="text-muted-foreground text-sm">{WP.exercisesNone}</div>
      )}
      {sections.map((s) => (
        <Section
          key={s.file}
          title={`${s.num} ${s.title}${s.pages !== undefined ? ` · ${s.pages}` : ''}`}
        >
          <ol className="bg-card flex flex-col rounded-xl border py-1 shadow-xs">
            {s.items.map((it) => (
              <li key={it.line}>
                <button
                  type="button"
                  className="hover:bg-accent/40 flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm"
                  onClick={() =>
                    panel.show({ kind: 'source', book, file: s.file, from: it.line, to: it.line })
                  }
                >
                  <span className="text-muted-foreground w-8 shrink-0 text-xs tabular-nums">
                    {it.line}
                  </span>
                  <BookText text={it.text} className="min-w-0 flex-1 text-sm" />
                </button>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => panel.show({ kind: 'source', book, file: s.file })}
            >
              <BookOpenIcon />
              {s.truncated ? WP.exercisesMore : WP.exercisesOpen}
            </Button>
            <span className="text-muted-foreground text-xs">{WP.exercisesLines(s.totalLines)}</span>
          </div>
        </Section>
      ))}
    </div>
  );
}
