# Microsoft Fabric Graph — GQL Standard Conformance（2026-05 版）

> 来源：https://learn.microsoft.com/en-us/fabric/graph/gql-conformance
> 抓取：2026-08-13（WebFetch）｜等级 A（页面原文到手）；ms.date 2026-05-20，updated_at 2026-06-02

## 定位

- "Graph in Microsoft Fabric implements the ISO/IEC 39075:2024 ... GQL standard. This article maps graph's current support against the minimum conformance and optional feature groups defined in the standard."
- reviewer: splantikow（Stefan Plantikow，Neo4j/LANGSTAR 系，亦为 LEX 成员）。

## 与本调研问题直接相关的行（逐字）

- **GG01 开放图类型：No**（"Only closed graph types are supported."）；**GG02 封闭图类型：Yes**（"Graph uses closed graph types that define allowed node and edge types."）
- **GC01 Graph schema management：No**（可选特性 Annex D 未支持）；GC04 Graph management：Partial（仅 CREATE GRAPH，无 DROP）
- **Session management（子条款 7）：No**；**Transaction management（8）：No**
- **16.1 AT schema clause：No**；**11 Object expressions：No**（含 CURRENT_GRAPH 不支持）
- 强制特性多数支持：MATCH/OPTIONAL MATCH、ORDER BY、RETURN、graph pattern、label expression、path pattern、predicates、CASE、aggregates、value types（BOOL/INT64/FLOAT64/STRING）等。
- 不支持列表还包括：SELECT 语句、UNBOUNDED quantifier（* + {m,}）、INSERT/SET/DELETE 语句（GD01）、会话/事务命令（7-8）。

## 调研员判断

- **Microsoft Fabric 是又一个按 GQL minimum conformance + 封闭图类型实现的厂商**（相对 B2b 基线为新增证据）。其 "closed graph types" 语义 = GQL v1 可选 graph types 的实际落地。
- "GC01 Graph schema management 未支持" 说明：GQL 标准中"完整 schema 管理"是可选特性，主流厂商尚未实现——**这直接佐证"属性图校验/丰富 schema 缺口"在 GQL 现行标准中仍未闭合**，且该缺口是可选特性层，不保证进最小符合。
