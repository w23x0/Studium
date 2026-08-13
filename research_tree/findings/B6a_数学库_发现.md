# B6a 数学库（mathlib/MML/Coq 数学库）存储与版本化先例 — 发现报告

- 分支: B6a（B6 先例系第二轮子任务：最接近领域——形式化数学库）
- 调研员: B6a 分支调研员
- 日期: 2026-08-12（Asia/Shanghai），全部抓取以当日访问为准
- 证据等级: A=原文到手（官方文档/源码/官方数据/论文全文）；B=二手可靠转述；C=推断。抓取失败写"未核"。推断一律标 C。
- 红线参照（本案，即 M08/M09 所在知识库红线）: 红线甲=知识记录不可覆盖（旧结论须以版本或追加方式保留、可回溯）；红线乙=节点身份=锚点集合（身份稳定、可机械判定）；红线丙=记录/评审可复核、可机械校验；红线丁=可追加、防篡改（append-only 或等价物）。

---

## 0 一句话结论

形式化数学库（Lean mathlib4、Mizar MML、Coq MathComp）普遍把"知识单元"做成**纯文本源文件 + 机器校验产物**的双物态，用**显式 import/引用声明 + 构建/验证工具**把依赖图变成可机械解析、可机械校验的对象，用 **git 提交 + 版本化目录快照 + 发布版本号 + 替换表**四层机制管理演化——但它们的废弃/删除政策（mathlib 6 个月后可删、MathComp 至少一版/尽量两年、MML 修订可删等价定理）都**允许最终删除**，只靠"快照/历史"保底，这与本案 M09"旧版本不覆盖"红线存在直接张力；可移植的最小机制是"逐文件校验 + import/引用完整性 + 显式版本标识 + 等价/替换映射表"，不可移植的是大规模自动化构建（lake/olean 缓存）、内核级验证器与维护者团队。

---

## 1 逐条回答

### 1.1 Lean mathlib4 的文件/模块组织、声明间依赖（import 图）、git 版本管理与"不破坏下游"的机制（官方文档原文）

**文件/模块组织：** Lean 官方 Language Reference 第 5 章（Source Files and Modules）原文："The smallest unit of compilation in Lean is a single source file. Source files may import other source files based on their file names. In other words, the names and folder structures of files are significant in Lean code. Each source file has an import name that is derived from a combination of its filename and the way in which Lean was invoked: Lean has a set of root directories in which it expects to find code, and the source file's import name is the names of the directories from the root to the filename, with dots ( . ) interspersed and .lean removed." 即**文件路径=模块名=命名空间**，模块即单个 .lean 源文件；文件头以 `module ?` / `prelude` / `import` / `public import` 声明依赖（同章 header 文法）。mathlib4 根文件 `Mathlib.lean` 实测含 **8308 条 public import**（访问 2026-08-12，master），即全库依赖以单一文本根文件显式列出（"public import Std / public import Batteries / public import Mathlib.Algebra.AddConstMap.Basic / ..."）。每个子模块文件同样在头部列出 import，构成**模块级（文件级）依赖图**；依赖图是**文本可解析**的，不需要编译环境。

**声明间依赖：** import 图是模块级；声明（定理/定义）级依赖由 Lean 内核在 elaboration 时检查（常量引用必须已定义），但官方没有把"声明级依赖图"作为标准导出工具——import-graph 工具提供模块级图（见 1.3）。声明身份的标识是**模块路径+全限定名**（fully-qualified name），如 `Mathlib.Algebra.AddConstMap.Basic`。

**git 版本管理：** mathlib4 用 git（GitHub master 分支 + PR + CI/bors 合并），`lakefile.lean` 用 `require "leanprover-community" / "batteries" @ git "main"` 声明 7 个上游依赖并锁定 git rev 于 `lake-manifest.json`（实测 import-graph 锁 978b7ec…、batteries 锁 9a86b38…），`lean-toolchain` 固定 Lean 版本（当前 `leanprover/lean4:v4.34.0-rc1`）；README 明确"git 工具链版本不匹配就不能用缓存 olean"。**"不破坏下游"机制**（mathlib 贡献风格指南 Deprecation 节原文）："Deleting, renaming, or changing declarations can cause downstreams projects that rely on these definitions to fail to compile. Any publicly exposed theorems and definitions that are being removed should be gracefully transitioned by keeping the old declaration with a @[deprecated] attribute... Renamed definitions should use a deprecated alias to the new name... @[deprecated (since := YYYY-MM-DD)] alias old_name := new_name ... Deprecated declarations can be deleted after 6 months." 即**旧名以 deprecated alias 保留并存、带版本化 since 字段、6 个月后可删**。

### 1.2 MML 的存储与版本化：条目、引用、MML 版本标识、验证方式（Mizar 官网/文档）

**存储：** MML = Mizar 文章（Mizar Articles），即纯文本 .miz 文件（官方 library 页："The Mizar Mathematical Library (MML) consists of Mizar Articles. Two articles form the foundation of the library: [hidden.miz=built-in notions] [tarski.miz=axioms of the Tarski-Grothendieck set theory]. All other texts undergo verification by Mizar to be correct consequences of those axioms."）；MML survey 论文（Bancerek et al. 2018）原文："The formalization scripts were stored in plain text files, called articles"。当前版本目录 `version/current/mml/` 含 1500 个 .miz 文件（1493 篇文章 + hidden/tarski_0/tarski_a 等基础与辅助文件，均 2025-05-30 时间戳）。

