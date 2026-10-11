// 验收：跨领域闭环（M05:18）。M05 出卡时可出两种跨领域选项——补习型（去别的学科补一个还没学过的前置）、
// 对比链接型（把两个领域里相似的结构连起来，另一边学习者已经会了）。领域由程序按书的学科目录算，不是模型说了算；
// 补习型 / 对比链接型各自须符合 M09 里学没学过，否则退回给模型改；单子标领域与类型；对比链接型的闭环开场带两边的点与原文出处。
// 只经 HTTP / 工具验证（假模型）。
import { afterEach, describe, expect, it } from 'vitest';
import type { CardResponse } from '../../src/shared/protocol.ts';
import type { App } from '../../src/core/app.ts';
import { createApp } from '../../src/core/app.ts';
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import { getJson, post, records, TOKEN, waitFor } from '../helpers/http.ts';
import { roleOf } from '../helpers/roles.ts';
import { bootCross } from '../helpers/cross.ts';
import { toolOf } from '../helpers/scope.ts';
import { tempDir } from '../helpers/tmp.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

const PLAIN = {
  new_point: 'p-vel-b',
  clause: 'c-vel-b',
  start_points: [{ point: 'p-disp', source: '假定' }],
  route_action: '继续主线',
  title: '速度',
  reason: '接着位移往下学',
  sources: ['p-vel-b'],
};

/** 补习型：原问题在物理（力的叠加），缺线性代数里的线性组合。 */
const TUTOR = {
  new_point: 'p-comb',
  clause: 'c-comb',
  start_points: [{ point: 'p-vec', source: '假定' }],
  route_action: '补前置',
  title: '先补一点线性组合',
  reason: '想弄懂合力为什么能叠加，要先会线性组合',
  sources: ['p-comb'],
  cross_domain: { kind: '补习型', other_point: 'p-sup', problem: '想弄懂合力为什么能叠加' },
};

/** 对比链接型：线性组合已经会了，把它和力的叠加对着看。 */
const COMPARE = {
  new_point: 'p-sup',
  clause: 'c-sup',
  start_points: [{ point: 'p-force', source: '假定' }],
  route_action: '继续主线',
  title: '把线性组合和力的叠加对着看',
  reason: '你已经会线性组合，对照着看叠加',
  sources: ['p-sup'],
  cross_domain: { kind: '对比链接型', other_point: 'p-comb', problem: '想弄明白叠加的共同结构' },
};

function cardArgs(...options: object[]) {
  return { options: options.length >= 2 ? options : [...options, PLAIN], recommended: 0 };
}

function cardResponder(...options: object[]) {
  return (ctx: FakeContext): FakeStep | undefined =>
    roleOf(ctx) === 'm05'
      ? { calls: [{ name: 'submit_choice_card', args: cardArgs(...options) }] }
      : undefined;
}

async function boot(opts: {
  known?: string[];
  responder?: (ctx: FakeContext) => FakeStep | undefined;
}) {
  const fake = new FakeModel(opts.responder !== undefined ? { responder: opts.responder } : {});
  const r = await bootCross({ model: fake, ...(opts.known ? { known: opts.known } : {}) });
  apps.push(r.app);
  return { ...r, fake };
}

async function newCard(app: App, mainId: string): Promise<string> {
  await post(app, '/cards/request', { projectId: mainId });
  return waitFor('出了卡', async () => {
    const r = (await records(app, mainId)).find((x) => x.record.type === 'choice_card');
    return r?.record.type === 'choice_card' ? r.record.cardId : undefined;
  });
}

