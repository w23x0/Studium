// 找资料对话里的候选清单（工单 W9 §4.5；设计 docs/设计/会话/找资料.md）：每份带复选框、标题与网址、
// 为什么选；可全选；“存所选”才存进本项目资料。存过的清单只读，标出存了哪些。
import { useState } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '../api.ts';
import type { CandidatesView } from '../thread-model.ts';
import { W } from '../wording.ts';
import { Badge } from './evidence/parts.tsx';

export function CandidateList(props: { view: CandidatesView; sessionId: string }) {
  const { view } = props;
  const done = view.picked;
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const all = view.items.map((_, i) => i);
  const toggle = (i: number) =>
    setChosen((c) => {
      const n = new Set(c);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <div
      data-testid="find-candidates"
      className="bg-card flex flex-col gap-2 rounded-2xl border p-3 text-sm shadow-xs"
    >
      <div className="flex items-center gap-2">
        <span className="font-medium">{W.candidatesTitle}</span>
        {done === undefined && (
          <Button
            variant="ghost"
            size="xs"
            className="ms-auto"
            onClick={() => setChosen(chosen.size === all.length ? new Set() : new Set(all))}
          >
            {W.candidatesAll}
          </Button>
        )}
      </div>
      {done === undefined && <p className="text-muted-foreground text-xs">{W.candidatesHint}</p>}
      <ul className="flex flex-col gap-1.5">
        {view.items.map((c, i) => {
          const picked = done?.picked.includes(i) === true;
          return (
            <li key={i} className="flex items-start gap-2 rounded-lg px-1 py-1">
              {done === undefined ? (
                <input
                  type="checkbox"
                  className="mt-1"
                  aria-label={c.title}
                  checked={chosen.has(i)}
                  onChange={() => toggle(i)}
                />
              ) : (
                <span className="mt-0.5 w-12 shrink-0">
                  <Badge tone={picked ? 'good' : 'neutral'}>
                    {picked ? W.candidatesSaved : W.candidatesNotSaved}
                  </Badge>
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium hover:underline"
                  >
                    {c.title}
                    <ExternalLinkIcon className="text-muted-foreground size-3" />
                  </a>
                  {c.alreadyIn !== undefined && <Badge tone="accent">{W.candidatesAlready}</Badge>}
                </span>
                <span className="text-muted-foreground truncate font-mono text-xs">{c.url}</span>
                <span className="text-xs leading-relaxed">{c.why}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {done === undefined ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={busy || chosen.size === 0}
            onClick={() => {
              setBusy(true);
              setError(undefined);
              api
                .pickCandidates(props.sessionId, view.line, [...chosen])
                .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? W.candidatesSaving : W.candidatesSave}
          </Button>
          {error !== undefined && <span className="text-destructive text-xs">{error}</span>}
        </div>
      ) : (
        <div className="text-muted-foreground text-xs">
          {W.candidatesDone(done.materials.filter((m) => m !== '').length)}
        </div>
      )}
    </div>
  );
}
