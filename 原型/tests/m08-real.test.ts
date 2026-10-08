// 真书 M08（资料线产出）接进原型：选择卡 → 闭环 → 查点、读锚点原文 → 守卫 → 写 M09 → 下一张卡（假模型）。
// 只在给了真数据时跑：STUDIUM_M08=<产出目录> STUDIUM_LIBRARY=<书库根> npx vitest run tests/m08-real.test.ts
// （真数据含书的原文摘录，不进仓库；CI 里跳过。）
import { afterEach, describe, expect, it } from 'vitest';
import { createApp, type App } from '../src/core/app.ts';
import { M08 } from '../src/core/knowledge/m08.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../src/core/model/fake.ts';
import { tempDir } from './helpers/tmp.ts';

const M08_DIR = process.env.STUDIUM_M08;
const LIBRARY = process.env.STUDIUM_LIBRARY;

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const has = (ctx: FakeContext, name: string) => ctx.spec.tools.some((t) => t.name === name);

describe.skipIf(M08_DIR === undefined || LIBRARY === undefined)(
  '真书 M08 接进原型（假模型）',
  () => {
    it('书给的子句能开闭环、锚点原文读得到、走到下一张卡', async () => {
      const m08 = await M08.load(M08_DIR ?? '');
      // 选一条书给的子句，新点也是书给的、出发点都在 M08 里
      const clause = [...m08.clauses.values()].find(
        (c) =>
          c.source === '书给的' &&
          c.anchors.length > 0 &&
          m08.points.get(c.to)?.source === '书给的' &&
          c.from.every((f) => m08.points.has(f)),
      );
      expect(clause).toBeDefined();
      if (!clause) return;
      const anchor = clause.anchors[0];
      if (!anchor) return;
      const seen: string[] = [];
      const guardLine = { line: 0 };
      const option = {
        new_point: clause.to,
        clause: clause.id,
        start_points: clause.from.map((p) => ({ point: p, source: '假定' })),
        route_action: '继续主线',
        title: m08.name(clause.to),
        reason: '书给的路线',
      };
      const responder = (ctx: FakeContext): FakeStep | undefined => {
        if (has(ctx, 'submit_verdict')) {
          return {
            calls: [
              {
                name: 'submit_verdict',
                args: { closed: true, basis: '学习者说清了', evidence_lines: [guardLine.line] },
              },
            ],
          };
        }
        if (has(ctx, 'submit_choice_card')) {
          return {
            calls: [{ name: 'submit_choice_card', args: { options: [option], recommended: 0 } }],
            text: '好了',
          };
        }
        if (has(ctx, 'write_formation_record')) {
          return {
            calls: [
              {
                name: 'write_formation_record',
                args: {
                  new_point: clause.to,
                  clause: clause.id,
                  start_points: clause.from,
                  understanding: '说清了',
                  process: '沿书的路线',
                  unmet: '',
                  evidence_strength: '当场、独立',
                  evidence_lines: [guardLine.line],
                },
              },
            ],
          };
        }
        if (has(ctx, 'request_close')) {
          if (ctx.input.text.includes('我懂了')) {
            return { calls: [{ name: 'request_close', args: { reason: '说清了' } }] };
          }
          if (ctx.results.length > 0) {
            seen.push(...ctx.results);
            return { text: '我们从书上这一段开始。' };
          }
          return {
            calls: [
              { name: 'get_point', args: { point: clause.to } },
              {
                name: 'read_source',
                args: {
                  book: anchor.book,
                  file: anchor.file,
                  from_line: Math.max(1, (anchor.line ?? 1) - 2),
                  to_line: (anchor.line ?? 1) + 2,
                },
              },
            ],
          };
        }
        return undefined;
      };
      const app = await createApp({
        dataRoot: await tempDir(),
        model: new FakeModel({ responder }),
        token: 'm08-real-token-0123456789',
        port: 0,
        library: LIBRARY ?? '',
        m08Dir: M08_DIR ?? '',
      });
      apps.push(app);
      const { studium, hub } = app;
      const mainId = await studium.ensureMain();
      const card = await studium.requestCard('真书试跑');
      expect(card.options[0]?.ticket.clause).toBe(clause.id);

      const loopId = await studium.choose(card.cardId, 0);
      await hub.idle(loopId);
      const opening = (await hub.records(loopId)).find((r) => r.record.type === 'program_fact');
      expect(opening?.record.type === 'program_fact' && opening.record.text).toContain(clause.id);
      expect(seen.join('\n')).toContain(m08.name(clause.to));
      // 锚点引文在所标行附近读得到（去掉空白比较）
      const flat = (s: string) => s.replace(/\s+/g, '');
      const head = flat(anchor.quote).slice(0, 12);
      expect(flat(seen[1] ?? '')).toContain(head);

      const { line } = await hub.send(loopId, { role: 'learner', text: '我懂了，我来说一遍' });
      guardLine.line = line;
      await hub.idle(loopId);
      await studium.confirmClose(loopId, '确认');
      for (let i = 0; i < 50; i++) {
        const steps = (await hub.records(loopId)).filter(
          (r) => r.record.type === 'after_loop_step',
        );
        if (steps.length >= 2) break;
        await new Promise((r) => setTimeout(r, 20));
      }
      const steps = (await hub.records(loopId)).flatMap((r) =>
        r.record.type === 'after_loop_step' ? [r.record.step] : [],
      );
      expect(steps).toEqual(['m09_written', 'card_ready']);
      const cards = (await hub.records(mainId)).filter((r) => r.record.type === 'choice_card');
      expect(cards).toHaveLength(2);
    });
  },
);
