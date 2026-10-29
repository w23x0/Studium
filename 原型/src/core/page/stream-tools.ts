// 竖流学习页的页面工具（10-29 #74 试验）：主模型一个人管页面——读、改（照 Claude Code 的 Edit）、拿掉、挪、拿回、
// 交组件。页面从正本放一遍算出来（src/shared/stream-page.ts），工具只当场检查这次改得通不通；改得通，hub 记下的
// 那条 tool_call 就是这次改动。组件交上前先在学习者浏览器里试跑，报错写进这次结果、不上页面。
import { z } from 'zod';
import type { ComponentManifest } from '../../shared/screen.ts';
import {
  applyStreamOp,
  replayStream,
  STREAM_TOOLS,
  streamPageText,
} from '../../shared/stream-page.ts';
import type { Hub } from '../hub.ts';
import type { ToolResult, ToolSpec } from '../model/port.ts';
import type { Screens } from './screens.ts';
import { MAX_BLOCK_BYTES, type PageStore } from './store.ts';

export interface StreamToolDeps {
  hub: () => Hub;
  screens: Screens;
  store: PageStore;
  iso: () => string;
  assertOpen: (loopId: string) => Promise<void>;
}

const BLOCK_REF = '哪一块：“第 N 行”、“组件「名」”，或页面上那块里唯一的一段原文';

export function streamTools(o: StreamToolDeps, loopId: string): ToolSpec[] {
  /** 照现在的页面试一下这次改动；改得通返回成功的话（hub 随后记下这次调用，页面就这样改了）。 */
  const tryOp = async (tool: string, args: Record<string, unknown>, done: string) => {
    await o.assertOpen(loopId);
    const records = await o.hub().records(loopId);
    const next = applyStreamOp(replayStream(records), tool, args, Number.MAX_SAFE_INTEGER);
    return 'error' in next ? err(next.error) : ok(done);
  };
  return [
    {
      name: STREAM_TOOLS.read,
      description:
        '看学习者现在的页面：从上到下每块一个头（第几行、谁写的；组件只给名字和第几版），正文照原样；末尾列拿掉了的（能拿回）。',
      input: {},
      run: async () => ok(streamPageText(replayStream(await o.hub().records(loopId)))),
    },
    {
      name: STREAM_TOOLS.edit,
      description:
        '改页面上以前的内容，像改文件一样：把 old_string 换成 new_string。old_string 要在页面上唯一（不唯一就多带点上下文，或开 replace_all），只在一块之内；换成空 = 拿掉那一段，整块空了就拿掉整块。学习者的话不能改，只能整块拿掉或挪。',
      input: {
        old_string: z.string().describe('页面上要换掉的原文，照原样'),
        new_string: z.string().describe('换成什么；空 = 删掉这段'),
        replace_all: z.boolean().optional().describe('页面上所有出现处都换'),
      },
      run: (a) => {
        const removing = typeof a.new_string === 'string' && a.new_string.trim() === '';
        return tryOp(STREAM_TOOLS.edit, a, removing ? '页面上那段已删掉。' : '页面上那段已改好。');
      },
    },
    {
      name: STREAM_TOOLS.remove,
      description: '把一块从页面上拿掉（以后能用 bring_back 拿回）。',
      input: { block: z.string().describe(BLOCK_REF) },
      run: (a) => tryOp(STREAM_TOOLS.remove, a, '那一块已从页面上拿掉。'),
    },
    {
      name: STREAM_TOOLS.move,
      description: '把页面上的一块挪到另一块后面（after 写 top = 挪到最上面）。',
      input: {
        block: z.string().describe(`要挪的${BLOCK_REF}`),
        after: z.string().describe(`挪到哪一块后面（同样的写法），或 top`),
      },
      run: (a) => tryOp(STREAM_TOOLS.move, a, '挪好了。'),
    },
    {
      name: STREAM_TOOLS.back,
      description: '把拿掉过的一块拿回页面：放在 after 那块后面；不给 after 就接在最下面。',
      input: {
        block: z.string().describe(`拿掉过的${BLOCK_REF}`),
        after: z.string().optional().describe('放在哪一块后面，或 top'),
      },
      run: (a) => tryOp(STREAM_TOOLS.back, a, '拿回来了。'),
    },
    {
      name: STREAM_TOOLS.put,
      description:
        '交一个组件（一份完整的 HTML，跑在学习者浏览器里不联网的小窗里）：新的默认接在页面最下面（after 可指定放在哪块后面）；同名再交 = 换新版，在页面上就原位换。交上前先在学习者浏览器里试跑，报错就不上页面、错写在结果里。',
      input: {
        name: z.string().describe('组件的名字（几个字，学习者和你都用它指这个组件）'),
        html: z.string().describe('完整的 HTML（含脚本与样式）'),
        after: z.string().optional().describe(`放在哪一块后面（${BLOCK_REF}），或 top`),
      },
      run: async (a) => {
        await o.assertOpen(loopId);
        const name = typeof a.name === 'string' ? a.name.trim() : '';
        const html = typeof a.html === 'string' ? a.html : '';
        if (Buffer.byteLength(html, 'utf8') > MAX_BLOCK_BYTES) {
          return err(
            `组件太大（最多 ${String(MAX_BLOCK_BYTES / 1024)} KB）；大段数据用脚本生成，别写死在里面。`,
          );
        }
        const records = await o.hub().records(loopId);
        const page = replayStream(records);
        const next = applyStreamOp(page, STREAM_TOOLS.put, a, Number.MAX_SAFE_INTEGER);
        if ('error' in next) return err(next.error);
        const trial = await o.screens.trial(loopId, [{ id: 'b1', html }]);
        if (trial !== undefined && !trial.ok) {
          return err(`试跑报错：${trial.error ?? '（没说是什么错）'}。这一版没上页面；改了再交。`);
        }
        // 组件的每一版照样记进事件记录（按块按指纹存一份，同区域图那边的组件）
        const hash = await o.store.putBlock(loopId, html);
        const m: ComponentManifest = { blocks: [{ id: 'b1', hash, summary: name }] };
        const manifest = await o.store.putManifest(loopId, m);
        const version = next.on.concat(next.off).find((b) => b.id === `c:${name}`)?.version ?? 1;
        await o.hub().record(loopId, {
          type: 'component_version',
          at: o.iso(),
          component: name,
          version,
          manifest,
          pointer: name,
          trialed: trial !== undefined,
        });
        return ok(
          `组件「${name}」已放上页面${version > 1 ? `（第 ${String(version)} 版）` : ''}${trial === undefined ? '；学习者这会儿没开着页面，没试跑' : ''}。`,
        );
      },
    },
  ];
}

function ok(text: string): Promise<ToolResult> {
  return Promise.resolve({ text });
}

function err(text: string): Promise<ToolResult> {
  return Promise.resolve({ text, isError: true });
}
