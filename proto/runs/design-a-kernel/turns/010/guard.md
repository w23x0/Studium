主张 1：有
- 证据位置：`transcript.md:68`、`transcript.md:70`（定义）；`transcript.md:74`–`transcript.md:90`（逐个计算与判断）；`transcript.md:92`（核在哪个空间、零向量在哪个空间）
- 条件：独立（系统在 `transcript.md:44` 只给了名称和记号 ker T，没有给出定义内容）
- 证据强度：含变式（维数方向与引入题相反，改为 ℝ²→ℝ³，学习者仍然正确区分了"核 ⊆ ℝ²"和"零向量取自 ℝ³"）
- 缺口：无。定义写出了"v ∈ V"和"0 是 W 的零向量"两点。u₁、u₂、u₃ 的乘法过程都写出来了，结果正确，u₁、u₃ 在核中、u₂ 不在，全部判对。

主张 2：有
- 证据位置：`transcript.md:105`（学习者自己转化为解 Ax=0）；`transcript.md:114`–`transcript.md:131`（消元）；`transcript.md:135`–`transcript.md:146`（自由变量 x₂、x₄ 与完整解集）；`transcript.md:154`–`transcript.md:164`（用非零向量代回验证）
- 条件：独立（题干没有提 Ax=0，也没有说明检验方法）
- 证据强度：含变式（新矩阵，3×4 非方阵，两个自由变量）
- 缺口：无。阶梯形 [1 2 0 1; 0 0 1 2; 0 0 0 0] 正确。解集 (−2s−t, s, −2t, t) 完整。(−2,1,0,0) 和 (−1,0,−2,1) 两个非零向量都逐行代回，结果都是零向量。注：`transcript.md:169`–`transcript.md:174` 是系统在学习者作答完毕后回答"是否找全"的提问，不影响上述作答的独立性。

主张 3：有
- 证据位置：
  - 含零向量：`transcript.md:193`–`transcript.md:200`，用齐次性取 c=0 推出，属首次作答，无提示；`transcript.md:290`–`transcript.md:304`，换用可加性这条此前未出现过的路线独立推出。
  - 加法封闭：`transcript.md:202`–`transcript.md:211`，首次作答，无提示，标明可加性；`transcript.md:314`–`transcript.md:316`。
  - 数乘封闭：首次作答 `transcript.md:219` 写成 T(c)T(u)，是错误写法。`transcript.md:241`–`transcript.md:243` 是在轻微提示后改写的。`transcript.md:326`–`transcript.md:328` 是完整证明中的写法，但正确等式链在 `transcript.md:250` 已由系统完整复述，属答案已暴露。独立证据来自 `transcript.md:403`–`transcript.md:409`：在新结构 U={v | S(v)=T(v)} 下，学习者无提示地对 S、T 各用一次齐次性，写出 S(cu)=c·S(u)、T(cu)=c·T(u)，并分别标明依据，全程没有出现 S 或 T 作用在标量上的写法。
- 条件：独立。完整的 ker T 证明见 `transcript.md:282`–`transcript.md:332`，每步都标明了依据。其中数乘一环当时属答案已暴露，这一环的独立性由 `transcript.md:403`–`transcript.md:409` 的无提示变式作答补足。"含零向量"和"加法封闭"两环在首次作答时就已独立写对。
- 证据强度：含变式（T(0)=0 用两条不同路线推出；数乘封闭在 S/T 双变换结构中迁移正确）
- 缺口：无。关于"为什么 T(0)=0"：对话中没有出现专门的追问，但学习者两次主动从线性性推出这一步（`transcript.md:197`–`transcript.md:198` 用齐次性，`transcript.md:292`–`transcript.md:304` 用可加性加加法逆元），都没有只说"显然"，达到了该项要求。

【守卫结论】通过
