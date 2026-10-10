// 界面上给学习者看的叫法，统一放这里（以后改叫法只改这一处）。
// 内部词（闭环、选择卡、守卫、出发点、子句、新点、单子、M0x、M1x 等）不出现在这里的任何一句里；
// wording.test.ts 会查。对照：右边注释是内部叫法，只给写代码的人看。
import type {
  LoopStatus,
  M08Source,
  SourceReportKind,
  StateRecordView,
} from '../shared/protocol.ts';

export const W = {
  // ── 项目页 ──
  projectHome: '项目概览', // 项目页（Overview）
  projectChat: '项目对话', // 主对话
  goal: '想学的方向', // 方向目标
  goalMissing: '还没谈定。在项目对话里说说你想学什么。',
  backToChat: '回到项目对话',
  nextStep: '下一步学什么',
  learnTasks: '学习', // 闭环对话列表
  talkTasks: '谈话', // 畅谈对话
  noneYet: '还没有',
  groups: {
    inProgress: '进行中',
    awaitingChoice: '等你选',
    closed: '学完了', // 合上
    unclosed: '先放下的（没学完）', // 没合上（停车场）
    shelved: '先放一放的', // 搁置
    waitingFork: '等补完回来的', // 等分叉回来
  },
  groupHints: {
    inProgress: '正在学、还没学完的',
    awaitingChoice: '接下来学哪个，挑一个就开始',
    closed: '判断过你已经学会、你也确认了的',
    unclosed: '没学完就先停下的，以后可以再接着学',
    shelved: '暂时放下的，点“接着学”或在里面说句话就能接上',
    waitingFork: '中途先去补前面的（或学别的），那边学完就回来接着学',
  },
  openConversation: '打开对话',
  lastJudgement: (closed: boolean) => (closed ? '上次判断：已经掌握' : '上次判断：还差一点'),

  // ── 选项 ──
  pickOne: '接下来学哪个？挑一个开始',
  recommended: '推荐',
  chosen: '已选',
  opening: '正在开…',
  whyThis: '为什么推荐 · 出处',
  cardTrigger: '为什么现在给这些选项',
  sources: '出处',
  noSources: '这一项没有记出处。',

  // ── 依据面板 ──
  panel: '依据', // 右侧依据面板
  panelOpen: '打开依据',
  panelClose: '关上',
  panelBack: '返回',
  panelHome: '可以看的东西',
  loopBasis: '这次学习的依据', // 闭环依据
  status: {
    in_progress: '进行中',
    closed: '学完了',
    unclosed: '先放下了',
  } satisfies Record<LoopStatus, string>,
  plan: '这次学什么', // 开场单子
  newPoint: '这次要学的', // 新点
  clause: '这一步怎么连上的', // 子句
  startPoints: '从你已有的出发', // 出发点
  routeAction: '这一步的安排', // 路线动作
  startSource: {
    M09: '你之前学会的',
    自述: '你自己说会的',
    假定: '先假定你会的',
  } as const,
  notes: '老师的观察记录', // 诊断记录
  notesHint: '学的过程中记下的观察，不写进回复，只放在这里供你查看。',
  noNotes: '还没有记。',
  judgements: '是否学会的判断', // 守卫判定
  noJudgements: '还没判断过。',
  judgedYes: '判断：已经掌握',
  judgedNo: '判断：还差一点',
  whyJudged: '为什么这么判断',
  reason: '理由',
  problem: '没能采用这次判断的原因',
  quotedWords: '依据的原话',
  askedBy: (by: 'model' | 'learner') =>
    by === 'learner' ? '你说“我觉得懂了”' : '老师提出可以看看',
  jumpTo: '在对话里看',
  // 引用的是记录里的行号，和对话里看到的第几句对不上，所以不写数字，点了跳过去看
  lineRef: '（那句原话）',
  lineRangeRef: '（那几句原话）',
  loopLineSource: '对话里的一句',
  ended: '结束时说明',
  notAvailable: '（这一行不是对话里的话）',

  // ── 异议 ──
  objectJudgement: '我觉得判得不对',
  objectRecord: '我觉得记得不对',
  objectPlaceholder: '说说哪里不对、你是怎么想的…',
  objectSubmit: '提交',
  objectCancel: '算了',
  objectSent: '收到了，原话已记下。',
  objectSentInLoop: '收到了，你的话已经放进这段学习对话里，可以接着学，再说“我觉得懂了”。',
  objections: '你提过的不同看法',
  objectionTag: '对上面那次判断的不同看法',

  // ── 知识点（书里的） ──
  point: '知识点',
  pointFrom: '怎么连到这里的',
  pointTo: '从这里能接着学',
  cautions: '要小心',
  extraNotes: '补充说明',
  anchors: '书里的位置',
  threshold: '关键的一步', // 阈值点
  scope: { 范围内: '在这次要学的范围里', 前置: '要先会的' } as const,
  splitOf: '从这个大的拆出来：',
  page: (book: string, page?: number) => (page !== undefined ? `${book} · 第 ${page} 页` : book),
  emptyLibrary: '书里的知识点还没整理出来。',

  // ── 记录 ──
  learned: '我学会的', // M09 形成记录
  learnedEmpty: '还没有学会的记录。学完一部分并确认后会记在这里。',
  understanding: '你怎么理解的',
  process: '怎么学会的',
  unmet: '还没做到的',
  strength: '证据有多强',
  myState: '我的状态', // M15
  myStateEmpty: '还没整理过。',
  currentState: '现在的状态',
  stage: '所处阶段',
  basisSpan: '依据的时间段',
  stateRecords: '整理时依据的观察',
  stateSource: { 自述: '你说的', 观察: '看到的', 推断: '推测的' } satisfies Record<
    StateRecordView['source'],
    string
  >,
  stateOutput: { 承载读数: '当前读数', 解释候选: '一种可能的解释' } satisfies Record<
    StateRecordView['output'],
    string
  >,
  timeRange: '时间范围',
  teaching: '教法记录', // M10
  teachingEmpty: '还没有教法记录。',
  conditions: '当时的情况',
  strategies: '用了什么教法',
  followedBy: '之后怎样',
  toolsUsed: '用到的教学工具',

  // ── 出处种类 ──
  sourceKind: {
    m08_point: '书里的知识点',
    m08_clause: '书里的一步连接',
    m09_record: '你之前学会的',
    loop_line: '之前对话里的话',
    book_line: '书里的一处',
    unknown: '查不到的出处',
  } as const,
  sourceNotResolved: '查不到原文',

  // ── 书给的 / 模型补的 ──
  m08Source: {
    书给的: '书给的',
    模型补的: '模型补的',
    未审: '没核对过',
  } satisfies Record<M08Source, string>,

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
  library: '资料', // M07 资料浏览
  libraryHint: '书的目录、原文和原件页面',
  libraryEmpty: '书库里还没有书。',
  books: '书',
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
  onThisPage: '这一页上的知识点',
  noOriginal: '这本书没有原件页面，只能看转录的文字。',
  notLocated: '这一段在原件上没比对出位置，先显示本节的第一页。',
  imageFailed: '原件页面没显示出来。',
  readText: '看转录的原文',
  backToToc: '这本书的目录',
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
  reportSent: '记下了。书本身不会被改，这条会留着等以后修正。',
  reported: '你报过的错',

  // ── 输入框：图片 / 拍照、语音、公式（批 4） ──
  disclosureInputs: '输入方式送往哪里', // 外发披露里的图片转写、语音
  addImage: '添加图片',
  takePhoto: '拍照',
  imageNotice:
    '图片会送去自动转写成文字（送往哪里见“内容送往哪里”）；对话里只发文字，原图存在本机。',
  dropHere: '松开，把图片加进来',
  notImage: '只能加图片（PNG、JPEG、GIF、WebP）。',
  uploading: '正在上传…',
  transcribing: '正在转写…',
  transcript: '图里的内容（自动转写，发送前可以改）',
  transcriptPlaceholder: '转写出的文字会出现在这里…',
  ownText: '没能自动转写。可以自己写下图里的内容：',
  retry: '再试一次',
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

  // ── 资料范围（批 3b）：项目资料、期限、个人笔记 ──
  materials: '项目资料', // 项目选用的书与笔记（Claude 的项目知识）
  materialsHint: '学习时查资料、排下一步，默认只在这些里查',
  materialsAll: '还没选资料：现在查全部资料。',
  materialMissing: '书库里找不到了',
  materialRemove: '从项目资料里去掉',
  materialAdd: '从书库加',
  materialAddDone: '收起',
  materialPickHint: '挑这个项目要用的书或笔记。选了以后，学习时默认只在项目资料里查。',
  materialAddOne: '加进来',
  addToProject: '加进项目资料',
  inProject: '项目资料', // 资料列表里的标记
  noteKind: '笔记',
  noteBy: (author: string) => `作者：${author}`,
  noSubject: '没分学科的',
  deadline: '期限',
  deadlineNone: '没设期限',
  deadlineSet: '设期限',
  deadlineChange: '改',
  deadlineClear: '清掉',
  deadlineNotePlaceholder: '备注（可不填），比如为什么是这天',
  deadlineSave: '保存',
  deadlineCancel: '算了',
  daysLeft: (n: number) =>
    n > 0 ? `还剩 ${String(n)} 天` : n === 0 ? '就是今天' : `已过 ${String(-n)} 天`,
  noteImport: '导入笔记',
  noteImportHint:
    '写本机上的路径：一份 Markdown 笔记，或一个装着笔记的文件夹（里面的 .md 按文件名顺序读）。笔记标作你自己写的，不当书用。',
  notePath: '笔记路径',
  notePathPlaceholder: '/home/…/笔记文件夹 或 …/某一篇.md',
  noteTitle: '叫什么（可不填，默认用文件名）',
  noteImportGo: '导入',
  noteImporting: '正在导入…',
  noteImported: (title: string) => `导入好了：${title}`,
  noteSize: (files: number, sections: number) =>
    `${String(files)} 个文件，分成 ${String(sections)} 节`,
  noteImagesFound: (n: number) => `${String(n)} 张图片都找到了`,
  noteImagesMissing: (n: number) => `${String(n)} 张图片没找到（原文里会标出来）：`,
  noteSkipped: '没读的文件：',
  notePrevious: '这个路径以前导入过；这次是新的一份，旧的那份不动。',
  noteExtract: '让系统从笔记里找出我写过的知识点',
  noteExtractStarted: '开始找了。找到的会放进“我学会的”，标作还没核实。',
  noteExtractOpen: '去看“我学会的”',
  noteMine: '你自己的笔记',
  noteMineHint: '这是你自己写的笔记，不是书上的原文。',
  noteImageMissing: (ref: string) => `（图片找不到：${ref}）`,

  // ── 资料检索的范围 ──
  searchScopeProject: (n: number) => `在项目资料里搜（${String(n)} 份）`,
  searchScopeAll: '在全部资料里搜',
  searchAll: '查全部资料',

  // ── 书里的知识点（按书、按章） ──
  pointsBrowse: '书里的知识点', // M08 浏览
  pointsBrowseHint: '按书、按章列出整理好的知识点；点开看它怎么连上前后。',
  pointsCount: (n: number) => `${String(n)} 个知识点`,
  chapterOf: (n: number) => `第 ${String(n)} 章`,
  noAnchor: '没标书里位置的',
  pointsNone: '这一章没有知识点。',
  pointsScopeProject: '只列项目资料里的书',
  pointsScopeAll: '列出全部的书',
  pointsShowAll: '看全部',
  pointsShowProject: '只看项目资料',
  bookPoints: '这本书的知识点',

  // ── 我学会的：分档 ──
  learnedVerified: '学完验证过的',
  learnedVerifiedHint: '在学习里讲清楚、判断过、你也确认学完了的',
  learnedVerifiedNone: '还没有。',
  learnedUnverified: '还没核实的',
  learnedUnverifiedHint: '没经过学习验证，只作参考；真学过一遍之后，以学过的记录为准。',
  learnedSelf: '你自己说会的',
  learnedFromNotes: '笔记里看到的',
  unverified: '未核实',
  grade: '到什么程度',
  whyGraded: '为什么这么看',
  noteSpot: '看笔记里这一处',

  // ── 学到一半：先补前面的 / 岔开去学别的 / 先放一放（批 5） ──
  detourAsk: '学到这里，要不要先停一下？', // 闭环中途的小卡
  detourKind: {
    fork: '先去补', // 开分叉
    continue: '接着学',
    shelve: '先放一放', // 搁置
  } as const,
  detourChosen: '你选了',
  detourWhy: '为什么问这个',
  detourScope: '补到什么程度',
  goThere: '去那边',
  thatPart: '那一段',
  backThere: '回到那里',
  forkFrom: '从', // 分叉对话顶部：从《父》岔出来……
  forkBanner: {
    gap: (what: string) => `岔出来补「${what}」，补完会回到那里`,
    branch: (what: string) => `岔出来去学「${what}」，学完会回到那里`,
  },
  waitingBanner: {
    gap: (what: string) => `在补「${what}」，补完回来`,
    branch: (what: string) => `在学「${what}」，学完回来`,
  },
  forkReturned: {
    gap: (what: string) => `补完了「${what}」，回到这里接着学。`,
    branch: (what: string) => `学完了「${what}」，回到这里接着学。`,
  },
  forkNotDone: (what: string) => `「${what}」没补好，先回到这里（已记在没学完的里）。`,
  forkEnded: (closed: boolean) =>
    closed ? '这一段补完了，回到原来那段接着学。' : '先学到这里，回到原来那段接着学。',
  shelve: '先放一放', // 搁置
  shelveHint: '先放下，不算学完也不算半途而废；以后点“接着学”或在这里说句话就能接上。',
  shelvePlaceholder: '想写一句为什么先放下（可不填）',
  shelveGo: '放下',
  shelveCancel: '算了',
  shelvedBar: '已放下，点“接着学”继续。',
  shelvedPlaceholder: '说句话也会接着学…',
  resume: '接着学',
  endInstead: '不学了，先到这里',
  shelvedLine: '先放一放了。',
  shelvedLineNote: (note: string) => `先放一放了：${note}`,
  resumedLine: '接着学。',
  parkedLine: (p: { missing: string; when: string; from: string }) =>
    `记下了没学完的地方：还缺 ${p.missing}；打算${p.when}，从${p.from}接上。`,
  parkingTitle: '没学完的地方', // 停车记录
  parkingReason: {
    ended_unclosed: '没学完就停下时记的',
    shelved: '先放一放时记的',
  } as const,
  parkingMissing: '缺在哪',
  parkingWhen: '打算什么时候',
  parkingFrom: '从哪接上',
  parkingWords: '依据的原话',
  shelvedNote: '放下时说的',
  shelvedBadge: '放着',
  waitingBadge: '等补完',
  forkBadge: '岔出来的',
  forkOfLine: (title: string) => `从「${title}」岔出来的`,
  waitingLine: (title: string) => `在那边：${title}`,
  loadHeavy: (n: number) =>
    `同时开着的有点多（${String(n)} 段没学完）。先把手上的学完或放一放，再开新的。`,
  loadPile: (n: number) => `没学完的攒了 ${String(n)} 段，先收一收：挑一段接着学。`,
  // 学习之间的关系（来源、岔开、回来）
  relations: '学习之间的来龙去脉',
  relationsHint: '每段学习从哪来、中途岔开去补了什么、回来没有',
  origin: '从哪来',
  originCard: '从“下一步学什么”里选的',
  originFork: '从另一段学习里岔出来的',
  originUnknown: '记不清从哪来',
  forkWhy: '为什么岔开',
  forkWhat: '要补的',
  forkReturn: (title: string) => `这边学完就回到「${title}」`,
  forkBasis: '在原来那段对话里看原话',
  forksOut: '中途岔开去补的',
  forkBackDone: '学完回来了',
  forkBackNot: '没学完就回来了',
  forkOut: '还在那边',
  signals: '中途提过的“先停一下”', // route_signal
  signalsHint: '学到一半发现前面有地方不牢、或你想先去学别的时，老师提出来的；下面是依据的原话。',
  signalKind: { gap: '前面有地方不牢', branch: '想先去学别的' } as const,
  signalNote: '老师的补充',
  offered: '给你的选择',
  notChosenYet: '还没选',

  // ── 通用 ──
  loading: '正在读…',
  loadFailed: '没读到：',
} as const;

/** 判断结果的一句话（对话里那句提示用同一说法）。 */
export function judgementLine(closed: boolean, problem?: string): string {
  return closed && problem === undefined ? '看起来这部分你已经掌握了。' : '还差一点，我们接着来。';
}