**条目与引用：** 知识单元（定理/定义/模式）以**文章文件名+文章内编号/标签**标识，文章内以 `by TARSKI_0:2`、`from TARSKI_0:sch 1` 引用其它文章的条目（tarski.miz 原文："theorem :: Extensionality (for x being object holds x in X iff x in Y) implies X = Y by TARSKI_0:2;"）。文件名有 8+3 规则：长度 5–8、仅字母数字下划线、首字符字母（不含 x）、**必须唯一且不得与已提交 MML 的文章重名**（submit 页原文）。

**版本标识：** 官方按**版本化目录**发布：`/version/` 下从 `7.11.01_4.117.1046/`（2008-12-30）到 `8.1.15_5.94.1493/`（2025-05-30）再到 `current/` 指针；版本号形如"系统版本_MML版本_文章数"（8.1.15 = Mizar 系统 8.1.15；5.94 = MML 版本；1493 = 文章数）。`mml.ini` 显式字段：MizarReleaseNbr=8 / MizarVersionNbr=1 / MizarVariantNbr=15 / NumberOfArticles=1493 / MMLVersion=5.94；分发 doc/README 头部："Mizar - Version 8.1.15 (Linux/FPC) (MML 5.94.1493) May 30, 2025"；主页："Current Mizar Version: 8.1.15 … MML Version: 5.94.1493 (May 30, 2025)"。

**验证方式：** 官方 system 页："Mizar System is based on three programs named: Accommodator, Verifier, Exporter"——文本经 Accommodator 生成环境（从可用数据库取术语/定理）、Verifier 逐句验证、Exporter 把接受文章的内容提取并入公开数据库；文章先经 review（rec/acc/pub 三日期跟踪，reviews 页）。处理顺序由 `mml.lar` 文件存储（"distributed with each MML version"——survey 原文），即**先验文章可被后验文章引用、顺序即依赖序**。

### 1.3 数学库的"图"结构：定义依赖图如何从文本源码生成、标准工具（lake/exports、mizar 的 mml 查询工具）

- **Lean/lake/import-graph：** 依赖图从源文件头的 import 声明直接解析。import-graph 工具（leanprover-community/import-graph，mathlib 依赖之一，lakefile 中 require、manifest 锁 978b7ec…）提供 `lake exe graph`（输出 dot / xdot_json / HTML 依赖图）、`#redundant_imports`（列出传递冗余 import）、`#min_imports`（求最小 import 集）、`#find_home decl`（建议声明可上移的模块）、`#import_diff`；并新增 **FromSource** 模块："provides functions for analyzing imports by parsing source files directly, without requiring a built environment"——`findImportsFromSource (path) : IO (Array Name)` 解析单文件直接 import、`findTransitiveImportsFromSource` 求传递闭包。即"**不建环境、纯文本解析源文件**即可生成依赖图"。
- **Mizar/MML 查询工具：** MML 标准查询工具为 **MML Query**（官方分发物 miz.xml 的 XSL 内嵌其地址 `http://merak.pb.bialystok.pl/mmlquery/fillin.php?entry=`）；2026-08-12 实测该端点连接失败（RemoteDisconnected）→ **服务可用性未核**（地址存在为 A 级证据，可用性无法核实）。MML 的依赖图体现在 `mml.lar`（文章处理顺序）与文章内引用（`by ARTICLE:label`）；等价/替换映射由官方数据 `replths.txt`（821 行，格式 `BOOLE:6/XBOOLE_0:def 5` 旧定理/新条目）与 `replthls.txt`（94473 行）提供——这是"概念重命名/合并"的机器可读登记表。
- **MathComp/Coq：** 官方站点为每个发布版本提供 **libgraph**（coqdoc 生成的 HTML 库依赖图，如 2.6.0/2.5.0/2.4.0 各版本存档链接），即"版本化的 HTML 依赖图"。

### 1.4 数学库处理"概念重命名/重构/旧结论废弃"的方式（git 历史 vs 显式版本 vs 永不移除），与 M08"候选池+审计晋升"、M09"旧版本不覆盖"的异同

| 先例 | 重命名/重构/废弃机制 | 是否最终删除 | 与 M08/M09 的异同 |
|---|---|---|---|
| mathlib4 | `@[deprecated (since := YYYY-MM-DD)]` + `alias old := new`；style 指南"Deleting, renaming, or changing declarations can cause downstreams projects…" | **是**（6 个月后可删） | 旧名以别名保留并存 ≈ M09"旧版本不覆盖"的**先例版**；但先例允许 6 个月后删除，本案红线不允许 → 张力 |
| MathComp | `#[deprecated(since="mathcomp x.x.x", use=foo_new)]`；"must be kept for at least one release. We try to keep…at least two years" | **是**（两年/一版后可能随时删） | since 字段=版本标识，可移植；保留窗口比 mathlib 长，仍非永久 |
| MML | 三类修订：authored（推广/改进旧定理，连带改写依赖文章）、automatic（等价性检查软件删等价定理）、reorganization（改 mml.lar 顺序重建数据库）；replths/replthls 登记替换 | **是**（等价定理会被删除/合并），但**整库按版本目录快照并存**（7.11.01_4.117.1046/ … 8.1.15_5.94.1493/ 全部可下载） | "显式版本快照+替换映射表"是最接近 M08 候选池/审计晋升的机械参照；"改写旧文章"与红线甲"不可覆盖"冲突，靠快照保历史 |
| 三者共同 | git 历史（mathlib 为主）只记录**过程**，不承诺"永不删除"；显式版本/发布号提供**可回溯**；无任何先例是"永不移除" | — | M09"旧版本不覆盖"比所有先例更严格；先例证明"版本标识+替换映射+快照并存"技术上可行 |

