// 把一个会话的模型上下文按发生顺序导出成一个网页：系统提示词 → 工具 → 每条输入（程序拼的 / 学习者的，
// 照模型实际收到的样子拼回）→ 模型每一步（思考、话、工具调用）→ 工具返回；程序侧的事（模型看不到的）灰色标出。
// 用法：npm run context -- <会话 id 或前缀> [输出文件]
// 默认输出到 <数据>/导出/上下文/<会话 id>.html。11-03 起开会话时会记 `context_opened`（当时实际给的系统提示词）；
// 更早的会话没有它，系统提示词按会话开始时 git 里已提交的提示词文件补，页面上标“补的”。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const repo = resolve(root, '..');
const data = process.env.STUDIUM_DATA ?? join(root, 'var');
const sessionsDir = join(data, 'sessions');

const [arg, outArg] = process.argv.slice(2);
if (arg === undefined) {
  console.error('用法：npm run context -- <会话 id 或前缀> [输出文件]');
  process.exit(1);
}
const files = readdirSync(sessionsDir).filter((f) => f.endsWith('.jsonl'));
const hits = files.filter((f) => f.startsWith(arg) || f.includes(arg));
if (hits.length !== 1) {
  console.error(
    hits.length === 0 ? `没找到会话：${arg}` : `有 ${hits.length} 个匹配：\n${hits.join('\n')}`,
  );
  process.exit(1);
}
const id = hits[0].replace(/\.jsonl$/, '');
const records = readFileSync(join(sessionsDir, hits[0]), 'utf8')
  .split('\n')
  .filter((l) => l.trim() !== '')
  .map((l, i) => ({ line: i + 1, r: JSON.parse(l) }));

const opened = records[0]?.r;
const kind = opened?.kind ?? '?';
// 只有学习对话按时间线跑：输入不包 <程序事实> 标记（hub.ts `timeline`）
const timeline = kind === 'loop';

// ── 小工具 ──
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
const p2 = (n) => String(n).padStart(2, '0');
const localMinute = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
const localSecond = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${localMinute(iso)}:${p2(d.getSeconds())}`;
};
const pre = (s) => `<pre>${esc(s)}</pre>`;
/** 长的折起来，短的直接摊开。 */
const body = (s, summary) => {
  const t = String(s ?? '');
  if (t.length <= 1500) return pre(t);
  return `<details><summary>${esc(summary)}（${t.length} 字，点开）</summary>${pre(t)}</details>`;
};
const wrapFact = (t) => (timeline ? t : `<程序事实>\n${t}\n</程序事实>`);
const quotePrefix = (q) => {
  if (q === undefined) return '';
  if (q.component !== undefined) return `学习者选中了组件「${q.component}」\n\n`;
  const t = q.text ?? '';
  const shown = t.length > 300 ? `${t.slice(0, 160)}……${t.slice(-100)}` : t;
  return q.line !== undefined
    ? `学习者选中了第 ${q.line} 行里的这段：\n「${shown}」\n\n`
    : `学习者选中了这段：\n「${shown}」\n\n`;
};

// ── 系统提示词：有记录用记录，没有就按 git 补 ──
const promptAt = (name, iso) => {
  const path = `原型/src/core/prompts/${name}.md`;
  try {
    const rev = execFileSync('git', ['log', '-1', '--format=%H', `--before=${iso}`, '--', path], {
      cwd: repo,
      encoding: 'utf8',
    }).trim();
    if (rev === '') return undefined;
    return {
      rev: rev.slice(0, 8),
      text: execFileSync('git', ['show', `${rev}:${path}`], { cwd: repo, encoding: 'utf8' }),
    };
  } catch (err) {
    console.error(
      `补系统提示词失败（${name}）：${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }
};
const reconstructed = () => {
  if (opened === undefined) return undefined;
  const base = promptAt(kind, opened.at);
  if (base === undefined) return undefined;
  if (kind !== 'loop') return base;
  const part = promptAt(opened.page === 'stream' ? 'loop-stream' : 'loop-grid', opened.at);
  return {
    rev: `${base.rev} / ${part?.rev ?? '?'}`,
    text: base.text.replace('{{页面}}', (part?.text ?? '').trim()),
  };
};

// ── 每条输入前附上的事（turn_context.forLine 指那条输入） ──
const prefaceFor = new Map();
for (const { r } of records) if (r.type === 'turn_context') prefaceFor.set(r.forLine, r.text);

const children = files
  .filter((f) => f !== hits[0])
  .map((f) => {
    const first = readFileSync(join(sessionsDir, f), 'utf8').split('\n', 1)[0];
    try {
      const r = JSON.parse(first);
      return r.parent === id
        ? { id: f.replace(/\.jsonl$/, ''), kind: r.kind, title: r.title ?? '' }
        : undefined;
    } catch {
      // 第一行不是完整 JSON（正在写）的会话跳过：只影响“开出的会话”列表
      return undefined;
    }
  })
  .filter((c) => c !== undefined);

