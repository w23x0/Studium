# Snapshot: mizar-items 全文关键段（依赖网站查询能力）

- URL: https://arxiv.org/html/1107.4721v2
- 标题: mizar-items: Exploring fine-grained dependencies in the MML（full text）
- 作者: Jesse Alama
- 日期: 访问 2026-08-13
- 证据等级: A（全文 HTML 抓取）

## 关键原文摘录

**依赖的计算（从过近似收缩到最小集）：**
- "We compute the fine-grained dependency graph for the MML by starting with an over-approximation of what is known to be sufficient for an item to be Mizar-verifiable and then successively refining this over-approximation toward a minimal set of sufficient conditions."
- "for each Mizar item, we successively hide implicit information normally kept hidden from a human Mizar formalizer, then see whether Mizar can still verify it."
- "It turns out that this approach is rather slow; we needed to develop various heuristics to make the brute-force computation smarter."

**依赖的定义（意图式）：**
- "we are interested in computing what minimally accounts for the success of a specific mathematical proof that has been formalized in the Mizar language."
- "We say that a definition, or a theorem, φ depends on some definition, lemma or other theorem ψ … if φ 'needs' ψ to exist or hold."
- "The main way such a 'need' arises is that the well-formedness or the justification of provability does not hold in the absence of ψ."

**依赖网站的查询能力（双向 + 路径查询）：**
- "With the site one can view any particular Mizar item and see precisely what it depends upon (and what depends on the item)."
- 支持查询："Is there a path between two given items?" / "Do all paths from one item to another pass through a given intermediate node?" / "Are there any paths between two given items that do not pass through a given node?"