与 M08 的异同：M08"候选池+审计晋升"对应先例中的"贡献 → review（rec/acc/pub 或 PR+CI）→ 并入（Exporter / merge）"管线；逐文件编译校验（Lake 对每模块产 olean + trace 哈希判过时）是"可机械校验"的现成实现。但数学库的"审计"依赖**内核/校验器/CI 自动化**（leanchecker 从 .olean 重放、Mizar Verifier 逐句验证），规模与自动化程度远超个人知识图谱可移植范围。

### 1.5 个人学习知识图谱从数学库先例可借鉴的最小集合：哪些机制可移植，哪些不可移植

**可移植（机制层面，与规模无关）：**
1. **逐文件/逐条目校验**：每个知识单元=源文本+校验产物（哈希/编译对象）双物态；M08 节点可存"锚点文本+内容哈希"，变更可机械判定（Lake trace 思想）。
2. **import/引用完整性**：依赖以文件头显式声明（纯文本可解析），import-graph 的 FromSource 证明**不建环境也能生成依赖图**——个人图谱的"概念依赖"可同样做成显式引用+完整性检查（孤儿引用=未核/错误）。
3. **显式版本标识**：MML 复合版本号（系统_数据_修订）、MathComp 的 `since="mathcomp x.x.x"` 字段、mathlib 的 `since := YYYY-MM-DD`——版本号分层、可机械比较。
4. **等价/替换映射表**：MML replths/replthls（旧条目/新条目的机器可读替换表）——概念重命名时登记"旧名→新名"映射，比直接删旧更利于回溯。
5. **废弃别名并存**：mathlib `alias old := new` + deprecated——旧版本不覆盖的温和版（旧名仍解析到新名）。
6. **版本化目录快照**：MML `/version/<版本>/` + `current/` 指针——"整库快照并存+current 指针"可直接移植为个人图谱的文件库模式。

**不可移植（依赖规模/自动化证明器）：**
1. 大规模增量构建与 olean 缓存（lake build / cache get / platformIndependent 跨平台产物）——个人图谱无此规模需求。
2. 内核级验证（Lean kernel、leanchecker 重放、Mizar Verifier 逐句证明检查）——个人学习知识不要求形式化证明。
3. 维护者团队/CI/bors 合并/PR 流程（mathlib 11 maintainers、MML Library Committee 与 rec/acc/pub 评审）——个人图谱可简化为单人+可选的外部复核。
4. "6 个月后可删"式的废弃窗口——与本案红线直接冲突，不可移植（本案须永久保留）。

---

## 2 关键发现（论断 + URL + 标题 + 机构 + 日期 + 原文摘录 + 等级）

### A 组：Lean / mathlib4 / Lake

**KF1. Lean 中"源文件=编译最小单元"，import 名由文件路径派生，文件即模块即命名空间**
- 来源: https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/ （官方 Language Reference 第 5 章）
- 标题: The Lean Language Reference — 5. Source Files and Modules
- 机构: Lean 项目（leanprover）
- 日期: 访问 2026-08-12（latest 指针）
- 原文摘录: "The smallest unit of compilation in Lean is a single source file. Source files may import other source files based on their file names. In other words, the names and folder structures of files are significant in Lean code. Each source file has an import name that is derived from a combination of its filename and the way in which Lean was invoked"
- 证据等级: A
- 对 M08/M09 的映射: 身份=路径/名字式身份（先例做法 X），与红线乙"身份=锚点集合"无直接先例；但"import 可机械解析"为锚点→依赖解析提供实现基础。

**KF2. mathlib4 根文件 Mathlib.lean 以 8308 条 public import 显式声明全库依赖**
- 来源: https://raw.githubusercontent.com/leanprover-community/mathlib4/master/Mathlib.lean
- 标题: mathlib4 仓库根文件（全库 import 清单，master）
- 机构: leanprover-community（mathlib4）
- 日期: 访问 2026-08-12；实测 import 行数 8308
- 原文摘录: "public import Std / public import Batteries / public import Mathlib.Algebra.AddConstMap.Basic / public import Mathlib.Algebra.AddConstMap.Equiv / ..."（文件尾 `set_option linter.style.longLine false`）
- 证据等级: A
- 对 M08/M09 的映射: 全库依赖以单一根文本显式化，可 diff、可审计——"评审可复核（红线丙）"的现成做法。

**KF3. Lake 定义 module/facet/trace/package 四概念：模块=构建最小单元、facet=编译产物、trace=哈希判过时、package=分发单元**
- 来源: https://github.com/leanprover/lean4/blob/master/src/lake/README.md （Lake 官方 README，已并入 lean4 仓库）
- 标题: Lake — Build system and package manager for Lean（README）
- 机构: leanprover
- 日期: 访问 2026-08-12
- 原文摘录: "A **module** is the **smallest unit of code visible to Lake's build system**. It is generally represented by a Lean source file and a set of binary libraries (i.e., a Lean `olean` and `ilean` plus a system shared library if `precompileModules` is turned on). Modules can import one another in order to use each other's code"; "Lake produces `olean`, `ilean`, `c`, and `o` files all from a single module"; "A **trace** is a piece of data (generally a hash) which is used to verify whether a given target is up-to-date (i.e., does not need to be rebuilt)... A target's trace is derived from its various **inputs** (e.g., source file, Lean toolchain, imports, etc.)"; "A **package** is the **fundamental unit of code distribution in Lake**"
- 证据等级: A
- 对 M08/M09 的映射: "目标=输入哈希"（trace）即红线丙可机械校验的现成实现；"源文本+编译产物双物态"提示 M08 可把可读源与机器校验产物成对存储。

