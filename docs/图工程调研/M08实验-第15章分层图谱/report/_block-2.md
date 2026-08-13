总原则（G1d §一）：**加/改在前，删在后**；改接只指向存活节点，删节点放最后；同文件内删除按行号**倒序**（G3e步13/14/15）；记账排在其依赖落盘步后。步1–5为**非落盘裁决**，阻塞下游。

| 步 | 类型 | 目标/ id | 依赖 | 验证 |
| --- | --- | --- | --- | --- |
| 1 | 裁决 | SPEC：`rel_note`能否用于非`other`关系（G3e步1） | — | 判不合法则步19/20走「原样不动」退路 |
| 2 | 裁决 | 自核`edges-H1.jsonl:7`新引文15.14.md:30单行连续+字符数（G3e步2） | — | 单行逐字命中、charlen 30–200 |
| 3 | 裁决 | `sections`须否条条有锚（G3b口径） | — | 未裁前步16的行6/行10**不删sections** |
| 4 | 裁决 | 待应用清单§2.2偏离+是否显式写`Examples 5 to 12`（G2c §11） | — | 主控确认；标**未复核**（未读§2.2原文） |
| 5 | 裁决 | `nodes-D1.jsonl:42`与`:46`双文本冲突（见文末） | — | 每目标只剩一份落盘文本 |
| 6 | 改写 | `report/audit-B2-verdicts.jsonl`：`:46/:49/:52` reason换G1c §1.1/1.2/1.3全文（G1d步骤0）；`:24/:5/:60` reason换G2d F5定稿；`:89` suggested_fix前三项执行、末项挂起（F7） | — | 前三行不点名本批19待删id；verdict/cause未动；node_type仍在SPEC.md:33四值内 |
| 7 | 撤回 | `report/audit-A4a-verdicts.jsonl:24` suggested_fix首项，无替代（G2d F1） | — | 余项不依赖"real number" |
| 8 | 记账 | `_D分片-主控核验.md:525`＋`_转交-新会话-workflow.md:293`同改100/89（G2f 1、2）；`审查-形式D-D2-片59-80.md:440`改「T2塌陷」（4）；`审查-形式D-D3-片21-45.md:89`删`:125`（6） | — | 两处100/89不再分叉；`:72/:74`未被误改（G2f 3）；D3额度仍1/3 |
| 9 | 改写 | `nodes-D1.jsonl:24` ← ADJ3 §3定稿（G2d F4）；`nodes-D2.jsonl:36` statement+atomic_reason（G2e 8）；`nodes-D4.jsonl:51`只改statement、`SQUARED`写小写（G2e 9） | — | `:24`首句不再是"mention real numbers"；后两条anchors/sections/parent未动 |
| 10 | 改写 | `inherited/nodes-A1.jsonl:8`：sections加`"15.03"` +第3锚66字符（G2e 7 A案） | — | 两项**同时**落盘（单加sections不消死因6）；池内现≥1条15.03 |
| 11 | 改写 | `nodes-D1.jsonl:42`整行1376字符、4字段（G2c §9） | 4、5 | json.loads往返、无换行；3锚实测138/160/146 |
| 12 | 改写 | `nodes-D1.jsonl:46`**冲突待人工裁定** | 5 | 裁定后单一文本落盘 |
| 13 | FIX | `nodes-X.jsonl:20`：第2锚换192字符串、增第3锚73字符、sections→`["15.14","15.15","4.1"]`（G2d F2 / G2a 4） | — | 第1锚100字符未动、OCR噪声原样；登记须写ADJ1孤本论证，**不得写成ADJ2悬空边论证** |
| 14 | 改写 | 5条锚点重挂1a–1e（G1d步骤1，强制前置：`apply_kills.py`不重挂） | — | 5条引文持有者≥1且全存活；1c字符数**落盘时实测重取**（G1b记57/190、G1d实测193，三数不得照抄） |
| 15 | 改写 | `nodes-H2.jsonl:1,4,5,6,7,9,10,11`整行替换（G3b §三） | 3 | 18锚json.loads过、逐字命中、30–200；行1锚2保留OCR "and nc on any other"；行9公式锚须由15.13.md直读串化不手打 |
| 16 | 改写 | `edges-H1.jsonl:4/:8/:12`换evidence；`:1/:13` origin→model并删evidence（G3a §三）。`:9` **移出本轮**（与`edges-A2-s2.jsonl:46`抢15.14.md:36，G3e D1） | — | 前三条单行逐字命中，`:8`不再与`d:15-10-nonzero-hypothesis-is-essential`抢15.11.md:7 |
| 17 | 改写 | `edges-H1.jsonl:7`整行（contrasts→requires并反向） | 2 | 步2判跨行则改用G3a E7原方案并登记缺口 |
| 18 | 改写 | `edges-H2.jsonl:1,7`（requires→generalizes）与`:10,13,14`（换ev）（G3c §三） | 15 | 核SPEC.md:29「is-a与generalizes互为反向只写一条」；edges.tsv无反向边；`:10` rel_note原样 |
| 19 | 改写 | `edges-X.jsonl:109,110,111,112,117,120`换quote（origin仍model）、`:112`同时改dst为`strang:projection-onto-a-subspace`（G3d §5.2）；`:115`→contrasts、`:116`→equivalent（§5.4，quote不变，本行不依赖步1） | 1 | 六条实测113/53/38/73/55/93、不跨行；`:112`/`:117`的rel_note落盘；`:116`改后重跑对称边去重 |
| 20 | 改写 | `edges-X.jsonl:108`、`:124`各加`rel_note`（G3e C2/C3，替代G3d的改指与撤回） | 1 | src/dst/rel/quote未动；步1判不合法则原样不动并记入提案 |
| 21 | FIX | `edges-A2-x2.jsonl:47`的contrasts语义并入src `apostol:cx-derivative-pairing-is-blind-to-constants`的statement（G1a §1.1要求，G1d步骤3未承接） | — | src已含该对比；**不做则步26静默丢内容** |
| 22 | FIX | `nodes-A2-x2.jsonl:12`/`:18`降级：留节点与锚点、收缩statement，**本轮不落盘statement文本**（G1d §二） | — | 两节点仍在、4条唯一引文仍有持有者；标`origin=model`（练习12(b)(d)解读未经数学核验） |
| 23 | 重指向 | 改接5条悬空边，rel/origin/ev_quote保原值：`edges-D1.jsonl:166/:191/:210`→`apostol:function-space`；`edges-CX2.jsonl:22`、`edges-D5.jsonl:9`→`apostol:zero-element`（G1d步骤2） | 10、14 | 5条dst全存活、悬空id=0；两新dst无同源同向重复边；`:167/:192/:211`**不改接**，留步26 |
| 24 | 击杀 | `edges-H2.jsonl:19,18,4,3`倒序（G3c §二）；`edges-H1.jsonl:15,14,11,6`倒序（G3a §二） | 16、17、18 | 撤H2的3/4前确认第5/6行仍在（T3上浮落点），edges-H2剩15、edges-H1剩11；`:6`撤后`edges-A2-s1.jsonl:8`的implies仍在 |
| 25 | 击杀 | `edges-X.jsonl:107`整行（G3d §5.1） | 19、20 | 同文件改动已落盘；`apostol:euclidean-space`余21边、`strang:orthogonal-vectors`仍有`:54`/`:121`/`inherited/edges-S1.jsonl:60,61,62`，不悬空 |
| 26 | 击杀 | 18条悬空边：`edges-D1.jsonl:` 104、141、150、151、159、160、163、164、196、197、200、201、204、205＋`edges-A2-x2.jsonl:47`＋`edges-D1.jsonl:` 167、192、211（G1d步骤3） | 21、23 | 悬空id=0；18条evidence无一离开全图（`:141/:159/:160`有存活持有者、`:104`由src自身锚点持有、余ev_charlen=0）。`edges-A2-x2.jsonl:50` **不在本步** |
| 27 | 击杀 | `nodes-D1.jsonl:5`恢复KILL；`edges-D1.jsonl:10/11/12`随节点进墓地、**不改指**（G2a 1、2） | 6 | 三个L1分组节点仍有第二条part-of（`inherited/edges-A1.jsonl:1/2/3`），不产生孤儿、无重复边；54字符锚点记为可接受引文损失。**顺序未定，需先确认**：2/4/4是否先并入`apostol:linear-space`再删（G2a不确定点，未复核） |
| 28 | 击杀 | 19个节点（A1 §1表#1–#15、#17、#18、#19、#21），作src的38条边随节点进墓地（G1d步骤4） | 6、14、23、26 | 悬空id=0（23条已5改接+18删除）；存活节点parent指向待删id 0个、structures-* 0处；括注应为「含**18**条自身part-of」（#21无parent） |
| 29 | 记账 | 悬空边24→**23**（`edges-A2-x2.jsonl:50` dst已降FIX）；A1 §〇「含22条part-of」→**19**；§3.1的8/9行/6条三方不符，以步23的**5条**为准（frag01 7、8）；A1 §1表末「三条维持的KILL」→**四条**（增列`nodes-D1.jsonl:5`），22 id表**不改**（G2a 5、6）；撤回`nodes-D1.jsonl:62`（G1d §三） | 23、26、27、28 | 各数字与diff逐条对齐，22 id表逐行未动 |
| 30 | 记账 | H-cross是**25**非24（`edges-A2-x2.jsonl:21`在X文件外），H层15+19+25=**59**（G3e〇）；`15.07.md:17`合并后4持有者、「新引入源行数=0」（C1）；edges-H1冗余度记**+3行**非+4条；两`ext-uncited-*`成孤点各排FIX | 24、25 | 计数与diff一致，两节点仍在`nodes-H2.jsonl:10,11` |
| 31 | 记账 | `report/audit-B2.md:107`「15.02有21」→「22」且同行删15.06；`:109`「12个未被D1触及」→「11」（G2d F6） | **顺序未定** | 取决于`nodes-D1.jsonl:71`的KILL是否本批：若执行则15.06重回未触及、原文变真，须**先删节点后订正且只做一次**。frag01条目1称「维持3」不在本批、frag02条目7称其可直接执行，均未给批次归属 |
| 32 | 记账 | 重跑`check_graph`核对计数 | 1–31 | **只读态不可执行**。分母**冲突未决**：G3d §5.7称916→930、G3e步17称916→914，基准不同须主控统一后再报数；1433→1424为自报未实跑，不作已核数 |

