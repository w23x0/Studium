// 书列表下面的“几本书都讲了的”：同一个知识点在不同书里各讲在哪里；点一处在面板里看那一节。
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Section } from '../evidence/parts.tsx';

export function ClueList() {
  const panel = usePanel();
  const r = useLoad('library:clues', () => api.clues(), false);
  // 读不到线索不挡书列表：这是附加的一栏
  if (!r.data) return null;
  const { clues } = r.data;
  return (
    <Section title={W.clues} hint={W.cluesHint}>
      {clues.length === 0 ? (
        <div className="text-muted-foreground text-sm">{W.cluesNone}</div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="clue-list">
          {clues.map((c) => (
            <li
              key={c.id}
              className="bg-card flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm shadow-xs"
            >
              <span className="font-medium">{c.label}</span>
              <span className="flex flex-wrap gap-1.5">
                {c.sections.map((s) => (
                  <button
                    key={`${s.book}:${s.file}`}
                    type="button"
                    className="hover:bg-accent/60 text-muted-foreground rounded-md border px-2 py-0.5 text-xs"
                    onClick={() => panel.show({ kind: 'source', book: s.book, file: s.file })}
                  >
                    {s.bookTitle} · {`${s.num} ${s.title}`.trim()}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
