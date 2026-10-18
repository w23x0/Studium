// 闭环中途（批 5）：教学侧通知 M05（前置缺口 / 学习者想分叉）→ M05 在闭环里出小卡 → 学习者选
// → 开分叉闭环（记来源、原因、返回条件）/ 接着学 / 搁置；分叉结束回父闭环；没合上或搁置时记停车记录。
// 对应 M04:21-22 · M05:18-19,26-28,42 · M01:16,18-19。设计没写的地方的补法见 工作单.md「补位清单」。
import { z } from 'zod';
import {
  START_SOURCES,
  type DetourMade,
  type DetourOption,
  type ForkOrigin,
  type M05Job,
  type NumberedRecord,
  type ParkingNote,
  type Ticket,
} from '../shared/records.ts';
import { foldLoop, MAX_FORK_DEPTH } from './loop-state.ts';
import type { Hub } from './hub.ts';
import type { ToolResult, ToolSpec } from './model/port.ts';
import { learnerLines, renderTranscript } from './transcript.ts';

/** 单子的最基本核对（工单 §4.4）：新点与预期理解非空、出发点来源在三种里。 */
function badTicket(t: Ticket): string | undefined {
  if (t.newPoint.trim() === '') return '新点是空的';
  if (t.clause.trim() === '') return '预期理解是空的';
  for (const s of t.startPoints) {
    if (!(START_SOURCES as readonly string[]).includes(s.source)) {
      return `出发点的来源 ${s.source} 不在 ${START_SOURCES.join(' / ')} 里`;
    }
  }
  return undefined;
}
import { BadRequestError } from './studium.ts';

export interface DetourDeps {
  hub(): Hub;
  iso(): string;
  newId(prefix: string): string;
  describeTicket(t: Ticket): string;
  /** M05 通用开场（方向、期限、资料、M09、闭环状态与数量、停车场）。 */
  m05Opening(trigger: string, mainId: string): Promise<string>;
  /** 闭环开场（单子 + 知识片段 + “现在开始”）。 */
  loopOpening(t: Ticket): string;
  /** M05 会话共用的只读工具。 */
  m05ReadTools(sessionId: string): ToolSpec[];
}

/** 一个 M05 会话在干哪件活（不是出下一闭环的选择卡）；写在该会话正本的开场记录里（m05Job）。 */
type Job = M05Job;

/** 重启后重做一件没交完的活时，开场前加的这句（也用来认出“已经重做过一次”，不再重做）。 */
const RESTARTED = '（服务中途重启过，这件活上次没交完。照下面的说明从头做一遍，交回一次。）';

interface ParkingInput {
  missing: { point?: string; text: string }[];
  when: string;
  resumeFrom: string;
  basisLines: number[];
}

export class Detours {
  /** M05 会话 id → 它干的活（正本开场记录的缓存；启动时由 restore 重建）。 */
  private readonly jobs = new Map<string, Job>();
  private readonly cards = new Map<string, { options: DetourOption[]; recommended: number }>();
  private readonly parks = new Map<string, ParkingInput>();

  constructor(private readonly d: DetourDeps) {}

  /** M05 会话的工具：是小卡 / 停车记录这两件活就给对应交回工具，否则返回空（走出选择卡那套）。 */
  m05Tools(sessionId: string): ToolSpec[] | undefined {
    const job = this.jobs.get(sessionId);
    if (job === undefined) return undefined;
    return [
      ...this.d.m05ReadTools(sessionId),
      job.kind === 'detour'
        ? this.detourCardTool(sessionId, job)
        : this.parkingTool(sessionId, job),
    ];
  }

  // ───────────── 教学侧通知 M05 → 小卡 ─────────────