**KF4. mathlib4 以 lakefile.lean 声明上游 git 依赖、lean-toolchain 固定 Lean 版本、lake-manifest.json 锁定 git rev**
- 来源: https://raw.githubusercontent.com/leanprover-community/mathlib4/master/lakefile.lean ; .../lean-toolchain ; .../lake-manifest.json
- 标题: mathlib4 构建配置（依赖声明/工具链/锁文件）
- 机构: leanprover-community
- 日期: 访问 2026-08-12（master 指针）
- 原文摘录: lakefile.lean "require "leanprover-community" / "batteries" @ git "main" / require "leanprover-community" / "importGraph" @ git "main" ..."; "fixedToolchain := true -- A version of Mathlib only supports the toolchain it is built with."; lean-toolchain "leanprover/lean4:v4.34.0-rc1"; lake-manifest.json 每包含 `"type": "git", "rev": "978b7ec9fbbf9a535114f1de8fe5b3778b358870"` 等 8 个依赖的锁定 rev
- 证据等级: A
- 对 M08/M09 的映射: "依赖清单文本化 + 工具链固定 + rev 锁文件"三层——M08 可移植"固定校验器/工具链版本 + 锁文件"，同输入+同工具链=同结果（红线丙）。

**KF5. mathlib 贡献流程与缓存：lake exe cache get（拉预编译 olean）、lake build、lake exe mk_all（更新根文件）、lake update（更新 manifest）**
- 来源: https://raw.githubusercontent.com/leanprover-community/mathlib4/master/README.md
- 标题: mathlib4 README
- 机构: leanprover-community
- 日期: 访问 2026-08-12
- 原文摘录: "To obtain precompiled `olean` files, run `lake exe cache get`."; "To build `mathlib4` run `lake build`."; "If you added a new file, run the following command to update `Mathlib.lean`: `lake exe mk_all`"; "use `lake update`... This will update the `lake-manifest.json` file correctly. You will need to make a PR after committing the changes to this file."
- 证据等级: A
- 对 M08/M09 的映射: 根文件由工具自动维护（mk_all）——"清单生成自动化"可移植；olean 缓存与 CI 构建属大规模基础设施，不可移植。

**KF6. mathlib"不破坏下游"= deprecated 属性 + alias 旧名 + since 版本字段，6 个月后可删**
- 来源: https://leanprover-community.github.io/contribute/style.html （mathlib 贡献风格指南 Deprecation 节；仓库路径 docs/contribute/style.md）
- 标题: The mathlib4 contribution guidelines — Style guide（Deprecation）
- 机构: leanprover-community
- 日期: 访问 2026-08-12
- 原文摘录: "Deleting, renaming, or changing declarations can cause downstreams projects that rely on these definitions to fail to compile. Any publicly exposed theorems and definitions that are being removed should be gracefully transitioned by keeping the old declaration with a @[deprecated] attribute... Renamed definitions should use a deprecated alias to the new name... @[deprecated (since := YYYY-MM-DD)] alias old_name := new_name ... Deprecated declarations can be deleted after 6 months."
- 证据等级: A
- 对 M08/M09 的映射: 旧名保留为别名并存 ≈ M09"旧版本不覆盖"的先例版；但"6 个月后可删"与本红线冲突（先例允许最终删除）。

**KF7. import-graph：从源文件文本直接生成 import 依赖图（lake exe graph / xdot_json / #redundant_imports / #min_imports / #find_home / FromSource）**
- 来源: https://raw.githubusercontent.com/leanprover-community/import-graph/master/README.md （lake-manifest 中锁定 rev 978b7ec…）
- 标题: importGraph — A simple tool to create import graphs of lake packages
- 机构: leanprover-community（import-graph）
- 日期: 访问 2026-08-12
- 原文摘录: "`lake exe graph my_graph.xdot_json`"; "* `#redundant_imports`: lists any transitively redundant imports in the current module. * `#min_imports`: attempts to construct a minimal set of imports for the declarations in the current file... * `#find_home decl`: suggests files higher up the import hierarchy to which `decl` could be moved."; "The `ImportGraph.Imports.FromSource` module provides functions for analyzing imports by parsing source files directly, without requiring a built environment... `findImportsFromSource (path : System.FilePath) : IO (Array Name)`: Parse direct imports from a single file."
- 证据等级: A
- 对 M08/M09 的映射: "不建环境、纯文本解析源文件生成依赖图"——个人图谱的依赖完整性检查（红线丙）可直接照搬此模式。

**KF8. mathlib 论文（2019）：src 目录 140085 行 / 34168 个声明，73 名贡献者、11 名维护者，"de facto standard library"**
- 来源: https://arxiv.org/abs/1910.09336 （PDF 全文已提取）
- 标题: The Lean Mathematical Library（The mathlib Community）
- 机构: The mathlib Community（arXiv）
- 日期: 2019-10-21（arXiv 提交）；表 1 数据截至 2019-12-12
- 原文摘录: "Contributions have been made by 73 people and are managed by a team of 11 maintainers. It is the de facto standard library for both programming and proving in Lean 3."；表 1（src 目录）："140085 34168 Table 1. Lines of code, excluding white space and comments, in the top-level directories of the mathlib source code as of December 12, 2019."
- 证据等级: A
- 对 M08/M09 的映射: 数学库规模（14 万行/3.4 万声明）远超个人图谱，但"目录=主题分区+声明计数"的组织可参考。

### B 组：Mizar / MML

