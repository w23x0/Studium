# B6b Anki / FSRS 复习日志（revlog）格式与版本化先例 — 发现报告

- 分支: B6b — Anki revlog 与 FSRS scheduler 的时间版本数据结构（间隔重复领域）
- 调研员: Aquinas（B6b，B6 先例系 R3 子任务）
- 日期: 2026-08-12（Asia/Shanghai），抓取以当日访问为准
- 证据等级: A=原文到手（官方规范/源码/官方文档/论文中文全文/元数据 API）；B=二手可靠转述；C=推断。抓取失败写"未核"。
- 红线参照（本案，即 M08/M09 所在知识库红线）: 红线甲=知识记录不可覆盖（旧结论须以版本或追加方式保留、可回溯）；红线乙=节点身份=锚点集合（身份稳定、可机械判定）；红线丙=记录/评审可复核、可机械校验；红线丁=可追加、防篡改（append-only 或等价物）。

---

## 0 一句话结论

Anki 把"复习历史"（revlog，每复习一行、id=复习时刻的 epoch 毫秒时间戳、平时只 INSERT 追加）与"卡片当前状态"（cards 行 + cards.data JSON 里的 FSRS stability/difficulty，每次复习 UPDATE 覆盖）分离存储；FSRS 不拥有存储，其 stability/difficulty 是可由完整 revlog 重算的派生量，revlog 同时是训练数据与重建依据；但 revlog 并非严格 append-only（撤销可物理删行、v2 迁移可批量 UPDATE 改写历史），同步合并时"事件全保留、状态取较新 mtime"——即 Anki/FSRS 的先例是"事件日志不可覆盖 + 当前状态可覆盖且可重算"，这与本项目红线甲/丁（旧结论不覆盖、可追加防篡改）只在"事件层"吻合，"状态层"与"撤销/迁移层"均需 M09 自行加固为显式版本化。

---

## 1 逐条回答

### 1.1 Anki 的 collection/revlog 数据库结构：复习事件如何按时间追加、旧状态是否被覆盖

Anki 用一个 SQLite 数据库（collection.anki2）存全部数据（AnkiDroid Database Structure wiki："Anki uses a single SQLite database to store information on all of its decks, templates, fields and cards"；Anki 手册 files 页："Your notes, decks, cards and so on in a file called collection.anki2"）。revlog 表定义为：id（主键，=复习时刻 epoch 毫秒）、cid（卡 id）、usn（同步序列号）、ease（按钮评分）、ivl/lastIvl（间隔，正=天负=秒）、factor（ease factor；FSRS 激活时存难度归一化 100–1100）、time（答题毫秒）、type（0=learn,1=review,2=relearn,3=filtered,4=manual,5=rescheduled）。AnkiDroid wiki 原文："revlog is a review history; it has a row for every review you've ever done!"；Rust 源码 `RevlogId::new()` 即 `TimestampMillis::now()`。**写入路径**（`answer_card_inner`）：取 card → clone original → 应用新状态 → `add_partial_revlog`（INSERT revlog 一行）→ `update_card_inner`（UPDATE cards 当前行，覆盖 interval/factor/memory_state 等）。所以：**复习事件按时间戳追加（revlog），旧复习永不覆盖；但"当前卡片状态"每次复习都被 UPDATE 覆盖，旧状态不保留在 cards 行**——旧状态只有通过 revlog 重建。等级 A。

### 1.2 FSRS 输入/输出与日志：时间戳、稳定性、难度如何更新，历史可否重建

FSRS 的输入不是"状态"，而是从 revlog 导出的 `FSRSReview{rating, delta_t}` 序列（`reviews_for_fsrs`：把 revlog 按卡分组、按时间排序、计算相邻两次复习的天数差 delta_t）。输出/状态：每次复习后由公式算出新的 Stability S 与 Difficulty D（FSRS-6 21 参数，`S'_r`/`S'_f`/`D'` 公式见 awesome-fsrs The-Algorithm）。Anki 把当前 memory state 存进 cards.data JSON（`"s"`/`"d"`，写入前四舍五入：s 4 位、d 3 位），revlog.factor 同时冗余存难度归一化值。**可重建性**：`update_memory_state`/`compute_memory_state` 会用"整卡 revlog 历史"重算 memory state（`fsrs_items_for_memory_states`）；revlog 被截断时以第一条用户评分（或 SM-2 参数 `memory_state_from_sm2`）反推起始状态再前向重放（`starting_state` 注释："When revlogs have been truncated, this stores the initial state at first review"）。官方语义：**历史可重建是设计预期，但重建质量依赖 revlog 完整性**（用户可删 revlog，见 1.4/未决）。等级 A。

