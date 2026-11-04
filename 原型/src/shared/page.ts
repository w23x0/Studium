// 旧数据：10-26 的活页面（“对话旁边一张页面”，已撤下，见 `docs/撤下原文/活页面-对话旁边一张页面.md`）。
// 这里的类型只留着读旧正本里的 page_* 记录，新代码不再产生。PageTrialResult 仍在用（组件试跑）。

/** 学习者在页面上的一个动作：展开 / 折起（框架自己看得到）或页面自己定义的（经发送口递出）。 */
export type PageAction =
  | { kind: 'toggle'; block: string; open: boolean }
  | { kind: 'custom'; name: string; detail?: unknown; block?: string };

/** 旧数据里退回时选的原因（10-26 起不做退回）。 */
export type PageRollbackReason = '太多' | '太快' | '方向不对';

export interface PageTrialResult {
  ok: boolean;
  error?: string;
}
