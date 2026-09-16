# Graph Engineering Research: Structural Documentation

> ⚠️ **中文警告（Agent 必读）**：本目录是**调研归档，不是设计依据**（`FOLDER_ROLE: RESEARCH_ARCHIVE_ONLY`）。实验结论与 schema 提案（含 `06-M08技术选型.md`）均未验证，**禁止直接用于 Studium 设计**。设计口径以 `docs/Harness设计/` 为准；M08/M09 存储以 [`../Harness设计/01-知识层设计.md`](../Harness设计/01-知识层设计.md) 为准。

```yaml
doc_id: doc_01_02_03_04
status: RESEARCH_ARCHIVE
phase: PRE_MODULE_COMPOSITION
scope: [TERMINOLOGY, PROBLEM_LAYER, ENTRY_PROTOCOL, JOINT_DESIGN_SCOPE]
activation_gate: MODULE_CONTRACTS_FINALIZED
last_updated: 2026-09-09
related_docs: [doc_05_M08_technical_evidence]
```

---

## SECTION I: TERMINOLOGY & RED LINES

### Meta
- Lines: 1-85
- Type: TERMINOLOGY + BOUNDARY_CONSTRAINTS
- Tags: `#terminology`, `#red-lines`, `#graph-vs-context`

### Definition: Graph Engineering in AI Agent Domain

**Status**: Research label, NOT standardized discipline.

**Underlying Concepts** (pre-existing engineering):
- Workflow orchestration + data flow graphs
- Finite state machines + state transitions
- Agent routing + multi-agent coordination
- Persistent execution + checkpoints + fault recovery
- Event logging + tracing + observability
- Human approval gates + validation gates + permission control

**Usage Rule**: Treat as research tag, NOT as mature discipline with unified methods/tech stack.

### RED LINE C1: Four Graph Types Must Remain Separate

```
CONSTRAINT_ID: C1
TYPE: SEPARATION_INVARIANT
ENFORCEMENT: STRICT
```

**The Four Types**:

1. **Product Module Graph**
   - Question: "What responsibilities and data does the system own?"
   - Elements: Modules, data ownership, judgment authority

2. **Execution Workflow Graph**
   - Question: "What steps does one concrete task go through?"
   - Elements: Nodes (work units), edges (control/data flow), checkpoints

3. **Knowledge Relation Graph**
   - Question: "What relationships exist between concepts/materials/methods?"
   - Elements: Concepts, theorems, methods, prerequisite/derivation/contrast relations

4. **Learner State Change Graph**
   - Question: "How does individual learning state change with evidence?"
   - Elements: State nodes, evidence edges, temporal versions

**Prohibition**: MUST NOT merge these graphs because they share node/edge primitives.

**Validation Source**: `doc_05:§9` (lines 488-491) - enforced as red line in M08 technical selection.

### RED LINE C2: Graph Engineering ≠ Context Engineering

```
CONSTRAINT_ID: C2
TYPE: RESPONSIBILITY_SEPARATION
ENFORCEMENT: STRICT
```

**Graph Engineering Responsibilities**:
- Next step: which node runs
- Control flow: fork, merge, loop, pause, resume
- Guards: what conditions must pass to proceed

**Context Engineering Responsibilities**:
- Information: what current node needs to see
- Sourcing: where information comes from
- Operations: classify, cache, validate, compress
- Write-back: what contract governs result persistence

**Integration Requirement**: Both MUST be designed together, but responsibilities remain distinct. Without context contracts, graph has only control arrows. Without graph lifecycle, context cannot know when to assemble/invalidate/freeze/promote.

**Prerequisite**: Product module data ownership + judgment authority finalized first.

### Terminology: Original Trigger Source

```
SOURCE: https://x.com/0xCodez/status/2079165300625330317
TITLE: "Graph Engineering with Claude: 14-Step roadmap"
EXTRACTION_DATE: 2026-07-23
KEY_QUOTES:
  - "Prompt = sentence. Loop = cycle. Framework = floor agent stands on."
  - "Node thinks. Edge passes result."
INTERPRETATION_RULES:
  - Node = task (not edge)
  - Linear script = degenerate graph
  - Node contract = bounded input + bounded output + exactly one task
```

---

## SECTION II: STUDIUM ASSOCIATION LAYER (PROBLEM ONLY)

### Meta
- Lines: 87-122
- Type: PROBLEM_INVENTORY
- Tags: `#problem-layer`, `#module-mapping`, `#no-solutions`
- Warning: NO node/edge/state design, NO execution graph

