// W14 §3 额度：订阅各窗口的已用百分比与重置时间。打开账号菜单或使用情况面板时问一次（核心只放内存）；
// 适配器没有额度（别家模型）就不显示；一次都没拿到写“暂时拿不到”。
import { useEffect, useState } from 'react';
import { api } from '../../api.ts';
import { localMinute } from '../../../shared/time.ts';
import type { QuotaResponse } from '../../../shared/usage.ts';
import { W } from '../../wording.ts';

const U = W.usage;

/** 挂上时问一次额度；undefined = 还在问。出错只记控制台、按拿不到显示。 */
function useQuota(): QuotaResponse | undefined {
  const [q, setQ] = useState<QuotaResponse | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    api
      .quota()
      .then((r) => {
        if (alive) setQ(r);
      })
      .catch((e: unknown) => {
        console.error('问额度失败：', e);
        if (alive) setQ({ available: true, windows: [] });
      });
    return () => {
      alive = false;
    };
  }, []);
  return q;
}

/** 使用情况面板最上面：每个窗口一行，带条和重置时间。 */
export function QuotaBlock() {
  const q = useQuota();
  return <QuotaDetails quota={q} />;
}

export function QuotaDetails({ quota: q }: { quota: QuotaResponse | undefined }) {
  if (q?.available === false) return null;
  return (
    <section data-testid="quota-block" className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{U.quota}</h3>
      {q === undefined ? (
        <p className="text-muted-foreground text-xs">{U.quotaLoading}</p>
      ) : q.windows.length === 0 ? (
        <p className="text-muted-foreground text-xs">{U.quotaNone}</p>
      ) : (
        <>
          {q.windows.map((w) => (
            <div key={w.key} className="flex flex-col gap-1 text-xs">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{w.label}</span>
                <span className="text-muted-foreground">{U.quotaUsed(w.percent)}</span>
                {w.resetsAt !== undefined && (
                  <span className="text-muted-foreground ms-auto">
                    {U.quotaResets(localMinute(w.resetsAt))}
                  </span>
                )}
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${String(Math.min(100, Math.max(0, w.percent)))}%` }}
                />
              </div>
            </div>
          ))}
          {q.at !== undefined && (
            <p className="text-muted-foreground text-[0.7rem]">{U.quotaAsOf(localMinute(q.at))}</p>
          )}
        </>
      )}
    </section>
  );
}