### 1.3 Anki 同步（collections 合并）时的版本冲突处理："旧结论覆盖新结论"风险与本项目红线对照

同步分三级（`sync_meta.rs`）：`remote.modified == local.modified → NoChanges`；`remote.schema != local.schema → FullSyncRequired`（整库级 one-way）；否则 NormalSync。正常同步中：revlog 双向合并 = `merge_revlog` 逐个 `add_revlog_entry(&entry, false)`（INSERT OR IGNORE，同 id 已存在则忽略，绝不覆盖）；cards/notes 合并 = `add_or_update_card_if_newer`，判定条件 `!existing.usn.is_pending_sync || existing.mtime < entry.mtime`——**即"较新 mtime 的卡片状态覆盖较旧者"**。Anki 手册原文："If the same card has been reviewed in two different locations, both reviews will be marked in the revision history, and the card will be kept in the state it was when it was most recently answered."；无法合并的格式类变更会警告并在下次同步"choose whether to keep the local copy or the copy on AnkiWeb"；one-way sync"only changes on one end can be preserved"，全量上传/下载=整体替换集合文件（临时文件校验后 `atomic_rename`）。**与红线对照**：同步层存在真实的"旧结论（作为卡片状态）被较新 mtime 覆盖"机制——不是"旧结论被保留为版本"，而是"历史事件保留+状态以时间裁决"。这与红线甲直接冲突，是 M09 必须显式改写的点（见 1.5 与 KF5）。等级 A。

### 1.4 间隔重复系统对"重新掌握/遗忘→新状态"的建模：覆盖写还是新记录

Anki/FSRS 把遗忘→重学建模为**同卡状态转换 + revlog 事件标记**，不产生新的卡片实体版本：遗忘后卡进入 `CardType::Relearn`（AnkiDroid wiki type=3=relearning；`upgrade_to_v2` 把 relearning 卡改类为 Relearn）；FSRS 遗忘后按 `S'_f` 计算新 stability（The-Algorithm 公式）；"重置"是 revlog 里一条 `type=Manual + factor=0` 的特殊事件（`is_reset()`），`reviews_for_fsrs` 遇到 reset 时"Ignore entries prior to a `Reset`"——即**把 reset 当作历史分段边界，而不是新卡片/新版本**。所以答案是：**覆盖写（卡片当前状态行 UPDATE）+ 追加日志（revlog 每复习一行，reset 用特殊事件标记分段）**；不存在"旧版本卡片实体"的显式建模。对 M09 的含义：若要"复检/遗忘/重新掌握=新版本"，Anki 先例没有现成的实体级版本，只有"事件流+状态重算"；M09 可在事件流里把"重新掌握事件"当作版本边界标记（借鉴），也可自建显式版本叠加（Anki 未提供，需自建）。等级 A。

### 1.5 对 M09"复检/遗忘/重新掌握=新版本、旧版本不覆盖"的可借鉴点与不可借鉴点

**可借鉴**：(1) 事件日志与当前状态分离——把"每次复检/遗忘/重新掌握"写成追加事件（带时间戳 id），状态作为可由事件序列机械重算的派生值，天然满足红线丙（可复核）与"旧事件不覆盖"；(2) 主键冲突 `INSERT OR IGNORE` 语义=幂等合并，多端/多副本合并时事件全保留；(3) 同步合并规则"历史事件全保留、状态取最新 mtime"可作为 M09 多端合并的底线（至少事件不丢）；(4) reset/重学作为事件类型标记，可平移为"重新掌握事件=版本边界"；(5) 截断历史时用首条用户评分+前向重放重建状态——M09 的"版本可回溯"可借用"从头重放"机制做机械校验。
**不可借鉴**：(1) 卡片当前状态 UPDATE 覆盖（与红线甲正面冲突，M09 不能只存当前状态，必须保留每版本）；(2) 撤销=物理删除 revlog 行、v2 迁移=批量 UPDATE 改写历史行（与红线丁冲突，M09 须把撤销/迁移实现为追加反向事件/新版本）；(3) FSRS 参数（fsrs_params_4/5/6、desired_retention）只有当前值、无参数版本历史（M09 若需"评审可复核"须自建参数版本链）；(4) 身份是数据库自增 cid，不是内容锚点（与红线乙不兼容，M09 身份仍须锚点集合）；(5) "Deck options are not retroactive"表明 Anki 允许配置变更不回溯旧排期——M09 须自行裁决"版本修正是否回溯旧版本"。

