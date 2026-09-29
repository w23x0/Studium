---
name: feedback-no-fitting-claude-code
description: 学习侧不靠搬抄 / 拟合 Claude Code 找切入点；从原理出发组合框架
metadata:
  type: feedback
---

不要为了蹭模型在 Claude Code 上的训练拟合，就照搬 Claude Code 的做法；也不要拿 Claude Code 当标准答案去衡量（例如用“从编程换到学习，这一项的做法会不会变”来划分层次，产品负责人认为这种做法很奇怪）。

**Why:** Claude Code 是面向编程优化的；而且当下模型是否真受某种干扰，我们没有实验过，Claude Code 也可能有我们没学过的更好做法。

**How to apply:** 遇到框架层的问题，先弄懂开源 agent 的设计理念（为什么这样取舍），再从原理出发组合出适合学习的或通用的框架；结论要有实验或原理支撑。参见 [[project-paused-learn-agent-principles]]。
