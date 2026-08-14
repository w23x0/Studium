# Judea Pearl — Theoretical Impediments to Machine Learning (arXiv:1801.04016) — ar5iv fulltext
抓取日期：2026-08-13 | URL: https://ar5iv.labs.arxiv.org/html/1801.04016 | A 级

Three-rung ladder of causation (verbatim):
- Level 1 — Association: "P(y|x)" — "Seeing" — Questions like "What is? How would seeing X change my belief in Y?"
- Level 2 — Intervention: "P(y|do(x),z)" — "Doing Intervening" — Questions like "What if? What if I do X?"
- Level 3 — Counterfactuals: "P(y_x|x',y')" — "Imagining, Retrospection" — Questions like "Why? Was it X that caused Y?"
- "questions at level i can only be answered if information from level j (j≥i) is available." Counterfactuals "subsume interventional and associational questions."

Do-operator and SCM:
- interventional layer involves "sentences of the type P(y|do(x),z)" which denotes probability of event when we "intervene and set the value of X to x"; "can be estimated experimentally from randomized trials or analytically using Causal Bayesian Networks."
- "The SCM deploys three parts: 1. Graphical models, 2. Structural equations, and 3. Counterfactual and interventional logic."
- "Graphical models represent what we know; counterfactuals articulate what we want to know; structural equations serve to tie the two together in a solid semantics."

Seven sparks (tasks beyond current ML):
1. Encoding Causal Assumptions — via graphical models
2. Do-calculus and Confounding Control — back-door criterion + do-calculus
3. Algorithmization of Counterfactuals
4. Mediation Analysis — direct/indirect effects
5. External Validity and Sample Selection Bias
6. Missing Data
7. Causal Discovery — d-separation testable implications
- "human-level AI cannot emerge solely from model-blind learning machines; it requires the symbiotic collaboration of data and models."