// ── 拼正文 ──
const out = [];
const block = (cls, who, at, line, html) =>
  out.push(
    `<section class="${cls}"><div class="meta"><b>${esc(who)}</b><span>${esc(localSecond(at ?? ''))}${
      line !== undefined ? ` · 第 ${line} 行` : ''
    }</span></div>${html}</section>`,
  );
const event = (at, line, text) =>
  out.push(`<div class="event">${esc(localSecond(at ?? ''))} · 第 ${line} 行 · ${esc(text)}</div>`);

const hasContextRecord = records.some(({ r }) => r.type === 'context_opened');
if (!hasContextRecord) {
  const rec = reconstructed();
  block(
    'system guess',
    '系统提示词（补的）',
    opened?.at,
    undefined,
    rec === undefined
      ? '<p>git 里找不到会话开始前的提示词版本。</p>'
      : `<p class="warn">这个会话开时还没有记系统提示词。下面是会话开始前 git 里最后一次提交的版本（${esc(
          rec.rev,
        )}）；当时工作区有没提交的改动、或服务没重启，都会和模型实际收到的不一样。工具清单也没有记。</p>${body(
          rec.text,
          '系统提示词',
        )}`,
  );
}

for (const { line, r } of records) {
  switch (r.type) {
    case 'context_opened':
      block(
        'system',
        '系统提示词与工具（开模型会话时实际给的）',
        r.at,
        line,
        `${body(r.systemPrompt, '系统提示词')}<p><b>内置工具</b>：${esc(r.builtins.join('、') || '无')}</p>` +
          `<p><b>我们的工具</b>：</p><ul>${r.tools
            .map((t) => `<li><code>${esc(t.name)}</code> — ${esc(t.description)}</li>`)
            .join('')}</ul>` +
          r.subagents
            .map(
              (a) =>
                `<p><b>子代理 ${esc(a.name)}</b>：${esc(a.description)}</p>${body(a.prompt, '子代理提示词')}`,
            )
            .join(''),
      );
      break;
    case 'program_fact':
    case 'user_message': {
      const program = r.type === 'program_fact';
      const preface = prefaceFor.get(line);
      // W12 起每条前还写谁说的、距学习者上次说话多久（导出这里只重写行号、时间、谁）
      const text = `[第 ${line} 行 · ${localMinute(r.at)} · ${program ? '程序' : '学习者'}] ${quotePrefix(r.quote)}${r.text}`;
      const delivered = `${preface !== undefined ? `${wrapFact(preface)}\n\n` : ''}${program ? wrapFact(text) : text}`;
      block(
        program ? 'input program' : 'input learner',
        program ? '输入 · 程序拼的' : '输入 · 学习者',
        r.at,
        line,
        body(delivered, '这条输入'),
      );
      break;
    }
    case 'thread_message': {
      // W12 §3.1：别的会话发来的话（学习者看不到），附的学习者原话照 Claude 的 <cited>
      const preface = prefaceFor.get(line);
      const cited = (r.cited ?? []).map(
        (c) =>
          `<cited author="learner" session="${c.session}" line="${c.line}" at="${localMinute(c.at)}">\n${c.text}\n</cited>`,
      );
      const text = [
        `[第 ${line} 行 · ${localMinute(r.at)} · ${r.from} ${r.reply ? '回话' : '发来'}]`,
        r.text,
        ...cited,
        // W14 §1.2：程序附给模型、不算对话原文的内容，接在最后（与 hub.ts message() 一致）
        ...(r.attached ? [`\n（程序附）${r.attached}`] : []),
      ].join('\n');
      block(
        'input program',
        r.reply ? '输入 · 别的会话回话' : '输入 · 别的会话发来',
        r.at,
        line,
        body(`${preface !== undefined ? `${preface}\n\n` : ''}${text}`, '这条输入'),
      );
      break;
    }
    case 'turn_stopped':
      event(r.at, line, '学习者点了停止（下一条输入前面接“学习者停止了生成”）');
      break;
    case 'message_edited':
      if (r.by === 'learner') {
        block(
          'input learner',
          '输入 · 学习者改了刚发的那句',
          r.at,
          line,
          body(`学习者把上一句（第 ${r.line} 行）改成：${r.text}`, '这条输入'),
        );
      } else event(r.at, line, `主对话改了自己第 ${r.line} 行的话：${r.text}`);
      break;
    case 'thread_deleted':
      event(r.at, line, `学习者删了「${r.title}」（${r.session}；下一条输入前面接一句）`);
      break;
    case 'model_raw': {
      const p = r.payload ?? {};
      const content =
        typeof p.content === 'string' ? [{ type: 'text', text: p.content }] : (p.content ?? []);
      if (p.role === 'assistant') {
        const parts = content.map((b) => {
          if (b.type === 'thinking')
            return b.thinking
              ? `<div class="think">${body(b.thinking, '思考')}</div>`
              : '<div class="think muted">（思考：接口没返回内容，只有签名）</div>';
          if (b.type === 'text') return body(b.text, '话');
          if (b.type === 'tool_use')
            return `<div class="tool">调工具 <code>${esc(b.name)}</code>${body(JSON.stringify(b.input, null, 2), '参数')}</div>`;
          return pre(JSON.stringify(b, null, 2));
        });
        block('model', `模型（${p.model ?? ''}）`, r.at, line, parts.join(''));
      } else if (p.role === 'user') {
        const parts = content.map((b) => {
          if (b.type === 'tool_result') {
            const c =
              typeof b.content === 'string'
                ? b.content
                : (b.content ?? []).map((x) => x.text ?? JSON.stringify(x)).join('\n');
            return `<div class="${b.is_error ? 'tool err' : 'tool'}">工具返回${b.is_error ? '（出错）' : ''}${body(c, '返回内容')}</div>`;
          }
          if (b.type === 'text')
            return `<p class="warn">SDK 自己塞进上下文的一句：</p>${body(b.text, '内容')}`;
          return pre(JSON.stringify(b, null, 2));
        });
        block('result', '返回给模型', r.at, line, parts.join(''));
      }
      break;
    }
    case 'model_used':
      event(r.at, line, `实际执行模型：${r.model}`);
      break;
    case 'context_used':
      event(r.at, line, `这一轮跑完：上下文 ${r.tokens} tokens，输出 ${r.output}`);
      break;
    case 'component_action':
      event(
        r.at,
        line,
        `学习者动了组件（${r.awaited ? '立刻跑一轮' : '攒着，下次输入时附上'}）：${r.text}`,
      );
      break;
    case 'turn_failed':
      event(r.at, line, `这一轮没跑成：${r.reason}`);
      break;
    case 'subagent_started':
      event(r.at, line, `派子代理：${r.brief ?? ''}`);
      break;
    case 'subagent_result':
      event(r.at, line, `子代理交回`);
      break;
    case 'close_requested':
      event(r.at, line, `申请收尾${r.summary ? `：${r.summary}` : ''}`);
      break;
    case 'loop_ended':
      event(r.at, line, '这次学习结束');
      break;
    default:
      // 和上面重复的（assistant_message、tool_call、sandbox_action 是 model_raw 的另一份）与纯程序记录不列
      break;
  }
}

