// 产出物的“可能对别人也有用”：学习者标的说明（标在哪一版），只记在产出物自己这里，显示“候选、未审”；只追加。
import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import type { OutputView } from '../../../shared/m14.ts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { api } from '../../api.ts';
import { shortTime } from '../../evidence-model.ts';
import { W } from '../../wording.ts';
import { Badge } from '../evidence/parts.tsx';

const INPUT =
  'bg-background focus:border-foreground/30 rounded-lg border px-3 py-1.5 text-sm outline-none';

export function GeneralTab(props: { output: OutputView; onAdded: () => void }) {
  const o = props.output;
  const [text, setText] = useState('');
  const [version, setVersion] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3" data-testid="output-general">
      <p className="text-muted-foreground text-xs leading-relaxed">{W.generalHint}</p>
      {o.candidates.length === 0 && (
        <div className="text-muted-foreground text-sm">{W.generalEmpty}</div>
      )}
      <ul className="flex flex-col gap-2">
        {[...o.candidates].reverse().map((c) => (
          <li
            key={c.id}
            className="bg-card flex flex-col gap-1 rounded-xl border px-3 py-2 text-sm shadow-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warn">{c.status}</Badge>
              <span className="text-muted-foreground text-xs">
                {W.versionN(c.version)} · {shortTime(c.at)}
              </span>
            </div>
            <div className="whitespace-pre-wrap">{c.text}</div>
          </li>
        ))}
      </ul>
      {o.latest === 0 ? null : open ? (
        <div className="bg-card flex flex-col gap-2 rounded-xl border p-3 text-sm">
          <textarea
            className={cn(INPUT, 'min-h-20')}
            placeholder={W.generalPlaceholder}
            aria-label={W.generalPlaceholder}
            value={text}
            autoFocus
            onChange={(e) => setText(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{W.generalVersion}</span>
            <select
              className={INPUT}
              value={version ?? o.latest}
              onChange={(e) => setVersion(Number(e.target.value))}
            >
              {[...o.history].reverse().map((v) => (
                <option key={v.n} value={v.n}>
                  {W.versionN(v.n)}
                </option>
              ))}
            </select>
          </label>
          {error !== undefined && <div className="text-xs text-red-700">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              {W.outputNewCancel}
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                if (text.trim() === '') {
                  setError(W.generalNeedText);
                  return;
                }
                setBusy(true);
                api
                  .markCandidate(o.id, {
                    text: text.trim(),
                    ...(version !== undefined ? { version } : {}),
                  })
                  .then(() => {
                    setText('');
                    setOpen(false);
                    setError(undefined);
                    props.onAdded();
                  })
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
                  .finally(() => setBusy(false));
              }}
            >
              {W.generalSave}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="self-start" onClick={() => setOpen(true)}>
          <PlusIcon />
          {W.generalMark}
        </Button>
      )}
    </div>
  );
}