  async raise(
    loopId: string,
    a: {
      kind: 'gap' | 'branch';
      missingPoint?: string;
      missingText: string;
      basisLines: number[];
      note?: string;
    },
  ): Promise<ToolResult> {
    const opened = await this.d.hub().opened(loopId);
    const recs = await this.d.hub().records(loopId);
    const flags = foldLoop(recs);
    if (flags.ended !== undefined) return fail('这个闭环已经结束了。');
    if (flags.shelved !== undefined) return fail('这个闭环搁置着。');
    if (flags.waitingFork !== undefined) {
      return fail(`正在等分叉闭环 ${flags.waitingFork} 回来，先不要再开新的分叉。`);
    }
    if (flags.openDetour !== undefined) {
      return fail('上一张小卡学习者还没选，等他选完。');
    }
    if ((await this.depthOf(loopId)) >= MAX_FORK_DEPTH) {
      return fail(`分叉已经嵌了 ${String(MAX_FORK_DEPTH)} 层，先把里面的收尾，不再往下分。`);
    }
    if (a.missingText.trim() === '') return fail('missing_text 不能是空的：写清缺什么 / 想去哪。');
    if (a.basisLines.length === 0) return fail('basis_lines 至少给一行学习者的原话。');
    const learner = learnerLines(recs);
    const bad = a.basisLines.filter((l) => !learner.has(l));
    if (bad.length > 0) {
      return fail(`第 ${bad.join('、')} 行不是学习者说的话；依据只指回学习者的原话行。`);
    }
    const signalLine = await this.d.hub().record(loopId, {
      type: 'route_signal',
      at: this.d.iso(),
      kind: a.kind,
      ...(a.missingPoint !== undefined ? { missingPoint: a.missingPoint } : {}),
      missingText: a.missingText.trim(),
      basisLines: a.basisLines,
      ...(a.note !== undefined && a.note.trim() !== '' ? { note: a.note.trim() } : {}),
    });
    const mainId = opened.parent;
    if (mainId === undefined) return fail('这个闭环不属于任何项目，无法出小卡。');
    const job: Job = { kind: 'detour', loopId, signalLine };
    const m05 = await this.d
      .hub()
      .createSession('m05', { title: '闭环中途小卡', parent: loopId, m05Job: job });
    this.jobs.set(m05.sessionId, job);
    const opening = await this.detourOpening(
      loopId,
      mainId,
      signalLine,
      await this.d.hub().records(loopId),
    );
    return this.runDetour(m05.sessionId, job, opening);
  }

  /** 让 M05 会话出小卡，交回了就贴进闭环。返回给教学侧的话。 */
  private async runDetour(sessionId: string, job: Job, opening: string): Promise<ToolResult> {
    await this.d.hub().send(sessionId, { role: 'program', text: opening });
    await this.d.hub().idle(sessionId);
    const card = this.cards.get(sessionId);
    this.cards.delete(sessionId);
    if (card === undefined || job.kind !== 'detour') {
      return fail(`M05 没有交回小卡（见会话 ${sessionId}）。你先照常往下教，需要时再通知一次。`);
    }
    await this.d.hub().record(job.loopId, {
      type: 'detour_card',
      at: this.d.iso(),
      cardId: this.d.newId('dcard'),
      m05SessionId: sessionId,
      signalLine: job.signalLine,
      options: card.options,
      recommended: card.recommended,
    });
    return ok(
      '小卡已经贴在这个闭环里，由学习者选（先补 / 先不管接着学）。你先用一两句话告诉学习者发现了什么、小卡在那里，不要替他选，也不要继续往下讲；他选完后程序会告诉你。',
    );
  }

