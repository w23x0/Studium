// 学习对话旁边的活页面（会话/学习对话.md §11）：显示当前版、看旧版（不算退回）、退回到某一版（可选原因）；
// 页面在只给脚本的小窗里跑，学习者看得到哪几块、展开折起、页面自己的动作都交回核心。
// PageTrials 挂在整页上：核心要试跑新的一版时，在看不见的小窗里跑一遍，报回有没有报错（会话/页面编辑员.md）。
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDownIcon, LoaderIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { PAGE_ROLLBACK_REASONS, type PageRollbackReason } from '../../shared/page.ts';
import type { NumberedRecord } from '../../shared/records.ts';
import { localMinute } from '../../shared/time.ts';
import { api } from '../api.ts';
import {
  frameMessage,
  pageDoc,
  toAction,
  TRIAL_LOAD_MS,
  TRIAL_SETTLE_MS,
  type FrameMessage,
} from '../page-frame.ts';
import { pageEditing, pageVersions } from '../page-model.ts';
import { WP } from '../wording-page.ts';

/** 这次学习有没有页面可显示（有版本，或第一版正在画）。 */
export function hasPage(records: NumberedRecord[]): boolean {
  return pageVersions(records).length > 0 || pageEditing(records);
}

export function LivePagePane(props: {
  loopId: string;
  records: NumberedRecord[];
  /** 学习结束了：只看，不再交动作。 */
  ended: boolean;
  onError: (e: unknown) => void;
  /** 窄屏：盖满全屏时的“回对话”。 */
  onClose?: () => void;
}) {
  const { loopId, records, ended, onError } = props;
  const versions = useMemo(() => pageVersions(records), [records]);
  const editing = useMemo(() => pageEditing(records), [records]);
  const current = versions.at(-1)?.version ?? 0;
  const [viewing, setViewing] = useState<number | undefined>(undefined);
  const shown = viewing ?? current;
  const live = viewing === undefined && !ended;
  const [doc, setDoc] = useState<{ version: number; html: string } | undefined>(undefined);
  const [asking, setAsking] = useState(false);
  const [rolling, setRolling] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const scrollY = useRef(0);
  const reported = useRef(new Set<string>());

  // 拼出要显示的那一版（旧版要用时才读）
  useEffect(() => {
    if (shown === 0) return;
    let alive = true;
    api
      .pageContent(loopId, shown)
      .then((c) => {
        if (alive) setDoc({ version: shown, html: pageDoc(c.blocks, location.origin) });
      })
      .catch(onError);
    return () => {
      alive = false;
    };
  }, [loopId, shown, onError]);

  // 小窗递出来的话：只认自己这个小窗；看旧版时不交动作（回看不算退回、也不算学习者动了页面）
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const win = frame.current?.contentWindow;
      if (win === null || win === undefined || e.source !== win) return;
      const m = frameMessage(e.data);
      if (m === undefined || doc === undefined) return;
      if (m.kind === 'ready') {
        win.postMessage({ studiumScroll: scrollY.current }, '*');
        return;
      }
      if (m.kind === 'scroll') {
        scrollY.current = m.y;
        return;
      }
      if (!live || doc.version !== current) return;
      deliver(loopId, doc.version, m, reported.current).catch(onError);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loopId, doc, live, current, onError]);

  const rollback = async (reason?: PageRollbackReason) => {
    if (viewing === undefined) return;
    setRolling(true);
    try {
      await api.pageRollback(loopId, { to: viewing, ...(reason !== undefined ? { reason } : {}) });
      setViewing(undefined);
      setAsking(false);
    } catch (e) {
      onError(e);
    } finally {
      setRolling(false);
    }
  };

  const changes = versions.filter((v) => !v.same).reverse();
  return (
    <div className="bg-background flex h-full min-h-0 flex-col" data-testid="live-page">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 text-sm">
        {props.onClose !== undefined && (
          <Button variant="ghost" size="sm" onClick={props.onClose}>
            <XIcon /> {WP.backToChat}
          </Button>
        )}
        <span className="font-medium">{WP.title}</span>
        {current > 0 && (
          <Menu>
            <MenuTrigger
              data-testid="page-versions"
              className="hover:bg-muted flex items-center gap-1 rounded-md px-2 py-1 text-xs"
            >
              {WP.version(shown)} <ChevronDownIcon className="size-3.5" />
            </MenuTrigger>
            <MenuContent>
              {changes.map((v) => (
                <MenuItem
                  key={v.version}
                  onClick={() => setViewing(v.version === current ? undefined : v.version)}
                >
                  <span>{WP.version(v.version)}</span>
                  <span className="text-muted-foreground text-xs">
                    {v.by === 'rollback' && v.from !== undefined
                      ? WP.byRollback(v.from)
                      : WP.byEditor}
                    {' · '}
                    {localMinute(v.at).slice(-5)}
                  </span>
                </MenuItem>
              ))}
            </MenuContent>
          </Menu>
        )}
        {editing && (
          <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
            <LoaderIcon className="size-3 animate-spin" />
            {current === 0 ? WP.drawing : WP.editing}
          </span>
        )}
      </div>
      {viewing !== undefined && (
        <div className="bg-muted/60 flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 text-xs">
          <span>{WP.viewingOld(viewing)}</span>
          <Button variant="outline" size="xs" onClick={() => setViewing(undefined)}>
            {WP.backToNow}
          </Button>
          {!ended && !asking && (
            <Button variant="outline" size="xs" onClick={() => setAsking(true)}>
              {WP.rollback}
            </Button>
          )}
          {asking && (
            <span className="flex flex-wrap items-center gap-1.5" data-testid="rollback-reasons">
              <span className="text-muted-foreground">
                {rolling ? WP.rollingBack : WP.rollbackAsk}
              </span>
              {PAGE_ROLLBACK_REASONS.map((r) => (
                <Button
                  key={r}
                  variant="outline"
                  size="xs"
                  disabled={rolling}
                  onClick={() => void rollback(r)}
                >
                  {r}
                </Button>
              ))}
              <Button
                variant="outline"
                size="xs"
                disabled={rolling}
                onClick={() => void rollback()}
              >
                {WP.rollbackSkip}
              </Button>
              <Button variant="ghost" size="xs" disabled={rolling} onClick={() => setAsking(false)}>
                {WP.rollbackCancel}
              </Button>
            </span>
          )}
        </div>
      )}
      <div className="min-h-0 flex-1">
        {doc !== undefined && shown > 0 && (
          <iframe
            ref={frame}
            key={doc.version}
            title={WP.title}
            sandbox="allow-scripts"
            srcDoc={doc.html}
            className="h-full w-full border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}

/** 小窗里的一件事交给核心（报错同一句只报一次）。 */
async function deliver(
  loopId: string,
  version: number,
  m: FrameMessage,
  reported: Set<string>,
): Promise<void> {
  if (m.kind === 'view') {
    await api.pageView(loopId, { version, visible: m.visible, dwell: m.dwell });
    return;
  }
  if (m.kind === 'error') {
    const key = `${String(version)}:${m.message}`;
    if (reported.has(key)) return;
    reported.add(key);
    await api.pageError(loopId, { version, message: m.message });
    return;
  }
  const action = toAction(m);
  if (action === undefined) return;
  await api.pageActions(loopId, {
    version,
    actions: [action],
    ...(m.kind === 'action' && m.wait ? { awaited: true } : {}),
  });
}

// ───────────── 试跑 ─────────────

interface Trial {
  loopId: string;
  trialId: string;
  html: string;
}

/** 整页挂一个：核心要试跑时在看不见的小窗里跑新的一版，报回有没有报错。 */
export function PageTrials() {
  const [trials, setTrials] = useState<Trial[]>([]);
  useEffect(
    () =>
      api.events((e) => {
        if (e.type !== 'page_trial') return;
        const html = pageDoc(e.blocks, location.origin);
        setTrials((ts) => [...ts, { loopId: e.sessionId, trialId: e.trialId, html }]);
      }),
    [],
  );
  const done = useCallback((trialId: string) => {
    setTrials((ts) => ts.filter((x) => x.trialId !== trialId));
  }, []);
  return (
    <>
      {trials.map((t) => (
        <TrialFrame key={t.trialId} trial={t} onDone={done} />
      ))}
    </>
  );
}

function TrialFrame(props: { trial: Trial; onDone: (trialId: string) => void }) {
  const { trial, onDone } = props;
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const errors: string[] = [];
    let finished = false;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: string) => {
      if (finished) return;
      finished = true;
      const message = error ?? errors[0];
      api
        .pageTrial(trial.loopId, trial.trialId, {
          ok: message === undefined,
          ...(message !== undefined ? { error: message } : {}),
        })
        .catch((e: unknown) => {
          console.error('试跑结果没交上：', e);
        })
        .finally(() => onDone(trial.trialId));
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const m = frameMessage(e.data);
      if (m?.kind === 'error') errors.push(m.message);
      if (m?.kind === 'ready' && settle === undefined) {
        settle = setTimeout(() => finish(), TRIAL_SETTLE_MS);
      }
    };
    window.addEventListener('message', onMessage);
    const giveUp = setTimeout(() => {
      finish(errors[0] ?? `页面 ${String(TRIAL_LOAD_MS / 1000)} 秒内没加载完`);
    }, TRIAL_LOAD_MS);
    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(giveUp);
      if (settle !== undefined) clearTimeout(settle);
    };
  }, [trial, onDone]);
  return (
    <iframe
      ref={frame}
      title="试跑"
      aria-hidden
      tabIndex={-1}
      sandbox="allow-scripts"
      srcDoc={trial.html}
      style={{ position: 'fixed', left: -10000, top: 0, width: 800, height: 900, border: 0 }}
    />
  );
}