---

## 2 关键发现

每条包含：论断 | 来源 URL | 标题 | 机构 | 日期 | 原文摘录 | 证据等级 | 对 M08/M09 的映射启示。

### KF1. revlog 是"每复习一行"的追加式事件日志：id=复习时刻 epoch 毫秒，写入用 INSERT OR IGNORE（常态不覆盖）
- 来源: https://github.com/ankidroid/Anki-Android/wiki/Database-Structure ；https://github.com/ankitects/anki/blob/main/rslib/src/revlog/mod.rs ；https://github.com/ankitects/anki/blob/main/rslib/src/storage/revlog/add.sql
- 标题: Anki database structure（AnkiDroid wiki）；rslib/src/revlog/mod.rs；rslib/src/storage/revlog/add.sql（Anki 官方源码）
- 机构: AnkiDroid 社区 / Ankitects Pty Ltd
- 日期: 访问 2026-08-12（wiki 与仓库 main 指针，无版本日期）
- 原文摘录: AnkiDroid wiki："-- revlog is a review history; it has a row for every review you've ever done!"、"id ... epoch-milliseconds timestamp of when you did the review"；源码 `RevlogId::new()` 即 `RevlogId(TimestampMillis::now().0)`；add.sql 为 `INSERT OR IGNORE INTO revlog (...)`（同 id 已存在时在 uniquify 分支取 `SELECT max(id) + 1 FROM revlog`）
- 证据等级: A
- 对 M08/M09 的映射启示: 先例做法 X（事件按时间戳追加、主键幂等不覆盖）与红线甲/丁的关系是 Z=同构——"每次复习一行、id=复习时刻、平时只 INSERT"就是事件追加式历史的最小形态；M09 的"复检/遗忘/重新掌握=新记录、旧记录不覆盖"可直接照搬此形态。注意：Anki 的 revlog 只记 rating/interval 等事件字段，状态快照另存（见 KF2/KF3），且"平时"不是"永远"（见 KF4）。

### KF2. 卡片当前状态（含 FSRS S/D 的 cards.data JSON）每次复习 UPDATE 覆盖；旧状态不保留在 cards 行，只能经 revlog 重建
- 来源: https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/answering/mod.rs ；https://github.com/ankitects/anki/blob/main/rslib/src/storage/card/data.rs
- 标题: rslib/src/scheduler/answering/mod.rs（answer_card_inner）；rslib/src/storage/card/data.rs（CardData）
- 机构: Ankitects Pty Ltd
- 日期: 访问 2026-08-12（main 指针）
- 原文摘录: `answer_card_inner` 顺序：`let original = card.clone();` → `apply_study_state(...)` → `self.add_partial_revlog(revlog_partial, usn, answer)?;` → `self.update_card_inner(&mut card, original, usn)?;`；`CardData` JSON 键为 `"s"`（fsrs_stability）、`"d"`（fsrs_difficulty）、`"dr"`（desired_retention）、`decay`、`"lrt"`（last_review_time）、`"cd"`（custom_data），写入前按 4/3/2/3 位小数舍入
- 证据等级: A
- 对 M08/M09 的映射启示: X（"事件追加 + 状态行覆盖"的双层结构）与红线甲的关系是 Z=部分同构、部分冲突——事件层不覆盖（可借鉴），状态层每次覆盖（红线甲的反面）；M09 若采用同构双层结构，必须把"每个旧结论（版本）"显式放回事件/版本层，而不是只保留当前状态行，否则旧版本不可回溯。