describe('验收：跨领域闭环', () => {
  it('同一个领域内的不算跨领域；认不出领域（点没有原文锚点）的退回', async () => {
    const { app, mainId } = await boot({});
    const submit = toolOf(app, 'm05', mainId, 'submit_choice_card');
    const sameDomain = {
      ...PLAIN,
      cross_domain: { kind: '对比链接型', other_point: 'p-force', problem: '随便' },
    };
    const r1 = await submit.run(cardArgs(sameDomain));
    expect(r1.isError).toBe(true);
    expect(r1.text).toContain('不是跨领域');
    expect(r1.text).toContain('大学物理');

    const orphan = {
      new_point: 'p-orphan',
      clause: 'c-orphan',
      start_points: [{ point: 'p-force', source: '假定' }],
      route_action: '继续主线',
      title: '孤点',
      reason: '试试',
      sources: ['p-orphan'],
      cross_domain: { kind: '补习型', other_point: 'p-sup', problem: '想弄懂叠加' },
    };
    const r2 = await submit.run(cardArgs(orphan));
    expect(r2.isError).toBe(true);
    expect(r2.text).toContain('认不出领域');

    const r3 = await submit.run(
      cardArgs({ ...TUTOR, cross_domain: { ...TUTOR.cross_domain, other_point: 'p-不存在' } }),
    );
    expect(r3.isError).toBe(true);
    expect(r3.text).toContain('查不到');

    const r4 = await submit.run(
      cardArgs({ ...TUTOR, cross_domain: { ...TUTOR.cross_domain, problem: '  ' } }),
    );
    expect(r4.isError).toBe(true);
    expect(r4.text).toContain('原问题');
  });

  it('按 M09 分两种：没学过却出了对比链接型、已经学过却出了补习型，都退回', async () => {
    // 什么都没学过：对比链接型的另一边（线性组合）学习者没有合上的记录
    const a = await boot({});
    const r1 = await toolOf(a.app, 'm05', a.mainId, 'submit_choice_card').run(cardArgs(COMPARE));
    expect(r1.isError).toBe(true);
    expect(r1.text).toContain('还没有合上的记录');
    expect(r1.text).toContain('补习型');
    // 补习型在没学过时可以
    const ok1 = await toolOf(a.app, 'm05', a.mainId, 'submit_choice_card').run(cardArgs(TUTOR));
    expect(ok1.isError).not.toBe(true);

    // 线性组合已经合上过：补习型不成立
    const b = await boot({ known: ['p-comb'] });
    const r2 = await toolOf(b.app, 'm05', b.mainId, 'submit_choice_card').run(cardArgs(TUTOR));
    expect(r2.isError).toBe(true);
    expect(r2.text).toContain('已经学过');
    expect(r2.text).toContain('对比链接型');
    const ok2 = await toolOf(b.app, 'm05', b.mainId, 'submit_choice_card').run(cardArgs(COMPARE));
    expect(ok2.isError).not.toBe(true);
  });

  it('补习型：单子标领域与类型；选了之后闭环开场写明类型、原问题、两边的领域', async () => {
    const { app, mainId, fake } = await boot({ responder: cardResponder(TUTOR) });
    const cardId = await newCard(app, mainId);
    const { card } = await getJson<CardResponse>(app, `/cards/${cardId}`);
    expect(card.options[0]?.ticket.crossDomain).toMatchObject({
      kind: '补习型',
      domain: '线性代数',
      otherDomain: '大学物理',
      otherPoint: { id: 'p-sup' },
      problem: '想弄懂合力为什么能叠加',
    });
    // 同领域的普通选项没有这个标
    expect(card.options[1]?.ticket.crossDomain).toBeUndefined();

    // M05 开场说了资料涉及哪些领域
    const m05Opening = fake.inputs.find((i) => i.text.includes('触发原因'))?.text ?? '';
    expect(m05Opening).toContain('资料涉及的领域：大学物理、线性代数');
    expect(m05Opening).toContain('cross_candidates');

    const chosen = (await (await post(app, `/cards/${cardId}/choose`, { option: 0 })).json()) as {
      loopSessionId: string;
    };
    const loopId = chosen.loopSessionId;
    await app.studium.settled();
    const opening = fake.inputs.find((i) => i.text.includes('跨领域（补习型）'))?.text ?? '';
    expect(opening).toContain('新点在「线性代数」领域，另一边在「大学物理」领域');
    expect(opening).toContain('原问题（动机）：想弄懂合力为什么能叠加');
    expect(opening).toContain('只学到原问题需要的程度');
    // 单子（正本里）带着跨领域的字段，守卫等读单子的会话也看得到
    const opened = (await records(app, loopId))[0]?.record;
    expect(opened?.type === 'session_opened' && opened.ticket?.crossDomain?.kind).toBe('补习型');
    expect(opening).toContain('跨领域（补习型）：新点在');
  });

  it('对比链接型：闭环开场带两边的点和原文出处', async () => {
    const { app, mainId, fake } = await boot({
      known: ['p-comb'],
      responder: cardResponder(COMPARE),
    });
    const cardId = await newCard(app, mainId);
    const { card } = await getJson<CardResponse>(app, `/cards/${cardId}`);
    expect(card.options[0]?.ticket.crossDomain).toMatchObject({
      kind: '对比链接型',
      domain: '大学物理',
      otherDomain: '线性代数',
    });
    await post(app, `/cards/${cardId}/choose`, { option: 0 });
    await app.studium.settled();
    const opening = fake.inputs.find((i) => i.text.includes('跨领域（对比链接型）'))?.text ?? '';
    expect(opening).toContain('对照两边的结构');
    expect(opening).toContain('p-sup「力的叠加」');
    expect(opening).toContain('p-comb「线性组合」');
    expect(opening).toContain('A linear combination of vectors uses scalars.');
    // 两边的原文出处标记（行号对上了引文所在的行），能直接引用
    expect(opening).toMatch(/【教材\|线性代数小样 ?\|ch01\/sec-1\.1\.md\|L3】/);
    expect(opening).toMatch(/【教材\|力学入门样例\|ch02\/sec-2\.2\.md\|L\d+】/);
    // 学习者已会的另一边，M09 记录也在开场里
    expect(opening).toContain('会了');
  });

  it('cross_candidates：只列另一个领域里的点，标出学没学过、该出哪一种', async () => {
    const a = await boot({});
    const tool = toolOf(a.app, 'm05', a.mainId, 'cross_candidates');
    const r = await tool.run({ point: 'p-sup' });
    expect(r.isError).not.toBe(true);
    expect(r.text).toContain('p-comb「线性组合」');
    expect(r.text).toContain('领域：线性代数');
    expect(r.text).toContain('没合上过');
    expect(r.text).toContain('补习型');
    // 同一个领域里的点不列
    expect(r.text).not.toContain('p-force');
    // 按关键词搜另一个领域
    const kw = await tool.run({ point: 'p-disp', keyword: '线性' });
    expect(kw.text).toContain('p-comb');
    expect(kw.text).not.toContain('p-vel-b');
    expect((await tool.run({ point: 'p-orphan' })).isError).toBe(true);
    expect((await tool.run({ point: 'p-不存在' })).isError).toBe(true);

    const b = await boot({ known: ['p-comb'] });
    const known = await toolOf(b.app, 'm05', b.mainId, 'cross_candidates').run({ point: 'p-sup' });
    expect(known.text).toContain('合上过');
    expect(known.text).toContain('对比链接型');
  });

  it('资料只在一个领域里时，M05 开场不提跨领域（不鼓励硬凑）', async () => {
    const fake = new FakeModel();
    const app = await createApp({ dataRoot: await tempDir(), model: fake, token: TOKEN, port: 0 });
    apps.push(app);
    const mainId = await app.studium.ensureMain();
    await post(app, '/cards/request', { projectId: mainId });
    await app.studium.settled();
    const opening = fake.inputs.find((i) => i.text.includes('触发原因'))?.text ?? '';
    expect(opening).toContain('M08 概要');
    expect(opening).not.toContain('资料涉及的领域');
  });
});
