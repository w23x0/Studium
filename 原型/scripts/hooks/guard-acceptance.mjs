// PreToolUse（Edit / Write）：已有的验收测试不许改（新功能可以新建验收测试文件）。
import { existsSync } from 'node:fs';
import { inApp, readInput } from './lib.mjs';

const input = await readInput();
const file = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
const rel = inApp(file);
if (rel === undefined || !rel.startsWith('tests/验收/')) process.exit(0);
if (input.tool_name === 'Write' && !existsSync(file)) process.exit(0);

process.stderr.write(
  `不能改已有的验收测试（${rel}）：验收测试是功能的判据，改实现让它通过，不改它。` +
    '确实要改，先在对话里说明理由、请产品负责人同意，再由人手动改。\n',
);
process.exit(2);
