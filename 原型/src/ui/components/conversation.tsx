import { ConversationControls } from './model/conversation-controls.tsx';
// 中间的对话页：主对话（界面说明 §2.3）。顶上面包屑，项目名回项目对话。学习对话（含旧的）都走 learn/learn-page.tsx。
// 生成中途能停、停下后能改自己刚发的那句（W12 §4.4）；正在做什么一行（§4.5）。
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { Thread } from '@/components/assistant-ui/thread';
import type { NumberedRecord } from '../../shared/records.ts';
import { latestContext } from '../../shared/usage.ts';
import { api } from '../api.ts';
import { toUiMessages, type UiMessage } from '../thread-model.ts';
import type { ThreadGroup } from '../../shared/threads.ts';
import { W } from '../wording.ts';
import type { PickedFile } from '../files.ts';
import { TopBar } from './top-bar.tsx';
import { UploadResult } from './input/upload-result.tsx';

export function Conversation(props: {
  sessionId: string;
  projectId: string;
  projectTitle: string;
  titleOf: (id: string) => string | undefined;
  /** 讨论串现在的标题与状态（主对话里的卡片用，W12 §4.1）。 */
  statusOf: (id: string) => { title: string; group: ThreadGroup } | undefined;
  headerExtra: ReactNode;
  onError: (e: unknown) => void;
  /** 点面包屑上的项目名（回项目对话）。 */
  onProject: () => void;
}) {
  const { sessionId, onError, titleOf, statusOf } = props;
  const [records, setRecords] = useState<NumberedRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [running, setRunning] = useState(false);
  const [activity, setActivity] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const stop = api.events((e) => {
      if (e.sessionId !== sessionId) return;
      if (e.type === 'delta') {
        setDraft((d) => d + e.text);
        setActivity(undefined);
      }
      // 正在做什么（W12 §4.5）
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
        // 与 SSE 先到的记录合并，按行号去重
        setRecords((rs) => {
          const byLine = new Map(r.records.map((x) => [x.line, x]));
          for (const x of rs) byLine.set(x.line, x);
          return [...byLine.values()].sort((a, b) => a.line - b.line);
        });
        setRunning(r.running);
      })
      .catch(onError);
    return () => {
      alive = false;
      stop();
    };
  }, [sessionId, onError]);

  const messages = useMemo(
    () => toUiMessages(records, draft, { running, titleOf, statusOf }),
    [records, draft, running, titleOf, statusOf],
  );

  const runtime = useExternalStoreRuntime<UiMessage>({
    messages,
    // 不把“模型在答”告诉输入框：答到一半也能接着说（排到这一轮之后），“正在答”由最后一条占位显示
    isRunning: false,
    convertMessage: (m): ThreadMessageLike => ({
      id: m.id,
      role: m.role,
      content: m.text,
      metadata: {
        custom: {
          ...(m.at !== undefined ? { at: m.at } : {}),
          ...(m.edited ? { edited: m.edited } : {}),
          ...(m.reaction !== undefined ? { reaction: m.reaction } : {}),
          ...(m.editable ? { editable: m.editable } : {}),
          ...(m.card ? { card: m.card } : {}),
          ...(m.id === 'draft' && activity !== undefined ? { activity } : {}),
        },
      },
      ...(m.role === 'assistant'
        ? {
            status:
              m.id === 'draft'
                ? { type: 'running' as const }
                : m.failed === true
                  ? { type: 'incomplete' as const, reason: 'error' as const }
                  : { type: 'complete' as const, reason: 'stop' as const },
          }
        : {}),
    }),
    onNew: async (m: AppendMessage) => {
      const text = m.content.flatMap((p) => (p.type === 'text' ? [p.text] : [])).join('');
      await api.send(sessionId, text);
    },
  });

  const header = (
    <div className="shrink-0">
      <TopBar
        crumbs={[
          {
            label: props.projectTitle || W.projectHome,
            onClick: props.onProject,
            testId: 'crumb-project',
          },
          { label: W.projectChat, testId: 'crumb-current' },
        ]}
        right={props.headerExtra}
      />
    </div>
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread
        header={header}
        welcome={W.mainWelcome}
        placeholder={running ? '可以接着说（这一轮说完再交给它）…' : '回复…'}
        running={running}
        onStop={async () => {
          await api.stop(sessionId);
        }}
        onEditLast={async (text) => {
          await api.editLast(sessionId, text);
        }}
        onSend={async (text) => {
          await api.send(sessionId, text);
        }}
        contextTokens={latestContext(records)}
        modelControls={<ConversationControls key={sessionId} sessionId={sessionId} />}
        // 输入框拖入文件：不进输入，走项目的上传（工单 W9 §4.1）
        onFiles={async (files: PickedFile[]) => {
          const r = await api.upload(props.projectId, files);
          return <UploadResult projectId={props.projectId} items={r.items} />;
        }}
      />
    </AssistantRuntimeProvider>
  );
}