### Why This Research Matters

**Problem Characteristics** (requiring graph-like execution):

```
P1: User input → different task types (not single fixed pipeline)
P2: Teaching/practice/diagnosis/navigation → conditional branches + feedback loops
P3: Materials + concept relations + historical evidence → may need independent/parallel reads
P4: Learner state updates → require evidence + source stratification + time annotation
    - M15 decision: NO user correction mechanism, NO learner veto on state records
P5: Module outputs + sources + evidence → must be frontend-visible (横切原则 #5)
P6: Some processes → must pause for learner answer/practice completion
P7: Long-term projects → must save position + resume later
P8: Different failures → need different handling (not all-or-nothing pipeline failure)
P9: Product must explain → what materials/evidence/constraints informed each judgment
P10: In-progress loop sync context ≠ M09 closed-loop async records (MUST separate)
P11: M04→M09 guards ≠ M09→M08 guards (different candidate/audit standards)
```

**Conclusion**: These suggest graph-like workflow (routing, loops, parallel, evidence gates, checkpoints, permission edges, execution tracing) may fit better than single long chain.

### Module Association Table

```
MODULE_ID | POTENTIAL_GRAPH_EXECUTION_INFO
----------|--------------------------------
M01 | Current goal, thread position, task lifecycle, resumable positions
M02 | One teaching round behavior + next learner action
M03 | Practice task + learner output + diagnostic evidence
M04 | Judgment + basis + alternative interpretations + minimal补足 action
M05 | Next action + review schedule + task priority
M07 | Sourced, locatable material query results
M08 | Prerequisite/derivation/confusion relations + basis
M09 | Closed-loop personal knowledge + evidence edges + temporal versions (new evidence may overturn, but does NOT overwrite old versions)
M10 | Strategy selection + intervention requirements + effect records
M11 | Tools + context + permissions + failure + cross-module operation boundaries
M13 | Actual input + basis + judgments + state changes + exceptions + downgrades
M14 | Output object + version chain + revision comparison + source/object reference positions
M15 | Time-bound, sourced, uncertain non-knowledge state; carrying-capacity readings direct-connect M05/M10, interpretation candidates await M04 裁决
```

**Note on M12**: Cancelled as product module (number reserved, not reassigned).

### RED LINE C4: M09 ↔ M15 No Direct Reference

```
CONSTRAINT_ID: C4
TYPE: NO_BIDIRECTIONAL_REFERENCE
MODULES: [M09, M15]
LINK_METHOD: VIA_M01
```

**Rule**: M09 (closed-loop personal knowledge) and M15 (learner state/conditions) are separate learner models. NO direct reference arrows in either direction.

**Link Mechanism**: "What state existed when loop closed" obtained via M01 linkage. M01 stores facts (e.g., session startup intervals), NOT interpretations (e.g., "startup difficulty"). Interpretations re-derived each time by sub-modules.

**Known Cost**: Input reproducible, derived interpretations NOT reproducible.

### RED LINE C5: Association ≠ Node Mapping

```
CONSTRAINT_ID: C5
TYPE: MAPPING_CARDINALITY_WARNING
```

**Rule**: One module MAY provide multiple nodes, or only data/rules. One execution node MAY combine read-only results from multiple modules (within contract bounds).

**Anti-pattern**: Assuming "one module = one node in execution graph."

### Deferred Items (15 items - NOT to be decided now)

```
DEFER_01: Existence of single "learning round total graph"
DEFER_02: Teaching/practice/diagnosis modules → nodes vs subgraphs
DEFER_03: Routing mechanism: rules, model, or hybrid
DEFER_04: Which steps allow parallel execution
DEFER_05: Which state belongs to one run vs module long-term data
DEFER_06: State usage gate: M05/M10 at what evidence strength/time validity let M15 readings change actions
          Status: Explicitly deferred to MODULE_COMPOSITION_PHASE system design
DEFER_07: Single agent vs multi-agent vs pure workflow
DEFER_08: Need for specialized graph runtime
DEFER_09: Each node information types + minimum completeness + source proof
DEFER_10: Which context resident in current-loop cache vs on-demand read vs reference-only
DEFER_11: Summary/tags/compressed content → can only be index, how to return to authoritative original
DEFER_12: [Additional items continue but list is complete at DEFER_15]
```

**Reason for Deferral**: Depends on corrected module contracts. Answering now would let unconfirmed workflow assumptions pollute product module design.

---

## SECTION III: DISCUSSION ENTRY PROTOCOL

