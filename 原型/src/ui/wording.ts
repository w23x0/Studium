// 界面上给学习者看的叫法，统一放这里（以后改叫法只改这一处）。
// 内部词（选择卡、守卫、出发点、子句、新点、单子、M0x、M1x 等）不出现在这里的任何一句里；
// wording.test.ts 会查。对照：右边注释是内部叫法，只给写代码的人看。
import type { LoopStatus, SourceReportKind, StateRecordView } from '../shared/protocol.ts';
import { WS } from './wording-sidebar.ts';

export const W = {
  /** 左栏、全部项目页、账号菜单与设置的叫法在 wording-sidebar.ts。 */
  sidebar: WS,
  // ── 项目页 ──
  projectHome: '项目概览', // 项目页（Overview）
  projectChat: '项目对话', // 主对话
  /** 左栏对话列表里学习对话的来历。 */
  taskFrom: { resume: '接着学的' } as const,
  goal: '想学的方向', // 方向目标
  goalMissing: '还没谈定。在项目对话里说说你想学什么。',
  backToChat: '回到项目对话',
  nextStep: '下一步学什么',
  noneYet: '还没有',
  groups: {
    inProgress: '进行中',
    awaitingChoice: '等你选',
    closed: '学完了', // 合上
    unclosed: '先放下的（没学完）', // 没合上（停车场）
    shelved: '先放一放的', // 搁置
  },
  groupHints: {
    inProgress: '正在学、还没学完的',
    awaitingChoice: '接下来学哪个，挑一个就开始',
    closed: '判断过你已经学会、你也确认了的',
    unclosed: '没学完就先停下的，以后可以再接着学',
    shelved: '暂时放下的，点“接着学”或在里面说句话就能接上',
  },

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
  loopBasis: '这次学习的依据', // 学习依据
  status: {
    in_progress: '进行中',
    closed: '学完了',
    unclosed: '先放下了',
  } satisfies Record<LoopStatus, string>,
  plan: '这次学什么', // 开场单子
  newPoint: '要学的', // 新点
  clause: '学完应该能', // 预期理解
  startPoints: '从这些已有的出发', // 出发点
  routeAction: '这次怎么走', // 路线动作
  sourceCheck: '对过资料',
  modelAdded: '模型补的，资料里没有',
  startSource: {
    学过的记录: '你之前学过的',
    自述: '你自己说会的',
    假定: '先假定你会的',
  } as const,
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
  openThere: '打开看看', // 打开书里原文或那次学习
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

  page: (book: string, page?: number) => (page !== undefined ? `${book} · 第 ${page} 页` : book),

  // ── 记录 ──
  learned: '我学会的',
  myState: '我的状态', // 状态记录
  myStateEmpty: '还没整理过。',
  currentState: '现在的状态',
  stage: '所处阶段',
  basisSpan: '依据的时间段',
  stateRecords: '整理时依据的观察',
  stateOutput: { 承载读数: '当前读数', 解释候选: '一种可能的解释' } satisfies Record<
    StateRecordView['output'],
    string
  >,
  timeRange: '时间范围',
  teaching: '对我用过的教法', // 教法记录（与下面的“教学方法库”分开叫）
  teachingEmpty: '还没有对你用过的教法记录。',
  conditions: '当时的情况',
  strategies: '用了什么教法',
  followedBy: '之后怎样',
  toolsUsed: '用到的教学工具',

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
  library: '资料', // 资料浏览
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
  noteMine: '你自己的笔记',
  noteMineHint: '这是你自己写的笔记，不是书上的原文。',
  noteImageMissing: (ref: string) => `（图片找不到：${ref}）`,

  // ── 资料的来源说明、状态回看（批 10b） ──
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
    type: '教材 / 讲义 / 个人笔记 / 网页',
    level: '入门 / 进阶 …',
    author: '作者或机构',
    scope: '这份资料适合用来做什么，一句话',
    remark: '已知的问题，一句话',
  } as const,
  noteFrom: { 程序: '自动得到', 资料: '资料自带', 学习者: '你补的', 模型: '老师补的' } as const,
  noteUnset: '还没说明',
  noteQuality: '转写质量',
  noteAdd: '补一句',
  notePlaceholder: '写一句话…',
  noteSave: '记下',
  noteEarlier: '以前补过的',
  noteAdded: '只会追加，旧的留着。',
  crossKind: { 补习型: '跨领域 · 补一课', 对比链接型: '跨领域 · 对照着看' } as const,
  crossHint: {
    补习型: '你要弄懂的问题用到另一个领域的东西，先补到够用再回来。',
    对比链接型: '另一个领域里有相似的内容，你已经会了，把两边对着看。',
  } as const,
  crossSides: (other: string) => `另一边：${other}`,
  stateTimeline: '按时间回看',
  stateList: '列表',
  stateTimelineHint: '每次整理出的记录按时间排开；颜色可以按所处阶段或按来源看。',
  stateTimelineEmpty: '还没有可以回看的记录。',
  colorBy: '颜色',
  colorStage: '按阶段',
  colorSource: '按来源',
  stageNone: '没标阶段',
  stageSteps: '阶段怎么变的',
  stageStart: (to: string) => `起始：${to}`,
  stageChange: (from: string, to: string) => `${from} → ${to}`,
  myExplain: '我的解释',
  explainAdd: '补一句我的解释',
  explainPlaceholder: '觉得这条不对、不全，或另有原因，写一句你的看法…',
  explainSave: '记下',
  explainHint: '只会追加，不改原来的记录；下次整理状态时会当作你自己说的来读。',
  explainSelf: '你自己说的',

  // ── 资料检索的范围 ──
  searchScopeProject: (n: number) => `在项目资料里搜（${String(n)} 份）`,
  searchScopeAll: '在全部资料里搜',
  searchAll: '查全部资料',

  // ── 单子：按文字显示、学习者可改（W6） ──
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
  ticketEdit: '改一改',
  ticketEditOpen: '改一改再开始',
  ticketEditTitle: '改这次要学的',
  ticketEditHint: '改过之后，这次就按改后的来；原来记下的不改。',
  ticketEditSave: '保存改动',
  ticketEditCancel: '算了',
  ticketEditAddStart: '再加一个',
  ticketEditRemoveStart: '去掉',

  // ── 判定里的实际理解与证据强度（W6） ──
  understanding: '学到的样子',
  understandingHint: '判断这次学会没有时顺带记下的：你实际表现出的理解，以及当时是怎么做出来的。',
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

  // ── 路线决定（W6） ──
  routeDecision: '这次怎么定的',
  routeDecisionSuperseded: '后来改了路线',
  routeDecisionBasis: '依据',

  // ── 我学会的：按学习列（W6） ──
  learnedEmpty: '还没有学过。',
  learnedStatus: { 进行中: '还在学', 合上: '学会了', 没合上: '先放下了' } as const,
  learnedUpper: '这次打算学什么',
  learnedMiddle: '学成什么样',
  learnedTranscript: '看这次的对话原文',
  learnedImports: '从别处学到的',
  learnedImportsHint: '不是在这里学的，没经过验证，只作参考。',
  importChannel: { 畅谈: '谈方向时你说的', 笔记: '你的笔记' } as const,

  // ── 方向目标按块显示（W6） ──
  goalTitle: '这个方向',
  goalAbility: '学成后能',
  goalOrderHint: '大概的顺序',
  goalProvisional: '这一版',
  goalText: '要学成什么',
  goalConfirmedReason: (reason: string) => `你确认时说的：${reason}`,
  provisionalGoal: '临时的，谈过方向后会换成你确认的',
  unclosedLine: '停下时说的',

  // ── 外发披露：会联网搜索的对话（W6） ──
  disclosureWebSearch: '会联网搜索的对话',
  disclosureWebSearchNone: '没有',

  // ── 外部导入 ──
  unverified: '未验证',

  // ── 学到一半：先放一放 ──
  thatPart: '那一段',
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
  shelvedNote: '放下时说的',
  shelvedBadge: '放着',
  loadHeavy: (n: number) =>
    `同时开着的有点多（${String(n)} 段没学完）。先把手上的学完或放一放，再开新的。`,
  loadPile: (n: number) => `没学完的攒了 ${String(n)} 段，先收一收：挑一段接着学。`,
  // 学习之间的关系（从哪来）
  relations: '学习之间的来龙去脉',
  relationsHint: '每段学习从哪来、接着的是哪一段',
  originCard: '从“下一步学什么”里选的',

  // ── 教法：老师可以取用的教学方法、每轮的教法强度、状态确认（批 7） ──
  tools: '教学方法库', // 教学工具库（通用策略知识层）
  toolsHint:
    '老师教的时候可以取用的做法。每份写了什么时候用、怎么做、怎么看出学会没有、要注意什么。',
  toolsEmpty: '还没有可用的教法。',
  toolOrigin: { 官方: '自带的', 学习者自己: '你自己加的' } as const,
  toolApplies: '什么时候用',
  toolSource: '依据',
  toolStatus: '状态',
  toolDraft: '起草未审',
  toolMissing: '找不到这份教法了（可能被改名或删掉）。',
  toolProblems: '没能装上的文件',
  toolProblemsHint: '这些文件格式不对或和自带的重名，老师用不到它们；改好后会自动装上。',
  toolsMine: '自己加教法',
  toolsMineHint:
    '把写好的 Markdown 文件放进数据目录下的 teaching-tools 文件夹（没设过数据目录时是 原型/var/teaching-tools/），格式照自带的那几份：标题是名字，下面三行写“适用条件”“来源”“状态”，再分“做法”“怎么引出证据”“注意边界”三节。老师下次取用时就能看到；和自带的重名的不会装上。',
  toolsUsedHere: '这次学习用到的教法',
  toolsUsedHint: '老师按需取用的；点开看全文。',
  toolsUsedNone: '这次没取用过。',
  toolTimes: (n: number) => `${String(n)} 次`,
  // 阶段验收（练习整块删了以后只留说明）
  stageCheck: '阶段验收',
  stageCheckHint: '看你自己能做到哪；默认不给提示',
  stageCheckBanner: '这次是阶段验收，默认不给提示。做完不等于学完，学没学会照常看你讲得怎么样。',
  selfCheck: '老师先查了自己的教法',
  selfCheckStates: (n: number) => `对照了你的 ${String(n)} 条状态`,
  // 我的状态：来源与确认
  sourceLevel: {
    自述: '你自己说的',
    观察: '观察到的',
    推断: '推测的',
    已确认: '你确认过的',
  } satisfies Record<StateRecordView['sourceLevel'], string>,
  sourceWas: (s: string) => `原本是“${s}”`,
  stateConfirm: '对，是这样',
  stateDeny: '不对',
  stateDenyPlaceholder: '哪里不对（可不填）',
  stateDenySend: '提交',
  stateChange: '改一下',
  stateConfirmed: '你说过：对，是这样',
  stateDenied: '你说过：不对',
  stateDeniedSent: '记下了。下次整理你的状态时会把你的话带上。',
  afterTeachingGo: '看那一轮',

  // ── 我的产出：自己写的笔记整理、推导、小论文、方法比较（批 8b） ──
  outputs: '我的产出', // 知识产出物
  outputsHint: '你自己写的东西。每次保存都留一版，可以回看、对比、回到旧的一版。',
  outputsEmpty: '还没有。可以自己新建一份，也可以在项目对话里说想写什么，和老师一起写。',
  outputNew: '新建一份',
  outputNewCancel: '算了',
  outputTitle: '标题',
  outputTitlePlaceholder: '比如：平均速度和瞬时速度',
  outputKind: '类型',
  outputFirst: '第一版（可以先不写）',
  outputFirstPlaceholder: '可以用 Markdown 和公式（$…$）',
  outputComparisonLater: '方法比较建好后，在右边的表里填：每行一个方法，每列一个比较的方面。',
  outputCreate: '建好',
  outputCreating: '正在建…',
  outputNeedTitle: '要写个标题。',
  versionN: (n: number) => `第 ${String(n)} 版`,
  noVersionYet: '还没有内容',
  author: { 学习者: '你写的', 模型协助: '老师协助写的' } as const,
  writingChats: '一起写的对话',
  // 产出物页
  outputTabs: {
    text: '正文',
    versions: '版本',
    literature: '相关文献',
    general: '可能对别人也有用',
  } as const,
  outputEdit: '编辑',
  outputEditTable: '改表',
  outputWriteWithTeacher: '和老师一起写',
  outputWriteHint:
    '开一段对话，老师看得到这份的最新版，帮你写、帮你加书里的出处；存下的版本会标“老师协助写的”。',
  outputWriteBrief: '这次想写或想改什么（可不填）',
  outputWriteGo: '开始',
  outputWriteOpening: '正在开…',
  outputViewing: (n: number) => `你在看第 ${String(n)} 版，不是最新的。`,
  outputSeeLatest: '看最新版',
  outputRestore: '回到这一版',
  outputRestoreHint: '把这一版的内容再存成最新的一版；中间的版本都还在。',
  outputRestoreNote: (n: number) => `回到第 ${String(n)} 版`,
  outputChangeNote: '这一版改了什么',
  outputNotePlaceholder: '一句话，可不填',
  outputSave: '存为新的一版',
  outputSaving: '正在存…',
  outputCancelEdit: '先不存',
  outputDraftKept: '上次没存的稿子还在，接着改吧。',
  outputDiscardDraft: '丢掉稿子，从最新版重来',
  outputStale: '有更新的版本，先看看再存。你写的稿子留着，回来能接着改。',
  outputStaleBase: (base: number, latest: number) =>
    `你的稿子是在第 ${String(base)} 版上改的，现在最新是第 ${String(latest)} 版。先看看最新版，再决定怎么存。`,
  outputStaleSeen: '看过了，在最新版上存',
  outputEmptyText: '正文不能空。',
  outputPreview: '预览',
  outputWriteMode: '写',
  outputEditorHint:
    '可以用 Markdown 和公式（$…$）。正文里引用书里的原文，会显示成可以点开的小标签；和老师一起写时，老师会帮你加。',
  outputNoNote: '没写改了什么',
  outputGone: '找不到这份了。',
  refsCount: (n: number) => `引用了 ${String(n)} 处`,
  refsBad: (n: number) => `${String(n)} 处对不上`,
  refsBadHint: '对不上的引用显示成灰色；点开或悬停能看到原因。',
  // 方法比较
  cmpMethod: '方法',
  cmpBoundary: '适用边界',
  cmpEvidence: '证据与出处',
  cmpTentative: '还没定论的想法',
  cmpHint: '每行一个方法，每列一个比较的方面；正文由这张表自动生成。',
  cmpAddMethod: '加一个方法',
  cmpAddDim: '加一个方面',
  cmpRemoveMethod: '去掉这个方法',
  cmpRemoveDim: '去掉这一列',
  cmpDimPlaceholder: '比较的方面，如：假设',
  cmpMethodPlaceholder: '方法名',
  cmpBoundaryPlaceholder: '什么条件下能用、什么条件下不能用',
  cmpEvidencePlaceholder: '一行一条',
  cmpTentativePlaceholder: '还在想、没定论的论证（可不填）',
  cmpProblems: {
    dims: '至少要有一个比较的方面；每一列都要写名字，不能重名。',
    methods: '至少要两个方法才能比。',
    names: '每个方法都要有名字，不能重名。',
    boundary: (name: string) => `「${name}」还没写适用边界。`,
  },
  // 版本
  versionsHint: '每次保存都是新的一版，旧的不会被改掉。勾两版可以对比。',
  compare: '对比',
  comparePick: '勾两版来对比',
  compareOf: (a: number, b: number) => `第 ${String(a)} 版 → 第 ${String(b)} 版`,
  diffStat: (added: number, removed: number) =>
    `多了 ${String(added)} 行，少了 ${String(removed)} 行`,
  diffSkip: (n: number) => `…… ${String(n)} 行没变`,
  refsAdded: '新加的引用',
  refsRemoved: '去掉的引用',
  refsNoChange: '引用没有变。',
  noDiff: '两版正文一样。',
  closeCompare: '收起对比',
  textLength: (n: number) => `${String(n)} 字`,
  viewVersion: '看这一版',
  latestBadge: '最新',
  writtenInChat: '在哪段对话里写的',
  // 相关文献
  litHint: '和这份产出有关的书或文章；每条写一句它和这份产出是什么关系。',
  litEmpty: '还没登记。',
  litAdd: '登记一条',
  litFromLibrary: '书库里的',
  litExternal: '外面的',
  litBook: '哪本书',
  litPickBook: '选一本',
  litSection: '哪一节（可不选）',
  litWholeBook: '整本',
  litLines: '哪几行（可不填）',
  litTitle: '标题',
  litAuthors: '作者（多个用逗号隔开，可不填）',
  litUrl: '链接（可不填）',
  litRelation: '它和这份产出是什么关系',
  litRelationPlaceholder: '一句话，比如：书里这一节给了另一种推法',
  litRelationKind: '关系类型（可不选）',
  litRelationNone: '不选',
  litNeedRelation: '要写一句它和这份产出是什么关系。',
  litNeedTitle: '外面的文献要写标题。',
  litNeedBook: '要选一本书。',
  litSave: '登记',
  litProblem: '书库里对不上了：',
  litWholeBookLine: '整本书',
  // 写产出的对话
  outputChatWelcome: '我们一起写。说说这次想写或改哪里。',
  outputChatOn: '在写',
  outputChatOpen: '看产出物',
  outputChatUnbound: '没找到这段对话在写哪一份。',

  // ── 跨段学习的长期功能：今天该做的、提醒、复习 / 复检、接着学、阶段复盘、我学会的现状（批 6） ──
  today: '今天该做的',
  todayHint: '到期的提醒、快到的期限、该回头看看的时候',
  todayDo: '去做',
  todayDone: '做完了',
  todaySkip: '跳过',
  todayLater: '今天先不',
  todayDoing: '正在开…',
  overdue: (n: number) => (n > 0 ? `过了 ${String(n)} 天` : '今天到期'),
  deadlineNear: (n: number) =>
    n > 0 ? `离期限还有 ${String(n)} 天` : n === 0 ? '期限就是今天' : `期限已过 ${String(-n)} 天`,
  reviewDue: (n: number) => `上次回头看之后又学完了 ${String(n)} 段，可以复盘一下`,
  // 提醒
  reminders: '提醒',
  remindersHint: '到了那天会出现在“今天该做的”里；只在这里提醒，不发通知。',
  remindersEmpty: '还没有提醒。',
  reminderKind: {
    recheck: '复检',
    resume: '接着学',
    deadline: '期限',
    review: '复盘',
    other: '提醒',
  } as const,
  reminderBy: { nav: '安排学习时记的', learner: '你加的' } as const,
  reminderAdd: '加一条提醒',
  reminderWhat: '做什么',
  reminderWhatKind: {
    recheck: '复检以前学过的一块',
    resume: '接着一段没学完的',
    deadline: '为期限做准备',
    other: '别的事',
  } as const,
  reminderPickPoint: '复检哪一块（写一句话）',
  reminderPickLoop: '哪一段',
  reminderPick: '选一个',
  reminderNoLoops: '没有没学完的。',
  reminderWhen: '什么时候',
  reminderOnDate: '某一天',
  reminderBeforeDeadline: '期限前几天',
  reminderDaysBefore: '天',
  reminderNoDeadline: '项目没设期限，只能选日期。',
  reminderText: '提醒自己的一句话',
  reminderTextRecheck: (name: string) => `复检「${name}」，看看还记不记得`,
  reminderTextResume: (title: string) => `接着学「${title}」`,
  reminderTextDeadline: '期限快到了，看看还差什么',
  reminderSave: '加上',
  reminderCancel: '算了',
  reminderDismiss: '不要了',
  reminderNeedText: '要写一句做什么。',
  reminderNeedPick: '要选是哪一个。',
  reminderNeedDate: '要选日期。',
  remindersClosed: (n: number) => `已办 / 已跳过的（${String(n)}）`,
  reminderOutcome: { done: '已办', dismissed: '已跳过' } as const,
  reminderClosedBy: { learner: '你标的', program: '学的时候顺手办掉的' } as const,
  // 复习 / 复检
  revisitKind: { 复习: '复习', 复检: '复检' } as const,
  revisitHint: {
    复习: '把以前学过的再过一遍',
    复检: '看看以前学会的还在不在',
  } as const,
  revisitBanner: {
    复习: '这次是复习：把以前学过的再过一遍。',
    复检: '这次是复检：看看以前学会的还在不在。不是从头学，答不上来也没关系，正好知道哪里要补。',
  } as const,
  // 接着没学完的学
  resumeOfBefore: '接着',
  resumeOfAfter: '学（原来那段没学完）',
  resumeOfLine: (title: string) => `接着《${title}》学的`,
  resumedByLine: (title: string) => `已接着在《${title}》学`,
  resumedByBefore: '已接着在',
  resumedByAfter: '学',
  // 阶段复盘
  review: '阶段复盘',
  reviewHint: '回头看看这段时间学了什么、哪里没学完、接下来怎么走；谈完交回项目一句话。',
  reviewStart: '复盘一下',
  reviewPickSince: '选从哪天起',
  reviewSince: '从哪天起（不选就从上次复盘起）',
  reviewOpening: '正在开…',
  reviewsPast: '历次复盘',
  reviewNone: '还没复盘过。',
  reviewRange: (since: string, until: string) => `${since} 到 ${until}`,
  reviewOngoing: '还在谈',
  reviewBadge: '复盘',
  reviewBanner: (since: string, until: string) => `复盘：回头看 ${since} 到 ${until} 学的`,
  reviewWelcome: '我们回头看看这段时间学得怎么样。',
  reviewEnded: '复盘好了，交回项目了。',
  reviewEndedLine: (summary: string) => `复盘交回项目了：${summary}`,
  reviewTask: '一起复盘这段时间',
  // 路线偏差（现算的三类，只说事实）
  deviations: '没按推荐走的时候',
  deviationsHint: '只记下事实，给你自己回头看；不代表学得好不好。',
  deviationsNone: '还没有。',
  seeThatLearning: '看那段学习',

  // ── 通用 ──
  loading: '正在读…',
  loadFailed: '没读到：',
} as const;

/** 判断结果的一句话（对话里那句提示用同一说法）。 */
export function judgementLine(closed: boolean, problem?: string): string {
  return closed && problem === undefined ? '看起来这部分你已经掌握了。' : '还差一点，我们接着来。';
}
