// 测：走完主路径（合上一次、没合上一次）后，所有会话正本里程序写的东西——记录类型与字段名、会话 id、开场与程序事实、
// 工具结果、会话名、触发原因、路线决定——都不含 M0x / M1x / 闭环。模型说的话（assistant_message、model_raw、续接凭据）不查。
// 书库目录名 m07/（书库处理/ 的产出格式）与临时数据目录的路径先抹掉再查。依据：工单 README §2.8；工单 W7 §3、§4.1。
import { afterEach, describe, expect, it } from 'vitest';
import { SAMPLE_DIR, type App } from '../../src/core/app.ts';
import { boot, mainPath, rows, sessions } from './共用/w7-flow.ts';

const OLD = /[mM](?:0[5-9]|1[0-5])|闭环/;
const MODEL_WRITTEN = new Set(['assistant_message', 'model_raw', 'model_session']);

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

describe('正本里程序写的文字不含旧叫法', () => {
  it('合上一次、没合上一次之后，每个会话的程序记录都不含 M0x / M1x / 闭环', async () => {
    const b = await boot();
    apps.push(b.app);
    await mainPath(b);

    const strip = (s: string): string =>
      s
        .split(b.dataRoot)
        .join('⟦数据⟧')
        .split(SAMPLE_DIR)
        .join('⟦样例⟧')
        .replace(/\/m07\b/g, '/⟦书目录⟧');
    const hits: string[] = [];
    let checked = 0;
    for (const s of await sessions(b.app)) {
      for (const r of await rows(b.app, s.sessionId)) {
        if (MODEL_WRITTEN.has(r.record.type)) continue;
        checked++;
        const text = strip(JSON.stringify(r.record));
        const m = OLD.exec(text);
        if (m) {
          const at = Math.max(0, m.index - 30);
          hits.push(
            `${s.kind} ${s.sessionId}:${String(r.line)} ${r.record.type}：…${text.slice(at, m.index + 30)}…`,
          );
        }
      }
    }
    expect(checked, '应查过不少程序记录').toBeGreaterThan(20);
    expect(hits, '这些程序记录里还有旧叫法').toEqual([]);
  });
});
