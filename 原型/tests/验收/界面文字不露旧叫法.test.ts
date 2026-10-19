// 验收（W6）：界面上看得到的程序文字不再出现旧叫法“闭环”“M0x”“M1x”（工单 README §2.8；
// docs/设计/00-定位与原则.md §7 横切 5“产出可见”要求学习者看得懂）。走一遍主路径（出卡 → 学 → 改单子 → 合上；
// 再开一次 → 没合上就结束），收集：主对话与学习对话里的程序事实、卡与路线决定的触发原因、学习结束后的步骤、
// 会话名、操作报错，以及按界面转换规则（thread-model）显示的消息。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import { toUiMessages } from '../../src/ui/thread-model.ts';
import { getJson, post } from '../helpers/http.ts';
import {
  boot,
  cardAfterLoop,
  choose,
  closeAndConfirm,
  editTicket,
  endUnclosed,
  newFlow,
  requestCard,
  rows,
  say,
  settled,
} from './共用/w6-flow.ts';

const OLD = ['闭环', 'M0', 'M1'];

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('界面文字不露旧叫法', () => {
  it('走完主路径：程序事实、触发原因、学习结束后的步骤、会话名、报错、对话消息都不含 闭环 / M0 / M1', async () => {
    const flow = newFlow();
    const { app, mainId } = await boot(flow);
    apps.push(app);
    const rejected: { what: string; status: number; error: string }[] = [];
    const collectError = async (what: string, res: Response): Promise<void> => {
      const body = (await res.json().catch(() => ({}))) as { error?: unknown };
      rejected.push({
        what,
        status: res.status,
        error: typeof body.error === 'string' ? body.error : '',
      });
    };

    await post(app, `/sessions/${mainId}/messages`, { text: '我想学力学' });
    await settled(app, mainId);

    // 第一次：改单子、合上
    const first = await choose(app, await requestCard(app, mainId), 0);
    await collectError('判定前确认合上', await post(app, `/sessions/${first}/confirm-close`));
    await say(app, first, flow);
    await editTicket(app, first, { newPoint: '位移：位置的变化量，只看起点和终点' });
    await settled(app, first);
    await closeAndConfirm(app, first);
    const next = await cardAfterLoop(app, first);
    await collectError(
      '结束后说话',
      await post(app, `/sessions/${first}/messages`, { text: '还在吗' }),
    );
    await collectError('结束后再结束', await post(app, `/sessions/${first}/end`, { note: 'x' }));
    await collectError('结束后改单子', await editTicket(app, first, { newPoint: '再改' }));

    // 第二次：没合上就结束
    const second = await choose(app, next, 1);
    await say(app, second, flow);
    await endUnclosed(app, second, '今天先到这');
    await cardAfterLoop(app, second);

    const texts: { where: string; text: string }[] = [];
    for (const id of [mainId, first, second]) {
      const recs = await settled(app, id);
      for (const r of await rows(app, id)) {
        const rec = r.record;
        if (rec.type === 'program_fact')
          texts.push({ where: `${id} 程序事实`, text: String(rec.text) });
        if (rec.type === 'choice_card' || rec.type === 'route_decision') {
          texts.push({ where: `${id} ${rec.type} 触发原因`, text: String(rec.trigger) });
        }
        if (rec.type === 'after_loop_step') {
          texts.push({
            where: `${id} 学习结束后`,
            text: `${String(rec.step)} ${String(rec.detail)}`,
          });
        }
      }
      for (const m of toUiMessages(recs, '')) {
        texts.push({ where: `${id} 对话消息`, text: `${m.text} ${m.link?.label ?? ''}` });
      }
    }
    const { sessions } = await getJson<{ sessions: { title: string }[] }>(app, '/sessions');
    for (const s of sessions) texts.push({ where: '会话名', text: s.title });
    for (const r of rejected) texts.push({ where: `报错：${r.what}`, text: r.error });

    expect(
      texts.filter((t) => t.where.endsWith('程序事实')).length,
      '收集到了程序事实',
    ).toBeGreaterThan(3);
    const leaks = texts.filter((t) => OLD.some((w) => t.text.includes(w)));
    expect(leaks, '界面上看得到的程序文字里不能有旧叫法').toEqual([]);
    expect(
      rejected.filter((r) => r.status !== 400 || r.error === ''),
      '这几步都应被拒绝（400）并说明原因',
    ).toEqual([]);
  });
});
