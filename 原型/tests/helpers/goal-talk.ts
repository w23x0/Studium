// 畅谈相关验收测试共用的假模型应答：主对话判为新方向就开畅谈对话；畅谈对话谈清后交回方向。
import type { FakeContext, FakeStep } from '../../src/core/model/fake.ts';

export const GOAL = '学经典力学，学到能自己推导常见问题';
export const PROJECT_NAME = '经典力学';

export function goalTalkResponder(ctx: FakeContext): FakeStep | undefined {
  const has = (name: string) => ctx.spec.tools.some((t) => t.name === name);
  if (has('open_goal_talk')) {
    if (ctx.input.role === 'learner' && ctx.input.text.includes('想学')) {
      return { calls: [{ name: 'open_goal_talk', args: {} }], text: '我们单独谈谈。' };
    }
    return { text: '好。' };
  }
  if (has('settle_goal')) {
    if (ctx.input.role === 'program') return { text: '你想学到什么程度？' };
    if (ctx.input.text.includes('能自己推导')) {
      return {
        calls: [{ name: 'settle_goal', args: { goal: GOAL, project_name: PROJECT_NAME } }],
        text: '那就这么定了。',
      };
    }
    return { text: '再说说？' };
  }
  return undefined;
}
