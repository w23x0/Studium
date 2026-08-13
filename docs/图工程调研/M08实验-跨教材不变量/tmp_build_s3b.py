# -*- coding: utf-8 -*-
import json, os, sys

BASE = r"C:\Users\Wang\Desktop\Studium\docs\图工程调研\M08实验-跨教材不变量"
SRC = os.path.join(BASE, "source", "strang-ch4", "4.2.md")
NODES_OUT = os.path.join(BASE, "data", "nodes-S1-s3b.jsonl")
EDGES_OUT = os.path.join(BASE, "data", "edges-S1-s3b.jsonl")

with open(SRC, encoding="utf-8") as f:
    TEXT = f.read()

FILE = "4.2.md"

def A(q):
    return {"file": FILE, "quote": q}

nodes = [
    {
        "id": "strang:projection-onto-a-line",
        "name_en": "Projection of a vector onto a line",
        "name_zh": "向量到直线的投影",
        "node_type": "method",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "To project vector b onto the line through a, find the multiple p = x-hat a closest to b; the number x-hat is computed so that the error e = b - x-hat a is perpendicular to a.",
        "aliases": [],
        "anchors": [
            A("When b is projected onto a line, its projection pis the part of b along that line"),
            A("The projection $_ p$ will be some multiple of a."),
        ],
    },
    {
        "id": "strang:projection-formula-line",
        "name_en": "Projection formula p = (a^T b / a^T a) a",
        "name_zh": "直线投影公式",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "The projection of b onto the line through a is the vector p = x-hat a = (a^T b / a^T a) a, where x-hat = a^T b / a^T a.",
        "aliases": [],
        "anchors": [
            A("Our formula ${ \\widehat { \\pmb x } } = { \\pmb a } ^ { \\mathrm { T } } { \\pmb b } / { \\pmb a } ^ { \\mathrm { T } } { \\pmb a }$ gives the projection"),
            A("The projection of b onto the line through a is $\\pmb { p } = \\pmb { a } ( \\pmb { a } ^ { \\mathrm { T } } \\pmb { b } / a ^ { \\mathrm { T } } \\pmb { a } )$"),
        ],
    },
    {
        "id": "strang:x-hat-coefficient",
        "name_en": "The coefficient x-hat",
        "name_zh": "系数 x-hat",
        "node_type": "notation",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "x-hat denotes the best coefficient(s) giving the closest vector in the (column) space; for a line x-hat = a^T b / a^T a, and p = x-hat a.",
        "aliases": ["x hat"],
        "anchors": [
            A("The hat over x indicates the best choice"),
            A("Computing this number $\\widehat { \\mathbfit { x } }$ will give the vector $p .$"),
        ],
    },
    {
        "id": "strang:error-vector",
        "name_en": "Error vector e = b - p",
        "name_zh": "误差向量 e = b - p",
        "node_type": "concept",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "The error (residual) is e = b - p, the part of b not captured by the projection; b splits into the projection p and the error e.",
        "aliases": ["residual"],
        "anchors": [
            A("The error vector between $^ { b }$ and $_ p$ is $e = b - p$ ."),
            A("The vector bis being split into the projection p and the error $e = \\pmb { b } - \\pmb { p }$"),
        ],
    },
    {
        "id": "strang:error-orthogonal-to-space",
        "name_en": "Error is orthogonal to the space",
        "name_zh": "误差正交于子空间",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "The error e = b - p is perpendicular to the line a (and to the subspace S / column space), which is the condition that determines the projection.",
        "aliases": [],
        "anchors": [
            A("This error vector $\\boldsymbol { b } - \\boldsymbol { A } \\widehat { \\boldsymbol { x } }$ is perpendicular to the subspace."),
            A("Projecting b onto a subspace leaves $e = \\pmb { b } - \\pmb { p }$ perpendicular to the subspace."),
        ],
    },
    {
        "id": "strang:right-triangle-pythagoras",
        "name_en": "Right triangle of b, p, e",
        "name_zh": "b, p, e 直角三角形",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "Because e is perpendicular to p, the vectors b, p, e form a right triangle with ||p||^2 + ||e||^2 = ||b||^2.",
        "aliases": [],
        "anchors": [
            A("Projection produces a right triangle with sides p, e, and b."),
            A("The vector b is split into two parts-it"),
        ],
    },
    {
        "id": "strang:projection-matrix-line",
        "name_en": "Projection matrix onto a line P = a a^T / a^T a",
        "name_zh": "直线投影矩阵",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "The matrix multiplying b to give the projection onto the line through a is P = a a^T / a^T a, a column times a row; it is m by m with rank one.",
        "aliases": [],
        "anchors": [
            A("$P$ is a column times a row! The column is ${ \\mathbf { } } a ,$ , the row is ${ { a } ^ { \\mathrm { { T } } } }$ ."),
            A("The rank one projection matrix $P = { { a } { { a } ^ { \\mathrm { T } } } / { { a } ^ { \\mathrm { T } } } }$ a multiplies b to produce $p .$"),
        ],
    },
    {
        "id": "strang:projection-matrix",
        "name_en": "Projection matrix P",
        "name_zh": "投影矩阵 P",
        "node_type": "concept",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "A projection matrix P is the matrix that multiplies b to produce its projection p = Pb; every subspace of R^m has its own m by m projection matrix.",
        "aliases": [],
        "anchors": [
            A("The projection matrix P multiplies b to give p."),
            A("symmetric matrices with $P ^ { 2 } = P$ . The projection of bis Pb."),
        ],
    },
    {
        "id": "strang:projection-onto-subspace",
        "name_en": "Projection onto a subspace",
        "name_zh": "到子空间的投影",
        "node_type": "method",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "Given independent vectors a_1,...,a_n spanning the column space of A, project b in three steps: find x-hat, find the projection p = A x-hat, find the projection matrix P.",
        "aliases": [],
        "anchors": [
            A("We compute projections onto n-dimensional subspaces in three steps as before: Find the vector"),
            A("The projection of b onto a subspace Sis the closest vector pin $S ; b - p$ is orthogonal to S"),
        ],
    },
    {
        "id": "strang:normal-equation",
        "name_en": "Normal equation A^T A x-hat = A^T b",
        "name_zh": "正规方程",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "The condition A^T(b - A x-hat) = 0 rewrites in the famous form A^T A x-hat = A^T b, the equation for x-hat with coefficient matrix A^T A.",
        "aliases": ["normal equations"],
        "anchors": [
            A("in its famous form $A ^ { \\mathrm { T } } A { \\widehat { \\mathbf { x } } } = A ^ { \\mathrm { T } } b$ . This is the equation for"),
            A("The n equations are exactly $A ^ { \\mathrm { T } } ( \\pmb { b } - A \\pmb { \\widehat { x } } ) = \\mathbf { 0 }$"),
        ],
    },
    {
        "id": "strang:ata-matrix",
        "name_en": "The matrix A^T A",
        "name_zh": "矩阵 A^T A",
        "node_type": "concept",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "A^T A is the n by n symmetric coefficient matrix that arises whenever a rectangular matrix A is involved; a number a^T a becomes the matrix A^T A.",
        "aliases": [],
        "anchors": [
            A("This symmetric matrix $A ^ { \\mathrm { T } } A$ is n by n."),
            A("a problem that involves a rectangular matrix almost always leads to $A ^ { \\mathrm { T } } A .$"),
        ],
    },
    {
        "id": "strang:ata-invertible-iff-independent-columns",
        "name_en": "A^T A invertible iff A has independent columns",
        "name_zh": "A^T A 可逆当且仅当列独立",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "A^T A is invertible if and only if A has linearly independent columns, because A^T A has the same nullspace as A. When A has independent columns, A^T A is square, symmetric, and invertible.",
        "aliases": [],
        "anchors": [
            A("When A has independent columns, $A ^ { \\mathrm { T } } A$ is invertible."),
            A("When A has independent columns, $A ^ { \\mathrm { T } } A$ is square, symmetric, and invertible."),
        ],
    },
    {
        "id": "strang:projection-onto-column-space",
        "name_en": "Projection onto the column space p = A(A^T A)^{-1}A^T b",
        "name_zh": "到列空间的投影",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "The projection of b onto the column space of A is p = A x-hat = A(A^T A)^{-1} A^T b, using x-hat = (A^T A)^{-1} A^T b.",
        "aliases": [],
        "anchors": [
            A("The projection of b onto the subspace is p:"),
            A("Then the projection of b onto the column space of A is the vector $\\pmb { p } = A ( A ^ { \\mathrm { T } } A ) ^ { - 1 } A ^ { \\mathrm { T } } \\pmb { b }$"),
        ],
    },
    {
        "id": "strang:projection-matrix-subspace",
        "name_en": "Projection matrix P = A(A^T A)^{-1}A^T",
        "name_zh": "子空间投影矩阵",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "The projection matrix onto C(A) is P = A(A^T A)^{-1} A^T; it satisfies p = Pb, P^2 = P and P^T = P.",
        "aliases": [],
        "anchors": [
            A("The projection matrix $P = A ( A ^ { \\mathrm { T } } A ) ^ { - 1 } A ^ { \\mathrm { T } }$ has $P ^ { \\mathrm { T } } = P$ and $P ^ { 2 } = P$ and $P b = p$"),
            A("The next formula picks out the projection matrix that is multiplying bin (6):"),
        ],
    },
    {
        "id": "strang:projection-matrix-symmetric-idempotent",
        "name_en": "Projection matrix is symmetric and idempotent",
        "name_zh": "投影矩阵对称且幂等",
        "node_type": "theorem",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "A projection matrix satisfies P^2 = P (projecting twice changes nothing) and P^T = P (it is symmetric).",
        "aliases": [],
        "anchors": [
            A("Projecting a second time doesn't change anything, so $P ^ { 2 } = P$ ."),
            A("We must have $P ^ { 2 } = P$ , because a second projection doesn't change the first projection."),
        ],
    },
    {
        "id": "strang:i-minus-p-complement",
        "name_en": "Complement projection I - P",
        "name_zh": "互补投影 I - P",
        "node_type": "concept",
        "book": "strang",
        "sections": ["4.2"],
        "statement": "I - P is also a projection: when P projects onto one subspace, I - P projects onto the perpendicular subspace and produces the error e = (I - P)b.",
        "aliases": [],
        "anchors": [
            A("When P projects onto one subspace, $I - P$ projects onto the perpendicular subspace."),
            A("The matrix $I { - } P$ should be a projection too."),
        ],
    },
]

