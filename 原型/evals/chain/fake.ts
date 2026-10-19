// 链路评测的假模型：被测系统、模拟学生、判分都是假模型（不调真模型），用来检验驱动、判定、报告这条管道本身。
// 好的假系统应让各程序判定都过；leak 为真时假系统在学习对话里露内部词，应被“学习者看不到内部词”抓到。
import { FakeModel, type FakeContext, type FakeStep } from '../../src/core/model/fake.ts';
import type { ChainModels } from './driver.ts';

const DISP = {
  new_point: '位移：一段时间内位置的变化量，只看起点和终点',
  clause: '从“用坐标 x 表示位置”出发，两个时刻的坐标相减',
  start_points: [{ point: '直线上用坐标 x 表示位置', source: '假定' }],
  route_action: '继续主线',
  title: '位移：从位置到“变了多少”',
  reason: '接着你已经会的位置往下学',
  sources: ['导航现场说出'],
};
const AVG = {
  new_point: '平均速度：位移除以所用的时间',
  clause: '用刚学过的位移，除以走过这段用的时间',
  start_points: [{ point: '位移：一段时间内位置的变化量', source: '学过的记录' }],
  route_action: '继续主线',
  title: '平均速度',
  reason: '用刚学会的位移算一段时间的快慢',
  sources: ['导航现场说出'],
};

/** 交卡必须带的路线决定（依据指回导航会话自己的第 1 行）。 */
function navRoute(ctx: FakeContext) {
  return {
    decision: '维持主线',
    reason: '按推荐往下学',
    basis: [`${ctx.spec.session?.id ?? ''}:1`],
  };
}

function learnerLine(text: string, says: string): number {
  const m = new RegExp(`L(\\d+) 学习者[^\\n]*${says}`).exec(text);
  return Number(m?.[1] ?? 0);
}

function system(leak: boolean) {
  return (ctx: FakeContext): FakeStep | undefined => {
    const has = (n: string) => ctx.spec.tools.some((t) => t.name === n);
    const text = ctx.input.text;
    if (has('open_goal_talk')) {
      if (ctx.input.role === 'learner' && text.includes('想学')) {
        return { calls: [{ name: 'open_goal_talk', args: {} }], text: '好，我们单独聊聊。' };
      }
      return { text: '好，挑一个开始吧。' };
    }
    if (has('settle_goal')) {
      if (ctx.input.role === 'program') return { text: '你想学到什么程度？' };
      return {
        calls: [
          {
            name: 'settle_goal',
            args: {
              title: '力学基础',
              abilities: [{ ability: '学力学基础，能自己推导常见问题', reason: '想自己推导' }],
            },
          },
        ],
        text: '就这么定了。',
      };
    }
    if (has('submit_choice_card')) {
      // 开场里学过的记录已经有一条合上的学习时，下一张卡改推平均速度
      const option = /- \S+「[^」]*」合上/.test(text) ? AVG : DISP;
      return {
        calls: [
          {
            name: 'submit_choice_card',
            args: { options: [option], recommended: 0, route_decision: navRoute(ctx) },
          },
        ],
      };
    }
    if (has('submit_verdict')) {
      const line = learnerLine(text, '终点减起点');
      return {
        calls: [
          {
            name: 'submit_verdict',
            args:
              line > 0
                ? {
                    closed: true,
                    basis: `L${String(line)} 学习者自己说清了`,
                    evidence_lines: [line],
                    understanding: [
                      {
                        text: '位移只看起点终点，与路径无关',
                        lines: [line],
                        independence: '独立',
                        durability: '仅当场',
                      },
                    ],
                  }
                : { closed: false, basis: '还没说清', evidence_lines: [] },
          },
        ],
      };
    }
    if (has('write_strategy_record')) {
      const line = Number(/L(\d+) 学习者/.exec(text)?.[1] ?? 0);
      return {
        calls: [
          {
            name: 'write_strategy_record',
            args: {
              conditions: '无',
              strategies: '提问',
              followed_by: '说清了',
              evidence_lines: [line],
            },
          },
        ],
      };
    }
    if (has('write_current_state')) {
      return {
        calls: [
          {
            name: 'write_current_state',
            args: { text: '暂无', stage: '证据不足', basis_span: '本次' },
          },
        ],
      };
    }
    if (has('request_close')) {
      const say = leak
        ? '这个闭环我们从出发点说起。你觉得位移是什么？'
        : ctx.input.role === 'program'
          ? '我们从你会的位置说起。你觉得位移是什么？'
          : '说说看：走一圈回到原点，位移是多少？';
      return {
        sandbox: [{ op: 'append', path: '诊断.md', content: '观察到的\n' }],
        text: say,
      };
    }
    return { text: '好。' };
  };
}

/** 假学生：按屏幕上有什么来动；学习对话里第 3 句说出“终点减起点”，然后点“我觉得懂了”。 */
function student() {
  let loopTurn = 0;
  return (ctx: FakeContext): FakeStep => {
    const t = ctx.input.text;
    if (t.includes('选项卡：')) return { calls: [{ name: 'pick_option', args: { index: 0 } }] };
    if (t.includes('「学完了」')) {
      return { calls: [{ name: 'press_button', args: { label: '学完了' } }] };
    }
    if (t.includes('【你现在在：学习对话')) {
      loopTurn++;
      if (loopTurn <= 2) return { text: '不知道，是不是走过的路？' };
      if (loopTurn === 3) return { text: '位移就是终点减起点' };
      return { calls: [{ name: 'press_button', args: { label: '我觉得懂了' } }] };
    }
    if (t.includes('回到了项目主页')) {
      return { calls: [{ name: 'press_button', args: { label: '下一步学什么' } }] };
    }
    if (t.includes('【你现在在：“谈谈你想学什么”')) return { text: '想学到能自己推导常见问题' };
    return { text: '我想学力学' };
  };
}

function judge(ctx: FakeContext): FakeStep {
  if (ctx.spec.tools.some((x) => x.name === 'submit_observation')) {
    return { calls: [{ name: 'submit_observation', args: { summary: '看到了', lines: [] } }] };
  }
  return {
    calls: [{ name: 'submit_judgement', args: { pass: true, reason: '没发现问题', lines: [] } }],
  };
}

export function fakeChainModels(opts: { leak?: boolean } = {}): ChainModels {
  return {
    system: () => new FakeModel({ responder: system(opts.leak === true), delayMs: 5 }),
    student: () => new FakeModel({ responder: student() }),
    judge: () => new FakeModel({ responder: judge }),
  };
}
