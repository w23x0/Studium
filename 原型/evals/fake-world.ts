// 评测用的假模型：被评的系统、模拟学生、判分都是假模型（不调真模型）。用来检验评测管道本身：
// 好的假老师应全过；坏的假老师（替学习者答、一轮多问、露内部词）应被对应判定抓到。
import { FakeModel, type FakeContext, type FakeStep } from '../src/core/model/fake.ts';
import type { EvalModels } from './run.ts';

const OPTION = {
  new_point: '位移：一段时间内位置的变化量，只看起点和终点',
  clause: '从“用坐标 x 表示位置”出发，两个时刻的坐标相减',
  start_points: [{ point: '直线上用坐标 x 表示位置', source: '假定' }],
  route_action: '继续主线',
  title: '位移',
  reason: '接着你已经会的位置往下学',
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

function has(ctx: FakeContext, tool: string): boolean {
  return ctx.spec.tools.some((t) => t.name === tool);
}

function learnerLine(text: string, says: string): number {
  const m = new RegExp(`L(\\d+) 学习者[^\\n]*${says}`).exec(text);
  return Number(m?.[1] ?? 0);
}

function system(bad: boolean) {
  return (ctx: FakeContext): FakeStep | undefined => {
    const evidence = learnerLine(ctx.input.text, '终点减起点');
    if (has(ctx, 'submit_choice_card')) {
      return {
        calls: [
          {
            name: 'submit_choice_card',
            args: { options: [OPTION], recommended: 0, route_decision: navRoute(ctx) },
          },
        ],
      };
    }
    if (has(ctx, 'submit_verdict')) {
      return {
        calls: [
          {
            name: 'submit_verdict',
            args:
              evidence > 0
                ? {
                    closed: true,
                    basis: `L${String(evidence)} 学习者自己说清了`,
                    evidence_lines: [evidence],
                    understanding: [
                      {
                        text: '位移只看起点终点，与路径无关',
                        lines: [evidence],
                        independence: '独立',
                        durability: '仅当场',
                      },
                    ],
                  }
                : { closed: false, basis: '学习者只说懂了，说不出所以然', evidence_lines: [] },
          },
        ],
      };
    }
    if (has(ctx, 'request_close')) {
      if (bad)
        return { text: '答案是：位移就是终点减起点，这个单子到此。你明白了吗？还有问题吗？' };
      return ctx.input.role === 'program'
        ? { text: '我们从你会的位置说起。你觉得位移是什么？' }
        : { text: '说说看：走一圈回到原点，位移是多少？' };
    }
    return { text: '好。' };
  };
}

function student(ctx: FakeContext): FakeStep {
  const persona = ctx.spec.systemPrompt;
  if (persona.includes('很快就说')) return { text: '我懂了' };
  if (persona.includes('终点减起点')) return { text: '位移就是终点减起点' };
  return { text: '不知道，是不是走过的路？' };
}

function judge(ctx: FakeContext): FakeStep {
  const text = ctx.input.text;
  const teaching = [...text.matchAll(/^L(\d+) 教学[^\n]*$/gm)];
  let pass = true;
  let lines: number[] = [];
  if (text.includes('替学习者')) {
    const hit = teaching.filter((m) => m[0].includes('答案是'));
    pass = hit.length === 0;
    lines = hit.map((m) => Number(m[1]));
  } else if (text.includes('停在第一个')) {
    const hit = teaching.filter((m) => (m[0].match(/？/g) ?? []).length > 1);
    pass = hit.length === 0;
    lines = hit.map((m) => Number(m[1]));
  }
  return {
    calls: [
      {
        name: 'submit_judgement',
        args: { pass, reason: pass ? '没发现' : '发现了', lines },
      },
    ],
  };
}

export function fakeModels(opts: { badTutor?: boolean } = {}): EvalModels {
  return {
    system: () => new FakeModel({ responder: system(opts.badTutor === true) }),
    student: new FakeModel({ responder: student }),
    judge: new FakeModel({ responder: judge }),
  };
}