**KF9. MML = Mizar 文章（纯文本 .miz），hidden.miz + tarski.miz 为公理基础，其余文章须验证为其推论**
- 来源: https://mizar.uwb.edu.pl/library/ ; https://mizar.uwb.edu.pl/version/current/mml/tarski.miz ; .../hidden.miz
- 标题: Mizar Mathematical Library（官方页面）；tarski.miz / hidden.miz 原文
- 机构: Mizar 项目（University of Białystok / Association of Mizar Users）
- 日期: library 页最后修改 2018-03-23；文章 2025-05-30 版本
- 原文摘录: "The Mizar Mathematical Library (MML) consists of Mizar Articles. Two articles form the foundation of the library: [built-in notions=hidden.miz] [the axioms of the Tarski-Grothendieck set theory=tarski.miz]. All other texts undergo verification by Mizar to be correct consequences of those axioms."；tarski.miz 中 "theorem :: Extensionality (for x being object holds x in X iff x in Y) implies X = Y by TARSKI_0:2;"
- 证据等级: A
- 对 M08/M09 的映射: "纯文本文章+基础公理+逐文验证"是最接近"候选池+审计晋升"的成熟先例。

**KF10. MML 按版本化目录发布（7.11.01_4.117.1046/ → 8.1.15_5.94.1493/ → current/），版本号=系统版本_MML版本_文章数，mml.ini 显式字段**
- 来源: https://mizar.uwb.edu.pl/version/ ; https://mizar.uwb.edu.pl/version/current/mml.ini
- 标题: Index of /version/（Mizar 版本目录）；mml.ini
- 机构: Mizar 项目
- 日期: 目录时间戳 2008-12-30 至 2025-05-30
- 原文摘录: 目录含 "7.11.01_4.117.1046/" … "8.1.15_5.94.1493/" 及 "current/ 2025-05-30"；mml.ini "[Mizar verifier] MizarReleaseNbr=8 MizarVersionNbr=1 MizarVariantNbr=15 [MML] NumberOfArticles=1493 MMLVersion=5.94"
- 证据等级: A
- 对 M08/M09 的映射: "整库版本号+目录快照并存+current 指针"=版本化文件库的长期成熟做法；复合版本号（系统/数据/修订）提示 M08 版本号可分层。

**KF11. MML 版本标识同时出现在主页、分发 README 与 mml.txt 目录头部（"MML Version: 5.94.1493 (May 30, 2025)"）**
- 来源: https://mizar.uwb.edu.pl/ ; https://mizar.uwb.edu.pl/version/current/doc/README ; https://mizar.uwb.edu.pl/version/current/doc/mml.txt
- 标题: Mizar Home Page；Mizar distribution README；The Mizar Mathematical Library Catalogue
- 机构: Mizar 项目 / Association of Mizar Users
- 日期: 2025-05-30 版本
- 原文摘录: 主页 "Current Mizar Version: 8.1.15 … MML Version: 5.94.1493 (May 30, 2025)"；doc/README "Mizar - Version 8.1.15 (Linux/FPC) (MML 5.94.1493) May 30, 2025"；mml.txt 头部 "Version 5.94.1493 … The Mizar Mathematical Library Catalogue (C) Copyright 1989-2025 Association of Mizar Users"
- 证据等级: A
- 对 M08/M09 的映射: 版本标识在官方多处一致出现，可机械校验（红线丙）。

**KF12. MML 修订分三类（authored/automatic/reorganization），automatic 修订用"定理等价性检查软件"删等价定理；survey 补充第四类 pretty-printing**
- 来源: https://mizar.uwb.edu.pl/library/revisions/ ; Bancerek et al. 2018（Europe PMC 全文）
- 标题: Revisions of the Mizar Mathematical Library；The Role of the Mizar Mathematical Library for Interactive Proof Development
- 机构: Mizar 项目；Mizar/AMS
- 日期: revisions 页最后修改 2014-10-28；论文 2018
- 原文摘录: "an authored revision consists of small changes in some articles in the library when somebody writing a new article notices a theorem or a definition in an old article that can be generalized... it is necessary to change (or possibly improve) some older articles that depend on the change."；"an automatic revision takes place frequently whenever either a new revision software is developed, (e.g. software for checking equivalence of theorems, which enables to remove one or two equivalent theorems) or the Mizar verifier is strengthened..."；"a reorganization of the library is rare... changing the order of processing articles when the Mizar Data Base is created."
- 证据等级: A
- 对 M08/M09 的映射: authored 修订=**直接改写旧文章**（与红线甲冲突，靠整库版本快照保历史）；automatic 修订=等价合并/删除（与 M09"旧版本不覆盖"冲突）；但"等价性检查软件+替换表"=可机械判定的合并机制，可借鉴其"映射登记"而非"删除"。

**KF13. mml.lar 是随每个 MML 版本分发的文章处理顺序文件（依赖序），2001 年重组为 concrete/abstract 两组**
- 来源: https://mizar.uwb.edu.pl/version/current/mml.lar ; Bancerek et al. 2018
- 标题: mml.lar（当前 MML 顺序文件）；MML survey 论文
- 机构: Mizar 项目
- 日期: 当前版本 2025-05-30；重组 2001
- 原文摘录: 实测 mml.lar 含 1497 行文章标识符，首行 tarski、xboole_0、boole…，末行 …group_24；survey："the ordering is stored in a special file mml.lar distributed with each MML version. In 2001, a significant reorganization was implemented... Two MML parts were respectively named as: concrete...; abstract..."
- 证据等级: A
- 对 M08/M09 的映射: "处理顺序=依赖序=入库顺序"——M08 候选池的晋升顺序/审计顺序可显式存储为清单文件。

