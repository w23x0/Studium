# DreamCoder — HTML fulltext (arXiv:2006.08381)
抓取日期：2026-08-13 | URL: https://arxiv.org/html/2006.08381 | A 级

Wake-sleep loop:
- "DreamCoder embodies an approach we call 'wake-sleep Bayesian program induction'"
- "During waking, the system is presented with data from several tasks and attempts to synthesize programs that solve then, using the neural recognition model to propose candidate programs."
- "A 'wake-sleep' learning algorithm alternately extends the language with new symbolic abstractions and trains the neural network on imagined and replayed problems."
- "The wake phase infers programs while holding the library and recognition model fixed."
- "The Abstraction phase of sleep updates the library while holding the programs fixed by refactoring programs found during waking and abstracting out common components."
- "A second sleep phase, Dreaming, trains the recognition model to predict an approximate posterior over programs conditioned on a task."

Library learning:
- "The first sleep phase, which we refer to as abstraction, grows the library of programming primitives, finding common program fragments from task solutions, and abstracting out these fragments into new code primitives."
- "This mechanism increases the breadth and depth of the learner's declarative knowledge, its learned library"
- "During the abstraction sleep phase, the model grows its library of concepts with the goal of discovering specialized abstractions that allow it to easily express solutions to the tasks at hand."
- "DreamCoder's learned languages take the form of multilayered hierarchies of abstraction"
- "Each round of abstraction built on concepts discovered in earlier sleep cycles"
- "the system learns both a prior on programs, and an inference algorithm (parameterized by a neural network) to efficiently approximate the posterior on programs conditioned on observed task data."

Solving tasks:
- "We treat learning a new task as search for a program that solves it, or which has intended behavior."
- "DreamCoder solves both classic inductive programming tasks and creative tasks such as drawing pictures and building scenes."
- "It rediscovers the basics of modern functional programming, vector algebra and classical physics, including Newton's and Coulomb's laws."
- "the system learns to learn – to write better programs, and to search for them more efficiently"