  private async detourOpening(
    loopId: string,
    mainId: string,
    signalLine: number,
    recs: NumberedRecord[],
  ): Promise<string> {
    const opened = await this.d.hub().opened(loopId);
    const sig = recs.find((r) => r.line === signalLine)?.record;
    const sigText =
      sig?.type === 'route_signal'
        ? [
            `类型：${sig.kind === 'gap' ? '前置缺口（含自述 / 假定的出发点不牢）' : '学习者想岔开去学别的'}`,
            `缺的 / 想去的：${sig.missingPoint !== undefined ? this.pointText(sig.missingPoint) + '；' : ''}${sig.missingText}`,
            `依据（学习者原话行）：${sig.basisLines.map((l) => `L${String(l)}`).join('、')}`,
            ...(sig.note !== undefined ? [`教学侧补充：${sig.note}`] : []),
          ].join('\n')
        : '（缺）';
    return [
      await this.d.m05Opening(
        `闭环“${opened.title}”（${loopId}）进行中，教学侧通知：${sig?.type === 'route_signal' ? (sig.kind === 'gap' ? '发现前置缺口' : '学习者想分叉') : '路线需求'}`,
        mainId,
      ),
      '',
      '── 这次的活：闭环中途的小卡（不是出下一个闭环的选择卡）──',
      '这个闭环正在进行，学习者在里面。下面是教学侧的通知、该闭环的单子和对话原文。出一张小卡交给学习者在这个闭环里选：',
      '- 一个 fork 选项（先补缺的出发点 / 先去学想学的，开分叉闭环，补的点合上就回来）：给分叉闭环的单子（new_point、clause、start_points、route_action），补到原闭环够用为止（scope 写范围），不要扩成一大块；',
      '- 一个 continue 选项（先不管，接着学）：不带单子；',
      '- 可选一个 shelve 选项（先把这个闭环搁置起来）。',
      '共 2–3 个选项，推荐其中一个；标题和理由写给学习者看，用日常话，不出现内部词。用 submit_detour_card 交回，只交一次。',
      '',
      `该闭环的单子：${opened.ticket ? this.d.describeTicket(opened.ticket) : '（缺）'}`,
      '',
      '教学侧的通知：',
      sigText,
      '',
      '该闭环的对话原文：',
      renderTranscript(recs),
    ].join('\n');
  }

  private pointText(id: string): string {
    return id;
  }

  private detourCardTool(sessionId: string, job: Extract<Job, { kind: 'detour' }>): ToolSpec {
    const option = z.object({
      kind: z.enum(['fork', 'continue', 'shelve']),
      title: z.string().describe('给学习者看的一句话'),
      reason: z.string(),
      sources: z
        .array(z.string().min(1))
        .optional()
        .describe(
          '可回查的出处（闭环原文“会话 id:行号”、书里“书名/文件:行号”等）；学习者的原话行程序会补',
        ),
      new_point: z.string().optional().describe('fork：分叉要学的新点，一句话'),
      clause: z.string().optional().describe('fork：预期理解，一两句'),
      start_points: z
        .array(z.object({ point: z.string(), source: z.enum(START_SOURCES) }))
        .optional(),
      route_action: z.string().optional(),
      scope: z.string().optional().describe('fork：补到什么程度为止'),
    });
    return {
      name: 'submit_detour_card',
      description:
        '交回闭环中途的小卡：2–3 个选项，至少一个 fork（先补 / 先去学，开分叉）和一个 continue（先不管接着学），可再加一个 shelve；推荐其中一个（从 0 数）。只提交一次。',
      input: { options: z.array(option).min(2).max(3), recommended: z.number().int().min(0) },
      run: async (a) => {
        if (this.cards.has(sessionId)) return fail('已经提交过小卡');
        const raw = a.options as z.infer<typeof option>[];
        const recommended = a.recommended as number;
        if (recommended >= raw.length) return fail('推荐的序号超出选项范围');
        const count = (k: string): number => raw.filter((o) => o.kind === k).length;
        if (count('continue') !== 1) return fail('要有且只有一个 continue（先不管接着学）选项');
        if (count('fork') < 1) return fail('至少要有一个 fork（先补 / 先去学）选项');
        if (count('shelve') > 1) return fail('shelve 选项最多一个');
        const opened = await this.d.hub().opened(job.loopId);
        const sig = (await this.d.hub().records(job.loopId)).find(
          (r) => r.line === job.signalLine,
        )?.record;
        const basis =
          sig?.type === 'route_signal'
            ? sig.basisLines.map((l) => `${job.loopId}:${String(l)}`)
            : [];
        const problems: string[] = [];
        const options: DetourOption[] = [];
        raw.forEach((o, i) => {
          const base = {
            kind: o.kind,
            title: o.title,
            reason: o.reason,
            sources: [...(o.sources ?? []), ...basis],
          };
          if (o.kind !== 'fork') {
            options.push(base);
            return;
          }
          if (o.new_point === undefined || o.clause === undefined || o.start_points === undefined) {
            problems.push(`第 ${String(i)} 项 fork 要给 new_point、clause、start_points`);
            return;
          }
          const ticket: Ticket = {
            newPoint: o.new_point,
            clause: o.clause,
            startPoints: o.start_points.map((s) => ({ point: s.point, source: s.source })),
            routeAction:
              o.route_action !== undefined && o.route_action.trim() !== ''
                ? o.route_action
                : '补前置（分叉）',
            sourceCheck: [],
          };
          const p = badTicket(ticket);
          if (p !== undefined) problems.push(`第 ${String(i)} 项：${p}`);
          else if (o.new_point === opened.ticket?.newPoint) {
            problems.push(`第 ${String(i)} 项：分叉的新点不能就是本闭环正在学的新点`);
          }
          options.push({
            ...base,
            ticket,
            ...(o.scope !== undefined && o.scope.trim() !== '' ? { scope: o.scope.trim() } : {}),
          });
        });
        if (problems.length > 0) return fail(`${problems.join('；')}。改好后重新提交`);
        this.cards.set(sessionId, { options, recommended });
        return ok('小卡已收到');
      },
    };
  }

