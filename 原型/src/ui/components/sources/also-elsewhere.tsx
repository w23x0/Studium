// 小节页上的“别的书也讲这里”：同一个知识点在别的书里讲在哪（程序按锚点 / 名字 / 检索词连的）；点开在面板里看那一节。
// 连不上就老实说没查到，不编。
import { LinkIcon } from 'lucide-react';
import { api } from '../../api.ts';
import { useLoad } from '../../hooks/use-load.ts';
import { usePanel } from '../../panel.ts';
import { W } from '../../wording.ts';
import { Loading, Section } from '../evidence/parts.tsx';

export function AlsoElsewhere(props: { book: string; file: string }) {
  const panel = usePanel();
  const r = useLoad(
    `links:${props.book}:${props.file}`,
    () => api.links(props.book, props.file),
    false,
  );
  if (!r.data) return <Loading error={r.error} />;
  const { others } = r.data;
  return (
    <Section title={W.alsoElsewhere} hint={W.alsoElsewhereHint}>
      {others.length === 0 ? (
        <div className="text-muted-foreground text-sm" data-testid="also-none">
          {W.alsoNone}
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5" data-testid="also-elsewhere">
          {others.map((o) => (
            <li key={`${o.book}:${o.file}`}>
              <button
                type="button"
                className="bg-card hover:bg-accent/40 flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2 text-left text-sm shadow-xs"
                onClick={() => panel.show({ kind: 'source', book: o.book, file: o.file })}
              >
                <span className="flex flex-wrap items-center gap-x-2">
                  <LinkIcon className="text-muted-foreground size-3.5" />
                  <span>{o.bookTitle}</span>
                  <span className="font-medium">{`${o.num} ${o.title}`.trim()}</span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {W.linkVia[o.via]}：{o.points.map((p) => p.name).join('、')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
