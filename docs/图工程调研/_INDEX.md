# Agent Document Index: 图工程调研

---
status: RESEARCH_ARCHIVE
scope: GRAPH_ENGINEERING_BACKGROUND
next_phase: MODULE_COMPOSITION_DESIGN
activation_condition: MODULE_CONTRACTS_FINALIZED
last_updated: 2026-09-09
---

## Purpose

Background research on graph-based workflow orchestration and context engineering for AI agent systems. Provides terminology, boundaries, and design entry points for Studium's second-phase joint design (context engineering + graph engineering).

**Current State**: PAUSED pending module contract finalization.

## Document Registry

### doc_01: Core Concepts & Boundaries
- **File**: `README.md` (lines 1-85)
- **Type**: TERMINOLOGY + RED_LINES
- **Size**: ~85 lines
- **Machine Tags**: `#terminology`, `#boundaries`, `#red-lines`
- **Key Constraints**:
  - C1: Graph engineering = research label, NOT mature discipline
  - C2: Four graph types MUST remain separate (execution/module/knowledge/learner-state)
  - C3: Graph engineering ≠ context engineering (distinct responsibilities)
- **Validation**: Check against `06-M08技术选型.md:488-491` for 4-graph distinction enforcement
- **Downstream Refs**: 
  - `docs/实现基线/模块检查点.md:369`
  - `docs/实现基线/模块检查点.md:945`

### doc_02: Studium Association Layer
- **File**: `README.md` (lines 87-122)
- **Type**: PROBLEM_INVENTORY
- **Size**: ~36 lines
- **Machine Tags**: `#problem-layer`, `#module-mapping`, `#no-solutions`
- **Key Entities**: 
  - Module list: M01-M11, M13-M15 (M12 cancelled)
  - Association type: PROBLEM_LAYER_ONLY (no node/edge/state design)
- **Constraints**:
  - C4: No direct edge M09 ↔ M15 (linked via M01)
  - C5: Associations ≠ node mappings (1 module ≠ 1 node)
- **Deferred Items**: 15 items listed in lines 110-122

### doc_03: Discussion Entry Protocol
- **File**: `README.md` (lines 124-162)
- **Type**: STARTUP_CONDITIONS + FIRST_SESSION_PROTOCOL
- **Size**: ~39 lines
- **Machine Tags**: `#entry-protocol`, `#first-session`, `#deliverables`
- **Activation Gate**: 8 preconditions (lines 129-136)
- **First Session Protocol**: 11 questions (lines 143-153)
- **Exit Criteria**: 7 deliverables (lines 159-162)

### doc_04: Joint Design Scope
- **File**: `README.md` (lines 164-235)
- **Type**: CANDIDATE_CHECKLIST + PREREQUISITE_MATERIALS
- **Size**: ~72 lines
- **Machine Tags**: `#joint-design`, `#candidate-checklist`, `#NOT-CONFIRMED-SPEC`
- **Warning**: Lines 133-187 are CANDIDATE items, NOT confirmed requirements
- **Prerequisite Materials**: 6 items (lines 189-202)
- **Deferred Decisions**: 6 explicit non-decisions (lines 204-210)

### doc_05: M08 Technical Evidence
- **File**: `06-M08技术选型.md`
- **Type**: EXPERIMENTAL_EVIDENCE + TECHNICAL_SELECTION
- **Size**: 567 lines
- **Machine Tags**: `#M08-knowledge-graph`, `#technical-evidence`, `#experimental-validation`
- **Scope**: Knowledge relation graph ONLY (not execution graph, not runtime)
- **Archive Trigger**: M08/M09 storage finalization complete
- **Key Sections**:
  - §0: Target interpretation (lines 17-50)
  - §1: Node identity = anchor set (lines 53-84)
  - §2: Anchor validation rules (lines 86-187)
  - §3: Relation vocabulary (closed vs open) (lines 189-233)
  - §4: High-level structure (lines 235-318)
  - §5: Audit axes (lines 319-365)
  - §6: Coverage honesty (lines 367-405)
  - §7: Storage & tools (lines 407-438)
  - §8: Knowledge representation takeaways (lines 440-470)
  - §9: Three deliberate non-decisions (lines 473-491)
  - §10: Product question inputs (lines 493-530)
  - §11: Selection summary table (lines 532-567)
