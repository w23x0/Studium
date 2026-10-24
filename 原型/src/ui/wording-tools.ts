// 对话里“工具行”的叫法：模型用了什么工具、在沙盒里做了什么，用一句日常话说（界面说明 §1.2）。
// 工具名是给模型的英文名，学习者看不到；没列的工具统一叫“用了一个工具”。

const TOOL: Record<string, string> = {
  list_learned: '看了学过的记录',
  read_session: '读了一段对话记录',
  retrieve: '派人去查了细节',
  submit_next: '定下了下一次学什么',
  submit_verdict: '写好了判断',
  submit_findings: '交回了查到的东西',
  submit_candidates: '列出了候选资料',
  ask_learner: '有一句要问你',
  open_goal_talk: '开了谈方向的对话',
  plan_next: '让导航去定下一步',
  find_materials: '开了找资料的对话',
  // 结果另有程序的一行（记进项目说明了、方向记好了），工具行不再重复
  remember: '',
  point_to_conversation: '找到了之前那段对话',
  settle_goal: '',
  request_close: '请求整理这次学到了什么',
  end_loop_unclosed: '结束了这次学习',
  query_state: '看了状态记录',
  read_state_records: '看了状态记录',
  write_state_record: '更新了状态记录',
  write_current_state: '更新了状态记录',
  write_strategy_record: '记了一条教法',
  textbook_index: '看了资料目录',
  read_source: '读了资料原文',
  search_textbook: '在资料里搜了一下',
  read_output: '读了你的产出',
  save_output_version: '存了产出的新一版',
  add_literature: '加了一条文献',
  add_reminder: '加了一条提醒',
  add_source_note: '记了一条来源说明',
  open_output_task: '开了写产出的对话',
  open_review: '开了阶段复盘',
  finish_review: '复盘谈完了',
};

/** 工具调用的一句话叫法（只看名字；MCP 前缀去掉）；空串 = 结果另有显示，不列。 */
export function toolLabel(name: string): string {
  const bare = name.split('__').at(-1) ?? name;
  return TOOL[bare] ?? '用了一个工具';
}

/** 沙盒动作的一句话叫法：读 / 写 / 跑 / 搜，读的带上文件名（不带目录与 .md）。 */
export function sandboxLabel(op: string, path: string | undefined): string {
  const base = path
    ?.split('/')
    .filter((p) => p !== '')
    .at(-1)
    ?.replace(/\.md$/, '');
  switch (op) {
    case 'read':
      return base !== undefined ? `读了“${base}”` : '读了一份记录';
    case 'write':
      return '在草稿里写了点东西';
    case 'run':
      return '跑了一条命令';
    case 'search':
      return '搜了一下';
    default:
      return '动了一下工作区';
  }
}

export const WT = {
  /** 一行工具摘要：最多列三样，多了说“等 N 步”。 */
  summary: (labels: readonly string[]): string => {
    const uniq = [...new Set(labels)];
    if (uniq.length === 0) return '准备了一下';
    const head = uniq.slice(0, 3).join(' · ');
    return labels.length > 3 ? `${head} 等 ${String(labels.length)} 步` : head;
  },
  narration: '它当时说',
  thinking: '在想…',
  closing: '正在整理这次学到了什么，大约半分钟…',
  navRunning: '正在定下一次学什么',
  navDone: '定下一次学什么的过程',
  navWatch: '看过程',
} as const;