**KF14. MML 条目身份=文章文件名+编号（TARSKI_0:2），文件名有 8+3 唯一性规则**
- 来源: https://mizar.uwb.edu.pl/library/submit.html ; tarski.miz
- 标题: Submission of articles to the MML；tarski.miz
- 机构: Mizar 项目
- 日期: 访问 2026-08-12
- 原文摘录: "The name of your article had to be built according to the ancient "8+3" DOS principles with the obligatory extension ".miz"... The length of the name should be between 5 and 8. File name had to be unique, that is it must differ from article names yet submitted to the MML."；tarski.miz "theorem :: Extensionality ... by TARSKI_0:2"
- 证据等级: A
- 对 M08/M09 的映射: 名字式身份（改名即破坏引用）；"唯一性规则"确保引用不歧义——与红线乙"锚点集合身份"不同，但"唯一性+可机械解析"可借鉴。

**KF15. MML 验证管线=Accommodator/Verifier/Exporter 三程序，文章经 review（rec/acc/pub 日期）后由 Exporter 并入公开数据库**
- 来源: https://mizar.uwb.edu.pl/system/ ; https://mizar.uwb.edu.pl/library/reviews.html
- 标题: Mizar System；MML review process
- 机构: Mizar 项目
- 日期: 访问 2026-08-12（reviews 页含 2026 年记录）
- 原文摘录: "Mizar System is based on three programs named: Accommodator, Verifier, Exporter."；"The contents of an accepted article is extracted by the Exporter utility and incorporated into the public data base distributed to all Mizar users."；reviews 页 "GALOIS_3 (rec. 9.07.2025, acc. 24.01.2026, published 13.06.2026)"
- 证据等级: A
- 对 M08/M09 的映射: "接收→提取→并入数据库"=候选池审计晋升的完整先例；rec/acc/pub 三日期=可复核的审计轨迹（红线丙）。

**KF16. MML 官方提供旧→新条目的机器可读替换表 replths.txt（821 行）与 replthls.txt（94473 行）**
- 来源: https://mizar.uwb.edu.pl/version/current/doc/replths.txt ; .../replthls.txt
- 标题: replths / replthls（MML 替换定理表，随版本分发）
- 机构: Mizar 项目
- 日期: 2025-05-30 版本
- 原文摘录: replths.txt 首行 "BOOLE:6/XBOOLE_0:def 5"、"SUBSET:2/SUBSET_1:def 2"（旧定理/新条目）；replthls.txt 以 "replace" 起始、每行一个条目
- 证据等级: A
- 对 M08/M09 的映射: "旧标识→新标识"映射表=概念重命名/合并的机器可读登记，最接近"旧版本不覆盖"的兼容实现（旧名仍可解析到新名）——M08 可直接采用此格式。

**KF17. mmlquery：官方分发物 miz.xml 内嵌查询工具地址，但当前服务不可达（未核）**
- 来源: https://mizar.uwb.edu.pl/version/current/miz.xml ；探测 http://merak.pb.bialystok.pl/mmlquery/（2026-08-12 连接失败）
- 标题: miz.xml（MML XSL 样式表，内嵌 mmlquery 地址）
- 机构: Mizar 项目
- 日期: 2025-05-30 版本；探测 2026-08-12
- 原文摘录: "<!-- mmlquery address --> <xsl:text>http://merak.pb.bialystok.pl/mmlquery/fillin.php?entry=</xsl:text>"
- 证据等级: A（地址存在）/ 未核（服务可用性：连接被远端关闭）
- 对 M08/M09 的映射: MML 条目查询/解析工具的存在有官方证据，但其当前可用性无法核实；M08 不应依赖外部查询服务，应自建可离线解析的引用索引。

**KF18. MML survey（J Autom Reason 2018）：MML 是"中央管理的知识库"，文章库与"提取信息构成的数据库"分离**
- 来源: https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6044251/fullTextXML （Europe PMC 全文；Springer JAR 官方页被 Client Challenge 拦截）
- 标题: The Role of the Mizar Mathematical Library for Interactive Proof Development（Bancerek, Byliński, Grabowski, Korniłowicz, Matuszewski, Naumowicz, Pąk, Urban）
- 机构: Journal of Automated Reasoning 61:9-32（2018）；Mizar/AMS 作者群
- 日期: 2018 发表
- 原文摘录: "the decision to start building the Mizar Mathematical Library as a centrally-managed knowledge base maintained together with the formalization language and the verification system."；"The formalization scripts were stored in plain text files, called articles, processed independently and with little connection to one another."；"the conventional distinction between the library of Mizar articles … and the database consisting of the extracted information"
- 证据等级: A
- 对 M08/M09 的映射: "源文章库 vs 提取信息数据库"分离=源码与索引/产物分离的学术级表述，支持 M08"可读源+机器校验产物成对存储"。

### C 组：MathComp / Coq

**KF19. MathComp 每半年发布一次、CHANGELOG 记录、官方站点为每版本提供 libgraph（HTML 库依赖图）存档**
- 来源: https://raw.githubusercontent.com/math-comp/math-comp/master/README.md ; https://math-comp.github.io/
- 标题: Mathematical Components README；MathComp 官网
- 机构: math-comp（Coq/Rocq 生态）
- 日期: 官网列出 2.6.0 (2026-07-10)、2.5.0 (2025-10-13)、2.4.0 (2025-04-14)
- 原文摘录: README "released twice a year, in line with the released of the Coq/Rocq proof assistant. Changes are documented systematically in CHANGELOG.md for releases and doc/changelog for unreleased changes."；官网 "Version 2.6.0 (2026-07-10): library graph, coqdoc presentation... See this page for older versions."
- 证据等级: A
- 对 M08/M09 的映射: "固定发布节奏+CHANGELOG+每版本依赖图存档"——版本化文档与依赖图的组合可移植。