  // ───────────── 学习者在小卡上选 ─────────────

  async choose(
    loopId: string,
    cardId: string,
    option: number,
  ): Promise<{ choice: DetourMade['choice']; forkLoopSessionId?: string }> {
    const opened = await this.d.hub().opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const recs = await this.d.hub().records(loopId);
    const flags = foldLoop(recs);
    if (flags.ended !== undefined) throw new BadRequestError('这部分已经结束了。');
    if (flags.shelved !== undefined) throw new BadRequestError('这部分搁置着，先接着学再选。');
    const found = recs.find(
      (r) => r.record.type === 'detour_card' && r.record.cardId === cardId,
    )?.record;
    if (found?.type !== 'detour_card') throw new BadRequestError('找不到这张小卡，刷新一下再选。');
    if (recs.some((r) => r.record.type === 'detour_made' && r.record.cardId === cardId)) {
      throw new BadRequestError('这张小卡已经选过了。');
    }
    const picked = found.options[option];
    if (!picked) throw new BadRequestError(`没有第 ${String(option + 1)} 个选项。`);
    const sig = recs.find((r) => r.line === found.signalLine)?.record;
    const missing =
      sig?.type === 'route_signal'
        ? `${sig.missingPoint !== undefined ? this.pointText(sig.missingPoint) + '，' : ''}${sig.missingText}`
        : '（缺口说明找不到）';

    if (picked.kind === 'continue') {
      await this.d.hub().record(loopId, {
        type: 'detour_made',
        at: this.d.iso(),
        cardId,
        option,
        choice: 'continue',
      });
      await this.d.hub().send(loopId, {
        role: 'program',
        text: `学习者看了小卡，选了“先不管，接着学”。缺口没有补：${missing}。已记在本闭环里；接着教，别把它当成已经补好。如果最后闭环没合上，它会进停车场，注明缺在哪个出发点。`,
      });
      return { choice: 'continue' };
    }
    if (picked.kind === 'shelve') {
      await this.d.hub().record(loopId, {
        type: 'detour_made',
        at: this.d.iso(),
        cardId,
        option,
        choice: 'shelve',
      });
      await this.shelve(loopId, `在小卡上选了先搁置（${missing}）`);
      return { choice: 'shelve' };
    }
    // fork
    const ticket = picked.ticket;
    const problem = ticket ? badTicket(ticket) : '小卡的 fork 选项没有单子';
    if (!ticket || problem !== undefined) {
      console.error(
        `小卡 ${cardId} 第 ${String(option)} 项的单子有问题，不开分叉：${problem ?? ''}`,
      );
      throw new BadRequestError('这个选项现在开不了（单子缺了新点或预期理解），换一个试试。');
    }
    if (opened.parent === undefined) throw new BadRequestError('这个闭环不属于任何项目。');
    const fork: ForkOrigin = {
      kind: sig?.type === 'route_signal' ? sig.kind : 'gap',
      reason: missing,
      ...(sig?.type === 'route_signal' && sig.missingPoint !== undefined
        ? { missingPoint: sig.missingPoint }
        : {}),
      fromLoop: loopId,
      basisLines: sig?.type === 'route_signal' ? sig.basisLines : [],
      signalLine: found.signalLine,
      returnCondition: `分叉的新点「${ticket.newPoint}」合上就回到「${opened.title}」`,
      ...(picked.scope !== undefined ? { scope: picked.scope } : {}),
    };
    const child = await this.d.hub().createSession('loop', {
      title: picked.title,
      parent: opened.parent,
      ticket,
      fork,
    });
    await this.d.hub().record(loopId, {
      type: 'detour_made',
      at: this.d.iso(),
      cardId,
      option,
      choice: 'fork',
      forkLoopSessionId: child.sessionId,
    });
    await this.d.hub().send(child.sessionId, {
      role: 'program',
      text: [
        `这是一个分叉闭环：从闭环「${opened.title}」（${loopId}）中途分出来，补它缺的前置。`,
        `分叉原因：${fork.reason}（父闭环里学习者的原话：${fork.basisLines.map((l) => `L${String(l)}`).join('、')}，可用 read_loop 读父闭环原文）`,
        `返回条件：${fork.returnCondition}。`,
        `范围：${fork.scope ?? '补到父闭环够用为止，不要扩成一大块'}。`,
        '',
        this.d.loopOpening(ticket),
      ].join('\n'),
    });
    return { choice: 'fork', forkLoopSessionId: child.sessionId };
  }

