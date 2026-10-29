// 页面上的一个组件：一个组件一个小窗（只给脚本、不联网）。组件发出的一句话经框架的发送口交给核心
// （先回做它的子代理 / 直接给主对话，按组件代码里写的）；运行时报错报回（学习者碰到时才出的，同一句只报一次）。
// 学习结束后只看：不交操作、不报错。小窗的颜色跟着界面的浅色 / 深色（换了就重新载入）。
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../api.ts';
import { componentDoc, frameMessage } from '../../page-frame.ts';
import { useDark } from '../../theme.ts';

export function ComponentFrame(props: {
  loopId: string;
  component: string;
  version: number;
  blocks: { id: string; html: string }[];
  /** 学习还开着：交学习者的操作。 */
  live: boolean;
  title: string;
  onError: (e: unknown) => void;
}) {
  const { loopId, component, version, live, onError } = props;
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(160);
  const reported = useRef(new Set<string>());
  const dark = useDark();
  const html = useMemo(
    () => componentDoc(props.blocks, location.origin, dark),
    [props.blocks, dark],
  );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const win = frame.current?.contentWindow;
      if (win === null || win === undefined || e.source !== win) return;
      const m = frameMessage(e.data);
      if (m === undefined) return;
      if (m.kind === 'height') {
        setHeight(Math.min(Math.max(m.h, 60), 2000));
        return;
      }
      if (!live) return;
      if (m.kind === 'error') {
        const key = `${String(version)}:${m.message}`;
        if (reported.current.has(key)) return;
        reported.current.add(key);
        api.screenError(loopId, { component, version, message: m.message }).catch(onError);
        return;
      }
      if (m.kind === 'action') {
        api
          .screenAction(loopId, {
            component,
            text: m.text,
            to: m.to,
            ...(m.wait ? { awaited: true } : {}),
          })
          .catch(onError);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [loopId, component, version, live, onError]);

  return (
    <iframe
      ref={frame}
      key={`${component}@${String(version)}@${dark ? 'dark' : 'light'}`}
      title={props.title}
      sandbox="allow-scripts"
      srcDoc={html}
      style={{ height, colorScheme: dark ? 'dark' : 'light' }}
      className="bg-card w-full rounded-lg border-0"
    />
  );
}