- **Experimental Sources**:
  - Apostol Calculus Vol 1, Chapter 15
  - Strang Linear Algebra, Chapters 3-4
  - Cross-textbook alignment experiment
- **Validation Metrics**:
  - Anchor pass rate: 100% (921/921)
  - L2 abstraction survival: 16.7% (4/24)
  - Strict-same cross-book: 21% (vs 89% same-book translation)

## Document Size Constraints

- **Per-document limit**: 600 lines (enforced for agent context management)
- **Current status**: 
  - README.md: 262 lines ✓
  - 06-M08技术选型.md: 567 lines ✓
- **Split trigger**: If any doc exceeds 600 lines, split by section into separate numbered files

## Cross-Reference Protocol

### Internal References
- Use format: `doc_NN:lines_XX-YY` or `doc_NN:§N`
- Example: `doc_05:§2.1` refers to 06-M08技术选型.md section 2.1

### External References
- Module design: `MOD:{M##}` (e.g., `MOD:M08`, `MOD:M09`)
- Checkpoints: `CP:{NN}` (e.g., `CP-01`, `CP-28`)
- Research synthesis: `SYN:{code}` (e.g., `SYN:K1`, `SYN:L2`)
- Constraints: `C{N}` (defined in this index)
- Prohibitions: `P{NN}` (from 模块关系提取.json)
- Temporal bounds: `T{NN}` (from 模块关系提取.json)

## Validation Checkpoints

Agent must verify before using these documents:

1. **Status Check**: Confirm `status: RESEARCH_ARCHIVE`, not active design
2. **Scope Boundary**: This is background research, NOT implementation spec
3. **Activation Gate**: Check `activation_condition` before treating as requirements
4. **Candidate vs Confirmed**: Lines marked `CANDIDATE_CHECKLIST` are proposals, not decisions
5. **Archive Watch**: doc_05 pending archive after M08/M09 storage finalization

## Related Documents (Outside This Folder)

- Module contracts: `docs/模块需求设计/00-第三次重构-产品设计总览.md`
- Module reviews: `docs/模块需求设计/模块审查单/M*.md`
- Relationship baseline: `docs/实现基线/模块关系提取.md`
- Checkpoint baseline: `docs/实现基线/模块检查点.md`
- Research synthesis: `research_tree/synthesis/*.md`

## Update Protocol

When modifying documents in this folder:

1. Update `last_updated` timestamp in this index
2. Recalculate line counts if structure changes
3. Update downstream citation line numbers in:
   - `docs/实现基线/模块检查点.md`
   - `docs/实现基线/模块检查点.json`
   - `docs/实现基线/模块关系提取.md`
   - `docs/实现基线/模块关系提取.json`
4. If splitting documents, create new doc_NN entries in this index
5. Maintain cross-reference integrity using protocol above

## Agent Reading Order

For context-constrained agents:

**Minimum viable read** (understanding red lines):
1. This index (full)
2. doc_01:C1-C3 (lines 40-85 of README)
3. doc_05:§9 (deliberate non-decisions)

**Standard read** (design preparation):
1. This index (full)
2. doc_01 (full)
3. doc_02:C4-C5 + deferred items
4. doc_03:activation gate (8 preconditions)

**Deep read** (technical decisions):
1. All of above
2. doc_05:§0,§1,§2,§11 (target, identity, validation, summary)
3. doc_04:prerequisite materials

## Machine-Readable Metadata

```yaml
folder_status: RESEARCH_ARCHIVE
phase: PRE_MODULE_COMPOSITION
total_documents: 5 (2 physical files, 5 logical sections)
total_lines: 829
constraints_defined: 5 (C1-C5)
prohibitions_enforced: 0 (inherit from parent baseline)
temporal_bounds: 0 (inherit from parent baseline)
activation_gate: MODULE_CONTRACTS_FINALIZED
next_milestone: JOINT_DESIGN_FIRST_SCENARIO
archive_trigger_doc_05: M08_M09_STORAGE_FINALIZED
```

## Changelog

- 2026-09-09: Merged 01/03/04/05 into README; updated all citations; created agent index
- 2026-08-16: Archived 07/02/experiments/storage-research to `_archive/`
- 2026-07-23: Initial folder creation