  // ───────────── 搁置与恢复 ─────────────

  async shelve(loopId: string, note: string): Promise<void> {
    const opened = await this.d.hub().opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const flags = foldLoop(await this.d.hub().records(loopId));
    if (flags.ended !== undefined) throw new BadRequestError('这部分已经结束了。');
    if (flags.shelved !== undefined) throw new BadRequestError('这部分已经搁置着了。');
    await this.d.hub().record(loopId, { type: 'loop_shelved', at: this.d.iso(), note });
  }

  /** 搁置后后台让 M05 记停车记录（带恢复计划的搁置，M05:27）。 */
  async parkShelved(loopId: string): Promise<void> {
    await this.park(loopId, 'shelved');
  }

  /** 恢复搁置的闭环；by = message 时是学习者在里面又说话了。返回前已把“恢复了”的事实交给教学侧。 */
  async resume(loopId: string, by: 'button' | 'message'): Promise<void> {
    const opened = await this.d.hub().opened(loopId);
    if (opened.kind !== 'loop') throw new BadRequestError('这段对话不是一次学习任务。');
    const recs = await this.d.hub().records(loopId);
    const flags = foldLoop(recs);
    if (flags.ended !== undefined) throw new BadRequestError('这部分已经结束了。');
    if (flags.shelved === undefined) throw new BadRequestError('这部分没有搁置。');
    await this.d.hub().record(loopId, { type: 'loop_resumed', at: this.d.iso(), by });
    const parking = flags.parking;
    const missed = flags.forks.filter((f) => f.returned !== undefined && !f.returned.delivered);
    await this.d.hub().send(loopId, {
      role: 'program',
      text: [
        `学习者回来接着学这个闭环了（它在 ${flags.shelved.at} 被搁置：${flags.shelved.note}）。`,
        ...(parking !== undefined
          ? [
              `搁置时记下的恢复计划：何时——${parking.when}；从哪接上——${parking.resumeFrom}；缺在：${parking.missing.map((m) => m.text).join('；')}。`,
            ]
          : []),
        ...missed.map(
          (f) =>
            `搁置期间分叉闭环 ${f.forkLoopSessionId} 已经${f.returned?.closed === true ? '合上' : '结束（没合上）'}，回来的事实当时没有交给你。`,
        ),
        '先简短接上：回到哪里、接着做什么。',
      ].join('\n'),
    });
  }

