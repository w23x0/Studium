# Stanford Encyclopedia of Philosophy — Type Theory
抓取日期：2026-08-13 | URL: https://plato.stanford.edu/entries/type-theory/ | A 级

Entry: Type Theory (SEP)
Section headings: 1. Paradoxes and Russell's Type Theories; 2. Simple Type Theory and the λ-Calculus; 3. Ramified Hierarchy and Impredicative Principles; 4. Type Theory/Set Theory; 5. Type Theory/Category Theory; 6. Extensions of Type System, Polymorphism, Paradoxes; 7. Univalent Foundations.

Curry-Howard / propositions as types:
- "the identification of the concept of propositions and types, suggested by the work of Curry and Howard"
- "Girard's paradox shows that one cannot have (1),(2) and (3) simultaneously" and "Martin-Löf's choice was to take away (2), restricting type theory to be predicative."

Dependent types / identity type:
- "if T(A) is a type under the assumption A:U, one can form the dependent type (A:U) → T(A)"
- "That M is of this type means that M A:T(A) whenever A:U."
- identity type Id_A(a,b) "can be thought as the type of equality proofs"
- "The existence of this model has the consequence that it cannot be proved in general in type theory that an equality type has at most one element."

Univalence:
- "two logically equivalent propositions are equal" (axiom of univalence); "also implies the Axiom of function extensionality"
- "such a general transport of properties is not possible when structures are formulated in a set theoretic framework."

Proofs as terms:
- "One advantage of the intensional formulation is that it allows for a direct notation of proofs based on λ-calculus (Martin-Löf 1971 and Coquand 1986)."
- proofs of equality are typed: "the type Id_Id_A(a,b)(p,q) if p and q are of type Id_A(a,b)"
- In groupoid interpretation "the type Id_A(a,b) is interpreted by the set of isomorphisms between a and b, set which may have more than one element," meaning proofs are first-class objects.
- Normalisation theorem: "if we have M:A then M is normalisable in a strong way (any sequence of reductions starting from M terminates)" — computational content of well-typed terms.