**KF20. MathComp 废弃政策：breaking changes 必须先 deprecate，#[deprecated(since="mathcomp x.x.x", use=…)]，保留至少一个发布、尽量两年**
- 来源: https://raw.githubusercontent.com/math-comp/math-comp/master/CONTRIBUTING.md
- 标题: MathComp CONTRIBUTING.md（Breaking changes and deprecations）
- 机构: math-comp
- 日期: 访问 2026-08-12
- 原文摘录: "In principle, changes that may break users' code, e.g.: renaming or removing definitions, lemmas, or libraries, and changing the contents of definitions or the statements of lemmas, should be performed only after deprecating the part of the library to be changed... #[deprecated(since="mathcomp x.x.x", use=foo_new)]... where x.x.x is the version of MathComp that introduces this deprecation."；"The deprecation warnings **must** be kept for at least one release. We try to keep deprecation warnings for **at least two years**... after this period, deprecation warnings might disappear at any moment, making the deletion or the renaming definitive."
- 证据等级: A
- 对 M08/M09 的映射: since 字段=版本标识（可移植）；保留窗口策略（≥1 版/≥2 年）比 mathlib 更保守，但仍是"最终可删"，与本案红线不同。

---

## 3 冲突与张力

1. **"允许最终删除" vs 红线甲/红线九（旧版本不覆盖）**：mathlib"6 个月后可删"、MathComp"至少一版/尽量两年后可删"、MML"等价定理可被删/合并"——三个最接近先例**都允许最终删除**，仅靠 git 历史或版本快照保底。本案 M09 要求"旧版本不覆盖"，比所有先例严格；因此 M08/M09 不能直接引用"先例如此"作为红线豁免依据，必须自行裁决为"快照+替换映射"而非"删除"。
2. **MML authored 修订=原地改写旧文章**：推广/改进旧定理时"necessary to change (or possibly improve) some older articles that depend on the change"（官方原文）——这是"直接覆盖旧知识"的官方流程，与红线甲正面冲突；它的缓解是**整库版本目录快照并存**（7.11.01_4.117.1046/… 全部可下载）。启示：若 M08 允许"修订"，必须同时保证快照完整可回溯，否则即违反红线。
3. **名字式身份 vs 锚点式身份（红线乙）**：mathlib（模块路径+全限定名）、MML（文章文件名+编号）都是**名字/路径式身份**，改名即破坏引用，靠 alias/替换表迁移。没有任何数学库先例采用"身份=内容锚点集合"。锚点式身份是本案独有设计，先例只提供"引用可机械解析"（import/`by X:2`）的基础设施。
4. **git 历史 ≠ 显式版本**：mathlib 主要靠 git master 演进（不固定 commit 的下游会被破坏，靠 deprecated 缓冲）；MML 靠显式版本目录快照（每个版本都完整可下载）；MathComp 靠发布号+CHANGELOG+libgraph 存档。三者的"版本化"层次不同（repo 级 vs 目录快照级 vs 发布级），M08 需明确选哪一层（结论：目录快照+current 指针最接近 MML，最符合红线丁）。
5. **机械校验保证"编译正确"而非"语义不破坏"**：Lake trace/olean 保证"依赖完整、可重建"；Mizar Verifier 保证"证明可验证"；但都**不保证**下游语义不变（这正是 deprecated 缓冲存在的理由）。M08 若用哈希/校验，只能保证"内容未被篡改/依赖完整"，不能自动判定"旧结论被改写"——后者须靠显式版本+审计轨迹。

---

## 4 未决

1. **MML Query 服务可用性**：mmlquery 地址（http://merak.pb.bialystok.pl/mmlquery/fillin.php?entry=）内嵌于官方 miz.xml，2026-08-12 探测连接被远端关闭 → 服务可用性未核（地址存在=A 级证据）。
2. **MML 是否有显式"永不移除条目"政策**：未见官方原文；从修订类型与 replths 替换表推断，MML 会删除/合并等价定理，即无"永不移除"承诺 → 标 C（推断）/未核（无官方原文）。
3. **mathlib 声明级（declaration-level）依赖图标准工具**：import-graph 明确是模块/文件级；声明级依赖（常量引用图）未见官方标准导出工具（leanchecker 从 .olean 重放内核检查是校验器而非依赖图工具）→ 未核（部分）。
4. **Springer JAR 官方全文**：link.springer.com 被 Client Challenge 拦截；已用 Europe PMC 全文（同一论文 PMC6044251）取代，官方站原文未核。
5. **mathlib4 GitHub wiki 网页**：网页为 JS 渲染无法直接抓取；已用 wiki 的 git 仓库（mathlib4.wiki.git）拿到原文 md → 网页直接抓取未核，内容已到手。
6. **当前 MML 计数口径**：version/current/mml/ 目录 1500 个 .miz，mml.lar 1497 行，mml.ini NumberOfArticles=1493，三数不一致（差 3-7）——差异来源（隐藏文章/辅助文件/计数口径）未核，仅如实记录。

---

## 5 来源清单