  // ───────────── 分叉结束 → 回父闭环 ─────────────

  /** 分叉闭环结束了（合上 / 没合上）：往父闭环记“回来了”，能交的话把事实追加给教学侧，父闭环继续。 */
  async returnToParent(forkId: string, closed: boolean): Promise<void> {
    const opened = await this.d.hub().opened(forkId);
    const fork = opened.fork;
    if (fork === undefined) return;
    const parentFlags = foldLoop(await this.d.hub().records(fork.fromLoop));
    if (parentFlags.forks.find((f) => f.forkLoopSessionId === forkId)?.returned !== undefined) {
      return; // 已经回过了
    }
    const what = fork.missingPoint !== undefined ? this.pointText(fork.missingPoint) : fork.reason;
    const why =
      parentFlags.ended !== undefined
        ? '父闭环已经结束'
        : parentFlags.shelved !== undefined
          ? '父闭环搁置着'
          : undefined;
    await this.d.hub().record(fork.fromLoop, {
      type: 'fork_returned',
      at: this.d.iso(),
      forkLoopSessionId: forkId,
      closed,
      delivered: why === undefined,
      ...(why !== undefined ? { note: `${why}，没有把回来的事实交给教学侧` } : {}),
    });
    if (why !== undefined) return;
    const text = closed
      ? `分叉闭环「${opened.title}」（${forkId}）合上了：补完了 ${what}，回到这里。分叉的学习记录已写进 M09（用 M09 查询工具看）。接着教本闭环：原来卡住的地方（学习者原话 ${fork.basisLines.map((l) => `L${String(l)}`).join('、')}）可以再来一次；补得牢不牢，仍看学习者接下来的表现。`
      : `分叉闭环「${opened.title}」（${forkId}）没合上就结束了：${what} 没补好。学习者决定先回到这里，缺口已记进停车场。本闭环照常继续；用到 ${what} 的地方留意，别当成他已经会了。`;
    await this.d.hub().send(fork.fromLoop, { role: 'program', text });
  }

  // ───────────── 停车记录 ─────────────

  /** 让 M05 的一个会话记停车记录：缺在哪个出发点、建议的恢复计划。记进该闭环自己的正本。 */
  async park(loopId: string, reason: ParkingNote['reason']): Promise<void> {
    const job: Job = { kind: 'park', loopId, reason };
    const m05 = await this.d
      .hub()
      .createSession('m05', { title: '记停车记录', parent: loopId, m05Job: job });
    this.jobs.set(m05.sessionId, job);
    await this.runPark(m05.sessionId, job, await this.parkOpening(loopId, reason));
  }

