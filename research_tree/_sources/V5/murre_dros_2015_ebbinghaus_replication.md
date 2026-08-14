# Replication and Analysis of Ebbinghaus' Forgetting Curve — Murre & Dros (2015), PLOS ONE

Source: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0120644
Fetched: 2026-08-13
Grade: A (原文到手，开放获取)

## 核心内容

- 用 savings 方法复现艾宾浩斯 1880 遗忘曲线：20 分钟、1 小时、9 小时、1 天、2 天、6 天、31 天间隔；单一受试 J. Dros（22 岁）75 天约 70 小时学习/再学习 70 张 13 音节行。摘要："We present a successful replication of Ebbinghaus' classic forgetting curve from 1880 based on the method of savings."
- 复现曲线与艾宾浩斯原始数据及 Heller, Mack, Seitz (1991) 德文复现高度吻合（除 31 天点，Dros 的 savings 明显更低）。
- 曲线形状：比较多种函数——艾宾浩斯 1880 双幂函数、1885 对数函数 Q(t)=1.84/((log t)^1.25+1.84)、简单幂函数、双指数和（Heller 等）、以及作者群的 Memory Chain Model (MCM，双指数和、参数可解释为巩固机制）。
- AIC 模型比较："The AIC indicates that on average the MCM equation (or summed exponential function) is on average better than all equations considered thus far." 幂函数次之。
- 24 小时"boost"：四个数据集在 24 小时点均出现向上跳跃（sleep consolidation 相关，Jenkins & Dallenbach 1924 解释）。"the Ebbinghaus forgetting curve has indeed been replicated and that it is not completely smooth but most probably shows a jump upwards."
- 序列位置效应：首尾音节几乎不遗忘，中间位置（3-8）下降最陡。"the forgetting curve by Ebbinghaus is an average over different forgetting curves of items in various serial positions."
- MCM：记忆从快衰减存储（如海马）转移到慢衰减存储（如新皮层），双指数保留函数。
- 公式：艾宾浩斯 1880: x=[1−(2/t)^0.099]^0.51；1885: Q(t)=1.84/((log10 t)^1.25+1.84)。
