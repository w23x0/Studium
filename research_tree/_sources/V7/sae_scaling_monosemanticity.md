# Scaling Monosemanticity / SAE line — JumpReLU SAE (arXiv:2407.14435) + Scaling Monosemanticity (arXiv:2605.29358)
抓取日期：2026-08-13 | A 级

## JumpReLU SAE (arXiv:2407.14435)
URL: https://arxiv.org/abs/2407.14435
Title: Jumping Ahead: Improving Reconstruction Fidelity with JumpReLU Sparse Autoencoders
Authors: Senthooran Rajamanoharan, Tom Lieberum, Nicolas Sonnerat, Arthur Conmy, Vikrant Varma, János Kramár, Neel Nanda
Submitted: 19 Jul 2024 (v1)

Key sentence (verbatim):
- "Sparse autoencoders (SAEs) are a promising unsupervised approach for identifying causally relevant and interpretable linear features in a language model's (LM) activations."
- JumpReLU SAEs achieve state-of-the-art reconstruction fidelity at a given sparsity level on Gemma 2 9B activations, "does not come at the cost of interpretability"
- "a simple modification of vanilla (ReLU) SAEs" using discontinuous JumpReLU activation, trained with straight-through-estimators.

## Scaling Monosemanticity (arXiv:2605.29358)
URL: https://arxiv.org/abs/2605.29358
Title: Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet
Authors: Adly Templeton, Tom Conerly, Jonathan Marcus, Jack Lindsey, Trenton Bricken, Brian Chen, Adam Pearce, Craig Citro, Emmanuel Ameisen, Andy Jones, Hoagy Cunningham, Nicholas L Turner, Callum McDougall, Monte MacDiarmid, Alex Tamkin, Esin Durmus, Tristan Hume, Francesco Mosconi, C. Daniel Freeman, Theodore R. Sumers, Edward Rees, Joshua Batson, Adam Jermyn, Shan Carter, Chris Olah, Tom Henighan
Submitted: 28 May 2026

Key sentences (verbatim):
- "we trained sparse autoencoders with up to 34 million features on the model's middle layer residual stream, using scaling laws to guide hyperparameter selection."
- "We find features corresponding to famous entities and locations, as well as more abstract concepts like sarcasm or errors in code."
- features are "multilingual and multimodal", respond to "both concrete instances and abstract discussions of concepts", usable "to steer model behavior"
- features for "deception, power-seeking, sycophancy, and bias" that "causally influence model outputs when manipulated."
- LIMITATION (verbatim): "significant limitations remain: our suite of features is incomplete, and we lack rigorous methods for evaluating whether our features faithfully capture model computations."

背景（《几个方向》）: SAE 谱系 = Olshausen & Field 1996 稀疏编码; Anthropic 机制可解释性 2023《Towards Monosemanticity》/2024《Scaling Monosemanticity》。
