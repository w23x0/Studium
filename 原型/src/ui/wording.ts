// 界面上给学习者看的叫法，统一放这里（以后改叫法只改这一处）。
// 内部词（选择卡、守卫、出发点、子句、新点、单子、M0x、M1x 等）不出现在这里的任何一句里（没有自动检查，改时自己留意）。
// 对照：右边注释是内部叫法，只给写代码的人看。
import type { SourceReportKind } from '../shared/protocol.ts';
import { WS } from './wording-sidebar.ts';
import { WU } from './wording-usage.ts';

export const W = {
  /** 左栏、全部项目页、账号菜单与设置的叫法在 wording-sidebar.ts。 */
  sidebar: WS,
  /** 上下文、额度与使用情况（W14）的叫法在 wording-usage.ts。 */
  usage: WU,
  // ── 项目 ──
  projectHome: '项目页', // 项目页（Overview）
  projectChat: '项目对话', // 主对话
  backToMain: '回项目对话',
  /** 讨论串：项目对话右边一栏，列这个项目开出去的任务对话。 */
  threads: {
    title: '讨论串',
    show: '打开讨论串',
    close: '收起讨论串',
    open: '开着',
    ended: '已结束',
    empty: '还没开过。每次学习都会在这里列一条。',
    more: '更多',
    end: '结束',
    delete: '删除',
    deleteTitle: '删掉这个讨论串？',
    deleteHint: (title: string) =>
      `删掉「${title}」后它不再显示，之后的对话也读不到它。删了不能撤销。`,
    deleteGo: '删掉',
    cancel: '算了',
    tagClosed: '学完',
  },

  // ── 依据面板 ──
  panelClose: '关上',
  panelSourceTitle: '出处',
  whereAmI: '现在在哪',
  // ── 对话页 ──
  mainWelcome: '想学什么？说一句就行。',
  // 旧数据：导航会话只读看
  navIntro: '导航自己跑完，这里只看它怎么想的。',
  navResult: '下一次学',
  navStart: '开始学',
  navWhy: '为什么：',
  panelBack: '返回',
  objectSubmit: '提交',
  objectCancel: '算了',

  page: (book: string, page?: number) => (page !== undefined ? `${book} · 第 ${page} 页` : book),

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

  // ── 旧数据：单子改过、阶段复盘（W12 起不再产生，旧记录照旧显示） ──
  ticketEdited: '你改了这次要学的内容。',
  // ── 讨论串栏里旧学习当时的状态（W19 起新学习只分开着 / 已结束） ──
  unclosedTag: '搁着',

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

  // ── 通用 ──
  loading: '正在读…',
  loadFailed: '没读到：',
} as const;
