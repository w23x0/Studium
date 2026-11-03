// 旧数据：找资料对话交回过的候选清单（W12 §4.8 起找资料自己定存哪些、直接存，不再勾选）。只读：每份标题与网址、
// 为什么选；存过的标出存了哪些，没勾的标没存。
import { ExternalLinkIcon } from 'lucide-react';
import type { CandidatesView } from '../thread-model.ts';
import { W } from '../wording.ts';
import { Badge } from './evidence/parts.tsx';

export function CandidateList(props: { view: CandidatesView }) {
  const { view } = props;
  const done = view.picked;
  return (
    <div
      data-testid="find-candidates"
      className="bg-card flex flex-col gap-2 rounded-2xl border p-3 text-sm shadow-xs"
    >
      <span className="font-medium">{W.candidatesTitle}</span>
      <ul className="flex flex-col gap-1.5">
        {view.items.map((c, i) => {
          const picked = done?.picked.includes(i) === true;
          return (
            <li key={i} className="flex items-start gap-2 rounded-lg px-1 py-1">
              <span className="mt-0.5 w-12 shrink-0">
                <Badge tone={picked ? 'good' : 'neutral'}>
                  {picked ? W.candidatesSaved : W.candidatesNotSaved}
                </Badge>
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary inline-flex items-center gap-1 font-medium"
                >
                  {c.title}
                  <ExternalLinkIcon className="text-muted-foreground size-3" />
                </a>
                <span className="text-muted-foreground text-xs">{c.why}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