### KF3. FSRS 的输入是 revlog 导出的 rating+delta_t 时间序列；S/D 是可由完整历史重算的派生量；历史截断时用首条评分反推起始状态再前向重放
- 来源: https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/fsrs/params.rs ；https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/fsrs/memory_state.rs
- 标题: rslib/src/scheduler/fsrs/params.rs（reviews_for_fsrs）；rslib/src/scheduler/fsrs/memory_state.rs
- 机构: Ankitects Pty Ltd
- 日期: 访问 2026-08-12（main 指针）
- 原文摘录: params.rs 用 `tuple_windows` 计算 `delta_t = previous.days_elapsed(next_day_at) - current.days_elapsed(next_day_at)`（首条为 0），训练模式每个复习点生成一个 `FSRSItem`、运行模式只要最后一条完整历史；memory_state.rs 注释："When calculating memory state, only the last FSRSItem is required."、"When revlogs have been truncated, this stores the initial state at first review"；截断时用第一条用户评分的 interval/ease_factor 经 `memory_state_from_sm2` 反推起始状态再前向重放（"the revlog has been truncated, but not fully"）
- 证据等级: A
- 对 M08/M09 的映射启示: X（状态=历史序列的确定性函数、从头重放可重建）与红线丙的关系是 Z=同构——"用完整 revlog 重算 memory state"就是机械校验的最小实现；M09 若以"事件序列 + 确定性函数"定义版本状态，天然可复核。但重建依赖 revlog 完整（Anki 允许删/忽略历史，见 KF4、未决 5），M09 须把"日志不可删"当作红线丁的实现要求。

### KF4. revlog 并非严格 append-only：撤销物理 DELETE、v2 迁移批量 UPDATE 改写历史行（红线反例）
- 来源: https://github.com/ankitects/anki/blob/main/rslib/src/storage/revlog/mod.rs ；https://github.com/ankitects/anki/blob/main/rslib/src/storage/revlog/v2_upgrade.sql ；https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/upgrade.rs
- 标题: rslib/src/storage/revlog/mod.rs（remove_revlog_entry / upgrade_revlog_to_v2）；rslib/src/storage/revlog/v2_upgrade.sql；rslib/src/scheduler/upgrade.rs（upgrade_to_v2_scheduler）
- 机构: Ankitects Pty Ltd
- 日期: 访问 2026-08-12（main 指针）
- 原文摘录: `remove_revlog_entry` 注释 "Only intended to be used by the undo code, as Anki can not sync revlog deletions"（执行 `delete from revlog where id = ?`）；`upgrade_revlog_to_v2` 执行 `UPDATE revlog SET ease = ease + 1 WHERE ease IN (2, 3) AND type IN (0, 2);`；`upgrade_to_v2_scheduler` 末尾注释 "// force full sync" + `self.set_schema_modified()`
- 证据等级: A
- 对 M08/M09 的映射启示: X（撤销/迁移直接改写历史行）与红线丁的关系是 Z=冲突——这是 Anki 先例中与"可追加、防篡改"正面矛盾的机制，且官方只把"删除不同步"当限制而非禁忌。M09 若采用追加式历史：撤销必须实现为"追加反向事件/新版本"而非物理 DELETE；迁移必须实现为"新版本 + 迁移记录"而非批量 UPDATE（Anki 的"迁移后强制全量同步"只保护一致性、不保护历史）。

### KF5. 同步合并=revlog 全保留（INSERT OR IGNORE，绝不覆盖）+ 卡片状态按较新 mtime 覆盖；无法合并/全量同步=集合级整体替换
- 来源: https://docs.ankiweb.net/syncing.html ；https://github.com/ankitects/anki/blob/main/rslib/src/sync/collection/chunks.rs ；https://github.com/ankitects/anki/blob/main/rslib/src/sync/collection/meta.rs
- 标题: Syncing with AnkiWeb（Anki 官方手册）；rslib/src/sync/collection/chunks.rs；rslib/src/sync/collection/meta.rs
- 机构: Ankitects Pty Ltd
- 日期: 手册为当前在线版（访问 2026-08-12）；源码 main 指针
- 原文摘录: 手册："If the same card has been reviewed in two different locations, both reviews will be marked in the revision history, and the card will be kept in the state it was when it was most recently answered."、"If changes have been made on both ends, only changes on one end can be preserved."；源码 `merge_revlog` 逐条 `self.storage.add_revlog_entry(&entry, false)?`（INSERT OR IGNORE，同 id 已存在则忽略）；`add_or_update_card_if_newer` 判定 `!existing_card.usn.is_pending_sync(pending_usn) || existing_card.mtime < entry.mtime`；meta.rs：`remote.modified == local.modified → NoChanges`、`remote.schema != local.schema → FullSyncRequired`、否则 `NormalSyncRequired`；全量上传/下载=临时文件+完整性校验+`atomic_rename` 整体替换
- 证据等级: A
- 对 M08/M09 的映射启示: X（历史事件全保留 + 状态按时间裁决）与红线甲的关系是 Z=部分同构——"revlog 双向合并绝不覆盖"是可借鉴的幂等合并规则；但"卡片状态按较新 mtime 覆盖"正是"旧结论被新结论覆盖"的机制（红线甲风险点）。M09 多端合并若只抄 Anki 规则，被裁决为"旧"的一端状态会丢；须把"时间裁决"本身也写成版本事件（例如"被哪个版本取代"）。

