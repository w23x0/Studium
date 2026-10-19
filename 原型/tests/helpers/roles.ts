// 假模型按会话种类应答时共用：从工具名认出是哪种会话；从带行号的原文里找学习者的某一行。
import type { FakeContext } from '../../src/core/model/fake.ts';

// 'm09' 已经没有对应的会话（分析层已取消）；留着这个取值只为老验收测试里的 case 还能通过类型检查。
export type Role =
  | 'main'
  | 'talk'
  | 'loop'
  | 'guard'
  | 'nav'
  | 'retrieve'
  | 'state'
  | 'pedagogy'
  | 'm09'
  | 'unknown';

const MARKERS: [string, Role][] = [
  ['submit_verdict', 'guard'],
  ['submit_choice_card', 'nav'],
  ['write_state_record', 'state'],
  ['write_strategy_record', 'pedagogy'],
  ['request_close', 'loop'],
  ['submit_findings', 'retrieve'],
  ['settle_goal', 'talk'],
  ['open_goal_talk', 'main'],
];

export function roleOf(ctx: FakeContext): Role {
  for (const [tool, role] of MARKERS) {
    if (ctx.spec.tools.some((t) => t.name === tool)) return role;
  }
  return 'unknown';
}

/** 带行号的原文（“L12 学习者（时间）：……”）里学习者说了某句话的行号；找不到给 0。 */
export function learnerLine(text: string, says: string): number {
  const m = new RegExp(`L(\\d+) 学习者[^\\n]*${says}`).exec(text);
  return Number(m?.[1] ?? 0);
}

export const DISPLACEMENT_OPTION = {
  new_point: 'p-displacement',
  clause: 'c-disp-from-pos',
  start_points: [{ point: 'p-position', source: '假定' }],
  route_action: '继续主线',
  title: '位移',
  reason: '接着你已经会的位置往下学',
  sources: ['力学入门样例/ch01/sec-1.1.md:5'],
};

export { navRoute } from '../验收/共用/w1-card.ts';
