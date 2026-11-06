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
  /** 这次学习读得到的以往学习（W21：和只读区学过的记录同一范围：学习对话、没删）。 */
  readableLoop: (loopId: string) => boolean;
  /** 一次学习里每个组件的最新一版。 */
  componentsOf: (loopId: string) => Promise<{ name: string; html: string }[]>;
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
  /** 交一版组件：查得通、试跑过才记 component_version；页面改动由 put_component 这条 tool_call 决定（见 derived）。 */
  const put = async (name: string, html: string, after: string | undefined) => {
    await o.assertOpen(loopId);
    if (Buffer.byteLength(html, 'utf8') > MAX_BLOCK_BYTES) {
      return err(
        `组件太大（最多 ${String(MAX_BLOCK_BYTES / 1024)} KB）；大段数据用脚本生成，别写死在里面。`,
      );
    }
    const args = { name, html, ...(after !== undefined ? { after } : {}) };
    const check = async () =>
      applyStreamOp(
        replayStream(await o.hub().records(loopId)),
        STREAM_TOOLS.put,
        args,
        Number.MAX_SAFE_INTEGER,
      );
    const first = await check();
    if ('error' in first) return err(first.error);
    const trial = await o.screens.trial(loopId, [{ id: 'b1', html }]);
    if (trial !== undefined && !trial.ok) {
      return err(`试跑报错：${trial.error ?? '（没说是什么错）'}。这一版没上页面；改了再交。`);
    }
    // 试跑要等几秒，这期间学习者可能说了话、页面变了：照最新的页面再试一次，和放正本时算的一样
    const next = await check();
    if ('error' in next) return err(`试跑期间页面变了：${next.error}`);
    // 组件的每一版照样记进事件记录（按块按指纹存一份）
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
  };
  /**
   * 改一处、拿以前的（W21）：算出完整的一版后走同一条路。页面只从 put_component 的 tool_call 放出来，这两个工具的
   * 调用里没有整份 HTML，所以程序替它补记一条，放页面的逻辑（stream-page.ts）不用动。
   */
  const derived = async (name: string, html: string, after: string | undefined) => {
    const done = await put(name, html, after);
    if (done.isError !== true) {
      await o.hub().record(loopId, {
        type: 'tool_call',
        at: o.iso(),
        name: STREAM_TOOLS.put,
        args: { name, html, ...(after !== undefined ? { after } : {}) },
        result: done.text,
        isError: false,
      });
    }
    return done;
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
      run: (a) =>
        put(
          typeof a.name === 'string' ? a.name.trim() : '',
          typeof a.html === 'string' ? a.html : '',
          typeof a.after === 'string' ? a.after : undefined,
        ),
    },
    {
      name: 'edit_component',
      description:
        '改页面上（或拿掉过的）一个组件，像改文件一样：把它当前这一版里的 old_string 换成 new_string，不用重发整份。old_string 要在组件里唯一（不唯一就多带点上下文，或开 replace_all）。改完算新一版，照旧先试跑。',
      input: {
        name: z.string().describe('组件的名字'),
        old_string: z.string().describe('组件代码里要换掉的原文，照原样'),
        new_string: z.string().describe('换成什么；空 = 删掉这段'),
        replace_all: z.boolean().optional().describe('所有出现处都换'),
      },
      run: async (a) => {
        await o.assertOpen(loopId);
        const name = typeof a.name === 'string' ? a.name.trim() : '';
        const from = typeof a.old_string === 'string' ? a.old_string : '';
        const to = typeof a.new_string === 'string' ? a.new_string : '';
        const page = replayStream(await o.hub().records(loopId));
        const was = [...page.on, ...page.off].find((b) => b.id === `c:${name}`);
        if (was === undefined) return err(`这次学习里没有组件「${name}」。`);
        if (from === '') return err('old_string 是空的。');
        if (from === to) return err('old_string 和 new_string 一样，没有要改的。');
        const count = was.text.split(from).length - 1;
        if (count === 0) return err(`组件「${name}」当前这一版里找不到这段原文。`);
        if (count > 1 && a.replace_all !== true) {
          return err(
            `组件「${name}」里找到 ${String(count)} 处。要全部替换就把 replace_all 设为 true；只换一处就多给点上下文。`,
          );
        }
        return derived(name, was.text.split(from).join(to), undefined);
      },
    },
    {
      name: 'reuse_component',
      description:
        '把以前某次学习里的组件（最新一版）直接放到这次的页面上，不用重画；之后可以用 edit_component 接着改。组件代码在 只读/学过的记录/ 里能读。放上前照旧先试跑。',
      input: {
        from: z.string().describe('那次学习的 id'),
        component: z.string().describe('那次的组件名字'),
        name: z.string().optional().describe('这次叫什么；不给就用原名（同名 = 换新版）'),
        after: z.string().optional().describe(`放在哪一块后面（${BLOCK_REF}），或 top`),
      },
      run: async (a) => {
        await o.assertOpen(loopId);
        const from = typeof a.from === 'string' ? a.from.trim() : '';
        const component = typeof a.component === 'string' ? a.component.trim() : '';
        if (!o.readableLoop(from)) return err(`读不到学习 ${from}（id 不对，或已删）。`);
        const found = (await o.componentsOf(from)).find((c) => c.name === component);
        if (found === undefined) return err(`学习 ${from} 里没有组件「${component}」。`);
        const name = typeof a.name === 'string' && a.name.trim() !== '' ? a.name.trim() : component;
        return derived(name, found.html, typeof a.after === 'string' ? a.after : undefined);
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
