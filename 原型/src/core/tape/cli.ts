// npm run replay -- <录带文件> [--data <目录>]：离线回放一次录下的运行，不调模型；打印与录带不一致之处。
// 回放的数据目录默认是一个新的临时目录，跑完留着，便于对照正本。
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { replayTape } from './replay.ts';

const args = process.argv.slice(2);
const tape = args.find((a) => !a.startsWith('--'));
if (tape === undefined) {
  console.error('用法：npm run replay -- <录带文件> [--data <回放数据目录>]');
  process.exit(2);
}
const dataFlag = args.indexOf('--data');
const dataRoot =
  dataFlag >= 0 && args[dataFlag + 1] !== undefined
    ? resolve(args[dataFlag + 1] ?? '')
    : await mkdtemp(join(tmpdir(), 'studium-replay-'));

const report = await replayTape(resolve(tape), { dataRoot });
console.log(`回放完：${String(report.actions)} 个学习者动作、${String(report.turns)} 轮模型对话`);
console.log(`回放的数据目录：${dataRoot}`);
if (report.problems.length === 0) {
  console.log('与录带一致');
  process.exit(0);
}
console.log(`与录带不一致 ${String(report.problems.length)} 处：`);
for (const p of report.problems) console.log(`- ${p}`);
process.exit(1);
