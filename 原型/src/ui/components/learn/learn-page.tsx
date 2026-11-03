// 学习页（会话/学习对话.md §11）：一次学习只有一条上下文，学习者眼前是一份从上往下的页面（竖流，W12 起唯一的学习页，
// stream-page.tsx）。10-28、10-29 的区域图学习（W12 撤掉）退成只读：文字块按时间排，组件显示最后一版，不按区域摆。
// 更早的（没有 session_opened.screens）交回消息流只看。
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PlainMarkdown } from '@/components/assistant-ui/markdown-text';
import { MathPreview } from '@/components/input/math-preview';
import type { NumberedRecord } from '../../../shared/records.ts';
import type { OldComponentsResponse } from '../../../shared/screen.ts';
import { api } from '../../api.ts';
import { CurrentSessionContext } from '../../panel.ts';
import { W } from '../../wording.ts';
import { WP } from '../../wording-page.ts';
import { TopBar } from '../top-bar.tsx';
import { ComponentFrame } from './component-frame.tsx';
import { StreamPage } from './stream-page.tsx';

export interface LearnPageProps {
  sessionId: string;
  title: string;
  projectId: string;
  projectTitle: string;
  titleOf: (id: string) => string | undefined;
  headerExtra: ReactNode;
  onError: (e: unknown) => void;
  onBackToMain: () => void;
  onProject: () => void;
  /** 旧版开的学习对话：交回消息流只看。 */
  oldLoop: ReactNode;
}

/** 订阅到的这次学习：记录、正在写的字、在不在跑、正在做什么、读完没有。 */
export interface LearnStream {
  records: NumberedRecord[];
  draft: string;
  running: boolean;
  /** 正在做什么（W12 §4.5：程序从工具调用得出的一行）。 */
  activity: string | undefined;
  loaded: boolean;
}

/** 按这次学习开时定的学习页种类分：竖流；区域图（旧数据，只读）；更早的（消息流只看）。 */
export function LearnPage(props: LearnPageProps) {
  const stream = useStream(props.sessionId, props.onError);
  const opened = stream.records[0]?.record;
  if (opened?.type !== 'session_opened') return null;
  if (opened.page === 'stream') return <StreamPage {...props} stream={stream} />;
  if (opened.screens === true) return <OldGridPage {...props} records={stream.records} />;
  return <>{props.oldLoop}</>;
}

/** 旧的区域图学习（W12 撤掉）只读看：学习者的话、学习对话的话按时间排，组件放在第一次交上那里、显示最后一版。 */
function OldGridPage(props: LearnPageProps & { records: NumberedRecord[] }) {
  const { sessionId, records, onError } = props;
  const [components, setComponents] = useState<OldComponentsResponse['components']>([]);
  useEffect(() => {
    let alive = true;
    api
      .oldComponents(sessionId)
      .then((r) => {
        if (alive) setComponents(r.components);
      })
      .catch(onError);
    return () => {
      alive = false;
    };
  }, [sessionId, onError]);
  const items = useMemo(() => {
    const out: { line: number; node: ReactNode }[] = [];
    for (const { line, record: r } of records) {
      if (r.type === 'user_message') {
        out.push({
          line,
          node: (
            <div className="bg-muted ms-auto max-w-[85%] rounded-2xl px-4 py-2.5">
              <MathPreview text={r.text} />
            </div>
          ),
        });
      } else if (r.type === 'assistant_message' && r.interim !== true && r.text.trim() !== '') {
        out.push({ line, node: <PlainMarkdown text={r.text} /> });
      } else if (r.type === 'close_requested' && r.summary !== undefined) {
        out.push({
          line,
          node: (
            <div className="bg-muted/50 flex flex-col gap-1.5 rounded-lg px-3 py-2 text-sm">
              <div className="text-muted-foreground text-xs">{WP.closingBlock}</div>
              <div className="whitespace-pre-wrap">{r.summary}</div>
            </div>
          ),
        });
      }
    }
    for (const c of components) {
      out.push({
        line: c.line,
        node: (
          <ComponentFrame
            loopId={sessionId}
            component={c.component}
            version={c.version}
            blocks={c.blocks}
            live={false}
            title={c.pointer}
            onError={onError}
          />
        ),
      });
    }
    return out.sort((a, b) => a.line - b.line);
  }, [records, components, sessionId, onError]);
  return (
    <CurrentSessionContext.Provider value={sessionId}>
      <div className="flex h-full min-h-0 flex-col" data-testid="learn-page" data-page="old-grid">
        <TopBar
          crumbs={[
            {
              label: props.projectTitle || W.projectHome,
              onClick: props.onProject,
              testId: 'crumb-project',
            },
            { label: props.title, testId: 'crumb-current' },
          ]}
          right={props.headerExtra}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[52rem] flex-col gap-4 px-4 py-4">
            <p className="text-muted-foreground text-sm" data-testid="old-grid-note">
              {WP.oldGrid}
            </p>
            {items.map((x, i) => (
              <div key={`${String(x.line)}-${String(i)}`} className="min-w-0">
                {x.node}
              </div>
            ))}
          </div>
        </div>
      </div>
    </CurrentSessionContext.Provider>
  );
}

/** 订阅这次学习的记录、正在写的字、在不在跑、正在做什么（同对话页的外壳，学习页自己一份）。 */
function useStream(sessionId: string, onError: (e: unknown) => void): LearnStream {
  const [records, setRecords] = useState<NumberedRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const [activity, setActivity] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const stop = api.events((e) => {
      if (e.sessionId !== sessionId) return;
      if (e.type === 'delta') {
        setDraft((d) => d + e.text);
        setActivity(undefined);
      }
      // 正在做什么（W12 §4.5）：工具调用之间说的话不上页面，正在写的那段收起、换成这一行（§4.6）
      if (e.type === 'activity') {
        setActivity(e.text);
        setDraft('');
      }
      if (e.type === 'running') {
        setRunning(e.running);
        if (!e.running) {
          setDraft('');
          setActivity(undefined);
        }
      }
      if (e.type === 'record') {
        // 这一轮最后写的话记下就已经在页面上了，正在写的那段随之收起
        if (e.record.type === 'assistant_message') setDraft('');
        setRecords((rs) =>
          rs.some((r) => r.line === e.line) ? rs : [...rs, { line: e.line, record: e.record }],
        );
      }
    });
    api
      .records(sessionId)
      .then((r) => {
        if (!alive) return;
        setRecords((rs) => {
          const byLine = new Map(r.records.map((x) => [x.line, x]));
          for (const x of rs) byLine.set(x.line, x);
          return [...byLine.values()].sort((a, b) => a.line - b.line);
        });
        setRunning(r.running);
        setLoaded(true);
      })
      .catch(onError);
    return () => {
      alive = false;
      stop();
    };
  }, [sessionId, onError]);
  return { records, draft, running, activity, loaded };
}