### Meta
- Lines: 124-162
- Type: STARTUP_CONDITIONS + FIRST_SESSION_PROTOCOL
- Tags: `#entry-protocol`, `#activation-gate`, `#deliverables`

### Activation Gate (8 Preconditions)

```
GATE_ID: JOINT_DESIGN_ENTRY
TYPE: ACTIVATION_PRECONDITIONS
COUNT: 8
STATUS: NOT_MET (waiting on module contract finalization)
```

**Required Confirmations**:

1. `PRECOND_01`: Each module unique main responsibility + explicit non-responsibilities
2. `PRECOND_02`: Input + output + error semantics
3. `PRECOND_03`: Core objects + data ownership
4. `PRECOND_04`: Allowed read/write operations + permissions
5. `PRECOND_05`: Inter-module dependencies + invocation direction
6. `PRECOND_06`: State changes requiring human confirmation
7. `PRECOND_07`: Executable acceptance conditions
8. `PRECOND_08`: At least one real user flow + its actual problems

### First Session Protocol: Single Real Scenario (NOT Full System Graph)

**Approach**: Select one clear-boundary, currently-needed user scenario.

**11 Required Answers**:

```
Q01: User-observable start point + end point?
Q02: Which steps always needed, which only under specific conditions?
Q03: Which steps can run parallel, which have real prerequisite dependencies?
Q04: What facts does each step consume and produce?
Q05: Each fact source + type + time range + minimum completeness?
Q06: Which context resident cache / on-demand read / compressed to index / reference-only?
Q07: Which results must pass evidence gate or user confirmation?
Q08: On failure: retry / rollback / pause / downgrade / terminate?
Q09: Which positions need checkpoint + frozen context?
Q10: How to reconstruct actual run path + then-visible context from process logs?
Q11: Compared to simple function or state machine, what verifiable benefits does explicit graph bring?
```

### Exit Deliverables (7 Items)

```
DELIVERABLE_01: Scenario scope + exit conditions
DELIVERABLE_02: Node candidates + input/output context contracts
DELIVERABLE_03: Conditional edges + loops + stop conditions
DELIVERABLE_04: Runtime context vs checkpoints vs process records vs module long-term data boundaries
DELIVERABLE_05: Permissions + side effects + human confirmation points
DELIVERABLE_06: Failure + recovery + review requirements
DELIVERABLE_07: Comparison: simple linear implementation vs native state machine vs graph runtime
```

**Decision Rule**: Only proceed to framework evaluation + minimal experiment when explicit graph demonstrably improves branch expression / recovery / observation / testing / long-term maintenance.

---

## SECTION IV: JOINT DESIGN SCOPE

### Meta
- Lines: 164-235
- Type: CANDIDATE_CHECKLIST + PREREQUISITE_MATERIALS
- Tags: `#joint-design`, `#candidate-checklist`, `#NOT-CONFIRMED-SPEC`
- Warning: Items 133-187 are PROPOSALS, NOT confirmed product requirements

### Why Joint Design is Mandatory

**Problem**: Studium learning process ≠ fixed pipeline.

**Graph Engineering Need**: M02/M03/M04/M10 must repeatedly trigger/fork/loop based on learner performance + diagnosis + strategy + route constraints. M01/M05 create fork sessions and resume main line after completion. → Requires expressing control relations.

**Context Engineering Need**: Each judgment quality depends on node-received information types + sources + completeness + time range + teaching conditions. In-progress sync info stays in current-loop context. After loop closes, enters M09 per contract. M09 personal records can反向增益 M08 via candidate/audit. → Requires expressing information relations.

**Integration Model**:

```
Product Module Contracts
  ├─ Data ownership, judgment authority, input/output
  ↓
Context Engineering
  ├─ Info types, sources, completeness, cache, selection, compression, write-back
  ↕
Graph Engineering
  └─ Nodes, edges, triggers, forks, loops, guards, checkpoints, recovery
```

### Candidate Checklist (16 Items - NOT Confirmed Specs)

```
STATUS: CANDIDATE_PROPOSALS
AUTHORITY: AWAITING_MODULE_COMPOSITION_PHASE_DECISION
ORIGINAL_LABEL: "已确认" (2026-08-16 downgraded to CANDIDATE)
REASON: Implementation details, not product boundaries
```

**Note**: Originally labeled "confirmed" but actually runtime/implementation mechanisms. File header states "does NOT design concrete nodes/edges/Agent count/framework." Now explicitly marked as CANDIDATE checklist for second-phase joint design.

