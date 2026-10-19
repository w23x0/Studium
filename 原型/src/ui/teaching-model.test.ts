import { describe, expect, it } from 'vitest';
import type { StateRecordView } from '../shared/protocol.ts';
import { toolCounts, verdictText } from './teaching-model.ts';

describe('教法记录', () => {
  it('取用过的教法按名字合并计数', () => {
    expect(
      toolCounts([
        { name: '提取练习', line: 3 },
        { name: '错误分析', line: 9 },
        { name: '提取练习', line: 12 },
      ]),
    ).toEqual([
      { name: '提取练习', count: 2 },
      { name: '错误分析', count: 1 },
    ]);
  });
});

describe('状态表态', () => {
  const base: StateRecordView = {
    id: 's1',
    at: '',
    text: '',
    source: '推断',
    sourceLevel: '推断',
    output: '解释候选',
    timeRange: '',
    refs: [],
    confirmations: [],
    m15SessionId: '',
    model: { name: 'm', known: true },
    objections: [],
  };

  it('没表态为空；最后一条算数，带上写的那句', () => {
    expect(verdictText(base)).toBeUndefined();
    expect(
      verdictText({
        ...base,
        learnerVerdict: '否认',
        confirmations: [
          { id: 'a', at: '', recordId: 's1', verdict: '确认' },
          { id: 'b', at: '', recordId: 's1', verdict: '否认', note: '那天只是累了' },
        ],
      }),
    ).toEqual({ text: '你说过：不对', note: '那天只是累了' });
  });
});