### KF6. 遗忘/重学=同卡状态转换 + reset 事件标记（Manual+factor=0）分段历史，无"新卡片实体版本"
- 来源: https://github.com/ankitects/anki/blob/main/rslib/src/revlog/mod.rs ；https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/fsrs/params.rs ；https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/upgrade.rs
- 标题: rslib/src/revlog/mod.rs（RevlogReviewKind / is_reset）；rslib/src/scheduler/fsrs/params.rs（reviews_for_fsrs）；rslib/src/scheduler/upgrade.rs（upgrade_to_v2）
- 机构: Ankitects Pty Ltd
- 日期: 访问 2026-08-12（main 指针）
- 原文摘录: `is_reset()` = `self.review_kind == RevlogReviewKind::Manual && self.ease_factor == 0`，注释 "These entries are created when a card is reset using Collection::reschedule_cards_as_new"；params.rs 注释 "// Ignore entries prior to a `Reset` if a learning step has come after, but consider revlogs complete."；upgrade.rs：relearning 卡 `self.ctype = CardType::Relearn`；FSRS-6 符号表 "$S'_f$: new stability after forgetting"（The-Algorithm）
- 证据等级: A
- 对 M08/M09 的映射启示: X（用事件类型标记 reset/重学作为历史分段边界）与红线甲的关系是 Z=部分同构——M09 可借鉴"事件类型=版本边界"：把"重新掌握/遗忘"事件标记为新版本起点，历史在事件流内自然分段；但 Anki 没有"卡片实体版本"（同一 cid 只有一行当前状态），M09 若要"旧版本不覆盖"须在事件流之上自建显式版本叠加（Anki 未提供现成机制）。

### KF7. FSRS 算法不拥有存储：宿主持久化 MemoryState；调度器返回 card+log（含 stability/difficulty）；优化器从复习历史训练参数
- 来源: https://github.com/open-spaced-repetition/fsrs-rs ；https://github.com/open-spaced-repetition/ts-fsrs ；https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-mechanism-of-optimization
- 标题: fsrs-rs README；ts-fsrs README（pkg）+ src/models.ts；awesome-fsrs wiki: The mechanism of optimization
- 机构: open-spaced-repetition（社区）/ MaiMemo Inc.（算法源起）
- 日期: 访问 2026-08-12（仓库 main 指针）
- 原文摘录: fsrs-rs README："Replace `previous_state`/`elapsed_days` with a stored `MemoryState` and the number of days since the prior review when scheduling existing cards."；ts-fsrs：`scheduler.next(card, new Date(), Rating.Good)` 返回 `result.card` 与 `result.log`；`ReviewLog { rating, state, due, stability, difficulty, ... }`（models.ts）；`rollback(card, log)` / `forget(...)` / `reschedule(...)` "useful when replaying imported review logs or rebuilding state from persistence"；wiki："The optimizer applies Maximum Likelihood Estimation and Backpropagation Through Time to estimate the stability of memory and learn the laws of memory from time-series review logs."
- 证据等级: A
- 对 M08/M09 的映射启示: X（算法/存储解耦：算法只管"状态+间隔→新状态+新日志"，宿主决定存什么）与红线乙/丙的关系是 Z=同构——M09 可自由定存储载体（事件表/文件/JSON），只要"输入=完整事件历史+参数版本、输出=新状态+新日志"确定，评审即可机械复核；ts-fsrs 的 `rollback`/`reschedule` 说明"日志重放重建状态"是官方支持的用法。注意 Anki 只存 FSRS 参数当前值（无参数历史），M09 的"评审可复核"须自补参数版本链（见未决 6）。

