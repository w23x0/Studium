// 独立审查子代理（04「质量」P1）：开一个全新上下文的 Claude（默认换成 Sonnet，与写代码的模型不同），
// 只读工具，只报正确性问题与需求缺口，不报风格、不改代码。审查意见不条条照改，由主会话判断。
//
// 用法：npm run review [-- --base <git 引用>] [--model <模型>] [--dry-run]
//   --base     与哪个提交比（默认 HEAD：审工作区里还没提交的改动）
//   --model    审查用的模型（默认 STUDIUM_REVIEW_MODEL 或 sonnet）
//   --dry-run  只打印将要执行的命令与提示词，不调模型
// 结果打印到终端，并存一份到 var/reviews/<时间>.md（var/ 不进 git）。
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const base = flag('--base') ?? 'HEAD';
const model = flag('--model') ?? process.env.STUDIUM_REVIEW_MODEL ?? 'sonnet';
const dryRun = args.includes('--dry-run');

function git(...a) {
  const r = spawnSync('git', ['-c', 'core.quotePath=false', ...a], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')} 失败：${r.stderr}`);
  return r.stdout;
}

const changed = git('diff', '--name-only', base, '--', '.').trim();
const untracked = git('ls-files', '--others', '--exclude-standard', '--', '.').trim();
if (changed === '' && untracked === '') {
  console.log(`相对 ${base} 没有改动，不用审。`);
  process.exit(0);
}

const prompt = `你是 Studium 原型代码的独立审查者。你没有参与写这些代码；只用只读工具（Read、Grep、Glob）看仓库。

审什么：原型/ 目录相对 git ${base} 的改动。
改过的文件：
${changed || '（无）'}
新文件：
${untracked || '（无）'}
要看改动内容，直接读这些文件；对照的旧版本可以不看。

只报两类问题，别的一律不报（不报风格、命名、格式、“可以更好”的建议）：
1. 正确性：会出错的地方——逻辑错误、竞态、异常被吞、只追加的正本被改写、测试没测到它声称测的东西、类型绕过。
2. 需求缺口：实现与设计不符或漏了——设计以 docs/模块需求设计/（产品权威）为准，怎么跑以 docs/Harness设计/03-运行设计.md 为准，
   选型以 docs/Harness设计/04-实现选型.md 为准，写代码的规矩见 原型/CLAUDE.md。设计里没定的不算缺口。

每条写：文件:行号 · 问题（一句话）· 为什么是问题（引代码或设计原文的位置）· 有多确定（确定 / 可能 / 不确定）。
没把握的标“不确定”，不要用推断填满。没有问题就说没有。最后按严重程度排一个序。`;

const cmd = [
  'claude',
  '-p',
  prompt,
  '--model',
  model,
  '--allowedTools',
  'Read,Grep,Glob',
  '--disallowedTools',
  'Edit,Write,Bash,NotebookEdit',
];

if (dryRun) {
  console.log(
    `将执行：claude -p <提示词 ${String(prompt.length)} 字> --model ${model} --allowedTools Read,Grep,Glob --disallowedTools Edit,Write,Bash,NotebookEdit`,
  );
  console.log('（在仓库根目录执行，审查者能读 docs/ 与 原型/）\n');
  console.log(prompt);
  process.exit(0);
}

const r = spawnSync(cmd[0], cmd.slice(1), {
  cwd: '..',
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
});
if (r.error) {
  console.error(`没能启动 claude：${r.error.message}（本机要先装好并登录 Claude Code）`);
  process.exit(1);
}
const out = r.stdout ?? '';
console.log(out);
const dir = join('var', 'reviews');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
writeFileSync(file, `# 独立审查（${model}，相对 ${base}）\n\n${out}`);
console.log(`\n已存：${file}`);
process.exit(r.status ?? 1);