| # | 来源 | 类型 | 原文到手 |
|---|---|---|---|
| 1 | mathlib4 README（GitHub leanprover-community/mathlib4） | 工程仓库/官方文档 | A |
| 2 | Mathlib.lean 根文件（master，8308 条 public import） | 工程仓库 | A |
| 3 | lakefile.lean（require 上游 git 依赖） | 工程仓库 | A |
| 4 | lean-toolchain（leanprover/lean4:v4.34.0-rc1） | 工程仓库 | A |
| 5 | lake-manifest.json（8 依赖锁定 git rev） | 工程仓库 | A |
| 6 | Lake README（leanprover/lean4 src/lake/README.md） | 官方文档 | A |
| 7 | Lean Language Reference §5 Source Files and Modules（lean-lang.org） | 官方文档 | A |
| 8 | mathlib4 贡献风格指南（Deprecation 节，leanprover-community.github.io） | 官方文档 | A |
| 9 | import-graph README（GitHub leanprover-community/import-graph） | 工程仓库/工具文档 | A |
| 10 | mathlib4 wiki: Using mathlib4 as a dependency（mathlib4.wiki.git） | 官方 wiki | A |
| 11 | The Lean Mathematical Library（arXiv:1910.09336，PDF 全文提取） | 学术论文 | A |
| 12 | Mizar Home Page（mizar.uwb.edu.pl，MML Version 5.94.1493） | 官方 | A |
| 13 | Mizar Mathematical Library 页（library/，MML 定义与公理基础） | 官方 | A |
| 14 | Index of /version/（版本化目录 7.11.01_4.117.1046 → 8.1.15_5.94.1493 → current） | 官方 | A |
| 15 | Revisions of the MML（三类修订） | 官方 | A |
| 16 | MML review process（rec/acc/pub 记录） | 官方 | A |
| 17 | Submission of articles to the MML（8+3 文件名规则） | 官方 | A |
| 18 | Mizar System（Accommodator/Verifier/Exporter） | 官方 | A |
| 19 | tarski.miz / hidden.miz（公理基础文章原文） | 官方数据 | A |
| 20 | mml.lar / mml.ini（处理顺序文件 / 版本字段） | 官方数据 | A |
| 21 | replths.txt（821 行）/ replthls.txt（94473 行）替换表 | 官方数据 | A |
| 22 | mml.txt（MML Catalogue）与 doc/README（Mizar 8.1.15 (MML 5.94.1493)） | 官方数据 | A |
| 23 | miz.xml（内嵌 mmlquery 地址） | 官方数据 | A |
| 24 | Bancerek et al., The Role of the MML…, J Autom Reason 61:9-32, 2018（Europe PMC 全文） | 学术论文 | A |
| 25 | mathcomp README（发布节奏/CHANGELOG） | 工程仓库 | A |
| 26 | mathcomp CONTRIBUTING.md（deprecation 政策） | 工程仓库/官方 | A |
| 27 | MathComp 官网（2.6.0/2.5.0/2.4.0 与 libgraph 存档） | 官方 | A |
| 28 | mmlquery 端点探测（merak.pb.bialystok.pl，连接失败） | 官方工具 | 未核 |
| 29 | Springer JAR 官方页（Client Challenge 拦截） | 学术论文 | 未核 |

合计：可核来源 27 项（#1–27，均为原文到手 A），未核 2 项（#28、#29，其中 #28 的地址有 #23 佐证）。

---

## 6 判死自查

- **可核来源 ≥ 15**：27 项（A 级原文到手）→ 达标（红线要求 15）。
- **原文到手 ≥ 10**：27 项全部原文到手（含 PDF 提取、Europe PMC 全文、wiki git 仓库 md、.miz/.lar/ini/txt 官方数据）→ 达标（红线要求 10）。
- **来源类型 ≥ 3 类**：官方文档（#6、7、8、10、12–18、27）、学术论文（#11、24）、工程仓库（#1–5、9、25、26）→ 3 类，达标。
- **候选逐一查证 ≥ 5**：mathlib4（#1–5、8、10、11）、MML（#12–23）、lake（#3–6）、import 图工具（#7、9、20、27、23）、重构/废弃先例（#8、15、16、21、26）→ 5 组候选全部逐一查证，达标。
- **关键词 ≥ 4 组**：中文 4 组（"mathlib 存储 依赖 版本管理"、"Mizar MML 条目 版本"、"形式化数学 库 依赖图"、"证明库 重构 废弃 处理"）+ 英文 4 组（"mathlib4 storage module structure versioning"、"Mizar MML article version identification"、"formal math library dependency graph tooling"、"proof library refactoring deprecation policy"）→ 8 组，达标。
- **禁止项**：未评测任何工具性能；间隔重复/学习记录未涉足（归 B6b/c）；锚点校验方法未涉足（归 B8）；无捏造来源；抓取失败处（mmlquery 可用性、Springer 官方页、wiki 网页直抓）均已标"未核"；推断（MML 无永不移除政策、计数口径差异）已标 C/未核。

---

## 附：关键原文存档位置（工作区 tmp/b6a/）

抓取原文均存于 `C:\Users\Wang\Desktop\Studium\research_tree\tmp\b6a\`：mathlib4_readme.md、mathlib4_Mathlib_lean.txt、mathlib4_lakefile_lean.txt、mathlib4_leantoolchain.txt、mathlib4_lakemanifest.json、lake_lean4_readme.md、lean_ref_modules_text.txt、lc_contribute_style_text.txt、importgraph_readme.md、wiki_using_mathlib_as_dependency.md、mathlib_paper.txt、mizar_home.html、mizar_library.html、mizar_version.html、mizar_revisions.html、mizar_reviews.html、mizar_submit.html、mizar_system.html、tarski_raw.miz、hidden_raw.miz、mml_lar.txt、mml_ini.txt、replths.txt、replthls.txt、mml_doc.txt、doc_readme.txt、miz_xml.txt、pmc_mml_survey.txt、mathcomp_readme.md、mathcomp_contributing.md、mathcomp_site.txt 等。
