// 验收（W4）：练习任务对象整块删（练什么、交什么在对话里说清），教法强度四项删（不再让模型每轮自报）。
// 设计：会话/学习对话.md §6–§7；记录/教法记录与教学工具.md「用了什么：程序照记」；工单 W4 §4。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { call, getJson, post } from '../helpers/http.ts';
import { cardStep, openLearning, roleOf, say, start } from './共用/w4-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('练习与强度已删', () => {
  it('练习相关接口 404；依据视图里没有强度', async () => {
    const { app, world } = await start((ctx, w) =>
      roleOf(ctx.spec) === 'nav' ? cardStep(w) : { text: '好。' },
    );
    apps.push(app);
    const loopId = await openLearning(app, world.mainId);
    await say(app, loopId, '位移就是终点减起点');

    for (const path of [
      `/loops/${loopId}/practice`,
      `/loops/${loopId}/practice/pr-1`,
      '/practice/exercises',
      '/practice/error-patterns',
      '/practice/summaries',
    ]) {
      expect((await call(app, path)).status, `GET ${path} 已删`).toBe(404);
    }
    for (const path of [
      `/loops/${loopId}/practice/summarize`,
      `/loops/${loopId}/practice/pr-1/submit`,
      `/loops/${loopId}/practice/pr-1/hint`,
      `/loops/${loopId}/practice/pr-1/abandon`,
    ]) {
      expect((await post(app, path, { text: 'x' })).status, `POST ${path} 已删`).toBe(404);
    }

    const ev = await getJson<{ loop: object }>(app, `/loops/${loopId}/evidence`);
    expect(JSON.stringify(ev), '依据视图里没有教法强度').not.toMatch(/intensity/i);
  });
});
