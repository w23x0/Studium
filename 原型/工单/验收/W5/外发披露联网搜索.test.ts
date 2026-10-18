// 验收（W5）：外发披露写明哪些会话会联网搜索（docs/设计/00-定位与原则.md 横切原则：内容送往哪里可知；
// 会话/畅谈.md、会话/导航.md 外部搜索 D-13）。GET /api/disclosure 加 webSearch: { sessions[{kind,label}], note }，
// 列的种类与程序实际放开搜索的会话一致（畅谈、导航），不含学习对话、守卫、主对话；sends 里写明搜索词会送出。
import { afterEach, describe, expect, it } from 'vitest';
import type { App } from '../../src/core/app.ts';
import type { DisclosureResponse } from '../../src/shared/protocol.ts';
import { getJson, post, records, waitFor } from '../helpers/http.ts';
import { boot, newW5, specsWith } from './共用/w5-flow.ts';

const apps: App[] = [];
afterEach(async () => {
  for (const a of apps.splice(0)) await a.close();
});

type WithSearch = DisclosureResponse & {
  webSearch?: { sessions?: { kind: string; label: string }[]; note?: string };
};

describe('外发披露：联网搜索', () => {
  it('列出会联网搜索的会话（畅谈、导航），不列学习对话、守卫、主对话', async () => {
    const st = newW5();
    const { app, fake, mainId } = await boot(st);
    apps.push(app);
    // 出一张卡，好从假模型看到导航会话的种类（不写死种类字符串，W7 会改名）
    await post(app, '/cards/request', { projectId: mainId });
    await waitFor(
      '出了选择卡',
      async () => (await records(app, mainId)).some((r) => r.record.type === 'choice_card'),
      3000,
    );
    await app.studium.settled();
    const navKind = specsWith(fake, 'submit_choice_card')[0]?.session?.kind;
    expect(navKind, '导航会话有种类').toBeDefined();

    const d = await getJson<WithSearch>(app, '/disclosure');
    const kinds = (d.webSearch?.sessions ?? []).map((s) => s.kind);
    expect(kinds, '畅谈会联网搜索').toContain('talk');
    expect(kinds, '导航会联网搜索').toContain(navKind);
    for (const k of ['loop', 'guard', 'main']) {
      expect(kinds, `${k} 不联网搜索`).not.toContain(k);
    }
    for (const s of d.webSearch?.sessions ?? []) {
      expect(s.label.trim(), '每类给日常叫法').not.toBe('');
    }
    expect(d.webSearch?.note?.trim() ?? '', '说明搜索词与网址经模型服务发出').toMatch(/搜索/);
    expect(
      d.sends.some((x) => x.includes('搜索')),
      '“会送出去的内容”里写明联网搜索的搜索词',
    ).toBe(true);
  }, 20000);
});
