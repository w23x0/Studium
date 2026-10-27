// 组件试跑（会话/页面子代理.md「试跑再换上」）：整页挂一个，核心要试跑组件的新一版时，在看不见的小窗里跑一遍，
// 报回有没有报错。学习者看到的一直是上一版。
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api.ts';
import { componentDoc, frameMessage, TRIAL_LOAD_MS, TRIAL_SETTLE_MS } from '../../page-frame.ts';

interface Trial {
  loopId: string;
  trialId: string;
  html: string;
}

export function PageTrials() {
  const [trials, setTrials] = useState<Trial[]>([]);
  useEffect(
    () =>
      api.events((e) => {
        if (e.type !== 'page_trial') return;
        const html = componentDoc(e.blocks, location.origin);
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
        .screenTrial(trial.loopId, trial.trialId, {
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
      finish(errors[0] ?? `组件 ${String(TRIAL_LOAD_MS / 1000)} 秒内没加载完`);
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
