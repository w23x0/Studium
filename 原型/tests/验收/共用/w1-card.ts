// W1 起交选择卡必须带路线决定（工单 README §2.2、§2.3）。旧验收测试与 tests/helpers 里的交卡调用都用它补上：
// 依据指回导航会话自己的第 1 行（session_opened），一定能定位。只为让旧流程照常跑，不测路线决定本身。
export function navRoute(ctx: { spec: { session?: { id: string } } }): {
  decision: string;
  reason: string;
  basis: string[];
} {
  return {
    decision: '维持主线',
    reason: '按推荐往下学',
    basis: [`${ctx.spec.session?.id ?? ''}:1`],
  };
}
