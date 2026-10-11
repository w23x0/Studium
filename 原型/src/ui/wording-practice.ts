// 练习（批 9）在界面上的叫法。wording.ts 的 W.practice 指向这里（wording.test.ts 一起查内部词）。
// 右边注释是内部叫法，只给写代码的人看。
import type { PracticeStatus } from '../shared/protocol.ts';
import type { PracticeDifficulty, PracticeFunction } from '../shared/records-practice.ts';

export const WP = {
  // ── 对话里的练习卡 ──
  card: '练习', // practice_assigned
  cardText: (focus: string) => `练习：${focus}`,
  generated: '老师出的', // source.kind = generated
  fromBook: '书里的题',
  stageCheck: '阶段验收', // stageCheck
  stageCheckHint: '和平时的练习分开，看你自己能做到哪；默认不给提示',
  stageCheckBanner:
    '这次是阶段验收，默认不给提示。做完练习不等于学完，学没学会照常看你讲得怎么样。',
  deliverable: '要交什么',
  doneWhen: '怎样算做完',
  hintsAllowed: '卡住了可以要提示',
  hintsNotAllowed: '这道题不给提示，先自己试试',
  kind: (fn: PracticeFunction, difficulty: PracticeDifficulty) =>
    `${FUNCTION[fn] ?? fn} · 难度${difficulty}`,
  status: {
    assigned: '等你作答',
    submitted: '交了，等老师看',
    feedback: '老师看过了，可以再交',
    completed: '做完了',
    abandoned: '先不做了',
  } satisfies Record<PracticeStatus, string>,
  followsLine: '接着上一道往下练',
  hintsCount: (n: number) => (n === 0 ? '还没用提示' : `提示用了 ${String(n)} 次`),

  // ── 卡上的操作 ──
  answer: '交作答',
  answerWrite: '写下作答',
  answerPick: '用刚才说的',
  answerPlaceholder: '把你的答案和关键步骤写在这里…',
  answerPickHint: '勾选你刚才说的话，作为这道题的作答',
  answerPickNone: '这道题布置之后你还没说过话。',
  answerSend: '交上去',
  answerCancel: '取消',
  askHint: '要个提示',
  askHintNo: '这道题设定为不给提示，先自己试试；卡住了可以在对话里说。',
  askedHint: '已经告诉老师你要提示了',
  abandon: '先不做了',
  abandonHint: '可以写一句为什么（不写也行）',
  abandonPlaceholder: '比如：题意没看懂、今天时间不够…',
  abandonGo: '放下这道题',
  sending: '正在交…',
  loopOver: '这段学习已经结束，练习不能再交了。',

  // ── 卡下的经过（按时间）──
  answeredByMe: '你交的作答',
  answeredInChat: '老师把你说的这几句当作作答',
  hintByLearner: '你要了提示',
  hintByTeacher: '老师给了提示',
  feedback: '老师的反馈',
  mistakes: '容易错在', // errors
  doneCompleted: '这道练习做完了',
  doneAbandoned: '这道练习先不做了',
  doneByLearner: '（你放下的）',
  doneNote: '说明',
  nothingYet: '还没有作答。',
  // 对话里的几行
  answerTag: '交给练习的作答', // user_message.practice
  markedTag: '老师当作练习的作答', // practice_submitted 认的行
  doneLine: (outcome: 'completed' | 'abandoned', focus: string) =>
    outcome === 'completed' ? `练习做完了：${focus}` : `练习先不做了：${focus}`,
  summaryLine: '写好了一份“这类题怎么想”',
  summaryOpen: '看全文',

  // ── 帮我归纳 ──
  summarize: '帮我归纳一下',
  summarizing: '正在请老师归纳…',
  summarizeAsked: '已经请老师归纳，写好会出现在“这类题怎么想”里',
  summarizeNeed: (n: number) => `做完 2 道练习才能归纳，现在做完了 ${String(n)} 道`,

  // ── 学习依据里的练习列表 ──
  listTitle: '这次学习里的练习',
  listHint: '布置给你的练习、交的作答和老师的反馈；做完练习不等于学会，学没学会看上面的判断。',
  listNone: '这次学习里还没有练习。',
  seeAnswer: '看作答',
  seeFeedback: '看反馈',
  seeCard: '看练习卡',

  // ── 常犯的错 · 这类题怎么想 ──
  reviewTitle: '练习里看到的', // 面板首页、项目概览的入口
  patterns: '常犯的错', // error patterns
  patternsHint: '同一类错在两段以上的学习里出现过，就列在这里',
  patternsNone: '还没有在好几段学习里反复出现的错。',
  othersTitle: '只出现过一次的',
  patternLoops: (n: number) => `出现在 ${String(n)} 段学习里`,
  inThatPart: '那段学习',
  summaries: '这类题怎么想', // practice_summary
  summariesHint: '做完几道练习后写的归纳：关键条件、思路、方法、容易混的地方',
  summariesNone: '还没有归纳。在学习里做完 2 道练习后可以点“帮我归纳一下”。',
  summaryBy: { learner: '你请老师写的', teacher: '老师主动写的' } as const,
  summaryFrom: '据这些练习',
  summaryWords: '用到你的原话',
  collapse: '收起',

  // ── 书里的习题 ──
  exercises: '这章的习题',
  exercisesBook: '书里的习题',
  exercisesNone: '这里没有找到习题。',
  exercisesMore: '后面还有，点开看全部',
  exercisesOpen: '看原文',
  exercisesLines: (n: number) => `共 ${String(n)} 行`,
} as const;

const FUNCTION: Record<string, string> = {
  巩固: '巩固',
  变式: '换个样子练',
  迁移: '用到新情境',
  诊断: '看看卡在哪',
};
