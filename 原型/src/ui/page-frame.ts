// 组件在浏览器里怎么跑（会话/学习对话.md §11.3、会话/页面子代理.md「边界」代码跑在哪）：
// 一个组件一个小窗：各块拼成一页，放进只给脚本、不给同源的小窗（sandbox="allow-scripts"），内容安全策略不放外网，
// 只能从本机取 KaTeX。框架的桥接脚本报：加载好了、报错、组件自己发出的一句话（studium.send，组件唯一能往外递
// 东西的口）、内容高度（摆版用，不是观测）。只发组件代码里要观测的事；不报展开折起、滚动、看得到哪几块、停了多久。
import type { ActionTarget } from '../shared/screen.ts';

/** 小窗递给外面的话（都带 studium: 1）。 */
export type FrameMessage =
  | { kind: 'ready' }
  | { kind: 'error'; message: string }
  | { kind: 'height'; h: number }
  | { kind: 'action'; text: string; to: ActionTarget; wait: boolean };

/** 组件能用的本机库，地址同核心的 /page-lib（server.ts）。 */
const LIB = '/page-lib/katex';

// 桥接脚本：跑在小窗里，先于各块执行。只用老写法，不依赖构建。
const BRIDGE = String.raw`(function () {
  var P = window.parent;
  function post(m) { m.studium = 1; P.postMessage(m, '*'); }
  window.addEventListener('error', function (e) {
    var at = e.lineno ? '（第 ' + e.lineno + ' 行）' : '';
    post({ kind: 'error', message: String((e.error && e.error.stack) || e.message) + at });
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    post({ kind: 'error', message: 'Promise 出错没接住：' + String((r && r.stack) || r) });
  });
  var MATH = { delimiters: [
    { left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false }, { left: '\\(', right: '\\)', display: false }
  ], throwOnError: false };
  var TO = { maker: 1, main: 1, both: 1 };
  window.studium = {
    send: function (text, opts) {
      var to = opts && TO[opts.to] ? opts.to : 'maker';
      post({ kind: 'action', text: String(text).slice(0, 1000), to: to, wait: !!(opts && opts.wait) });
    },
    math: function (el) { if (window.renderMathInElement) window.renderMathInElement(el || document.body, MATH); }
  };
  var lastH = 0;
  function height() {
    var h = Math.ceil(document.documentElement.scrollHeight);
    if (h !== lastH) { lastH = h; post({ kind: 'height', h: h }); }
  }
  window.addEventListener('load', function () {
    window.studium.math(document.body);
    if (window.ResizeObserver) new ResizeObserver(height).observe(document.body);
    height();
    setTimeout(function () { post({ kind: 'ready' }); }, 50);
  });
})();`;

/** 一个组件拼成的一页（srcdoc）。origin = 核心的地址（本机），KaTeX 从那里取。 */
export function componentDoc(blocks: { id: string; html: string }[], origin: string): string {
  const csp = [
    "default-src 'none'",
    `script-src 'unsafe-inline' 'unsafe-eval' ${origin}`,
    `style-src 'unsafe-inline' ${origin}`,
    `font-src ${origin} data:`,
    'img-src data: blob:',
    'media-src data: blob:',
  ].join('; ');
  return [
    '<!doctype html><html lang="zh"><head><meta charset="utf-8">',
    `<meta http-equiv="Content-Security-Policy" content="${csp}">`,
    `<link rel="stylesheet" href="${origin}${LIB}/katex.min.css">`,
    `<script src="${origin}${LIB}/katex.min.js"></script>`,
    `<script src="${origin}${LIB}/contrib/auto-render.min.js"></script>`,
    "<style>body{margin:0;padding:12px 14px;font:15px/1.65 system-ui,'PingFang SC','Noto Sans CJK SC',sans-serif;color:#1f1f1f;background:#fff}</style>",
    `<script>${BRIDGE}</script>`,
    '</head><body>',
    ...blocks.map((b) => `<div data-block="${b.id}">\n${b.html}\n</div>`),
    '</body></html>',
  ].join('\n');
}

/** 从 message 事件里认出小窗的话；不是就 undefined。 */
export function frameMessage(data: unknown): FrameMessage | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const m = data as Record<string, unknown>;
  if (m.studium !== 1 || typeof m.kind !== 'string') return undefined;
  return m as unknown as FrameMessage;
}

/** 试跑：加载好之后再等这么久，看有没有报错。 */
export const TRIAL_SETTLE_MS = 800;
/** 试跑：这么久还没加载好，算没过。 */
export const TRIAL_LOAD_MS = 8000;
