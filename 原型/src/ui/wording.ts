// 界面上给学习者看的叫法，统一放这里（以后改叫法只改这一处）。
// 内部词（选择卡、守卫、出发点、子句、新点、单子、M0x、M1x 等）不出现在这里的任何一句里（没有自动检查，改时自己留意）。
// 对照：右边注释是内部叫法，只给写代码的人看。
import type { LoopStatus, SourceReportKind } from '../shared/protocol.ts';
import { WS } from './wording-sidebar.ts';

export const W = {
  /** 左栏、全部项目页、账号菜单与设置的叫法在 wording-sidebar.ts。 */
  sidebar: WS,
  // ── 项目 ──
  projectHome: '项目页', // 项目页（Overview）
  projectChat: '项目对话', // 主对话
  backToMain: '回项目对话',
  /** 讨论串：项目对话右边一栏，列这个项目开出去的任务对话。 */
  threads: {
    title: '讨论串',
    open: '打开讨论串',
    close: '收起讨论串',
    waiting: '等你',
    running: '进行中',
    paused: '停着',
    ended: '已结束',
    empty: '还没开过。谈方向、学习都会在这里列一条。',
    more: '更多',
    delete: '删除',
    deleteTitle: '删掉这个讨论串？',
    deleteHint: (title: string) =>
      `删掉「${title}」后它不再显示，之后的对话也读不到它；它找来的资料、谈定的方向留着。删了不能撤销。`,
    deleteGo: '删掉',
    cancel: '算了',
    tagGuarded: '等你点“学完了”',
    tagCandidates: '等你勾',
    tagClosed: '学完',
  },

  // ── 依据面板 ──
  panelClose: '关上',
  panelLoopTitle: '这次学习',
  panelSourceTitle: '出处',
  whereAmI: '现在在哪',
  // ── 对话页 ──
  mainWelcome: '想学什么？说一句就行。',
  loopTopic: '这次学',
  confirmBar: '收尾那一句写好了。还想补一句就接着说；不补就点“学完了”。',
  confirmMore: '再补一句',
  confirmGo: '学完了',
  loopDone: '这部分学完了。',
  unclosedDone: '搁着了；以后的学习对话能读到这次的原文。',
  talkDone: '方向记好了。还想改就接着说，会重新打开。',
  talkIntro: '在这里说清想学到什么程度；谈定后方向会记进项目。',
  talkFrom: '从你在项目对话里说的这句开始：',
  // 旧数据：导航会话只读看
  navIntro: '导航自己跑完，这里只看它怎么想的。',
  navResult: '下一次学',
  navStart: '开始学',
  navWhy: '为什么：',
  panelBack: '返回',
  status: {
    in_progress: '在学',
    closed: '学完了',
    unclosed: '搁着',
  } satisfies Record<LoopStatus, string>,
  // 旧数据：单子
  plan: '这次学什么', // 开场单子
  newPoint: '要学的', // 新点
  clause: '学完应该能', // 预期理解
  startPoints: '从这些已有的出发', // 出发点
  routeAction: '这次怎么走', // 路线动作
  sourceCheck: '和资料对照',
  modelAdded: '资料里没有，按通常讲法',
  startSource: {
    学过的记录: '你之前学过的',
    自述: '你自己说会的',
    假定: '先假定你会的',
  } as const,
  judgements: '这次学到了什么', // 收尾那一句（10-31 起学习对话写）；旧数据是守卫的收尾记录
  noJudgements: '还没写过收尾那一句。',
  judgedYes: '整理好了',
  judgedNo: '没整理成',
  whyJudged: '看整理的内容',
  closingWhy: '为什么觉得可以收了',
  closingAsked: '你先说了“我觉得懂了”',
  closingByModel: '学习对话写的收尾那一句',
  oldRecord: '旧记录',
  seeClosingSaid: '在记录里看',
  reason: '总的来说',
  problem: '没整理成的原因',
  askedBy: (by: 'model' | 'learner') =>
    by === 'learner' ? '你说“我觉得懂了”' : '老师提出可以看看',
  jumpTo: '在对话里看',
  openThere: '打开看看', // 打开书里原文或那次学习
  // 引用的是记录里的行号，和对话里看到的第几句对不上，所以不写数字，点了跳过去看
  lineRef: '（那句原话）',
  lineRangeRef: '（那几句原话）',
  ended: '结束时说明',
  notAvailable: '（这一行不是对话里的话）',

  // ── 异议 ──
  objectJudgement: '我觉得记得不对',
  objectPlaceholder: '说说哪里不对、你是怎么想的…',
  objectSubmit: '提交',
  objectCancel: '算了',
  objectSent: '收到了，原话已记下。',
  objectSentInLoop: '收到了，你的话已经放进这段学习对话里，可以接着学，再说“我觉得懂了”。',
  objections: '你提过的不同看法',
  objectionTag: '对上面那次整理的不同看法',

  page: (book: string, page?: number) => (page !== undefined ? `${book} · 第 ${page} 页` : book),

  // ── 记录 ──
  learned: '我学会的',
  // ── 出处种类 ──
  sourceKind: {
    loop_line: '之前对话里的话',
    book_line: '书里的一处',
    unknown: '查不到的出处',
  } as const,
  sourceNotResolved: '查不到原文',

  // ── 模型与外发 ──
  modelLabel: '模型',
  modelFallback: '兜底',
  disclosure: '内容送往哪里', // 外发披露
  disclosureService: '送往的服务',
  disclosureRoute: '经什么通道',
  disclosureAdapter: '程序里接模型的方式',
  disclosureSends: '会送出去的内容',
  disclosureSessions: '各类对话用的模型',
  defaultModel: '服务默认',
  defaultEffort: '默认',
  effort: '思考强度',

  // ── 书里的原文与原件（资料） ──
  materialsNav: '资料', // 资料浏览
  materialsEmpty: '还没有资料。',
  materialList: '资料',
  bookSections: (n: number) => `${String(n)} 节`,
  hasOriginal: '有原件',
  toc: '目录',
  noText: '（这一条没有单独的正文）',
  search: '在书里搜',
  searchPlaceholder: '搜书里的字句，词之间用空格隔开…',
  searchInBook: '只搜这本书',
  searchGo: '搜',
  searchFound: (n: number) => `找到 ${String(n)} 处`,
  searchShown: (n: number) => `，先列出前 ${String(n)} 处`,
  searchNone: '没搜到。换个说法，或少写几个词试试。',
  bookText: '原文', // 小节转录文字
  original: '原件页面', // PDF 原件页
  prevSection: '上一节',
  nextSection: '下一节',
  prevPage: '上一页',
  nextPage: '下一页',
  pageOf: (n: number) => `第 ${String(n)} 页`,
  lineSpan: (from: number, to: number) =>
    to > from ? `第 ${String(from)}–${String(to)} 行` : `第 ${String(from)} 行`,
  showOnOriginal: '看原件上的位置',
  thisSpot: '书上的这一处',
  wholePage: '整页',
  noOriginal: '这本书没有原件页面，只能看转录的文字。',
  notLocated: '这一段在原件上没比对出位置，先显示本节的第一页。',
  imageFailed: '原件页面没显示出来。',
  readText: '看转录的原文',
  quoteOnPage: '书里的原句',

  // ── 回复里的书里出处 ──
  citation: '书里的出处',
  citationPending: '正在核对出处…',
  citationBad: '这个出处对不上',
  citationBadHint: '回复里写的出处在书里找不到对应的原文，下面是它写的位置和对不上的原因。',
  citationWritten: '回复里写的位置',
  citationCheckFailed: '没能核对这个出处：',

  // ── 资料报错 ──
  reportIssue: '这里有错',
  reportKinds: {
    转录错: '文字转错了',
    公式错: '公式不对',
    定位错: '位置对不上',
    其他: '其他',
  } satisfies Record<SourceReportKind, string>,
  reportPlaceholder: '说说哪里不对，正确的应该是什么…',
  reportSent: '记下了。资料原件不会被改，这条会留着等以后修正。',
  reported: '你报过的错',

  // ── 输入框：图片 / 拍照、语音、公式（批 4） ──
  disclosureInputs: '输入方式送往哪里', // 外发披露里的图片、语音
  addImage: '添加图片',
  takePhoto: '拍照',
  dropHere: '松开，把图片加进来',
  notImage: '只能加图片（PNG、JPEG、GIF、WebP）。',
  removeImage: '移除这张图',
  viewImage: '看大图',
  imageAlt: (n: number) => `图片 ${String(n)}`,
  waitImages: '图片还在处理，稍等一下再发',
  voice: '语音输入',
  voiceStop: '停止语音输入',
  voiceListening: '正在听…说完点一下麦克风停止',
  voiceNotice:
    '语音由浏览器送到它自己的语音识别服务（如 Chrome 送往 Google）转成文字，不经过 Studium，也不保存录音；识别出的文字进输入框，你改过再发。',
  voiceUnsupported: '这个浏览器不支持语音识别（可以换 Chrome、Edge 或 Safari）。',
  voiceDenied: '没有麦克风权限：在浏览器里允许使用麦克风后再试。',
  voiceFailed: (why: string) => `语音识别出错：${why}`,
  formula: '插入公式',
  formulaInline: '放在句子里',
  formulaDisplay: '单独一行',
  formulaSource: 'LaTeX 写法（也可以直接改这里）',
  formulaInsert: '插入',
  formulaCancel: '取消',
  formulaLoading: '公式编辑器加载中…',
  formulaFallback: '可视化编辑器没加载出来，可以直接写 LaTeX，下面是预览：',
  formulaHint: '在上面的框里直接输入，例如 x^2、a/b、sqrt、alpha；手机上会弹出公式键盘。',
  preview: '公式预览',
  send: '发送',
  close: '关上',

  // ── 资料范围 ──
  inProject: '项目资料', // 资料列表里的标记
  // ── 资料的来源说明（批 10b） ──
  sourceNote: '这份资料的说明',
  sourceNoteHint: '只是已知的情况，不是打分；还没写的就是还没人说明。',
  noteField: {
    type: '类型',
    level: '层次',
    author: '作者',
    scope: '适用范围',
    remark: '已知限制',
  } as const,
  noteFieldHint: {
    type: '教材 / 讲义 / 论文 / 网页',
    level: '入门 / 进阶 …',
    author: '作者或机构',
    scope: '这份资料适合用来做什么，一句话',
    remark: '已知的问题，一句话',
  } as const,
  noteFrom: { 学习者: '你补的', 模型: '老师补的' } as const,
  noteUnset: '还没说明',
  noteQuality: '转写质量',
  noteAdd: '补一句',
  notePlaceholder: '写一句话…',
  noteSave: '记下',
  noteEarlier: '以前补过的',
  noteAdded: '只会追加，旧的留着。',
  // ── 资料检索的范围 ──
  searchScopeProject: (n: number) => `在项目资料里搜（${String(n)} 份）`,
  searchScopeAll: '在全部资料里搜',
  searchAll: '查全部资料',

  // ── 旧数据：单子按文字显示（W6；W12 起没有单子） ──
  ticketRevisit: '回头看',
  revisitLine: (kind: string) => `回看以前那次（${kind}）`,
  ticketReturnTo: '学完回到',
  ticketReturnToText: '补上这一块，回到原来那次学习',
  ticketResumeOf: '接着学',
  ticketResumeOfText: '接着以前没学完的那次',
  ticketEdited: '你改了这次要学的内容。',
  ticketEdits: '改过的',
  ticketEditSee: '看那一行',
  ticketEditedFields: (fields: string) => `改了：${fields || '（没变）'}`,

  // ── 旧数据：守卫判定里的实际理解与证据强度（W6） ──
  understanding: '学到的样子',
  understandingHint: '收尾整理时记下的：你实际表现出的理解，以及当时是怎么做出来的。',
  independence: {
    独立: '自己做出来',
    提示后: '提示后做出来',
    答案暴露后: '看过答案后做出来',
  } as const,
  durability: {
    仅当场: '只在当场',
    含变式: '换个问法也行',
    含延迟: '隔一段时间也行',
  } as const,

  // ── 旧数据：路线决定（W6） ──
  routeDecision: '这次怎么定的',
  routeDecisionSuperseded: '后来改了路线',
  routeDecisionBasis: '依据',

  // ── 我学会的：按学习列（W6） ──
  learnedEmpty: '还没有学过。',
  learnedStatus: { 进行中: '还在学', 合上: '学会了', 没合上: '搁着' } as const,
  learnedUpper: '这次打算学什么',
  learnedMiddle: '学成什么样',
  learnedTranscript: '看这次的对话原文',
  learnedImports: '从别处学到的',
  learnedImportsHint: '不是在这里学的，没经过验证，只作参考。',
  importChannel: {
    畅谈: '谈方向时你说的',
    笔记: '你的笔记',
    对话记录: '你在别处跟 AI 学的',
  } as const,

  // ── 没学完结束时说的 ──
  unclosedLine: '停下时说的',

  // ── 外发披露：会联网搜索的对话（W6） ──
  disclosureWebSearch: '会联网搜索的对话',
  disclosureWebSearchNone: '没有',

  // ── 外部导入 ──
  unverified: '未验证',

  // ── 学到一半：停着的（旧数据） ──
  shelvedBar: '这次停着，点“接着学”或说句话就能接上。',
  shelvedPlaceholder: '说句话也会接着学…',
  resume: '接着学',
  shelvedLine: '停了一下。',
  shelvedLineNote: (note: string) => `停了一下：${note}`,
  resumedLine: '接着学。',
  shelvedNote: '停下时说的',
  shelvedBadge: '停着',

  // ── 学习对话读过的教学工具（做法参考） ──
  toolsUsedHere: '这次读过的做法参考',
  toolsUsedHint: '学习对话按需读的。',
  toolsUsedNone: '这次没取用过。',
  toolTimes: (n: number) => `${String(n)} 次`,
  // 旧数据：阶段验收（练习整块删了以后只留说明）
  stageCheck: '阶段验收',
  stageCheckHint: '看你自己能做到哪；默认不给提示',

  // ── 旧数据：复习 / 复检、接着学、阶段复盘（批 6；W12 随导航撤掉，旧记录照旧显示） ──
  // 复习 / 复检
  revisitKind: { 复习: '复习', 复检: '复检' } as const,
  revisitHint: {
    复习: '把以前学过的再过一遍',
    复检: '看看以前学会的还在不在',
  } as const,
  // 接着没学完的学
  resumedByLine: (title: string) => `已接着在《${title}》学`,
  // 阶段复盘
  reviewBanner: (since: string, until: string) => `复盘：回头看 ${since} 到 ${until} 学的`,
  reviewWelcome: '我们回头看看这段时间学得怎么样。',

  // ── 上传与分流（工单 W9、W11） ──
  filesUploading: (n: number) => `正在传 ${String(n)} 个文件…`,
  routedTo: { 资料: '资料', 学过的: '学过的' } as const,
  rerouteTo: (to: string) => `改成${to}`,
  ownerIs: (o: string) => `归${o}`,
  ownerTo: (o: string) => `改归${o}`,
  ownerHint: '归学习者 = 所有项目都能读；归项目 = 只给这个项目读',
  filesSent: (n: number) => `收下了 ${String(n)} 份`,
  // 找资料（旧数据：候选清单）
  findWelcome: '正在找资料…',
  candidatesTitle: '找到的候选',
  candidatesSaved: '已存',
  candidatesNotSaved: '没存',

  // ── 通用 ──
  loading: '正在读…',
  loadFailed: '没读到：',
} as const;

/**
 * 收尾记录交回后对话里那一行。守卫 10-23 起不把关、只写收尾记录，所以只说整理好了没有，不说学没学会；
 * 没整理成（守卫没交回）时学习照旧开着，可以接着说、再申请。10-23 前的旧记录里判“没合上”的，也只说整理好了。
 */
export function judgementLine(problem?: string): string {
  return problem === undefined
    ? '这次学到了什么已整理好。'
    : '这次没整理成，可以接着说，再点“我觉得懂了”。';
}
