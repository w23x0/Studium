// 学到一半出的小卡（先去补 X，补完回来 / 先不管接着学 / 先放一放），贴在学习对话里；和“接下来学哪个”同一个样子。
// 选了“先去补”自动跳到岔出去的那段对话；选过的显示选了哪项。
import { useState } from 'react';
import { ArrowRightIcon, InfoIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '../api.ts';
import { useOpenSession } from '../open-session.ts';
import { usePanel } from '../panel.ts';
import type { DetourUi } from '../thread-model.ts';
import { W } from '../wording.ts';

export function DetourCardBox(props: { loopId: string; card: DetourUi }) {
  const { loopId, card } = props;
  const [busy, setBusy] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const open = useOpenSession();
  const panel = usePanel();
  const chosen = card.chosen;
  return (
    <div
      data-testid="detour-card"
      className="bg-card max-w-(--thread-max-width) rounded-2xl border p-3 shadow-sm"
    >
      <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
        {W.detourAsk}
        <button
          type="button"
          className="hover:text-foreground ms-auto flex items-center gap-1"
          onClick={() => panel.show({ kind: 'loop', loopId })}
        >
          <InfoIcon className="size-3.5" />
          {W.detourWhy}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {card.options.map((o, i) => {
          const picked = chosen?.option === i;
          return (
            <button
              key={i}
              type="button"
              disabled={chosen !== undefined || busy !== undefined}
              className={cn(
                'rounded-xl border px-3 py-2 text-left',
                chosen === undefined && 'hover:bg-accent/60',
                chosen === undefined && i === card.recommended && 'border-primary',
                picked && 'border-primary bg-primary/5',
                chosen !== undefined && !picked && 'opacity-50',
              )}
              onClick={() => {
                setBusy(i);
                setError(undefined);
                api
                  .detour(loopId, card.cardId, i)
                  .then((r) => {
                    if (r.forkLoopSessionId !== undefined) open(r.forkLoopSessionId);
                  })
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
                  .finally(() => setBusy(undefined));
              }}
            >
              <div className="flex flex-wrap items-center gap-2 font-medium">
                {o.title}
                <span className="text-muted-foreground text-xs font-normal">
                  {W.detourKind[o.kind]}
                </span>
                {chosen === undefined && i === card.recommended && (
                  <span className="text-primary text-xs">{W.recommended}</span>
                )}
                {picked && <span className="text-primary text-xs">{W.detourChosen}</span>}
                {busy === i && <span className="text-muted-foreground text-xs">{W.opening}</span>}
              </div>
              <div className="text-muted-foreground text-sm">{o.reason}</div>
              {o.scope !== undefined && (
                <div className="text-muted-foreground text-xs">
                  {W.detourScope}：{o.scope}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {chosen?.forkLoopSessionId !== undefined && (
        <button
          type="button"
          className="text-primary mt-2 flex items-center gap-1 text-sm hover:underline"
          onClick={() => chosen.forkLoopSessionId && open(chosen.forkLoopSessionId)}
        >
          {W.goThere}
          <ArrowRightIcon className="size-3.5" />
        </button>
      )}
      {error !== undefined && <div className="text-destructive mt-2 text-xs">{error}</div>}
    </div>
  );
}
