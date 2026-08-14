# FSRS The Algorithm — awesome-fsrs Wiki

Source: https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm
Fetched: 2026-08-13
Grade: A (原文到手)

## 核心内容

FSRS "a variant of the DSR (Difficulty, Stability, Retrievability) model used to predict memory states."

三参数：
- Retrievability R = "probability of recall"（随时间按遗忘曲线衰减）
- Stability S = "interval when R=90%"（可提取性降到 90% 的间隔天数）；S'_r = new stability after recall；S'_f = new stability after forgetting
- Difficulty D ∈ [1,10]，"Higher difficulty ... leads to smaller stability increases after successful reviews"
- Grade G 1–4

遗忘曲线/可提取性函数（按版本演进）：
- FSRS v3: R(t,S) = 0.9^(t/S)，"R(t,S)=0.9 when t=S"
- FSRS v4: R(t,S) = (1 + t/(9·S))^(-1)
- FSRS-4.5: R(t,S) = (1 + FACTOR·t/S)^DECAY，DECAY=-0.5, FACTOR=19/81；"the new forgetting curve drops sharply before S and flatly after S"
- FSRS-6: R(t,S) = (1 + factor·t/S)^(-w20)，factor = 0.9^(-1/w20) - 1 以保证 R(S,S)=90%

间隔反解：给定目标保留率 r，间隔 I(r,S)：
- v3: I = S·ln(r)/ln(0.9)
- v4: I = 9·S·(1/r - 1)
- 4.5: I = S/FACTOR·(r^(1/DECAY) - 1)
- 全部满足 r=0.9 时 I=S

稳定度更新（成功回忆）：S'_r(D,S,R,G) = S·(e^w8·(11-D)·S^(-w9)·(e^(w10·(1-R))-1)·w15(if G=2)·w16(if G=4) + 1)
- "The larger the value of D, the smaller the SInc value"（越难涨得越慢）
- "The larger the value of S, the smaller the SInc value"（越稳越难再加固）
- "The smaller the value of R, the larger the SInc value"（间隔效应：低可提取性复习增益更大）

遗忘后稳定度：S'_f(D,S,R) = w11·D^(-w12)·((S+1)^w13 - 1)·e^(w14·(1-R))

难度更新：D'(D,G) = w7·D0(3) + (1-w7)·(D - w6·(G-3))（均值回归防 "ease hell"）

关键性质：逾期复习（overdue）时 "instead of increasing linearly with the delay like the SM-2/Anki algorithm, the subsequent stability converges to an upper limit, which depends on your FSRS parameters." 防止过度延迟导致无限间隔。
