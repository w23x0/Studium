// 活页面在浏览器里怎么跑（会话/学习对话.md §11、会话/页面编辑员.md「边界」代码跑在哪）：
// 每版拼成一页，放进只给脚本、不给同源的小窗（sandbox="allow-scripts"），内容安全策略不放外网，
// 只能从本机取 KaTeX。框架的桥接脚本报：加载好了、报错、学习者看得到哪几块与停留、展开折起、
// 页面自己定义的动作（studium.send，页面唯一能往外递东西的口）。
import type { PageAction } from '../shared/page.ts';

/** 小窗递给外面的话（都带 studium: 1）。 */
export type FrameMessage =
  | { kind: 'ready' }
  | { kind: 'error'; message: string }
  | { kind: 'view'; visible: string[]; dwell: Record<string, number> }
  | { kind: 'scroll'; y: number }
  | { kind: 'toggle'; block: string; open: boolean }
  | { kind: 'action'; name: string; detail?: unknown; block?: string; wait: boolean };

/** 页面能用的本机库，地址同核心的 /page-lib（server.ts）。 */
const LIB = '/page-lib/katex';

// 桥接脚本：跑在小窗里，先于各块执行。只用老写法，不依赖构建。
const BRIDGE = String.raw`(function () {
  var P = window.parent;
  var ready = false;
  function post(m) { m.studium = 1; P.postMessage(m, '*'); }
  function blockOf(el) {
    var b = el && el.closest ? el.closest('[data-block]') : null;
    return b ? b.getAttribute('data-block') : undefined;
  }
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
  window.studium = {
    send: function (name, detail, opts) {
      var ev = window.event;
      post({ kind: 'action', name: String(name), detail: detail,
        block: blockOf((ev && ev.target) || document.activeElement), wait: !!(opts && opts.wait) });
    },
    math: function (el) { if (window.renderMathInElement) window.renderMathInElement(el || document.body, MATH); }
  };
  document.addEventListener('toggle', function (e) {
    var t = e.target;
    if (!ready || !t || t.tagName !== 'DETAILS') return;
    var b = blockOf(t);
    if (b) post({ kind: 'toggle', block: b, open: t.open });
  }, true);
  var seen = {}, since = {}, dwell = {}, lastKey = '', lastSent = Date.now();
  function report(force) {
    var now = Date.now(), vis = [];
    for (var id in seen) if (seen[id]) {
      vis.push(id);
      dwell[id] = (dwell[id] || 0) + (now - since[id]) / 1000; since[id] = now;
    }
    vis.sort(function (a, b) { return Number(a.slice(1)) - Number(b.slice(1)); });
    var key = vis.join(',');
    if (key === lastKey && !force && now - lastSent < 15000) return;
    var d = {}; for (var k in dwell) d[k] = Math.round(dwell[k]);
    post({ kind: 'view', visible: vis, dwell: d });
    dwell = {}; lastKey = key; lastSent = now;
  }
  var timer = 0;
  function soon() { clearTimeout(timer); timer = setTimeout(function () { report(false); }, 1500); }
  window.addEventListener('scroll', function () { post({ kind: 'scroll', y: window.scrollY }); }, { passive: true });
  window.addEventListener('message', function (e) {
    if (e.source === P && e.data && typeof e.data.studiumScroll === 'number') window.scrollTo(0, e.data.studiumScroll);
  });
  window.addEventListener('load', function () {
    window.studium.math(document.body);
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (x) {
          var id = x.target.getAttribute('data-block');
          if (x.isIntersecting && !seen[id]) { seen[id] = true; since[id] = Date.now(); }
          if (!x.isIntersecting && seen[id]) { dwell[id] = (dwell[id] || 0) + (Date.now() - since[id]) / 1000; seen[id] = false; }
        });
        soon();
      }, { threshold: 0.15 });
      document.querySelectorAll('[data-block]').forEach(function (el) { io.observe(el); });
    }
    setInterval(function () { report(false); }, 5000);
    setTimeout(function () { ready = true; post({ kind: 'ready' }); }, 50);
  });
})();`;

/** 一版拼成的整页（srcdoc）。origin = 核心的地址（本机），KaTeX 从那里取。 */
export function pageDoc(blocks: { id: string; html: string }[], origin: string): string {
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
    "<style>body{margin:0;padding:16px 20px 48px;font:15px/1.65 system-ui,'PingFang SC','Noto Sans CJK SC',sans-serif;color:#1f1f1f;background:#fff}</style>",
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

/** 小窗的动作 → 交给核心的页面动作。 */
export function toAction(m: FrameMessage): PageAction | undefined {
  if (m.kind === 'toggle') return { kind: 'toggle', block: m.block, open: m.open };
  if (m.kind === 'action') {
    return {
      kind: 'custom',
      name: m.name,
      ...(m.detail !== undefined ? { detail: m.detail } : {}),
      ...(m.block !== undefined ? { block: m.block } : {}),
    };
  }
  return undefined;
}

/** 试跑：加载好之后再等这么久，看有没有报错。 */
export const TRIAL_SETTLE_MS = 800;
/** 试跑：这么久还没加载好，算没过。 */
export const TRIAL_LOAD_MS = 8000;