### KF8. MaiMemo/FSRS 的学术数据基础是海量复习日志时间序列（2.2 亿条）：事件日志同时是训练数据与重建依据
- 来源: https://memodocs.maimemo.com/docs/2022_KDD （官方中文全文）；Crossref DOI 10.1145/3534678.3539081（元数据核实）
- 标题: A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling（KDD 2022，Ye, Su, Cao；墨墨官方中文版）
- 机构: MaiMemo Inc.（墨墨背单词）/ ACM SIGKDD
- 日期: 论文 2022；中文全文页访问 2026-08-12；Crossref 元数据核实同日
- 原文摘录: 中文全文摘要："我们收集了 2.2 亿个具有时间序列特征的学生记忆行为日志，并建立了具有马尔可夫性的记忆模型"；3.1 节："我们收集了墨墨背单词一个月的日志，包含 2.2 亿条记忆行为数据"；事件四元组 (u, w, Δt, r)，历史特征 Δt₁:i-1、r₁:i-1 参与建模
- 证据等级: A（官方中文全文 + Crossref 元数据；英文原文 PDF 未直接抓取，见未决 1）
- 对 M08/M09 的映射启示: X（事件日志时间序列同时充当训练数据与状态重建依据）与红线丙的关系是 Z=同构——"日志可重算状态"与"日志可训练参数"同源；M09 的"复检/评审记录"若做成结构化的追加事件（带时间、评分、结果），就能同时支撑"评审可复核"与"参数可审计"（后者为 FSRS 系先例独有，M09 可选择性借鉴）。

---

## 3 冲突与张力

1. **事件日志追加 vs 迁移改写历史行**（KF1 vs KF4）：Anki 常态只 INSERT revlog（"a row for every review you've ever done"），但 v2 迁移会 `UPDATE revlog SET ease=ease+1` 批量改写历史行、撤销会物理 DELETE 行——"每复习一行"只是常态，不是不可变保证。
2. **手册"reviews can be merged" vs 状态按较新 mtime 覆盖**（KF5）：同一张卡在两个设备被复习，官方承诺"两个复习都进 revision history"，但卡片状态"kept in the state it was when it was most recently answered"——被裁决为"旧"的一端状态不以版本保留，红线甲在状态层没有先例支撑。
3. **"revlog 是完整历史" vs 用户可主动删/忽略历史**：AnkiDroid wiki 称 revlog 记录每次复习，但官方 deck-options 明说历史可能因 "Ignore cards reviewed before" 或 "previously deleted review logs to free up space" 而不完整；FSRS 因此专门实现了"截断后从首条评分反推起始状态"（KF3）。
4. **当前状态=唯一权威（Anki 存档语义） vs 红线甲=每个旧结论可回溯**：Anki 把"卡片现在是什么状态"（cards 行 + data JSON）当权威，历史只是辅助；本项目红线要求旧结论也是一等公民、可回溯——这是存档语义层面的世界观冲突，不是字段差异，M09 需要自行裁决。
5. **FSRS 参数只有当前值 vs 评审可复核需参数版本链**：Anki DeckConfig 只有 fsrs_params_4/5/6（当前值）+ desired_retention/historical_retention，无参数历史；"Deck options are not retroactive" 官方承认配置变更不回溯旧排期。M09 若要"旧版本按当时参数重算"，需自建参数版本链。
6. **学术声称"2.2 亿条日志" vs 公开可复核数据有限**：KDD/TKDE 以私有海量日志训练（KF8），公开的 MaiMemo Harvard Dataverse 数据集与 HF anki-revlogs-10k（主页 401 未核）只是子集——"日志即真理"的叙事与"第三方可机械验证"之间仍有缺口。

---

## 4 未决

1. MaiMemo KDD 2022 / TKDE 2023 只拿到官方中文全文（memodocs）+ Crossref 元数据核实，未直接抓取 ACM/IEEE 英文原文 PDF；现按 A 处理（官方译文+DOI/标题/作者/会议元数据核实），如需更严可降 B。
2. 两篇 MaiMemo 论文的 arXiv 预印本编号未核到（arXiv API 查询 totalResults=0；曾误抓一篇 Hartree Fock 物理论文，已物理删除且不引用）——本报告不写任何具体 arXiv 编号。
3. ts-fsrs 的 `ReviewLog` 类型定义（含 stability/difficulty）已到手；其"内部是否持久化每次旧状态快照"的实现细节未逐一核（文档层按 A，实现细节未核）。
4. HF 数据集 anki-revlogs-10k 主页访问被拒（401，需登录），仅拿到 builder README 与 stats.proto——数据集实际行数/字段以"未核"处理，本报告只引用"工具链存在"这一事实。
5. Anki deck-options "Ignore Cards Reviewed Before" 的用户可见说明已到手（deck-options.html 明说历史可因删除 revlog 而不完整），但"删 revlog"的具体 UI/代码入口未在源码逐一核到——该机制的存在为 A 级（手册原文），触发路径为 C 级推断。
6. "参数变更时旧参数是否留档、旧状态能否按旧参数重算"：无官方机制证据，Anki 只存当前 fsrs_params_4/5/6——按 C 级判断：M09 须自建参数版本链才能满足"评审可复核"。

