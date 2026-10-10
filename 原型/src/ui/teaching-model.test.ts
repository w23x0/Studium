import { describe, expect, it } from 'vitest';
import type { DiagnosisView, StateRecordView } from '../shared/protocol.ts';
import type { Intensity } from '../shared/records.ts';
import {
  afterTeachingText,
  directionOf,
  intensityChips,
  loopTrend,
  toolCounts,
  trendLines,
  verdictText,
} from './teaching-model.ts';

const x = (hint: Intensity['hint'], lean: Intensity['lean'] = '均衡'): Intensity => ({
  info: '中',
  hint,
  challenge: '中',
  pace: '中',
  lean,
});

const note = (line: number, intensity?: Intensity): DiagnosisView => ({
  line,
  at: '2026-10-10T00:00:00Z',
  text: '观察',
  ...(intensity ? { intensity } : {}),
});

describe('教法强度', () => {
  it('每轮五个小标签，讲还是练用日常话', () => {
    const chips = intensityChips(x('高', '练习'));
    expect(chips.map((c) => c.text)).toEqual(['中', '高', '中', '中', '偏练']);
  });

  it('走势只用标了强度的轮次，按轮次排，记下没标的条数', () => {
    const t = loopTrend([note(3, x('高')), note(5), note(8, x('中')), note(11, x('低', '练习'))]);
    expect(t?.turns).toBe(3);
    expect(t?.unmarked).toBe(1);
    const hint = t?.rows.find((r) => r.dim === 'hint');
    expect(hint?.cells.map((c) => c.level)).toEqual([2, 1, 0]);
    expect(hint?.direction).toBe('降');
    expect(t?.rows.find((r) => r.dim === 'lean')?.sequence).toEqual(['讲练各半', '偏练']);
    expect(loopTrend([note(1)])).toBeUndefined();
  });

  it('走向：首末比较，首末相同但变过算起伏', () => {
    expect(directionOf('hint', ['低', '高', '低'])).toBe('起伏');
    expect(directionOf('pace', ['慢', '快'])).toBe('升');
    expect(directionOf('info', ['中', '中'])).toBe('持平');
  });

  it('教法记录的走向摘要', () => {
    const d = { first: '高', last: '低', sequence: ['高', '低'], direction: '降' as const };
    const same = { first: '中', last: '中', sequence: ['中'], direction: '持平' as const };
    const lines = trendLines({
      info: same,
      hint: d,
      challenge: same,
      pace: same,
      lean: { first: '输入', last: '练习', sequence: ['输入', '练习'], direction: '升' },
    });
    expect(lines[1]).toBe('提示强度：高 → 低（往下走）');
    expect(lines[4]).toBe('偏讲还是偏练：偏讲 → 偏练（往上走）');
  });

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

describe('出现在教法变化之后', () => {
  const after = (dim: string, text: string) => ({
    changeId: `L1:12:${dim}`,
    loopSessionId: 'L1',
    line: 12,
    text,
  });

  it('换成日常话', () => {
    expect(afterTeachingText(after('hint', '第 12 行起，提示强度由「高」降为「低」'))).toBe(
      '这是在老师把提示变少之后出现的',
    );
    expect(afterTeachingText(after('lean', '第 12 行起，偏向由「输入」升为「练习」'))).toBe(
      '这是在老师从多讲转向多让你练之后出现的',
    );
  });

  it('认不出时用笼统的说法，不露行号', () => {
    const t = afterTeachingText(after('what', '第 12 行起，某项变了'));
    expect(t).toBe('这是在老师调整教法之后出现的');
    expect(t).not.toContain('12');
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