def E(src, rel, dst, origin, quote=None, rel_note=None):
    d = {"src": src, "rel": rel, "dst": dst, "origin": origin}
    if origin == "source":
        d["evidence"] = {"file": FILE, "quote": quote}
    if rel_note:
        d["rel_note"] = rel_note
    return d

edges = [
    # projection-formula-line
    E("strang:projection-formula-line", "requires", "strang:x-hat-coefficient", "source",
      "Our formula ${ \\widehat { \\pmb x } } = { \\pmb a } ^ { \\mathrm { T } } { \\pmb b } / { \\pmb a } ^ { \\mathrm { T } } { \\pmb a }$ gives the projection"),
    E("strang:projection-onto-a-line", "applies-to", "strang:projection-formula-line", "model",
      rel_note=None),
    # method vs object: line method produces formula
    E("strang:projection-formula-line", "requires", "strang:projection-onto-a-line", "model"),
    # error vector
    E("strang:error-vector", "requires", "strang:projection-onto-a-line", "source",
      "The error vector between $^ { b }$ and $_ p$ is $e = b - p$ ."),
    E("strang:error-orthogonal-to-space", "requires", "strang:error-vector", "source",
      "Projecting b onto a subspace leaves $e = \\pmb { b } - \\pmb { p }$ perpendicular to the subspace."),
    # right triangle implied by orthogonality
    E("strang:error-orthogonal-to-space", "implies", "strang:right-triangle-pythagoras", "source",
      "Projection produces a right triangle with sides p, e, and b."),
    # normal equation comes from orthogonality
    E("strang:error-orthogonal-to-space", "implies", "strang:normal-equation", "source",
      "The n equations are exactly $A ^ { \\mathrm { T } } ( \\pmb { b } - A \\pmb { \\widehat { x } } ) = \\mathbf { 0 }$"),
    E("strang:normal-equation", "requires", "strang:ata-matrix", "source",
      "This is the equation for ${ \\widehat { \\mathbf { x } } } ,$ and the coeficient matrix is $A ^ { \\mathrm { T } } A$ ."),
    E("strang:normal-equation", "requires", "strang:x-hat-coefficient", "model"),
    E("strang:normal-equation", "part-of", "strang:projection-onto-subspace", "source",
      "The n equations give the n equations for $\\widehat { \\mathbf { x } } ;$"),
    # subspace method
    E("strang:projection-onto-subspace", "requires", "strang:ata-invertible-iff-independent-columns", "source",
      "The linear independence of the columns $\\mathbf { a } _ { 1 } , \\ldots , \\mathbf { a } _ { n }$ will guarantee that this inverse matrix exists."),
    E("strang:projection-onto-column-space", "requires", "strang:normal-equation", "source",
      "Now we can find $\\widehat { \\mathbf { x } }$ and $_ p$ and $P ,$ , in that order."),
    E("strang:projection-onto-column-space", "requires", "strang:x-hat-coefficient", "source",
      "The combination $\\textstyle p = A { \\widehat { \\boldsymbol { x } } }$ is the projection of b onto the column space of $A { : }$"),
    E("strang:projection-onto-column-space", "part-of", "strang:projection-onto-subspace", "model"),
    # generalization: subspace generalizes the line
    E("strang:projection-onto-subspace", "generalizes", "strang:projection-onto-a-line", "source",
      "With $n = 1$ (one vector ${ \\bf { a } } _ { 1 } )$ this is projection onto a line."),
    E("strang:projection-onto-column-space", "generalizes", "strang:projection-formula-line", "source",
      "Those formulas are identical with (5) and (6) and (7)."),
    E("strang:projection-matrix-subspace", "generalizes", "strang:projection-matrix-line", "source",
      "The number ${ \\pmb a } ^ { \\mathrm { T } } { \\pmb a }$ becomes the matrix $A ^ { \\mathrm { T } } A$ ."),
    # projection matrices are instances of the concept
    E("strang:projection-matrix-line", "is-a", "strang:projection-matrix", "model"),
    E("strang:projection-matrix-subspace", "is-a", "strang:projection-matrix", "model"),
    # matrices imply properties
    E("strang:projection-matrix-subspace", "implies", "strang:projection-matrix-symmetric-idempotent", "source",
      "The projection matrix $P = A ( A ^ { \\mathrm { T } } A ) ^ { - 1 } A ^ { \\mathrm { T } }$ has $P ^ { \\mathrm { T } } = P$ and $P ^ { 2 } = P$ and $P b = p$"),
    E("strang:projection-matrix", "implies", "strang:projection-matrix-symmetric-idempotent", "source",
      "symmetric matrices with $P ^ { 2 } = P$ . The projection of bis Pb."),
    # matrix line requires formula line
    E("strang:projection-matrix-line", "requires", "strang:projection-formula-line", "source",
      "Now comes the projection matrix. In the formula for $^ { p , }$ what matrix is multiplying b?"),
    E("strang:projection-matrix-subspace", "requires", "strang:ata-invertible-iff-independent-columns", "model"),
    # invertibility about ata
    E("strang:ata-invertible-iff-independent-columns", "requires", "strang:ata-matrix", "model"),
    # I - P complement contrasts with P
    E("strang:i-minus-p-complement", "contrasts", "strang:projection-matrix", "source",
      "When P projects onto one subspace, $I - P$ projects onto the perpendicular subspace."),
    E("strang:i-minus-p-complement", "requires", "strang:error-vector", "source",
      "Note that $( I - P ) b$ equals $b - p$ which is e in the left nullspace."),
]