---

## 5 来源清单

（可核来源 34 条；原文到手 33 条。A=原文到手；B=二手可靠转述；C=推断。抓取以 2026-08-12 访问为准。）

### 5.1 候选逐一查证记录（8 条候选全部查证）

| 候选 | 查证方式 | 结果 |
|---|---|---|
| Anki 官方数据库结构 | GitHub ankitects/anki main 源码 schema11.sql + AnkiDroid wiki Database-Structure | 原文到手（schema 全文 + revlog 逐字段注释），A |
| Anki 官方同步机制 | docs.ankiweb.net/syncing.html + sync/collection/{chunks,meta,upload,download}.rs | 原文到手，A |
| AnkiDroid Database Structure wiki | github.com/ankidroid/Anki-Android/wiki/Database-Structure | 原文到手，A |
| fsrs-rs | github.com/open-spaced-repetition/fsrs-rs README + src/dataset.rs | 原文到手，A |
| fsrs4anki / awesome-fsrs wiki | The-Algorithm / The-mechanism-of-optimization / ABC-of-FSRS / Research-resources | 原文到手，A |
| ts-fsrs | github.com/open-spaced-repetition/ts-fsrs README(pkg) + src/models.ts | 原文到手，A |
| MaiMemo KDD/TKDE 论文 | memodocs.maimemo.com 官方中文全文 + Crossref API（DOI 10.1145/3534678.3539081、10.1109/tkde.2023.3251721） | 中文全文+元数据到手，英文 PDF 未核，A/B |
| Anki 官方手册（deck-options / exporting / backups / files / syncing） | docs.ankiweb.net 对应页面 | 原文到手，A |

### 5.2 来源明细（按类别，共 34 条）

**Anki 官方源码（GitHub ankitects/anki，main 指针，A 级原文，15 条）**
1. rslib/src/storage/schema11.sql — revlog 表结构（id/cid/usn/ease/ivl/lastIvl/factor/time/type + ix_revlog_cid/ix_revlog_usn）
2. rslib/src/revlog/mod.rs — RevlogId::new()=TimestampMillis::now()；RevlogReviewKind 0–5；is_reset()；has_rating_and_affects_scheduling()
3. rslib/src/storage/revlog/mod.rs — add_revlog_entry（INSERT OR IGNORE + uniquify max(id)+1）；remove_revlog_entry（仅撤销用、删除不同步）；upgrade_revlog_to_v2
4. rslib/src/storage/revlog/add.sql — INSERT OR IGNORE 语句全文
5. rslib/src/storage/revlog/v2_upgrade.sql — UPDATE revlog SET ease=ease+1 ...
6. rslib/src/scheduler/answering/mod.rs — answer_card_inner：clone→apply_study_state→add_partial_revlog→update_card_inner
7. rslib/src/storage/card/data.rs — cards.data JSON（s/d/dr/decay/lrt/cd）
8. rslib/src/scheduler/fsrs/params.rs — reviews_for_fsrs：delta_t、训练/运行模式、reset 分段
9. rslib/src/scheduler/fsrs/memory_state.rs — fsrs_items_for_memory_states、截断时起始状态反推、memory_state_from_sm2
10. rslib/src/sync/collection/chunks.rs — merge_revlog（INSERT OR IGNORE）、add_or_update_card_if_newer（mtime 裁决）
11. rslib/src/sync/collection/meta.rs — NoChanges / FullSyncRequired / NormalSyncRequired 判定
12. rslib/src/scheduler/upgrade.rs — upgrade_to_v2_scheduler（强制 full sync）、Relearn 分类
13. rslib/src/decks/deckconfig/mod.rs — fsrs_params_4/5/6、desired_retention=0.9、historical_retention、ignore_revlogs_before_date
14. rslib/src/revlog/undo.rs — 撤销 Added→remove、Removed→add
15. rslib/src/sync/collection/upload.rs 与 download.rs — 临时文件+完整性校验+atomic_rename 整体替换