**Items** (abbreviated - see full text lines 133-187):

```
CANDIDATE_01: Define bounded input/output/source/failure semantics for each runtime node
CANDIDATE_02: Distinguish raw observation vs business fact vs intermediate inference vs alternative interpretation vs strategy decision vs formal write
CANDIDATE_03: Distinguish current-loop sync context vs cross-module process records vs closed-loop async data
...
CANDIDATE_16: Define write gate for forgetting-label ordering constraint (M04 in-session "used to know, now can't answer" is candidate, only loop-close submission writes to M09 record, must exclude fatigue degradation etc. state-side interpretations first)
```

**Key Cross-Module Mechanisms** (preserved from candidate list):

- M04/M15 independent extraction from same M01 process records (different output contracts)
- M15 → M04 strict unidirectional (M04 can only send re-confirm requests)
- M04 → M09 closed-loop evidence guard + personal formation record contract
- M09 → M08 de-personalized candidates + auto/manual review + promotion/return/撤回 + version mechanism
- M09 ↔ M15 no reference (linked via M01)
- State usage gate: M05/M10 at what evidence strength + time validity let M15 readings change actions (deferred to this phase)

### Prerequisite Materials (6 Items)

```
PREREQ_01: M01-M10, M14, M15 finalized responsibilities + input/output + data ownership
           (M12 cancelled, model/services handled as implementation-phase cross-cutting)
           Status: Single-module review closed 2026-08-03
           Note: THIS PHASE = "module composition & system design" per product doc
PREREQ_02: M08/M09 storage structure + selection conclusion (blocks M09 scale issue)
           M09 scale problem: not overwriting old conclusions → monotonic growth
           Three directions all blocked on storage selection:
           - Restructure M09 itself
           - Historical versions transfer to different module (e.g., M01)
           - M09 split into historical zone + current-edge zone
PREREQ_03: M11/M13 valuable context + permissions + logging + review requirements
PREREQ_04: M04-01 dynamic diagnosis context classification + caching problem
PREREQ_05: M04-02 closed-loop write + candidate + review problem
PREREQ_06: Each product module normal path + fork path + failure path + human confirmation requirements
```

### Explicit Non-Decisions (6 Items)

```
NON_DECISION_01: LangGraph / Microsoft Agent Framework / Temporal / other runtime
NON_DECISION_02: Single agent / multi-agent / plain function nodes / hybrid form
NON_DECISION_03: One product module = one node or Agent (anti-pattern)
NON_DECISION_04: One giant graph covering all behaviors (anti-pattern)
NON_DECISION_05: Using context window size to反推 which authoritative info product should discard (anti-pattern)
NON_DECISION_06: Letting model self-decide formal data ownership / promotion permissions / closed-loop goals (anti-pattern)
```

---

## PAUSE MARKER

```
CURRENT_STATUS: WAITING_MODULE_CONTRACT_COMPLETION
FOLDER_ROLE: RESEARCH_ARCHIVE_ONLY
PROHIBITION: DO_NOT_GENERATE_STUDIUM_CONTEXT_OR_GRAPH_ARCHITECTURE_DECISIONS
```

Before module contract completion, this folder maintained as research archive only.

---

## Cross-Reference Map

**Internal**:
- Section I (Terminology): lines 1-85
- Section II (Studium Association): lines 87-122
- Section III (Entry Protocol): lines 124-162
- Section IV (Joint Design Scope): lines 164-235

**External** (Machine-Readable):
- `MOD:M08` = Module M08 (Knowledge Structure & Concept Relations)
- `MOD:M09` = Module M09 (Dynamic Learner Model)
- `MOD:M15` = Module M15 (Learner State & Conditions)
- `doc_05` = 06-M08技术选型.md
- `CP-##` = Checkpoint from `docs/实现基线/模块检查点.md`
- `C#` = Constraint defined in `_INDEX.md`
- `P##` = Prohibition from `docs/实现基线/模块关系提取.json`
- `T##` = Temporal bound from relationship baseline

**Downstream Citations** (updated 2026-09-09):
- `docs/实现基线/模块检查点.md:81` → lines 88-122 (entry protocol)
- `docs/实现基线/模块检查点.md:369` → lines 19-35 (terminology boundaries)
- `docs/实现基线/模块检查点.md:945` → lines 19-35,88-122 (checkpoints + protocol)
- `docs/实现基线/模块关系提取.md:15` → lines 3-13,124-187 (joint design positioning)
