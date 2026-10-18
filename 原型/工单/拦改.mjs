// 施工会话（claude --settings 原型/工单/deepseek-settings.json）额外加载的 PreToolUse hook：
// 不许改设计文档（docs/）和工单本身（原型/工单/，进度/ 除外）。验收测试由仓库原有的 hook 拦。
import { relative, resolve } from 'node:path';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const input = raw === '' ? {} : JSON.parse(raw);
const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
if (typeof file !== 'string' || file === '') process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const rel = relative(root, resolve(file)).split('\\').join('/');
const blocked =
  rel.startsWith('docs/') || (rel.startsWith('原型/工单/') && !rel.startsWith('原型/工单/进度/'));
if (!blocked) process.exit(0);

process.stderr.write(
  `施工会话不改 ${rel}：设计文档和工单是给你的依据，不是要改的东西。` +
    '觉得它们有错或说不通，写进 原型/工单/进度/<本单>.md 的“问题”一节，接着做别的。\n',
);
process.exit(2);