const head = `<h1>${esc(opened?.title ?? id)}</h1>
<p class="muted">会话 ${esc(id)} · 种类 ${esc(kind)} · 开于 ${esc(localSecond(opened?.at ?? ''))}${
  opened?.parent ? ` · 由 ${esc(opened.parent)} 开` : ''
}</p>
${
  children.length > 0
    ? `<p>这个会话开出的会话（各自导出：<code>npm run context -- &lt;id&gt;</code>）：</p><ul>${children
        .map((c) => `<li><code>${esc(c.id)}</code> ${esc(c.kind)} ${esc(c.title)}</li>`)
        .join('')}</ul>`
    : ''
}
<p class="muted">白底 = 进了模型上下文的；灰色小字 = 程序侧的事，模型看不到（组件操作会在下一条输入里附上）。</p>`;

const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>上下文 · ${esc(opened?.title ?? id)}</title><style>
:root{--bg:#fafaf8;--fg:#1d1d1b;--muted:#77756f;--card:#fff;--line:#e2e0da;--model:#eef3fb;--learner:#f3f9ee;--program:#fbf6ea;--warn:#a1520b}
@media (prefers-color-scheme:dark){:root{--bg:#1b1b1a;--fg:#e8e6e1;--muted:#9a978f;--card:#242422;--line:#3a3935;--model:#1f2733;--learner:#1f2a1d;--program:#2c2719;--warn:#e0a060}}
body{background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,sans-serif;max-width:960px;margin:0 auto;padding:16px}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin:10px 0}
section.model{background:var(--model)}section.learner{background:var(--learner)}section.program,section.system{background:var(--program)}
.meta{display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:6px}.meta span,.muted{color:var(--muted)}
pre{white-space:pre-wrap;word-break:break-word;margin:4px 0;font:13px/1.55 ui-monospace,monospace}
.event{color:var(--muted);font-size:12px;margin:4px 14px}.warn{color:var(--warn);font-size:13px}
.tool{border-left:3px solid var(--line);padding-left:8px;margin:6px 0}.tool.err{border-color:#c0392b}.think{opacity:.8}
summary{cursor:pointer;color:var(--muted);font-size:13px}code{font-size:13px}
</style></head><body>${head}${out.join('\n')}</body></html>`;

const outPath = outArg !== undefined ? resolve(outArg) : join(data, '导出', '上下文', `${id}.html`);
if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.log(outPath);