  private async parkOpening(loopId: string, reason: ParkingNote['reason']): Promise<string> {
    const opened = await this.d.hub().opened(loopId);
    const recs = await this.d.hub().records(loopId);
    const ended = foldLoop(recs).ended;
    const signals = recs.flatMap((r) =>
      r.record.type === 'route_signal'
        ? [
            `L${String(r.line)} ${r.record.kind === 'gap' ? '前置缺口' : '想分叉'}：${r.record.missingPoint !== undefined ? this.pointText(r.record.missingPoint) + '；' : ''}${r.record.missingText}（依据 ${r.record.basisLines.map((l) => `L${String(l)}`).join('、')}）`,
          ]
        : [],
    );
    return [
      `这次的活：给一个${reason === 'shelved' ? '被学习者搁置' : '没合上就结束'}的闭环记停车记录（不是出选择卡）。`,
      '停车记录 = 缺在哪个出发点 + 恢复计划（何时、从哪接上）。可靠的搁置要有具体的恢复计划，而不是笼统的“以后再说”。',
      '读下面的单子、教学侧中途报过的缺口和对话原文（需要时用 read_loop 或查 M09），用 submit_parking_note 交回，只交一次。',
      '',
      `闭环：「${opened.title}」（${loopId}）`,
      `单子：${opened.ticket ? this.d.describeTicket(opened.ticket) : '（缺）'}`,
      ...(ended !== undefined ? [`结束时学习者说：${ended.note}`] : []),
      `教学侧中途通知过的缺口：${signals.length > 0 ? '\n' + signals.join('\n') : '（没有）'}`,
      '',
      '对话原文：',
      renderTranscript(recs),
    ].join('\n');
  }

  /** 让 M05 会话记停车记录，交回了就记进闭环正本；没交回就报错。 */
  private async runPark(sessionId: string, job: Job, opening: string): Promise<void> {
    await this.d.hub().send(sessionId, { role: 'program', text: opening });
    await this.d.hub().idle(sessionId);
    const note = this.parks.get(sessionId);
    this.parks.delete(sessionId);
    if (note === undefined || job.kind !== 'park') {
      throw new Error(`M05 没有交回停车记录（见会话 ${sessionId}）`);
    }
    await this.d.hub().record(job.loopId, {
      type: 'parking_note',
      at: this.d.iso(),
      reason: job.reason,
      missing: note.missing,
      when: note.when,
      resumeFrom: note.resumeFrom,
      basisLines: note.basisLines,
      m05SessionId: sessionId,
    });
  }

  // ───────────── 重启后恢复 ─────────────

  /**
   * 启动时调：从各 M05 会话正本的开场记录（m05Job）重建“它干哪件活”，免得重启后退回出选择卡的工具；
   * 返回中途被重启打断、还没交回的那几件（每件只重做一次）。
   */
  async restore(): Promise<string[]> {
    const pending: string[] = [];
    for (const s of this.d.hub().listSessions()) {
      if (s.kind !== 'm05') continue;
      const opened = await this.d.hub().opened(s.sessionId);
      if (opened.m05Job === undefined) continue;
      this.jobs.set(s.sessionId, opened.m05Job);
      if (await this.interrupted(s.sessionId, opened.at, opened.m05Job)) pending.push(s.sessionId);
    }
    return pending;
  }

  /** 这件活是不是被重启打断了：没交回结果、调用方也没收到结果、闭环还用得着它。 */
  private async interrupted(sessionId: string, openedAt: string, job: Job): Promise<boolean> {
    const own = await this.d.hub().records(sessionId);
    if (own.some((r) => r.record.type === 'program_fact' && r.record.text.startsWith(RESTARTED))) {
      return false; // 已经重做过一次
    }
    const recs = await this.d.hub().records(job.loopId);
    const flags = foldLoop(recs);
    if (job.kind === 'detour') {
      if (flags.ended !== undefined) return false;
      return !recs.some(
        (r) =>
          (r.record.type === 'detour_card' && r.record.m05SessionId === sessionId) ||
          // 教学侧的那次通知已经拿到结果（成或不成），或者之后又通知过
          (r.line > job.signalLine &&
            ((r.record.type === 'tool_call' && r.record.name === 'request_detour') ||
              r.record.type === 'route_signal')),
      );
    }
    if (recs.some((r) => r.record.type === 'parking_note' && r.record.at >= openedAt)) return false;
    if (job.reason === 'shelved') return flags.shelved !== undefined;
    return (
      flags.ended !== undefined &&
      !recs.some(
        (r) =>
          r.record.type === 'after_loop_step' &&
          r.record.step === 'failed' &&
          r.record.detail.startsWith('停车记录'),
      )
    );
  }

