// 上传结果那一条（W11 §2）：每份分到了哪边、归谁，点一下改（改判资料 / 学过的、改归学习者 / 项目）。
import { useState } from 'react';
import type { UploadItemView } from '../../../shared/protocol.ts';
import { api } from '../../api.ts';
import { W } from '../../wording.ts';

export function UploadResult(props: { projectId: string; items: UploadItemView[] }) {
  const [items, setItems] = useState(props.items);
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const apply = async (call: () => Promise<{ items: UploadItemView[] }>) => {
    setBusy(true);
    setError(undefined);
    try {
      const fresh = (await call()).items;
      setItems((xs) =>
        xs.map((x) => fresh.find((f) => f.upload === x.upload && f.file === x.file) ?? x),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="text-muted-foreground flex flex-col gap-0.5" title={W.ownerHint}>
      <span>{W.filesSent(items.length)}</span>
      {items.map((x) => {
        const other = x.routedTo === '资料' ? '学过的' : '资料';
        const otherOwner = x.owner === '学习者' ? '项目' : '学习者';
        const material = x.material;
        return (
          <span key={`${x.upload}/${x.file}`} className="flex flex-wrap items-center gap-x-2">
            <span className="text-foreground">{x.file}</span>
            {x.problem !== undefined ? (
              <span className="text-destructive">{x.problem}</span>
            ) : (
              <>
                <span>
                  {W.routedTo[x.routedTo]}
                  {x.owner !== undefined ? ` · ${W.ownerIs(x.owner)}` : ''}
                </span>
                <button
                  type="button"
                  disabled={busy}
                  className="underline underline-offset-2 disabled:opacity-50"
                  onClick={() =>
                    void apply(() => api.reroute(props.projectId, x.upload, x.file, other))
                  }
                >
                  {W.rerouteTo(other)}
                </button>
                {material !== undefined && (
                  <button
                    type="button"
                    disabled={busy}
                    className="underline underline-offset-2 disabled:opacity-50"
                    onClick={() =>
                      void apply(() =>
                        api.setMaterialOwner(
                          props.projectId,
                          material,
                          otherOwner === '学习者' ? 'learner' : 'project',
                        ),
                      )
                    }
                  >
                    {W.ownerTo(otherOwner)}
                  </button>
                )}
              </>
            )}
          </span>
        );
      })}
      {error !== undefined && <span className="text-destructive">{error}</span>}
    </div>
  );
}
