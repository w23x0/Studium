import { describe, expect, it } from 'vitest';
import { DEFAULT_PROFILES, mergeProfiles } from '../src/core/model/profiles.ts';

describe('按会话类配模型与强度', () => {
  it('默认：主对话低，闭环 / 守卫 / M05 高', () => {
    expect(DEFAULT_PROFILES.main?.effort).toBe('low');
    for (const k of ['talk', 'loop', 'guard', 'm05', 'm15'] as const) {
      expect(DEFAULT_PROFILES[k]?.effort).toBe('high');
    }
  });

  it('覆盖只改指定的类', () => {
    const p = mergeProfiles({ loop: { model: 'm-x', effort: 'max' } });
    expect(p.loop).toEqual({ effort: 'max', model: 'm-x' });
    expect(p.main?.effort).toBe('low');
  });

  it('写错直接报错', () => {
    expect(() => mergeProfiles({ nope: {} })).toThrow('没有这种会话类');
    expect(() => mergeProfiles({ loop: { effort: 'huge' } })).toThrow('强度只能是');
    expect(() => mergeProfiles([])).toThrow('JSON 对象');
  });
});