  /** 重做一件被重启打断的活：小卡贴回闭环并告诉教学侧；停车记录照记（没合上就结束的补记清单步骤）。 */
  async finishInterrupted(sessionId: string): Promise<void> {
    const job = this.jobs.get(sessionId);
    if (job === undefined) return;
    if (job.kind === 'detour') {
      const mainId = (await this.d.hub().opened(job.loopId)).parent;
      if (mainId === undefined) return;
      const opening = await this.detourOpening(
        job.loopId,
        mainId,
        job.signalLine,
        await this.d.hub().records(job.loopId),
      );
      const r = await this.runDetour(sessionId, job, `${RESTARTED}\n\n${opening}`);
      await this.d.hub().send(job.loopId, {
        role: 'program',
        text: `（服务中途重启过，你刚才那次通知的结果现在才回来。）${r.text}`,
      });
      return;
    }
    const opening = await this.parkOpening(job.loopId, job.reason);
    try {
      await this.runPark(sessionId, job, `${RESTARTED}\n\n${opening}`);
    } catch (err) {
      if (job.reason === 'ended_unclosed') {
        await this.d.hub().record(job.loopId, {
          type: 'after_loop_step',
          at: this.d.iso(),
          step: 'failed',
          detail: `停车记录：${err instanceof Error ? err.message : String(err)}`,
        });
      }
      throw err;
    }
    if (job.reason === 'ended_unclosed') {
      await this.d.hub().record(job.loopId, {
        type: 'after_loop_step',
        at: this.d.iso(),
        step: 'parked',
        detail: '停车记录已写入（重启后补做）',
      });
    }
  }

  private parkingTool(sessionId: string, job: Extract<Job, { kind: 'park' }>): ToolSpec {
    return {
      name: 'submit_parking_note',
      description:
        '交回停车记录：缺在哪个出发点（可多个；point 写那个出发点，不确定就只写 text），和恢复计划（何时、从哪接上）。只提交一次。',
      input: {
        missing: z
          .array(
            z.object({
              point: z.string().optional().describe('缺的出发点（文字）；不确定不填'),
              text: z.string().describe('缺什么，一句话'),
            }),
          )
          .min(1),
        when: z.string().describe('恢复计划：何时（例如“下次进来先做”“补完某点之后”）'),
        resume_from: z.string().describe('恢复计划：从哪接上（哪个点 / 对话里哪一处）'),
        basis_lines: z
          .array(z.number().int())
          .optional()
          .describe('指回学习者原话的行号（可没有）'),
      },
      run: async (a) => {
        if (this.parks.has(sessionId)) return fail('已经提交过了');
        const missing = a.missing as { point?: string; text: string }[];
        if (missing.some((m) => m.text.trim() === '')) return fail('text 不能是空的');
        const when = (a.when as string).trim();
        const resumeFrom = (a.resume_from as string).trim();
        if (when === '' || resumeFrom === '') return fail('恢复计划要写清何时、从哪接上');
        const basis = (a.basis_lines as number[] | undefined) ?? [];
        const learner = learnerLines(await this.d.hub().records(job.loopId));
        const bad = basis.filter((l) => !learner.has(l));
        if (bad.length > 0)
          return fail(`第 ${bad.join('、')} 行不是学习者说的话；只指回学习者的行`);
        this.parks.set(sessionId, { missing, when, resumeFrom, basisLines: basis });
        return ok('停车记录已收到');
      },
    };
  }

  // ───────────── 小工具 ─────────────

  private async depthOf(loopId: string): Promise<number> {
    let n = 0;
    let cur = loopId;
    while (n <= MAX_FORK_DEPTH + 1) {
      const o = await this.d.hub().opened(cur);
      if (o.fork === undefined) break;
      n++;
      cur = o.fork.fromLoop;
    }
    return n;
  }
}

function ok(text: string): Promise<ToolResult> {
  return Promise.resolve({ text });
}

function fail(text: string): Promise<ToolResult> {
  return Promise.resolve({ text, isError: true });
}
