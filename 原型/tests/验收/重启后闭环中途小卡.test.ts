// 验收：闭环中途的小卡、停车记录由 M05 的一个会话做；服务在这类会话做到一半时重启，
// 重启后它照样是“出小卡 / 记停车记录”的活（不退回出选择卡的工具），当次的小卡 / 停车记录照样出来，记进原闭环。
// 模拟重启：M05 会话刚收到开场、还没交回时，把数据目录原样拷一份（正本只追加、每行落盘），在拷贝上重新启动。
import { cpSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../../src/core/app.ts';
import { FakeModel, type FakeContext } from '../../src/core/model/fake.ts';
import { post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { settled } from '../helpers/evidence-flow.ts';
import {
  detourResponder,
  newDetourState,
  openLoop,
  recordsOfType,
  TROUBLE,
} from '../helpers/detour-flow.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

/** 把数据目录拷一份（不带进程锁与派生索引：锁属于还开着的那个进程，索引从正本重建）。 */
function snapshot(from: string, to: string): void {
  cpSync(from, to, {
    recursive: true,
    filter: (src) => !/[\\/](\.lock|index\.sqlite[^\\/]*)$/.test(src),
  });
}

/** 第一次看到带这个工具的 M05 会话时拷一份数据目录，记下是哪个会话。 */
function snapshotOn(tool: string, from: () => string, to: string) {
  const st = newDetourState();
  const base = detourResponder(st);
  const seen: { sessionId?: string } = {};
  const responder = (ctx: FakeContext) => {
    if (seen.sessionId === undefined && ctx.spec.tools.some((t) => t.name === tool)) {
      seen.sessionId = ctx.spec.session?.id ?? '';
      snapshot(from(), to);
    }
    return base(ctx);
  };
  return { responder, seen };
}

async function startOn(dataRoot: string, responder: (ctx: FakeContext) => unknown) {
  const fake = new FakeModel({ responder: responder as never });
  const app = await createApp({ dataRoot, model: fake, token: TOKEN, port: 0 });
  apps.push(app);
  return { app, fake };
}

describe('重启后闭环中途的小卡与停车记录', () => {
  it('出小卡的 M05 会话做到一半重启：重启后仍是出小卡的工具，小卡照样贴进原闭环，教学侧收到结果', async () => {
    const root = await tempDir();
    const copy = join(await tempDir(), 'data');
    const { responder, seen } = snapshotOn('submit_detour_card', () => root, copy);
    const { app } = await startOn(root, responder);
    const mainId = await app.studium.ensureMain();
    const { loopId } = await openLoop(app, mainId, 1);
    await post(app, `/sessions/${loopId}/messages`, { text: TROUBLE });
    await waitFor('拷好了', () => Promise.resolve(seen.sessionId));
    await app.studium.settled();
    await app.close();
    apps.splice(0);

    // 在“重启时”的数据上起：通知已记、M05 会话已开但没交回小卡
    const m05Id = seen.sessionId ?? '';
    const st2 = newDetourState();
    const { app: b, fake } = await startOn(copy, detourResponder(st2));
    const before = await records(b, loopId);
    expect(recordsOfType(before, 'route_signal')).toHaveLength(1);
    expect(recordsOfType(before, 'detour_card')).toHaveLength(0);

    const card = await waitFor('小卡贴回原闭环', async () => {
      const rs = await records(b, loopId);
      return recordsOfType(rs, 'detour_card')[0]?.record;
    });
    // 同一个 M05 会话补做，用的是出小卡的工具
    expect(card.m05SessionId).toBe(m05Id);
    const redo = fake.inputs.find((i) => i.spec.session?.id === m05Id);
    expect(redo?.spec.tools.map((t) => t.name)).toContain('submit_detour_card');
    expect(redo?.spec.tools.map((t) => t.name)).not.toContain('submit_choice_card');
    // 开场记录里写着这件活
    const opened = (await records(b, m05Id))[0]?.record;
    expect(opened).toMatchObject({ type: 'session_opened', m05Job: { kind: 'detour', loopId } });
    // 教学侧收到“小卡已经贴在这里”的结果
    await b.studium.settled();
    const facts = (await settled(b, loopId)).filter(
      (r) => r.record.type === 'program_fact' && r.record.text.includes('小卡已经贴在这个闭环里'),
    );
    expect(facts).toHaveLength(1);

    // 学习者照样能在小卡上选
    const res = await post(b, `/sessions/${loopId}/detour`, { cardId: card.cardId, option: 1 });
    expect(res.status).toBe(201);
    await b.studium.settled();

    // 再重启一次：已经交回的不再重做
    await b.close();
    apps.splice(0);
    const { app: c } = await startOn(copy, detourResponder(newDetourState()));
    await c.studium.settled();
    expect(recordsOfType(await records(c, loopId), 'detour_card')).toHaveLength(1);
  });

  it('记停车记录的 M05 会话做到一半重启：重启后停车记录照样记进原闭环，清单补记“已写入”', async () => {
    const root = await tempDir();
    const copy = join(await tempDir(), 'data');
    const { responder, seen } = snapshotOn('submit_parking_note', () => root, copy);
    const { app } = await startOn(root, responder);
    const mainId = await app.studium.ensureMain();
    const { loopId } = await openLoop(app, mainId, 1);
    await post(app, `/sessions/${loopId}/messages`, { text: '先这样吧' });
    await settled(app, loopId);
    await post(app, `/sessions/${loopId}/end`, { note: '今天先到这' });
    await waitFor('拷好了', () => Promise.resolve(seen.sessionId));
    await app.studium.settled();
    await app.close();
    apps.splice(0);

    const m05Id = seen.sessionId ?? '';
    const { app: b, fake } = await startOn(copy, detourResponder(newDetourState()));
    expect(recordsOfType(await records(b, loopId), 'parking_note')).toHaveLength(0);
    const note = await waitFor('停车记录记进原闭环', async () => {
      const rs = await records(b, loopId);
      return recordsOfType(rs, 'parking_note')[0]?.record;
    });
    expect(note).toMatchObject({ reason: 'ended_unclosed', m05SessionId: m05Id });
    const redo = fake.inputs.find((i) => i.spec.session?.id === m05Id);
    expect(redo?.spec.tools.map((t) => t.name)).toContain('submit_parking_note');
    await b.studium.settled();
    const steps = recordsOfType(await records(b, loopId), 'after_loop_step').map(
      (r) => r.record.step,
    );
    expect(steps).toContain('parked');
  });
});