# ---- verify anchors ----
fail = []
for n in nodes:
    for a in n["anchors"]:
        if a["quote"] not in TEXT:
            fail.append(("NODE", n["id"], a["quote"]))
for e in edges:
    if e.get("origin") == "source":
        q = e.get("evidence", {}).get("quote")
        if q is None or q not in TEXT:
            fail.append(("EDGE", e["src"] + "->" + e["dst"], q))

# id existence for edges
ids = {n["id"] for n in nodes}
for e in edges:
    if e["src"] not in ids: fail.append(("BADSRC", e["src"], None))
    if e["dst"] not in ids: fail.append(("BADDST", e["dst"], None))

if fail:
    print("FAILURES:", len(fail))
    for f in fail:
        print(f)
    sys.exit(1)

# counts
from collections import Counter
print("nodes:", len(nodes))
print("by type:", Counter(n["node_type"] for n in nodes))
print("edges:", len(edges))
print("by rel:", Counter(e["rel"] for e in edges))
print("model edges:", sum(1 for e in edges if e["origin"] == "model"))
print("per-node ratio:", round(len(edges)/len(nodes), 2))

with open(NODES_OUT, "w", encoding="utf-8") as f:
    for n in nodes:
        f.write(json.dumps(n, ensure_ascii=False) + "\n")
with open(EDGES_OUT, "w", encoding="utf-8") as f:
    for e in edges:
        f.write(json.dumps(e, ensure_ascii=False) + "\n")
print("WROTE OK")