**Anki 官方手册（docs.ankiweb.net，A 级原文，5 条）**
16. Syncing with AnkiWeb（syncing.html）— 合并冲突原文（两条关键引文见 KF5）
17. Managing Files（files.html）— collection.anki2 存 notes/decks/cards；备份建议
18. Exporting（exporting.html）— .colpkg 导入"deleted and replaced"；.apkg 导入"keep the version with the most recent modification time"
19. Backups（backups.html）— 自动备份不含媒体；"any changes made since the backup was created will be lost"
20. Deck Options（deck-options.html）— FSRS 优化器"find parameters that best fit your review history"；"Deck options are not retroactive"；Ignore Cards Reviewed Before

**AnkiDroid 社区 wiki（1 条）**
21. github.com/ankidroid/Anki-Android/wiki/Database-Structure — "a row for every review you've ever done"；revlog 字段逐项注释

**FSRS 官方实现（open-spaced-repetition，A 级原文，5 条）**
22. fsrs-rs README — stored MemoryState + elapsed_days；优化器输入 FSRSItem
23. fsrs-rs src/dataset.rs — FSRSItem{reviews} / FSRSReview{rating, delta_t}（首条 delta_t 必须 0）
24. ts-fsrs README(pkg) — next() 返回 card+log；rollback/forget/reschedule；afterHandler 持久化
25. ts-fsrs src/models.ts — ReviewLog{rating, state, due, stability, difficulty, ...}
26. fsrs4anki README — scheduler+optimizer 两部分；KDD/TKDE 论文链接

**awesome-fsrs wiki（A 级原文，4 条）**
27. The-Algorithm.md — FSRS-6 21 参数、S'_r/S'_f、R(t,S)
28. The-mechanism-of-optimization.md — 预处理 revlog（引用 AnkiDroid schema）、MLE+BPTT
29. ABC-of-FSRS.md — D/S/R 定义、"D and S change only after a card has been reviewed"
30. Research-resources.md — MaiMemo Harvard Dataverse 等数据集链接

**学术论文（A/B，2 条）**
31. MaiMemo KDD 2022（ACM，DOI 10.1145/3534678.3539081；中文全文 memodocs.maimemo.com/docs/2022_KDD；Crossref 核实标题/作者 Ye, Su, Cao/会议）
32. MaiMemo TKDE 2023（IEEE，DOI 10.1109/tkde.2023.3251721；中文全文 memodocs.maimemo.com/docs/2023_TKDE；Crossref 核实；数据集发布 SSP-MMC-Plus）

**数据集与工具（A/B，2 条）**
33. open-spaced-repetition/anki-revlogs-dataset-builder README — HF 数据集 anki-revlogs-10k（主页 401 未核）
34. stats.proto — RevlogEntry protobuf 定义（与 Anki revlog 同构）

---

## 6 判死自查

- **可核来源数**：34 条（§5.2 明细，每条 URL/DOI 均为本次实际抓取或 API 核实）≥ 15 ✓
- **原文到手数**：33 条（其中 KDD/TKDE 为官方中文全文 + Crossref 元数据、英文 PDF 未直接抓取；唯一未到手为 HF 数据集主页 401，写"未核"）≥ 10 ✓
- **来源类型**：6 类（官方源码 / 官方手册 / 社区 wiki / 算法库文档 / 学术论文 / 数据集与工具）≥ 3 ✓
- **候选逐一查证**：8 条（§5.1 表格，全部查证并记录结果）≥ 5 ✓
- **关键词组**：8 组 ≥ 4 ✓
  - 中文：Anki 数据库 revlog 结构 / FSRS 稳定性 难度 日志 / Anki 同步 冲突 覆盖 / 间隔重复 版本 记录
  - 英文：Anki database format revlog schema / FSRS scheduling parameters history logs / Anki sync conflict resolution overwrite / spaced repetition log append-only
  - 实际执行途径：GitHub 源码 raw 直取（ankitects/anki）、docs.ankiweb.net、github.com/ankidroid、github.com/open-spaced-repetition（含 awesome-fsrs / fsrs-rs / ts-fsrs / fsrs4anki）、memodocs.maimemo.com、Crossref REST API、arXiv API（fsrs/maimemo 查询 totalResults=0）、HuggingFace（401）
- **禁止项自查**：未评测任何记忆软件效果（仅描述数据结构、写入路径与同步机制）；未越界 B6c（xAPI/学习记录规范未展开）；未捏造来源（全部 URL/DOI 实际抓取或核实；误抓的 arXiv 物理论文已删除不引用）；抓取失败一律写"未核"（HF 数据集 401、arXiv 0 结果、英文 PDF 未抓取）；推断处标 C（未决 5/6；其余均为 A 级原文或 B 级转述）。
