import { describe, expect, it } from 'vitest';
import type { NumberedRecord } from '../shared/records.ts';
import { toUiMessages } from './thread-model.ts';

const at = 'x';

describe('toUiMessages', () => {
  const records: NumberedRecord[] = [
    { line: 1, record: { type: 'session_opened', at, sessionId: 's', kind: 'main', title: 't' } },
    { line: 2, record: { type: 'user_message', at, text: '问' } },
    { line: 3, record: { type: 'model_raw', at, adapter: 'fake', payload: {} } },
    { line: 4, record: { type: 'assistant_message', at, text: '答一' } },
    { line: 5, record: { type: 'assistant_message', at, text: '答二' } },
  ];

  it('只显示对话，不显示原始消息；同一轮的多段回复合并', () => {
    expect(toUiMessages(records, '')).toEqual([
      { id: 'l2', role: 'user', text: '问', line: 2 },
      { id: 'l4', role: 'assistant', text: '答一\n\n答二', line: 4 },
    ]);
  });

  it('流式草稿作为最后一条助手消息', () => {
    expect(toUiMessages(records.slice(0, 2), '正在')).toMatchObject([
      { role: 'user' },
      { id: 'draft', role: 'assistant', text: '正在' },
    ]);
  });

  it('失败的一轮显示原因', () => {
    const rs: NumberedRecord[] = [
      { line: 1, record: { type: 'user_message', at, text: '问' } },
      { line: 2, record: { type: 'turn_failed', at, reason: '断网' } },
    ];
    expect(toUiMessages(rs, '')[1]).toMatchObject({ failed: true, text: '（本轮没有完成：断网）' });
  });
});
