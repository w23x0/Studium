// npm run eval -- [--k 3] [--case <id>]：跑行为评测目录，打印每条过 / 不过；有不过的退出码为 1。
// 不进每次提交的门禁。被评的系统、模拟学生、判分现在都接假模型（fake-world.ts）；
// 换成真模型要产品负责人定（会花额度），换的地方只有 fakeModels 这一处。
import { CASES } from './cases.ts';
import { fakeModels } from './fake-world.ts';
import { runEvals } from './run.ts';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const k = Number(flag('--k') ?? 3);
const only = flag('--case');
const cases = only === undefined ? CASES : CASES.filter((c) => c.id === only);
if (cases.length === 0) {
  console.error(`没有这条评测：${only ?? ''}。有：${CASES.map((c) => c.id).join('、')}`);
  process.exit(2);
}

const results = await runEvals({ cases, k, models: fakeModels() });
for (const r of results) {
  console.log(`${r.pass ? '✓' : '✗'} ${r.id}（${r.failureMode}）`);
  r.runs.forEach((run, i) => {
    for (const v of run.filter((x) => !x.pass)) {
      console.log(`    第 ${String(i + 1)} 次 · ${v.judge}：${v.reason}`);
    }
  });
}
const failed = results.filter((r) => !r.pass).length;
console.log(
  `\n${String(results.length - failed)}/${String(results.length)} 条 ${String(k)} 次全过`,
);
process.exit(failed > 0 ? 1 : 0);
