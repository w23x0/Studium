// 学习页（会话/学习对话.md §11）：一次学习只有一条上下文，学习者眼前是一份从上往下的页面（竖流，stream-page.tsx）。
// 旧的学习（10-28、10-29 的区域图、更早的 W10 前）也在竖流里只读显示：文字按时间排，区域图那批的组件显示最后一版（W19）。
import { useEffect, useState, type ReactNode } from 'react';
import type { NumberedRecord } from '../../../shared/records.ts';
import { api } from '../../api.ts';
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
}

/** 订阅到的这次学习：记录、正在写的字、在不在跑、正在做什么、读完没有。 */
export interface LearnStream {
  records: NumberedRecord[];
  draft: string;
  running: boolean;
  /** 正在做什么（W12 §4.5：程序从工具调用得出的一行）。 */
  activity: string | undefined;
  /** 正在流出来的思考概要（成块记进正本后清掉）。 */
  thinking: string;
  loaded: boolean;
}

export function LearnPage(props: LearnPageProps) {
  const stream = useStream(props.sessionId, props.onError);
  if (stream.records[0]?.record.type !== 'session_opened') return null;
  return <StreamPage {...props} stream={stream} />;
}

/** 订阅这次学习的记录、正在写的字、在不在跑、正在做什么（同对话页的外壳，学习页自己一份）。 */
function useStream(sessionId: string, onError: (e: unknown) => void): LearnStream {
  const [records, setRecords] = useState<NumberedRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const [activity, setActivity] = useState<string | undefined>(undefined);
  const [thinking, setThinking] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const stop = api.events((e) => {
      if (e.sessionId !== sessionId) return;
      if (e.type === 'delta') {
        setDraft((d) => d + e.text);
        setActivity(undefined);
      }
      // 正在做什么（W12 §4.5）：正在写的那段记下后上页面，这里换成这一行
      if (e.type === 'activity') {
        setActivity(e.text);
        setDraft('');
      }
      if (e.type === 'thinking') {
        setThinking((t) => t + e.text);
        setActivity(undefined);
      }
      if (e.type === 'running') {
        setRunning(e.running);
        if (!e.running) {
          setDraft('');
          setActivity(undefined);
          setThinking('');
        }
      }
      if (e.type === 'record') {
        // 这一轮最后写的话记下就已经在页面上了，正在写的那段随之收起
        if (e.record.type === 'assistant_message') setDraft('');
        if (e.record.type === 'model_raw') setThinking('');
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
  return { records, draft, running, activity, thinking, loaded };
}