##冲突待人工裁定

- **`nodes-D1.jsonl:42`两份落盘文本互斥。** G2c §9要整行替换（statement 437→405、6子句→4、锚点1→3、动atomic_reason与audit_fix），依据是死因1与ADJ3的C5.3为假同时消除；G2d F4要statement换`裁定-ADJ3.md` §3定稿，依据是D13（末句假因果）已全核。
- **`nodes-D1.jsonl:46`处置方向互斥（一方删节点、一方改内容）。** G2a §二要保留KILL、十条「公理↔ R算术律」映射表先并入parent `d:example-1-the-real-numbers-form-a-linear-space`（KEEP）后删，依据是该节点冗余、parent存活；G2d F4+R1要替换statement（标未复核）并把映射句留在原节点标`origin: model`，依据是15.03全文grep `commutativ|associativ|distributiv`命中0、补锚无解。

##本片未覆盖

两项待SPEC裁决无法排序：G5-P18「边evidence能否算节点锚点」未裁前L66补锚A（100字符）挂起（G2f 5）；`15.10.md:22`（35字符）补锚撞SPECQ §5.2待议项。G3e §五与顺带发现为空占位，「可疑新增4条」无明细。`edges-X` 161行vs「162条对齐边」只登记待核。各碎片落选项自带理由不重列。
